import { PublicKey } from '@solana/web3.js';
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
    readonly deposit: 0;
    readonly withdraw: 1;
    readonly subscribe: 2;
    readonly unsubscribe: 3;
    readonly process_payment: 4;
    readonly verify_subscription: 5;
    readonly claim_revenue: 6;
};
export type ComputationType = keyof typeof COMP_DEF_OFFSETS;
/**
 * Arcium client wrapper for SDK usage
 */
export interface ArciumClientWrapper {
    /** MXE Account public key */
    mxeAccount: PublicKey;
    /** Cluster account public key */
    clusterAccount: PublicKey;
    /** Encrypt a value using Arcium */
    encryptU64(value: BN | number): Promise<EncryptedValue>;
    /** Get a random nonce */
    getNonce(): BN;
    /** Get the X25519 public key for encryption */
    getPublicKey(): Uint8Array;
}
/**
 * Encrypted value with metadata
 */
export interface EncryptedValue {
    ciphertext: Uint8Array;
    nonce: BN;
    pubkey: Uint8Array;
}
/**
 * Derive the MXE PDA for this program
 */
export declare function deriveMxePDA(programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Sign PDA for this program
 */
export declare function deriveSignPDA(programId?: PublicKey): [PublicKey, number];
/**
 * Derive the computation definition PDA for a specific computation type
 */
export declare function deriveComputationDefinitionPDA(computationType: ComputationType, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the mempool PDA from MXE account
 */
export declare function deriveMempoolPDA(mxeAccount: PublicKey): [PublicKey, number];
/**
 * Derive the executing pool PDA from MXE account
 */
export declare function deriveExecPoolPDA(mxeAccount: PublicKey): [PublicKey, number];
/**
 * Derive the computation PDA
 */
export declare function deriveComputationPDA(computationOffset: BN | number, mxeAccount: PublicKey): [PublicKey, number];
/**
 * Derive the cluster PDA from MXE account
 */
export declare function deriveClusterPDA(mxeAccount: PublicKey): [PublicKey, number];
/**
 * Simple encryption wrapper for SDK use
 * Note: In production, this should use the actual @arcium-hq/client library
 */
export declare function createSimpleEncryptor(): {
    encrypt: (value: BN | number) => EncryptedValue;
    getNonce: () => BN;
    getPublicKey: () => Uint8Array;
};
/**
 * Initialize Arcium client wrapper
 * Note: This is a simplified version. In production, use @arcium-hq/client
 */
export declare function initArciumClient(programId?: PublicKey): Promise<ArciumClientWrapper>;
/**
 * Get computation offset (for compute account PDA derivation)
 */
export declare function getNextComputationOffset(): Promise<BN>;
//# sourceMappingURL=arcium.d.ts.map