"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserGeocode = exports.onLeadCreatedAutoAssign = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const geocoding_1 = require("../lib/geocoding");
const db = admin.firestore();
// Earth's radius in miles
const EARTH_RADIUS_MILES = 3959;
/**
 * Calculate distance between two coordinates using the Haversine formula
 */
function calculateDistanceMiles(lat1, lng1, lat2, lng2) {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const rLat1 = toRadians(lat1);
    const rLat2 = toRadians(lat2);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_MILES * c;
}
/**
 * Find the closest available sales rep to a lead's location
 */
async function findClosestSalesRep(leadLat, leadLng) {
    // Get all active sales reps with valid coordinates
    const salesRepsSnapshot = await db
        .collection('users')
        .where('role', '==', 'sales_rep')
        .where('status', '==', 'active')
        .get();
    if (salesRepsSnapshot.empty) {
        functions.logger.info('No active sales reps found');
        return null;
    }
    const salesRepsWithDistance = [];
    for (const doc of salesRepsSnapshot.docs) {
        const userData = doc.data();
        const coords = userData.baseCoordinates;
        // Skip reps without valid coordinates
        if (!(coords === null || coords === void 0 ? void 0 : coords.lat) || !(coords === null || coords === void 0 ? void 0 : coords.lng)) {
            functions.logger.info(`Sales rep ${doc.id} has no coordinates, skipping`);
            continue;
        }
        const distance = calculateDistanceMiles(leadLat, leadLng, coords.lat, coords.lng);
        salesRepsWithDistance.push({
            uid: doc.id,
            displayName: userData.displayName || 'Unknown',
            distance,
            baseCoordinates: coords,
        });
    }
    if (salesRepsWithDistance.length === 0) {
        functions.logger.info('No sales reps with valid coordinates found');
        return null;
    }
    // Sort by distance and return the closest
    salesRepsWithDistance.sort((a, b) => a.distance - b.distance);
    const closest = salesRepsWithDistance[0];
    functions.logger.info(`Closest sales rep is ${closest.displayName} (${closest.uid}) at ${closest.distance.toFixed(1)} miles`);
    return closest;
}
/**
 * Process the auto-assignment for a lead
 */
async function processAutoAssignment(leadId, leadRef, leadLat, leadLng) {
    // Find closest sales rep
    const closestRep = await findClosestSalesRep(leadLat, leadLng);
    if (!closestRep) {
        functions.logger.warn(`No eligible sales reps found for lead ${leadId}`);
        return null;
    }
    // Assign the lead
    await leadRef.update({
        assignedTo: closestRep.uid,
        assignedType: 'internal',
        status: 'assigned',
        autoAssigned: true,
        autoAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoAssignedDistance: Math.round(closestRep.distance * 10) / 10, // miles, 1 decimal
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info(`Auto-assigned lead ${leadId} to ${closestRep.displayName} (${closestRep.uid}), distance: ${closestRep.distance.toFixed(1)} mi`);
    // The existing onLeadAssigned trigger will handle sending the notification
    return null;
}
/**
 * Trigger: Auto-assign leads to closest sales rep when created
 * This runs AFTER the existing onLeadCreated email trigger
 */
exports.onLeadCreatedAutoAssign = functions
    .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
})
    .firestore.document('leads/{leadId}')
    .onCreate(async (snapshot, context) => {
    var _a;
    const leadId = context.params.leadId;
    const leadData = snapshot.data();
    functions.logger.info(`Processing auto-assignment for lead ${leadId}`);
    // Skip if lead is already assigned
    if (leadData.assignedTo) {
        functions.logger.info(`Lead ${leadId} is already assigned, skipping`);
        return null;
    }
    // Get lead coordinates
    const leadAddress = (_a = leadData.customer) === null || _a === void 0 ? void 0 : _a.address;
    let leadLat = leadAddress === null || leadAddress === void 0 ? void 0 : leadAddress.lat;
    let leadLng = leadAddress === null || leadAddress === void 0 ? void 0 : leadAddress.lng;
    // If no coordinates, try to geocode from zip code
    if (!leadLat || !leadLng) {
        if (leadAddress === null || leadAddress === void 0 ? void 0 : leadAddress.zip) {
            functions.logger.info(`Lead ${leadId} has no coordinates, trying to geocode from zip ${leadAddress.zip}`);
            const coords = await (0, geocoding_1.geocodeZipCode)(leadAddress.zip);
            if (coords) {
                leadLat = coords.lat;
                leadLng = coords.lng;
                // Update lead with geocoded coordinates
                await snapshot.ref.update({
                    'customer.address.lat': coords.lat,
                    'customer.address.lng': coords.lng,
                });
                functions.logger.info(`Geocoded lead ${leadId} to ${coords.lat}, ${coords.lng}`);
            }
        }
    }
    // Still no coordinates? Can't auto-assign
    if (!leadLat || !leadLng) {
        functions.logger.warn(`Lead ${leadId} has no coordinates and could not be geocoded, skipping auto-assignment`);
        return null;
    }
    return processAutoAssignment(leadId, snapshot.ref, leadLat, leadLng);
});
/**
 * Trigger: Geocode sales rep zip code when user is created or updated
 * This ensures sales reps always have coordinates for distance calculations
 */
exports.onUserGeocode = functions
    .runWith({
    timeoutSeconds: 30,
    memory: '256MB',
})
    .firestore.document('users/{userId}')
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    // Skip deletes
    if (!change.after.exists)
        return null;
    const userData = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : null;
    // Only process if:
    // 1. User has a baseZipCode
    // 2. User doesn't have coordinates OR zip code changed
    const hasZipCode = userData.baseZipCode && userData.baseZipCode.length === 5;
    const needsGeocoding = hasZipCode &&
        (!userData.baseCoordinates ||
            (beforeData && beforeData.baseZipCode !== userData.baseZipCode));
    if (!needsGeocoding)
        return null;
    functions.logger.info(`Geocoding zip code ${userData.baseZipCode} for user ${userId}`);
    const coords = await (0, geocoding_1.geocodeZipCode)(userData.baseZipCode);
    if (coords) {
        await change.after.ref.update({
            baseCoordinates: coords,
        });
        functions.logger.info(`Updated user ${userId} with coordinates: ${coords.lat}, ${coords.lng}`);
    }
    else {
        functions.logger.warn(`Failed to geocode zip ${userData.baseZipCode} for user ${userId}`);
    }
    return null;
});
//# sourceMappingURL=leadAutoAssign.js.map