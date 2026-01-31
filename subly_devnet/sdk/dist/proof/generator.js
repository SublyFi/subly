"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMembershipCommitment = generateMembershipCommitment;
exports.generateEncryptedUserCommitment = generateEncryptedUserCommitment;
exports.fetchValidityProof = fetchValidityProof;
exports.generateMembershipProof = generateMembershipProof;
const stateless_js_1 = require("@lightprotocol/stateless.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
/**
 * Default proof validity duration (1 hour in seconds)
 */
const DEFAULT_PROOF_VALIDITY_SECONDS = 3600;
/**
 * Generate a membership commitment from user secret and plan ID
 * This is used to create a privacy-preserving identifier for the subscription
 */
function generateMembershipCommitment(userSecret, planId) {
    // Concatenate secret and plan ID, then hash
    const data = new Uint8Array(userSecret.length + 32);
    data.set(userSecret);
    data.set(planId.toBytes(), userSecret.length);
    // Use SHA-256 for the commitment
    return tweetnacl_1.default.hash(data).slice(0, 32);
}
/**
 * Generate an encrypted user commitment using Arcium encryption
 * This is a placeholder - actual implementation depends on Arcium SDK
 */
function generateEncryptedUserCommitment(userCommitment, _encryptionKey) {
    // Placeholder: In production, use Arcium MXE encryption
    // For now, just return the commitment as-is (NOT secure)
    return userCommitment;
}
/**
 * Fetch validity proof from Light Protocol RPC
 */
async function fetchValidityProof(rpc, accountHash, _treeInfo) {
    const proof = await rpc.getValidityProof([(0, stateless_js_1.bn)(accountHash)], []);
    return proof;
}
/**
 * Generate a membership proof for off-chain verification
 */
async function generateMembershipProof(rpcUrl, subscription, treeInfo, signerKeypair, validityDurationSeconds = DEFAULT_PROOF_VALIDITY_SECONDS) {
    const rpc = (0, stateless_js_1.createRpc)(rpcUrl);
    // Calculate account hash
    const accountHash = calculateCompressedAccountHash(subscription);
    // Fetch validity proof from Light Protocol
    const validityProof = await fetchValidityProof(rpc, accountHash, treeInfo);
    const now = Math.floor(Date.now() / 1000);
    const validUntil = now + validityDurationSeconds;
    // Generate nonce for replay protection
    const nonce = tweetnacl_1.default.randomBytes(32);
    // Create message to sign
    const message = createProofMessage(subscription.plan, subscription.membershipCommitment, nonce, validUntil);
    // Sign the message
    const signature = tweetnacl_1.default.sign.detached(message, signerKeypair.secretKey);
    // Convert validity proof to bytes
    const proofBytes = validityProof.compressedProof
        ? serializeCompressedProof(validityProof.compressedProof)
        : new Uint8Array(128);
    // Get root and leaf indices from the proof context
    const rootIndex = validityProof.rootIndices?.[0] ?? 0;
    const leafIndex = validityProof.leafIndices?.[0] ?? 0;
    return {
        planId: subscription.plan,
        membershipCommitment: subscription.membershipCommitment,
        validityProof: proofBytes,
        rootIndex,
        leafIndex,
        proofTimestamp: now,
        validUntil,
        signature: new Uint8Array(signature),
        nonce,
    };
}
/**
 * Calculate the hash of a compressed subscription account
 */
function calculateCompressedAccountHash(subscription) {
    const data = new Uint8Array(32 + // owner
        32 + // plan
        32 + // membershipCommitment
        32 + // encryptedUserCommitment
        64 + // encryptedStatus
        16 + // statusNonce
        8 + // createdAt
        1 // isActive
    );
    let offset = 0;
    data.set(subscription.owner.toBytes(), offset);
    offset += 32;
    data.set(subscription.plan.toBytes(), offset);
    offset += 32;
    data.set(subscription.membershipCommitment, offset);
    offset += 32;
    data.set(subscription.encryptedUserCommitment, offset);
    offset += 32;
    data.set(subscription.encryptedStatus, offset);
    offset += 64;
    data.set(subscription.statusNonce, offset);
    offset += 16;
    const timestampBytes = new ArrayBuffer(8);
    new DataView(timestampBytes).setBigInt64(0, BigInt(subscription.createdAt), true);
    data.set(new Uint8Array(timestampBytes), offset);
    offset += 8;
    data[offset] = subscription.isActive ? 1 : 0;
    return tweetnacl_1.default.hash(data).slice(0, 32);
}
/**
 * Create the message that gets signed for proof verification
 */
function createProofMessage(planId, membershipCommitment, nonce, validUntil) {
    const message = new Uint8Array(32 + 32 + 32 + 8);
    let offset = 0;
    message.set(planId.toBytes(), offset);
    offset += 32;
    message.set(membershipCommitment, offset);
    offset += 32;
    message.set(nonce, offset);
    offset += 32;
    const timestampBytes = new ArrayBuffer(8);
    new DataView(timestampBytes).setBigInt64(0, BigInt(validUntil), true);
    message.set(new Uint8Array(timestampBytes), offset);
    return message;
}
/**
 * Serialize a compressed proof to bytes
 */
function serializeCompressedProof(proof) {
    const result = new Uint8Array(128);
    let offset = 0;
    // a: 64 bytes (2 * 32)
    for (const val of proof.a) {
        result[offset++] = val;
    }
    // Pad if needed
    while (offset < 64) {
        result[offset++] = 0;
    }
    // b: 32 bytes
    for (const val of proof.b) {
        result[offset++] = val;
    }
    while (offset < 96) {
        result[offset++] = 0;
    }
    // c: 32 bytes
    for (const val of proof.c) {
        result[offset++] = val;
    }
    while (offset < 128) {
        result[offset++] = 0;
    }
    return result;
}
//# sourceMappingURL=generator.js.map