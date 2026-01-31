import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { SubscriptionPlan } from '../types/plan';
import { UserSubscription } from '../types/subscription';
/**
 * User ledger data returned from fetch
 */
export interface UserLedgerData {
    publicKey: PublicKey;
    user: PublicKey;
    mint: PublicKey;
    encryptedBalance: Uint8Array[];
    nonce: BN;
    lastUpdated: BN;
}
/**
 * Fetch a single subscription plan by its PDA
 */
export declare function fetchSubscriptionPlan(connection: Connection, planPDA: PublicKey): Promise<SubscriptionPlan | null>;
/**
 * Fetch a subscription plan by merchant and plan ID
 */
export declare function fetchSubscriptionPlanByMerchantAndId(connection: Connection, merchantWallet: PublicKey, planId: BN | number, programId?: PublicKey): Promise<SubscriptionPlan | null>;
/**
 * Fetch all subscription plans for a merchant
 */
export declare function fetchAllPlansForMerchant(connection: Connection, merchantWallet: PublicKey, programId?: PublicKey, activeOnly?: boolean): Promise<SubscriptionPlan[]>;
/**
 * Fetch a user subscription by PDA
 */
export declare function fetchUserSubscription(connection: Connection, userSubscriptionPDA: PublicKey): Promise<UserSubscription | null>;
/**
 * Fetch a user subscription by user and index
 */
export declare function fetchUserSubscriptionByUserAndIndex(connection: Connection, user: PublicKey, subscriptionIndex: BN | number, programId?: PublicKey): Promise<UserSubscription | null>;
/**
 * Fetch user ledger
 */
export declare function fetchUserLedger(connection: Connection, user: PublicKey, mint: PublicKey, programId?: PublicKey): Promise<UserLedgerData | null>;
//# sourceMappingURL=fetch.d.ts.map