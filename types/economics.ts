
export interface FinancialContext {
  distanceKm: number;
  orderValue: number;
  isPeakHour: boolean;
  isWeatherBad: boolean;
  isMember: boolean; // Zomato Gold / Pro
  restaurantStats: {
    monthlyVolume: number;
    rating: number;
    isSponsored: boolean;
  };
}

export interface FinancialBreakdown {
  orderId?: string;
  // Customer Facing
  customerDeliveryFee: number;
  
  // Internal Accounting
  deliveryCostInternal: number;
  subsidyAmount: number;
  subsidySource: 'NONE' | 'PLATFORM' | 'RESTAURANT' | 'MEMBERSHIP';
  
  // Platform Revenue
  commissionPct: number;
  commissionValue: number;
  platformFee: number;
  adRevenue: number;
  grossPlatformRevenue: number;
  
  // Payouts
  riderPayout: number;
  
  // Profitability
  netProfit: number;
  isProfitable: boolean;
  
  // For Logging
  auditLog: string;
}
