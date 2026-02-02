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
  getNextComputationOffset,
  createArciumContextFromSignature,
  ENCRYPTION_SIGNING_MESSAGE,
  decryptValue,
  decryptValues,
  nonceToBytes,
  bytesToU128,
  encryptValues,
  generateNonce,
  pubkeyToU128s,
  u128sToPubkey,
  ArciumContext,
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
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
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
 * const status = await sdk.checkSubscription(wallet, planId);
 *
 * // Subscribe a user
 * const signature = await sdk.subscribe(planId, wallet);
 * ```
 */
export class SublySDK {
  private connection: Connection;
  private merchantWallet: PublicKey;
  private programId: PublicKey;
  private commitment: Commitment;
  private arciumContext: ArciumContext | null = null;
  private arciumContextOwner: string | null = null;
  private clusterOffset: number;

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
    this.clusterOffset = config.arciumClusterOffset ?? 0;
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
   * Get or initialize Arcium encryption context for a wallet
   */
  private async getArciumContext(wallet: Wallet): Promise<ArciumContext> {
    const owner = wallet.publicKey.toBase58();
    if (this.arciumContext && this.arciumContextOwner === owner) {
      return this.arciumContext;
    }

    if (!wallet.signMessage) {
      throw new SublyError(
        'Wallet does not support signMessage',
        SublyErrorCode.WalletNotSupported
      );
    }

    const message = new TextEncoder().encode(ENCRYPTION_SIGNING_MESSAGE);
    const signature = await wallet.signMessage(message);
    const context = await createArciumContextFromSignature(
      this.connection,
      signature,
      this.programId
    );

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
   * Check a user's subscription status (decrypts the user's subscription data).
   *
   * @param wallet - User's wallet (requires signMessage)
   * @param planPDA - Plan account public key
   * @returns Subscription status
   */
  async checkSubscription(
    wallet: Wallet,
    planPDA: PublicKey | string
  ): Promise<SubscriptionStatus> {
    try {
      const planPubkey = this.toPublicKey(planPDA);
      const plan = await this.getPlan(planPubkey);
      if (!plan) {
        throw new SublyError('Plan not found', SublyErrorCode.PlanNotFound);
      }

      const user = wallet.publicKey;
      const ledger = await fetchUserLedger(
        this.connection,
        user,
        plan.mint,
        this.programId
      );

      if (!ledger) {
        return SubscriptionStatus.NotSubscribed;
      }

      const context = await this.getArciumContext(wallet);
      const ledgerNonce = nonceToBytes(ledger.nonce);
      const subscriptionCount = decryptValue(
        context.cipher,
        ledger.encryptedSubscriptionCount,
        ledgerNonce
      );

      const maxIndex = Number(subscriptionCount);
      if (!Number.isFinite(maxIndex) || maxIndex < 0) {
        throw new SublyError('Invalid subscription count', SublyErrorCode.ArciumError);
      }

      const limit = Math.min(maxIndex, 1000);
      for (let i = 0; i < limit; i++) {
        const subscription = await fetchUserSubscriptionByUserAndIndex(
          this.connection,
          user,
          i,
          this.programId
        );

        if (!subscription) {
          continue;
        }

        const subNonce = nonceToBytes(subscription.nonce);
        const [planPart1, planPart2, statusVal] = decryptValues(
          context.cipher,
          [
            subscription.encryptedPlan[0],
            subscription.encryptedPlan[1],
            subscription.encryptedStatus,
          ],
          subNonce
        );

        const subscriptionPlan = u128sToPubkey([planPart1, planPart2]);
        if (!subscriptionPlan.equals(planPubkey)) {
          continue;
        }

        const statusNum = Number(statusVal);
        if (statusNum === 0) {
          return SubscriptionStatus.Active;
        }
        if (statusNum === 1) {
          return SubscriptionStatus.Cancelled;
        }
        if (statusNum === 2) {
          return SubscriptionStatus.Expired;
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

      const computationOffset = await getNextComputationOffset();

      // Get user's next subscription index
      const subscriptionIndex = await this.getNextSubscriptionIndex(wallet, plan.mint);

      // Check if user already has this subscription
      const currentStatus = await this.checkSubscription(wallet, planPDA);
      if (currentStatus === SubscriptionStatus.Active) {
        throw new SublyError(
          'User is already subscribed to this plan',
          SublyErrorCode.AlreadySubscribed
        );
      }

      // Encrypt plan metadata for MPC
      const context = await this.getArciumContext(wallet);
      const planParts = pubkeyToU128s(plan.publicKey);
      const planNonce = generateNonce();
      const [encryptedPlanPart1, encryptedPlanPart2] = encryptValues(
        context.cipher,
        [planParts[0], planParts[1]],
        planNonce
      );
      const priceNonce = generateNonce();
      const [encryptedPrice] = encryptValues(
        context.cipher,
        [BigInt(plan.price.toString())],
        priceNonce
      );
      const billingNonce = generateNonce();
      const [encryptedBillingCycle] = encryptValues(
        context.cipher,
        [BigInt(plan.billingCycleDays)],
        billingNonce
      );

      // Build subscribe instruction
      const instruction = await buildSubscribeInstruction({
        user: wallet.publicKey,
        plan,
        subscriptionIndex,
        encryptedPlan: [encryptedPlanPart1, encryptedPlanPart2],
        encryptedPlanNonce: bytesToU128(planNonce),
        encryptedPrice,
        encryptedPriceNonce: bytesToU128(priceNonce),
        encryptedBillingCycle,
        encryptedBillingCycleNonce: bytesToU128(billingNonce),
        computationOffset,
        clusterOffset: this.clusterOffset,
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
        clusterOffset: this.clusterOffset,
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
   * (decrypts encrypted_subscription_count from the user's ledger)
   */
  private async getNextSubscriptionIndex(wallet: Wallet, mint: PublicKey): Promise<BN> {
    const ledger = await fetchUserLedger(
      this.connection,
      wallet.publicKey,
      mint,
      this.programId
    );

    if (!ledger) {
      return new BN(0);
    }

    const context = await this.getArciumContext(wallet);
    const ledgerNonce = nonceToBytes(ledger.nonce);
    const subscriptionCount = decryptValue(
      context.cipher,
      ledger.encryptedSubscriptionCount,
      ledgerNonce
    );

    const nextIndex = subscriptionCount;
    return new BN(nextIndex.toString());
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
