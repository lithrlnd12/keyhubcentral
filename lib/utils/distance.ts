import { Address } from '@/types/contractor';

// Earth's radius in miles
const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in miles
 */
export function calculateDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Convert to radians
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_MILES * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two addresses
 * Returns null if either address is missing coordinates
 */
export function calculateAddressDistance(
  address1: Address | null | undefined,
  address2: Address | null | undefined
): number | null {
  if (!address1?.lat || !address1?.lng || !address2?.lat || !address2?.lng) {
    return null;
  }

  return calculateDistanceMiles(address1.lat, address1.lng, address2.lat, address2.lng);
}

/**
 * Calculate a distance score (0-100)
 * - 0 miles = 100 score
 * - serviceRadius miles = 50 score
 * - 2x serviceRadius = 0 score
 */
export function getDistanceScore(distance: number, serviceRadius: number): number {
  if (distance <= 0) return 100;
  if (distance >= serviceRadius * 2) return 0;

  // Linear interpolation
  // At 0 miles: score = 100
  // At serviceRadius: score = 50
  // At 2x serviceRadius: score = 0
  const score = 100 - (distance / (serviceRadius * 2)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Check if a distance is within the service radius
 */
export function isWithinServiceRadius(distance: number, serviceRadius: number): boolean {
  return distance <= serviceRadius;
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return '< 1 mi';
  }
  return `${distance.toFixed(1)} mi`;
}

/**
 * Get distance category for display
 */
export function getDistanceCategory(
  distance: number
): { label: string; color: string } {
  if (distance <= 5) {
    return { label: 'Very Close', color: 'text-green-400' };
  }
  if (distance <= 15) {
    return { label: 'Close', color: 'text-blue-400' };
  }
  if (distance <= 30) {
    return { label: 'Moderate', color: 'text-yellow-400' };
  }
  return { label: 'Far', color: 'text-red-400' };
}
