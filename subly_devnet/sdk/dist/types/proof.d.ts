import { PublicKey } from "@solana/web3.js";
/**
 * Membership proof data structure for off-chain verification
 */
export interface MembershipProof {
    /** The plan this membership proves subscription to */
    planId: PublicKey;
    /** Membership commitment hash */
    membershipCommitment: Uint8Array;
    /** Validity proof from Light Protocol (128 bytes) */
    validityProof: Uint8Array;
    /** Root index in the state tree */
    rootIndex: number;
    /** Leaf index in the state tree */
    leafIndex: number;
    /** Timestamp when proof was generated */
    proofTimestamp: number;
    /** Proof expiry timestamp */
    validUntil: number;
    /** Signature for replay protection */
    signature: Uint8Array;
    /** Nonce for replay protection */
    nonce: Uint8Array;
}
/**
 * Result of proof verification
 */
export interface ProofVerificationResult {
    /** Whether the proof is valid */
    isValid: boolean;
    /** Error message if invalid */
    error?: string;
    /** Verification timestamp */
    verifiedAt: number;
    /** Plan the membership was verified for */
    planId: PublicKey;
}
/**
 * Compressed subscription data
 */
export interface CompressedSubscriptionData {
    /** Owner of the subscription */
    owner: PublicKey;
    /** Plan the subscription belongs to */
    plan: PublicKey;
    /** Membership commitment for ZK proofs */
    membershipCommitment: Uint8Array;
    /** Encrypted user commitment (Arcium) */
    encryptedUserCommitment: Uint8Array;
    /** Encrypted status (Arcium) */
    encryptedStatus: Uint8Array;
    /** Status nonce */
    statusNonce: Uint8Array;
    /** Creation timestamp */
    createdAt: number;
    /** Whether subscription is active */
    isActive: boolean;
}
export type { CompressedProofWithContext as LightValidityProof } from "@lightprotocol/stateless.js";
/**
 * Address tree info for creating new compressed accounts
 */
export interface AddressTreeInfo {
    tree: PublicKey;
    queue: PublicKey;
}
//# sourceMappingURL=proof.d.ts.map