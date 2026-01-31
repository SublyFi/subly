import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
/**
 * Subscription status enum
 */
export declare enum SubscriptionStatus {
    /** User has never subscribed to this plan */
    NotSubscribed = "not_subscribed",
    /** Subscription is active and valid */
    Active = "active",
    /** User has cancelled but subscription may still be valid until period ends */
    Cancelled = "cancelled",
    /** Subscription has expired */
    Expired = "expired"
}
/**
 * User subscription data
 */
export interface UserSubscription {
    /** Subscription account public key */
    publicKey: PublicKey;
    /** User wallet public key */
    user: PublicKey;
    /** Subscription plan public key */
    plan: PublicKey;
    /** Merchant wallet public key */
    merchant: PublicKey;
    /** Subscription index for this user */
    subscriptionIndex: BN;
    /** Next billing date (Unix timestamp) - encrypted in on-chain account */
    nextBillingDate?: BN;
    /** Whether the subscription is cancelled */
    isCancelled: boolean;
    /** Account creation timestamp */
    createdAt: BN;
}
//# sourceMappingURL=subscription.d.ts.map