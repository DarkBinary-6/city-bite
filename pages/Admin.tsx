
import React, { useState, useEffect, useRef } from 'react';
import { Restaurant, Order, MenuItem, WithdrawalRequest, OrderStatus, BankDetails } from '../types';
import { 
    LayoutDashboard, List, TrendingUp, Settings, LogOut, Wallet, IndianRupee, 
    Store, Trash2, Edit2, Clock, CheckCircle, AlertTriangle, Menu as MenuIcon, 
    Phone, User as UserIcon, X, ChevronRight, Bell, Zap, Power, DollarSign, MessageSquare, 
    CornerDownRight, CreditCard, ChevronDown, ChevronUp, Landmark, Plus, Save, Search, Camera, Image as ImageIcon, Upload, History, Utensils
} from 'lucide-react';
import { getConfig } from '../utils/storage';

interface AdminProps {
    restaurant: Restaurant;
    orders: Order[];
    withdrawalHistory: WithdrawalRequest[];
    onUpdateRestaurant: (updated: Restaurant) => void;
    onUpdateOrderStatus: (orderId: string, status: OrderStatus, prepTime?: number, reason?: string) => void;
    onLogout: () => void;
    onWithdraw: (amount: number, upiId: string) => void;
    onPromote: (restId: string) => void; 
}

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const TimeDisplay = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    return <span className="font-mono text-sm text-gray-500">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
};

