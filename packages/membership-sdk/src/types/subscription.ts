import type { PublicKey } from "@solana/web3.js";

/**
 * On-chain Subscription structure
 */
export type SubscriptionAccount = {
  /** Subscription ID (same as PDA public key) */
  subscriptionId: PublicKey;
  /** Plan this subscription belongs to */
  plan: PublicKey;
  /** Encrypted user commitment */
  encryptedUserCommitment: Uint8Array;
  /** Membership commitment hash */
  membershipCommitment: Uint8Array;
  /** Unix timestamp when subscribed */
  subscribedAt: bigint;
  /** Unix timestamp when cancelled (0 if active) */
  cancelledAt: bigint;
  /** Whether the subscription is active */
  isActive: boolean;
  /** Encryption nonce */
  nonce: bigint;
  /** PDA bump seed */
  bump: number;
};

/**
 * Input for subscribing to a plan
 */
export type SubscribeInput = {
  /** Plan to subscribe to */
  plan: PublicKey;
  /** User's secret for commitment generation */
  userSecret: Uint8Array;
};

/**
 * Subscription with additional metadata
 */
export type Subscription = {
  /** Public key of the subscription account PDA */
  publicKey: PublicKey;
  /** Plan this subscription belongs to */
  plan: PublicKey;
  /** Membership commitment (for verification) */
  membershipCommitment: Uint8Array;
  /** Unix timestamp when subscribed */
  subscribedAt: Date;
  /** Unix timestamp when cancelled (null if active) */
  cancelledAt: Date | null;
  /** Whether the subscription is active */
  isActive: boolean;
};

/**
 * Subscription list filter options
 */
export type SubscriptionFilter = {
  /** Filter by plan */
  plan?: PublicKey;
  /** Filter by active status */
  isActive?: boolean;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
};

/**
 * Membership proof for verification
 */
export type MembershipProof = {
  /** The subscription public key */
  subscription: PublicKey;
  /** The plan public key */
  plan: PublicKey;
  /** Membership commitment */
  commitment: Uint8Array;
  /** User's secret (never shared on-chain) */
  secret: Uint8Array;
};
