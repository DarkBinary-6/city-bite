
import { Restaurant, User, Transaction } from './types';

export const RESTAURANTS: Restaurant[] = [];

// Added missing required properties status and role
export const MOCK_USER: User = {
  name: "Arjun Foodie",
  email: "arjun@citybite.com",
  status: 'ACTIVE',
  role: 'CUSTOMER',
  savedAddresses: [
    { id: 'a1', label: 'Home', details: '102, Green Apartments, Near Chowk, Bikapur, UP - 224204', line1: '102, Green Apartments', line2: 'Near Chowk', city: 'Bikapur', state: 'Uttar Pradesh', zip: '224204' },
  ]
};

// Initial empty history
export const MOCK_TRANSACTIONS: Transaction[] = [];
