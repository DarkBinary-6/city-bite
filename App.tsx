
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Layout';
import { Home } from './pages/Home';
import { RestaurantDetails } from './pages/Restaurant';
import { CartPage, CheckoutPage, OrderTracking } from './pages/Checkout';
import { AdminDashboard } from './pages/Admin';
import { DeliveryDashboard } from './pages/Delivery';
import { ProfilePage } from './pages/Profile';
import { SuperAdminDashboard } from './pages/SuperAdmin';
import { DocsPage } from './pages/Docs';
import { RiderReviewModal, RestaurantReviewModal, OrderCancelledModal } from './components/FeedbackModals';
import { LocationPicker } from './components/LocationPicker';
import { Footer } from './components/Footer'; 
import { SupportChat } from './components/SupportChat'; 
// Added missing Restaurant type to imports
import { View, CartItem, MenuItem, Order, OrderStatus, ChatMessage, User, Address, WithdrawalRequest, Review, WalletTransaction, TelemetryData, AccountStatus, Restaurant } from './types';
import { LogOut, Heart, MapPin, Search, ArrowLeft, ChefHat, Bike, Shield, User as UserIcon, Mail, Phone, Lock, CheckCircle, Circle, Store, UserCircle, Users, ExternalLink, ChevronRight, Info, ShieldAlert, Key, ShieldCheck, Navigation, ShieldCheck as ShieldCheckIcon, MailCheck, RefreshCw } from 'lucide-react';
import { calculateDistance, calculateEta, isWithinServiceArea, getServiceAreaError } from './utils/geo';
import { initStorage, getSession, setSession, clearSession, getUsers, saveUsers, getRestaurants, saveRestaurants, getOrders, saveOrders, getConfig } from './utils/storage';
import { registerPushNotifications, triggerNotificationEvent, monitorNotificationPermission } from './utils/push';
import { EconomicsEngine } from './services/EconomicsEngine'; 
import { FraudGuard } from './services/FraudGuard';

declare var Razorpay: any;

const Loader2: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

