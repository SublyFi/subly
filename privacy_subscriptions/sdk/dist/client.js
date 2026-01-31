"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SublySDK = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const subscription_1 = require("./types/subscription");
const errors_1 = require("./errors");
const pda_1 = require("./accounts/pda");
const fetch_1 = require("./accounts/fetch");
const arcium_1 = require("./encryption/arcium");
const subscribe_1 = require("./instructions/subscribe");
const unsubscribe_1 = require("./instructions/unsubscribe");
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
class SublySDK {
    /**
     * Create a new SublySDK instance
     *
     * @param config - SDK configuration
     * @throws SublyError if configuration is invalid
     */
    constructor(config) {
        this.arciumClient = null;
        this.validateConfig(config);
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, {
            commitment: config.commitment || 'confirmed',
        });
        this.merchantWallet = this.toPublicKey(config.merchantWallet);
        this.programId = config.programId
            ? this.toPublicKey(config.programId)
            : pda_1.PROGRAM_ID;
        this.commitment = config.commitment || 'confirmed';
    }
    /**
     * Validate SDK configuration
     */
    validateConfig(config) {
        if (!config.rpcEndpoint) {
            throw new errors_1.SublyError('RPC endpoint is required', errors_1.SublyErrorCode.InvalidConfig);
        }
        if (!config.merchantWallet) {
            throw new errors_1.SublyError('Merchant wallet is required', errors_1.SublyErrorCode.InvalidConfig);
        }
        try {
            this.toPublicKey(config.merchantWallet);
        }
        catch {
            throw new errors_1.SublyError('Invalid merchant wallet public key', errors_1.SublyErrorCode.InvalidPublicKey);
        }
    }
    /**
     * Convert string or PublicKey to PublicKey
     */
    toPublicKey(value) {
        if (value instanceof web3_js_1.PublicKey) {
            return value;
        }
        return new web3_js_1.PublicKey(value);
    }
    /**
     * Get or initialize Arcium client
     */
    async getArciumClient() {
        if (!this.arciumClient) {
            this.arciumClient = await (0, arcium_1.initArciumClient)(this.programId);
        }
        return this.arciumClient;
    }
    /**
     * Get all subscription plans for this merchant
     *
     * @param activeOnly - If true, only return active plans (default: false)
     * @returns Array of subscription plans
     */
    async getPlans(activeOnly = false) {
        try {
            return await (0, fetch_1.fetchAllPlansForMerchant)(this.connection, this.merchantWallet, this.programId, activeOnly);
        }
        catch (error) {
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.NetworkError);
        }
    }
    /**
     * Get a single subscription plan by its public key
     *
     * @param planPDA - Plan account public key
     * @returns Subscription plan or null if not found
     */
    async getPlan(planPDA) {
        try {
            const pubkey = this.toPublicKey(planPDA);
            return await (0, fetch_1.fetchSubscriptionPlan)(this.connection, pubkey);
        }
        catch (error) {
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.NetworkError);
        }
    }
    /**
     * Get a subscription plan by plan ID
     *
     * @param planId - Plan ID (u64)
     * @returns Subscription plan or null if not found
     */
    async getPlanById(planId) {
        try {
            const plans = await this.getPlans();
            const planIdBN = bn_js_1.default.isBN(planId) ? planId : new bn_js_1.default(planId);
            return plans.find(p => p.planId.eq(planIdBN)) || null;
        }
        catch (error) {
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.NetworkError);
        }
    }
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
    async checkSubscription(userWallet, planPDA) {
        try {
            const user = this.toPublicKey(userWallet);
            const plan = this.toPublicKey(planPDA);
            // Get all user subscriptions and find one matching this plan
            // In production, this would use the verify_subscription instruction
            // which decrypts the status via Arcium MPC
            // For now, scan through possible subscription indices
            for (let i = 0; i < 100; i++) {
                const subscription = await (0, fetch_1.fetchUserSubscriptionByUserAndIndex)(this.connection, user, i, this.programId);
                if (!subscription) {
                    // No more subscriptions for this user
                    break;
                }
                if (subscription.plan.equals(plan)) {
                    // Found a subscription for this plan
                    // Note: In production, status would be decrypted via Arcium
                    // For now, assume active if account exists
                    return subscription.isCancelled
                        ? subscription_1.SubscriptionStatus.Cancelled
                        : subscription_1.SubscriptionStatus.Active;
                }
            }
            return subscription_1.SubscriptionStatus.NotSubscribed;
        }
        catch (error) {
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.NetworkError);
        }
    }
    /**
     * Subscribe a user to a plan
     *
     * @param planPDA - Plan account public key
     * @param wallet - User's wallet for signing
     * @param options - Transaction options
     * @returns Transaction signature
     */
    async subscribe(planPDA, wallet, options = {}) {
        try {
            const plan = await this.getPlan(planPDA);
            if (!plan) {
                throw new errors_1.SublyError('Plan not found', errors_1.SublyErrorCode.PlanNotFound);
            }
            if (!plan.isActive) {
                throw new errors_1.SublyError('Plan is not active', errors_1.SublyErrorCode.PlanNotActive);
            }
            const arciumClient = await this.getArciumClient();
            const computationOffset = await (0, arcium_1.getNextComputationOffset)();
            // Get user's next subscription index
            const subscriptionIndex = await this.getNextSubscriptionIndex(wallet.publicKey);
            // Check if user already has this subscription
            const currentStatus = await this.checkSubscription(wallet.publicKey, planPDA);
            if (currentStatus === subscription_1.SubscriptionStatus.Active) {
                throw new errors_1.SublyError('User is already subscribed to this plan', errors_1.SublyErrorCode.AlreadySubscribed);
            }
            // Build subscribe instruction
            const instruction = await (0, subscribe_1.buildSubscribeInstruction)({
                user: wallet.publicKey,
                plan,
                subscriptionIndex,
                computationOffset,
                arciumClient,
                programId: this.programId,
            });
            // Create and send transaction
            const transaction = new web3_js_1.Transaction().add(instruction);
            transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = wallet.publicKey;
            const signedTx = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: options.skipPreflight,
            });
            await this.connection.confirmTransaction(signature, options.commitment || this.commitment);
            return signature;
        }
        catch (error) {
            if (error instanceof errors_1.SublyError) {
                throw error;
            }
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.TransactionFailed);
        }
    }
    /**
     * Unsubscribe a user from a plan
     *
     * @param subscriptionIndex - User's subscription index
     * @param wallet - User's wallet for signing
     * @param options - Transaction options
     * @returns Transaction signature
     */
    async unsubscribe(subscriptionIndex, wallet, options = {}) {
        try {
            const arciumClient = await this.getArciumClient();
            const computationOffset = await (0, arcium_1.getNextComputationOffset)();
            // Verify subscription exists
            const subscription = await (0, fetch_1.fetchUserSubscriptionByUserAndIndex)(this.connection, wallet.publicKey, subscriptionIndex, this.programId);
            if (!subscription) {
                throw new errors_1.SublyError('Subscription not found', errors_1.SublyErrorCode.SubscriptionNotFound);
            }
            // Build unsubscribe instruction
            const instruction = await (0, unsubscribe_1.buildUnsubscribeInstruction)({
                user: wallet.publicKey,
                subscriptionIndex,
                computationOffset,
                arciumClient,
                programId: this.programId,
            });
            // Create and send transaction
            const transaction = new web3_js_1.Transaction().add(instruction);
            transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = wallet.publicKey;
            const signedTx = await wallet.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: options.skipPreflight,
            });
            await this.connection.confirmTransaction(signature, options.commitment || this.commitment);
            return signature;
        }
        catch (error) {
            if (error instanceof errors_1.SublyError) {
                throw error;
            }
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.TransactionFailed);
        }
    }
    /**
     * Get the next subscription index for a user
     * (scans existing subscriptions to find the next available index)
     */
    async getNextSubscriptionIndex(user) {
        let index = 0;
        while (true) {
            const subscription = await (0, fetch_1.fetchUserSubscriptionByUserAndIndex)(this.connection, user, index, this.programId);
            if (!subscription) {
                return new bn_js_1.default(index);
            }
            index++;
            if (index > 1000) {
                // Safety limit
                throw new errors_1.SublyError('Too many subscriptions', errors_1.SublyErrorCode.TransactionFailed);
            }
        }
    }
    /**
     * Get user's encrypted ledger data
     *
     * @param userWallet - User's wallet public key
     * @param mint - Token mint for the ledger
     * @returns User ledger data or null if not found
     */
    async getUserLedger(userWallet, mint) {
        try {
            const user = this.toPublicKey(userWallet);
            const mintPubkey = this.toPublicKey(mint);
            return await (0, fetch_1.fetchUserLedger)(this.connection, user, mintPubkey, this.programId);
        }
        catch (error) {
            throw errors_1.SublyError.fromError(error, errors_1.SublyErrorCode.NetworkError);
        }
    }
    /**
     * Get the merchant's public key
     */
    get merchant() {
        return this.merchantWallet;
    }
    /**
     * Get the program ID
     */
    get program() {
        return this.programId;
    }
    /**
     * Get the Connection instance
     */
    getConnection() {
        return this.connection;
    }
}
exports.SublySDK = SublySDK;
//# sourceMappingURL=client.js.map