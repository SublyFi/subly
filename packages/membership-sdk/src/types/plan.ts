import type { PublicKey } from "@solana/web3.js";

/**
 * On-chain Plan structure
 */
export type PlanAccount = {
  /** Plan ID (same as PDA public key) */
  planId: PublicKey;
  /** Business that owns this plan */
  business: PublicKey;
  /** Encrypted plan name (32 bytes) */
  encryptedName: Uint8Array;
  /** Encrypted plan description (64 bytes) */
  encryptedDescription: Uint8Array;
  /** Price in USDC (6 decimals) */
  priceUsdc: bigint;
  /** Billing cycle in seconds */
  billingCycleSeconds: number;
  /** Unix timestamp when created */
  createdAt: bigint;
  /** Whether the plan is active */
  isActive: boolean;
  /** Encrypted subscription count */
  encryptedSubscriptionCount: Uint8Array;
  /** Encryption nonce */
  nonce: bigint;
  /** Sequential plan number for this business */
  planNonce: bigint;
  /** PDA bump seed */
  bump: number;
};

/**
 * Input for creating a new plan
 */
export type CreatePlanInput = {
  /** Plan name (will be encrypted) */
  name: string;
  /** Plan description (will be encrypted) */
  description: string;
  /** Price in USDC (human readable, e.g. 9.99) */
  priceUsdc: number;
  /** Billing cycle in days */
  billingCycleDays: number;
};

/**
 * Plan with decrypted metadata
 */
export type Plan = {
  /** Public key of the plan account PDA */
  publicKey: PublicKey;
  /** Business that owns this plan */
  business: PublicKey;
  /** Plan name (decrypted if authorized) */
  name?: string;
  /** Plan description (decrypted if authorized) */
  description?: string;
  /** Price in USDC (human readable) */
  priceUsdc: number;
  /** Billing cycle in days */
  billingCycleDays: number;
  /** Unix timestamp when created */
  createdAt: Date;
  /** Whether the plan is active */
  isActive: boolean;
  /** Subscription count (decrypted if authorized) */
  subscriptionCount?: number;
};

/**
 * Plan list filter options
 */
export type PlanFilter = {
  /** Filter by business */
  business?: PublicKey;
  /** Filter by active status */
  isActive?: boolean;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
};
