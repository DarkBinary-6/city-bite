
import React, { useState, useEffect } from 'react';
import { CartItem, Order, User, Restaurant } from '../types';
import { Trash2, Plus, Minus, MapPin, CheckCircle, ArrowRight, Home, ArrowLeft, Utensils, BellOff, Navigation, CreditCard, Clock, ChevronRight, Ticket, Receipt, Bike, Package, Check, ShoppingBag, AlertCircle, Phone, WifiOff } from 'lucide-react';
import { calculateDistance, calculateDeliveryFee, isWithinServiceArea, calculateEta } from '../utils/geo';
import { getConfig, getOrders } from '../utils/storage';
import { formatPricingValue } from '../utils/formatters';

interface CartProps {
  cart: CartItem[];
  user: User;
  restaurant?: Restaurant;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  onCheckout: () => void;
  onBack: () => void;
}

export const CartPage: React.FC<CartProps> = ({ cart, user, restaurant, updateQuantity, onCheckout, onBack }) => {
  const [deliveryFee, setDeliveryFee] = useState(0);
  const config = getConfig();

  const isOffline = restaurant?.isOpen === false;

  useEffect(() => {
      if (restaurant && user.location) {
          const dist = calculateDistance(
              user.location.lat || 0, user.location.lng || 0,
              restaurant.coordinates.lat, restaurant.coordinates.lng
          );
          setDeliveryFee(calculateDeliveryFee(dist));
      }
  }, [user.location, restaurant]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packingTotal = cart.reduce((sum, item) => sum + (item.packingCharge || 0) * item.quantity, 0);
  const taxes = subtotal * 0.05; 
  const total = Math.round(subtotal + packingTotal + deliveryFee + config.platform_fee.amount + taxes);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <button onClick={onBack} className="absolute top-24 left-6 text-gray-500 flex items-center gap-1 hover:text-gray-800 font-bold"><ArrowLeft size={18}/> Back</button>
        <div className="bg-gray-100 p-8 rounded-full mb-6">
            <ShoppingBag size={48} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Good food is always cooking</h2>
        <p className="text-gray-500 mb-8 text-sm">Your cart is empty.</p>
        <button onClick={onBack} className="bg-brand-500 text-white px-8 py-3 rounded-lg font-bold">Browse Restaurants</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in pb-32">
        <button onClick={onBack} className="text-gray-500 mb-4 flex items-center gap-1 hover:text-gray-800 font-bold"><ArrowLeft size={18}/> Back</button>
        
        {isOffline && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
                <AlertCircle size={20} />
                <p className="font-bold text-sm">This restaurant is currently offline. You cannot proceed with this order.</p>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden">
                    <img src={restaurant?.image} className="w-full h-full object-cover" alt={restaurant?.name} />
                </div>
                <h3 className="font-bold text-gray-800 text-sm">{restaurant?.name}</h3>
            </div>
            <div className="p-4 space-y-6">
                {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 border flex items-center justify-center p-[1px] ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                                <p className="text-xs text-gray-500">₹{item.price}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-brand-50 rounded-lg p-1 border border-brand-100">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-brand-700"><Minus size={14} /></button>
                            <span className="font-bold text-sm text-brand-700 w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-brand-700"><Plus size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
            <div className="max-w-2xl mx-auto">
                <button 
                    onClick={onCheckout}
                    disabled={isOffline}
                    className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-between px-6 shadow-lg transition-all 
                        ${isOffline 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-brand-600 text-white active:scale-[0.98]'
                        }`}
                >
                    <span>₹{total}</span>
                    <span className="flex items-center gap-2">
                        {isOffline ? 'Restaurant Offline' : 'Proceed to Checkout'} <ArrowRight size={18} />
                    </span>
                </button>
            </div>
        </div>
    </div>
  );
};

export const CheckoutPage: React.FC<{ 
    cart: CartItem[], 
    user: User, 
    restaurant?: Restaurant, 
    onPlaceOrder: (method: 'UPI' | 'COD', cookInstr: string, delInstr: string, fee: number) => void; 
    onBack: () => void;
    onRequestLocation: () => void; 
}> = ({ cart, user, restaurant, onPlaceOrder, onBack, onRequestLocation }) => {

const params = new URLSearchParams(window.location.search);
const isPaid = params.get('paid') === 'true';
const paidOrderId = params.get('orderId');

    const [selectedAddressId, setSelectedAddressId] = useState(user.activeAddressId || user.savedAddresses[0]?.id || '');
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('COD');
    const [cookingInstr, setCookingInstr] = useState('');
    const [deliveryInstr, setDeliveryInstr] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const config = getConfig();

    const isOffline = restaurant?.isOpen === false;

    const selectedAddress = user.savedAddresses.find(a => a.id === selectedAddressId);
    const hasCoordinates = !!(selectedAddress?.lat && selectedAddress?.lng);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const packingTotal = cart.reduce((sum, item) => sum + (item.packingCharge || 0) * item.quantity, 0);
    const taxes = subtotal * 0.05;

    useEffect(() => {
        if (restaurant && selectedAddress && selectedAddress.lat && selectedAddress.lng) {
            const dist = calculateDistance(selectedAddress.lat, selectedAddress.lng, restaurant.coordinates.lat, restaurant.coordinates.lng);
            setDeliveryFee(calculateDeliveryFee(dist));
        }
    }, [restaurant, selectedAddressId, user.savedAddresses]);

    const total = Math.round(subtotal + packingTotal + deliveryFee + config.platform_fee.amount + taxes);

    const handleConfirm = () => {
        if (isOffline) return alert("This restaurant has gone offline.");
        if (!selectedAddressId) return alert("Please select an address");
        if (!hasCoordinates) return alert("Please pin your exact location on the map to proceed.");
        onPlaceOrder(paymentMethod, cookingInstr, deliveryInstr, deliveryFee);
    };

if (isPaid && paidOrderId) {
    return (
        <div className="max-w-2xl mx-auto px-4 py-10 animate-fade-in">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-4">
                Order Confirmed
            </h1>
            <p className="text-gray-600 mb-2">
                Your payment was successful.
            </p>
            <p className="font-bold text-gray-800">
                Order ID: {paidOrderId}
            </p>
        </div>
    );
}

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in pb-32">
            <button onClick={onBack} className="text-gray-500 mb-6 flex items-center gap-1 hover:text-gray-800 font-bold"><ArrowLeft size={18}/> Back</button>
            
            {isOffline && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p className="font-bold text-sm">Important: The restaurant has gone offline. Please go back.</p>
                </div>
            )}

            <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Checkout</h1>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Delivery Address</h2>
                    <button onClick={onRequestLocation} className="text-brand-600 text-xs font-bold">+ Add Address</button>
                </div>
                <div className="space-y-3">
                    {user.savedAddresses.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-4 text-center">
                            <MapPin className="text-gray-300" size={32} />
                            <p className="text-sm text-gray-500">No addresses saved. Add your location to start.</p>
                            <button onClick={onRequestLocation} className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md">Add Address</button>
                        </div>
                    ) : (
                        user.savedAddresses.map(addr => (
                            <div 
                                key={addr.id}
                                onClick={() => setSelectedAddressId(addr.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer flex items-start gap-4 transition-all ${selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50/20' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedAddressId === addr.id ? 'border-brand-500' : 'border-gray-300'}`}>
                                    {selectedAddressId === addr.id && <div className="w-2.5 h-2.5 bg-brand-500 rounded-full"></div>}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800 text-sm">{addr.label}</span>
                                        {!addr.lat && <span className="bg-orange-100 text-orange-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><AlertCircle size={8}/> Pin needed</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{addr.details}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onRequestLocation(); }} className="text-brand-600 text-[10px] font-bold hover:underline">Edit</button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Bill Summary</h2>
                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Item Total</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Delivery Fee</span>
                        <span className={`font-bold ${deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {formatPricingValue({ ...config.delivery_fee, amount: deliveryFee, type: deliveryFee === 0 ? 'FREE' : 'FIXED' })}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Platform Fee</span>
                        <span className={`font-bold ${config.platform_fee.amount === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                            {formatPricingValue(config.platform_fee)}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>GST & Restaurant Charges</span>
                        <span>₹{taxes.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-3 flex justify-between font-extrabold text-gray-900 text-lg">
                        <span>To Pay</span>
                        <span>₹{total}</span>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Payment Method</h2>
                <div className="space-y-3">
                    <div onClick={() => setPaymentMethod('UPI')} className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-4 ${paymentMethod === 'UPI' ? 'border-brand-500 bg-brand-50/20' : 'border-gray-100'}`}>
                        <CreditCard size={20} className="text-gray-600"/>
                        <span className="font-bold text-gray-800 text-sm">UPI / Online</span>
                    </div>
                    <div onClick={() => setPaymentMethod('COD')} className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-4 ${paymentMethod === 'COD' ? 'border-brand-500 bg-brand-50/20' : 'border-gray-100'}`}>
                        <span className="font-bold text-gray-800 text-sm">Cash on Delivery</span>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
                <div className="max-w-2xl mx-auto">
                    {!hasCoordinates && !isOffline && (
                        <div className="mb-4 bg-orange-50 text-orange-700 text-xs p-3 rounded-xl flex items-center gap-2 border border-orange-100 animate-pulse">
                            <AlertCircle size={16} />
                            Please add your location to enable checkout.
                        </div>
                    )}
                    <button 
                        onClick={handleConfirm}
                        disabled={!hasCoordinates || isOffline}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all 
                            ${(hasCoordinates && !isOffline) 
                                ? 'bg-brand-600 text-white active:scale-[0.98]' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {isOffline ? 'Restaurant Offline' : `Place Order • ₹${total}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const emptyOrder: Order = {
    id: '',
    customerName: '',
    customerPhone: '',
    items: [],
    total: 0,
    status: 'placed',
    date: new Date().toISOString(),
    paymentMethod: 'COD',
    restaurantName: 'Loading...',
    restaurantId: '',
    chatMessages: [],
    deliveryFee: 0,
    platformFee: 0,
    riderPayout: 0,
    commissionAmount: 0,
    netRestaurantEarnings: 0
};

export const OrderTracking: React.FC<{ order: Order; driverProfile?: User; onGoHome: () => void; onOpenChat: () => void; }> = ({ order, driverProfile, onGoHome, onOpenChat }) => {
    const safeOrder = order || emptyOrder;
    const [prepRemaining, setPrepRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (order?.status === 'preparing' && order.prepEta) {
            const updateTimer = () => {
                const now = new Date();
                const eta = new Date(order.prepEta!);
                const diffMs = eta.getTime() - now.getTime();
                const diffMin = Math.max(0, Math.ceil(diffMs / 60000));
                setPrepRemaining(diffMin);
            };
            updateTimer();
            const interval = setInterval(updateTimer, 30000); 
            return () => clearInterval(interval);
        } else {
            setPrepRemaining(null);
        }
    }, [order?.status, order?.prepEta]);

    const steps = [
        { id: 'placed', label: 'Order Placed', desc: 'Received by restaurant', icon: Receipt },
        { id: 'accepted', label: 'Confirmed', desc: safeOrder.status === 'preparing' ? 'Preparing your food' : 'Confirmed', icon: CheckCircle },
        { id: 'preparing', label: 'Cooking', desc: prepRemaining !== null ? `Ready in ${prepRemaining} min` : 'Chefs are busy!', icon: Utensils },
        { id: 'out_for_delivery', label: 'On the Way', desc: driverProfile ? `${driverProfile.name} is on the way` : 'Assigning partner', icon: Bike },
        { id: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!', icon: Package }
    ];

    const mapStatusToIndex: Record<string, number> = {
        'placed': 0, 'accepted': 1, 'preparing': 2, 'ready_for_pickup': 2, 'rider_assigned': 2, 'rider_at_restaurant': 3, 'out_for_delivery': 3, 'arrived_at_customer': 3, 'delivered': 4
    };
    const activeIndex = mapStatusToIndex[safeOrder.status] || 0;

    const getTrackingTitle = () => {
        if (safeOrder.status === 'delivered') return 'Order Delivered!';
        if (safeOrder.status === 'arrived_at_customer') return 'Delivery Partner has arrived';
        if (safeOrder.status === 'out_for_delivery') return 'On the way to you';
        if (safeOrder.status === 'rider_at_restaurant') return 'Partner waiting at restaurant';
        if (safeOrder.status === 'rider_assigned') return 'Partner is on the way to restaurant';
        if (safeOrder.status === 'preparing') return 'Restaurant is preparing your food';
        return 'Tracking Your Order';
    };

    return (
        <div className="max-w-2xl mx-auto min-h-screen bg-white pb-20 animate-fade-in">
             <div className="p-6">
                 <button onClick={onGoHome} className="mb-6 flex items-center gap-2 text-gray-500 font-bold hover:text-brand-600 transition-colors"><ArrowLeft size={20}/> Home</button>
                 
                 <div className="flex justify-between items-start mb-6">
                     <div>
                         <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                            {getTrackingTitle()}
                         </h1>
                         <p className="text-gray-400 text-sm font-medium">Order #{safeOrder.id.slice(-6) || '......'} • {safeOrder.restaurantName}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Reach</p>
                         <p className="font-extrabold text-brand-600 text-xl">
                            {safeOrder.status === 'delivered' ? '--' : 
                             safeOrder.status === 'arrived_at_customer' ? 'Here!' :
                             prepRemaining !== null ? `${prepRemaining + 5} mins` : 
                             (safeOrder.etaMinutes || 25) + ' mins'}
                         </p>
                     </div>
                 </div>

                 <div className="mb-8 bg-gray-900 text-white rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-between border-4 border-white">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-0.5">Total Amount {safeOrder.paymentMethod === 'COD' ? 'to Pay' : 'Paid'}</p>
                        <h2 className="text-4xl font-black">₹{safeOrder.total}</h2>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider ${safeOrder.paymentMethod === 'COD' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                        {safeOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid via UPI'}
                    </div>
                 </div>

                 {safeOrder.status === 'preparing' && safeOrder.prepTimeMinutes && safeOrder.prepStartedAt && (
                     <div className="mb-8 bg-orange-50 rounded-2xl p-4 border border-orange-100">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Cooking Progress</span>
                             <span className="text-xs font-black text-orange-600">{prepRemaining} min left</span>
                         </div>
                         <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                             <div 
                                className="bg-orange-500 h-full transition-all duration-1000" 
                                style={{ width: `${Math.max(5, 100 - ((prepRemaining || 0) / safeOrder.prepTimeMinutes * 100))}%` }}
                             ></div>
                         </div>
                     </div>
                 )}

                 {['out_for_delivery', 'rider_assigned', 'rider_at_restaurant', 'arrived_at_customer'].includes(safeOrder.status) && safeOrder.riderName && (
                     <div className="bg-gray-100 text-gray-900 rounded-3xl p-5 mb-8 flex items-center justify-between shadow-sm border border-gray-200">
                         <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                                 <img src={driverProfile?.avatar || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100"} className="w-full h-full object-cover" alt="driver"/>
                             </div>
                             <div>
                                 <div className="flex items-center gap-2">
                                    <h4 className="font-extrabold text-lg leading-none">{driverProfile?.name || "Assigned Rider"}</h4>
                                 </div>
                                 <div className="flex items-center gap-1.5 text-xs text-brand-600 font-bold uppercase mt-1">
                                     <Bike size={12}/> Delivery Partner
                                 </div>
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <a href={`tel:${driverProfile?.phone}`} className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-colors shadow-sm">
                                 <Phone size={20} className="text-gray-900"/>
                             </a>
                         </div>
                     </div>
                 )}

                 <div className="relative pl-6 border-l-2 border-gray-100 space-y-8 mb-10 ml-2">
                     {steps.map((step, index) => {
                         const isActive = index === activeIndex;
                         const isPast = index < activeIndex;
                         return (
                             <div key={step.id} className={`relative flex items-start gap-4 transition-all duration-500 ${index > activeIndex ? 'opacity-30' : 'opacity-100'}`}>
                                 <div className={`absolute -left-[33px] top-0 w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white z-10 transition-colors ${isActive || isPast ? 'border-brand-500' : 'border-gray-200'}`}>
                                     {(isPast) ? <Check size={16} className="text-brand-600" /> : <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-brand-500 animate-pulse' : 'bg-gray-200'}`}></div>}
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`font-extrabold text-lg leading-tight ${isActive ? 'text-brand-600' : 'text-gray-800'}`}>{step.label}</h3>
                                     <p className="text-sm text-gray-500 font-medium">{step.desc}</p>
                                 </div>
                             </div>
                         );
                     })}
                 </div>

                 <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 mb-6">
                     <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Your Order Details</h3>
                     <div className="space-y-3">
                         {safeOrder.items.map((item, i) => (
                             <div key={i} className="flex justify-between text-sm">
                                 <span className="text-gray-700 font-bold">{item.quantity}x {item.name}</span>
                                 <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                             </div>
                         ))}
                         <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between">
                             <span className="font-extrabold text-gray-900">Subtotal</span>
                             <span className="font-black text-gray-900 text-lg">₹{safeOrder.total}</span>
                         </div>
                     </div>
                 </div>

                 <button onClick={onGoHome} className="w-full py-4 rounded-2xl font-black text-gray-500 text-sm hover:bg-gray-100 transition-colors uppercase tracking-widest border-2 border-gray-100">
                    Back to Home
                 </button>
             </div>
        </div>
    );
};
