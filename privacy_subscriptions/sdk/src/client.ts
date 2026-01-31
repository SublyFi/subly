import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  Commitment,
} from '@solana/web3.js';
import BN from 'bn.js';

import { SublyConfig } from './types/config';
import { SubscriptionPlan } from './types/plan';
import { SubscriptionStatus } from './types/subscription';
import { SublyError, SublyErrorCode } from './errors';
import { PROGRAM_ID } from './accounts/pda';
import {
  fetchSubscriptionPlan,
  fetchAllPlansForMerchant,
  fetchUserSubscriptionByUserAndIndex,
  fetchUserLedger,
  UserLedgerData,
} from './accounts/fetch';
import {
  initArciumClient,
  getNextComputationOffset,
  ArciumClientWrapper,
} from './encryption/arcium';
import { buildSubscribeInstruction } from './instructions/subscribe';
import { buildUnsubscribeInstruction } from './instructions/unsubscribe';

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
export class SublySDK {
  private connection: Connection;
  private merchantWallet: PublicKey;
  private programId: PublicKey;
  private arciumClient: ArciumClientWrapper | null = null;
  private commitment: Commitment;

  /**
   * Create a new SublySDK instance
   *
   * @param config - SDK configuration
   * @throws SublyError if configuration is invalid
   */
  constructor(config: SublyConfig) {
    this.validateConfig(config);

    this.connection = new Connection(config.rpcEndpoint, {
      commitment: config.commitment || 'confirmed',
    });

    this.merchantWallet = this.toPublicKey(config.merchantWallet);
    this.programId = config.programId
      ? this.toPublicKey(config.programId)
      : PROGRAM_ID;
    this.commitment = config.commitment || 'confirmed';
  }

  /**
   * Validate SDK configuration
   */
  private validateConfig(config: SublyConfig): void {
    if (!config.rpcEndpoint) {
      throw new SublyError('RPC endpoint is required', SublyErrorCode.InvalidConfig);
    }

    if (!config.merchantWallet) {
      throw new SublyError('Merchant wallet is required', SublyErrorCode.InvalidConfig);
    }

    try {
      this.toPublicKey(config.merchantWallet);
    } catch {
      throw new SublyError(
        'Invalid merchant wallet public key',
        SublyErrorCode.InvalidPublicKey
      );
    }
  }

  /**
   * Convert string or PublicKey to PublicKey
   */
  private toPublicKey(value: string | PublicKey): PublicKey {
    if (value instanceof PublicKey) {
      return value;
    }
    return new PublicKey(value);
  }

  /**
   * Get or initialize Arcium client
   */
  private async getArciumClient(): Promise<ArciumClientWrapper> {
    if (!this.arciumClient) {
      this.arciumClient = await initArciumClient(this.programId);
    }
    return this.arciumClient;
  }

  /**
   * Get all subscription plans for this merchant
   *
   * @param activeOnly - If true, only return active plans (default: false)
   * @returns Array of subscription plans
   */
  async getPlans(activeOnly: boolean = false): Promise<SubscriptionPlan[]> {
    try {
      return await fetchAllPlansForMerchant(
        this.connection,
        this.merchantWallet,
        this.programId,
        activeOnly
      );
    } catch (error) {
      throw SublyError.fromError(error, SublyErrorCode.NetworkError);
    }
  }

  /**
   * Get a single subscription plan by its public key
   *
   * @param planPDA - Plan account public key
   * @returns Subscription plan or null if not found
   */
  async getPlan(planPDA: PublicKey | string): Promise<SubscriptionPlan | null> {
    try {
      const pubkey = this.toPublicKey(planPDA);
      return await fetchSubscriptionPlan(this.connection, pubkey);
    } catch (error) {
      throw SublyError.fromError(error, SublyErrorCode.NetworkError);
    }
  }

