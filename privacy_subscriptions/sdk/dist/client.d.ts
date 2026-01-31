import { Connection, PublicKey, Transaction, TransactionSignature, Commitment } from '@solana/web3.js';
import BN from 'bn.js';
import { SublyConfig } from './types/config';
import { SubscriptionPlan } from './types/plan';
import { SubscriptionStatus } from './types/subscription';
import { UserLedgerData } from './accounts/fetch';
/**
 * Wallet interface for signing transactions
 * Compatible with @solana/wallet-adapter-base
 */
export interface Wallet {
    publicKey: PublicKey;
    signTransaction<T extends Transaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]>;
}
/**
 * Options for subscribe/unsubscribe operations
 */
export interface TransactionOptions {
    /** Skip preflight simulation */
    skipPreflight?: boolean;
    /** Commitment level for confirmation */
    commitment?: Commitment;
}
/**
 * Subly SDK - Privacy-preserving subscription management
 *
 * @example
 * ```typescript
 * const sdk = new SublySDK({
 *   rpcEndpoint: 'https://api.devnet.solana.com',
 *   merchantWallet: 'YOUR_MERCHANT_WALLET',
 * });
 *
 * // Get available plans
 * const plans = await sdk.getPlans(true); // active only
 *
 * // Check user subscription status
 * const status = await sdk.checkSubscription(userWallet, planId);
 *
 * // Subscribe a user
 * const signature = await sdk.subscribe(planId, wallet);
 * ```
 */
export declare class SublySDK {
    private connection;
    private merchantWallet;
    private programId;
    private arciumClient;
    private commitment;
    /**
     * Create a new SublySDK instance
     *
     * @param config - SDK configuration
     * @throws SublyError if configuration is invalid
     */
    constructor(config: SublyConfig);
    /**
     * Validate SDK configuration
     */
    private validateConfig;
    /**
     * Convert string or PublicKey to PublicKey
     */
    private toPublicKey;
    /**
     * Get or initialize Arcium client
     */
    private getArciumClient;
    /**
     * Get all subscription plans for this merchant
     *
     * @param activeOnly - If true, only return active plans (default: false)
     * @returns Array of subscription plans
     */
    getPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>;
    /**
     * Get a single subscription plan by its public key
     *
     * @param planPDA - Plan account public key
     * @returns Subscription plan or null if not found
     */
    getPlan(planPDA: PublicKey | string): Promise<SubscriptionPlan | null>;
    /**
     * Get a subscription plan by plan ID
     *
     * @param planId - Plan ID (u64)
     * @returns Subscription plan or null if not found
     */
    getPlanById(planId: BN | number): Promise<SubscriptionPlan | null>;
    /**
     * Check a user's subscription status
     *
     * Note: This is a simplified implementation. In production, this would:
     * 1. Send a verify_subscription transaction
     * 2. Wait for the Arcium MPC callback
     * 3. Parse the SubscriptionVerified event
     *
     * For now, we check if the UserSubscription account exists and is not cancelled
     *
     * @param userWallet - User's wallet public key
     * @param planPDA - Plan account public key
     * @returns Subscription status
     */
    checkSubscription(userWallet: PublicKey | string, planPDA: PublicKey | string): Promise<SubscriptionStatus>;
    /**
     * Subscribe a user to a plan
     *
     * @param planPDA - Plan account public key
     * @param wallet - User's wallet for signing
     * @param options - Transaction options
     * @returns Transaction signature
     */
    subscribe(planPDA: PublicKey | string, wallet: Wallet, options?: TransactionOptions): Promise<TransactionSignature>;
    /**
     * Unsubscribe a user from a plan
     *
     * @param subscriptionIndex - User's subscription index
     * @param wallet - User's wallet for signing
     * @param options - Transaction options
     * @returns Transaction signature
     */
    unsubscribe(subscriptionIndex: BN | number, wallet: Wallet, options?: TransactionOptions): Promise<TransactionSignature>;
    /**
     * Get the next subscription index for a user
     * (scans existing subscriptions to find the next available index)
     */
    private getNextSubscriptionIndex;
    /**
     * Get user's encrypted ledger data
     *
     * @param userWallet - User's wallet public key
     * @param mint - Token mint for the ledger
     * @returns User ledger data or null if not found
     */
    getUserLedger(userWallet: PublicKey | string, mint: PublicKey | string): Promise<UserLedgerData | null>;
    /**
     * Get the merchant's public key
     */
    get merchant(): PublicKey;
    /**
     * Get the program ID
     */
    get program(): PublicKey;
    /**
     * Get the Connection instance
     */
    getConnection(): Connection;
}
//# sourceMappingURL=client.d.ts.map