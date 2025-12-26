
import { User, Restaurant, Order, PricingConfig, RestaurantWallet } from '../types';
import { RESTAURANTS, MOCK_USER } from '../data';
import { PRICING_CONFIG } from '../config/pricingConfig';

const KEYS = {
    USERS: 'citybite_users',
    RESTAURANTS: 'citybite_restaurants',
    ORDERS: 'citybite_orders',
    SESSION: 'citybite_session',
    CONFIG: 'citybite_pricing_config'
};

const defaultWallet: RestaurantWallet = {
    grossEarnings: 0,
    pendingBalance: 0,
    withdrawableBalance: 0,
    lastSettlementAt: new Date().toISOString()
};

// Initialize DB with mocks if empty
export const initStorage = () => {
    if (!localStorage.getItem(KEYS.USERS)) {
        // Create a map of users for simulation
        const initialUsers: User[] = [
            {
                ...MOCK_USER,
                id: 'u1',
                status: 'ACTIVE',
                role: 'CUSTOMER',
                password: 'password'
            },
            {
                id: 'd1',
                name: "Ravi Kumar",
                email: "ravi@driver.com",
                phone: "9876543210",
                walletBalance: 2450,
                codBalance: 0,
                savedAddresses: [],
                password: "password",
                status: 'ACTIVE',
                role: 'DELIVERY',
                vehicleInfo: { type: 'bike', model: 'Hero Splendor', plateNumber: 'UP 42 XX 1234', licenseNumber: 'DL-42-2023-001' }
            }
        ];
        localStorage.setItem(KEYS.USERS, JSON.stringify(initialUsers));
    }

    if (!localStorage.getItem(KEYS.RESTAURANTS)) {
        const demoRest: Restaurant = {
            id: 'r1',
            name: 'Barsati Mishthan Bhandaar',
            cuisine: ['Sweets', 'Snacks', 'North Indian'],
            rating: 4.8,
            deliveryTime: '20-30 min',
            priceRange: '₹',
            image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=500&q=80',
            banner: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=1200&q=80',
            address: 'Main Chowk, Bikapur',
            coordinates: { lat: 26.6011, lng: 82.1334 },
            menu: [
                {
                    category: 'Sweets',
                    items: [
                        { id: 'm1', name: 'Special Jalebi', price: 60, description: 'Hot and crispy, fried in pure desi ghee.', image: 'https://images.unsplash.com/photo-1589113103503-4947a1bc58c0?w=500&q=80', isVeg: true, isAvailable: true, packingCharge: 5 },
                        { id: 'm2', name: 'Rasmalai (2 pcs)', price: 90, description: 'Soft spongy saffron flavored milk sweet.', image: 'https://images.unsplash.com/photo-1621210185326-16664000305a?w=500&q=80', isVeg: true, isAvailable: true, packingCharge: 10 }
                    ]
                }
            ],
            reviews: [
                { id: 'rev1', user: 'Sunil J.', rating: 5, text: 'Best sweets in the city! Fast delivery.', date: new Date().toISOString(), type: 'restaurant' }
            ],
            wallet: { ...defaultWallet, withdrawableBalance: 1200 },
            email: 'barsati@citybite.com',
            password: 'password',
            status: 'ACTIVE',
            role: 'RESTAURANT',
            isOpen: true
        };
        localStorage.setItem(KEYS.RESTAURANTS, JSON.stringify([demoRest]));
    }

    if (!localStorage.getItem(KEYS.ORDERS)) {
        localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
    }

    if (!localStorage.getItem(KEYS.CONFIG)) {
        const initialConfig: PricingConfig = {
            delivery_fee: {
                amount: PRICING_CONFIG.DELIVERY_FEE.BASE_FEE,
                type: PRICING_CONFIG.DELIVERY_FEE.BASE_FEE === 0 ? 'FREE' : 'FIXED',
                display_text: null
            },
            platform_fee: {
                amount: PRICING_CONFIG.REVENUE.PLATFORM_FEE_FIXED,
                type: 'FIXED',
                display_text: null
            },
            commissionPct: PRICING_CONFIG.REVENUE.DEFAULT_COMMISSION_PCT,
            riderBasePay: PRICING_CONFIG.RIDER_PAYOUT.BASE_PAY,
            riderPerKm: PRICING_CONFIG.RIDER_PAYOUT.DISTANCE_PAY_PER_KM
        };
        localStorage.setItem(KEYS.CONFIG, JSON.stringify(initialConfig));
    }
};

export const getSession = () => {
    const sess = localStorage.getItem(KEYS.SESSION);
    return sess ? JSON.parse(sess) : null;
};

export const setSession = (user: any, role: string) => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify({ ...user, role }));
};

export const clearSession = () => {
    localStorage.removeItem(KEYS.SESSION);
};

export const getUsers = (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
export const saveUsers = (users: User[]) => localStorage.setItem(KEYS.USERS, JSON.stringify(users));

export const getRestaurants = (): Restaurant[] => {
    const rests: Restaurant[] = JSON.parse(localStorage.getItem(KEYS.RESTAURANTS) || '[]');
    return rests.map(r => {
        if (!r.wallet) {
            r.wallet = { 
                ...defaultWallet,
                withdrawableBalance: (r as any).walletBalance || 0
            };
        }
        return r;
    });
};
export const saveRestaurants = (rests: Restaurant[]) => localStorage.setItem(KEYS.RESTAURANTS, JSON.stringify(rests));

export const getOrders = (): Order[] => JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
export const saveOrders = (orders: Order[]) => localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));

export const getConfig = (): PricingConfig => {
    const stored = localStorage.getItem(KEYS.CONFIG);
    if (stored) return JSON.parse(stored);
    return {
        delivery_fee: { amount: 25, type: 'FIXED', display_text: null },
        platform_fee: { amount: 5, type: 'FIXED', display_text: null },
        commissionPct: 10,
        riderBasePay: 20,
        riderPerKm: 6
    };
};

export const saveConfig = (config: PricingConfig) => localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
