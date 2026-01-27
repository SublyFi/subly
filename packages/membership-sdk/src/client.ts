import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL, PROGRAM_ID } from "./idl/subly_devnet";
import type {
  Business,
  RegisterBusinessInput,
  Plan,
  CreatePlanInput,
  PlanFilter,
  Subscription,
  SubscribeInput,
  SubscriptionFilter,
  TransactionResult,
} from "./types";
import { CONSTANTS } from "./types/common";
import {
  deriveBusinessPda,
  derivePlanPda,
  deriveSubscriptionPda,
  deriveMxePda,
} from "./utils/pda";
import {
  generateNonce,
  generateUserCommitment,
  generateMembershipCommitment,
  encryptPlanData,
  decryptPlanData,
} from "./utils/encryption";
import {
  usdcToOnChain,
  usdcFromOnChain,
  daysToSeconds,
  secondsToDays,
  timestampToDate,
} from "./utils/format";

/**
 * Wallet adapter interface compatible with browser wallet extensions
 */
export interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
}

/**
 * Configuration for SublyMembershipClient
 */
export type SublyMembershipClientConfig = {
  /** Solana connection */
  connection: Connection;
  /** Wallet for signing transactions */
  wallet: WalletAdapter;
  /** Optional custom program ID */
  programId?: string;
};

/**
 * Main client for interacting with the Subly Membership Protocol
 */
export class SublyMembershipClient {
  private connection: Connection;
  private wallet: WalletAdapter;
  private programId: PublicKey;
  private provider: AnchorProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private program: Program<any>;

  constructor(config: SublyMembershipClientConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = new PublicKey(config.programId ?? PROGRAM_ID);

    // Create Anchor provider with wallet adapter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.provider = new AnchorProvider(
      this.connection,
      this.wallet as any,
      AnchorProvider.defaultOptions()
    );

