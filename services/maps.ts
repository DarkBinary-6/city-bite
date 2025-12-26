
// services/maps.ts

export const MAPBOX_TOKEN = 'pk.eyJ1IjoieWFhay1kcml2aW5nLWN1cnJpY3VsdW0iLCJhIjoiY2txYzJqb3FwMWZweDJwbXY0M3R5cDAzYyJ9';

/**
 * Reverse geocode using Mapbox Geocoding API
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            return data.features[0].place_name;
        }
        return 'Unknown Location';
    } catch (error) {
        console.error('Reverse Geocoding failed:', error);
        return 'Location retrieval failed';
    }
};

/**
 * Mocking the legacy Google loader behavior for minimal impact on other files
 */
export const loadGoogleMaps = (): Promise<void> => {
    return Promise.resolve();
};

export const decodePolyline = (encoded: string) => {
    // Basic polyline decoder if needed for Mapbox path strings
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push([lng / 1E5, lat / 1E5]);
    }
    return points;
};
