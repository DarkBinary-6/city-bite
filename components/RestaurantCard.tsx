
import React from 'react';
import { Restaurant } from '../types';
import { Star, Clock, IndianRupee } from 'lucide-react';
import { getConfig } from '../utils/storage';
import { formatPricingValue } from '../utils/formatters';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
  distance?: number;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick, distance }) => {
  const isOffline = restaurant.isOpen === false;
  const config = getConfig();

  return (
    <div 
      className={`group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-gray-100 ${isOffline ? 'grayscale opacity-80' : ''}`}
      onClick={onClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={restaurant.image} 
          alt={restaurant.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        
        {restaurant.isPromoted && !isOffline && (
          <div className="absolute top-4 left-4 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            Promoted
          </div>
        )}

        {isOffline && (
          <div className="absolute top-4 left-4 bg-gray-800/90 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider">
            Offline
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 text-white">
          <div className="font-bold text-xl drop-shadow-md">{restaurant.name}</div>
          <div className="text-sm opacity-90 truncate max-w-[250px]">
            {restaurant.cuisine.join(' • ')}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
          <Clock size={12} />
          {restaurant.deliveryTime}
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md">
            <Star size={14} className="text-green-600 fill-green-600" />
            <span className="text-sm font-bold text-green-700">{restaurant.rating}</span>
          </div>
          <div className="flex items-center gap-0.5 text-gray-500 text-sm">
             <IndianRupee size={12} />
             <span>{restaurant.priceRange.replace(/₹/g, '').length === 0 ? restaurant.priceRange.length * 100 + '+' : '200+'} for two</span>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                {isOffline ? 'Currently Closed' : `${formatPricingValue(config.delivery_fee)} Delivery`}
            </span>
             {typeof distance === 'number' ? (
                <span className="text-xs text-gray-400 font-bold">
                  {distance.toFixed(1)} km away
                </span>
             ) : (
                <span className="text-xs text-gray-400">
                   Location unavailable
                </span>
             )}
        </div>
      </div>
    </div>
  );
};
