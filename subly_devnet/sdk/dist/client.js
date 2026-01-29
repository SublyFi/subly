"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SublyZkClient = exports.PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
const stateless_js_1 = require("@lightprotocol/stateless.js");
const generator_1 = require("./proof/generator");
const verifier_1 = require("./proof/verifier");
// Program ID for Subly Devnet
exports.PROGRAM_ID = new web3_js_1.PublicKey("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");
/**
 * Subly ZK Client for interacting with compressed subscriptions
 */
class SublyZkClient {
    constructor(rpcUrl, programId = exports.PROGRAM_ID) {
        this.connection = new web3_js_1.Connection(rpcUrl);
        this.rpc = (0, stateless_js_1.createRpc)(rpcUrl);
        this.programId = programId;
    }
    /**
     * Initialize ZK tracker for a plan
     * This must be called before creating ZK subscriptions for a plan
     */
    async initializeZkTracker(authority, planAccount) {
        const [trackerPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("zk_tracker"), planAccount.toBuffer()], this.programId);
        // Build instruction data for initialize_zk_tracker
        const discriminator = Buffer.from([
            0x6f, 0xaa, 0x1f, 0x5b, 0x2d, 0x1c, 0x3e, 0x4d, // placeholder discriminator
        ]);
        const instruction = new web3_js_1.TransactionInstruction({
            keys: [
                { pubkey: authority.publicKey, isSigner: true, isWritable: true },
                { pubkey: planAccount, isSigner: false, isWritable: false },
                { pubkey: trackerPda, isSigner: false, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: this.programId,
            data: discriminator,
        });
        const tx = new web3_js_1.Transaction().add(instruction);
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, tx, [authority]);
        return signature;
    }
    /**
     * Subscribe to a plan using ZK compression
     */
    async subscribeWithZk(user, planAccount, userSecret) {
        // Generate membership commitment
        const membershipCommitment = (0, generator_1.generateMembershipCommitment)(userSecret, planAccount);
        // Generate encrypted user commitment (placeholder)
        const encryptedUserCommitment = new Uint8Array(32);
        // Get default state tree accounts
        const defaultAccounts = (0, stateless_js_1.defaultTestStateTreeAccounts)();
        // Derive the compressed account address
        const compressedAddress = this.deriveCompressedSubscriptionAddress(planAccount, membershipCommitment, defaultAccounts.addressTree);
        // Get validity proof for the new address
        const validityProof = await this.rpc.getValidityProof([], [(0, stateless_js_1.bn)(compressedAddress)]);
        // Build the transaction
        // Note: This is a simplified version - actual implementation needs Light Protocol account setup
        const signature = await this.buildAndSendSubscribeZkTx(user, planAccount, membershipCommitment, encryptedUserCommitment, validityProof, { tree: defaultAccounts.addressTree, queue: defaultAccounts.addressQueue }, 0 // Default output state tree index
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
    async generateMembershipProof(subscription, treeInfo, signerKeypair, validityDurationSeconds) {
        return (0, generator_1.generateMembershipProof)(this.connection.rpcEndpoint, subscription, treeInfo, signerKeypair, validityDurationSeconds);
    }
    /**
     * Verify a membership proof off-chain
     */
    verifyMembershipProof(proof, expectedPlanId, verifierPublicKey) {
        return (0, verifier_1.verifyMembershipProof)(proof, expectedPlanId, verifierPublicKey);
    }
    /**
     * Migrate an existing PDA subscription to ZK compression
     */
    async migrateSubscriptionToZk(user, planAccount, originalSubscription, closeOriginal = false) {
        // Get default state tree accounts
        const defaultAccounts = (0, stateless_js_1.defaultTestStateTreeAccounts)();
        // Fetch original subscription to get membership commitment
        const accountInfo = await this.connection.getAccountInfo(originalSubscription);
        if (!accountInfo) {
            throw new Error("Original subscription not found");
        }
        // Parse membership commitment from account data (offset depends on account structure)
        const membershipCommitment = new Uint8Array(accountInfo.data.slice(64 + 32, 64 + 32 + 32) // Adjust offset based on actual structure
        );
        // Derive the compressed account address
        const compressedAddress = this.deriveCompressedSubscriptionAddress(planAccount, membershipCommitment, defaultAccounts.addressTree);
        // Get validity proof for the new address
        const validityProof = await this.rpc.getValidityProof([], [(0, stateless_js_1.bn)(compressedAddress)]);
        // Build and send the migration transaction
        const signature = await this.buildAndSendMigrateToZkTx(user, planAccount, originalSubscription, closeOriginal, validityProof, { tree: defaultAccounts.addressTree, queue: defaultAccounts.addressQueue }, 0 // Default output state tree index
        );
        return {
            signature,
            compressedAddress,
        };
    }
    /**
     * Get the ZK tracker PDA for a plan
     */
    getZkTrackerPda(planAccount) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("zk_tracker"), planAccount.toBuffer()], this.programId);
    }
    /**
     * Derive the compressed subscription address
     */
    deriveCompressedSubscriptionAddress(planAccount, membershipCommitment, addressTree) {
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
    async buildAndSendSubscribeZkTx(user, planAccount, membershipCommitment, encryptedUserCommitment, validityProof, addressTreeInfo, outputStateTreeIndex) {
        const [trackerPda] = this.getZkTrackerPda(planAccount);
        // Build instruction data
        // Note: This needs proper serialization based on the IDL
        const instruction = new web3_js_1.TransactionInstruction({
            keys: [
                { pubkey: user.publicKey, isSigner: true, isWritable: true },
                { pubkey: planAccount, isSigner: false, isWritable: false },
                { pubkey: trackerPda, isSigner: false, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                // Add Light Protocol accounts from remaining_accounts
            ],
            programId: this.programId,
            data: Buffer.alloc(0), // Placeholder - needs proper serialization
        });
        const tx = new web3_js_1.Transaction().add(instruction);
        return (0, web3_js_1.sendAndConfirmTransaction)(this.connection, tx, [user]);
    }
    /**
     * Build and send migrate_subscription_to_zk transaction
     */
    async buildAndSendMigrateToZkTx(user, planAccount, originalSubscription, closeOriginal, validityProof, addressTreeInfo, outputStateTreeIndex) {
        const [trackerPda] = this.getZkTrackerPda(planAccount);
        // Build instruction data
        const instruction = new web3_js_1.TransactionInstruction({
            keys: [
                { pubkey: user.publicKey, isSigner: true, isWritable: true },
                { pubkey: planAccount, isSigner: false, isWritable: false },
                { pubkey: originalSubscription, isSigner: false, isWritable: true },
                { pubkey: trackerPda, isSigner: false, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                // Add Light Protocol accounts from remaining_accounts
            ],
            programId: this.programId,
            data: Buffer.alloc(0), // Placeholder - needs proper serialization
        });
        const tx = new web3_js_1.Transaction().add(instruction);
        return (0, web3_js_1.sendAndConfirmTransaction)(this.connection, tx, [user]);
    }
}
exports.SublyZkClient = SublyZkClient;
//# sourceMappingURL=client.js.map