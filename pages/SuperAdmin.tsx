import React, { useState, useEffect } from 'react';
import { WithdrawalRequest, Restaurant, Order, PricingConfig, User, AccountStatus } from '../types';
import { LogOut, CheckCircle, Clock, Store, Eye, EyeOff, ShoppingBag, MapPin, Phone, User as UserIcon, Plus, Edit2, Trash2, X, Save, TrendingUp, DollarSign, Crown, Wallet, CreditCard, ShieldCheck, UserX, AlertCircle, Briefcase, Bike, ShieldAlert, Mail } from 'lucide-react';
import { EarningsChart } from '../components/EarningsChart';
import { getConfig, saveConfig, getUsers, saveUsers, getRestaurants, saveRestaurants } from '../utils/storage';

interface SuperAdminProps {
    requests: WithdrawalRequest[];
    onPayRequest: (id: string) => void;
    onLogout: () => void;
    restaurants?: Restaurant[];
    orders: Order[];
    onUpdateRestaurants?: (restaurants: Restaurant[]) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminProps> = ({ requests, onPayRequest, onLogout, restaurants = [], orders = [], onUpdateRestaurants }) => {
    
    // Earnings Calculation Breakdown
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    
    const stats = deliveredOrders.reduce((acc, order) => {
        const comm = order.commissionAmount || 0;
        const platFee = order.platformFee || 0;
        const custDelFee = order.deliveryFee || 0;
        const riderPay = order.riderPayout || 0;

        acc.commissions += comm;
        acc.platformFees += platFee;
        acc.deliveryFeesCollected += custDelFee;
        acc.riderPayoutsPaid += riderPay;
        
        acc.totalRevenue += (comm + platFee + custDelFee) - riderPay;
        
        return acc;
    }, { 
        platformFees: 0, 
        commissions: 0, 
        deliveryFeesCollected: 0, 
        riderPayoutsPaid: 0,
        totalRevenue: 0 
    });

    const [activeTab, setActiveTab] = useState<'overview' | 'verification' | 'restaurants' | 'orders' | 'settings'>('overview');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [config, setConfig] = useState<PricingConfig>(getConfig());
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

    // Partner Approval State
    const [pendingPartners, setPendingPartners] = useState<{ id: string, name: string, email: string, role: string, status: AccountStatus, details: string, phone: string }[]>([]);

    useEffect(() => {
        const allUsers = getUsers();
        const allRests = getRestaurants();
        
        const submittedPartners = [
            ...allRests.filter(r => r.status === 'SUBMITTED').map(r => ({ id: r.id, name: r.name, email: r.email || 'N/A', role: 'RESTAURANT', status: r.status, details: r.address, phone: r.phone || 'N/A' })),
            ...allUsers.filter(u => u.status === 'SUBMITTED').map(u => ({ id: u.id || '', name: u.name, email: u.email, role: 'DELIVERY', status: u.status, details: 'Local Captain', phone: u.phone || 'N/A' }))
        ];
        setPendingPartners(submittedPartners);
    }, [activeTab]);

    const handlePartnerAction = (id: string, role: string, action: 'ACTIVE' | 'BLOCKED') => {
        if (role === 'RESTAURANT') {
            const allRests = getRestaurants();
            const updated = allRests.map(r => r.id === id ? { ...r, status: action } : r);
            saveRestaurants(updated);
            if (onUpdateRestaurants) onUpdateRestaurants(updated);
        } else {
            const allUsers = getUsers();
            const updated = allUsers.map(u => u.id === id ? { ...u, status: action } : u);
            saveUsers(updated);
        }
        setPendingPartners(prev => prev.filter(p => p.id !== id));
    };

    // Restaurant CRUD State
    const [showRestModal, setShowRestModal] = useState(false);
    const [editingRestId, setEditingRestId] = useState<string | null>(null);
    const [restForm, setRestForm] = useState({
        name: '', email: '', password: '', phone: '', address: '', cuisine: '', priceRange: '₹₹', deliveryTime: '30-40 min', rating: '4.2', lat: '26.6011', lng: '82.1334'
    });

    const togglePassword = (id: string) => {
        const newSet = new Set(visiblePasswords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setVisiblePasswords(newSet);
    };

    const handleConfigSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveConfig(config);
        alert("Pricing configuration updated successfully!");
    };

    const handleEditRestaurant = (rest: Restaurant) => {
        setEditingRestId(rest.id);
        setRestForm({
            name: rest.name,
            email: rest.email || '',
            password: rest.password || '',
            phone: rest.phone || '',
            address: rest.address,
            cuisine: rest.cuisine.join(', '),
            priceRange: rest.priceRange,
            deliveryTime: rest.deliveryTime,
            rating: rest.rating.toString(),
            lat: rest.coordinates?.lat.toString() || '26.6011',
            lng: rest.coordinates?.lng.toString() || '82.1334'
        });
        setShowRestModal(true);
    };

    const handleAddRestaurant = () => {
        setEditingRestId(null);
        setRestForm({
            name: '', email: '', password: '', phone: '', address: '', cuisine: 'North Indian, Fast Food',
            priceRange: '₹₹', deliveryTime: '30-40 min', rating: '4.5', lat: '26.6011', lng: '82.1334'
        });
        setShowRestModal(true);
    };

    const handleDeleteRestaurant = (id: string) => {
        if (!confirm("Are you sure you want to remove this restaurant? This cannot be undone.")) return;
        const updated = restaurants.filter(r => r.id !== id);
        if (onUpdateRestaurants) onUpdateRestaurants(updated);
    };

    const handleSaveRestaurant = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newRestData: any = {
            name: restForm.name,
            email: restForm.email,
            password: restForm.password,
            phone: restForm.phone,
            address: restForm.address,
            cuisine: restForm.cuisine.split(',').map(s => s.trim()).filter(Boolean),
            priceRange: restForm.priceRange,
            deliveryTime: restForm.deliveryTime,
            rating: parseFloat(restForm.rating) || 4.0,
            coordinates: {
                lat: parseFloat(restForm.lat) || 26.6011,
                lng: parseFloat(restForm.lng) || 82.1334
            },
            image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
            banner: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80",
            status: 'ACTIVE',
            role: 'RESTAURANT'
        };

        let updatedList = [...restaurants];

        if (editingRestId) {
            updatedList = updatedList.map(r => r.id === editingRestId ? { ...r, ...newRestData } : r);
        } else {
            const newRest: Restaurant = {
                id: `rest-${Date.now()}`,
                menu: [],
                reviews: [],
                wallet: {
                    grossEarnings: 0,
                    pendingBalance: 0,
                    withdrawableBalance: 0,
                    lastSettlementAt: new Date().toISOString()
                },
                isPromoted: false,
                ...newRestData
            };
            updatedList.push(newRest);
        }

        if (onUpdateRestaurants) onUpdateRestaurants(updatedList);
        setShowRestModal(false);
    };

