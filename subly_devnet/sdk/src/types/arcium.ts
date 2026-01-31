import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";

// Arcium Program ID (Devnet)
export const ARCIUM_PROGRAM_ID = new PublicKey("arc1uuMMTZwHitCq5nNDH7KHFTz3xAiPwWsqpHzEDJy");

// Arcium Devnet Constants
export const ARCIUM_CLUSTER_OFFSET = 456;
export const ARCIUM_FEE_POOL_ACCOUNT_ADDRESS = new PublicKey("DeVKcN6Nb9Y8KjLWZbTWmLj7z8eCBRnU4n5r4GvhzLhK");
export const ARCIUM_CLOCK_ACCOUNT_ADDRESS = new PublicKey("SysvarC1ock11111111111111111111111111111111");
export const INSTRUCTIONS_SYSVAR_ID = new PublicKey("Sysvar1nstructions1111111111111111111111111");

/**
 * Compute comp_def_offset from instruction name
 * This matches arcium_anchor::comp_def_offset() which computes:
 * sha256(name).slice(0,4) as little-endian u32
 */
export function computeCompDefOffset(name: string): number {
  const hash = createHash("sha256").update(name).digest();
  return hash.readUInt32LE(0);
}

// Computation Definition Offsets
// These are computed using sha256(name).slice(0,4) as little-endian u32
// to match the Rust constants in arcium/constants.rs
export const COMP_DEF_OFFSETS = {
  INCREMENT_COUNT: computeCompDefOffset("increment_count"),
  DECREMENT_COUNT: computeCompDefOffset("decrement_count"),
  INITIALIZE_COUNT: computeCompDefOffset("initialize_count"),
  SET_SUBSCRIPTION_ACTIVE: computeCompDefOffset("set_subscription_active"),
  SET_SUBSCRIPTION_CANCELLED: computeCompDefOffset("set_subscription_cancelled"),
  INITIALIZE_SUBSCRIPTION_STATUS: computeCompDefOffset("initialize_subscription_status"),
} as const;

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
export function deriveMxePda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mxe")],
    programId
  );
  return pda;
}

/**
 * Derive Mempool PDA from MXE account
 */
export function deriveMempoolPda(mxeAccount: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mempool"), mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive Executing Pool PDA from MXE account
 */
export function deriveExecPoolPda(mxeAccount: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("execpool"), mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive Computation PDA from offset and MXE account
 */
export function deriveComputationPda(
  computationOffset: bigint,
  mxeAccount: PublicKey
): PublicKey {
  const offsetBuffer = Buffer.alloc(8);
  offsetBuffer.writeBigUInt64LE(computationOffset);

  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("computation"), offsetBuffer, mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive Computation Definition PDA from offset
 */
export function deriveCompDefPda(
  compDefOffset: number,
  programId: PublicKey
): PublicKey {
  const offsetBuffer = Buffer.alloc(4);
  offsetBuffer.writeUInt32LE(compDefOffset);

  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("comp_def"), offsetBuffer],
    programId
  );
  return pda;
}

/**
 * Derive Cluster PDA from MXE account
 */
export function deriveClusterPda(mxeAccount: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cluster"), mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive Sign PDA for CPI signing
 */
export function deriveSignPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("ArciumSignerAccount")],
    programId
  );
  return pda;
}

/**
 * Get all Arcium accounts needed for a queue_computation CPI
 */
export function getArciumAccounts(
  payer: PublicKey,
  programId: PublicKey,
  computationOffset: bigint,
  compDefOffset: number
): ArciumAccounts {
  const mxeAccount = deriveMxePda(programId);

  return {
    payer,
    mxeAccount,
    mempoolAccount: deriveMempoolPda(mxeAccount),
    executingPool: deriveExecPoolPda(mxeAccount),
    computationAccount: deriveComputationPda(computationOffset, mxeAccount),
    compDefAccount: deriveCompDefPda(compDefOffset, programId),
    clusterAccount: deriveClusterPda(mxeAccount),
    poolAccount: ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    clockAccount: ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    signPdaAccount: deriveSignPda(programId),
    systemProgram: PublicKey.default,
    arciumProgram: ARCIUM_PROGRAM_ID,
  };
}

/**
 * Generate a random computation offset (u64)
 */
export function generateComputationOffset(): bigint {
  const buffer = new Uint8Array(8);
  crypto.getRandomValues(buffer);
  return new DataView(buffer.buffer).getBigUint64(0, true);
}

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
export function getArciumCallbackAccounts(
  programId: PublicKey,
  compDefOffset: number,
  computationOffset: bigint
): ArciumCallbackAccounts {
  const mxeAccount = deriveMxePda(programId);

  return {
    arciumProgram: ARCIUM_PROGRAM_ID,
    compDefAccount: deriveCompDefPda(compDefOffset, programId),
    mxeAccount,
    computationAccount: deriveComputationPda(computationOffset, mxeAccount),
    clusterAccount: deriveClusterPda(mxeAccount),
    instructionsSysvar: INSTRUCTIONS_SYSVAR_ID,
  };
}

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
export function getInitCompDefAccounts(
  payer: PublicKey,
  programId: PublicKey,
  compDefOffset: number
): InitCompDefAccounts {
  const mxeAccount = deriveMxePda(programId);

  return {
    payer,
    mxeAccount,
    compDefAccount: deriveCompDefPda(compDefOffset, programId),
    clusterAccount: deriveClusterPda(mxeAccount),
    systemProgram: PublicKey.default,
    arciumProgram: ARCIUM_PROGRAM_ID,
  };
}
