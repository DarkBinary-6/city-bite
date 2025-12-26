
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { OrderStatus } from '../types';
import { MAPBOX_TOKEN } from '../services/maps';

interface LiveMapProps {
    status: OrderStatus;
    driverCoords?: { lat: number; lng: number };
    restaurantCoords?: { lat: number; lng: number };
    deliveryCoords?: { lat: number; lng: number };
    interactive?: boolean;
    onStatsUpdate?: (etaMin: number, distKm: number) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({ 
    status, 
    driverCoords,
    restaurantCoords,
    deliveryCoords,
    interactive = false,
    onStatsUpdate
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<mapboxgl.Map | null>(null);
    const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    // Phase identification
    const isToRestaurant = status === 'rider_assigned' || status === 'accepted' || status === 'preparing' || status === 'ready_for_pickup';
    const isAtRestaurant = status === 'rider_at_restaurant';
    const isToCustomer = status === 'out_for_delivery';
    const isArrived = status === 'arrived_at_customer';
    const isDelivered = status === 'delivered';
    
    const showTracking = !isDelivered && driverCoords;
    const currentDest = (isToRestaurant || isAtRestaurant) ? restaurantCoords : deliveryCoords;

    const fetchRoute = async (start: [number, number], end: [number, number]) => {
        try {
            // Using Mapbox Directions API with 'driving-traffic' for realistic ETA
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?steps=false&geometries=geojson&access_token=${MAPBOX_TOKEN}`,
                { method: 'GET' }
            );
            const json = await query.json();
            if (json.routes && json.routes.length > 0) {
                const route = json.routes[0];
                return {
                    geometry: route.geometry,
                    duration: route.duration, // seconds
                    distance: route.distance  // meters
                };
            }
            return null;
        } catch (error) {
            console.error('Mapbox Directions API Error:', error);
            return null;
        }
    };

    useEffect(() => {
        // Simple static view for delivered orders
        if (isDelivered && mapRef.current && deliveryCoords) {
             mapboxgl.accessToken = MAPBOX_TOKEN;
             const map = new mapboxgl.Map({
                container: mapRef.current,
                style: 'mapbox://styles/mapbox/light-v11',
                center: [deliveryCoords.lng, deliveryCoords.lat],
                zoom: 16,
                attributionControl: false,
                interactive: false
            });
            const el = document.createElement('div');
            el.className = 'bg-green-600 text-white p-2 rounded-full shadow-lg border-2 border-white';
            el.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
            new mapboxgl.Marker(el).setLngLat([deliveryCoords.lng, deliveryCoords.lat]).addTo(map);
            setIsMapLoaded(true);
            return () => map.remove();
        }

        if (!mapRef.current || !driverCoords || !currentDest) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [driverCoords.lng, driverCoords.lat],
            zoom: 15,
            attributionControl: false,
            interactive: interactive
        });

        map.on('load', async () => {
            setIsMapLoaded(true);

            // 1. Route Layer (Simple Polyline)
            map.addSource('route', {
                'type': 'geojson',
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });

            map.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': {
                    'line-color': isToRestaurant ? '#f97316' : '#10b981',
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });

            // 2. Destination Marker (Zomato-style Pin)
            const destEl = document.createElement('div');
            destEl.className = `p-2 rounded-full shadow-lg border-2 border-white ${isToRestaurant || isAtRestaurant ? 'bg-orange-500' : 'bg-green-600'}`;
            destEl.innerHTML = isToRestaurant || isAtRestaurant 
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
            
            destMarkerRef.current = new mapboxgl.Marker(destEl)
                .setLngLat([currentDest.lng, currentDest.lat])
                .addTo(map);

            // 3. Rider Marker (Simple Moving Point)
            const riderEl = document.createElement('div');
            riderEl.className = 'bg-black text-white p-2 rounded-full shadow-2xl border-2 border-white transition-transform duration-1000';
            riderEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>';
            
            riderMarkerRef.current = new mapboxgl.Marker(riderEl)
                .setLngLat([driverCoords.lng, driverCoords.lat])
                .addTo(map);

            // 4. Initial Zoom & Route
            const routeData = await fetchRoute([driverCoords.lng, driverCoords.lat], [currentDest.lng, currentDest.lat]);
            if (routeData) {
                (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
                    'type': 'Feature',
                    'properties': {},
                    'geometry': routeData.geometry
                });

                const bounds = new mapboxgl.LngLatBounds();
                routeData.geometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
                map.fitBounds(bounds, { padding: 40, duration: 1000 });

                if (onStatsUpdate) {
                    onStatsUpdate(Math.ceil(routeData.duration / 60), routeData.distance / 1000);
                }
            }
        });

        mapInstance.current = map;

        return () => {
            if (mapInstance.current) mapInstance.current.remove();
        };
    }, [status, isDelivered, !!currentDest]);

    // Live update for driver movement (Smooth transition)
    useEffect(() => {
        const updateMap = async () => {
            if (!mapInstance.current || !riderMarkerRef.current || !driverCoords || !currentDest || !isMapLoaded || isDelivered) return;

            // Move Marker
            riderMarkerRef.current.setLngLat([driverCoords.lng, driverCoords.lat]);

            // Update Route Line if moving
            if (!isAtRestaurant && !isArrived) {
                const routeData = await fetchRoute([driverCoords.lng, driverCoords.lat], [currentDest.lng, currentDest.lat]);
                if (routeData) {
                    const source = mapInstance.current.getSource('route') as mapboxgl.GeoJSONSource;
                    if (source) {
                        source.setData({ 'type': 'Feature', 'properties': {}, 'geometry': routeData.geometry });
                    }
                    if (onStatsUpdate) {
                        onStatsUpdate(Math.ceil(routeData.duration / 60), routeData.distance / 1000);
                    }
                }
            }

            // Keep rider centered in interactive mode (Partner App)
            if (interactive) {
                mapInstance.current.easeTo({ center: [driverCoords.lng, driverCoords.lat], duration: 1000 });
            }
        };

        updateMap();
    }, [driverCoords?.lat, driverCoords?.lng, status]);

    return (
        <div className="relative w-full h-full bg-gray-100 rounded-3xl overflow-hidden shadow-inner border border-gray-200">
            {!isMapLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <div className="w-8 h-8 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mb-2"></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Locating Delivery...</span>
                </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
            
            {!isDelivered && (
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black text-white flex items-center gap-2 shadow-xl z-20 border border-white/10 uppercase tracking-tight">
                    <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    {isArrived ? 'At Location' : isAtRestaurant ? 'At Store' : 'Live Tracking'}
                </div>
            )}
        </div>
    );
};
