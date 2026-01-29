import { PublicKey } from "@solana/web3.js";
import { MembershipProof, ProofVerificationResult } from "../types/proof";
/**
 * Verify a membership proof off-chain
 * This checks the signature, expiry, and membership commitment
 */
export declare function verifyMembershipProof(proof: MembershipProof, expectedPlanId: PublicKey, verifierPublicKey: Uint8Array): ProofVerificationResult;
/**
 * Check if a proof has expired
 */
export declare function isProofExpired(proof: MembershipProof): boolean;
/**
 * Verify only the signature of a proof
 */
export declare function verifyProofSignature(proof: MembershipProof, verifierPublicKey: Uint8Array): boolean;
/**
 * Check remaining validity time in seconds
 */
export declare function getProofRemainingValidity(proof: MembershipProof): number;
//# sourceMappingURL=verifier.d.ts.map