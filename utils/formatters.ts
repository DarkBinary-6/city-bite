
import { PricingComponent } from '../types';

/**
 * Universal Pricing Text Formatter
 * Used to ensure consistency across the entire application.
 */
export function formatPricingText(fee: PricingComponent | undefined, label: string): string {
  if (!fee) return "";
  if (fee.display_text) return fee.display_text;
  if (fee.type === "FREE" || fee.amount === 0) return `${label}: Free`;
  if (fee.type === "DISABLED") return `${label}: Not applicable`;
  return `${label}: ₹${fee.amount}`;
}

/**
 * Formats a raw value based on component type, without the label prefix.
 */
export function formatPricingValue(fee: PricingComponent | undefined): string {
    if (!fee) return "₹0";
    if (fee.display_text) return fee.display_text;
    if (fee.type === "FREE" || fee.amount === 0) return "FREE";
    return `₹${fee.amount}`;
}
