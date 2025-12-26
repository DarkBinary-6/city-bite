// Barsati Mishthan Bhandaar Coordinates (Center Point)
const CENTER_LAT = 26.6011802;
const CENTER_LNG = 82.133486;
const SERVICE_RADIUS_KM = 10; 

// Import config helper to get dynamic rates
import { getConfig } from './storage';

// Haversine formula to calculate distance between two points in km
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

export const isWithinServiceArea = (lat: number, lng: number): boolean => {
    // Strictly check against the fixed center point
    const dist = calculateDistance(CENTER_LAT, CENTER_LNG, lat, lng);
    return dist <= SERVICE_RADIUS_KM;
};

export const getServiceAreaError = (): string => {
    return `We are currently not delivering at this location. Service is available within ${SERVICE_RADIUS_KM}km of Barsati Mishthan Bhandaar. Sorry for the inconvenience.`;
};

// Fix: PricingConfig uses delivery_fee.amount instead of baseDeliveryFee
export const calculateDeliveryFee = (distanceKm: number): number => {
    const config = getConfig();
    const baseFee = config.delivery_fee.amount;
    const perKmRate = config.riderPerKm;

    // Free for short distance if base fee is 0
    if (distanceKm <= 1 && baseFee === 0) return 0;
    
    // Logic: Base fee + per km rate for every km beyond 1km
    const fee = baseFee + (distanceKm > 1 ? (distanceKm - 1) * perKmRate : 0);
    return Math.ceil(fee);
};

export const calculateEta = (distanceKm: number, averageSpeedKmph: number = 25): number => {
    if (distanceKm <= 0.1) return 1;
    // Time = Distance / Speed. Multiply by 60 for minutes.
    // Add a small buffer for traffic (1.2 multiplier)
    return Math.ceil((distanceKm / averageSpeedKmph) * 60 * 1.2);
};