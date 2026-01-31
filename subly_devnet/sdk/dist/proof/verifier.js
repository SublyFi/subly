"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMembershipProof = verifyMembershipProof;
exports.isProofExpired = isProofExpired;
exports.verifyProofSignature = verifyProofSignature;
exports.getProofRemainingValidity = getProofRemainingValidity;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
/**
 * Verify a membership proof off-chain
 * This checks the signature, expiry, and membership commitment
 */
function verifyMembershipProof(proof, expectedPlanId, verifierPublicKey) {
    const now = Math.floor(Date.now() / 1000);
    // Check proof expiry
    if (proof.validUntil < now) {
        return {
            isValid: false,
            error: "Proof has expired",
            verifiedAt: now,
            planId: proof.planId,
        };
    }
    // Verify plan ID matches
    if (!proof.planId.equals(expectedPlanId)) {
        return {
            isValid: false,
            error: "Plan ID mismatch",
            verifiedAt: now,
            planId: proof.planId,
        };
    }
    // Verify the signature
    const message = createProofMessage(proof.planId, proof.membershipCommitment, proof.nonce, proof.validUntil);
    const isSignatureValid = tweetnacl_1.default.sign.detached.verify(message, proof.signature, verifierPublicKey);
    if (!isSignatureValid) {
        return {
            isValid: false,
            error: "Invalid signature",
            verifiedAt: now,
            planId: proof.planId,
        };
    }
    // Verify membership commitment is not empty
    if (proof.membershipCommitment.every((b) => b === 0)) {
        return {
            isValid: false,
            error: "Empty membership commitment",
            verifiedAt: now,
            planId: proof.planId,
        };
    }
    return {
        isValid: true,
        verifiedAt: now,
        planId: proof.planId,
    };
}
/**
 * Check if a proof has expired
 */
function isProofExpired(proof) {
    const now = Math.floor(Date.now() / 1000);
    return proof.validUntil < now;
}
/**
 * Verify only the signature of a proof
 */
function verifyProofSignature(proof, verifierPublicKey) {
    const message = createProofMessage(proof.planId, proof.membershipCommitment, proof.nonce, proof.validUntil);
    return tweetnacl_1.default.sign.detached.verify(message, proof.signature, verifierPublicKey);
}
/**
 * Check remaining validity time in seconds
 */
function getProofRemainingValidity(proof) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = proof.validUntil - now;
    return Math.max(0, remaining);
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
//# sourceMappingURL=verifier.js.map