
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, reverseGeocode } from '../services/maps';
import { MapPin, X, Navigation, Loader2, Map as MapIcon, Edit3, ChevronRight, Home, Briefcase, Building, ArrowLeft, CheckCircle } from 'lucide-react';

interface LocationPickerProps {
    onConfirm: (lat: number, lng: number, formattedAddress: string, isManual: boolean) => void;
    onClose: () => void;
    initialLat?: number;
    initialLng?: number;
}

type PickerStep = 'selection' | 'map' | 'manual' | 'confirm';

const DEFAULT_CENTER = { lat: 26.6011, lng: 82.1334 }; // Bikapur

export const LocationPicker: React.FC<LocationPickerProps> = ({ onConfirm, onClose, initialLat, initialLng }) => {
    const [step, setStep] = useState<PickerStep>('selection');
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState<string>('');
    const [isManualMethod, setIsManualMethod] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number }>({ 
        lat: initialLat || DEFAULT_CENTER.lat, 
        lng: initialLng || DEFAULT_CENTER.lng 
    });
    
    const [manualData, setManualData] = useState({
        label: 'Home',
        house: '',
        area: '',
        landmark: ''
    });

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<mapboxgl.Map | null>(null);
    const markerInstance = useRef<mapboxgl.Marker | null>(null);

    const updateAddress = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            const addr = await reverseGeocode(lat, lng);
            setAddress(addr);
        } catch (err) {
            console.error("Geocoding error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (step === 'map' && mapContainerRef.current) {
            mapboxgl.accessToken = MAPBOX_TOKEN;
            
            const map = new mapboxgl.Map({
                container: mapContainerRef.current!,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [coords.lng, coords.lat],
                zoom: 16,
                attributionControl: false
            });

            const marker = new mapboxgl.Marker({
                draggable: true,
                color: '#C62828'
            })
                .setLngLat([coords.lng, coords.lat])
                .addTo(map);

            // Handle map click for reliable pin drop
            map.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                marker.setLngLat([lng, lat]);
                setCoords({ lat, lng });
                updateAddress(lat, lng);
            });

            marker.on('dragend', async () => {
                const lngLat = marker.getLngLat();
                setCoords({ lat: lngLat.lat, lng: lngLat.lng });
                updateAddress(lngLat.lat, lngLat.lng);
            });

            mapInstance.current = map;
            markerInstance.current = marker;
            
            map.on('load', () => {
                // Surgical fix for black map: delay resize to ensure container is fully painted
                setTimeout(() => {
                    map.resize();
                    map.setCenter([coords.lng, coords.lat]);
                }, 100);
                updateAddress(coords.lat, coords.lng);
            });

            return () => {
                map.remove();
            };
        }
    }, [step]);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");
        setLoading(true);
        
        // High Accuracy GPS Settings
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0 // Force fresh location
        };

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setCoords({ lat: latitude, lng: longitude });
                const addr = await reverseGeocode(latitude, longitude);
                setAddress(addr);
                setIsManualMethod(false); // GPS is not manual
                setStep('confirm');
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                let msg = "Could not detect location.";
                if (err.code === 1) msg = "Location permission denied. Please select manually.";
                else if (err.code === 3) msg = "Location request timed out. Please try again or select manually.";
                alert(msg);
                setStep('manual');
            },
            geoOptions
        );
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const combinedAddress = `${manualData.house}, ${manualData.area}${manualData.landmark ? ` (Near ${manualData.landmark})` : ''}`;
        setAddress(combinedAddress);
        setIsManualMethod(true); // Manually typed
        setStep('confirm');
    };

    const handleFinalConfirm = () => {
        onConfirm(coords.lat, coords.lng, address, isManualMethod);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-5 border-b border-gray-100 flex items-center bg-white shrink-0">
                    {step !== 'selection' && (
                        <button 
                            onClick={() => setStep('selection')} 
                            className="mr-3 p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="bg-brand-50 p-2 rounded-xl text-brand-600">
                            <MapPin size={22} />
                        </div>
                        <h2 className="font-extrabold text-gray-800 text-lg">
                            {step === 'selection' ? 'Add Delivery Address' : 
                             step === 'map' ? 'Pin on Map' : 
                             step === 'manual' ? 'Enter Details' : 'Confirm Address'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-auto">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {step === 'selection' && (
                        <div className="p-6 space-y-4">
                            <button 
                                onClick={handleUseCurrentLocation}
                                disabled={loading}
                                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-100">
                                        {loading ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-800">Use Current Location</p>
                                        <p className="text-xs text-gray-500">High precision GPS tracking</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-500" />
                            </button>

                            <button 
                                onClick={() => { setStep('manual'); setIsManualMethod(true); }}
                                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-50 p-3 rounded-xl text-orange-600 group-hover:bg-orange-100">
                                        <Edit3 size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-800">Add Manually</p>
                                        <p className="text-xs text-gray-500">Type your full address</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-500" />
                            </button>
                        </div>
                    )}

                    {step === 'map' && (
                        <div className="relative h-96 w-full bg-gray-100 overflow-hidden">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
                                    <Loader2 className="animate-spin text-brand-600" size={32} />
                                </div>
                            )}
                            <div ref={mapContainerRef} className="w-full h-full" style={{ position: 'absolute', top: 0, bottom: 0, width: '100%', height: '100%' }} />
                            
                            <div className="absolute bottom-6 left-4 right-4 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 z-20">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tap Map or Drag Pin to Adjust</p>
                                <p className="text-sm font-bold text-gray-800 line-clamp-1">{address || 'Locating...'}</p>
                                <button 
                                    onClick={() => { setStep('confirm'); setIsManualMethod(false); }}
                                    className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-transform"
                                >
                                    Confirm Pin Location
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Save address as</label>
                                <div className="flex gap-3">
                                    {['Home', 'Work', 'Other'].map(type => (
                                        <button 
                                            key={type}
                                            type="button"
                                            onClick={() => setManualData({...manualData, label: type})}
                                            className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${manualData.label === type ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-400'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <input required className="w-full p-3 border border-gray-200 rounded-xl" value={manualData.house} onChange={e => setManualData({...manualData, house: e.target.value})} placeholder="House / Flat No." />
                                <input required className="w-full p-3 border border-gray-200 rounded-xl" value={manualData.area} onChange={e => setManualData({...manualData, area: e.target.value})} placeholder="Apartment / Area / Road" />
                                <input className="w-full p-3 border border-gray-200 rounded-xl" value={manualData.landmark} onChange={e => setManualData({...manualData, landmark: e.target.value})} placeholder="Landmark (Optional)" />
                            </div>

                            <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all">
                                Save Details
                            </button>
                        </form>
                    )}

                    {step === 'confirm' && (
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle size={40} className="animate-scale-up" />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-800">Address Found!</h3>
                                <p className="text-gray-500 mt-2 text-sm leading-relaxed">{address}</p>
                            </div>
                            <button 
                                onClick={handleFinalConfirm}
                                className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all"
                            >
                                Confirm & Proceed
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
