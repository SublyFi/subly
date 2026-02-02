import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import { BorshCoder, Idl } from '@coral-xyz/anchor';
import {
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
 * Parameters for building a verify subscription instruction
 */
export interface BuildVerifySubscriptionParams {
  /** Payer for the transaction (can be anyone) */
  payer: PublicKey;
  /** User wallet whose subscription is being verified */
  user: PublicKey;
  /** User's subscription index */
  subscriptionIndex: BN | number;
  /** Computation offset for Arcium */
  computationOffset: BN;
  /** Arcium cluster offset */
  clusterOffset?: number;
  /** Program ID (optional) */
  programId?: PublicKey;
}

/**
 * Build the verify subscription instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Queues an Arcium computation to verify subscription status
 * 2. The callback will emit a SubscriptionVerified event
 */
export async function buildVerifySubscriptionInstruction(
  params: BuildVerifySubscriptionParams
): Promise<TransactionInstruction> {
  const {
    payer,
    user,
    subscriptionIndex,
    computationOffset,
    clusterOffset = 0,
    programId = PROGRAM_ID,
  } = params;

  const subscriptionIndexBN = BN.isBN(subscriptionIndex)
    ? subscriptionIndex
    : new BN(subscriptionIndex);

  // Derive all required PDAs
  const [userSubscriptionPDA] = deriveUserSubscriptionPDA(user, subscriptionIndexBN, programId);
  const [signPDA] = deriveSignPDA(programId);
  const arciumAccounts = getArciumAccounts(
    programId,
    'verify_subscription_v2',
    computationOffset,
    clusterOffset
  );

  const coder = new BorshCoder(idl as Idl);
  const data = coder.instruction.encode('verify_subscription', {
    computationOffset,
  });

  // Build the instruction
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: userSubscriptionPDA, isSigner: false, isWritable: false },
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
