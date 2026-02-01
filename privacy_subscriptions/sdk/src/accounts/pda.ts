import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/** Default program ID for Privacy Subscriptions */
export const PROGRAM_ID = new PublicKey('8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2');

/** PDA Seeds */
export const PROTOCOL_CONFIG_SEED = Buffer.from('protocol_config');
export const PROTOCOL_POOL_SEED = Buffer.from('protocol_pool');
export const MERCHANT_SEED = Buffer.from('merchant');
export const MERCHANT_LEDGER_SEED = Buffer.from('merchant_ledger');
export const SUBSCRIPTION_PLAN_SEED = Buffer.from('subscription_plan');
export const USER_LEDGER_SEED = Buffer.from('user_ledger');
export const USER_SUBSCRIPTION_SEED = Buffer.from('user_subscription');

/**
 * Derives the Protocol Config PDA
 * Seeds: ["protocol_config"]
 */
export function deriveProtocolConfigPDA(
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROTOCOL_CONFIG_SEED],
    programId
  );
}

/**
 * Derives the Protocol Pool PDA for a specific mint
 * Seeds: ["protocol_pool", mint]
 */
export function deriveProtocolPoolPDA(
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROTOCOL_POOL_SEED, mint.toBuffer()],
    programId
  );
}

/**
 * Derives the Merchant PDA for a wallet
 * Seeds: ["merchant", wallet]
 */
export function deriveMerchantPDA(
  wallet: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MERCHANT_SEED, wallet.toBuffer()],
    programId
  );
}

/**
 * Derives the Merchant Ledger PDA
 * Seeds: ["merchant_ledger", merchant, mint]
 */
export function deriveMerchantLedgerPDA(
  merchant: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MERCHANT_LEDGER_SEED, merchant.toBuffer(), mint.toBuffer()],
    programId
  );
}

/**
 * Derives the Subscription Plan PDA
 * Seeds: ["subscription_plan", merchant, plan_id.to_le_bytes()]
 */
export function deriveSubscriptionPlanPDA(
  merchant: PublicKey,
  planId: BN | number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const planIdBN = BN.isBN(planId) ? planId : new BN(planId);
  const planIdBuffer = planIdBN.toArrayLike(Buffer, 'le', 8);

  return PublicKey.findProgramAddressSync(
    [SUBSCRIPTION_PLAN_SEED, merchant.toBuffer(), planIdBuffer],
    programId
  );
}

/**
 * Derives the User Ledger PDA
 * Seeds: ["user_ledger", user, mint]
 */
export function deriveUserLedgerPDA(
  user: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_LEDGER_SEED, user.toBuffer(), mint.toBuffer()],
    programId
  );
}

/**
 * Derives the User Subscription PDA
 * Seeds: ["user_subscription", user, subscription_index.to_le_bytes()]
 */
export function deriveUserSubscriptionPDA(
  user: PublicKey,
  subscriptionIndex: BN | number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const indexBN = BN.isBN(subscriptionIndex) ? subscriptionIndex : new BN(subscriptionIndex);
  const indexBuffer = indexBN.toArrayLike(Buffer, 'le', 8);

  return PublicKey.findProgramAddressSync(
    [USER_SUBSCRIPTION_SEED, user.toBuffer(), indexBuffer],
    programId
  );
}
