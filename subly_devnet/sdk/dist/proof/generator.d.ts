import { PublicKey, Keypair } from "@solana/web3.js";
import { Rpc, CompressedProofWithContext } from "@lightprotocol/stateless.js";
import { MembershipProof, CompressedSubscriptionData } from "../types/proof";
/**
 * Generate a membership commitment from user secret and plan ID
 * This is used to create a privacy-preserving identifier for the subscription
 */
export declare function generateMembershipCommitment(userSecret: Uint8Array, planId: PublicKey): Uint8Array;
/**
 * Generate an encrypted user commitment using Arcium encryption
 * This is a placeholder - actual implementation depends on Arcium SDK
 */
export declare function generateEncryptedUserCommitment(userCommitment: Uint8Array, _encryptionKey: Uint8Array): Uint8Array;
/**
 * Fetch validity proof from Light Protocol RPC
 */
export declare function fetchValidityProof(rpc: Rpc, accountHash: Uint8Array, _treeInfo: {
    tree: PublicKey;
    queue: PublicKey;
}): Promise<CompressedProofWithContext>;
/**
 * Generate a membership proof for off-chain verification
 */
export declare function generateMembershipProof(rpcUrl: string, subscription: CompressedSubscriptionData, treeInfo: {
    tree: PublicKey;
    queue: PublicKey;
}, signerKeypair: Keypair, validityDurationSeconds?: number): Promise<MembershipProof>;
//# sourceMappingURL=generator.d.ts.map