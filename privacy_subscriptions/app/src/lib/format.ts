import { USDC_UNITS_PER_TOKEN, MAX_DISPLAY_DECIMALS } from "./constants";

/**
 * Convert smallest units to USDC (human-readable)
 */
export const unitsToUsdc = (units: number | bigint): number => {
  return Number(units) / USDC_UNITS_PER_TOKEN;
};

/**
 * Convert USDC (human-readable) to smallest units
 */
export const usdcToUnits = (usdc: number): number => {
  return Math.floor(usdc * USDC_UNITS_PER_TOKEN);
};

/**
 * Format USDC amount for display
 */
export const formatUSDC = (
  units: number | bigint,
  decimals: number = MAX_DISPLAY_DECIMALS
): string => {
  const usdc = unitsToUsdc(units);
  return usdc.toFixed(decimals);
};

/**
 * Format USDC amount with symbol
 */
export const formatUSDCWithSymbol = (
  units: number | bigint,
  decimals: number = MAX_DISPLAY_DECIMALS
): string => {
  return `${formatUSDC(units, decimals)} USDC`;
};

// Legacy aliases for backward compatibility
export const lamportsToSol = unitsToUsdc;
export const solToLamports = usdcToUnits;
export const formatSOL = formatUSDC;
export const formatSOLWithSymbol = formatUSDCWithSymbol;

/**
 * Shorten a Solana address for display
 */
export const shortenAddress = (
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Format date for display
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
