import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Subscription plan data
 */
export interface SubscriptionPlan {
  /** Plan account public key */
  publicKey: PublicKey;
  /** Merchant wallet public key */
  merchant: PublicKey;
  /** Plan unique identifier (u64) */
  planId: BN;
  /** Plan display name */
  name: string;
  /** Token mint for payment */
  mint: PublicKey;
  /** Subscription price per billing cycle (in token smallest unit) */
  price: BN;
  /** Billing cycle duration in days */
  billingCycleDays: number;
  /** Whether the plan is active and accepting new subscriptions */
  isActive: boolean;
}
