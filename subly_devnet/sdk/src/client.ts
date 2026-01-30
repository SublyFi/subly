import {
  PublicKey,
  Keypair,
  Connection,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  AccountMeta,
} from "@solana/web3.js";
import { createRpc, Rpc, defaultTestStateTreeAccounts, bn } from "@lightprotocol/stateless.js";
import {
  MembershipProof,
  CompressedSubscriptionData,
  AddressTreeInfo,
} from "./types/proof";
import {
  ArciumAccounts,
  ARCIUM_PROGRAM_ID,
  COMP_DEF_OFFSETS,
  getArciumAccounts,
  generateComputationOffset,
  deriveMxePda,
} from "./types/arcium";
import {
  generateMembershipCommitment,
  generateMembershipProof,
} from "./proof/generator";
import { verifyMembershipProof } from "./proof/verifier";
import { createHash } from "crypto";

// Program ID for Subly Devnet
export const PROGRAM_ID = new PublicKey("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");

/**
 * Subly ZK Client for interacting with compressed subscriptions
 */
export class SublyZkClient {
  private connection: Connection;
  private rpc: Rpc;
  private programId: PublicKey;

  constructor(rpcUrl: string, programId: PublicKey = PROGRAM_ID) {
    this.connection = new Connection(rpcUrl);
    this.rpc = createRpc(rpcUrl);
    this.programId = programId;
  }