  /**
   * Get a subscription plan by plan ID
   *
   * @param planId - Plan ID (u64)
   * @returns Subscription plan or null if not found
   */
  async getPlanById(planId: BN | number): Promise<SubscriptionPlan | null> {
    try {
      const plans = await this.getPlans();

      const planIdBN = BN.isBN(planId) ? planId : new BN(planId);
      return plans.find(p => p.planId.eq(planIdBN)) || null;
    } catch (error) {
      throw SublyError.fromError(error, SublyErrorCode.NetworkError);
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
  async checkSubscription(
    userWallet: PublicKey | string,
    planPDA: PublicKey | string
  ): Promise<SubscriptionStatus> {
    try {
      const user = this.toPublicKey(userWallet);
      const plan = this.toPublicKey(planPDA);

      // Get all user subscriptions and find one matching this plan
      // In production, this would use the verify_subscription instruction
      // which decrypts the status via Arcium MPC

      // For now, scan through possible subscription indices
      for (let i = 0; i < 100; i++) {
        const subscription = await fetchUserSubscriptionByUserAndIndex(
          this.connection,
          user,
          i,
          this.programId
        );

        if (!subscription) {
          // No more subscriptions for this user
          break;
        }

        if (subscription.plan.equals(plan)) {
          // Found a subscription for this plan
          // Note: In production, status would be decrypted via Arcium
          // For now, assume active if account exists
          return subscription.isCancelled
            ? SubscriptionStatus.Cancelled
            : SubscriptionStatus.Active;
        }
      }

      return SubscriptionStatus.NotSubscribed;
    } catch (error) {
      throw SublyError.fromError(error, SublyErrorCode.NetworkError);
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
  async subscribe(
    planPDA: PublicKey | string,
    wallet: Wallet,
    options: TransactionOptions = {}
  ): Promise<TransactionSignature> {
    try {
      const plan = await this.getPlan(planPDA);
      if (!plan) {
        throw new SublyError('Plan not found', SublyErrorCode.PlanNotFound);
      }

      if (!plan.isActive) {
        throw new SublyError('Plan is not active', SublyErrorCode.PlanNotActive);
      }

      const arciumClient = await this.getArciumClient();
      const computationOffset = await getNextComputationOffset();

      // Get user's next subscription index
      const subscriptionIndex = await this.getNextSubscriptionIndex(wallet.publicKey);

      // Check if user already has this subscription
      const currentStatus = await this.checkSubscription(wallet.publicKey, planPDA);
      if (currentStatus === SubscriptionStatus.Active) {
        throw new SublyError(
          'User is already subscribed to this plan',
          SublyErrorCode.AlreadySubscribed
        );
      }

      // Build subscribe instruction
      const instruction = await buildSubscribeInstruction({
        user: wallet.publicKey,
        plan,
        subscriptionIndex,
        computationOffset,
        arciumClient,
        programId: this.programId,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (
        await this.connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTx = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: options.skipPreflight,
        }
      );

      await this.connection.confirmTransaction(
        signature,
        options.commitment || this.commitment
      );

      return signature;
    } catch (error) {
      if (error instanceof SublyError) {
        throw error;
      }
      throw SublyError.fromError(error, SublyErrorCode.TransactionFailed);
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
  async unsubscribe(
    subscriptionIndex: BN | number,
    wallet: Wallet,
    options: TransactionOptions = {}
  ): Promise<TransactionSignature> {
    try {
      const arciumClient = await this.getArciumClient();
      const computationOffset = await getNextComputationOffset();

      // Verify subscription exists
      const subscription = await fetchUserSubscriptionByUserAndIndex(
        this.connection,
        wallet.publicKey,
        subscriptionIndex,
        this.programId
      );

      if (!subscription) {
        throw new SublyError(
          'Subscription not found',
          SublyErrorCode.SubscriptionNotFound
        );
      }

      // Build unsubscribe instruction
      const instruction = await buildUnsubscribeInstruction({
        user: wallet.publicKey,
        subscriptionIndex,
        computationOffset,
        arciumClient,
        programId: this.programId,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (
        await this.connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTx = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: options.skipPreflight,
        }
      );

      await this.connection.confirmTransaction(
        signature,
        options.commitment || this.commitment
      );

      return signature;
    } catch (error) {
      if (error instanceof SublyError) {
        throw error;
      }
      throw SublyError.fromError(error, SublyErrorCode.TransactionFailed);
    }
  }

  /**
   * Get the next subscription index for a user
   * (scans existing subscriptions to find the next available index)
   */
  private async getNextSubscriptionIndex(user: PublicKey): Promise<BN> {
    let index = 0;
    while (true) {
      const subscription = await fetchUserSubscriptionByUserAndIndex(
        this.connection,
        user,
        index,
        this.programId
      );
      if (!subscription) {
        return new BN(index);
      }
      index++;
      if (index > 1000) {
        // Safety limit
        throw new SublyError(
          'Too many subscriptions',
          SublyErrorCode.TransactionFailed
        );
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
  async getUserLedger(
    userWallet: PublicKey | string,
    mint: PublicKey | string
  ): Promise<UserLedgerData | null> {
    try {
      const user = this.toPublicKey(userWallet);
      const mintPubkey = this.toPublicKey(mint);
      return await fetchUserLedger(this.connection, user, mintPubkey, this.programId);
    } catch (error) {
      throw SublyError.fromError(error, SublyErrorCode.NetworkError);
    }
  }

  /**
   * Get the merchant's public key
   */
  get merchant(): PublicKey {
    return this.merchantWallet;
  }

  /**
   * Get the program ID
   */
  get program(): PublicKey {
    return this.programId;
  }

  /**
   * Get the Connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}