const OrderTimer: React.FC<{ placedAt: string; onExpire: () => void }> = ({ placedAt, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes to accept
    
    useEffect(() => {
        const created = new Date(placedAt).getTime();
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - created) / 1000);
            const remaining = 300 - diff;
            
            if (remaining <= 0) {
                setTimeLeft(0);
                onExpire(); // Trigger auto-rejection
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [placedAt, onExpire]);

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const isCritical = timeLeft < 60;

    return (
        <div className={`font-mono font-bold text-lg ${isCritical ? 'text-red-600 animate-pulse' : 'text-green-700'}`}>
            {mins}:{secs.toString().padStart(2, '0')}
        </div>
    );
};

export const AdminDashboard: React.FC<AdminProps> = ({ restaurant, orders, withdrawalHistory, onUpdateRestaurant, onUpdateOrderStatus, onLogout, onWithdraw }) => {
    const [activeTab, setActiveTab] = useState<'live' | 'menu' | 'payouts' | 'reviews' | 'settings'>('live');
    const [rejectModalOrder, setRejectModalOrder] = useState<string | null>(null);
    const [acceptModalOrder, setAcceptModalOrder] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('Kitchen Busy');
    
    // Modals State
    const [showBankModal, setShowBankModal] = useState(false);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false); 
    
    // Withdrawal Form
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const [bankForm, setBankForm] = useState<BankDetails>(restaurant.bankDetails || { accountHolderName: '', accountNumber: '', bankName: '', ifscCode: '' });
    
    // Restaurant Edit Form
    const [restEditForm, setRestEditForm] = useState({
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        banner: restaurant.banner || '',
        image: restaurant.image || ''
    });

    // Add Item State
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [newItem, setNewItem] = useState<{name: string, price: string, category: string, description: string, isVeg: boolean, image: string}>({
        name: '', price: '', category: '', description: '', isVeg: true, image: ''
    });

    const audioRef = useRef<HTMLAudioElement>(new Audio(NOTIFICATION_SOUND));
    const config = getConfig();

    // Stats Logic - Reliably filter by ID
    const myOrders = orders.filter(o => o.restaurantId === restaurant.id);
    const today = new Date().toLocaleDateString();
    const todayOrders = myOrders.filter(o => new Date(o.date).toLocaleDateString() === today && o.status !== 'cancelled' && o.status !== 'rejected');
    const todayRevenue = todayOrders.reduce((acc, o) => acc + o.netRestaurantEarnings, 0);
    
    const incomingOrders = myOrders.filter(o => o.status === 'placed').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const activeOrders = myOrders.filter(o => ['accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'rider_at_restaurant', 'out_for_delivery'].includes(o.status)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const pastOrders = myOrders.filter(o => ['delivered', 'cancelled', 'rejected', 'picked_up'].includes(o.status)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Settlement Logic: Check if 24 hours passed since last settlement
    useEffect(() => {
        if (!restaurant.wallet) return;
        const lastSettled = new Date(restaurant.wallet.lastSettlementAt).getTime();
        const now = Date.now();
        const hrs24 = 24 * 60 * 60 * 1000;
        
        if (now - lastSettled >= hrs24 && restaurant.wallet.pendingBalance > 0) {
            handleSettlement();
        }
    }, [restaurant.wallet]);

    const handleSettlement = () => {
        const updated = { ...restaurant };
        updated.wallet.withdrawableBalance += updated.wallet.pendingBalance;
        updated.wallet.pendingBalance = 0;
        updated.wallet.lastSettlementAt = new Date().toISOString();
        onUpdateRestaurant(updated);
    };

    useEffect(() => {
        if (incomingOrders.length > 0) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => console.log("Audio play blocked until interaction"));
            }
        }
    }, [incomingOrders.length]);

    const handleAccept = (id: string) => setAcceptModalOrder(id);
    const handleConfirmAccept = (time: number) => {
        if (acceptModalOrder) {
            onUpdateOrderStatus(acceptModalOrder, 'accepted', time);
            setAcceptModalOrder(null);
        }
    };

    const handleReject = () => {
        if (rejectReason && rejectModalOrder) {
            onUpdateOrderStatus(rejectModalOrder, 'rejected', undefined, rejectReason);
            setRejectModalOrder(null);
        }
    };
    
    const handleStatusAdvance = (order: Order) => {
        if (order.status === 'accepted') onUpdateOrderStatus(order.id, 'preparing');
        else if (order.status === 'preparing') onUpdateOrderStatus(order.id, 'ready_for_pickup');
        else if (order.status === 'ready_for_pickup') onUpdateOrderStatus(order.id, 'picked_up');
    };

    const toggleRestaurantStatus = () => {
        onUpdateRestaurant({ ...restaurant, isOpen: !restaurant.isOpen });
    };

    const handleRequestWithdrawalClick = () => {
        if (!restaurant.bankDetails || !restaurant.bankDetails.accountNumber) {
            alert("Please add Bank Details first in the Payouts tab.");
            setShowBankModal(true);
            return;
        }
        setShowWithdrawModal(true);
    };

    const handleWithdrawSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        const withdrawable = restaurant.wallet.withdrawableBalance || 0;
        
        if (isNaN(amt) || amt <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        if(amt > withdrawable) {
            alert("Amount exceeds withdrawable balance.");
            return;
        }
        
        onWithdraw(amt, "Bank Transfer"); 
        setShowWithdrawModal(false);
        setWithdrawAmount('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'banner' | 'image') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setRestEditForm(prev => ({ ...prev, [field]: base64 }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setNewItem(prev => ({ ...prev, image: base64 }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveRestaurantProfile = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateRestaurant({
            ...restaurant,
            name: restEditForm.name,
            address: restEditForm.address,
            phone: restEditForm.phone,
            email: restEditForm.email,
            banner: restEditForm.banner,
            image: restEditForm.image
        });
        setShowProfileEdit(false);
    };

    const toggleItemStock = (categoryName: string, itemId: string) => {
        const newMenu = restaurant.menu.map(cat => {
            if (cat.category === categoryName) {
                return {
                    ...cat,
                    items: cat.items.map(item => item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item)
                };
            }
            return cat;
        });
        onUpdateRestaurant({ ...restaurant, menu: newMenu });
    };

    const toggleCategory = (categoryName: string) => {
        const newMenu = restaurant.menu.map(cat => cat.category === categoryName ? { ...cat, isAvailable: !cat.isAvailable } : cat);
        onUpdateRestaurant({ ...restaurant, menu: newMenu });
    };

    const updateItemPrice = (categoryName: string, itemId: string, newPrice: number) => {
        const newMenu = restaurant.menu.map(cat => {
            if (cat.category === categoryName) {
                return {
                    ...cat,
                    items: cat.items.map(item => item.id === itemId ? { ...item, price: newPrice } : item)
                };
            }
            return cat;
        });
        onUpdateRestaurant({ ...restaurant, menu: newMenu });
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(newItem.price);
        if (!newItem.name || !newItem.category || isNaN(price)) return;

        const menuItem: MenuItem = {
            id: `item-${Date.now()}`,
            name: newItem.name,
            price: price,
            description: newItem.description || 'Delicious freshly prepared item.',
            image: newItem.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80",
            isVeg: newItem.isVeg,
            isAvailable: true
        };

        const existingCategoryIndex = restaurant.menu.findIndex(c => c.category.toLowerCase() === newItem.category.toLowerCase());
        let newMenu = [...restaurant.menu];

        if (existingCategoryIndex >= 0) {
            newMenu[existingCategoryIndex].items.push(menuItem);
        } else {
            newMenu.push({
                category: newItem.category,
                isAvailable: true,
                items: [menuItem]
            });
        }

        onUpdateRestaurant({ ...restaurant, menu: newMenu });
        setNewItem({ name: '', price: '', category: '', description: '', isVeg: true, image: '' });
        setShowAddItemModal(false);
    };

    const handleReply = (reviewId: string, replyText: string) => {
        const newReviews = restaurant.reviews.map(r => r.id === reviewId ? { ...r, reply: replyText } : r);
        onUpdateRestaurant({ ...restaurant, reviews: newReviews });
    };

    const saveBankDetails = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateRestaurant({ ...restaurant, bankDetails: bankForm });
        setShowBankModal(false);
    };

    const lookupIFSC = (code: string) => {
        const mockBanks: Record<string, string> = {
            'SBIN': 'State Bank of India',
            'HDFC': 'HDFC Bank',
            'ICIC': 'ICICI Bank',
            'BARB': 'Bank of Baroda'
        };
        const prefix = code.slice(0, 4).toUpperCase();
        if (mockBanks[prefix]) {
            setBankForm(prev => ({ ...prev, bankName: mockBanks[prefix] }));
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
            {/* --- TOP HEADER --- */}
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-brand-600 text-white p-2 rounded-lg"><Store size={20}/></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-extrabold text-lg leading-tight">{restaurant.name}</h1>
                            <button onClick={() => setShowProfileEdit(true)} className="text-gray-400 hover:text-brand-600"><Edit2 size={14}/></button>
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{restaurant.address} • <TimeDisplay/></p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer transition-all ${restaurant.isOpen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`} onClick={toggleRestaurantStatus}>
                        <div className={`w-3 h-3 rounded-full ${restaurant.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-bold ${restaurant.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                            {restaurant.isOpen ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <Power size={14} className={restaurant.isOpen ? 'text-green-600' : 'text-red-600'}/>
                    </div>
                    
                    <button onClick={onLogout} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><LogOut size={20}/></button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* --- SIDEBAR NAV --- */}
                <nav className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
                    <div className="flex-1 py-6 space-y-2">
                        {[
                            { id: 'live', label: 'Kitchen Management', icon: Zap, count: incomingOrders.length + activeOrders.length },
                            { id: 'menu', label: 'Menu Control', icon: MenuIcon },
                            { id: 'payouts', label: 'Payouts', icon: Wallet },
                            { id: 'reviews', label: 'Reviews', icon: MessageSquare },
                            { id: 'settings', label: 'Settings', icon: Settings },
                        ].map(item => (
                            <button 
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-4 px-4 lg:px-6 py-4 transition-all relative
                                    ${activeTab === item.id ? 'text-brand-600 bg-brand-50 border-r-4 border-brand-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}
                                `}
                            >
                                <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                                <span className="hidden lg:block font-bold text-sm">{item.label}</span>
                                {item.count ? (
                                    <span className="absolute top-3 right-4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {item.count}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* --- MAIN CONTENT AREA --- */}
                <main className="flex-1 bg-gray-50 overflow-y-auto p-4 lg:p-8">
                    
                    {/* LIVE KITCHEN MANAGEMENT VIEW */}
                    {activeTab === 'live' && (
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Today's Earnings</p>
                                    <p className="text-2xl font-extrabold text-gray-900 mt-1">₹{todayRevenue.toFixed(0)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Orders Today</p>
                                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{todayOrders.length}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Pending</p>
                                    <p className="text-2xl font-extrabold text-orange-500 mt-1">{incomingOrders.length}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 font-bold uppercase">In Kitchen</p>
                                    <p className="text-2xl font-extrabold text-blue-600 mt-1">{activeOrders.length}</p>
                                </div>
                            </div>

                            {/* Unified Kitchen Dashboard with Accept/Reject integrated for "placed" orders */}
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                                    <Utensils className="text-brand-600" size={24} /> 
                                    Kitchen Management Hub
                                </h2>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {/* New Incoming Orders that need Accept/Reject */}
                                    {incomingOrders.map(order => {
                                        const restaurantPortion = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                        return (
                                            <div key={order.id} className="bg-white rounded-[2rem] shadow-xl border-4 border-brand-100 overflow-hidden animate-slide-up flex flex-col md:flex-row">
                                                <div className="bg-brand-500 text-white p-6 md:w-48 flex flex-col items-center justify-center text-center">
                                                    <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-2">
                                                        <Bell size={24} className="animate-bounce" />
                                                    </div>
                                                    <span className="font-black text-xs uppercase tracking-widest opacity-80">New Order</span>
                                                    <div className="font-mono font-bold text-lg mt-1">#{order.id.slice(-6)}</div>
                                                    <div className="mt-4">
                                                        <OrderTimer placedAt={order.date} onExpire={() => onUpdateOrderStatus(order.id, 'rejected')} />
                                                    </div>
                                                </div>
                                                
                                                <div className="p-6 flex-1 flex flex-col md:flex-row justify-between gap-8">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-black text-gray-900 mb-1">{order.customerName}</h3>
                                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4">{new Date(order.date).toLocaleTimeString()}</p>
                                                        
                                                        <div className="space-y-2">
                                                            {order.items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl">
                                                                    <span className="font-bold text-gray-800 flex items-center gap-3">
                                                                        <span className="bg-brand-600 text-white w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black">{item.quantity}</span>
                                                                        {item.name}
                                                                    </span>
                                                                    <span className="text-gray-400 font-bold">₹{item.price * item.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="md:w-64 flex flex-col justify-between">
                                                        <div className="text-right mb-6">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Restaurant Portion</p>
                                                            <p className="text-2xl font-black text-brand-600">₹{restaurantPortion}</p>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <button onClick={() => handleAccept(order.id)} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-green-600/20 uppercase tracking-widest transition-transform active:scale-95 hover:bg-green-700">Accept Order</button>
                                                            <button onClick={() => setRejectModalOrder(order.id)} className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-colors">Reject</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Already Accepted / Processing Orders */}
                                    {activeOrders.map(order => (
                                        <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-8">
                                            <div className="md:w-32 text-center md:text-left">
                                                <span className="font-mono font-bold text-gray-400 block text-xs">#{order.id.slice(-6)}</span>
                                                <div className={`mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    order.status === 'accepted' ? 'bg-orange-100 text-orange-600' :
                                                    order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-green-100 text-green-600'
                                                }`}>
                                                    {order.status.replace(/_/g, ' ')}
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full">
                                                <h3 className="font-black text-gray-900 text-lg leading-none mb-2">{order.customerName}</h3>
                                                <div className="text-sm text-gray-500 font-medium">
                                                    {order.items.map(i => `${i.quantity} x ${i.name}`).join(', ')}
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-4 mt-4">
                                                    {order.prepTimeMinutes && order.status === 'preparing' && (
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                                                            <Clock size={12}/> {order.prepTimeMinutes} MIN REMAINING
                                                        </div>
                                                    )}
                                                    {order.riderName ? (
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                                            <UserIcon size={12} /> RIDER: {order.riderName}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                                            AWAITING RIDER
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:w-64">
                                                {['accepted', 'preparing', 'ready_for_pickup'].includes(order.status) && (
                                                    <button 
                                                        onClick={() => handleStatusAdvance(order)}
                                                        className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs
                                                            ${order.status === 'accepted' ? 'bg-orange-500 shadow-orange-500/20 hover:bg-orange-600' : 
                                                              order.status === 'preparing' ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700' : 
                                                              'bg-green-600 shadow-green-600/20 hover:bg-green-700'}
                                                        `}
                                                    >
                                                        {order.status === 'accepted' && <>Start Cooking <Zap size={18}/></>}
                                                        {order.status === 'preparing' && <>Mark Ready <CheckCircle size={18}/></>}
                                                        {order.status === 'ready_for_pickup' && <>Handed Over <CornerDownRight size={18}/></>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {incomingOrders.length === 0 && activeOrders.length === 0 && (
                                    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                                        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                                            <Utensils size={48} />
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-2 italic">Kitchen is empty</h3>
                                        <p className="text-gray-400 font-bold">New orders will appear here as soon as they are placed.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MENU MANAGEMENT VIEW */}
                    {activeTab === 'menu' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Menu & Stock</h2>
                                <button 
                                    onClick={() => setShowAddItemModal(true)}
                                    className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 shadow-md transition-colors"
                                >
                                    <Plus size={20} /> Add Item
                                </button>
                            </div>
                            
                            <div className="space-y-8">
                                {restaurant.menu.map((cat, catIdx) => (
                                    <div key={cat.category} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                            <h3 className="font-bold text-lg text-gray-800">{cat.category}</h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Category Status</span>
                                                <button 
                                                    onClick={() => toggleCategory(cat.category)}
                                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${cat.isAvailable !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${cat.isAvailable !== false ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="divide-y divide-gray-100">
                                            {cat.items.map(item => (
                                                <div key={item.id} className={`p-4 flex items-center justify-between ${item.isAvailable === false ? 'bg-gray-50 opacity-75' : ''}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0`}>
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 flex items-center gap-2">
                                                                <span className={`w-4 h-4 border flex items-center justify-center p-[1px] ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                                                    <span className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                                                </span>
                                                                {item.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-gray-400 text-xs">₹</span>
                                                                <input 
                                                                    type="number"
                                                                    className="w-20 bg-transparent border-b border-gray-300 focus:border-brand-500 outline-none text-sm font-bold text-gray-700 py-0.5"
                                                                    value={item.price}
                                                                    onChange={(e) => updateItemPrice(cat.category, item.id, Number(e.target.value))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => toggleItemStock(cat.category, item.id)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors
                                                            ${item.isAvailable !== false ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-600 bg-white'}
                                                        `}
                                                    >
                                                        {item.isAvailable !== false ? 'IN STOCK' : 'OUT OF STOCK'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PAYOUTS VIEW */}
                    {activeTab === 'payouts' && (
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Earnings & Settlements</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                    <p className="text-gray-400 text-xs font-bold uppercase mb-1">Lifetime Gross Earnings</p>
                                    <h3 className="text-3xl font-extrabold">₹{restaurant.wallet?.grossEarnings?.toFixed(0) || 0}</h3>
                                    <p className="text-xs text-gray-500 mt-2">from {pastOrders.length} orders</p>
                                    <DollarSign className="absolute bottom-4 right-4 text-gray-700 opacity-20" size={64} />
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <p className="text-gray-500 text-xs font-bold uppercase mb-1">Available to Withdraw</p>
                                    <h3 className="text-3xl font-extrabold text-gray-900">₹{restaurant.wallet?.withdrawableBalance?.toFixed(0) || 0}</h3>
                                    <button 
                                        onClick={handleRequestWithdrawalClick} 
                                        className="mt-4 w-full py-2 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
                                    >
                                        Request Withdrawal
                                    </button>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Landmark size={20}/></div>
                                            <div>
                                                <p className="font-bold text-sm">
                                                    {restaurant.bankDetails ? restaurant.bankDetails.bankName : 'No Bank Added'}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {restaurant.bankDetails ? `**** ${restaurant.bankDetails.accountNumber.slice(-4)}` : 'Add details for payout'}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowBankModal(true)} className="p-2 hover:bg-gray-50 rounded-full text-brand-600"><Edit2 size={16}/></button>
                                    </div>
                                    <div className="text-xs bg-orange-50 text-orange-700 px-3 py-2 rounded-lg font-bold flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><Clock size={14}/> Pending Settlement: ₹{restaurant.wallet?.pendingBalance?.toFixed(0) || 0}</div>
                                        <p className="text-[10px] text-orange-600 font-normal">Next Settlement: Tomorrow, 6 AM</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700 flex justify-between items-center">
                                    <div className="flex items-center gap-2"><History size={18}/> Withdrawal History</div>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 font-bold">Request ID</th>
                                            <th className="p-4 font-bold">Date</th>
                                            <th className="p-4 font-bold">Amount</th>
                                            <th className="p-4 font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {withdrawalHistory.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">No withdrawal requests found.</td></tr>
                                        ) : (
                                            withdrawalHistory.map(req => (
                                                <tr key={req.id}>
                                                    <td className="p-4 font-mono">#{req.id.slice(-6)}</td>
                                                    <td className="p-4 text-gray-500">{new Date(req.date).toLocaleDateString()}</td>
                                                    <td className="p-4 font-bold">₹{req.amount}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${req.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700">Order-wise Breakdown</div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 font-bold">Order ID</th>
                                            <th className="p-4 font-bold">Date</th>
                                            <th className="p-4 font-bold text-right">Base Price</th>
                                            <th className="p-4 font-bold text-right text-red-500">Comm. Paid</th>
                                            <th className="p-4 font-bold text-right text-green-600">Net Earning</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {pastOrders.slice(0, 10).map(order => {
                                            const subtotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                                            const packing = order.items.reduce((sum, i) => sum + (i.packingCharge || 0) * i.quantity, 0);
                                            const baseTotal = subtotal + packing;
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="p-4 font-mono font-bold text-gray-700">#{order.id.slice(-6)}</td>
                                                    <td className="p-4 text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right font-medium">₹{baseTotal}</td>
                                                    <td className="p-4 text-right text-red-500">-₹{order.commissionAmount.toFixed(2)}</td>
                                                    <td className="p-4 text-right font-bold text-green-700">₹{order.netRestaurantEarnings.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* REVIEWS VIEW */}
                    {activeTab === 'reviews' && (
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Feedback</h2>
                            <div className="space-y-4">
                                {restaurant.reviews.map(review => (
                                    <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-bold text-gray-900">{review.user}</div>
                                                <div className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="bg-green-600 text-white px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                                                {review.rating} <Store size={12} fill="white"/>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 mb-4">{review.text}</p>
                                        
                                        {review.reply ? (
                                            <div className="bg-gray-50 p-4 rounded-xl text-sm border-l-4 border-brand-500">
                                                <p className="font-bold text-gray-900 mb-1">Your Reply:</p>
                                                <p className="text-gray-600">{review.reply}</p>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input 
                                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" 
                                                    placeholder="Write a reply..."
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleReply(review.id, e.currentTarget.value);
                                                    }}
                                                />
                                                <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">Reply</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS VIEW */}
                    {activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Restaurant Settings</h2>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Operational Hours</label>
                                    <input 
                                        className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-bold"
                                        defaultValue="10:00 AM - 11:00 PM"
                                    />
                                </div>
                                <div className="flex items-center justify-between py-4 border-t border-gray-100">
                                    <div>
                                        <div className="font-bold text-gray-900">Temporary Closure</div>
                                        <div className="text-xs text-gray-500">Stop receiving orders for a short break</div>
                                    </div>
                                    <button 
                                        onClick={toggleRestaurantStatus}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors ${!restaurant.isOpen ? 'bg-red-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${!restaurant.isOpen ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Outlet Contact</label>
                                    <input 
                                        className="w-full p-3 border border-gray-300 rounded-xl bg-white" 
                                        value={restEditForm.phone} 
                                        onChange={(e) => setRestEditForm({...restEditForm, phone: e.target.value})} 
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Make sure to save changes in 'Edit Profile' to persist.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Manager Name</label>
                                    <input className="w-full p-3 border border-gray-300 rounded-xl bg-white" defaultValue="Main Manager" />
                                </div>
                                <button onClick={() => setShowProfileEdit(true)} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700">Edit Profile & Save</button>
                                
                                <div className="pt-4 border-t border-gray-100">
                                    <button onClick={handleSettlement} className="text-xs font-bold text-blue-600 hover:underline">Force Manual Settlement (Demo Only)</button>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {/* WITHDRAWAL MODAL */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Request Withdrawal</h2>
                            <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Amount (₹)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 border rounded-xl" 
                                    value={withdrawAmount} 
                                    onChange={e => setWithdrawAmount(e.target.value)} 
                                    max={restaurant.wallet.withdrawableBalance}
                                    required 
                                />
                                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">Withdrawable Balance:</span>
                                        <span className="font-bold text-brand-600">₹{restaurant.wallet.withdrawableBalance?.toFixed(0) || 0}</span>
                                    </div>
                                    {restaurant.wallet.pendingBalance > 0 && (
                                        <div className="flex justify-between text-[10px] text-orange-600">
                                            <span>Unsettled Earnings:</span>
                                            <span>₹{restaurant.wallet.pendingBalance?.toFixed(0) || 0}</span>
                                        </div>
                                    )}
                                </div>
                                {restaurant.wallet.withdrawableBalance <= 0 && (
                                    <p className="text-[10px] text-gray-400 mt-2 italic">Balance will be available after settlement (within 24 hrs)</p>
                                )}
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                                <p className="font-bold flex items-center gap-2 mb-1"><Landmark size={16}/> Bank Transfer</p>
                                <p>Funds will reach your bank within 2 business days after approval.</p>
                            </div>
                            <button 
                                type="submit" 
                                disabled={restaurant.wallet.withdrawableBalance <= 0}
                                className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                            >
                                Confirm Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* PREP TIME SELECTION MODAL */}
            {acceptModalOrder && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-extrabold text-gray-900">Set Preparation Time</h3>
                            <button onClick={() => setAcceptModalOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">Select how long it will take to prepare this order. This will be shown to the customer.</p>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[10, 15, 20, 30, 45, 60].map(time => (
                                <button 
                                    key={time}
                                    onClick={() => handleConfirmAccept(time)}
                                    className="py-4 rounded-xl border-2 border-gray-100 font-bold text-gray-800 hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center"
                                >
                                    <span className="text-lg">{time}</span>
                                    <span className="text-[10px] uppercase text-gray-400">min</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setAcceptModalOrder(null)}
                            className="w-full py-3 text-gray-400 font-bold text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ADD ITEM MODAL */}
            {showAddItemModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Add New Item</h2>
                            <button onClick={() => setShowAddItemModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Item Name</label>
                                <input required className="w-full p-3 border rounded-xl" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Butter Chicken" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Price (₹)</label>
                                    <input required type="number" className="w-full p-3 border rounded-xl" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Type</label>
                                    <select className="w-full p-3 border rounded-xl bg-white" value={newItem.isVeg ? 'veg' : 'nonveg'} onChange={e => setNewItem({...newItem, isVeg: e.target.value === 'veg'})}>
                                        <option value="veg">Veg</option>
                                        <option value="nonveg">Non-Veg</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-xs text-orange-500 bg-orange-50 p-2 rounded-lg">
                                Note: {config.commissionPct}% platform commission will be deducted from this price.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                                <input required list="categories" className="w-full p-3 border rounded-xl" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="e.g. Starters" />
                                <datalist id="categories">
                                    {restaurant.menu.map(c => <option key={c.category} value={c.category} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                                <textarea className="w-full p-3 border rounded-xl h-24 resize-none" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Short appetizing description..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Upload Image</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleItemImageChange} />
                                    {newItem.image ? (
                                        <img src={newItem.image} className="mx-auto h-32 object-cover rounded-lg"/>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400">
                                            <Upload size={24} className="mb-2"/>
                                            <span className="text-xs">Tap to upload from Gallery</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2">
                                <Plus size={18} /> Add to Menu
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* RESTAURANT PROFILE EDIT MODAL */}
            {showProfileEdit && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Edit Restaurant Profile</h2>
                            <button onClick={() => setShowProfileEdit(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveRestaurantProfile} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Restaurant Name</label>
                                <input required className="w-full p-3 border rounded-xl" value={restEditForm.name} onChange={e => setRestEditForm({...restEditForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Banner Image</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                                    {restEditForm.banner ? (
                                        <img src={restEditForm.banner} className="w-full h-24 object-cover rounded-lg"/>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Tap to upload Banner</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Display Image (Logo)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} />
                                    {restEditForm.image ? (
                                        <img src={restEditForm.image} className="w-20 h-20 object-cover rounded-full mx-auto"/>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Tap to upload Logo</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Address</label>
                                <input required className="w-full p-3 border rounded-xl" value={restEditForm.address} onChange={e => setRestEditForm({...restEditForm, address: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Phone</label>
                                    <input className="w-full p-3 border rounded-xl" value={restEditForm.phone} onChange={e => setRestEditForm({...restEditForm, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                    <input className="w-full p-3 border rounded-xl" value={restEditForm.email} onChange={e => setRestEditForm({...restEditForm, email: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* BANK DETAILS MODAL */}
            {showBankModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Bank Details</h2>
                            <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={saveBankDetails} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Account Holder Name</label>
                                <input required className="w-full p-3 border rounded-xl" value={bankForm.accountHolderName} onChange={e => setBankForm({...bankForm, accountHolderName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Account Number</label>
                                <input required className="w-full p-3 border rounded-xl" type="password" value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">IFSC Code</label>
                                <input 
                                    required 
                                    className="w-full p-3 border rounded-xl uppercase" 
                                    value={bankForm.ifscCode} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setBankForm({...bankForm, ifscCode: val});
                                        if(val.length >= 4) lookupIFSC(val);
                                    }} 
                                />
                                <a href="https://www.rbi.org.in/Scripts/IFSCMICRDetails.aspx" target="_blank" rel="noreferrer" className="text-xs text-blue-600 mt-1 flex items-center gap-1 hover:underline">
                                    <Search size={10}/> Find IFSC Code
                                </a>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Bank Name</label>
                                <input required className="w-full p-3 border rounded-xl bg-gray-50" value={bankForm.bankName} readOnly placeholder="Auto-filled from IFSC" />
                            </div>
                            <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold mt-4">Save & Verify</button>
                        </form>
                    </div>
                </div>
            )}

            {/* REJECTION MODAL */}
            {rejectModalOrder && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl">Reject Order?</h3>
                            <button onClick={() => setRejectModalOrder(null)}><X size={24} className="text-gray-400"/></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Please select a reason. This helps us improve dispatching.</p>
                        <div className="space-y-2 mb-6">
                            {['Kitchen Busy / Overloaded', 'Item Out of Stock', 'Closing Soon', 'Cannot Fulfill Special Request'].map(reason => (
                                <button 
                                    key={reason}
                                    onClick={() => setRejectReason(reason)}
                                    className={`w-full p-3 rounded-xl text-left text-sm font-medium border transition-all ${rejectReason === reason ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={handleReject}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
