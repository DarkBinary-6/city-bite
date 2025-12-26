
import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, IndianRupee, X, Send, XCircle, AlertCircle } from 'lucide-react';

// 1. Delivery Success & Rider Rating Modal
interface RiderReviewModalProps {
    riderName: string;
    onSubmit: (rating: number, tip: number) => void;
    onClose: () => void;
}

export const RiderReviewModal: React.FC<RiderReviewModalProps> = ({ riderName, onSubmit, onClose }) => {
    const [rating, setRating] = useState(0);
    const [tip, setTip] = useState(0);
    const [step, setStep] = useState<'success' | 'review'>('success');

    // Auto transition from success animation to review
    useEffect(() => {
        if (step === 'success') {
            const timer = setTimeout(() => setStep('review'), 2500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    if (step === 'success') {
        return (
            <div className="fixed inset-0 z-[200] bg-brand-600 flex flex-col items-center justify-center text-white animate-fade-in">
                <div className="bg-white p-6 rounded-full mb-6 animate-bounce shadow-2xl">
                    <CheckCircle size={64} className="text-brand-600" />
                </div>
                <h1 className="text-4xl font-extrabold mb-2 text-center">Order Delivered!</h1>
                <p className="text-brand-100 text-lg">Enjoy your meal 😋</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-slide-up">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Rate Delivery</h2>
                        <p className="text-gray-500">How was {riderName}?</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-3 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star}
                            onClick={() => setRating(star)}
                            className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        >
                            <Star size={36} />
                        </button>
                    ))}
                </div>

                {/* Tipping Section */}
                <div className="mb-8">
                    <p className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <IndianRupee size={16}/> Add a Tip
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[20, 30, 50, 100].map(amount => (
                            <button
                                key={amount}
                                onClick={() => setTip(tip === amount ? 0 : amount)}
                                className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                                    tip === amount 
                                    ? 'bg-brand-50 text-white border-brand-500 shadow-md' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                                }`}
                            >
                                ₹{amount}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={() => onSubmit(rating, tip)}
                    disabled={rating === 0}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Submit Feedback
                </button>
            </div>
        </div>
    );
};

// 2. Restaurant Review Modal
interface RestaurantReviewModalProps {
    restaurantName: string;
    onSubmit: (rating: number, feedback: string) => void;
    onClose: () => void;
}

export const RestaurantReviewModal: React.FC<RestaurantReviewModalProps> = ({ restaurantName, onSubmit, onClose }) => {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Review {restaurantName}</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star}
                            onClick={() => setRating(star)}
                            className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        >
                            <Star size={32} />
                        </button>
                    ))}
                </div>

                <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-brand-500 outline-none h-32 resize-none"
                    placeholder="Tell us about the food (taste, packaging, portion)..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                />

                <button 
                    onClick={() => onSubmit(rating, feedback)}
                    disabled={rating === 0}
                    className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    Submit Review <Send size={18} />
                </button>
            </div>
        </div>
    );
};

// 3. Order Cancellation Modal
interface OrderCancelledModalProps {
    orderId: string;
    restaurantName: string;
    totalAmount: number;
    paymentMethod: 'UPI' | 'COD';
    onClose: () => void;
}

export const OrderCancelledModal: React.FC<OrderCancelledModalProps> = ({ orderId, restaurantName, totalAmount, paymentMethod, onClose }) => {
    return (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-cancel-popup border-4 border-red-50 text-center relative">
                {/* Manual Cross Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                    <XCircle size={48} className="animate-pulse" />
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 italic tracking-tighter mb-4 leading-tight">
                    Order Cancelled by Restaurant
                </h2>
                
                <p className="text-gray-500 font-medium mb-6 text-sm leading-relaxed">
                    We're sorry! <span className="font-bold text-gray-800">{restaurantName}</span> is unable to fulfill your order #{orderId.slice(-6)}.
                </p>

                <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
                    <div className="flex items-center gap-3 text-left">
                        <div className="bg-white p-2 rounded-xl text-brand-600 shadow-sm">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Refund Info</p>
                            <p className="text-xs text-gray-700 font-bold leading-snug">
                                {paymentMethod === 'UPI' 
                                    ? `₹${totalAmount} refund will be deposited to your paid method in 5-7 working days.` 
                                    : "We apologize for the inconvenience. As this was a COD order, no payment was deducted."}
                            </p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    Understood
                </button>
            </div>
        </div>
    );
};
