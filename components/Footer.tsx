
import React from 'react';
import { ChefHat, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
    onNavigate?: (page: 'terms' | 'privacy' | 'refund' | 'about') => void;
    onPartnerClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onPartnerClick }) => {
  const handleNav = (page: 'terms' | 'privacy' | 'refund' | 'about') => (e: React.MouseEvent) => {
      e.preventDefault();
      if(onNavigate) onNavigate(page);
  };

  const handlePartner = (e: React.MouseEvent) => {
      e.preventDefault();
      if(onPartnerClick) onPartnerClick();
  };

  return (
    <footer className="bg-charcoal-900 text-white pt-16 pb-8 animate-fade-in border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-brand-500 p-2 rounded-xl text-white">
                <ChefHat size={24} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight">CityBite</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Delivering happiness to your doorstep. We connect you with the best local flavors, ensuring fresh, hot, and fast delivery every time.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-brand-600 transition-colors" aria-label="Facebook"><Facebook size={18}/></a>
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-brand-600 transition-colors" aria-label="Twitter"><Twitter size={18}/></a>
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-brand-600 transition-colors" aria-label="Instagram"><Instagram size={18}/></a>
              <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-brand-600 transition-colors" aria-label="Linkedin"><Linkedin size={18}/></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6">Company</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><button onClick={handleNav('about')} className="hover:text-white transition-colors text-left">About Us</button></li>
              <li><button onClick={handlePartner} className="hover:text-white transition-colors text-left">Partner With Us</button></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-6">Legal</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><button onClick={handleNav('terms')} className="hover:text-white transition-colors text-left">Terms & Conditions</button></li>
              <li><button onClick={handleNav('refund')} className="hover:text-white transition-colors text-left">Refund & Cancellation</button></li>
              <li><button onClick={handleNav('privacy')} className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-brand-500 shrink-0 mt-0.5"/>
                <span>123, Foodie Street, Startup Hub,<br/>Bikapur, UP - 224204</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-brand-500 shrink-0"/>
                <span>+91 90268 98486</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-brand-500 shrink-0"/>
                <span>lorddarkbinary@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">© 2025 CityBite Technologies LLP. All rights reserved.</p>
          <div className="flex gap-6">
             <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="h-8 opacity-80 hover:opacity-100 cursor-pointer transition-opacity"/>
             <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8 opacity-80 hover:opacity-100 cursor-pointer transition-opacity"/>
          </div>
        </div>
      </div>
    </footer>
  );
};