    // Use IDL as any since the exact typing depends on Anchor version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.program = new Program(IDL as any, this.provider);
  }

  // ============================================
  // Business Operations
  // ============================================

  /**
   * Register a new business
   * @param input - Business registration input
   * @returns Transaction result with signature
   */
  async registerBusiness(input: RegisterBusinessInput): Promise<TransactionResult> {
    try {
      // Validate input
      if (input.name.length > CONSTANTS.MAX_NAME_LENGTH) {
        throw new Error(`Name exceeds maximum length of ${CONSTANTS.MAX_NAME_LENGTH}`);
      }
      if (input.metadataUri.length > CONSTANTS.MAX_METADATA_URI_LENGTH) {
        throw new Error(
          `Metadata URI exceeds maximum length of ${CONSTANTS.MAX_METADATA_URI_LENGTH}`
        );
      }

      const [businessPda] = deriveBusinessPda(
        this.wallet.publicKey,
        this.programId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (this.program.methods as any)
        .registerBusiness(input.name, input.metadataUri)
        .accounts({
          authorityAccount: this.wallet.publicKey,
          businessAccount: businessPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get business account for the connected wallet
   * @returns Business account or null if not found
   */
  async getBusiness(): Promise<Business | null> {
    try {
      const [businessPda] = deriveBusinessPda(
        this.wallet.publicKey,
        this.programId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (this.program.account as any).businessAccount.fetch(businessPda);

      return {
        publicKey: businessPda,
        authority: account.authority,
        name: account.name,
        metadataUri: account.metadataUri,
        createdAt: BigInt(account.createdAt.toString()),
        isActive: account.isActive,
        planCount: BigInt(account.planCount.toString()),
        bump: account.bump,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get business account by authority public key
   * @param authority - Authority public key
   * @returns Business account or null if not found
   */
  async getBusinessByAuthority(authority: PublicKey): Promise<Business | null> {
    try {
      const [businessPda] = deriveBusinessPda(authority, this.programId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (this.program.account as any).businessAccount.fetch(businessPda);

      return {
        publicKey: businessPda,
        authority: account.authority,
        name: account.name,
        metadataUri: account.metadataUri,
        createdAt: BigInt(account.createdAt.toString()),
        isActive: account.isActive,
        planCount: BigInt(account.planCount.toString()),
        bump: account.bump,
      };
    } catch {
      return null;
    }
  }

  // ============================================
  // Plan Operations
  // ============================================

  /**
   * Create a new subscription plan
   * @param input - Plan creation input
   * @returns Transaction result with signature
   */
  async createPlan(input: CreatePlanInput): Promise<TransactionResult> {
    try {
      // Validate input
      if (input.priceUsdc <= 0) {
        throw new Error("Price must be greater than 0");
      }

      const billingCycleSeconds = daysToSeconds(input.billingCycleDays);
      if (
        billingCycleSeconds < CONSTANTS.MIN_BILLING_CYCLE_SECONDS ||
        billingCycleSeconds > CONSTANTS.MAX_BILLING_CYCLE_SECONDS
      ) {
        throw new Error(
          `Billing cycle must be between ${secondsToDays(CONSTANTS.MIN_BILLING_CYCLE_SECONDS)} and ${secondsToDays(CONSTANTS.MAX_BILLING_CYCLE_SECONDS)} days`
        );
      }

      // Get business account
      const business = await this.getBusiness();
      if (!business) {
        throw new Error("Business not registered");
      }

      // Encrypt plan data
      const encryptedName = encryptPlanData(input.name, 32);
      const encryptedDescription = encryptPlanData(input.description, 64);
      const nonce = generateNonce();

      // Derive plan PDA
      const [planPda] = derivePlanPda(
        business.publicKey,
        business.planCount,
        this.programId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (this.program.methods as any)
        .createPlan(
          Array.from(encryptedName) as number[],
          Array.from(encryptedDescription) as number[],
          new BN(usdcToOnChain(input.priceUsdc).toString()),
          billingCycleSeconds,
          new BN(nonce.toString())
        )
        .accounts({
          authorityAccount: this.wallet.publicKey,
          businessAccount: business.publicKey,
          planAccount: planPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get plans for the connected wallet's business
   * @param filter - Optional filter options
   * @returns Array of plans
   */
  async getPlans(filter?: PlanFilter): Promise<Plan[]> {
    try {
      const business = filter?.business
        ? await this.getBusinessByAuthority(filter.business)
        : await this.getBusiness();

      if (!business) {
        return [];
      }

      const plans: Plan[] = [];
      const limit = filter?.limit ?? 100;
      const offset = filter?.offset ?? 0;

      // Iterate through plan PDAs
      for (let i = offset; i < Number(business.planCount) && plans.length < limit; i++) {
        try {
          const [planPda] = derivePlanPda(business.publicKey, BigInt(i), this.programId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const account = await (this.program.account as any).plan.fetch(planPda);

          // Apply active filter if specified
          if (filter?.isActive !== undefined && account.isActive !== filter.isActive) {
            continue;
          }

          plans.push({
            publicKey: planPda,
            business: account.business,
            name: decryptPlanData(new Uint8Array(account.encryptedName)),
            description: decryptPlanData(new Uint8Array(account.encryptedDescription)),
            priceUsdc: usdcFromOnChain(BigInt(account.priceUsdc.toString())),
            billingCycleDays: secondsToDays(account.billingCycleSeconds),
            createdAt: timestampToDate(BigInt(account.createdAt.toString())),
            isActive: account.isActive,
          });
        } catch {
          // Plan doesn't exist, skip
          continue;
        }
      }

      return plans;
    } catch {
      return [];
    }
  }

  /**
   * Get a specific plan by public key
   * @param planPubkey - Plan public key
   * @returns Plan or null if not found
   */
  async getPlan(planPubkey: PublicKey): Promise<Plan | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (this.program.account as any).plan.fetch(planPubkey);

      return {
        publicKey: planPubkey,
        business: account.business,
        name: decryptPlanData(new Uint8Array(account.encryptedName)),
        description: decryptPlanData(new Uint8Array(account.encryptedDescription)),
        priceUsdc: usdcFromOnChain(BigInt(account.priceUsdc.toString())),
        billingCycleDays: secondsToDays(account.billingCycleSeconds),
        createdAt: timestampToDate(BigInt(account.createdAt.toString())),
        isActive: account.isActive,
      };
    } catch {
      return null;
    }
  }

  /**
   * Deactivate a plan
   * @param planPubkey - Plan public key to deactivate
   * @returns Transaction result
   */
  async deactivatePlan(planPubkey: PublicKey): Promise<TransactionResult> {
    try {
      const business = await this.getBusiness();
      if (!business) {
        throw new Error("Business not registered");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (this.program.methods as any)
        .deactivatePlan()
        .accounts({
          authorityAccount: this.wallet.publicKey,
          businessAccount: business.publicKey,
          planAccount: planPubkey,
        })
        .rpc();

      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================
  // Subscription Operations
  // ============================================

  /**
   * Subscribe to a plan
   * @param input - Subscription input
   * @returns Transaction result with signature and membership commitment
   */
  async subscribe(
    input: SubscribeInput
  ): Promise<TransactionResult & { membershipCommitment?: Uint8Array }> {
    try {
      // Generate commitments
      const userCommitment = await generateUserCommitment(
        input.userSecret,
        input.plan.toBytes()
      );

      const membershipCommitment = await generateMembershipCommitment(
        userCommitment,
        input.plan.toBytes()
      );

      const nonce = generateNonce();

      // Derive subscription PDA
      const [subscriptionPda] = deriveSubscriptionPda(
        input.plan,
        membershipCommitment,
        this.programId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (this.program.methods as any)
        .subscribe(
          Array.from(userCommitment) as number[],
          Array.from(membershipCommitment) as number[],
          new BN(nonce.toString())
        )
        .accounts({
          userAccount: this.wallet.publicKey,
          planAccount: input.plan,
          subscriptionAccount: subscriptionPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature, success: true, membershipCommitment };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get subscriptions for a plan
   * @param planPubkey - Plan public key
   * @param filter - Optional filter options
   * @returns Array of subscriptions
   */
  async getSubscriptions(
    planPubkey: PublicKey,
    filter?: SubscriptionFilter
  ): Promise<Subscription[]> {
    try {
      // Fetch all subscription accounts for this plan using getProgramAccounts
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          // Filter by account discriminator (first 8 bytes)
          // Note: In production, we'd use proper discriminator
          {
            memcmp: {
              offset: 8 + 32, // Skip discriminator and subscription_id
              bytes: planPubkey.toBase58(),
            },
          },
        ],
      });

      const subscriptions: Subscription[] = [];
      const limit = filter?.limit ?? 100;

      for (const { pubkey, account } of accounts) {
        if (subscriptions.length >= limit) break;

        try {
          const decoded = this.program.coder.accounts.decode(
            "subscription",
            account.data
          );

          if (filter?.isActive !== undefined && decoded.isActive !== filter.isActive) {
            continue;
          }

          subscriptions.push({
            publicKey: pubkey,
            plan: decoded.plan,
            membershipCommitment: new Uint8Array(decoded.membershipCommitment),
            subscribedAt: timestampToDate(BigInt(decoded.subscribedAt.toString())),
            cancelledAt:
              decoded.cancelledAt.toString() === "0"
                ? null
                : timestampToDate(BigInt(decoded.cancelledAt.toString())),
            isActive: decoded.isActive,
          });
        } catch {
          continue;
        }
      }

      return subscriptions;
    } catch {
      return [];
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionPubkey - Subscription public key
   * @returns Transaction result
   */
  async cancelSubscription(subscriptionPubkey: PublicKey): Promise<TransactionResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (this.program.methods as any)
        .cancelSubscription()
        .accounts({
          userAccount: this.wallet.publicKey,
          subscriptionAccount: subscriptionPubkey,
        })
        .rpc();

      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the encrypted subscription count for a plan
   * @param planPubkey - Plan public key
   * @returns Encrypted subscription count bytes
   */
  async getSubscriptionCount(planPubkey: PublicKey): Promise<Uint8Array | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (this.program.account as any).plan.fetch(planPubkey);
      return new Uint8Array(account.encryptedSubscriptionCount);
    } catch {
      return null;
    }
  }

  // ============================================
  // MXE Operations (Arcium Integration)
  // ============================================

  /**
   * Initialize the MXE account for Arcium integration
   * This should be called once after program deployment
   * @returns Transaction result with signature
   */
  async initializeMxe(): Promise<TransactionResult> {
    try {
      const [mxePda] = deriveMxePda(this.programId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (this.program.methods as any)
        .initializeMxe()
        .accounts({
          payer: this.wallet.publicKey,
          mxeAccount: mxePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if MXE account is initialized
   * @returns True if MXE account exists
   */
  async isMxeInitialized(): Promise<boolean> {
    try {
      const [mxePda] = deriveMxePda(this.programId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.program.account as any).mxeAccount.fetch(mxePda);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the MXE account PDA
   * @returns MXE account PDA
   */
  getMxePda(): PublicKey {
    const [mxePda] = deriveMxePda(this.programId);
    return mxePda;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get the program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }

  /**
   * Get the connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get the wallet public key
   */
  getWalletPublicKey(): PublicKey {
    return this.wallet.publicKey;
  }
}
