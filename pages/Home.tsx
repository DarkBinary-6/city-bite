
import React, { useState, useEffect } from 'react';
import { Restaurant, Order, User } from '../types';
import { RestaurantCard } from '../components/RestaurantCard';
import { SlidersHorizontal, ChevronDown, ShoppingBag, Filter, Clock, Star, Percent, ChevronRight, Bike, AlertCircle, RefreshCw, X } from 'lucide-react';
import { isWithinServiceArea, calculateDistance } from '../utils/geo';

interface HomeProps {
  restaurants: Restaurant[];
  user: User;
  onRestaurantClick: (id: string) => void;
  activeOrder?: Order;
  onTrackOrder?: () => void;
  searchTerm?: string;
}

type SortOption = 'Relevance' | 'Rating' | 'Delivery Time' | 'Cost: Low to High' | 'Cost: High to Low';

export const Home: React.FC<HomeProps> = ({ restaurants, user, onRestaurantClick, activeOrder, onTrackOrder, searchTerm = '' }) => {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('Relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [dismissedBannerId, setDismissedBannerId] = useState<string | null>(null);

  // 1. Calculate distances (Server-side simulation)
  const restaurantsWithData = restaurants.map(r => {
      let dist = undefined;
      if (user.location && r.coordinates) {
          dist = calculateDistance(user.location.lat, user.location.lng, r.coordinates.lat, r.coordinates.lng);
      }
      return { ...r, distance: dist };
  });

  // 2. Filter Logic
  const filteredRestaurants = restaurantsWithData.filter(r => {
    // Search Term Check
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(lowerTerm);
        const matchesCuisine = r.cuisine.some(c => c.toLowerCase().includes(lowerTerm));
        const matchesDish = r.menu.some(cat => cat.items.some(i => i.name.toLowerCase().includes(lowerTerm)));
        if (!matchesName && !matchesCuisine && !matchesDish) return false;
    }

    // Filter Chips
    if (activeFilters.has('Rating') && r.rating < 4.0) return false;
    if (activeFilters.has('Fast Delivery') && parseInt(r.deliveryTime) > 35) return false; // Approx check
    if (activeFilters.has('Offers') && !r.isPromoted) return false; // Using promoted as proxy for offers for now
    if (activeFilters.has('Pure Veg') && r.cuisine.some(c => ['Chicken', 'Mutton', 'Non-Veg'].includes(c))) return false;

    return true;
  });

  // 3. Sort Logic
  const sortedRestaurants = filteredRestaurants.sort((a, b) => {
      switch (sortBy) {
          case 'Rating': return b.rating - a.rating;
          case 'Delivery Time': return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
          case 'Cost: Low to High': return a.priceRange.length - b.priceRange.length;
          case 'Cost: High to Low': return b.priceRange.length - a.priceRange.length;
          default: // Relevance (Promoted first, then distance)
              const now = Date.now();
              const aPromoted = a.isPromoted && (a.promotedUntil || 0) > now;
              const bPromoted = b.isPromoted && (b.promotedUntil || 0) > now;
              if (aPromoted && !bPromoted) return -1;
              if (!aPromoted && bPromoted) return 1;
              return (a.distance || 0) - (b.distance || 0);
      }
  });

  const toggleFilter = (filter: string) => {
      const newFilters = new Set(activeFilters);
      if (newFilters.has(filter)) newFilters.delete(filter);
      else newFilters.add(filter);
      setActiveFilters(newFilters);
  };

  const isCancelled = activeOrder && 
                    (activeOrder.status === 'cancelled' || activeOrder.status === 'rejected') &&
                    activeOrder.id !== dismissedBannerId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in pb-24 relative">
      
      {/* Cancellation Banner */}
      {isCancelled && activeOrder && (
        <div className="mb-6 bg-red-50 border-2 border-red-100 rounded-[2rem] p-6 shadow-xl shadow-red-500/5 animate-slide-up relative overflow-hidden group">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setDismissedBannerId(activeOrder.id);
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-red-100/50 text-red-600 hover:bg-red-200/70 transition-colors z-10"
                title="Dismiss message"
            >
                <X size={18} />
            </button>

            <div className="flex items-start gap-4 pr-8">
                <div className="bg-red-500 p-3 rounded-2xl text-white shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-black text-red-900 leading-tight">Your order has been cancelled by the restaurant</h3>
                    <p className="text-red-700/70 text-sm font-bold mt-1 leading-snug">
                        We apologize for the inconvenience. {activeOrder.paymentMethod === 'UPI' || activeOrder.paymentStatus === 'PAID' ? 'Since the amount was already paid, your full refund of ₹' + activeOrder.total + ' will be initiated automatically and should reflect in your account within 5-7 working days.' : 'As this was a COD order, no payment was deducted.'}
                    </p>
                    {(activeOrder.paymentStatus === 'REFUND_INITIATED' || activeOrder.refundId) && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 w-fit px-3 py-1.5 rounded-full border border-blue-100">
                            <RefreshCw size={12} className="animate-spin-slow" />
                            REFUND INITIATED • ID: {activeOrder.refundId || 'PENDING'}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Filters & Sort Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-16 bg-[#FAFAF7] z-30 py-2">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {/* Sort Button */}
            <div className="relative">
                <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                    Sort <ChevronDown size={14}/>
                </button>
                {showSortMenu && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                        {['Relevance', 'Rating', 'Delivery Time', 'Cost: Low to High', 'Cost: High to Low'].map(opt => (
                            <button 
                                key={opt}
                                onClick={() => { setSortBy(opt as SortOption); setShowSortMenu(false); }}
                                className={`w-full text-left px-4 py-2 text-sm ${sortBy === opt ? 'bg-brand-50 text-brand-600 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Filter Chips */}
            {['Rating 4.0+', 'Fast Delivery', 'Pure Veg', 'Offers'].map(label => {
                const isActive = activeFilters.has(label === 'Rating 4.0+' ? 'Rating' : label);
                return (
                    <button
                        key={label}
                        onClick={() => toggleFilter(label === 'Rating 4.0+' ? 'Rating' : label)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                            isActive 
                            ? 'bg-brand-50 border-brand-500 text-brand-700' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {label}
                        {isActive && <span className="text-[10px]">✕</span>}
                    </button>
                );
            })}
        </div>
      </div>

      {/* Hero / Brand Banner (Only on clean state) */}
      {!searchTerm && activeFilters.size === 0 && (
          <div className="mb-8">
              <h2 className="text-xl font-extrabold text-gray-800 mb-4">Inspiration for your first order</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                      { name: 'Biryani', img: 'https://b.zmtcdn.com/data/dish_images/d19a31d42d5913ff129cafd7cec772f81639737697.png' },
                      { name: 'Pizza', img: 'https://b.zmtcdn.com/data/o2_assets/d0bd7c9405ac87f6aa65e31fe55800941632716575.png' },
                      { name: 'Burger', img: 'https://b.zmtcdn.com/data/dish_images/ccb7dc653f018527d99dce250e32bd291639737697.png' },
                      { name: 'Thali', img: 'https://b.zmtcdn.com/data/o2_assets/52eb9796bb9bcf0eba2f3406f2ce17151632716604.png' }
                  ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                          <img src={item.img} className="w-24 h-24 rounded-full object-cover shadow-sm bg-white p-1" alt={item.name} />
                          <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Restaurant List */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {searchTerm ? `Results for "${searchTerm}"` : 'Best Food in Bikapur'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
        {sortedRestaurants.map(restaurant => {
            const isSponsored = restaurant.isPromoted && (restaurant.promotedUntil || 0) > Date.now();
            return (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={{...restaurant, isPromoted: isSponsored}} 
                distance={restaurant.distance}
                onClick={() => onRestaurantClick(restaurant.id)}
              />
            );
        })}
      </div>

      {sortedRestaurants.length === 0 && (
         <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No restaurants found.</p>
            <button 
                onClick={() => { setActiveFilters(new Set()); setSortBy('Relevance'); }} 
                className="mt-4 text-brand-600 font-bold hover:underline"
            >
                Clear Filters
            </button>
         </div>
      )}

      {/* Enhanced Floating Track Order Status Popup */}
      {activeOrder && onTrackOrder && activeOrder.status !== 'cancelled' && activeOrder.status !== 'rejected' && !isCancelled && (
          <div 
            onClick={onTrackOrder}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white text-gray-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-5 cursor-pointer animate-slide-up hover:scale-[1.02] transition-all z-[100] border border-brand-100 flex items-center gap-4 group"
          >
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                  <Bike className="text-brand-600" size={28} />
              </div>
              
              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-brand-600">
                        {activeOrder.status.replace(/_/g, ' ')}
                      </h4>
                  </div>
                  <p className="font-extrabold text-gray-900 text-sm truncate">{activeOrder.restaurantName}</p>
                  <p className="text-xs text-gray-500 font-bold">
                    {activeOrder.status === 'delivered' ? 'Order Arrived!' : `Arriving in ${activeOrder.etaMinutes || 25} mins`}
                  </p>
              </div>

              <div className="bg-gray-900 text-white p-2.5 rounded-xl group-hover:bg-brand-600 transition-colors">
                  <ChevronRight size={20} strokeWidth={3} />
              </div>
          </div>
      )}
    </div>
  );
};
