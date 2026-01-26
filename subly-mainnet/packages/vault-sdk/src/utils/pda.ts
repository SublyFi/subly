import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "../types";

/**
 * PDA seeds constants
 */
export const SHIELD_POOL_SEED = Buffer.from("shield_pool");
export const USER_SHARE_SEED = Buffer.from("share");
export const DEPOSIT_HISTORY_SEED = Buffer.from("deposit_history");
export const SCHEDULED_TRANSFER_SEED = Buffer.from("transfer");
export const TRANSFER_HISTORY_SEED = Buffer.from("history");
export const NULLIFIER_SEED = Buffer.from("nullifier");
export const BATCH_PROOF_SEED = Buffer.from("batch_proof");

/**
 * Derive the Shield Pool PDA address
 */
export function getShieldPoolPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SHIELD_POOL_SEED], programId);
}

/**
 * Derive the User Share PDA address
 * @param pool - Shield Pool address
 * @param commitment - User commitment (32 bytes)
 */
export function getUserSharePda(
  pool: PublicKey,
  commitment: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_SHARE_SEED, pool.toBuffer(), Buffer.from(commitment)],
    programId
  );
}

/**
 * Derive the Deposit History PDA address
 * @param commitment - User commitment (32 bytes)
 * @param depositIndex - Index of this deposit
 */
export function getDepositHistoryPda(
  commitment: Uint8Array,
  depositIndex: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(depositIndex);

  return PublicKey.findProgramAddressSync(
    [DEPOSIT_HISTORY_SEED, Buffer.from(commitment), indexBuffer],
    programId
  );
}

/**
 * Derive the Scheduled Transfer PDA address
 * @param commitment - User commitment (32 bytes)
 * @param transferNonce - Unique nonce for this transfer
 */
export function getScheduledTransferPda(
  commitment: Uint8Array,
  transferNonce: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(transferNonce);

  return PublicKey.findProgramAddressSync(
    [SCHEDULED_TRANSFER_SEED, Buffer.from(commitment), nonceBuffer],
    programId
  );
}

/**
 * Derive the Transfer History PDA address
 * @param scheduledTransfer - Scheduled transfer address
 * @param executionIndex - Index of this execution
 */
export function getTransferHistoryPda(
  scheduledTransfer: PublicKey,
  executionIndex: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(executionIndex);

  return PublicKey.findProgramAddressSync(
    [TRANSFER_HISTORY_SEED, scheduledTransfer.toBuffer(), indexBuffer],
    programId
  );
}

/**
 * Derive the Nullifier PDA address
 * @param nullifierHash - Nullifier hash (32 bytes)
 */
export function getNullifierPda(
  nullifierHash: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [NULLIFIER_SEED, Buffer.from(nullifierHash)],
    programId
  );
}

/**
 * Derive the Batch Proof PDA address
 * @param scheduledTransfer - Scheduled transfer address
 * @param executionIndex - Index of this execution
 */
export function getBatchProofPda(
  scheduledTransfer: PublicKey,
  executionIndex: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(executionIndex);

  return PublicKey.findProgramAddressSync(
    [BATCH_PROOF_SEED, scheduledTransfer.toBuffer(), indexBuffer],
    programId
  );
}
