import { Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import BN from 'bn.js';
import { SubscriptionPlan } from '../types/plan';
import { UserSubscription } from '../types/subscription';
import {
  deriveMerchantPDA,
  deriveSubscriptionPlanPDA,
  deriveUserSubscriptionPDA,
  deriveUserLedgerPDA,
  PROGRAM_ID,
} from './pda';

/** Account discriminator size in Anchor */
const DISCRIMINATOR_SIZE = 8;

/** Max name length for plans */
const MAX_PLAN_NAME_LENGTH = 32;

/**
 * User ledger data returned from fetch
 */
export interface UserLedgerData {
  publicKey: PublicKey;
  user: PublicKey;
  mint: PublicKey;
  encryptionPubkey: Uint8Array;
  encryptedBalance: Uint8Array;
  encryptedSubscriptionCount: Uint8Array;
  nonce: BN;
  lastUpdated: BN;
}

/**
 * Parse subscription plan from raw account data
 */
function parseSubscriptionPlan(
  publicKey: PublicKey,
  data: Buffer
): SubscriptionPlan {
  // Skip discriminator (8 bytes)
  let offset = DISCRIMINATOR_SIZE;

  // merchant: Pubkey (32 bytes)
  const merchant = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // plan_id: u64 (8 bytes)
  const planId = new BN(data.subarray(offset, offset + 8), 'le');
  offset += 8;

  // name: [u8; 32] (32 bytes)
  const nameBytes = data.subarray(offset, offset + MAX_PLAN_NAME_LENGTH);
  const nullIndex = nameBytes.indexOf(0);
  const name = new TextDecoder().decode(
    nameBytes.subarray(0, nullIndex === -1 ? MAX_PLAN_NAME_LENGTH : nullIndex)
  );
  offset += MAX_PLAN_NAME_LENGTH;

  // mint: Pubkey (32 bytes)
  const mint = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // price: u64 (8 bytes)
  const price = new BN(data.subarray(offset, offset + 8), 'le');
  offset += 8;

  // billing_cycle_days: u32 (4 bytes)
  const billingCycleDays = data.readUInt32LE(offset);
  offset += 4;

  // is_active: bool (1 byte)
  const isActive = data[offset] === 1;

  return {
    publicKey,
    merchant,
    planId,
    name,
    mint,
    price,
    billingCycleDays,
    isActive,
  };
}

/**
 * Parse user subscription from raw account data
 */
function parseUserSubscription(
  publicKey: PublicKey,
  data: Buffer
): UserSubscription {
  // Skip discriminator (8 bytes)
  let offset = DISCRIMINATOR_SIZE;

  // user: Pubkey (32 bytes)
  const user = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // subscription_index: u64 (8 bytes)
  const subscriptionIndex = new BN(data.subarray(offset, offset + 8), 'le');
  offset += 8;

  // encryption_pubkey: [u8; 32]
  const encryptionPubkey = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // encrypted_plan: [[u8; 32]; 2]
  const encryptedPlan0 = new Uint8Array(data.subarray(offset, offset + 32));
  const encryptedPlan1 = new Uint8Array(data.subarray(offset + 32, offset + 64));
  offset += 64;

  // encrypted_status: [u8; 32]
  const encryptedStatus = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // encrypted_next_payment_date: [u8; 32]
  const encryptedNextPaymentDate = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // encrypted_start_date: [u8; 32]
  const encryptedStartDate = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // nonce: u128 (16 bytes)
  const nonce = new BN(data.subarray(offset, offset + 16), 'le');
  offset += 16;

  return {
    publicKey,
    user,
    subscriptionIndex,
    encryptionPubkey,
    encryptedPlan: [encryptedPlan0, encryptedPlan1],
    encryptedStatus,
    encryptedNextPaymentDate,
    encryptedStartDate,
    nonce,
  };
}

/**
 * Parse user ledger from raw account data
 */
function parseUserLedger(
  publicKey: PublicKey,
  data: Buffer
): UserLedgerData {
  // Skip discriminator (8 bytes)
  let offset = DISCRIMINATOR_SIZE;

  // user: Pubkey (32 bytes)
  const user = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // mint: Pubkey (32 bytes)
  const mint = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // encryption_pubkey: [u8; 32]
  const encryptionPubkey = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // encrypted_balance: [u8; 32]
  const encryptedBalance = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // encrypted_subscription_count: [u8; 32]
  const encryptedSubscriptionCount = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  // nonce: u128 (16 bytes)
  const nonce = new BN(data.subarray(offset, offset + 16), 'le');
  offset += 16;

  // last_updated: i64 (8 bytes)
  const lastUpdated = new BN(data.subarray(offset, offset + 8), 'le');

  return {
    publicKey,
    user,
    mint,
    encryptionPubkey,
    encryptedBalance,
    encryptedSubscriptionCount,
    nonce,
    lastUpdated,
  };
}

/**
 * Fetch a single subscription plan by its PDA
 */
export async function fetchSubscriptionPlan(
  connection: Connection,
  planPDA: PublicKey
): Promise<SubscriptionPlan | null> {
  const accountInfo = await connection.getAccountInfo(planPDA);
  if (!accountInfo) {
    return null;
  }

  return parseSubscriptionPlan(planPDA, accountInfo.data);
}

/**
 * Fetch a subscription plan by merchant and plan ID
 */
export async function fetchSubscriptionPlanByMerchantAndId(
  connection: Connection,
  merchantWallet: PublicKey,
  planId: BN | number,
  programId: PublicKey = PROGRAM_ID
): Promise<SubscriptionPlan | null> {
  const [merchantPDA] = deriveMerchantPDA(merchantWallet, programId);
  const [planPDA] = deriveSubscriptionPlanPDA(merchantPDA, planId, programId);

  return fetchSubscriptionPlan(connection, planPDA);
}

/**
 * Fetch all subscription plans for a merchant
 */
export async function fetchAllPlansForMerchant(
  connection: Connection,
  merchantWallet: PublicKey,
  programId: PublicKey = PROGRAM_ID,
  activeOnly: boolean = false
): Promise<SubscriptionPlan[]> {
  const [merchantPDA] = deriveMerchantPDA(merchantWallet, programId);

  // Filter by merchant public key (starts at offset 8 after discriminator)
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: DISCRIMINATOR_SIZE, // After discriminator
        bytes: merchantPDA.toBase58(),
      },
    },
  ];

  // We also need to filter by account type - subscription_plan
  // In Anchor, the discriminator is the first 8 bytes
  // For now, we'll fetch all and filter

  const accounts = await connection.getProgramAccounts(programId, {
    filters,
  });

  const plans: SubscriptionPlan[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      const plan = parseSubscriptionPlan(pubkey, account.data);
      if (!activeOnly || plan.isActive) {
        plans.push(plan);
      }
    } catch {
      // Skip accounts that don't parse as subscription plans
    }
  }

  return plans;
}

