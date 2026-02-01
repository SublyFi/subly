import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Extended subscription plan with UI-friendly properties
 */
export interface DisplayPlan {
  publicKey: PublicKey;
  planId: BN;
  name: string;
  price: BN;
  billingCycleDays: number;
  isActive: boolean;
  // UI helpers
  priceDisplay: string;
  cycleDisplay: string;
}

/**
 * User's subscription state
 */
export interface SubscriptionState {
  isSubscribed: boolean;
  subscribedPlan: DisplayPlan | null;
  subscriptionIndex: number | null;
}

/**
 * App loading states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Format USDC units to display string (USDC has 6 decimals)
 */
export function formatLamportsToSol(lamports: BN): string {
  const usdc = lamports.toNumber() / 1_000_000;
  return usdc.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Format billing cycle days to display string
 */
export function formatBillingCycle(days: number): string {
  if (days === 1) return 'daily';
  if (days === 7) return 'weekly';
  if (days === 30 || days === 31) return 'monthly';
  if (days === 365 || days === 366) return 'yearly';
  return `${days} days`;
}
