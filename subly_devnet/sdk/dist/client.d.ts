import { PublicKey, Keypair } from "@solana/web3.js";
import { MembershipProof, CompressedSubscriptionData, AddressTreeInfo } from "./types/proof";
export declare const PROGRAM_ID: PublicKey;
/**
 * Subly ZK Client for interacting with compressed subscriptions
 */
export declare class SublyZkClient {
    private connection;
    private rpc;
    private programId;
    constructor(rpcUrl: string, programId?: PublicKey);
    /**
     * Initialize ZK tracker for a plan
     * This must be called before creating ZK subscriptions for a plan
     */
    initializeZkTracker(authority: Keypair, planAccount: PublicKey): Promise<string>;
    /**
     * Subscribe to a plan using ZK compression
     */
    subscribeWithZk(user: Keypair, planAccount: PublicKey, userSecret: Uint8Array): Promise<{
        signature: string;
        membershipCommitment: Uint8Array;
        compressedAddress: Uint8Array;
    }>;
    /**
     * Generate a membership proof for off-chain verification
     */
    generateMembershipProof(subscription: CompressedSubscriptionData, treeInfo: AddressTreeInfo, signerKeypair: Keypair, validityDurationSeconds?: number): Promise<MembershipProof>;
    /**
     * Verify a membership proof off-chain
     */
    verifyMembershipProof(proof: MembershipProof, expectedPlanId: PublicKey, verifierPublicKey: Uint8Array): import("./types/proof").ProofVerificationResult;
    /**
     * Migrate an existing PDA subscription to ZK compression
     */
    migrateSubscriptionToZk(user: Keypair, planAccount: PublicKey, originalSubscription: PublicKey, closeOriginal?: boolean): Promise<{
        signature: string;
        compressedAddress: Uint8Array;
    }>;
    /**
     * Get the ZK tracker PDA for a plan
     */
    getZkTrackerPda(planAccount: PublicKey): [PublicKey, number];
    /**
     * Derive the compressed subscription address
     */
    private deriveCompressedSubscriptionAddress;
    /**
     * Build and send subscribe_zk transaction
     */
    private buildAndSendSubscribeZkTx;
    /**
     * Build and send migrate_subscription_to_zk transaction
     */
    private buildAndSendMigrateToZkTx;
}
/**
 * Subly Arcium Client for interacting with MXE-encrypted subscriptions
 *
 * This client provides methods to:
 * - Subscribe with Arcium MXE encryption (subscribe_with_arcium)
 * - Cancel subscriptions with encryption (cancel_subscription_with_arcium)
 * - Query encrypted subscription status
 */
export declare class SublyArciumClient {
    private connection;
    private programId;
    constructor(rpcUrl: string, programId?: PublicKey);
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
    subscribeWithArcium(user: Keypair, planAccount: PublicKey, encryptedUserCommitment: Uint8Array, membershipCommitment: Uint8Array, nonce: bigint): Promise<{
        signature: string;
        computationOffset: bigint;
        subscriptionAccount: PublicKey;
    }>;
    /**
     * Cancel a subscription with Arcium MXE encryption
     *
     * This method queues a set_subscription_cancelled computation in the Arcium network.
     */
    cancelSubscriptionWithArcium(user: Keypair, subscriptionAccount: PublicKey, planAccount: PublicKey): Promise<{
        signature: string;
        computationOffset: bigint;
    }>;
    /**
     * Get subscription account data
     */
    getSubscription(subscriptionAccount: PublicKey): Promise<{
        plan: PublicKey;
        isActive: boolean;
        pendingEncryption: boolean;
        encryptedStatus: Uint8Array;
    } | null>;
    /**
     * Wait for encryption callback to complete
     */
    waitForEncryptionCallback(subscriptionAccount: PublicKey, timeoutMs?: number, pollIntervalMs?: number): Promise<boolean>;
    /**
     * Calculate instruction discriminator (SHA256 hash of "global:{name}")
     */
    private calculateDiscriminator;
    /**
     * Encode subscribe_with_arcium instruction data
     */
    private encodeSubscribeWithArciumData;
    /**
     * Encode cancel_subscription_with_arcium instruction data
     */
    private encodeCancelSubscriptionWithArciumData;
    /**
     * Derive subscription PDA
     */
    deriveSubscriptionPda(planAccount: PublicKey, membershipCommitment: Uint8Array): [PublicKey, number];
    /**
     * Get MXE account PDA
     */
    getMxeAccountPda(): PublicKey;
}
//# sourceMappingURL=client.d.ts.map