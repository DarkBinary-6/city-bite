
import React, { useState } from 'react';
import { View, Address } from '../types';
import { ShoppingBag, MapPin, Search, User as UserIcon, ChefHat, Plus, ChevronDown } from 'lucide-react';

interface LayoutProps {
  currentView: View;
  cartCount: number;
  activeAddress?: string;
  savedAddresses: Address[];
  onChangeView: (view: View) => void;
  onSearch: (term: string) => void;
  onRequestLocation: () => void;
  onSelectAddress: (addressId: string) => void;
}

export const Navbar: React.FC<LayoutProps> = ({ 
  currentView, 
  cartCount, 
  activeAddress,
  savedAddresses,
  onChangeView,
  onSearch,
  onRequestLocation,
  onSelectAddress
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddressMenu, setShowAddressMenu] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleAddressClick = () => {
    if (!activeAddress && savedAddresses.length === 0) {
      onRequestLocation();
    } else {
      setShowAddressMenu(!showAddressMenu);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* Brand & Address */}
          <div className="flex items-center gap-4 md:gap-8 flex-1">
            <div 
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              onClick={() => onChangeView(View.HOME)}
            >
              <div className="bg-brand-600 p-1.5 rounded-lg text-white group-hover:bg-brand-700 transition-colors">
                <ChefHat size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-extrabold text-gray-900 tracking-tight hidden sm:block">
                CityBite
              </span>
            </div>
            
            {/* Address Selector */}
            <div className="relative max-w-[200px] md:max-w-xs">
                <button 
                  onClick={handleAddressClick}
                  className="flex items-center gap-2 text-left hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
                >
                  <MapPin size={18} className="text-brand-600 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] font-bold text-brand-600 uppercase leading-none">Delivering to</span>
                      <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-800 text-sm truncate block max-w-[120px] md:max-w-[200px]">
                            {activeAddress || "Add Address"}
                          </span>
                          <ChevronDown size={14} className="text-gray-400 shrink-0"/>
                      </div>
                  </div>
                </button>

                {showAddressMenu && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[60] animate-fade-in">
                        <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase">Saved Addresses</span>
                            <button 
                                onClick={() => { onRequestLocation(); setShowAddressMenu(false); }}
                                className="text-brand-600 text-xs font-bold hover:underline"
                            >
                                + Add New
                            </button>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                            {savedAddresses.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-400">
                                    No saved addresses.
                                </div>
                            ) : (
                                savedAddresses.map(addr => (
                                    <button 
                                        key={addr.id}
                                        onClick={() => { onSelectAddress(addr.id); setShowAddressMenu(false); }}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                                    >
                                        <MapPin size={16} className={`mt-0.5 ${activeAddress === addr.label ? 'text-brand-600' : 'text-gray-400'}`}/>
                                        <div>
                                            <div className={`font-bold text-sm ${activeAddress === addr.label ? 'text-brand-600' : 'text-gray-800'}`}>{addr.label}</div>
                                            <div className="text-xs text-gray-500 line-clamp-1">{addr.details}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:block flex-[2] max-w-lg mx-auto relative">
             <form onSubmit={handleSearchSubmit} className="w-full relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search for restaurant, cuisine or a dish" 
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-100 text-gray-800 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-100 focus:shadow-md transition-all outline-none text-sm placeholder:text-gray-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button 
              className="md:hidden p-2 text-gray-600 hover:text-brand-600"
              onClick={() => { /* Mobile Search Logic */ }}
            >
              <Search size={22} />
            </button>

            <button 
              className={`p-2 rounded-full transition-colors relative ${currentView === View.CART ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => onChangeView(View.CART)}
            >
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                  {cartCount}
                </span>
              )}
            </button>

            <button 
              className={`p-2 rounded-full transition-colors ${currentView === View.PROFILE ? 'text-brand-600 bg-brand-50' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => onChangeView(View.PROFILE)}
            >
              <UserIcon size={22} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
