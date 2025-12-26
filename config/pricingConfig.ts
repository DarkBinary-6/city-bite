
export const PRICING_CONFIG = {
  // --- 1. Customer Delivery Fee Config ---
  DELIVERY_FEE: {
    BASE_FEE: 25,                 // INR
    FREE_DISTANCE_THRESHOLD: 3,   // KM
    PER_KM_RATE: 5,               // INR per KM after threshold
    MAX_FEE_CAP: 100,             // INR
    WEATHER_SURGE_MULTIPLIER: 1.5,// 1.5x fee during rain
    PEAK_HOUR_MULTIPLIER: 1.2,    // 1.2x fee during peak
  },

  // --- 2. Platform Revenue & Commission ---
  REVENUE: {
    PLATFORM_FEE_FIXED: 5,        // Fixed fee per order (INR)
    DEFAULT_COMMISSION_PCT: 15,   // 15%
    MIN_COMMISSION_PCT: 10,       // Floor value
    MAX_COMMISSION_CAP_PCT: 20,   // Ceiling
    AD_TIER_REVENUE: 5,           // Extra revenue if sponsored
    MEMBERSHIP_ALLOCATION: 15,    // How much of monthly sub is allocated per order subsidy
  },

  // --- 3. Restaurant Logic ---
  RESTAURANT_RULES: {
    VOLUME_DISCOUNT_THRESHOLD: 500, // Orders/month
    VOLUME_DISCOUNT_PCT: 2,         // Reduce commission by 2%
    RATING_DISCOUNT_THRESHOLD: 4.5, // Stars
    RATING_DISCOUNT_PCT: 1,         // Reduce commission by 1%
  },

  // --- 4. Rider Payout (Independent of Customer Fee) ---
  RIDER_PAYOUT: {
    BASE_PAY: 20,                 // INR just for picking up
    DISTANCE_PAY_PER_KM: 6,       // INR per KM (Total distance)
    PEAK_BONUS: 10,               // Flat bonus during peak
    WEATHER_BONUS: 15,            // Flat bonus during rain
    WEEKLY_INCENTIVE_TARGET: 50,  // Orders
    WEEKLY_INCENTIVE_AMOUNT: 500, // INR
  },

  // --- 5. Guardrails ---
  PROFITABILITY: {
    MIN_NET_PROFIT_THRESHOLD: 5,  // We must make at least ₹5 per order
    ALLOW_LOSS_LEADER: false,     // If false, reject orders that lose money
  }
};
