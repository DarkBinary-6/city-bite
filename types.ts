
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  isBestseller?: boolean;
  calories?: number;
  packingCharge?: number;
  isAvailable?: boolean; // Stock control
}

export interface BankDetails {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    panNumber?: string;
}

export interface VehicleInfo {
    type: 'bike' | 'scooter' | 'cycle' | 'electric';
    model: string;
    plateNumber: string;
    licenseNumber: string;
}

export interface InsuranceInfo {
    provider: string;
    policyNumber: string;
    validTill: string;
}

export interface RestaurantWallet {
    grossEarnings: number;        // lifetime (read only)
    pendingBalance: number;       // delivered but not settled
    withdrawableBalance: number;  // can withdraw
    lastSettlementAt: string;     // ISO timestamp
}

export type AccountStatus = 'SUBMITTED' | 'ACTIVE' | 'BLOCKED';

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;
  reviewCount?: number; 
  deliveryTime: string;
  priceRange: string;
  image: string;
  banner: string;
  address: string;
  phone?: string;
  coordinates: { lat: number; lng: number };
  menu: {
    category: string;
    isAvailable?: boolean; // Category control
    items: MenuItem[];
  }[];
  reviews: Review[];
  isPromoted?: boolean;
  promotedUntil?: number; 
  wallet: RestaurantWallet;
  bankDetails?: BankDetails;
  email?: string;
  password?: string;
  isOpen?: boolean; // Online/Offline toggle
  timings?: string; // e.g. "10:00 AM - 11:00 PM"
  status: AccountStatus;
  role: 'RESTAURANT';
  resetToken?: string;
  resetTokenExpires?: number;
}

export interface Review {
  id: string;
  user: string; 
  rating: number;
  text: string;
  date: string;
  type: 'restaurant' | 'driver'; 
  orderId?: string;
  reply?: string; // Restaurant reply
}

export interface CartItem extends MenuItem {
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  options?: string[];
}

export type OrderStatus = 
  | 'placed' 
  | 'accepted' 
  | 'preparing' 
  | 'ready_for_pickup' 
  | 'picked_up' // Added for clarity
  | 'rider_assigned' 
  | 'rider_at_restaurant' 
  | 'out_for_delivery' 
  | 'arrived_at_customer' // New state for completion flow
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface ChatMessage {
    sender: 'customer' | 'rider';
    text: string;
    timestamp: number;
}

/**
 * Telemetry data for real-time tracking and fraud analysis
 */
export interface TelemetryData {
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    timestamp: number;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  date: string;
  paymentMethod: 'UPI' | 'COD';
  restaurantName: string;
  restaurantId?: string; 
  restaurantAddress?: string;
  restaurantCoordinates?: { lat: number; lng: number }; 
  riderName?: string;
  riderId?: string; 
  etaMinutes?: number;
  liveEtaMinutes?: number; // Dynamic traffic-aware ETA
  liveDistanceKm?: number; // Dynamic distance to next point
  remainingDistance?: string; 
  deliveryProgress?: number; 
  chatMessages: ChatMessage[];
  
  // Prep metadata
  prepTimeMinutes?: number;
  prepStartedAt?: string;
  prepEta?: string;
  
  // Payment & Refund tracking
  paymentStatus?: 'PENDING' | 'PAID' | 'REFUND_INITIATED' | 'REFUND_FAILED';
  paymentId?: string;
  refundId?: string;
  refundReason?: string;
  
  // Feedback Tracking
  isRestaurantReviewed?: boolean;
  isDriverReviewed?: boolean;
  restaurantRating?: number;
  restaurantFeedback?: string;
  riderRating?: number;
  riderTip?: number;
  
  // Location & Instructions
  deliveryAddress?: string;
  deliveryCoordinates?: { lat: number; lng: number }; 
  driverCoordinates?: { lat: number; lng: number }; 
  lastLocationAt?: string; // Timestamp of last location update
  cookingInstructions?: string;
  deliveryInstructions?: string;

  // Financials
  deliveryFee: number; 
  platformFee: number; 
  riderPayout: number; 
  commissionAmount: number; 
  netRestaurantEarnings: number; 
  
  // Operations
  rejectionReason?: string;
  acceptedAt?: number;
  preparedAt?: number;

  // Fraud & Compliance tracking
  fraudFlags?: string[];
  needsReview?: boolean;

  // Pricing Snapshot for historical consistency
  pricingSnapshot?: PricingConfig;
}

export enum View {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  RESTAURANT = 'RESTAURANT',
  CART = 'CART',
  CHECKOUT = 'CHECKOUT',
  TRACKING = 'TRACKING',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  DELIVERY = 'DELIVERY',
  SUPER_ADMIN = 'SUPER_ADMIN',
  DOCS = 'DOCS',
  PARTNER_SIGNUP = 'PARTNER_SIGNUP'
}

export interface WalletTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    date: string;
    source: 'ORDER_PAYOUT' | 'TIP' | 'WITHDRAWAL' | 'COD_DEPOSIT';
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  savedAddresses: Address[];
  location?: { lat: number; lng: number }; 
  activeAddressId?: string;
  walletBalance?: number; 
  walletHistory?: WalletTransaction[]; 
  codBalance?: number; 
  totalDeliveries?: number; 
  rating?: number; 
  reviewCount?: number; 
  reviews?: Review[]; 
  penalties?: number;
  password?: string;
  status: AccountStatus;
  role: 'CUSTOMER' | 'DELIVERY';
  
  // Delivery Partner Specifics
  isOnline?: boolean;
  activeOrderId?: string;
  availabilityStatus?: 'IDLE' | 'ON_DELIVERY';
  bankDetails?: BankDetails;
  vehicleInfo?: VehicleInfo;
  insuranceInfo?: InsuranceInfo;
  payoutFrequency?: 'daily' | 'weekly' | 'monthly';
  nextPayoutDate?: string;
  lastSeenAt?: string; // Heartbeat

  // Trust & Safety scoring
  suspicionScore?: number;
  freezeCount?: number;
  accuracyAbuseCount?: number;
  lastTelemetry?: TelemetryData;

  resetToken?: string;
  resetTokenExpires?: number;
}

export interface Address {
  id: string;
  label: string;
  details: string; 
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  isManual?: boolean;
}

export interface WithdrawalRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterType: 'restaurant' | 'delivery';
  amount: number;
  upiId: string;
  status: 'pending' | 'paid';
  date: string;
  
  // Snapshot details for Admin
  bankDetails?: BankDetails;
  address?: string;
  phone?: string;
}

export interface Transaction {
    id: string;
    recipientName: string;
    recipientUpi: string;
    amount: number;
    date: string;
    type: 'payout';
    status: 'success';
}

export interface PricingComponent {
  amount: number;
  type: 'FREE' | 'FIXED' | 'DISABLED';
  display_text: string | null;
}

export interface PricingConfig {
    delivery_fee: PricingComponent;
    platform_fee: PricingComponent;
    commissionPct: number;
    riderBasePay: number;
    riderPerKm: number;
}
