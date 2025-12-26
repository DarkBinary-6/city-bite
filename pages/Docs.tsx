
import React from 'react';
import { 
    ArrowLeft, FileText, Shield, RefreshCw, Info, Sparkles, CheckCircle2, 
    ShieldCheck, Lock, Eye, EyeOff, FileLock2, UserCheck, 
    XCircle, Ban, BadgeCheck, Calendar, Coins, History, Gavel,
    ClipboardList, Scale, Utensils, Truck, AlertCircle, UserX, Handshake,
    Target, Rocket, HeartPulse, MapPin, Users, Globe, Zap, Heart,
    Hammer, Coffee, MessageCircle, Star, Quote, Landmark, Bike, ChevronRight,
    TrendingUp
} from 'lucide-react';

interface DocsProps {
    type: 'terms' | 'privacy' | 'refund' | 'about';
    onBack: () => void;
}

export const DocsPage: React.FC<DocsProps> = ({ type, onBack }) => {
    
    const renderContent = () => {
        switch(type) {
            case 'about':
                return (
                    <div className="space-y-16 animate-fade-in pb-32 overflow-hidden relative selection:bg-brand-100 selection:text-brand-900">
                        {/* Dynamic Background Elements */}
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/20 rounded-full blur-[120px] animate-pulse"></div>
                        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-accent-200/10 rounded-full blur-[100px] animate-bounce" style={{ animationDuration: '20s' }}></div>

                        {/* --- HERO: ABOUT US --- */}
                        <section className="relative z-10 pt-10">
                            <div className="flex flex-col items-center text-center mb-16">
                                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white border border-brand-100 text-brand-600 font-black text-[10px] uppercase tracking-[0.3em] mb-8 shadow-sm animate-slide-up">
                                    <Sparkles size={14} className="animate-spin-slow" />
                                    The CityBite Narrative
                                </div>
                                <h1 className="text-6xl md:text-[100px] font-black italic tracking-tighter text-gray-900 leading-[0.8] mb-12">
                                    About <br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-orange-500 to-accent-600">Us</span>
                                </h1>
                            </div>

                            <div className="max-w-4xl mx-auto space-y-12">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-orange-500 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                                    <div className="relative bg-white border border-gray-100 p-8 md:p-14 rounded-[3rem] shadow-2xl shadow-gray-200/40">
                                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8 italic border-b border-gray-50 pb-6">Our Mission & Identity</h2>
                                        
                                        <div className="space-y-8 text-lg text-gray-700 font-medium leading-relaxed">
                                            <p className="border-l-4 border-brand-500 pl-6 py-2">
                                                CityBite is a fast, smart, and hyper-local food delivery platform built to connect customers with their favorite restaurants and reliable delivery partners — without unnecessary complexity. Our focus is simple: great food, accurate delivery tracking, and seamless ordering.
                                            </p>
                                            
                                            <p className="border-l-4 border-accent-500 pl-6 py-2">
                                                We built CityBite to solve real problems that big platforms ignore — dynamic restaurant visibility, real distance calculations, instant order updates, and real-time delivery countdowns using GPS. We keep the experience smooth, responsive, and fair for both users and service providers, while staying lightweight and efficient as a growing platform.
                                            </p>

                                            <p className="border-l-4 border-gray-900 pl-6 py-2 bg-gray-50 rounded-r-2xl">
                                                CityBite is not just another delivery app — it's a system optimized for speed, clarity, and reliability. No clutter. No confusion. Just food delivery that works the way it should.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-black transition-colors">
                                        <Zap className="text-brand-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
                                        <h3 className="font-black text-xs uppercase tracking-widest mb-2">Speed</h3>
                                        <p className="text-[10px] text-gray-400 font-bold">Optimized logistics for local cities.</p>
                                    </div>
                                    <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-brand-500 transition-colors">
                                        <ShieldCheck className="text-green-600 mb-4 group-hover:scale-110 transition-transform" size={32} />
                                        <h3 className="font-black text-xs uppercase tracking-widest mb-2">Clarity</h3>
                                        <p className="text-[10px] text-gray-400 font-bold">No hidden fees, just honest pricing.</p>
                                    </div>
                                    <div className="bg-brand-600 text-white p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-brand-700 transition-colors">
                                        <Target className="text-white mb-4 group-hover:scale-110 transition-transform" size={32} />
                                        <h3 className="font-black text-xs uppercase tracking-widest mb-2">Focus</h3>
                                        <p className="text-[10px] text-brand-100 font-bold">Hyper-local precision delivery.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="flex flex-col items-center justify-center opacity-5 py-12">
                             <p className="text-gray-400 font-black text-[10vw] tracking-tighter whitespace-nowrap select-none">
                                CITYBITE • BIKAPUR • RELIABLE • LOCAL
                             </p>
                        </div>
                    </div>
                );
            case 'terms':
                const termPoints = [
                    { text: "Prices, menu items, and availability are managed by restaurants and may change without notice.", icon: Utensils, color: "text-orange-500", bg: "bg-orange-50" },
                    { text: "We act as a technology platform connecting customers, restaurants, and delivery partners.", icon: Handshake, color: "text-blue-500", bg: "bg-blue-50" },
                    { text: "Restaurants are responsible for food quality, preparation, and packaging.", icon: ClipboardList, color: "text-brand-500", bg: "bg-brand-50" },
                    { text: "Delivery partners are responsible for order pickup and delivery.", icon: Truck, color: "text-purple-500", bg: "bg-purple-50" },
                    { text: "We reserve the right to cancel orders due to unavailability, pricing errors, or suspicious activity.", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
                    { text: "Any misuse, fraud, or abuse of the platform may lead to account suspension.", icon: UserX, color: "text-gray-700", bg: "bg-gray-100" },
                    { text: "Use of the platform implies full acceptance of these terms.", icon: Scale, color: "text-green-600", bg: "bg-green-50" }
                ];

                return (
                    <div className="space-y-10 animate-fade-in pb-12">
                        <div className="relative text-center md:text-left">
                            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-brand-800 via-brand-600 to-amber-600 leading-[1.1] mb-2">
                                Terms & <br className="hidden md:block" /> Conditions
                            </h1>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs ml-1">By using CityBite, you agree to these terms.</p>
                            <div className="absolute -top-6 -right-6 text-brand-100 animate-pulse hidden md:block">
                                <ClipboardList size={80} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {termPoints.map((point, i) => (
                                <div 
                                    key={i} 
                                    className={`group flex items-center gap-6 p-6 rounded-[2rem] border border-gray-100 bg-white hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 hover:-translate-y-1`}
                                >
                                    <div className={`flex-shrink-0 w-16 h-16 rounded-3xl ${point.bg} ${point.color} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                                        <point.icon size={32} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-lg md:text-xl font-extrabold leading-tight tracking-tight ${i === 6 ? 'text-brand-600 underline decoration-brand-200 decoration-4' : 'text-gray-800'}`}>
                                            {point.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-gradient-to-r from-brand-700 to-amber-600 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-150 duration-700"></div>
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                                    <CheckCircle2 className="animate-pulse text-white" size={32} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-1">Agreement</p>
                                    <h4 className="text-xl font-bold">Your trust is our top priority.</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="relative">
                            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-brand-600 leading-tight">
                                Privacy Policy
                            </h1>
                            <div className="absolute -top-4 -left-4 text-blue-200 opacity-40">
                                <ShieldCheck size={56} />
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-10 shadow-2xl shadow-blue-500/5 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                            
                            <ul className="space-y-8 relative z-10">
                                {[
                                    { text: "We respect your privacy and protect your data.", icon: ShieldCheck },
                                    { text: "We collect only information required to process orders and provide services.", icon: FileLock2 },
                                    { text: "Personal data is not sold or shared with third parties except as required for order fulfillment.", icon: EyeOff },
                                    { text: "Payments are processed securely through authorized payment gateways.", icon: Lock },
                                    { text: "Reasonable security measures are implemented to protect user information.", icon: Shield },
                                    { text: "By using our platform, you consent to this policy.", icon: UserCheck }
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-5 group transition-all hover:translate-x-2">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-all group-hover:rotate-6">
                                            <item.icon size={24} className="text-blue-600 group-hover:text-white transition-colors" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-700 leading-snug">
                                            {item.text}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'refund':
                const refundPoints = [
                    { text: "Orders can be cancelled by restaurant only before acceptacing.", icon: XCircle, color: "text-orange-500", bg: "bg-orange-50" },
                    { text: "Once the restaurant accepts the order, cancellation is not possible.", icon: Ban, color: "text-red-500", bg: "bg-red-50" },
                    { text: "If an online-paid order is cancelled by the restaurant or platform, a full refund will be initiated.", icon: BadgeCheck, color: "text-green-600", bg: "bg-green-50" },
                    { text: "Refunds for prepaid orders will be processed within 5–7 working days to the original payment method.", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
                    { text: "For COD orders, no refund is applicable once payment is collected.", icon: Coins, color: "text-amber-600", bg: "bg-amber-50" },
                    { text: "We are not responsible for delays caused by banks or payment providers.", icon: History, color: "text-gray-500", bg: "bg-gray-100" },
                    { text: "All refund decisions are final.", icon: Gavel, color: "text-brand-600", bg: "bg-brand-50" }
                ];

                return (
                    <div className="space-y-10 animate-fade-in pb-12">
                        <div className="relative text-center md:text-left">
                            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-brand-700 via-brand-500 to-orange-500 leading-[1.1] mb-2">
                                Cancellation & <br className="hidden md:block" /> Refund Policy
                            </h1>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs ml-1">Safe & Transparent Refunds</p>
                            <div className="absolute -top-6 -right-6 text-brand-100 animate-pulse hidden md:block">
                                <Sparkles size={80} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {refundPoints.map((point, i) => (
                                <div 
                                    key={i} 
                                    className={`group flex items-center gap-6 p-6 rounded-[2rem] border border-gray-100 bg-white hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 hover:-translate-y-1`}
                                >
                                    <div className={`flex-shrink-0 w-16 h-16 rounded-3xl ${point.bg} ${point.color} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                                        <point.icon size={32} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-lg md:text-xl font-extrabold leading-tight tracking-tight ${i === 6 ? 'text-brand-600 underline decoration-brand-200 decoration-4' : 'text-gray-800'}`}>
                                            {point.text}
                                        </p>
                                        {i === 3 && <p className="text-xs text-blue-500 font-bold uppercase mt-1">Automatic processing</p>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-gradient-to-r from-gray-900 to-brand-900 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-150 duration-700"></div>
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                                    <RefreshCw className="animate-spin-slow text-brand-300" size={32} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-1">Our Commitment</p>
                                    <h4 className="text-xl font-bold">Processing happiness since day one.</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div>Content not found.</div>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 min-h-screen bg-white animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-brand-600 font-black uppercase tracking-widest text-xs mb-10 transition-all hover:gap-3 group">
                <ArrowLeft size={16} className="group-hover:scale-125 transition-transform" /> Back to Portal
            </button>
            <div>
                {renderContent()}
            </div>
        </div>
    );
};