    return (
        <div className="min-h-screen bg-cream-50 p-4 md:p-8 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter">System Admin</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm w-full md:w-auto overflow-x-auto hide-scrollbar">
                        <button onClick={() => setActiveTab('overview')} className={`flex-1 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-900'}`}>Overview</button>
                        <button onClick={() => setActiveTab('verification')} className={`flex-1 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap relative ${activeTab === 'verification' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                            Verification
                            {pendingPartners.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>}
                        </button>
                        <button onClick={() => setActiveTab('restaurants')} className={`flex-1 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'restaurants' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-900'}`}>Fleet</button>
                        <button onClick={() => setActiveTab('orders')} className={`flex-1 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-900'}`}>Ledger</button>
                        <button onClick={() => setActiveTab('settings')} className={`flex-1 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-900'}`}>Pricing</button>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-500 font-bold bg-white p-2.5 rounded-2xl shadow-sm transition-colors">
                        <LogOut size={20}/>
                    </button>
                </div>
            </header>

            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                            <h3 className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-2 relative z-10">Net Revenue</h3>
                            <p className="text-3xl font-black text-gray-900 relative z-10">₹{stats.totalRevenue.toFixed(0)}</p>
                        </div>
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-50">
                            <h3 className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-2">Commissions</h3>
                            <p className="text-3xl font-black text-gray-900">₹{stats.commissions.toFixed(0)}</p>
                        </div>
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-50">
                            <h3 className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-2">Rider Pay</h3>
                            <p className="text-3xl font-black text-blue-600">₹{stats.riderPayoutsPaid.toFixed(0)}</p>
                        </div>
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-50">
                             <h3 className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-2">Payout Queue</h3>
                             <p className="text-3xl font-black text-orange-500">
                                 ₹{requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0)}
                             </p>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Platform Performance</h2>
                        <EarningsChart role="admin" todayEarnings={0} totalEarnings={stats.totalRevenue} />
                    </div>

                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mt-12 mb-6 ml-1">Merchant Payout Requests</h2>
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Requester</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">UPI / Node</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Tier</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {requests.length === 0 ? (
                                        <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold italic">No pending settlements.</td></tr>
                                    ) : (
                                        requests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="p-6">
                                                    <div className="font-black text-gray-800 text-sm">{req.requesterName}</div>
                                                    <div className="text-[10px] text-gray-400">{new Date(req.date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-6 font-black text-gray-900">₹{req.amount}</td>
                                                <td className="p-6 font-mono text-[11px] text-gray-500">{req.upiId}</td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${req.requesterType === 'restaurant' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {req.requesterType}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    {req.status === 'pending' ? (
                                                        <button onClick={() => onPayRequest(req.id)} className="bg-black text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform">Settle</button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest">
                                                            <CheckCircle size={14}/> Complete
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'verification' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 italic tracking-tighter">Partner Verification</h2>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Vetting new merchants and delivery captains</p>
                        </div>
                        <div className="bg-black text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
                            {pendingPartners.length} Queue
                        </div>
                    </div>

                    {pendingPartners.length === 0 ? (
                        <div className="bg-white rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100">
                            <ShieldCheck className="mx-auto text-gray-200 mb-4" size={64} />
                            <p className="text-gray-400 font-bold italic">All applications processed. Great job!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {pendingPartners.map(p => (
                                <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-brand-100 transition-colors">
                                    <div className="flex items-center gap-6 flex-1">
                                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 ${p.role === 'RESTAURANT' ? 'bg-brand-50 text-brand-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {p.role === 'RESTAURANT' ? <Store size={32} /> : <Bike size={32} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-black text-gray-900 italic tracking-tighter">{p.name}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.role === 'RESTAURANT' ? 'bg-brand-50 text-brand-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {p.role}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-3">
                                                <p className="text-sm font-bold text-gray-500 flex items-center gap-2"><Mail size={14} className="text-gray-300"/> {p.email}</p>
                                                <p className="text-sm font-bold text-gray-500 flex items-center gap-2"><Phone size={14} className="text-gray-300"/> {p.phone}</p>
                                                <p className="text-xs text-gray-400 flex items-center gap-2 md:col-span-2 mt-2"><MapPin size={14} className="text-gray-200 shrink-0"/> {p.details}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button 
                                            onClick={() => handlePartnerAction(p.id, p.role, 'ACTIVE')}
                                            className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle size={16}/> Approve
                                        </button>
                                        <button 
                                            onClick={() => handlePartnerAction(p.id, p.role, 'BLOCKED')}
                                            className="bg-red-50 text-red-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 active:scale-95 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 p-10">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="bg-black text-white p-3 rounded-2xl"><DollarSign size={24}/></div>
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter">Economic Controls</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform-wide pricing rules</p>
                            </div>
                        </div>
                        <form onSubmit={handleConfigSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Base Delivery (₹)</label>
                                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-black text-gray-800 focus:ring-2 focus:ring-brand-500" value={config.delivery_fee.amount} onChange={e => setConfig({...config, delivery_fee: {...config.delivery_fee, amount: Number(e.target.value), type: Number(e.target.value) === 0 ? 'FREE' : 'FIXED'}})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Platform Fee (₹)</label>
                                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-black text-gray-800 focus:ring-2 focus:ring-brand-500" value={config.platform_fee.amount} onChange={e => setConfig({...config, platform_fee: {...config.platform_fee, amount: Number(e.target.value)}})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Commission (%)</label>
                                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-black text-gray-800 focus:ring-2 focus:ring-brand-500" value={config.commissionPct} onChange={e => setConfig({...config, commissionPct: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Rider Base (₹)</label>
                                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-black text-gray-800 focus:ring-2 focus:ring-brand-500" value={config.riderBasePay} onChange={e => setConfig({...config, riderBasePay: Number(e.target.value)})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98] hover:bg-gray-900">Update Governance Rules</button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'restaurants' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 italic tracking-tighter">Active Fleet</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Operational merchants across the platform</p>
                        </div>
                        <button onClick={handleAddRestaurant} className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-brand-700 shadow-xl shadow-brand-600/20 transition-all"><Plus size={18} /> New Merchant</button>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Node / Merchant</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Auth & Status</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Address</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Ledger</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {restaurants.map(rest => {
                                        return (
                                            <tr key={rest.id} className="hover:bg-gray-50/30">
                                                <td className="p-6">
                                                    <div className="font-black text-gray-900 text-sm">{rest.name}</div>
                                                    <div className="text-[10px] font-mono text-gray-400">ID: {rest.id.slice(-6)}</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-2">
                                                        <span className={`w-fit px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${rest.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {rest.status}
                                                        </span>
                                                        <button onClick={() => togglePassword(rest.id)} className="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-600 flex items-center gap-1">
                                                            {visiblePasswords.has(rest.id) ? <EyeOff size={10}/> : <Eye size={10}/>}
                                                            {visiblePasswords.has(rest.id) ? rest.password : '••••••'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-xs font-bold text-gray-500 truncate max-w-[200px]">{rest.address}</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="font-black text-green-600 text-sm">₹{rest.wallet?.withdrawableBalance?.toFixed(0) || 0}</div>
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 mt-1">Settled Funds</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleEditRestaurant(rest)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-black hover:text-white transition-all"><Edit2 size={16}/></button>
                                                        <button onClick={() => handleDeleteRestaurant(rest.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="animate-fade-in">
                     <h2 className="text-3xl font-black text-gray-900 italic tracking-tighter mb-8">Unified Ledger</h2>
                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[900px]">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Parties</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Accounting</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50/30">
                                            <td className="p-6">
                                                <div className="font-mono text-xs font-black text-gray-800">#{order.id.slice(-8)}</div>
                                                <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{new Date(order.date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-gray-800 text-xs">{order.customerName}</div>
                                                <div className="text-[10px] font-bold text-brand-600 mt-1">{order.restaurantName}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-gray-900 text-sm">₹{order.total}</div>
                                                <div className="text-[9px] font-bold text-gray-400 mt-1">Comm: ₹{order.commissionAmount?.toFixed(0)} | Rider: ₹{order.riderPayout?.toFixed(0)}</div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </div>
            )}

            {showRestModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black italic tracking-tighter">{editingRestId ? 'Update Merchant' : 'Deploy New Node'}</h2>
                            <button onClick={() => setShowRestModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveRestaurant} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Business Name</label>
                                    <input required className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-black" placeholder="e.g. Barsati Sweets" value={restForm.name} onChange={e => setRestForm({...restForm, name: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Contact Email</label>
                                    <input required className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-black" placeholder="admin@merchant.com" value={restForm.email} onChange={e => setRestForm({...restForm, email: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Login Password</label>
                                    <input required className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-black" placeholder="Set secure password" value={restForm.password} onChange={e => setRestForm({...restForm, password: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Merchant Phone</label>
                                    <input required className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-black" placeholder="+91..." value={restForm.phone} onChange={e => setRestForm({...restForm, phone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2">Full Address</label>
                                    <textarea required className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-black h-24 resize-none" placeholder="Operational address" value={restForm.address} onChange={e => setRestForm({...restForm, address: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-gray-900 transition-all mt-6 flex items-center justify-center gap-3">
                                <Save size={20} /> Update Merchant Node
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
