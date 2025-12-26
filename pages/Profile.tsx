
import React, { useState, useRef } from 'react';
import { Order, User, Address } from '../types';
// Add RefreshCw to the imports from lucide-react to resolve the missing icon error
import { ArrowLeft, MapPin, LogOut, Package, Clock, Star, Edit2, Save, Camera, Plus, Trash2, X, Eye, Upload, Navigation, CheckCircle, Home, Briefcase, Map as MapIcon, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ProfileProps {
    user: User;
    orders: Order[];
    activeOrder?: Order;
    onBack: () => void;
    onLogout: () => void;
    onReviewOrder: (order: Order) => void;
    onUpdateUser: (updatedUser: User) => void;
    onTrackOrder: () => void;
    onRequestMap: () => void;
}

export const ProfilePage: React.FC<ProfileProps> = ({ user, orders, activeOrder, onBack, onLogout, onReviewOrder, onUpdateUser, onTrackOrder, onRequestMap }) => {
    // Show all non-active orders in history (delivered, cancelled, rejected)
    const historyOrders = orders.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status));
    
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<User>(user);
    
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveProfile = () => {
        onUpdateUser(editForm);
        setIsEditing(false);
        triggerSuccessPopup();
    };

    const triggerSuccessPopup = () => {
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);
    };

    const handleDeleteAddress = (id: string) => {
        const updatedUser = {
            ...user,
            savedAddresses: user.savedAddresses.filter(a => a.id !== id),
            activeAddressId: user.activeAddressId === id ? (user.savedAddresses.find(a => a.id !== id)?.id || '') : user.activeAddressId
        };
        onUpdateUser(updatedUser);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setEditForm(prev => ({ ...prev, avatar: base64 }));
                onUpdateUser({ ...user, avatar: base64 });
                triggerSuccessPopup();
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 animate-fade-in relative pb-20">
            {showSuccessPopup && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[250] bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slide-down">
                    <CheckCircle size={20} className="text-green-400" />
                    <span className="font-bold">Updated Successfully</span>
                </div>
            )}

            <button onClick={onBack} className="text-gray-500 mb-6 flex items-center gap-1 hover:text-gray-800 transition-colors font-medium">
                <ArrowLeft size={18}/> Back
            </button>
            
            <div className="flex justify-between items-start mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Your Profile</h1>
                <button onClick={onLogout} className="text-red-500 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <LogOut size={16}/> Logout
                </button>
            </div>

            {/* Profile Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-20 h-20 group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-full h-full rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : <span className="text-2xl font-bold text-brand-600">{user.name.charAt(0)}</span>}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                        <Camera size={20} />
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                
                <div className="flex-1 w-full space-y-3">
                    {isEditing ? (
                        <>
                            <input className="w-full p-2 border rounded-lg" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Full Name" />
                            <input className="w-full p-2 border rounded-lg" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Email" />
                            <input className="w-full p-2 border rounded-lg" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone" />
                            <div className="flex gap-2 mt-2">
                                <button onClick={handleSaveProfile} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Save</button>
                                <button onClick={() => { setIsEditing(false); setEditForm(user); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold">Cancel</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                                    <p className="text-gray-500">{user.email}</p>
                                    <p className="text-gray-500 text-sm mt-1">{user.phone}</p>
                                </div>
                                <button onClick={() => setIsEditing(true)} className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 size={18}/></button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Addresses */}
            <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Saved Addresses</h2>
                    <button onClick={onRequestMap} className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <MapIcon size={16}/> Add Address
                    </button>
                </div>

                <div className="space-y-4">
                    {user.savedAddresses.length === 0 ? (
                        <div className="p-10 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <MapPin className="mx-auto text-gray-300 mb-3" size={32} />
                            <p className="text-gray-500 text-sm mb-4">No addresses saved yet.</p>
                            <button onClick={onRequestMap} className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md">Add Address</button>
                        </div>
                    ) : (
                        user.savedAddresses.map(addr => (
                            <div key={addr.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between group hover:border-brand-200 transition-colors">
                                 <div className="flex items-start gap-4">
                                     <div className="mt-1 text-gray-400">
                                         {addr.label === 'Home' ? <Home size={20}/> : addr.label === 'Work' ? <Briefcase size={20}/> : <MapPin size={20}/>}
                                     </div>
                                     <div className="flex-1">
                                         <div className="flex items-center gap-2">
                                             <div className="font-bold text-gray-800 text-base">{addr.label}</div>
                                             {user.activeAddressId === addr.id && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase">Active</span>}
                                         </div>
                                         <div className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs">{addr.details}</div>
                                         {!addr.isManual && addr.lat && addr.lng && (
                                            <p className="text-[10px] text-gray-300 mt-1 font-mono">{addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}</p>
                                         )}
                                     </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                     <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                                     {user.activeAddressId !== addr.id && (
                                         <button 
                                            onClick={() => onUpdateUser({ ...user, activeAddressId: addr.id, location: { lat: addr.lat!, lng: addr.lng! } })} 
                                            className="text-[10px] font-bold text-brand-600 hover:underline px-2"
                                         >
                                             Set Active
                                         </button>
                                     )}
                                 </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Past Orders */}
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide mb-4">Past Orders</h2>
            <div className="space-y-4">
                {historyOrders.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">No orders yet.</p>
                    </div>
                ) : (
                    historyOrders.map(order => (
                        <div key={order.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 ${order.status === 'delivered' ? '' : 'opacity-75'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800">{order.restaurantName}</h3>
                                    <p className="text-gray-500 text-xs mt-1">{order.items.map(i => i.name).join(', ')}</p>
                                </div>
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-bold">₹{order.total}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-50 pt-3 mt-3">
                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.date).toLocaleDateString()}</span>
                                {order.status === 'delivered' ? (
                                    <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><CheckCircle size={10}/> Delivered</span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {order.paymentStatus === 'REFUND_INITIATED' && (
                                            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><RefreshCw size={10}/> Refunded</span>
                                        )}
                                        <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><XCircle size={10}/> {order.status === 'rejected' ? 'Rejected' : 'Cancelled'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
