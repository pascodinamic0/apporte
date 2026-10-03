/** Smart Finds pickup when an order has no restaurant. */
export const HUB = { lat: -4.312, lon: 15.31 };

/**
 * Center of Gombe. Orders store a street address, not a pin, so the delivery
 * leg — and the delivery fee — is the distance from the pickup point to here.
 */
export const GOMBE_CENTER = { lat: -4.3035, lon: 15.301 };

/** How long an offer stays reserved while the rider app is open. */
export const OFFER_LEASE_MS = 45_000;

/** ~1.25 km lands on the old $2.50 flat fee. Shorter hops stay at the floor. */
export const DELIVERY_BASE_USD = 1.5;
export const DELIVERY_PER_KM_USD = 0.8;
export const DELIVERY_MIN_USD = 2;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function roundKm(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Pickup → center of Gombe, in kilometres. */
export function deliveryLegKm(pickupLat: number, pickupLon: number): number {
  return roundKm(haversineKm(pickupLat, pickupLon, GOMBE_CENTER.lat, GOMBE_CENTER.lon));
}

/** Customer delivery price from the delivery-leg distance. */
export function quoteDeliveryFeeUsd(distanceKm: number): number {
  const km = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  const raw = DELIVERY_BASE_USD + DELIVERY_PER_KM_USD * km;
  return Math.round(Math.max(DELIVERY_MIN_USD, raw) * 100) / 100;
}

export function mapsDestination(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
