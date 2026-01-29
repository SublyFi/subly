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
//# sourceMappingURL=client.d.ts.map