// --- COMMON LOGIN PAGE ---
const AuthPage: React.FC<{ onLogin: (user: any, role: string) => void, onGoToPartner: () => void }> = ({ onLogin, onGoToPartner }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleForgotSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const users = getUsers();
        const rests = getRestaurants();
        const targetUser = users.find(u => u.email === formData.email);
        const targetRest = rests.find(r => r.email === formData.email);
        
        if (targetUser || targetRest) {
            const token = Math.random().toString(36).substr(2, 9);
            const expiry = Date.now() + (15 * 60 * 1000); 
            if (targetUser) {
                targetUser.resetToken = token;
                targetUser.resetTokenExpires = expiry;
                saveUsers([...users]);
            } else if (targetRest) {
                targetRest.resetToken = token;
                targetRest.resetTokenExpires = expiry;
                saveRestaurants([...rests]);
            }
            console.log(`[DEBUG] Reset link: /reset-password?token=${token}`);
        }
        setSuccess('If an account exists for this email, you will receive a reset link shortly.');
        setAuthMode('login');
    };

    const handleResetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
        const users = getUsers();
        const rests = getRestaurants();
        const targetUser = users.find(u => u.resetToken === resetToken && (u.resetTokenExpires || 0) > Date.now());
        const targetRest = rests.find(r => r.resetToken === resetToken && (r.resetTokenExpires || 0) > Date.now());
        if (targetUser) {
            targetUser.password = formData.password;
            targetUser.resetToken = undefined;
            targetUser.resetTokenExpires = undefined;
            saveUsers([...users]);
            setSuccess('Password updated! You can now login.');
            setAuthMode('login');
        } else if (targetRest) {
            targetRest.password = formData.password;
            targetRest.resetToken = undefined;
            targetRest.resetTokenExpires = undefined;
            saveRestaurants([...rests]);
            setSuccess('Password updated! You can now login.');
            setAuthMode('login');
        } else setError('Invalid or expired reset link.');
    };

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.email === 'admin@citybite.com' && formData.password === 'admin') return onLogin({ name: 'Platform Admin', email: 'admin@citybite.com' }, 'superadmin');
        const users = getUsers();
        const foundUser = users.find(u => u.email === formData.email && u.password === formData.password);
        if (foundUser) {
            if (foundUser.role === 'DELIVERY' && foundUser.status !== 'ACTIVE') return setError('Your delivery account is under review.');
            if (foundUser.status === 'BLOCKED') return setError('Access Denied: Your account has been suspended.');
            return onLogin(foundUser, foundUser.role.toLowerCase());
        }
        const rests = getRestaurants();
        const foundRest = rests.find(r => r.email === formData.email && r.password === formData.password);
        if (foundRest) {
            if (foundRest.status !== 'ACTIVE') return setError('Restaurant verification is in progress.');
            return onLogin(foundRest, 'admin');
        }
        setError('Invalid login credentials. Please check and try again.');
    };

    const handleSignupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const users = getUsers();
        if (users.find(u => u.email === formData.email)) return setError("Email already exists");
        const newUser: User = {
            id: `u-${Date.now()}`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            savedAddresses: [],
            walletBalance: 0,
            codBalance: 0,
            totalDeliveries: 0,
            reviews: [],
            status: 'ACTIVE',
            role: 'CUSTOMER'
        };
        saveUsers([...users, newUser]);
        onLogin(newUser, 'customer');
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (token) { setResetToken(token); setAuthMode('reset'); }
    }, []);

    return (
        <div className="min-h-[70vh] bg-cream-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 my-10">
                <div className="bg-brand-600 p-8 text-white text-center">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                         <ChefHat size={32} />
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight">CityBite</h1>
                    <p className="text-brand-100 text-xs mt-1 font-medium italic">Empowering Local Cities</p>
                </div>
                
                <div className="p-8">
                    {authMode === 'reset' ? (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="bg-accent-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 text-accent-700">
                                    <Key size={24} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900">Set New Password</h2>
                            </div>
                            <form onSubmit={handleResetSubmit} className="space-y-4">
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                    <input required type="password" class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="New Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                    <input required type="password" class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                                </div>
                                {error && <p className="text-red-600 text-[10px] font-black uppercase text-center">{error}</p>}
                                <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">Update & Login</button>
                            </form>
                        </div>
                    ) : authMode === 'forgot' ? (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="bg-brand-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 text-brand-600">
                                    <RefreshCw size={24} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900">Reset Password</h2>
                            </div>
                            <form onSubmit={handleForgotSubmit} className="space-y-4">
                                <div className="relative group">
                                    <Mail size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                    <input required type="email" class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all">Send Link</button>
                                <button type="button" onClick={() => setAuthMode('login')} className="w-full py-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600">Cancel</button>
                            </form>
                        </div>
                    ) : (
                        <>
                            <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
                                <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Sign In</button>
                                <button onClick={() => setAuthMode('signup')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Sign Up</button>
                            </div>

                            <form onSubmit={authMode === 'login' ? handleLoginSubmit : handleSignupSubmit} className="space-y-4">
                                {authMode === 'signup' && (
                                    <div className="relative group">
                                        <UserIcon size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                        <input required type="text" class="w-full pl-12 pr-4 py-4 bg-gray-50 text-black border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                )}
                                <div className="relative group">
                                    <Mail size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                    <input required type="email" class="w-full pl-12 pr-4 py-4 bg-gray-50 text-black border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                    <input required type="password" class="w-full pl-12 pr-4 py-4 bg-gray-50 text-black border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                                {authMode === 'signup' && (
                                     <div className="relative group">
                                        <Phone size={16} className="absolute left-4 top-4 text-gray-400 z-10"/>
                                        <input required type="tel" class="w-full pl-12 pr-4 py-4 bg-gray-50 text-black border-none rounded-2xl focus:ring-2 focus:ring-brand-500 font-bold text-sm" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2 animate-shake">
                                        <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-red-600 text-[10px] font-black uppercase leading-tight">{error}</p>
                                    </div>
                                )}
                                
                                {success && (
                                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex items-start gap-2">
                                        <MailCheck size={16} className="text-green-500 shrink-0 mt-0.5" />
                                        <p className="text-green-600 text-[10px] font-black uppercase leading-tight">{success}</p>
                                    </div>
                                )}

                                {authMode === 'login' && (
                                    <div className="flex justify-end pr-2">
                                        <button type="button" onClick={() => { setAuthMode('forgot'); setError(''); setSuccess(''); }} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-brand-600 transition-colors">Forgot Password?</button>
                                    </div>
                                )}
                                
                                <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-700 shadow-xl shadow-brand-600/20 transition-all active:scale-[0.98]">
                                    {authMode === 'login' ? 'Login' : 'Create Account'}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Interested in partnering?</p>
                                <button onClick={onGoToPartner} className="inline-flex items-center gap-2 text-brand-600 font-black text-sm hover:gap-3 transition-all">
                                    Become a Partner <ChevronRight size={16}/>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- ENHANCED PARTNER SIGNUP ---
const PartnerSignup: React.FC<{ onBack: () => void, onComplete: () => void }> = ({ onBack, onComplete }) => {
    const [step, setStep] = useState<'selection' | 'form'>('selection');
    const [role, setRole] = useState<'RESTAURANT' | 'DELIVERY'>('RESTAURANT');
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '', address: '', businessName: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [captcha, setCaptcha] = useState({ q: '5 + 3', a: '8' });
    const [captchaInput, setCaptchaInput] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const n1 = Math.floor(Math.random() * 10);
        const n2 = Math.floor(Math.random() * 10);
        setCaptcha({ q: `${n1} + ${n2}`, a: (n1 + n2).toString() });
    }, [step]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
        if (captchaInput !== captcha.a) return setError('Incorrect CAPTCHA answer');
        setSubmitting(true);
        setTimeout(() => {
            if (role === 'RESTAURANT') {
                const rests = getRestaurants();
                if (rests.find(r => r.email === formData.email)) { setSubmitting(false); return setError('Email already registered'); }
                // Use Restaurant type for partner registration
                const newRest: Restaurant = {
                    id: `rest-${Date.now()}`,
                    name: formData.businessName || formData.name,
                    cuisine: ['Fast Food'],
                    rating: 4.0,
                    deliveryTime: '30-40 min',
                    priceRange: '₹₹',
                    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80',
                    banner: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
                    address: formData.address,
                    email: formData.email,
                    password: formData.password,
                    status: 'SUBMITTED',
                    role: 'RESTAURANT',
                    wallet: { grossEarnings: 0, pendingBalance: 0, withdrawableBalance: 0, lastSettlementAt: new Date().toISOString() },
                    menu: [],
                    reviews: [],
                    coordinates: { lat: 26.6011, lng: 82.1334 },
                    isOpen: true
                };
                saveRestaurants([...rests, newRest]);
            } else {
                const users = getUsers();
                if (users.find(u => u.email === formData.email)) { setSubmitting(false); return setError('Email already registered'); }
                const newUser: User = {
                    id: `rider-${Date.now()}`,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    savedAddresses: [],
                    status: 'SUBMITTED',
                    role: 'DELIVERY',
                    walletBalance: 0,
                    codBalance: 0,
                    vehicleInfo: { type: 'bike', model: 'Pending Verification', plateNumber: 'Pending', licenseNumber: 'Pending' }
                };
                saveUsers([...users, newUser]);
            }
            setSubmitting(false);
            setSuccess(true);
        }, 1500);
    };

    if (success) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="bg-green-100 p-8 rounded-full mb-8">
                    <CheckCircle size={80} className="text-green-600" />
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-4 italic tracking-tighter">Application Sent</h2>
                <p className="text-gray-500 max-w-md mx-auto mb-10 font-bold leading-relaxed">Our operations team will review your profile within 24–48 hours.</p>
                <button onClick={onComplete} className="bg-black text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-transform active:scale-95">Go to Portal</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-12 animate-fade-in">
            <button onClick={onBack} className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-12 flex items-center gap-2 hover:text-brand-600 transition-colors">
                <ArrowLeft size={16}/> Back
            </button>
            {step === 'selection' ? (
                <div className="space-y-10">
                    <h1 className="text-5xl font-black text-gray-900 italic tracking-tighter leading-[0.9] mb-4">Partner With <br/>CityBite</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <button onClick={() => { setRole('RESTAURANT'); setStep('form'); }} class="bg-white p-10 rounded-[3rem] border-4 border-gray-50 hover:border-brand-500 hover:shadow-2xl transition-all group text-left">
                            <div className="bg-brand-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-brand-600 mb-8"><Store size={40}/></div>
                            <h3 className="text-3xl font-black text-gray-900 mb-2 italic">Merchant</h3>
                            <p className="text-sm text-gray-500 font-bold">List your menu and reach local foodies.</p>
                        </button>
                        <button onClick={() => { setRole('DELIVERY'); setStep('form'); }} class="bg-white p-10 rounded-[3rem] border-4 border-gray-50 hover:border-blue-500 hover:shadow-2xl transition-all group text-left">
                            <div className="bg-blue-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-blue-600 mb-8"><Bike size={40}/></div>
                            <h3 className="text-3xl font-black text-gray-900 mb-2 italic">Captain</h3>
                            <p className="text-sm text-gray-500 font-bold">Flexible earnings and instant payouts.</p>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-2xl">
                    <h2 className="text-2xl font-black text-gray-900 italic mb-8">{role === 'RESTAURANT' ? 'Merchant Details' : 'Captain Details'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="md:col-span-2">
                                <input required class="w-full px-6 py-5 bg-gray-50 border-none rounded-[1.5rem] font-bold text-gray-800" placeholder={role === 'RESTAURANT' ? "Business Name" : "Legal Name"} value={role === 'RESTAURANT' ? formData.businessName : formData.name} onChange={e => setFormData({...formData, [role === 'RESTAURANT' ? 'businessName' : 'name']: e.target.value})} />
                             </div>
                             <input required type="email" class="w-full px-6 py-5 bg-gray-50 border-none rounded-[1.5rem] font-bold text-gray-800" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                             <input required type="tel" class="w-full px-6 py-5 bg-gray-50 border-none rounded-[1.5rem] font-bold text-gray-800" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                             <input required type="password" minLength={6} class="w-full px-6 py-5 bg-gray-50 border-none rounded-[1.5rem] font-bold text-gray-800" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                             <input required type="password" minLength={6} class="w-full px-6 py-5 bg-gray-50 border-none rounded-[1.5rem] font-bold text-gray-800" placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                             <div className="md:col-span-2">
                                <textarea required class="w-full px-6 py-5 bg-gray-50 border-none rounded-[1.5rem] font-bold text-gray-800 h-28 resize-none" placeholder="Primary Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                             </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-between">
                            <p className="font-extrabold text-gray-800">What is {captcha.q}?</p>
                            <input required type="number" class="w-24 px-4 py-3 bg-white border-2 border-gray-100 rounded-xl font-black text-center" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} />
                        </div>
                        {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
                        <button type="submit" disabled={submitting} class="w-full bg-brand-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 disabled:bg-gray-300">
                            {submitting ? 'Registering...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

const NotificationToast: React.FC<{ message: string | null }> = ({ message }) => {
    if (!message) return null;
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl z-[300] animate-slide-down flex items-center gap-3 border border-gray-700">
            <span className="bg-green-500 w-2 h-2 rounded-full"></span>
            <span className="font-medium text-sm">{message}</span>
        </div>
    );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [currentDoc, setCurrentDoc] = useState<'terms' | 'privacy' | 'refund' | 'about'>('terms');
  // Use Restaurant type here for state annotation
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  // Use Restaurant type here for state annotation
  const [currentUser, setCurrentUser] = useState<User | Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastViewedOrderId, setLastViewedOrderId] = useState<string | null>(localStorage.getItem('citybite_tracking_id'));
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'admin' | 'delivery' | 'superadmin'>('customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
      initStorage(); 
      const storedRests = getRestaurants();
      const storedOrders = getOrders();
      setRestaurants(storedRests);
      setOrders(storedOrders);
      const session = getSession();
      if (session) {
          const latestUser = getUsers().find(u => u.email === session.email);
          const latestRest = storedRests.find(r => r.email === session.email);
          if (latestUser) handleLogin(latestUser, session.role);
          else if (latestRest) handleLogin(latestRest, 'admin');
          else if (session.role === 'superadmin') handleLogin(session, 'superadmin');
      }
      const interval = setInterval(() => { const latestOrders = getOrders(); if (latestOrders.length > 0) setOrders(latestOrders); }, 5000);
      return () => clearInterval(interval);
  }, []);

  const isLoaded = useRef(false);
  useEffect(() => { if (restaurants.length > 0) saveRestaurants(restaurants); }, [restaurants]);
  useEffect(() => { if (isLoaded.current) saveOrders(orders); else if (orders.length > 0) isLoaded.current = true; }, [orders]);
  useEffect(() => { if (lastViewedOrderId) localStorage.setItem('citybite_tracking_id', lastViewedOrderId); else localStorage.removeItem('citybite_tracking_id'); }, [lastViewedOrderId]);

  useEffect(() => { 
      if (!currentUser) return;
      if (['customer', 'delivery'].includes(userRole)) {
           const allUsers = getUsers();
           const idx = allUsers.findIndex(u => u.email === currentUser.email || (u.id && u.id === currentUser.id));
           if (idx !== -1) { allUsers[idx] = { ...allUsers[idx], ...currentUser as User }; saveUsers(allUsers); }
      } else if (userRole === 'admin') {
           const allRests = getRestaurants();
           const idx = allRests.findIndex(r => r.email === currentUser.email || r.id === (currentUser as any).id);
           // Use Restaurant type casting here
           if (idx !== -1) { allRests[idx] = { ...allRests[idx], ...currentUser as Restaurant }; saveRestaurants(allRests); setRestaurants(prev => prev.map(r => r.id === allRests[idx].id ? allRests[idx] : r)); }
      }
      setSession(currentUser, userRole);
  }, [currentUser, userRole]);

  // Persistent Notification Permission Listener
  useEffect(() => {
    if (currentUser && ['customer', 'delivery', 'admin'].includes(userRole)) {
        const userId = (currentUser as any).email || (currentUser as any).id;
        if (userId) {
            monitorNotificationPermission(userId, userRole);
        }
    }
  }, [currentUser, userRole]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
        if((window as any).Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
  };

  /**
   * Universal function to finalize order placement and update application state.
   * Handles storage syncing, navigation, and cleanup.
   */
  const finalizeOrderPlacement = (finalizedOrder: Order) => {
      setOrders(prev => [finalizedOrder, ...prev]);
      setLastViewedOrderId(finalizedOrder.id);
      setCart([]);
      showNotification(finalizedOrder.paymentMethod === 'UPI' ? 'Payment Successful!' : 'Order Placed!');
      setCurrentView(View.TRACKING);
      triggerNotificationEvent('new_order', { orderId: finalizedOrder.id, amount: finalizedOrder.total });
  };

  const showNotification = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 4000); };
  
  const handleLogin = (user: any, role: any) => {
      setCurrentUser(user); setUserRole(role); setSession(user, role);
      const userId = user.email || user.id;
      if (userId) registerPushNotifications(userId, role);
      if (role === 'customer') setCurrentView(View.HOME);
      else if (role === 'admin') setCurrentView(View.ADMIN);
      else if (role === 'superadmin') setCurrentView(View.SUPER_ADMIN);
      else if (role === 'delivery') setCurrentView(View.DELIVERY);
  };

  const handleLogout = () => { setCart([]); clearSession(); setCurrentView(View.LOGIN); setCurrentUser(null); setUserRole('customer'); setLastViewedOrderId(null); };

  /**
   * Trigger Razorpay with specific order metadata to avoid state race conditions.
   */
  const openPayment = async (amount: number, description: string, orderMetadata: Order) => {
      const res = await loadRazorpay(); 
      if (!res) return alert('Razorpay SDK failed to load.');
      
      const options = {
          key: "rzp_live_RqkL1SCD3WhdR3", 
          amount: Math.round(amount * 100), 
          currency: "INR", 
          name: "CityBite", 
          description: description,
          handler: (response: any) => {
              const finalized = { 
                  ...orderMetadata, 
                  paymentStatus: 'PAID' as const, 
                  paymentId: response.razorpay_payment_id 
              };
              finalizeOrderPlacement(finalized);
          },
          prefill: { name: currentUser?.name, email: currentUser?.email, contact: currentUser?.phone },
          theme: { color: "#C62828" }
      };

      const rzp = new Razorpay(options);
      rzp.open();
  };

  const handleLocationConfirm = (lat: number, lng: number, formattedAddress: string, isManual: boolean) => {
    if (!currentUser) return;
    if (!isWithinServiceArea(lat, lng)) { alert(getServiceAreaError()); return; }
    const newAddr: Address = {
        id: `addr-${Date.now()}`,
        label: (currentUser as User).savedAddresses.length === 0 ? 'Home' : `Location ${(currentUser as User).savedAddresses.length + 1}`,
        details: formattedAddress, lat, lng, isManual
    };
    setCurrentUser(prev => prev ? ({ ...prev, savedAddresses: [...(prev as User).savedAddresses, newAddr], activeAddressId: newAddr.id, location: { lat, lng } } as User) : null);
    setShowLocationPicker(false);
    showNotification("Address saved!");
  };

  const placeOrder = (method: 'UPI' | 'COD', cookingInstr: string, delInstr: string, appliedFee: number) => {
      if (cart.length === 0 || !currentUser) return;
      const rest = restaurants.find(r => r.id === cart[0].restaurantId);
      if (rest?.isOpen === false) { alert("Restaurant Offline."); setCart([]); setCurrentView(View.HOME); return; }
      
      const itemTotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const packingTotal = cart.reduce((sum, item) => sum + (item.packingCharge || 0) * item.quantity, 0);
      const activeAddr = (currentUser as User).savedAddresses.find(a => a.id === (currentUser as User).activeAddressId) || (currentUser as User).savedAddresses[0];
      const userLoc = activeAddr?.lat && activeAddr?.lng ? { lat: activeAddr.lat, lng: activeAddr.lng } : (currentUser as User).location;
      
      let dist = 0; 
      if (userLoc && rest?.coordinates) dist = calculateDistance(userLoc.lat, userLoc.lng, rest.coordinates.lat, rest.coordinates.lng);
      
      const financials = EconomicsEngine.calculateOrderFinancials({ distanceKm: dist, orderValue: itemTotal + packingTotal, isPeakHour: false, isWeatherBad: false, isMember: false, restaurantStats: { monthlyVolume: 100, rating: rest?.rating || 4.0, isSponsored: rest?.isPromoted || false } });
      const config = getConfig();
      const taxes = itemTotal * 0.05;
      const totalAmount = Math.round(itemTotal + packingTotal + appliedFee + financials.platformFee + taxes);
      
      const commissionAmount = (totalAmount * config.commissionPct) / 100;
      const netRestaurantEarnings = (itemTotal + packingTotal) - commissionAmount;

      const newOrder: Order = {
          id: Date.now().toString(), 
          customerId: (currentUser as any).email || (currentUser as any).id, 
          customerName: currentUser.name, 
          customerPhone: currentUser.phone || '', 
          items: [...cart], 
          total: totalAmount, 
          status: 'placed', 
          date: new Date().toISOString(), 
          paymentMethod: method, 
          restaurantName: rest?.name || cart[0].restaurantName, 
          restaurantId: rest?.id, 
          restaurantAddress: rest?.address || '', 
          restaurantCoordinates: rest?.coordinates, 
          riderName: undefined, 
          etaMinutes: 25, 
          deliveryProgress: 0, 
          chatMessages: [], 
          deliveryAddress: activeAddr?.details || "Pickup", 
          deliveryCoordinates: userLoc, 
          cookingInstructions: cookingInstr, 
          deliveryInstructions: delInstr, 
          deliveryFee: appliedFee, 
          platformFee: financials.platformFee, 
          riderPayout: financials.riderPayout, 
          commissionAmount: commissionAmount, 
          netRestaurantEarnings: netRestaurantEarnings, 
          paymentStatus: method === 'COD' ? 'PENDING' : 'PAID', 
          fraudFlags: []
      };

      if (method === 'UPI') {
          openPayment(totalAmount, `Order from ${newOrder.restaurantName}`, newOrder);
      } else {
          finalizeOrderPlacement(newOrder);
      }
  };

  const handleOrderStatusUpdate = (orderId: string, status: OrderStatus, prepTime?: number, reason?: string) => {
      setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
              const updates: Partial<Order> = { status };
              if (status === 'rider_assigned' && userRole === 'delivery' && currentUser) { updates.riderName = currentUser.name; updates.riderId = (currentUser as User).id || ''; }
              
              if (status === 'accepted' && o.status !== 'accepted' && prepTime) { 
                  updates.prepTimeMinutes = prepTime; 
                  updates.prepStartedAt = new Date().toISOString(); 
                  updates.prepEta = new Date(Date.now() + prepTime * 60000).toISOString(); 
                  updates.status = 'preparing'; 
                  showNotification(`Preparing food!`);
                  triggerNotificationEvent('order_accepted', { customerId: o.customerId, orderId: orderId });
                  triggerNotificationEvent('order_preparing', { customerId: o.customerId, orderId: orderId });
              }

              if (status === 'ready_for_pickup' && o.status !== 'ready_for_pickup') {
                  triggerNotificationEvent('new_delivery_job', { orderId: orderId });
              }

              if (status === 'out_for_delivery' && o.status !== 'out_for_delivery') {
                  triggerNotificationEvent('out_for_delivery', { customerId: o.customerId, orderId: orderId });
              }

              if (status === 'rejected') { updates.rejectionReason = reason; if (o.paymentMethod === 'COD') updates.status = 'cancelled'; else if (o.paymentStatus === 'PAID') { updates.paymentStatus = 'REFUND_INITIATED'; updates.refundId = 'REF' + Math.random().toString(36).substr(2, 9); showNotification(`Refund initiated.`); } if (userRole === 'customer') { setCancelledOrder({ ...o, status: updates.status as OrderStatus, rejectionReason: reason }); if (currentView === View.TRACKING) setCurrentView(View.HOME); } }
              
              if (status === 'delivered' && o.status !== 'delivered') {
                  const restIdx = restaurants.findIndex(r => r.id === o.restaurantId);
                  if (restIdx >= 0) { const updatedRests = [...restaurants]; const r = updatedRests[restIdx]; if (!r.wallet) r.wallet = { grossEarnings: 0, pendingBalance: 0, withdrawableBalance: 0, lastSettlementAt: new Date().toISOString() }; r.wallet.grossEarnings += o.netRestaurantEarnings; r.wallet.pendingBalance += o.netRestaurantEarnings; setRestaurants(updatedRests); saveRestaurants(updatedRests); }
                  if (o.riderName) { const allUsers = getUsers(); const riderIdx = allUsers.findIndex(u => u.name === o.riderName); if (riderIdx !== -1) { const rider = allUsers[riderIdx]; const payout = o.riderPayout || 40; rider.walletBalance = (rider.walletBalance || 0) + payout; if (o.paymentMethod === 'COD') rider.codBalance = (rider.codBalance || 0) + o.total; saveUsers(allUsers); if (currentUser?.name === o.riderName) setCurrentUser(allUsers[riderIdx]); } }
                  
                  triggerNotificationEvent('delivered', { customerId: o.customerId, orderId: orderId }); 
                  if (userRole === 'customer') setReviewOrder({ ...o, status: 'delivered' });
              }
              return { ...o, ...updates };
          }
          return o;
      }));
      if (userRole === 'delivery' && currentUser) { if (status === 'rider_assigned') setCurrentUser(prev => prev ? ({ ...prev, activeOrderId: orderId, availabilityStatus: 'ON_DELIVERY', suspicionScore: 0 } as User) : null); else if ((status === 'delivered' || status === 'cancelled' || status === 'rejected') && (currentUser as User).activeOrderId === orderId) setCurrentUser(prev => prev ? ({ ...prev, activeOrderId: undefined, availabilityStatus: 'IDLE' } as User) : null); }
  };

  const handleOrderStatsUpdate = (orderId: string, etaMin: number, distKm: number) => { if (userRole !== 'delivery') return; setOrders(prev => prev.map(o => o.id === orderId ? { ...o, liveEtaMinutes: o.liveEtaMinutes === undefined ? etaMin : (Math.abs(etaMin - o.liveEtaMinutes) <= 2 ? etaMin : o.liveEtaMinutes + (etaMin > o.liveEtaMinutes ? 1 : -1)), liveDistanceKm: parseFloat(distKm.toFixed(1)) } : o)); };
  const handleRiderLocationUpdate = (lat: number, lng: number, accuracy?: number, speed?: number | null) => {
      if (userRole !== 'delivery' || !currentUser) return;
      const allOrders = getOrders();
      const activeIdx = allOrders.findIndex(o => o.riderName === currentUser.name && (o.status === 'out_for_delivery' || o.status === 'rider_assigned'));
      const nextTelemetry: TelemetryData = { lat, lng, accuracy: accuracy || 10, speed: speed || null, timestamp: Date.now() };
      const analysis = FraudGuard.analyze(currentUser as User, nextTelemetry, activeIdx !== -1 ? allOrders[activeIdx].status : 'picked_up');
      if (activeIdx !== -1) { allOrders[activeIdx].driverCoordinates = { lat, lng }; allOrders[activeIdx].lastLocationAt = new Date().toISOString(); if (analysis.flag) { if (!allOrders[activeIdx].fraudFlags) allOrders[activeIdx].fraudFlags = []; if (!allOrders[activeIdx].fraudFlags.includes(analysis.flag)) { allOrders[activeIdx].fraudFlags.push(analysis.flag); allOrders[activeIdx].needsReview = true; } } saveOrders(allOrders); setOrders(allOrders); }
      setCurrentUser(prev => { if (!prev) return null; const u = prev as User; return { ...u, location: { lat, lng }, lastSeenAt: new Date().toISOString(), lastTelemetry: nextTelemetry, suspicionScore: (u.suspicionScore || 0) + analysis.scoreIncrease, freezeCount: analysis.flag === 'LOCATION_FREEZE' ? (u.freezeCount || 0) + 1 : 0, accuracyAbuseCount: nextTelemetry.accuracy > 200 ? (u.accuracyAbuseCount || 0) + 1 : 0 }; });
  };

  const renderContent = () => {
    if (!currentUser && currentView !== View.LOGIN && currentView !== View.DOCS && currentView !== View.PARTNER_SIGNUP) return <AuthPage onLogin={handleLogin} onGoToPartner={() => setCurrentView(View.PARTNER_SIGNUP)} />;
    switch(currentView) {
      case View.PARTNER_SIGNUP: return <PartnerSignup onBack={() => setCurrentView(View.LOGIN)} onComplete={() => setCurrentView(View.LOGIN)} />;
      case View.LOGIN: return <AuthPage onLogin={handleLogin} onGoToPartner={() => setCurrentView(View.PARTNER_SIGNUP)} />;
      case View.HOME: return <Home restaurants={restaurants} user={currentUser as User} onRestaurantClick={(id) => { setSelectedRestaurantId(id); setCurrentView(View.RESTAURANT); window.scrollTo(0,0); }} activeOrder={orders.find(o => (lastViewedOrderId ? o.id === lastViewedOrderId : (o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected')))} onTrackOrder={() => setCurrentView(View.TRACKING)} searchTerm={searchTerm} />;
      case View.RESTAURANT:
        const rest = restaurants.find(r => r.id === selectedRestaurantId); if (!rest) return null;
        return <RestaurantDetails restaurant={rest} onBack={() => setCurrentView(View.HOME)} onAddToCart={(item, restId, restName) => { setCart(prev => { if (prev.length > 0 && prev[0].restaurantId !== restId) { if (!window.confirm("Start new cart?")) return prev; return [{ ...item, quantity: 1, restaurantId: restId, restaurantName: restName }]; } const existing = prev.find(i => i.id === item.id); return existing ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1, restaurantId: restId, restaurantName: restName }]; }); }} user={currentUser as User} />;
      case View.CART: return <CartPage cart={cart} user={currentUser as User} restaurant={restaurants.find(r => r.id === cart[0]?.restaurantId)} updateQuantity={(id, d) => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + d) } : i).filter(i => i.quantity > 0))} removeFromCart={() => {}} onCheckout={() => setCurrentView(View.CHECKOUT)} onBack={() => setCurrentView(View.HOME)} />;
      case View.CHECKOUT: return <CheckoutPage cart={cart} user={currentUser as User} restaurant={restaurants.find(r => r.id === cart[0]?.restaurantId)} onPlaceOrder={placeOrder} onBack={() => setCurrentView(View.CART)} onRequestLocation={() => setShowLocationPicker(true)} />;
      case View.TRACKING: const trackOrder = orders.find(o => o.id === lastViewedOrderId) || orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected'); return <OrderTracking order={trackOrder} driverProfile={trackOrder && trackOrder.riderName ? getUsers().find(u => u.name === trackOrder.riderName) : undefined} onGoHome={() => setCurrentView(View.HOME)} onOpenChat={() => setActiveChatOrderId(trackOrder ? trackOrder.id : null)} />;
      case View.PROFILE: return <ProfilePage user={currentUser as User} orders={orders} activeOrder={orders.find(o => o.id === lastViewedOrderId && o.status !== 'delivered')} onBack={() => setCurrentView(View.HOME)} onLogout={handleLogout} onReviewOrder={(o) => setReviewOrder(o)} onUpdateUser={(u) => { setCurrentUser(u); showNotification("Updated"); }} onTrackOrder={() => setCurrentView(View.TRACKING)} onRequestMap={() => setShowLocationPicker(true)} />;
      // Use Restaurant type casting for AdminDashboard prop
      case View.ADMIN: return <AdminDashboard restaurant={currentUser as Restaurant} orders={orders} withdrawalHistory={withdrawalRequests.filter(r => r.requesterId === (currentUser as any).id)} onUpdateRestaurant={(updated) => { setRestaurants(prev => prev.map(r => r.id === updated.id ? updated : r)); setCurrentUser(updated); }} onUpdateOrderStatus={handleOrderStatusUpdate} onLogout={handleLogout} onWithdraw={(amt) => { const updated = { ...currentUser as Restaurant }; if (!updated.wallet) updated.wallet = { grossEarnings: 0, pendingBalance: 0, withdrawableBalance: 0, lastSettlementAt: new Date().toISOString() }; updated.wallet.withdrawableBalance -= amt; setWithdrawalRequests(prev => [{ id: Date.now().toString(), requesterId: updated.id, requesterName: updated.name, requesterType: 'restaurant', amount: amt, upiId: 'Bank Transfer', status: 'pending', date: new Date().toISOString() }, ...prev]); setCurrentUser(updated); setRestaurants(prev => prev.map(r => r.id === updated.id ? updated : r)); showNotification(`Requested ₹${amt}`); }} onPromote={() => {}} />;
      case View.DELIVERY: return <DeliveryDashboard orders={orders} driver={currentUser as User} withdrawalHistory={withdrawalRequests} onUpdateStatus={handleOrderStatusUpdate} onAcceptJob={(id, name) => handleOrderStatusUpdate(id, 'rider_assigned')} onLogout={handleLogout} onOpenChat={(id) => setActiveChatOrderId(id)} onLocationUpdate={handleRiderLocationUpdate} onStatsUpdate={handleOrderStatsUpdate} onWithdraw={() => {}} onDepositCod={() => {}} onRateCustomer={() => {}} onUpdateDriverProfile={(u) => { setCurrentUser(u); }} />;
      case View.SUPER_ADMIN: return <SuperAdminDashboard requests={withdrawalRequests} onPayRequest={(id) => setWithdrawalRequests(p => p.map(r => r.id === id ? { ...r, status: 'paid' } : r))} onLogout={handleLogout} restaurants={restaurants} orders={orders} onUpdateRestaurants={(updated) => { setRestaurants(updated); saveRestaurants(updated); }} />;
      case View.DOCS: return <DocsPage type={currentDoc} onBack={() => { if (!currentUser) setCurrentView(View.LOGIN); else { switch(userRole) { case 'admin': setCurrentView(View.ADMIN); break; case 'delivery': setCurrentView(View.DELIVERY); break; case 'superadmin': setCurrentView(View.SUPER_ADMIN); break; default: setCurrentView(View.HOME); } } }} />;
      default: return <AuthPage onLogin={handleLogin} onGoToPartner={() => setCurrentView(View.PARTNER_SIGNUP)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      <NotificationToast message={notification} />
      {showLocationPicker && ( <LocationPicker onConfirm={handleLocationConfirm} onClose={() => setShowLocationPicker(false)} /> )}
      {currentUser && ['customer'].includes(userRole) && currentView !== View.TRACKING && currentView !== View.DOCS && ( <Navbar currentView={currentView} cartCount={cart.reduce((a, b) => a + b.quantity, 0)} activeAddress={(currentUser as User).savedAddresses.find(a => a.id === (currentUser as User).activeAddressId)?.label} savedAddresses={(currentUser as User).savedAddresses} onChangeView={setCurrentView} onSearch={setSearchTerm} onRequestLocation={() => setShowLocationPicker(true)} onSelectAddress={(id) => setCurrentUser(p => p ? ({ ...p, activeAddressId: id } as User) : null)} /> )}
      <main className="flex-1"> {renderContent()} </main>
      {currentView !== View.TRACKING && currentView !== View.CHECKOUT && ( 
        <Footer 
          onNavigate={(page) => { setCurrentDoc(page); setCurrentView(View.DOCS); window.scrollTo(0,0); }} 
          onPartnerClick={() => { setCurrentView(View.PARTNER_SIGNUP); window.scrollTo(0,0); }}
        /> 
      )}
      {currentUser && ['customer'].includes(userRole) && currentView !== View.TRACKING && currentView !== View.CART && currentView !== View.CHECKOUT && currentView !== View.DOCS && ( <SupportChat /> )}
      {cancelledOrder && ( <OrderCancelledModal orderId={cancelledOrder.id} restaurantName={cancelledOrder.restaurantName} totalAmount={cancelledOrder.total} paymentMethod={cancelledOrder.paymentMethod} onClose={() => setCancelledOrder(null)} /> )}
      {reviewOrder && !reviewOrder.isRestaurantReviewed && ( <RestaurantReviewModal restaurantName={reviewOrder.restaurantName} onSubmit={(r, f) => { setRestaurants(prev => prev.map(res => { if (res.id === reviewOrder.restaurantId) { const oldCount = res.reviewCount || 0; const newRating = Number((((res.rating * oldCount) + r) / (oldCount + 1)).toFixed(1)); return { ...res, rating: newRating, reviewCount: oldCount + 1, reviews: [{ id: Date.now().toString(), user: (currentUser as User)?.name || 'Anon', rating: r, text: f, date: new Date().toISOString(), type: 'restaurant' }, ...res.reviews] }; } return res; })); setOrders(prev => prev.map(o => o.id === reviewOrder.id ? { ...o, isRestaurantReviewed: true } : o)); setReviewOrder(null); showNotification("Saved!"); }} onClose={() => setReviewOrder(null)} /> )}
    </div>
  );
};

export default App;
