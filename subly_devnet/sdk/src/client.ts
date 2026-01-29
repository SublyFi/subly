import {
  PublicKey,
  Keypair,
  Connection,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { createRpc, Rpc, defaultTestStateTreeAccounts, bn } from "@lightprotocol/stateless.js";
import {
  MembershipProof,
  CompressedSubscriptionData,
  AddressTreeInfo,
} from "./types/proof";
import {
  generateMembershipCommitment,
  generateMembershipProof,
} from "./proof/generator";
import { verifyMembershipProof } from "./proof/verifier";

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