  /**
   * Initialize ZK tracker for a plan
   * This must be called before creating ZK subscriptions for a plan
   */
  async initializeZkTracker(
    authority: Keypair,
    planAccount: PublicKey
  ): Promise<string> {
    const [trackerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk_tracker"), planAccount.toBuffer()],
      this.programId
    );

    // Build instruction data for initialize_zk_tracker
    const discriminator = Buffer.from([
      0x6f, 0xaa, 0x1f, 0x5b, 0x2d, 0x1c, 0x3e, 0x4d, // placeholder discriminator
    ]);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: planAccount, isSigner: false, isWritable: false },
        { pubkey: trackerPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: discriminator,
    });

    const tx = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [authority]);

    return signature;
  }

  /**
   * Subscribe to a plan using ZK compression
   */
  async subscribeWithZk(
    user: Keypair,
    planAccount: PublicKey,
    userSecret: Uint8Array
  ): Promise<{
    signature: string;
    membershipCommitment: Uint8Array;
    compressedAddress: Uint8Array;
  }> {
    // Generate membership commitment
    const membershipCommitment = generateMembershipCommitment(userSecret, planAccount);

    // Generate encrypted user commitment (placeholder)
    const encryptedUserCommitment = new Uint8Array(32);

    // Get default state tree accounts
    const defaultAccounts = defaultTestStateTreeAccounts();

    // Derive the compressed account address
    const compressedAddress = this.deriveCompressedSubscriptionAddress(
      planAccount,
      membershipCommitment,
      defaultAccounts.addressTree
    );

    // Get validity proof for the new address
    const validityProof = await this.rpc.getValidityProof(
      [],
      [bn(compressedAddress)]
    );

    // Build the transaction
    // Note: This is a simplified version - actual implementation needs Light Protocol account setup
    const signature = await this.buildAndSendSubscribeZkTx(
      user,
      planAccount,
      membershipCommitment,
      encryptedUserCommitment,
      validityProof,
      { tree: defaultAccounts.addressTree, queue: defaultAccounts.addressQueue } as AddressTreeInfo,
      0 // Default output state tree index
    );

    return {
      signature,
      membershipCommitment,
      compressedAddress,
    };
  }

  /**
   * Generate a membership proof for off-chain verification
   */
  async generateMembershipProof(
    subscription: CompressedSubscriptionData,
    treeInfo: AddressTreeInfo,
    signerKeypair: Keypair,
    validityDurationSeconds?: number
  ): Promise<MembershipProof> {
    return generateMembershipProof(
      this.connection.rpcEndpoint,
      subscription,
      treeInfo,
      signerKeypair,
      validityDurationSeconds
    );
  }

  /**
   * Verify a membership proof off-chain
   */
  verifyMembershipProof(
    proof: MembershipProof,
    expectedPlanId: PublicKey,
    verifierPublicKey: Uint8Array
  ) {
    return verifyMembershipProof(proof, expectedPlanId, verifierPublicKey);
  }

  /**
   * Migrate an existing PDA subscription to ZK compression
   */
  async migrateSubscriptionToZk(
    user: Keypair,
    planAccount: PublicKey,
    originalSubscription: PublicKey,
    closeOriginal: boolean = false
  ): Promise<{
    signature: string;
    compressedAddress: Uint8Array;
  }> {
    // Get default state tree accounts
    const defaultAccounts = defaultTestStateTreeAccounts();

    // Fetch original subscription to get membership commitment
    const accountInfo = await this.connection.getAccountInfo(originalSubscription);
    if (!accountInfo) {
      throw new Error("Original subscription not found");
    }

    // Parse membership commitment from account data (offset depends on account structure)
    const membershipCommitment = new Uint8Array(
      accountInfo.data.slice(64 + 32, 64 + 32 + 32) // Adjust offset based on actual structure
    );

    // Derive the compressed account address
    const compressedAddress = this.deriveCompressedSubscriptionAddress(
      planAccount,
      membershipCommitment,
      defaultAccounts.addressTree
    );

    // Get validity proof for the new address
    const validityProof = await this.rpc.getValidityProof(
      [],
      [bn(compressedAddress)]
    );

    // Build and send the migration transaction
    const signature = await this.buildAndSendMigrateToZkTx(
      user,
      planAccount,
      originalSubscription,
      closeOriginal,
      validityProof,
      { tree: defaultAccounts.addressTree, queue: defaultAccounts.addressQueue } as AddressTreeInfo,
      0 // Default output state tree index
    );

    return {
      signature,
      compressedAddress,
    };
  }

  /**
   * Get the ZK tracker PDA for a plan
   */
  getZkTrackerPda(planAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("zk_tracker"), planAccount.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive the compressed subscription address
   */
  private deriveCompressedSubscriptionAddress(
    planAccount: PublicKey,
    membershipCommitment: Uint8Array,
    addressTree: PublicKey
  ): Uint8Array {
    // Simplified address derivation
    // In production, use Light Protocol's derive_address function
    const seed = Buffer.concat([
      Buffer.from("compressed_sub"),
      planAccount.toBuffer(),
      Buffer.from(membershipCommitment),
    ]);

    // Hash the seed to get address bytes
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(seed).digest();
  }

  /**
   * Build and send subscribe_zk transaction
   */
  private async buildAndSendSubscribeZkTx(
    user: Keypair,
    planAccount: PublicKey,
    membershipCommitment: Uint8Array,
    encryptedUserCommitment: Uint8Array,
    validityProof: any,
    addressTreeInfo: any,
    outputStateTreeIndex: number
  ): Promise<string> {
    const [trackerPda] = this.getZkTrackerPda(planAccount);

    // Build instruction data
    // Note: This needs proper serialization based on the IDL
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: planAccount, isSigner: false, isWritable: false },
        { pubkey: trackerPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        // Add Light Protocol accounts from remaining_accounts
      ],
      programId: this.programId,
      data: Buffer.alloc(0), // Placeholder - needs proper serialization
    });

    const tx = new Transaction().add(instruction);
    return sendAndConfirmTransaction(this.connection, tx, [user]);
  }

  /**
   * Build and send migrate_subscription_to_zk transaction
   */
  private async buildAndSendMigrateToZkTx(
    user: Keypair,
    planAccount: PublicKey,
    originalSubscription: PublicKey,
    closeOriginal: boolean,
    validityProof: any,
    addressTreeInfo: any,
    outputStateTreeIndex: number
  ): Promise<string> {
    const [trackerPda] = this.getZkTrackerPda(planAccount);

    // Build instruction data
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: planAccount, isSigner: false, isWritable: false },
        { pubkey: originalSubscription, isSigner: false, isWritable: true },
        { pubkey: trackerPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        // Add Light Protocol accounts from remaining_accounts
      ],
      programId: this.programId,
      data: Buffer.alloc(0), // Placeholder - needs proper serialization
    });

    const tx = new Transaction().add(instruction);
    return sendAndConfirmTransaction(this.connection, tx, [user]);
  }
}

