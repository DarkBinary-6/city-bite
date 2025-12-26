
import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, User, WithdrawalRequest, BankDetails, VehicleInfo, InsuranceInfo } from '../types';
import { 
    MapPin, Navigation, Bike, CheckCircle, LogOut, Star, Shield, 
    Wallet, IndianRupee, Bell, Phone, Clock, ChevronRight, AlertTriangle, 
    Menu, History, TrendingUp, CircleDollarSign, X, Edit2, Save, FileText, Landmark, Car, Camera, Upload, Search, User as UserIcon, ExternalLink, ChevronLeft, CreditCard, Map as MapIcon, Compass
} from 'lucide-react';
import { calculateDistance } from '../utils/geo';
import { triggerNotificationEvent } from '../utils/push';

interface DeliveryProps {
    orders: Order[];
    driver: User;
    withdrawalHistory: WithdrawalRequest[];
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
    onAcceptJob: (orderId: string, riderName: string) => void;
    onLogout: () => void;
    onOpenChat: (orderId: string) => void;
    onLocationUpdate: (lat: number, lng: number, accuracy?: number, speed?: number | null) => void;
    onStatsUpdate: (orderId: string, etaMin: number, distKm: number) => void;
    onWithdraw: (amount: number, upiId: string) => void;
    onDepositCod: (amount: number) => void;
    onRateCustomer: (orderId: string, rating: number) => void;
    onUpdateDriverProfile?: (updatedUser: User) => void;
}

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const DeliveryDashboard: React.FC<DeliveryProps> = ({ 
    orders, driver, withdrawalHistory, onUpdateStatus, onAcceptJob, 
    onLogout, onOpenChat, onLocationUpdate, onStatsUpdate, onWithdraw, onDepositCod, onUpdateDriverProfile 
}) => {
    
    const [isOnline, setIsOnline] = useState(driver.isOnline || false);
    const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'profile'>('home');
    const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
    const [incomingTimer, setIncomingTimer] = useState(30);
    const audioRef = useRef<HTMLAudioElement>(new Audio(NOTIFICATION_SOUND));
    const watchIdRef = useRef<number | null>(null);

    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
    const [showCompletionOverlay, setShowCompletionOverlay] = useState<{ amount: number } | null>(null);

    // Profile Settings States
    const [editingSection, setEditingSection] = useState<'none' | 'profile' | 'bank' | 'vehicle'>('none');
    const [profileForm, setProfileForm] = useState({ name: driver.name, phone: driver.phone || '' });
    const [bankForm, setBankForm] = useState<BankDetails>(driver.bankDetails || { accountHolderName: '', accountNumber: '', bankName: '', ifscCode: '', panNumber: '' });
    const [vehicleForm, setVehicleForm] = useState<VehicleInfo>(driver.vehicleInfo || { type: 'bike', model: '', plateNumber: '', licenseNumber: '' });

    // REFINED SELECTOR: Strictly exclude terminal statuses to ensure the UI closes immediately on completion
    const activeOrder = orders.find(o => 
        (o.id === driver.activeOrderId || o.riderName === driver.name) && 
        !['delivered', 'cancelled', 'rejected'].includes(o.status)
    );
        
    const completedOrders = orders.filter(o => o.riderName === driver.name && o.status === 'delivered');
    
    const today = new Date().toLocaleDateString();
    const todayEarnings = completedOrders
        .filter(o => new Date(o.date).toLocaleDateString() === today)
        .reduce((sum, o) => sum + (o.riderPayout || 0) + (o.riderTip || 0), 0);

    const weeklyEarnings = completedOrders.reduce((sum, o) => sum + (o.riderPayout || 0) + (o.riderTip || 0), 0); 

    useEffect(() => {
        if (isOnline && activeOrder && (activeOrder.status === 'rider_assigned' || activeOrder.status === 'rider_at_restaurant' || activeOrder.status === 'out_for_delivery' || activeOrder.status === 'arrived_at_customer')) {
            if ("geolocation" in navigator && !watchIdRef.current) {
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        const acc = pos.coords.accuracy;
                        const speed = pos.coords.speed;
                        onLocationUpdate(lat, lng, acc, speed);

                        if (activeOrder.status === 'out_for_delivery' && activeOrder.deliveryCoordinates) {
                            const dist = calculateDistance(lat, lng, activeOrder.deliveryCoordinates.lat, activeOrder.deliveryCoordinates.lng);
                            if (dist < 0.1) { 
                                onUpdateStatus(activeOrder.id, 'arrived_at_customer');
                            }
                        }
                    },
                    (err) => console.warn("GPS tracking error:", err),
                    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                );
            }
        } else {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        }
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isOnline, activeOrder?.status, activeOrder?.id]);

    useEffect(() => {
        if (!isOnline || activeOrder || incomingOrder) return;
        const interval = setInterval(() => {
            const available = orders.find(o => (o.status === 'ready_for_pickup' || o.status === 'preparing') && !o.riderName);
            if (available) triggerIncomingOrder(available);
        }, 5000);
        return () => clearInterval(interval);
    }, [isOnline, activeOrder, incomingOrder, orders]);

    useEffect(() => {
        if (!incomingOrder) return;
        if (incomingTimer <= 0) {
            setIncomingOrder(null);
            return;
        }
        const timer = setInterval(() => setIncomingTimer(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [incomingOrder, incomingTimer]);

    const triggerIncomingOrder = (order: Order) => {
        setIncomingOrder(order);
        setIncomingTimer(30);
        audioRef.current.play().catch(e => console.log("Audio blocked"));
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    };

    const handleAcceptOrder = () => {
        if (incomingOrder) {
            onAcceptJob(incomingOrder.id, driver.name);
            setIncomingOrder(null);
            if (navigator.vibrate) navigator.vibrate(200);
        }
    };

    const handleStatusUpdate = (status: OrderStatus) => {
        if (activeOrder) {
            onUpdateStatus(activeOrder.id, status);
        }
    };

    const handleCompleteDelivery = () => {
        if (!activeOrder) return;
        const earnings = (activeOrder.riderPayout || 0) + (activeOrder.riderTip || 0);
        
        // Immediate clean up of local tracking
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        // Trigger global status update
        onUpdateStatus(activeOrder.id, 'delivered');
        
        // Show success splash
        setShowCompletionOverlay({ amount: earnings });
        setTimeout(() => {
            setShowCompletionOverlay(null);
        }, 4000);
    };

    const toggleOnline = () => {
        const newState = !isOnline;
        setIsOnline(newState);
        if (onUpdateDriverProfile) onUpdateDriverProfile({ ...driver, isOnline: newState });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                if (onUpdateDriverProfile) onUpdateDriverProfile({ ...driver, avatar: base64 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        if (onUpdateDriverProfile) {
            onUpdateDriverProfile({ ...driver, name: profileForm.name, phone: profileForm.phone });
            setEditingSection('none');
        }
    };

    const handleSaveBank = () => {
        if (onUpdateDriverProfile) {
            onUpdateDriverProfile({ ...driver, bankDetails: bankForm });
            setEditingSection('none');
        }
    };

    const handleSaveVehicle = () => {
        if (onUpdateDriverProfile) {
            onUpdateDriverProfile({ ...driver, vehicleInfo: vehicleForm });
            setEditingSection('none');
        }
    };

    const handleWithdrawSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawalError(null);
        if (!driver.bankDetails || !driver.bankDetails.accountNumber) {
            setWithdrawalError("Please add your Bank Details in the Profile section.");
            return;
        }
        const amt = parseFloat(withdrawAmount);
        if (amt > (driver.walletBalance || 0)) {
            alert("Insufficient balance.");
            return;
        }
        onWithdraw(amt, "Bank Transfer"); 
        setShowWithdrawModal(false);
        setWithdrawAmount('');
    };

    const getGoogleMapsUrl = () => {
        if (!activeOrder) return '#';
        const isHeadingToRestaurant = activeOrder.status === 'rider_assigned' || activeOrder.status === 'rider_at_restaurant';
        
        // Exact address string mentioned by restaurant or customer
        const address = isHeadingToRestaurant ? activeOrder.restaurantAddress : activeOrder.deliveryAddress;
        
        // Preferred: Google Maps Directions API with the exact address text
        // Using 'dir' ensures it starts navigation flow from rider's current position
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || '')}`;
    };

    if (showCompletionOverlay) {
        return (
            <div className="fixed inset-0 z-[300] bg-green-600 flex flex-col items-center justify-center text-white animate-fade-in p-8 text-center">
                <div className="bg-white p-8 rounded-full mb-8 animate-bounce">
                    <CheckCircle size={80} className="text-green-600" />
                </div>
                <h1 className="text-5xl font-black mb-4">Delivered!</h1>
                <p className="text-green-100 text-xl font-bold mb-2">Awesome job, {driver.name}!</p>
                <div className="bg-white/20 px-8 py-4 rounded-3xl backdrop-blur-md">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Earned</p>
                    <p className="text-3xl font-black">₹{showCompletionOverlay.amount}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-30 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-white">
                        {driver.avatar ? <img src={driver.avatar} className="w-full h-full object-cover" alt="avatar"/> : <UserIcon className="text-brand-600" size={20}/>}
                    </div>
                    <div>
                        <h1 className="font-bold text-sm leading-tight text-gray-900">{driver.name}</h1>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Rider Partner</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleOnline} className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </button>
                    <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
                </div>
            </header>

            <main className="flex-1 p-4 lg:p-8 max-w-2xl mx-auto w-full">
                {activeTab === 'home' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Today</p>
                                <p className="text-2xl font-black text-gray-900">₹{todayEarnings}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Payout</p>
                                <p className="text-2xl font-black text-gray-900">₹{weeklyEarnings}</p>
                            </div>
                        </div>

                        {activeOrder ? (
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
                                <div className="bg-brand-600 p-4 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="animate-pulse" />
                                        <span className="font-bold text-xs uppercase tracking-widest">Active Delivery</span>
                                    </div>
                                    <span className="font-mono text-xs opacity-70">#{activeOrder.id.slice(-6)}</span>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 mb-1">
                                                {activeOrder.status === 'rider_assigned' || activeOrder.status === 'rider_at_restaurant' ? 'Pick up from:' : 'Deliver to:'}
                                            </h3>
                                            <h4 className="text-lg font-extrabold text-brand-600">{activeOrder.status === 'rider_assigned' || activeOrder.status === 'rider_at_restaurant' ? activeOrder.restaurantName : activeOrder.customerName}</h4>
                                            <p className="text-sm text-gray-500 font-bold mt-2 flex items-start gap-2">
                                                <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400"/> 
                                                {activeOrder.status === 'rider_assigned' || activeOrder.status === 'rider_at_restaurant' ? activeOrder.restaurantAddress : activeOrder.deliveryAddress}
                                            </p>
                                        </div>
                                        <div className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg font-black text-sm border border-brand-100 shrink-0">
                                            ₹{activeOrder.riderPayout}
                                        </div>
                                    </div>

                                    {/* Navigation Area */}
                                    <div className="mb-8">
                                        <a 
                                            href={getGoogleMapsUrl()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full group"
                                        >
                                            <div className="bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden transition-all hover:bg-black active:scale-[0.98] shadow-2xl">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-brand-500/30 transition-colors"></div>
                                                <div className="relative z-10 flex flex-col items-center text-center">
                                                    <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform">
                                                        <Navigation size={32} className="text-white" />
                                                    </div>
                                                    <h3 className="text-xl font-black italic tracking-tighter uppercase mb-1">Open Directions</h3>
                                                    <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest">To Exact Address</p>
                                                </div>
                                                <div className="absolute bottom-4 right-6 text-white/20 group-hover:text-white/40 transition-colors">
                                                    <ExternalLink size={24} />
                                                </div>
                                            </div>
                                        </a>
                                        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
                                            Starts navigation to the {activeOrder.status === 'rider_assigned' || activeOrder.status === 'rider_at_restaurant' ? 'restaurant outlet' : 'customer\'s doorstep'}
                                        </p>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-100">
                                        {activeOrder.status === 'rider_assigned' && (
                                            <button onClick={() => handleStatusUpdate('rider_at_restaurant')} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-500/20 uppercase tracking-widest transition-transform active:scale-95">Reached Restaurant</button>
                                        )}
                                        {activeOrder.status === 'rider_at_restaurant' && (
                                            <div className="space-y-3">
                                                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                                                    <p className="text-[10px] font-black text-orange-600 uppercase mb-2">Order Items</p>
                                                    <ul className="space-y-1">
                                                        {activeOrder.items.map((item, i) => (
                                                            <li key={i} className="text-xs font-bold text-orange-900 flex justify-between">
                                                                <span>{item.quantity}x {item.name}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <button onClick={() => handleStatusUpdate('out_for_delivery')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 uppercase tracking-widest transition-transform active:scale-95">Pickup & Start Delivery</button>
                                            </div>
                                        )}
                                        {activeOrder.status === 'out_for_delivery' && (
                                            <button onClick={() => handleStatusUpdate('arrived_at_customer')} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-brand-600/20 uppercase tracking-widest transition-transform active:scale-95">Arrived at Location</button>
                                        )}
                                        {activeOrder.status === 'arrived_at_customer' && (
                                            <button onClick={handleCompleteDelivery} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-green-600/20 uppercase tracking-widest transition-transform active:scale-95">
                                                {activeOrder.paymentMethod === 'COD' ? `Collect ₹${activeOrder.total} & Complete` : 'Complete Delivery'}
                                            </button>
                                        )}
                                        
                                        <div className="flex gap-3">
                                            <a href={`tel:${activeOrder.customerPhone}`} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Phone size={16}/> Call</a>
                                            <button onClick={() => onOpenChat(activeOrder.id)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Bell size={16}/> Message</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${isOnline ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-300'}`}>
                                    <Bike size={40} className={isOnline ? 'animate-bounce' : ''} />
                                </div>
                                <h3 className="text-lg font-black text-gray-800">{isOnline ? 'Scanning for Orders...' : 'You are currently Offline'}</h3>
                                <p className="text-xs text-gray-400 font-medium mt-1 px-8">{isOnline ? 'Stay near restaurant hubs to increase your chances of getting orders.' : 'Go online to start receiving delivery requests.'}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'earnings' && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Withdrawable Balance</p>
                                <h2 className="text-4xl font-black">₹{driver.walletBalance?.toFixed(0) || 0}</h2>
                                <button 
                                    onClick={() => setShowWithdrawModal(true)}
                                    className="mt-6 bg-white text-black px-6 py-2 rounded-xl font-black text-sm uppercase transition-transform active:scale-95"
                                >
                                    Withdraw Now
                                </button>
                            </div>
                            <IndianRupee size={120} className="absolute -bottom-10 -right-10 text-white opacity-5 rotate-12" />
                        </div>
                        
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Earnings History</h3>
                            <div className="space-y-4">
                                {completedOrders.length === 0 ? (
                                    <p className="text-center text-gray-400 py-10 text-sm italic">No completed orders yet.</p>
                                ) : (
                                    completedOrders.map(o => (
                                        <div key={o.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{o.restaurantName}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{new Date(o.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-green-600 text-sm">+₹{o.riderPayout}</p>
                                                {o.riderTip ? <p className="text-[10px] text-brand-600 font-bold">Tip: ₹{o.riderTip}</p> : null}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        {editingSection === 'none' ? (
                            <>
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-4 relative group cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                                            {driver.avatar ? <img src={driver.avatar} className="w-full h-full object-cover" alt="avatar"/> : <UserIcon size={40} className="text-gray-300 m-auto mt-6"/>}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera size={24} className="text-white"/>
                                            </div>
                                            <input id="avatar-input" type="file" className="hidden" onChange={handleAvatarChange} />
                                        </div>
                                        <h2 className="text-xl font-black text-gray-900">{driver.name}</h2>
                                        <p className="text-sm text-gray-500 font-medium">{driver.phone}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Rating</p>
                                            <p className="text-lg font-black text-green-600 flex items-center justify-center gap-1">4.9 <Star size={16} fill="currentColor"/></p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Deliveries</p>
                                            <p className="text-lg font-black text-gray-800">{driver.totalDeliveries || completedOrders.length}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <button onClick={() => setEditingSection('profile')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600"><UserIcon size={20}/></div>
                                                <span className="font-bold text-gray-800">Personal Information</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600"/>
                                        </button>
                                        <button onClick={() => setEditingSection('bank')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-green-100 p-2.5 rounded-xl text-green-600"><CreditCard size={20}/></div>
                                                <span className="font-bold text-gray-800">Bank Details</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-green-600"/>
                                        </button>
                                        <button onClick={() => setEditingSection('vehicle')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600"><Bike size={20}/></div>
                                                <span className="font-bold text-gray-800">Vehicle Information</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-600"/>
                                        </button>
                                        <button onClick={onLogout} className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors group mt-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-red-100 p-2.5 rounded-xl text-red-600"><LogOut size={20}/></div>
                                                <span className="font-bold text-red-700">Logout Session</span>
                                            </div>
                                            <ChevronRight size={18} className="text-red-300 group-hover:text-red-600"/>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-fade-in">
                                <button onClick={() => setEditingSection('none')} className="flex items-center gap-2 text-gray-500 font-bold mb-6 hover:text-brand-600">
                                    <ChevronLeft size={20}/> Back to Settings
                                </button>

                                {editingSection === 'profile' && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-black text-gray-900 mb-2">Edit Information</h3>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Full Name</label>
                                            <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800 focus:ring-2 focus:ring-brand-500" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Phone Number</label>
                                            <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800 focus:ring-2 focus:ring-brand-500" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                                        </div>
                                        <button onClick={handleSaveProfile} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-6 shadow-lg shadow-brand-600/20">Save Changes</button>
                                    </div>
                                )}

                                {editingSection === 'bank' && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-black text-gray-900 mb-2">Payout Method</h3>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Acc. Holder Name</label>
                                            <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800" value={bankForm.accountHolderName} onChange={e => setBankForm({...bankForm, accountHolderName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Account Number</label>
                                            <input type="password" placeholder="••••••••••••" className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800" value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">IFSC Code</label>
                                                <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800 uppercase" value={bankForm.ifscCode} onChange={e => setBankForm({...bankForm, ifscCode: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Bank Name</label>
                                                <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800" value={bankForm.bankName} onChange={e => setBankForm({...bankForm, bankName: e.target.value})} />
                                            </div>
                                        </div>
                                        <button onClick={handleSaveBank} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-6">Update Bank</button>
                                    </div>
                                )}

                                {editingSection === 'vehicle' && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-black text-gray-900 mb-2">Vehicle Details</h3>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Vehicle Type</label>
                                            <select className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800" value={vehicleForm.type} onChange={e => setVehicleForm({...vehicleForm, type: e.target.value as any})}>
                                                <option value="bike">Bike (Fuel)</option>
                                                <option value="electric">Electric Bike</option>
                                                <option value="scooter">Scooter</option>
                                                <option value="cycle">Bicycle</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Model Name</label>
                                            <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800" value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} placeholder="e.g. Hero Splendor" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Number Plate</label>
                                            <input className="w-full p-4 bg-gray-50 border-none rounded-2xl mt-1 font-bold text-gray-800 uppercase" value={vehicleForm.plateNumber} onChange={e => setVehicleForm({...vehicleForm, plateNumber: e.target.value})} placeholder="UP 42 XX XXXX" />
                                        </div>
                                        <button onClick={handleSaveVehicle} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-6">Update Vehicle</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-3 z-40">
                <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-brand-600' : 'text-gray-400'}`}>
                    <Bike size={22} /><span className="text-[10px] font-bold uppercase tracking-tighter">Tasks</span>
                </button>
                <button onClick={() => setActiveTab('earnings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'earnings' ? 'text-brand-600' : 'text-gray-400'}`}>
                    <Wallet size={22} /><span className="text-[10px] font-bold uppercase tracking-tighter">Earnings</span>
                </button>
                <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-brand-600' : 'text-gray-400'}`}>
                    <UserIcon size={22} /><span className="text-[10px] font-bold uppercase tracking-tighter">Account</span>
                </button>
            </nav>

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900">Request Payout</h2>
                            <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Amount (₹)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-black text-xl" 
                                    value={withdrawAmount} 
                                    onChange={e => setWithdrawAmount(e.target.value)} 
                                    placeholder="0"
                                    required 
                                />
                                <div className="mt-4 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500 font-bold">Balance:</span>
                                        <span className="font-black text-brand-600">₹{driver.walletBalance?.toFixed(0) || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
                                <p className="font-black flex items-center gap-2 mb-1"><Landmark size={14}/> Verified Bank Account</p>
                                <p>Transfer usually takes 1-2 business days to reflect.</p>
                            </div>
                            {withdrawalError && <p className="text-red-500 text-[10px] font-bold">{withdrawalError}</p>}
                            <button 
                                type="submit" 
                                className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-lg active:scale-95 transition-all"
                            >
                                Confirm Withdrawal
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Incoming Job UI */}
            {incomingOrder && (
                <div className="fixed inset-0 z-[200] bg-brand-600/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1.5 bg-brand-500" style={{ width: `${(incomingTimer/30)*100}%`, transition: 'width 1s linear' }}></div>
                        <div className="text-center mb-8">
                            <div className="bg-brand-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-600">
                                <Bike size={48} className="animate-bounce" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2">New Task!</h2>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{incomingOrder.restaurantName}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Earnings</p>
                                <p className="text-xl font-black text-green-600">₹{incomingOrder.riderPayout}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Est. Dist</p>
                                <p className="text-xl font-black text-gray-800">2.4 km</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={handleAcceptOrder} className="w-full bg-black text-white py-5 rounded-3xl font-black text-lg shadow-xl uppercase tracking-widest transition-transform active:scale-95">Accept Job</button>
                            <button onClick={() => setIncomingOrder(null)} className="w-full py-4 text-gray-400 font-bold text-sm uppercase tracking-widest">Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
