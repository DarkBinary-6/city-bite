
import { PRICING_CONFIG } from '../config/pricingConfig'; // Fallback constants
import { FinancialContext, FinancialBreakdown } from '../types/economics';
import { getConfig } from '../utils/storage';
import { PricingConfig } from '../types';

export class EconomicsEngine {

  /**
   * Calculates the delivery fee based on current Admin Config.
   */
  private static calculateCustomerFee(context: FinancialContext, dynamicConfig: PricingConfig): number {
    const { WEATHER_SURGE_MULTIPLIER, PEAK_HOUR_MULTIPLIER, MAX_FEE_CAP } = PRICING_CONFIG.DELIVERY_FEE;
    const { delivery_fee, riderPerKm } = dynamicConfig;

    // Use admin defined base fee
    let fee = delivery_fee.amount;

    // Distance Logic: beyond 1km, charge per km
    if (context.distanceKm > 1) {
      const extraKm = context.distanceKm - 1;
      fee += extraKm * riderPerKm; 
    }

    // Surge Logic
    if (context.isWeatherBad) fee *= WEATHER_SURGE_MULTIPLIER;
    if (context.isPeakHour) fee *= PEAK_HOUR_MULTIPLIER;

    // Membership Logic
    if (context.isMember) return 0;

    return Math.min(Math.round(fee), MAX_FEE_CAP);
  }

  /**
   * Platform Revenue Logic based on dynamic commission and platform fees.
   */
  private static calculatePlatformRevenue(context: FinancialContext, dynamicConfig: PricingConfig): { commissionPct: number, totalRevenue: number, breakdown: any } {
    const { AD_TIER_REVENUE } = PRICING_CONFIG.REVENUE;
    const { platform_fee, commissionPct } = dynamicConfig;
    
    const commissionValue = (context.orderValue * commissionPct) / 100;
    const adRevenue = context.restaurantStats.isSponsored ? AD_TIER_REVENUE : 0;
    const totalRevenue = commissionValue + platform_fee.amount + adRevenue;

    return {
      commissionPct,
      totalRevenue,
      breakdown: {
        commissionValue,
        platformFee: platform_fee.amount,
        adRevenue
      }
    };
  }

  /**
   * Calculates driver payout based on dynamic base pay and per-km rates.
   */
  private static calculateRiderPayout(context: FinancialContext, dynamicConfig: PricingConfig): number {
    const { PEAK_BONUS, WEATHER_BONUS } = PRICING_CONFIG.RIDER_PAYOUT;
    const { riderBasePay, riderPerKm } = dynamicConfig;

    let payout = riderBasePay;
    payout += context.distanceKm * riderPerKm;

    if (context.isPeakHour) payout += PEAK_BONUS;
    if (context.isWeatherBad) payout += WEATHER_BONUS;

    return Math.round(payout);
  }

  public static calculateOrderFinancials(context: FinancialContext): FinancialBreakdown {
    // ALWAYS fetch latest from Storage to ensure immediate effect of Admin changes
    const dynamicConfig = getConfig(); 

    const customerFee = this.calculateCustomerFee(context, dynamicConfig);
    const revenueData = this.calculatePlatformRevenue(context, dynamicConfig);
    const riderPayout = this.calculateRiderPayout(context, dynamicConfig);

    const deliveryCostInternal = riderPayout;
    const netDeliveryEarnings = customerFee - riderPayout;
    
    let subsidyAmount = 0;
    let subsidySource: 'NONE' | 'PLATFORM' | 'RESTAURANT' | 'MEMBERSHIP' = 'NONE';

    if (netDeliveryEarnings < 0) {
        subsidyAmount = Math.abs(netDeliveryEarnings);
        subsidySource = context.isMember ? 'MEMBERSHIP' : 'PLATFORM';
    }

    const netProfit = (revenueData.totalRevenue + (context.isMember ? 15 : 0)) - subsidyAmount;
    const isProfitable = netProfit >= 5;

    return {
      customerDeliveryFee: customerFee,
      deliveryCostInternal,
      subsidyAmount,
      subsidySource,
      commissionPct: revenueData.commissionPct,
      commissionValue: revenueData.breakdown.commissionValue,
      platformFee: revenueData.breakdown.platformFee,
      adRevenue: revenueData.breakdown.adRevenue,
      grossPlatformRevenue: revenueData.totalRevenue,
      riderPayout,
      netProfit,
      isProfitable,
      auditLog: `[ECON] Fee:${customerFee} | Profit:${netProfit.toFixed(2)}`
    };
  }
}
