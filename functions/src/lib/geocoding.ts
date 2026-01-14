import * as functions from 'firebase-functions';

// Oklahoma metro area zip codes with their approximate coordinates
// This is a curated list for the primary service area
// For production, consider using Google Geocoding API for unknown zips
const ZIP_CODE_COORDS: Record<string, { lat: number; lng: number }> = {
  // Oklahoma City Metro
  '73012': { lat: 35.6528, lng: -97.4781 }, // Edmond
  '73013': { lat: 35.6186, lng: -97.4361 }, // Edmond
  '73034': { lat: 35.6689, lng: -97.4089 }, // Edmond
  '73003': { lat: 35.6606, lng: -97.4847 }, // Edmond
  '73099': { lat: 35.5261, lng: -97.9631 }, // Yukon
  '73036': { lat: 35.4918, lng: -97.9181 }, // El Reno
  '73102': { lat: 35.4676, lng: -97.5164 }, // OKC Downtown
  '73103': { lat: 35.4901, lng: -97.5253 }, // OKC
  '73104': { lat: 35.4867, lng: -97.5028 }, // OKC
  '73105': { lat: 35.5147, lng: -97.5036 }, // OKC
  '73106': { lat: 35.4833, lng: -97.5456 }, // OKC
  '73107': { lat: 35.4833, lng: -97.5736 }, // OKC
  '73108': { lat: 35.4500, lng: -97.5650 }, // OKC
  '73109': { lat: 35.4328, lng: -97.5364 }, // OKC
  '73110': { lat: 35.4600, lng: -97.4200 }, // Midwest City
  '73111': { lat: 35.5050, lng: -97.4650 }, // OKC
  '73112': { lat: 35.5250, lng: -97.5550 }, // OKC
  '73114': { lat: 35.5550, lng: -97.5050 }, // OKC
  '73115': { lat: 35.4350, lng: -97.4350 }, // OKC
  '73116': { lat: 35.5450, lng: -97.5450 }, // OKC (Nichols Hills)
  '73117': { lat: 35.4750, lng: -97.4650 }, // OKC
  '73118': { lat: 35.5150, lng: -97.5250 }, // OKC
  '73119': { lat: 35.4150, lng: -97.5550 }, // OKC
  '73120': { lat: 35.5750, lng: -97.5650 }, // OKC
  '73121': { lat: 35.5350, lng: -97.4350 }, // OKC
  '73122': { lat: 35.5250, lng: -97.6050 }, // Warr Acres
  '73127': { lat: 35.4750, lng: -97.6450 }, // OKC
  '73128': { lat: 35.4350, lng: -97.6450 }, // OKC
  '73129': { lat: 35.4050, lng: -97.4850 }, // OKC
  '73130': { lat: 35.4550, lng: -97.3650 }, // Midwest City
  '73131': { lat: 35.5650, lng: -97.4650 }, // OKC
  '73132': { lat: 35.5550, lng: -97.6250 }, // OKC
  '73134': { lat: 35.6050, lng: -97.5650 }, // OKC
  '73135': { lat: 35.3850, lng: -97.4450 }, // OKC
  '73139': { lat: 35.3550, lng: -97.5150 }, // OKC
  '73141': { lat: 35.5150, lng: -97.3850 }, // OKC
  '73142': { lat: 35.5850, lng: -97.6450 }, // OKC
  '73145': { lat: 35.4050, lng: -97.3850 }, // Tinker AFB
  '73149': { lat: 35.3750, lng: -97.4850 }, // OKC
  '73150': { lat: 35.4050, lng: -97.3450 }, // OKC
  '73159': { lat: 35.3850, lng: -97.5550 }, // OKC
  '73160': { lat: 35.3350, lng: -97.4850 }, // Moore
  '73162': { lat: 35.5850, lng: -97.6850 }, // OKC
  '73165': { lat: 35.3250, lng: -97.4050 }, // Moore
  '73170': { lat: 35.3450, lng: -97.5850 }, // OKC
  '73173': { lat: 35.3050, lng: -97.5550 }, // OKC
  // Norman
  '73019': { lat: 35.2226, lng: -97.4395 }, // Norman (OU)
  '73026': { lat: 35.2450, lng: -97.3850 }, // Norman
  '73069': { lat: 35.2450, lng: -97.4450 }, // Norman
  '73071': { lat: 35.2050, lng: -97.4850 }, // Norman
  '73072': { lat: 35.2050, lng: -97.4050 }, // Norman
  // Stillwater
  '74074': { lat: 36.1156, lng: -97.0584 }, // Stillwater
  '74075': { lat: 36.1350, lng: -97.0850 }, // Stillwater
  '74078': { lat: 36.1250, lng: -97.0650 }, // Stillwater (OSU)
  // Tulsa Metro
  '74101': { lat: 36.1540, lng: -95.9928 }, // Tulsa Downtown
  '74103': { lat: 36.1550, lng: -95.9850 }, // Tulsa
  '74104': { lat: 36.1450, lng: -95.9550 }, // Tulsa
  '74105': { lat: 36.1150, lng: -95.9650 }, // Tulsa
  '74106': { lat: 36.1850, lng: -95.9850 }, // Tulsa
  '74107': { lat: 36.1050, lng: -96.0250 }, // Tulsa
  '74108': { lat: 36.1350, lng: -95.8650 }, // Tulsa
  '74110': { lat: 36.1850, lng: -95.9350 }, // Tulsa
  '74112': { lat: 36.1450, lng: -95.9050 }, // Tulsa
  '74114': { lat: 36.1250, lng: -95.9250 }, // Tulsa
  '74115': { lat: 36.1950, lng: -95.9050 }, // Tulsa
  '74116': { lat: 36.2050, lng: -95.8650 }, // Tulsa
  '74117': { lat: 36.2350, lng: -95.9050 }, // Tulsa
  '74119': { lat: 36.1350, lng: -95.9950 }, // Tulsa
  '74120': { lat: 36.1550, lng: -95.9650 }, // Tulsa
  '74126': { lat: 36.2550, lng: -95.9650 }, // Tulsa
  '74127': { lat: 36.1650, lng: -96.0450 }, // Tulsa
  '74128': { lat: 36.1350, lng: -95.8250 }, // Tulsa
  '74129': { lat: 36.1050, lng: -95.8850 }, // Tulsa
  '74130': { lat: 36.2750, lng: -95.9250 }, // Tulsa
  '74131': { lat: 36.0550, lng: -96.0050 }, // Tulsa
  '74132': { lat: 36.0350, lng: -95.9550 }, // Tulsa
  '74133': { lat: 36.0350, lng: -95.8850 }, // Tulsa
  '74134': { lat: 36.0950, lng: -95.8250 }, // Tulsa
  '74135': { lat: 36.0950, lng: -95.9250 }, // Tulsa
  '74136': { lat: 36.0550, lng: -95.9250 }, // Tulsa
  '74137': { lat: 36.0150, lng: -95.9250 }, // Tulsa
  // Broken Arrow
  '74011': { lat: 36.0526, lng: -95.7908 }, // Broken Arrow
  '74012': { lat: 36.0650, lng: -95.7550 }, // Broken Arrow
  '74014': { lat: 36.0350, lng: -95.7150 }, // Broken Arrow
};

/**
 * Get coordinates for a zip code from local cache
 * Returns null if zip code is not in our database
 */
export function getZipCodeCoordinates(zipCode: string): { lat: number; lng: number } | null {
  return ZIP_CODE_COORDS[zipCode] || null;
}

/**
 * Geocode a zip code - first checks local cache, then falls back to Google API
 * Requires GOOGLE_MAPS_API_KEY environment variable for unknown zips
 */
export async function geocodeZipCode(zipCode: string): Promise<{ lat: number; lng: number } | null> {
  // First check our local cache
  const cached = getZipCodeCoordinates(zipCode);
  if (cached) {
    functions.logger.info(`Found zip ${zipCode} in local cache`);
    return cached;
  }

  // For unknown zip codes, use Google Geocoding API
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    functions.logger.warn(`Zip ${zipCode} not in cache and GOOGLE_MAPS_API_KEY not configured`);
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      functions.logger.info(`Geocoded zip ${zipCode} via Google API: ${location.lat}, ${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    }

    functions.logger.warn(`Geocoding failed for zip ${zipCode}: ${data.status}`);
    return null;
  } catch (error) {
    functions.logger.error(`Error geocoding zip ${zipCode}:`, error);
    return null;
  }
}
