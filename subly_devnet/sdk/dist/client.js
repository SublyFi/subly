"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SublyArciumClient = exports.SublyZkClient = exports.PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
const stateless_js_1 = require("@lightprotocol/stateless.js");
const arcium_1 = require("./types/arcium");
const generator_1 = require("./proof/generator");
const verifier_1 = require("./proof/verifier");
const crypto_1 = require("crypto");
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
/**
 * Subly Arcium Client for interacting with MXE-encrypted subscriptions
 *
 * This client provides methods to:
 * - Subscribe with Arcium MXE encryption (subscribe_with_arcium)
 * - Cancel subscriptions with encryption (cancel_subscription_with_arcium)
 * - Query encrypted subscription status
 */
class SublyArciumClient {
    constructor(rpcUrl, programId = exports.PROGRAM_ID) {
        this.connection = new web3_js_1.Connection(rpcUrl);
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
    async subscribeWithArcium(user, planAccount, encryptedUserCommitment, membershipCommitment, nonce) {
        // Generate a unique computation offset
        const computationOffset = (0, arcium_1.generateComputationOffset)();
        // Get Arcium accounts
        const arciumAccounts = (0, arcium_1.getArciumAccounts)(user.publicKey, this.programId, computationOffset, arcium_1.COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE);
        // Derive subscription PDA
        const [subscriptionAccount] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("subscription"),
            planAccount.toBuffer(),
            Buffer.from(membershipCommitment),
        ], this.programId);
        // Build instruction
        const discriminator = this.calculateDiscriminator("subscribe_with_arcium");
        const instructionData = this.encodeSubscribeWithArciumData(computationOffset, encryptedUserCommitment, membershipCommitment, nonce);
        const keys = [
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
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: arcium_1.ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
            // Custom accounts
            { pubkey: planAccount, isSigner: false, isWritable: true },
            { pubkey: subscriptionAccount, isSigner: false, isWritable: true },
        ];
        const instruction = new web3_js_1.TransactionInstruction({
            keys,
            programId: this.programId,
            data: Buffer.concat([discriminator, instructionData]),
        });
        const tx = new web3_js_1.Transaction().add(instruction);
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, tx, [user]);
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
    async cancelSubscriptionWithArcium(user, subscriptionAccount, planAccount) {
        // Generate a unique computation offset
        const computationOffset = (0, arcium_1.generateComputationOffset)();
        // Get Arcium accounts
        const arciumAccounts = (0, arcium_1.getArciumAccounts)(user.publicKey, this.programId, computationOffset, arcium_1.COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED);
        // Build instruction
        const discriminator = this.calculateDiscriminator("cancel_subscription_with_arcium");
        const instructionData = this.encodeCancelSubscriptionWithArciumData(computationOffset);
        const keys = [
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
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: arcium_1.ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
            // Custom accounts
            { pubkey: subscriptionAccount, isSigner: false, isWritable: true },
            { pubkey: planAccount, isSigner: false, isWritable: true },
        ];
        const instruction = new web3_js_1.TransactionInstruction({
            keys,
            programId: this.programId,
            data: Buffer.concat([discriminator, instructionData]),
        });
        const tx = new web3_js_1.Transaction().add(instruction);
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, tx, [user]);
        return {
            signature,
            computationOffset,
        };
    }
    /**
     * Get subscription account data
     */
    async getSubscription(subscriptionAccount) {
        const accountInfo = await this.connection.getAccountInfo(subscriptionAccount);
        if (!accountInfo) {
            return null;
        }
        // Parse account data (simplified - should use IDL-based deserialization)
        const data = accountInfo.data;
        const plan = new web3_js_1.PublicKey(data.slice(8 + 32, 8 + 32 + 32)); // After discriminator + subscription_id
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
    async waitForEncryptionCallback(subscriptionAccount, timeoutMs = 60000, pollIntervalMs = 2000) {
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
    calculateDiscriminator(instructionName) {
        const hash = (0, crypto_1.createHash)("sha256")
            .update(`global:${instructionName}`)
            .digest();
        return hash.slice(0, 8);
    }
    /**
     * Encode subscribe_with_arcium instruction data
     */
    encodeSubscribeWithArciumData(computationOffset, encryptedUserCommitment, membershipCommitment, nonce) {
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
    encodeCancelSubscriptionWithArciumData(computationOffset) {
        // Encode: computation_offset (u64)
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(computationOffset, 0);
        return buffer;
    }
    /**
     * Derive subscription PDA
     */
    deriveSubscriptionPda(planAccount, membershipCommitment) {
        return web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("subscription"),
            planAccount.toBuffer(),
            Buffer.from(membershipCommitment),
        ], this.programId);
    }
    /**
     * Get MXE account PDA
     */
    getMxeAccountPda() {
        return (0, arcium_1.deriveMxePda)(this.programId);
    }
}
exports.SublyArciumClient = SublyArciumClient;
//# sourceMappingURL=client.js.map