import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Subscription status enum
 */
export enum SubscriptionStatus {
  /** User has never subscribed to this plan */
  NotSubscribed = 'not_subscribed',
  /** Subscription is active and valid */
  Active = 'active',
  /** User has cancelled but subscription may still be valid until period ends */
  Cancelled = 'cancelled',
  /** Subscription has expired */
  Expired = 'expired',
}

/**
 * User subscription data
 */
export interface UserSubscription {
  /** Subscription account public key */
  publicKey: PublicKey;
  /** User wallet public key */
  user: PublicKey;
  /** Subscription index for this user */
  subscriptionIndex: BN;
  /** X25519 encryption public key */
  encryptionPubkey: Uint8Array;
  /** Encrypted plan public key (two ciphertexts) */
  encryptedPlan: [Uint8Array, Uint8Array];
  /** Encrypted status */
  encryptedStatus: Uint8Array;
  /** Encrypted next payment date */
  encryptedNextPaymentDate: Uint8Array;
  /** Encrypted start date */
  encryptedStartDate: Uint8Array;
  /** Encryption nonce */
  nonce: BN;
}
