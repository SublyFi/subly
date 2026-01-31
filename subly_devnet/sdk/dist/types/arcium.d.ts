import { PublicKey } from "@solana/web3.js";
export declare const ARCIUM_PROGRAM_ID: PublicKey;
export declare const ARCIUM_CLUSTER_OFFSET = 456;
export declare const ARCIUM_FEE_POOL_ACCOUNT_ADDRESS: PublicKey;
export declare const ARCIUM_CLOCK_ACCOUNT_ADDRESS: PublicKey;
export declare const INSTRUCTIONS_SYSVAR_ID: PublicKey;
/**
 * Compute comp_def_offset from instruction name
 * This matches arcium_anchor::comp_def_offset() which computes:
 * sha256(name).slice(0,4) as little-endian u32
 */
export declare function computeCompDefOffset(name: string): number;
export declare const COMP_DEF_OFFSETS: {
    readonly INCREMENT_COUNT: number;
    readonly DECREMENT_COUNT: number;
    readonly INITIALIZE_COUNT: number;
    readonly SET_SUBSCRIPTION_ACTIVE: number;
    readonly SET_SUBSCRIPTION_CANCELLED: number;
    readonly INITIALIZE_SUBSCRIPTION_STATUS: number;
};
/**
 * Arcium accounts needed for queue_computation CPI
 */
export interface ArciumAccounts {
    /** Payer for the computation */
    payer: PublicKey;
    /** MXE Account PDA */
    mxeAccount: PublicKey;
    /** Mempool Account PDA */
    mempoolAccount: PublicKey;
    /** Executing Pool PDA */
    executingPool: PublicKey;
    /** Computation Account PDA (unique per computation) */
    computationAccount: PublicKey;
    /** Computation Definition Account PDA (per circuit) */
    compDefAccount: PublicKey;
    /** Cluster Account PDA */
    clusterAccount: PublicKey;
    /** Fee Pool Account */
    poolAccount: PublicKey;
    /** Clock Account */
    clockAccount: PublicKey;
    /** Sign PDA for CPI signing */
    signPdaAccount: PublicKey;
    /** System Program */
    systemProgram: PublicKey;
    /** Arcium Program */
    arciumProgram: PublicKey;
}
/**
 * Derive MXE PDA
 */
export declare function deriveMxePda(programId: PublicKey): PublicKey;
/**
 * Derive Mempool PDA from MXE account
 */
export declare function deriveMempoolPda(mxeAccount: PublicKey): PublicKey;
/**
 * Derive Executing Pool PDA from MXE account
 */
export declare function deriveExecPoolPda(mxeAccount: PublicKey): PublicKey;
/**
 * Derive Computation PDA from offset and MXE account
 */
export declare function deriveComputationPda(computationOffset: bigint, mxeAccount: PublicKey): PublicKey;
/**
 * Derive Computation Definition PDA from offset
 */
export declare function deriveCompDefPda(compDefOffset: number, programId: PublicKey): PublicKey;
/**
 * Derive Cluster PDA from MXE account
 */
export declare function deriveClusterPda(mxeAccount: PublicKey): PublicKey;
/**
 * Derive Sign PDA for CPI signing
 */
export declare function deriveSignPda(programId: PublicKey): PublicKey;
/**
 * Get all Arcium accounts needed for a queue_computation CPI
 */
export declare function getArciumAccounts(payer: PublicKey, programId: PublicKey, computationOffset: bigint, compDefOffset: number): ArciumAccounts;
/**
 * Generate a random computation offset (u64)
 */
export declare function generateComputationOffset(): bigint;
/**
 * Standard Arcium callback accounts (6 accounts in required order)
 * These are added by the #[callback_accounts] macro
 */
export interface ArciumCallbackAccounts {
    /** Arcium Program */
    arciumProgram: PublicKey;
    /** Computation Definition Account */
    compDefAccount: PublicKey;
    /** MXE Account */
    mxeAccount: PublicKey;
    /** Computation Account */
    computationAccount: PublicKey;
    /** Cluster Account */
    clusterAccount: PublicKey;
    /** Instructions Sysvar */
    instructionsSysvar: PublicKey;
}
/**
 * Get standard Arcium callback accounts
 */
export declare function getArciumCallbackAccounts(programId: PublicKey, compDefOffset: number, computationOffset: bigint): ArciumCallbackAccounts;
/**
 * Accounts needed for init_comp_def instructions
 */
export interface InitCompDefAccounts {
    /** Payer for the transaction */
    payer: PublicKey;
    /** MXE Account PDA */
    mxeAccount: PublicKey;
    /** Computation Definition Account PDA (to be initialized) */
    compDefAccount: PublicKey;
    /** Cluster Account PDA */
    clusterAccount: PublicKey;
    /** System Program */
    systemProgram: PublicKey;
    /** Arcium Program */
    arciumProgram: PublicKey;
}
/**
 * Get accounts for init_comp_def instruction
 */
export declare function getInitCompDefAccounts(payer: PublicKey, programId: PublicKey, compDefOffset: number): InitCompDefAccounts;
//# sourceMappingURL=arcium.d.ts.map