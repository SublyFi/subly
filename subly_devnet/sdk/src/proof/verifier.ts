import { PublicKey } from "@solana/web3.js";
import { MembershipProof, ProofVerificationResult } from "../types/proof";
import nacl from "tweetnacl";

/**
 * Verify a membership proof off-chain
 * This checks the signature, expiry, and membership commitment
 */
export function verifyMembershipProof(
  proof: MembershipProof,
  expectedPlanId: PublicKey,
  verifierPublicKey: Uint8Array
): ProofVerificationResult {
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
  const message = createProofMessage(
    proof.planId,
    proof.membershipCommitment,
    proof.nonce,
    proof.validUntil
  );

  const isSignatureValid = nacl.sign.detached.verify(
    message,
    proof.signature,
    verifierPublicKey
  );

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
export function isProofExpired(proof: MembershipProof): boolean {
  const now = Math.floor(Date.now() / 1000);
  return proof.validUntil < now;
}

/**
 * Verify only the signature of a proof
 */
export function verifyProofSignature(
  proof: MembershipProof,
  verifierPublicKey: Uint8Array
): boolean {
  const message = createProofMessage(
    proof.planId,
    proof.membershipCommitment,
    proof.nonce,
    proof.validUntil
  );

  return nacl.sign.detached.verify(message, proof.signature, verifierPublicKey);
}

/**
 * Check remaining validity time in seconds
 */
export function getProofRemainingValidity(proof: MembershipProof): number {
  const now = Math.floor(Date.now() / 1000);
  const remaining = proof.validUntil - now;
  return Math.max(0, remaining);
}

/**
 * Create the message that gets signed for proof verification
 */
function createProofMessage(
  planId: PublicKey,
  membershipCommitment: Uint8Array,
  nonce: Uint8Array,
  validUntil: number
): Uint8Array {
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