/**
 * Subly Arcium Client for interacting with MXE-encrypted subscriptions
 *
 * This client provides methods to:
 * - Subscribe with Arcium MXE encryption (subscribe_with_arcium)
 * - Cancel subscriptions with encryption (cancel_subscription_with_arcium)
 * - Query encrypted subscription status
 */
export class SublyArciumClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(rpcUrl: string, programId: PublicKey = PROGRAM_ID) {
    this.connection = new Connection(rpcUrl);
    this.programId = programId;
  }

  /**
   * Subscribe to a plan with Arcium MXE encryption
   *
   * This method:
   * 1. Generates a computation offset for the Arcium queue
   * 2. Derives all necessary Arcium PDA accounts
   * 3. Builds and sends the subscribe_with_arcium transaction
   *
   * The actual encryption happens in the Arcium MXE network, and the
   * encrypted status will be set via callback.
   */
  async subscribeWithArcium(
    user: Keypair,
    planAccount: PublicKey,
    encryptedUserCommitment: Uint8Array,
    membershipCommitment: Uint8Array,
    nonce: bigint
  ): Promise<{
    signature: string;
    computationOffset: bigint;
    subscriptionAccount: PublicKey;
  }> {
    // Generate a unique computation offset
    const computationOffset = generateComputationOffset();

    // Get Arcium accounts
    const arciumAccounts = getArciumAccounts(
      user.publicKey,
      this.programId,
      computationOffset,
      COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE
    );

    // Derive subscription PDA
    const [subscriptionAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("subscription"),
        planAccount.toBuffer(),
        Buffer.from(membershipCommitment),
      ],
      this.programId
    );

    // Build instruction
    const discriminator = this.calculateDiscriminator("subscribe_with_arcium");
    const instructionData = this.encodeSubscribeWithArciumData(
      computationOffset,
      encryptedUserCommitment,
      membershipCommitment,
      nonce
    );

    const keys: AccountMeta[] = [
      // Arcium accounts
      { pubkey: user.publicKey, isSigner: true, isWritable: true },
      { pubkey: arciumAccounts.mxeAccount, isSigner: false, isWritable: false },
      { pubkey: arciumAccounts.mempoolAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.executingPool, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.computationAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.compDefAccount, isSigner: false, isWritable: false },
      { pubkey: arciumAccounts.clusterAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.poolAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.clockAccount, isSigner: false, isWritable: false },
      { pubkey: arciumAccounts.signPdaAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
      // Custom accounts
      { pubkey: planAccount, isSigner: false, isWritable: true },
      { pubkey: subscriptionAccount, isSigner: false, isWritable: true },
    ];

    const instruction = new TransactionInstruction({
      keys,
      programId: this.programId,
      data: Buffer.concat([discriminator, instructionData]),
    });

    const tx = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [user]);

    return {
      signature,
      computationOffset,
      subscriptionAccount,
    };
  }

  /**
   * Cancel a subscription with Arcium MXE encryption
   *
   * This method queues a set_subscription_cancelled computation in the Arcium network.
   */
  async cancelSubscriptionWithArcium(
    user: Keypair,
    subscriptionAccount: PublicKey,
    planAccount: PublicKey
  ): Promise<{
    signature: string;
    computationOffset: bigint;
  }> {
    // Generate a unique computation offset
    const computationOffset = generateComputationOffset();

    // Get Arcium accounts
    const arciumAccounts = getArciumAccounts(
      user.publicKey,
      this.programId,
      computationOffset,
      COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED
    );

    // Build instruction
    const discriminator = this.calculateDiscriminator("cancel_subscription_with_arcium");
    const instructionData = this.encodeCancelSubscriptionWithArciumData(computationOffset);

    const keys: AccountMeta[] = [
      // Arcium accounts
      { pubkey: user.publicKey, isSigner: true, isWritable: true },
      { pubkey: arciumAccounts.mxeAccount, isSigner: false, isWritable: false },
      { pubkey: arciumAccounts.mempoolAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.executingPool, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.computationAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.compDefAccount, isSigner: false, isWritable: false },
      { pubkey: arciumAccounts.clusterAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.poolAccount, isSigner: false, isWritable: true },
      { pubkey: arciumAccounts.clockAccount, isSigner: false, isWritable: false },
      { pubkey: arciumAccounts.signPdaAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
      // Custom accounts
      { pubkey: subscriptionAccount, isSigner: false, isWritable: true },
      { pubkey: planAccount, isSigner: false, isWritable: true },
    ];

    const instruction = new TransactionInstruction({
      keys,
      programId: this.programId,
      data: Buffer.concat([discriminator, instructionData]),
    });

    const tx = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(this.connection, tx, [user]);

    return {
      signature,
      computationOffset,
    };
  }

  /**
   * Get subscription account data
   */
  async getSubscription(subscriptionAccount: PublicKey): Promise<{
    plan: PublicKey;
    isActive: boolean;
    pendingEncryption: boolean;
    encryptedStatus: Uint8Array;
  } | null> {
    const accountInfo = await this.connection.getAccountInfo(subscriptionAccount);
    if (!accountInfo) {
      return null;
    }

    // Parse account data (simplified - should use IDL-based deserialization)
    const data = accountInfo.data;
    const plan = new PublicKey(data.slice(8 + 32, 8 + 32 + 32)); // After discriminator + subscription_id
    const isActive = data[8 + 32 + 32 + 32 + 32 + 8 + 8] === 1; // After encrypted_user_commitment, membership_commitment, subscribed_at, cancelled_at
    const pendingEncryption = data[8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 16 + 1 + 64 + 16] === 1; // Last bool field
    const encryptedStatus = new Uint8Array(data.slice(8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 16 + 1, 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 16 + 1 + 64));

    return {
      plan,
      isActive,
      pendingEncryption,
      encryptedStatus,
    };
  }

  /**
   * Wait for encryption callback to complete
   */
  async waitForEncryptionCallback(
    subscriptionAccount: PublicKey,
    timeoutMs: number = 60000,
    pollIntervalMs: number = 2000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const subscription = await this.getSubscription(subscriptionAccount);
      if (subscription && !subscription.pendingEncryption) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return false;
  }

  /**
   * Calculate instruction discriminator (SHA256 hash of "global:{name}")
   */
  private calculateDiscriminator(instructionName: string): Buffer {
    const hash = createHash("sha256")
      .update(`global:${instructionName}`)
      .digest();
    return hash.slice(0, 8);
  }

  /**
   * Encode subscribe_with_arcium instruction data
   */
  private encodeSubscribeWithArciumData(
    computationOffset: bigint,
    encryptedUserCommitment: Uint8Array,
    membershipCommitment: Uint8Array,
    nonce: bigint
  ): Buffer {
    // Encode: computation_offset (u64) + encrypted_user_commitment ([u8; 32]) +
    //         membership_commitment ([u8; 32]) + nonce (u128)
    const buffer = Buffer.alloc(8 + 32 + 32 + 16);

    buffer.writeBigUInt64LE(computationOffset, 0);
    Buffer.from(encryptedUserCommitment).copy(buffer, 8);
    Buffer.from(membershipCommitment).copy(buffer, 8 + 32);

    // Write u128 nonce (little-endian)
    const nonceBuffer = Buffer.alloc(16);
    nonceBuffer.writeBigUInt64LE(nonce & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
    nonceBuffer.writeBigUInt64LE(nonce >> BigInt(64), 8);
    nonceBuffer.copy(buffer, 8 + 32 + 32);

    return buffer;
  }

  /**
   * Encode cancel_subscription_with_arcium instruction data
   */
  private encodeCancelSubscriptionWithArciumData(computationOffset: bigint): Buffer {
    // Encode: computation_offset (u64)
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(computationOffset, 0);
    return buffer;
  }

  /**
   * Derive subscription PDA
   */
  deriveSubscriptionPda(
    planAccount: PublicKey,
    membershipCommitment: Uint8Array
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("subscription"),
        planAccount.toBuffer(),
        Buffer.from(membershipCommitment),
      ],
      this.programId
    );
  }

  /**
   * Get MXE account PDA
   */
  getMxeAccountPda(): PublicKey {
    return deriveMxePda(this.programId);
  }
}
