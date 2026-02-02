import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import { BorshCoder, Idl } from '@coral-xyz/anchor';
import { SubscriptionPlan } from '../types/plan';
import {
  deriveUserLedgerPDA,
  deriveMerchantLedgerPDA,
  deriveUserSubscriptionPDA,
  PROGRAM_ID,
} from '../accounts/pda';
import {
  ARCIUM_PROGRAM_ID,
  ARCIUM_FEE_POOL_ACCOUNT,
  ARCIUM_CLOCK_ACCOUNT,
  deriveSignPDA,
  getArciumAccounts,
} from '../encryption/arcium';
import idl from '../idl/privacy_subscriptions.json';

/**
 * Parameters for building a subscribe instruction
 */
export interface BuildSubscribeParams {
  /** User wallet public key */
  user: PublicKey;
  /** Subscription plan to subscribe to */
  plan: SubscriptionPlan;
  /** User's subscription index (incrementing counter for this user) */
  subscriptionIndex: BN | number;
  /** Encrypted plan public key (Enc<Shared, [u128; 2]>) */
  encryptedPlan: [Uint8Array | number[], Uint8Array | number[]];
  /** Nonce for encrypted plan */
  encryptedPlanNonce: BN | bigint;
  /** Encrypted plan price (Enc<Shared, u64>) */
  encryptedPrice: Uint8Array | number[];
  /** Nonce for encrypted price */
  encryptedPriceNonce: BN | bigint;
  /** Encrypted billing cycle days (Enc<Shared, u32>) */
  encryptedBillingCycle: Uint8Array | number[];
  /** Nonce for encrypted billing cycle */
  encryptedBillingCycleNonce: BN | bigint;
  /** Computation offset for Arcium */
  computationOffset: BN;
  /** Arcium cluster offset */
  clusterOffset?: number;
  /** Program ID (optional) */
  programId?: PublicKey;
}

/**
 * Build the subscribe instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Creates a UserSubscription PDA
 * 2. Queues an Arcium computation to:
 *    - Deduct price from user's encrypted balance
 *    - Add price to merchant's encrypted balance
 *    - Set subscription status to active
 */
export async function buildSubscribeInstruction(
  params: BuildSubscribeParams
): Promise<TransactionInstruction> {
  const {
    user,
    plan,
    subscriptionIndex,
    encryptedPlan,
    encryptedPlanNonce,
    encryptedPrice,
    encryptedPriceNonce,
    encryptedBillingCycle,
    encryptedBillingCycleNonce,
    computationOffset,
    clusterOffset = 0,
    programId = PROGRAM_ID,
  } = params;

  const subscriptionIndexBN = BN.isBN(subscriptionIndex)
    ? subscriptionIndex
    : new BN(subscriptionIndex);

  // Derive all required PDAs
  const [userLedgerPDA] = deriveUserLedgerPDA(user, plan.mint, programId);
  const [merchantLedgerPDA] = deriveMerchantLedgerPDA(plan.merchant, plan.mint, programId);
  const [userSubscriptionPDA] = deriveUserSubscriptionPDA(user, subscriptionIndexBN, programId);
  const [signPDA] = deriveSignPDA(programId);
  const arciumAccounts = getArciumAccounts(
    programId,
    'subscribe_v2',
    computationOffset,
    clusterOffset
  );

  const planCiphertexts = [
    Array.isArray(encryptedPlan[0])
      ? encryptedPlan[0]
      : Array.from(encryptedPlan[0]),
    Array.isArray(encryptedPlan[1])
      ? encryptedPlan[1]
      : Array.from(encryptedPlan[1]),
  ];
  const priceCiphertext = Array.isArray(encryptedPrice)
    ? encryptedPrice
    : Array.from(encryptedPrice);
  const billingCiphertext = Array.isArray(encryptedBillingCycle)
    ? encryptedBillingCycle
    : Array.from(encryptedBillingCycle);

  const planNonceBN = BN.isBN(encryptedPlanNonce)
    ? encryptedPlanNonce
    : new BN(encryptedPlanNonce.toString());
  const priceNonceBN = BN.isBN(encryptedPriceNonce)
    ? encryptedPriceNonce
    : new BN(encryptedPriceNonce.toString());
  const billingNonceBN = BN.isBN(encryptedBillingCycleNonce)
    ? encryptedBillingCycleNonce
    : new BN(encryptedBillingCycleNonce.toString());

  // Build instruction data using IDL coder
  const coder = new BorshCoder(idl as Idl);
  const data = coder.instruction.encode('subscribe', {
    computationOffset,
    subscriptionIndex: subscriptionIndexBN,
    encryptedPlan: planCiphertexts,
    encryptedPlanNonce: planNonceBN,
    encryptedPrice: priceCiphertext,
    encryptedPriceNonce: priceNonceBN,
    encryptedBillingCycle: billingCiphertext,
    encryptedBillingCycleNonce: billingNonceBN,
  });

  // Build the instruction
  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: plan.mint, isSigner: false, isWritable: false },
    { pubkey: plan.publicKey, isSigner: false, isWritable: false },
    { pubkey: userLedgerPDA, isSigner: false, isWritable: true },
    { pubkey: merchantLedgerPDA, isSigner: false, isWritable: true },
    { pubkey: userSubscriptionPDA, isSigner: false, isWritable: true },
    { pubkey: signPDA, isSigner: false, isWritable: true },
    { pubkey: arciumAccounts.mxeAccount, isSigner: false, isWritable: false },
    { pubkey: arciumAccounts.mempoolAccount, isSigner: false, isWritable: true },
    { pubkey: arciumAccounts.executingPool, isSigner: false, isWritable: true },
    { pubkey: arciumAccounts.computationAccount, isSigner: false, isWritable: true },
    { pubkey: arciumAccounts.compDefAccount, isSigner: false, isWritable: false },
    { pubkey: arciumAccounts.clusterAccount, isSigner: false, isWritable: true },
    { pubkey: ARCIUM_FEE_POOL_ACCOUNT, isSigner: false, isWritable: true },
    { pubkey: ARCIUM_CLOCK_ACCOUNT, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}
