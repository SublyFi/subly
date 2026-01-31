import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
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
 * Parameters for building an unsubscribe instruction
 */
export interface BuildUnsubscribeParams {
  /** User wallet public key */
  user: PublicKey;
  /** User's subscription index */
  subscriptionIndex: BN | number;
  /** Computation offset for Arcium */
  computationOffset: BN;
  /** Arcium client wrapper */
  arciumClient: ArciumClientWrapper;
  /** Program ID (optional) */
  programId?: PublicKey;
}

/**
 * Build the unsubscribe instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Queues an Arcium computation to set subscription status to cancelled
 */
export async function buildUnsubscribeInstruction(
  params: BuildUnsubscribeParams
): Promise<TransactionInstruction> {
  const {
    user,
    subscriptionIndex,
    computationOffset,
    arciumClient,
    programId = PROGRAM_ID,
  } = params;

  const subscriptionIndexBN = BN.isBN(subscriptionIndex)
    ? subscriptionIndex
    : new BN(subscriptionIndex);

  // Derive all required PDAs
  const [userSubscriptionPDA] = deriveUserSubscriptionPDA(user, subscriptionIndexBN, programId);
  const [signPDA] = deriveSignPDA(programId);
  const [mxeAccount] = deriveMxePDA(programId);
  const [mempoolAccount] = deriveMempoolPDA(mxeAccount);
  const [execPoolAccount] = deriveExecPoolPDA(mxeAccount);
  const [computationAccount] = deriveComputationPDA(computationOffset, mxeAccount);
  const [compDefAccount] = deriveComputationDefinitionPDA('unsubscribe', programId);
  const [clusterAccount] = deriveClusterPDA(mxeAccount);

  // Get encryption parameters
  const nonce = arciumClient.getNonce();
  const pubkey = arciumClient.getPublicKey();

  // Build instruction data
  // Discriminator for 'unsubscribe' instruction
  const discriminator = Buffer.from([
    // unsubscribe discriminator from IDL
    0x32, 0xf2, 0x9d, 0x85, 0x61, 0x05, 0x2d, 0x50,
  ]);

  const data = Buffer.alloc(
    8 + // discriminator
    8 + // computation_offset (u64)
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

  // pubkey ([u8; 32])
  Buffer.from(pubkey).copy(data, offset);
  offset += 32;

  // nonce (u128, little-endian)
  nonce.toArrayLike(Buffer, 'le', 16).copy(data, offset);

  // Build the instruction
  const keys = [
    { pubkey: user, isSigner: true, isWritable: true },
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
