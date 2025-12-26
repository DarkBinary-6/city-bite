
import React, { useState, useEffect } from 'react';
import { Restaurant, MenuItem, User } from '../types';
import { Star, Clock, MapPin, ArrowLeft, Plus, Check, Info, Phone, Copy, Ban, Sparkles, AlertCircle, UtensilsCrossed, X, List } from 'lucide-react';
import { isWithinServiceArea } from '../utils/geo';
import { getConfig } from '../utils/storage';
import { formatPricingValue } from '../utils/formatters';

interface RestaurantProps {
  restaurant: Restaurant;
  user: User;
  onBack: () => void;
  onAddToCart: (item: MenuItem, restId: string, restName: string) => void;
}

export const RestaurantDetails: React.FC<RestaurantProps> = ({ restaurant, user, onBack, onAddToCart }) => {
  const [activeCategory, setActiveCategory] = useState(restaurant.menu[0]?.category || '');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [isServiceable, setIsServiceable] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isOffline = restaurant.isOpen === false;
  const config = getConfig();

  useEffect(() => {
    if (user.location) {
        setIsServiceable(isWithinServiceArea(user.location.lat, user.location.lng));
    }
  }, [user.location]);

  const handleAdd = (item: MenuItem) => {
    if (isOffline || item.isAvailable === false) return;
    if (!isServiceable) {
        alert("Sorry, we cannot deliver to your location.");
        return;
    }
    onAddToCart(item, restaurant.id, restaurant.name);
    // Visual feedback
    const newSet = new Set(addedItems);
    newSet.add(item.id);
    setAddedItems(newSet);
    setTimeout(() => {
        const resetSet = new Set(addedItems);
        resetSet.delete(item.id);
        setAddedItems(resetSet);
    }, 1000);
  };

  return (
    <div className={`bg-white min-h-screen pb-24 animate-fade-in relative transition-colors duration-300 ${isOffline ? 'grayscale' : ''}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-0">
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 mb-4 font-medium group transition-colors">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          
          {isOffline && (
            <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl mb-6 flex items-center gap-3 text-gray-600">
              <Ban size={20} className="text-gray-400 shrink-0" />
              <p className="text-sm font-bold uppercase tracking-wide">Restaurant is currently offline. Orders are disabled.</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
              <div>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">{restaurant.name}</h1>
                  <div className="text-gray-500 font-medium mb-1">{restaurant.cuisine.join(', ')}</div>
                  <div className="text-gray-400 text-sm flex items-center gap-1"><MapPin size={14}/> {restaurant.address}</div>
                  <div className="text-brand-500 text-xs font-black mt-3 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
                      {formatPricingValue(config.delivery_fee)} Delivery Available
                  </div>
              </div>
              <div className="flex gap-4">
                  <div className="flex flex-col items-center bg-green-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-green-700/20">
                      <span className="font-black text-xl flex items-center gap-1">{restaurant.rating} <Star size={14} fill="white"/></span>
                      <span className="text-[10px] uppercase font-black border-t border-green-600 w-full text-center mt-1 pt-1 opacity-80 tracking-tighter">Dining</span>
                  </div>
                  <div className="flex flex-col items-center bg-green-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-green-700/20">
                      <span className="font-black text-xl flex items-center gap-1">{restaurant.rating} <Star size={14} fill="white"/></span>
                      <span className="text-[10px] uppercase font-black border-t border-green-600 w-full text-center mt-1 pt-1 opacity-80 tracking-tighter">Delivery</span>
                  </div>
              </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-8 border-b border-gray-100">
              {['Order Online', 'Reviews', 'Info'].map(tabLabel => {
                  const key = tabLabel.toLowerCase().split(' ')[0] as any;
                  return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`py-4 text-sm md:text-base font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                      >
                          {tabLabel}
                      </button>
                  );
              })}
          </div>
      </div>

      <div className="bg-gray-50/50 min-h-[600px] pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* MENU TAB */}
            {activeTab === 'menu' && (
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Categories Sidebar (Desktop) */}
                    <div className="hidden lg:block lg:w-64 shrink-0">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                                <Sparkles size={16} className="text-brand-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categories</span>
                            </div>
                            {restaurant.menu.map(cat => (
                                <button
                                    key={cat.category}
                                    onClick={() => setActiveCategory(cat.category)}
                                    className={`w-full text-left px-5 py-4 text-sm font-bold border-l-4 transition-all flex justify-between items-center ${activeCategory === cat.category ? 'border-brand-500 text-brand-600 bg-brand-50/50' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                                >
                                    {cat.category}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeCategory === cat.category ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                                        {cat.items.length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black text-gray-900 mb-6 italic tracking-tight flex items-center gap-3">
                                <div className="h-8 w-1.5 bg-brand-500 rounded-full"></div>
                                {activeCategory}
                            </h2>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {restaurant.menu.find(c => c.category === activeCategory)?.items.map(item => {
                                    const outOfStock = item.isAvailable === false;
                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 transition-all duration-300 flex flex-row gap-4 md:gap-8 group relative ${outOfStock ? 'opacity-60' : 'hover:shadow-xl hover:shadow-gray-200/40'}`}
                                        >
                                            {/* Left Side: Name & Description */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center p-[1px] ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                                            <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                                        </div>
                                                        {item.isBestseller && !outOfStock && (
                                                            <span className="text-[9px] font-black uppercase text-orange-600 tracking-wider bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                                                <Star size={10} fill="currentColor" /> Bestseller
                                                            </span>
                                                        )}
                                                        {outOfStock && (
                                                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                                                                <AlertCircle size={10} /> Out of Stock
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className={`text-lg md:text-xl font-black transition-colors leading-tight ${outOfStock ? 'text-gray-400' : 'text-gray-900 group-hover:text-brand-600'}`}>
                                                        {item.name}
                                                    </h3>
                                                </div>
                                                
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-lg font-black ${outOfStock ? 'text-gray-400' : 'text-gray-800'}`}>₹{item.price}</span>
                                                    {item.calories && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.calories} kcal</span>}
                                                </div>

                                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 md:line-clamp-none font-medium">
                                                    {item.description}
                                                </p>
                                            </div>

                                            {/* Right Side: Image & Add Button */}
                                            <div className="relative w-28 md:w-40 h-28 md:h-40 shrink-0 self-center">
                                                <div className={`w-full h-full rounded-2xl md:rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 shadow-md transition-transform duration-500 ${!outOfStock && 'group-hover:scale-[1.02]'}`}>
                                                    <img 
                                                        src={item.image} 
                                                        alt={item.name} 
                                                        className={`w-full h-full object-cover transition-all duration-700 ${outOfStock ? 'grayscale' : 'group-hover:scale-110'}`} 
                                                    />
                                                </div>
                                                
                                                {outOfStock ? (
                                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] z-20">
                                                      <div className="w-full py-2.5 rounded-xl text-[10px] md:text-xs font-black bg-gray-100 text-gray-400 border border-gray-200 text-center shadow-sm uppercase">
                                                          Out of Stock
                                                      </div>
                                                  </div>
                                                ) : !isOffline && (
                                                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] z-20">
                                                      <button 
                                                          onClick={() => handleAdd(item)}
                                                          className={`w-full py-2.5 rounded-xl text-[10px] md:text-xs font-black shadow-xl uppercase transition-all active:scale-95 border flex items-center justify-center gap-2 group/btn
                                                              ${addedItems.has(item.id) 
                                                                ? 'bg-green-600 text-white border-green-600' 
                                                                : 'bg-white text-brand-600 border-gray-100 hover:border-brand-500'
                                                              }
                                                          `}
                                                      >
                                                          {addedItems.has(item.id) ? (
                                                              <> <Check size={14} strokeWidth={4} /> ADDED </>
                                                          ) : (
                                                              <> <Plus size={14} strokeWidth={4} className="group-hover/btn:rotate-90 transition-transform" /> ADD </>
                                                          )}
                                                      </button>
                                                  </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INFO TAB */}
            {activeTab === 'info' && (
                <div className="max-w-3xl animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-10 space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="bg-brand-50 p-4 rounded-2xl text-brand-600">
                                <MapPin size={24}/>
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Location</h3>
                                <p className="text-gray-900 font-extrabold text-lg">{restaurant.address}</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-50 pt-8 flex items-start gap-4">
                            <div className="bg-brand-50 p-4 rounded-2xl text-brand-600">
                                <Phone size={24}/>
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Contact</h3>
                                <p className="text-brand-600 text-xl font-black">{restaurant.phone || '+91 98765 43210'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
                <div className="max-w-3xl animate-fade-in">
                    <div className="space-y-6">
                        {restaurant.reviews && restaurant.reviews.length > 0 ? (
                            restaurant.reviews.map(review => (
                                <div key={review.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group transition-colors">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-black text-brand-600 text-lg">
                                                {review.user.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 text-lg">{review.user}</div>
                                                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(review.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="bg-green-600 text-white px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1">
                                            {review.rating} <Star size={14} fill="white"/>
                                        </div>
                                    </div>
                                    <p className="text-gray-700 font-medium leading-relaxed italic">"{review.text}"</p>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-[3rem] shadow-sm border-2 border-dashed border-gray-100 p-20 text-center">
                                <Star size={48} className="mx-auto text-gray-300 mb-6" />
                                <h3 className="text-2xl font-black text-gray-900 mb-2 italic">No reviews yet</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* Floating Menu Button */}
      {activeTab === 'menu' && !isOffline && (
          <>
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-3.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all group"
            >
                <UtensilsCrossed size={18} className="group-hover:rotate-12 transition-transform" />
                <span className="font-black text-xs uppercase tracking-widest">Browse Menu</span>
            </button>

            {/* Menu Navigator Modal */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="relative bg-white w-full sm:max-w-xs rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 italic tracking-tighter leading-none">Menu Categories</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Quick Navigation</p>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-2 flex-1 pr-2 hide-scrollbar">
                            {restaurant.menu.map(cat => (
                                <button
                                    key={cat.category}
                                    onClick={() => {
                                        setActiveCategory(cat.category);
                                        setIsMenuOpen(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2
                                        ${activeCategory === cat.category 
                                            ? 'bg-brand-50 border-brand-500 text-brand-700' 
                                            : 'bg-white border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-100'
                                        }`}
                                >
                                    <span className="font-extrabold text-sm tracking-tight">{cat.category}</span>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${activeCategory === cat.category ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {cat.items.length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button 
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-800 transition-colors"
                            >
                                Close Navigator
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </>
      )}
    </div>
  );
};
