import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
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
  deriveMxePDA,
  deriveSignPDA,
  deriveComputationDefinitionPDA,
  deriveMempoolPDA,
  deriveExecPoolPDA,
  deriveComputationPDA,
  deriveClusterPDA,
  ArciumClientWrapper,
} from '../encryption/arcium';

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
  /** Computation offset for Arcium */
  computationOffset: BN;
  /** Arcium client wrapper */
  arciumClient: ArciumClientWrapper;
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
    computationOffset,
    arciumClient,
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
  const [mxeAccount] = deriveMxePDA(programId);
  const [mempoolAccount] = deriveMempoolPDA(mxeAccount);
  const [execPoolAccount] = deriveExecPoolPDA(mxeAccount);
  const [computationAccount] = deriveComputationPDA(computationOffset, mxeAccount);
  const [compDefAccount] = deriveComputationDefinitionPDA('subscribe', programId);
  const [clusterAccount] = deriveClusterPDA(mxeAccount);

  // Encrypt the price for Arcium computation
  const encryptedPrice = await arciumClient.encryptU64(plan.price);

  // Build instruction data
  // Discriminator for 'subscribe' instruction
  const discriminator = Buffer.from([
    // subscribe discriminator from IDL
    // This should match the Anchor-generated discriminator
    0xf0, 0x9e, 0x65, 0x67, 0x89, 0x6c, 0x4b, 0xd3,
  ]);

  const data = Buffer.alloc(
    8 + // discriminator
    8 + // computation_offset (u64)
    8 + // subscription_index (u64)
    32 + // encrypted_price ([u8; 32])
    32 + // pubkey ([u8; 32])
    16   // nonce (u128)
  );

  let offset = 0;

  // Discriminator
  discriminator.copy(data, offset);
  offset += 8;

  // computation_offset (u64, little-endian)
  computationOffset.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;

  // subscription_index (u64, little-endian)
  subscriptionIndexBN.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;

  // encrypted_price ([u8; 32])
  Buffer.from(encryptedPrice.ciphertext).copy(data, offset);
  offset += 32;

  // pubkey ([u8; 32])
  Buffer.from(encryptedPrice.pubkey).copy(data, offset);
  offset += 32;

  // nonce (u128, little-endian)
  encryptedPrice.nonce.toArrayLike(Buffer, 'le', 16).copy(data, offset);

  // Build the instruction
  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: plan.mint, isSigner: false, isWritable: false },
    { pubkey: plan.publicKey, isSigner: false, isWritable: false },
    { pubkey: userLedgerPDA, isSigner: false, isWritable: true },
    { pubkey: merchantLedgerPDA, isSigner: false, isWritable: true },
    { pubkey: userSubscriptionPDA, isSigner: false, isWritable: true },
    { pubkey: signPDA, isSigner: false, isWritable: true },
    { pubkey: mxeAccount, isSigner: false, isWritable: false },
    { pubkey: mempoolAccount, isSigner: false, isWritable: true },
    { pubkey: execPoolAccount, isSigner: false, isWritable: true },
    { pubkey: computationAccount, isSigner: false, isWritable: true },
    { pubkey: compDefAccount, isSigner: false, isWritable: false },
    { pubkey: clusterAccount, isSigner: false, isWritable: true },
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
