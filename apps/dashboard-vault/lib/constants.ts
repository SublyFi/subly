/**
 * UI Constants for Vault Dashboard
 */

// USDC Configuration
export const USDC_DECIMALS = 6;
export const USDC_SYMBOL = "USDC";

// Balance refresh interval (30 seconds)
export const BALANCE_REFRESH_INTERVAL = 30_000;

// Yield refresh interval (60 seconds)
export const YIELD_REFRESH_INTERVAL = 60_000;

// Transfer intervals (in seconds)
export const TRANSFER_INTERVALS = {
  HOURLY: 3600,
  DAILY: 86400,
  WEEKLY: 604800,
  MONTHLY: 2592000,
} as const;

export type TransferInterval = keyof typeof TRANSFER_INTERVALS;

// Interval display names
export const INTERVAL_LABELS: Record<TransferInterval, string> = {
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

// Format helpers
export function formatUsdc(baseUnits: bigint | number): string {
  const amount = typeof baseUnits === "bigint" ? baseUnits : BigInt(baseUnits);
  const whole = amount / BigInt(10 ** USDC_DECIMALS);
  const decimal = amount % BigInt(10 ** USDC_DECIMALS);
  const decimalStr = decimal.toString().padStart(USDC_DECIMALS, "0").slice(0, 2);
  return `${whole.toLocaleString()}.${decimalStr}`;
}

export function parseUsdc(humanReadable: number): bigint {
  return BigInt(Math.floor(humanReadable * 10 ** USDC_DECIMALS));
}

// Truncate wallet address for display
export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
