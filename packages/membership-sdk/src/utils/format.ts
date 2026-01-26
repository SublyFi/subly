import { CONSTANTS } from "../types/common";

/**
 * Convert USDC amount from human readable to on-chain format
 * @param amount - Human readable amount (e.g. 9.99)
 * @returns On-chain amount with 6 decimals
 */
export function usdcToOnChain(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** CONSTANTS.USDC_DECIMALS));
}

/**
 * Convert USDC amount from on-chain to human readable format
 * @param amount - On-chain amount with 6 decimals
 * @returns Human readable amount
 */
export function usdcFromOnChain(amount: bigint | number): number {
  return Number(amount) / 10 ** CONSTANTS.USDC_DECIMALS;
}

/**
 * Convert days to seconds
 * @param days - Number of days
 * @returns Number of seconds
 */
export function daysToSeconds(days: number): number {
  return Math.round(days * 24 * 60 * 60);
}

/**
 * Convert seconds to days
 * @param seconds - Number of seconds
 * @returns Number of days
 */
export function secondsToDays(seconds: number): number {
  return seconds / (24 * 60 * 60);
}

/**
 * Format USDC amount for display
 * @param amount - Amount in on-chain format
 * @returns Formatted string (e.g. "$9.99")
 */
export function formatUsdc(amount: bigint | number): string {
  const value = usdcFromOnChain(amount);
  return `$${value.toFixed(2)}`;
}

/**
 * Format billing cycle for display
 * @param seconds - Billing cycle in seconds
 * @returns Human readable string (e.g. "30 days", "1 year")
 */
export function formatBillingCycle(seconds: number): string {
  const days = secondsToDays(seconds);

  if (days >= 365) {
    const years = Math.round(days / 365);
    return years === 1 ? "1 year" : `${years} years`;
  } else if (days >= 30) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  } else if (days >= 7) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  } else {
    return days === 1 ? "1 day" : `${Math.round(days)} days`;
  }
}

/**
 * Convert Unix timestamp to Date
 * @param timestamp - Unix timestamp (seconds)
 * @returns Date object
 */
export function timestampToDate(timestamp: bigint | number): Date {
  return new Date(Number(timestamp) * 1000);
}

/**
 * Convert Date to Unix timestamp
 * @param date - Date object
 * @returns Unix timestamp (seconds)
 */
export function dateToTimestamp(date: Date): bigint {
  return BigInt(Math.floor(date.getTime() / 1000));
}