/**
 * Fetch a user subscription by PDA
 */
export async function fetchUserSubscription(
  connection: Connection,
  userSubscriptionPDA: PublicKey
): Promise<UserSubscription | null> {
  const accountInfo = await connection.getAccountInfo(userSubscriptionPDA);
  if (!accountInfo) {
    return null;
  }

  return parseUserSubscription(userSubscriptionPDA, accountInfo.data);
}

/**
 * Fetch a user subscription by user and index
 */
export async function fetchUserSubscriptionByUserAndIndex(
  connection: Connection,
  user: PublicKey,
  subscriptionIndex: BN | number,
  programId: PublicKey = PROGRAM_ID
): Promise<UserSubscription | null> {
  const [subscriptionPDA] = deriveUserSubscriptionPDA(user, subscriptionIndex, programId);
  return fetchUserSubscription(connection, subscriptionPDA);
}

/**
 * Fetch user ledger
 */
export async function fetchUserLedger(
  connection: Connection,
  user: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<UserLedgerData | null> {
  const [userLedgerPDA] = deriveUserLedgerPDA(user, mint, programId);

  const accountInfo = await connection.getAccountInfo(userLedgerPDA);
  if (!accountInfo) {
    return null;
  }

  return parseUserLedger(userLedgerPDA, accountInfo.data);
}
