/* eslint-disable @typescript-eslint/no-explicit-any */
import { awaitComputationFinalization } from "@arcium-hq/client";
import { BN, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  ArciumContext,
  encryptAmount,
  generateNonce,
  deserializeLE,
  getArciumAccounts,
  generateComputationOffset,
} from "./arcium";
import { getUserLedgerPDA, getProtocolPoolPDA } from "./pda";
import {
  PROGRAM_ID,
  TOKEN_MINT,
  COMP_DEF_OFFSETS,
  ARCIUM_POOL_ADDRESS,
  ARCIUM_CLOCK_ADDRESS,
} from "./constants";

/**
 * Execute a deposit transaction
 */
export async function executeDeposit(
  program: Program<Idl>,
  userPubkey: PublicKey,
  amount: bigint,
  arciumContext: ArciumContext
): Promise<string> {
  const computationOffset = generateComputationOffset();

  const [userLedgerPDA] = getUserLedgerPDA(userPubkey, TOKEN_MINT);
  const [protocolPoolPDA] = getProtocolPoolPDA(TOKEN_MINT);

  // Get token accounts
  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT,
    userPubkey
  );

  // Get pool token account from ProtocolPool account
  const protocolPoolAccount = await (program.account as any).protocolPool.fetch(protocolPoolPDA);
  const poolTokenAccount = protocolPoolAccount.tokenAccount as PublicKey;

  // Get Arcium accounts
  const arciumAccounts = getArciumAccounts(
    PROGRAM_ID,
    COMP_DEF_OFFSETS.DEPOSIT,
    computationOffset
  );

  const amountNonce = generateNonce();
  const encryptedAmount = encryptAmount(arciumContext.cipher, amount, amountNonce);
  const amountNonceU128 = new BN(deserializeLE(amountNonce).toString());

  const signature = await program.methods
    .deposit(
      computationOffset,
      new BN(amount.toString()),
      Array.from(arciumContext.publicKey),
      Array.from(encryptedAmount),
      amountNonceU128
    )
    .accounts({
      user: userPubkey,
      mint: TOKEN_MINT,
      protocolPool: protocolPoolPDA,
      poolTokenAccount,
      userTokenAccount,
      userLedger: userLedgerPDA,
      mxeAccount: arciumAccounts.mxeAccount,
      mempoolAccount: arciumAccounts.mempoolAccount,
      executingPool: arciumAccounts.executingPool,
      computationAccount: arciumAccounts.computationAccount,
      compDefAccount: arciumAccounts.compDefAccount,
      clusterAccount: arciumAccounts.clusterAccount,
      poolAccount: ARCIUM_POOL_ADDRESS,
      clockAccount: ARCIUM_CLOCK_ADDRESS,
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  // Wait for MPC computation to complete
  await awaitComputationFinalization(
    { connection: program.provider.connection } as any,
    computationOffset,
    PROGRAM_ID,
    "confirmed"
  );

  return signature;
}

/**
 * Execute a withdraw transaction
 */
export async function executeWithdraw(
  program: Program<Idl>,
  userPubkey: PublicKey,
  amount: bigint,
  arciumContext: ArciumContext
): Promise<string> {
  const computationOffset = generateComputationOffset();

  const [userLedgerPDA] = getUserLedgerPDA(userPubkey, TOKEN_MINT);
  const [protocolPoolPDA] = getProtocolPoolPDA(TOKEN_MINT);

  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT,
    userPubkey
  );

  const protocolPoolAccount = await (program.account as any).protocolPool.fetch(protocolPoolPDA);
  const poolTokenAccount = protocolPoolAccount.tokenAccount as PublicKey;

  const arciumAccounts = getArciumAccounts(
    PROGRAM_ID,
    COMP_DEF_OFFSETS.WITHDRAW,
    computationOffset
  );

  const signature = await program.methods
    .withdraw(
      computationOffset,
      new BN(amount.toString()),
      Array.from(arciumContext.publicKey)
    )
    .accounts({
      user: userPubkey,
      mint: TOKEN_MINT,
      protocolPool: protocolPoolPDA,
      poolTokenAccount,
      userTokenAccount,
      userLedger: userLedgerPDA,
      mxeAccount: arciumAccounts.mxeAccount,
      mempoolAccount: arciumAccounts.mempoolAccount,
      executingPool: arciumAccounts.executingPool,
      computationAccount: arciumAccounts.computationAccount,
      compDefAccount: arciumAccounts.compDefAccount,
      clusterAccount: arciumAccounts.clusterAccount,
      poolAccount: ARCIUM_POOL_ADDRESS,
      clockAccount: ARCIUM_CLOCK_ADDRESS,
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  await awaitComputationFinalization(
    { connection: program.provider.connection } as any,
    computationOffset,
    PROGRAM_ID,
    "confirmed"
  );

  return signature;
}

/**
 * Execute an unsubscribe transaction
 */
export async function executeUnsubscribe(
  program: Program<Idl>,
  userPubkey: PublicKey,
  subscriptionIndex: bigint
): Promise<string> {
  const computationOffset = generateComputationOffset();

  // Import getUserSubscriptionPDA
  const { getUserSubscriptionPDA } = await import("./pda");
  const [userSubscriptionPDA] = getUserSubscriptionPDA(userPubkey, subscriptionIndex);

  const arciumAccounts = getArciumAccounts(
    PROGRAM_ID,
    COMP_DEF_OFFSETS.UNSUBSCRIBE,
    computationOffset
  );

  const signature = await program.methods
    .unsubscribe(computationOffset)
    .accounts({
      user: userPubkey,
      userSubscription: userSubscriptionPDA,
      mxeAccount: arciumAccounts.mxeAccount,
      mempoolAccount: arciumAccounts.mempoolAccount,
      executingPool: arciumAccounts.executingPool,
      computationAccount: arciumAccounts.computationAccount,
      compDefAccount: arciumAccounts.compDefAccount,
      clusterAccount: arciumAccounts.clusterAccount,
      poolAccount: ARCIUM_POOL_ADDRESS,
      clockAccount: ARCIUM_CLOCK_ADDRESS,
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  await awaitComputationFinalization(
    { connection: program.provider.connection } as any,
    computationOffset,
    PROGRAM_ID,
    "confirmed"
  );

  return signature;
}

/**
 * Fetch UserLedger account data
 */
export async function fetchUserLedger(
  program: Program<Idl>,
  userPubkey: PublicKey
): Promise<{
  user: PublicKey;
  mint: PublicKey;
  encryptionPubkey: number[];
  encryptedBalance: number[];
  encryptedSubscriptionCount: number[];
  nonce: BN;
  lastUpdated: BN;
  bump: number;
} | null> {
  const [userLedgerPDA] = getUserLedgerPDA(userPubkey, TOKEN_MINT);

  try {
    const account = await (program.account as any).userLedger.fetch(userLedgerPDA);
    return account as {
      user: PublicKey;
      mint: PublicKey;
      encryptionPubkey: number[];
      encryptedBalance: number[];
      encryptedSubscriptionCount: number[];
      nonce: BN;
      lastUpdated: BN;
      bump: number;
    };
  } catch {
    // Account doesn't exist yet
    return null;
  }
}

/**
 * Fetch all UserSubscription accounts for a user
 */
export async function fetchUserSubscriptions(
  program: Program<Idl>,
  userPubkey: PublicKey
): Promise<
  Array<{
    publicKey: PublicKey;
    account: {
      user: PublicKey;
      subscriptionIndex: BN;
      encryptionPubkey: number[];
      encryptedPlan: number[][];
      encryptedStatus: number[];
      encryptedNextPaymentDate: number[];
      encryptedStartDate: number[];
      nonce: BN;
      bump: number;
    };
  }>
> {
  const accounts = await (program.account as any).userSubscription.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: userPubkey.toBase58(),
      },
    },
  ]);

  return accounts.map((acc: any) => ({
    publicKey: acc.publicKey,
    account: acc.account as {
      user: PublicKey;
      subscriptionIndex: BN;
      encryptionPubkey: number[];
      encryptedPlan: number[][];
      encryptedStatus: number[];
      encryptedNextPaymentDate: number[];
      encryptedStartDate: number[];
      nonce: BN;
      bump: number;
    },
  }));
}

/**
 * Fetch SubscriptionPlan account data
 */
export async function fetchSubscriptionPlan(
  program: Program<Idl>,
  planPubkey: PublicKey
): Promise<{
  merchant: PublicKey;
  planId: BN;
  name: number[];
  mint: PublicKey;
  price: BN;
  billingCycleDays: number;
  isActive: boolean;
  createdAt: BN;
  bump: number;
} | null> {
  try {
    const account = await (program.account as any).subscriptionPlan.fetch(planPubkey);
    return account as {
      merchant: PublicKey;
      planId: BN;
      name: number[];
      mint: PublicKey;
      price: BN;
      billingCycleDays: number;
      isActive: boolean;
      createdAt: BN;
      bump: number;
    };
  } catch {
    return null;
  }
}
