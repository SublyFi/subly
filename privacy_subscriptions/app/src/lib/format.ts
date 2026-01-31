import { LAMPORTS_PER_SOL, MAX_DISPLAY_DECIMALS } from "./constants";

/**
 * Convert lamports to SOL
 */
export const lamportsToSol = (lamports: number | bigint): number => {
  return Number(lamports) / LAMPORTS_PER_SOL;
};

/**
 * Convert SOL to lamports
 */
export const solToLamports = (sol: number): number => {
  return Math.floor(sol * LAMPORTS_PER_SOL);
};

/**
 * Format SOL amount for display
 */
export const formatSOL = (
  lamports: number | bigint,
  decimals: number = MAX_DISPLAY_DECIMALS
): string => {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(decimals);
};

/**
 * Format SOL amount with symbol
 */
export const formatSOLWithSymbol = (
  lamports: number | bigint,
  decimals: number = MAX_DISPLAY_DECIMALS
): string => {
  return `${formatSOL(lamports, decimals)} SOL`;
};

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
