import { PublicKey } from "@solana/web3.js";
import { SEEDS, PROGRAM_ID } from "./constants";

/**
 * Derive ProtocolConfig PDA
 */
export function getProtocolConfigPDA(
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PROTOCOL_CONFIG)],
    programId
  );
}

/**
 * Derive ProtocolPool PDA
 */
export function getProtocolPoolPDA(
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PROTOCOL_POOL), mint.toBuffer()],
    programId
  );
}

/**
 * Derive Merchant PDA
 */
export function getMerchantPDA(
  wallet: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MERCHANT), wallet.toBuffer()],
    programId
  );
}

/**
 * Derive MerchantLedger PDA
 */
export function getMerchantLedgerPDA(
  merchant: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MERCHANT_LEDGER), merchant.toBuffer(), mint.toBuffer()],
    programId
  );
}

/**
 * Derive SubscriptionPlan PDA
 */
export function getSubscriptionPlanPDA(
  merchant: PublicKey,
  planId: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const planIdBuffer = Buffer.alloc(8);
  planIdBuffer.writeBigUInt64LE(planId);

  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SUBSCRIPTION_PLAN), merchant.toBuffer(), planIdBuffer],
    programId
  );
}

/**
 * Derive UserLedger PDA
 */
export function getUserLedgerPDA(
  user: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.USER_LEDGER), user.toBuffer(), mint.toBuffer()],
    programId
  );
}

/**
 * Derive UserSubscription PDA
 */
export function getUserSubscriptionPDA(
  user: PublicKey,
  subscriptionIndex: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(subscriptionIndex);

  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.USER_SUBSCRIPTION), user.toBuffer(), indexBuffer],
    programId
  );
}
