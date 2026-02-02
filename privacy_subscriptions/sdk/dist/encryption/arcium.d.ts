import { RescueCipher } from '@arcium-hq/client';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
/** Arcium Program ID */
export declare const ARCIUM_PROGRAM_ID: PublicKey;
/** Arcium Fee Pool Account */
export declare const ARCIUM_FEE_POOL_ACCOUNT: PublicKey;
/** Arcium Clock Account */
export declare const ARCIUM_CLOCK_ACCOUNT: PublicKey;
/** Sign PDA Seed */
export declare const SIGN_PDA_SEED: Buffer<ArrayBuffer>;
/** Computation definition offsets (matching the Rust program) */
export declare const COMP_DEF_OFFSETS: {
    readonly deposit_v2: 1894255896;
    readonly withdraw_v2: 2549376853;
    readonly subscribe_v2: 524592853;
    readonly unsubscribe_v2: 3264881130;
    readonly process_payment_v2: 930732409;
    readonly verify_subscription_v2: 1451574225;
    readonly claim_revenue_v2: 2315398764;
};
export type ComputationType = keyof typeof COMP_DEF_OFFSETS;
/**
 * Message used for deriving deterministic encryption keys.
 * IMPORTANT: Do not change this message as it would break existing encrypted data.
 */
export declare const ENCRYPTION_SIGNING_MESSAGE = "Subly Privacy Subscriptions - Encryption Key Derivation v1";
/**
 * Context for Arcium encryption/decryption
 */
export interface ArciumContext {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    sharedSecret: Uint8Array;
    cipher: RescueCipher;
}
/**
 * Wallet interface for signMessage-based encryption
 */
export interface SignMessageWallet {
    publicKey: PublicKey;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}
/**
 * Get MXE public key with retry logic
 */
export declare function getMXEPublicKeyWithRetry(connection: Connection, programId?: PublicKey, maxRetries?: number): Promise<Uint8Array>;
/**
 * Derive deterministic X25519 encryption key from a wallet signature.
 */
export declare function deriveEncryptionKeyFromSignature(signature: Uint8Array): Promise<{
    privateKey: Uint8Array;
    publicKey: Uint8Array;
}>;
/**
 * Create Arcium encryption context from a wallet signature (deterministic).
 */
export declare function createArciumContextFromSignature(connection: Connection, signature: Uint8Array, programId?: PublicKey): Promise<ArciumContext>;
/**
 * Create Arcium encryption context using wallet.signMessage().
 */
export declare function createArciumContextFromWallet(connection: Connection, wallet: SignMessageWallet, programId?: PublicKey): Promise<ArciumContext>;
/**
 * Convert a u128 nonce to 16 bytes (little-endian)
 */
export declare function nonceToBytes(nonce: BN | bigint): Uint8Array;
/**
 * Convert 16-byte little-endian nonce into a bigint
 */
export declare function bytesToU128(bytes: Uint8Array): bigint;
/**
 * Generate a random 16-byte nonce for encryption
 */
export declare function generateNonce(): Uint8Array;
/**
 * Encrypt one or more values with the Arcium cipher
 */
export declare function encryptValues(cipher: RescueCipher, values: bigint[], nonce: Uint8Array): Uint8Array[];
/**
 * Decrypt one or more values using the Arcium cipher
 */
export declare function decryptValues(cipher: RescueCipher, encryptedValues: Array<number[] | Uint8Array>, nonce: Uint8Array): bigint[];
/**
 * Decrypt a single value using the Arcium cipher
 */
export declare function decryptValue(cipher: RescueCipher, encryptedValue: number[] | Uint8Array, nonce: Uint8Array): bigint;
/**
 * Split a PublicKey into two u128 values (little-endian)
 */
export declare function pubkeyToU128s(pubkey: PublicKey): [bigint, bigint];
/**
 * Combine two u128 values into a PublicKey (little-endian)
 */
export declare function u128sToPubkey(parts: [bigint, bigint]): PublicKey;
/**
 * Derive the Sign PDA for this program
 */
export declare function deriveSignPDA(programId?: PublicKey): [PublicKey, number];
/**
 * Derive the computation definition PDA for a specific computation type
 */
export declare function deriveComputationDefinitionPDA(computationType: ComputationType, programId?: PublicKey): [PublicKey, number];
/**
 * Get Arcium account addresses for transaction construction
 */
export declare function getArciumAccounts(programId: PublicKey, computationType: ComputationType, computationOffset: BN, clusterOffset: number): {
    mxeAccount: PublicKey;
    mempoolAccount: PublicKey;
    executingPool: PublicKey;
    computationAccount: PublicKey;
    compDefAccount: PublicKey;
    clusterAccount: PublicKey;
};
/**
 * Get computation offset (for compute account PDA derivation)
 */
export declare function getNextComputationOffset(): Promise<BN>;
/**
 * Generate a random computation offset
 */
export declare function generateComputationOffset(): BN;
//# sourceMappingURL=arcium.d.ts.map