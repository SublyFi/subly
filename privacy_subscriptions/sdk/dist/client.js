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
 * const status = await sdk.checkSubscription(wallet, planId);
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
        this.arciumContext = null;
        this.arciumContextOwner = null;
        this.validateConfig(config);
        this.connection = new web3_js_1.Connection(config.rpcEndpoint, {
            commitment: config.commitment || 'confirmed',
        });
        this.merchantWallet = this.toPublicKey(config.merchantWallet);
        this.programId = config.programId
            ? this.toPublicKey(config.programId)
            : pda_1.PROGRAM_ID;
        this.commitment = config.commitment || 'confirmed';
        this.clusterOffset = config.arciumClusterOffset ?? 0;
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
     * Get or initialize Arcium encryption context for a wallet
     */
    async getArciumContext(wallet) {
        const owner = wallet.publicKey.toBase58();
        if (this.arciumContext && this.arciumContextOwner === owner) {
            return this.arciumContext;
        }
        if (!wallet.signMessage) {
            throw new errors_1.SublyError('Wallet does not support signMessage', errors_1.SublyErrorCode.WalletNotSupported);
        }
        const message = new TextEncoder().encode(arcium_1.ENCRYPTION_SIGNING_MESSAGE);
        const signature = await wallet.signMessage(message);
        const context = await (0, arcium_1.createArciumContextFromSignature)(this.connection, signature, this.programId);
        this.arciumContext = context;
        this.arciumContextOwner = owner;
        return context;
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
     * Check a user's subscription status (decrypts the user's subscription data).
     *
     * @param wallet - User's wallet (requires signMessage)
     * @param planPDA - Plan account public key
     * @returns Subscription status
     */
    async checkSubscription(wallet, planPDA) {
        try {
            const planPubkey = this.toPublicKey(planPDA);
            const plan = await this.getPlan(planPubkey);
            if (!plan) {
                throw new errors_1.SublyError('Plan not found', errors_1.SublyErrorCode.PlanNotFound);
            }
            const user = wallet.publicKey;
            const ledger = await (0, fetch_1.fetchUserLedger)(this.connection, user, plan.mint, this.programId);
            if (!ledger) {
                return subscription_1.SubscriptionStatus.NotSubscribed;
            }
            const context = await this.getArciumContext(wallet);
            const ledgerNonce = (0, arcium_1.nonceToBytes)(ledger.nonce);
            const subscriptionCount = (0, arcium_1.decryptValue)(context.cipher, ledger.encryptedSubscriptionCount, ledgerNonce);
            const maxIndex = Number(subscriptionCount);
            if (!Number.isFinite(maxIndex) || maxIndex < 0) {
                throw new errors_1.SublyError('Invalid subscription count', errors_1.SublyErrorCode.ArciumError);
            }
            const limit = Math.min(maxIndex, 1000);
            for (let i = 0; i < limit; i++) {
                const subscription = await (0, fetch_1.fetchUserSubscriptionByUserAndIndex)(this.connection, user, i, this.programId);
                if (!subscription) {
                    continue;
                }
                const subNonce = (0, arcium_1.nonceToBytes)(subscription.nonce);
                const [planPart1, planPart2, statusVal] = (0, arcium_1.decryptValues)(context.cipher, [
                    subscription.encryptedPlan[0],
                    subscription.encryptedPlan[1],
                    subscription.encryptedStatus,
                ], subNonce);
                const subscriptionPlan = (0, arcium_1.u128sToPubkey)([planPart1, planPart2]);
                if (!subscriptionPlan.equals(planPubkey)) {
                    continue;
                }
                const statusNum = Number(statusVal);
                if (statusNum === 0) {
                    return subscription_1.SubscriptionStatus.Active;
                }
                if (statusNum === 1) {
                    return subscription_1.SubscriptionStatus.Cancelled;
                }
                if (statusNum === 2) {
                    return subscription_1.SubscriptionStatus.Expired;
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
            const computationOffset = await (0, arcium_1.getNextComputationOffset)();
            // Get user's next subscription index
            const subscriptionIndex = await this.getNextSubscriptionIndex(wallet, plan.mint);
            // Check if user already has this subscription
            const currentStatus = await this.checkSubscription(wallet, planPDA);
            if (currentStatus === subscription_1.SubscriptionStatus.Active) {
                throw new errors_1.SublyError('User is already subscribed to this plan', errors_1.SublyErrorCode.AlreadySubscribed);
            }
            // Encrypt plan metadata for MPC
            const context = await this.getArciumContext(wallet);
            const planParts = (0, arcium_1.pubkeyToU128s)(plan.publicKey);
            const planNonce = (0, arcium_1.generateNonce)();
            const [encryptedPlanPart1, encryptedPlanPart2] = (0, arcium_1.encryptValues)(context.cipher, [planParts[0], planParts[1]], planNonce);
            const priceNonce = (0, arcium_1.generateNonce)();
            const [encryptedPrice] = (0, arcium_1.encryptValues)(context.cipher, [BigInt(plan.price.toString())], priceNonce);
            const billingNonce = (0, arcium_1.generateNonce)();
            const [encryptedBillingCycle] = (0, arcium_1.encryptValues)(context.cipher, [BigInt(plan.billingCycleDays)], billingNonce);
            // Build subscribe instruction
            const instruction = await (0, subscribe_1.buildSubscribeInstruction)({
                user: wallet.publicKey,
                plan,
                subscriptionIndex,
                encryptedPlan: [encryptedPlanPart1, encryptedPlanPart2],
                encryptedPlanNonce: (0, arcium_1.bytesToU128)(planNonce),
                encryptedPrice,
                encryptedPriceNonce: (0, arcium_1.bytesToU128)(priceNonce),
                encryptedBillingCycle,
                encryptedBillingCycleNonce: (0, arcium_1.bytesToU128)(billingNonce),
                computationOffset,
                clusterOffset: this.clusterOffset,
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
                clusterOffset: this.clusterOffset,
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
     * (decrypts encrypted_subscription_count from the user's ledger)
     */
    async getNextSubscriptionIndex(wallet, mint) {
        const ledger = await (0, fetch_1.fetchUserLedger)(this.connection, wallet.publicKey, mint, this.programId);
        if (!ledger) {
            return new bn_js_1.default(0);
        }
        const context = await this.getArciumContext(wallet);
        const ledgerNonce = (0, arcium_1.nonceToBytes)(ledger.nonce);
        const subscriptionCount = (0, arcium_1.decryptValue)(context.cipher, ledger.encryptedSubscriptionCount, ledgerNonce);
        const nextIndex = subscriptionCount;
        return new bn_js_1.default(nextIndex.toString());
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