/* eslint-disable @typescript-eslint/no-explicit-any */
import { awaitComputationFinalization } from "@arcium-hq/client";
import { BN, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
  getArciumAccounts,
  generateComputationOffset,
} from "./arcium";
import {
  getMerchantPDA,
  getMerchantLedgerPDA,
  getSubscriptionPlanPDA,
  getProtocolPoolPDA,
} from "./pda";
import {
  PROGRAM_ID,
  TOKEN_MINT,
  COMP_DEF_OFFSETS,
  ARCIUM_POOL_ADDRESS,
  ARCIUM_CLOCK_ADDRESS,
} from "./constants";

/**
 * Execute merchant registration transaction
 */
export async function executeRegisterMerchant(
  program: Program<Idl>,
  walletPubkey: PublicKey,
  name: string,
  encryptionPubkey: Uint8Array
): Promise<string> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [merchantLedgerPDA] = getMerchantLedgerPDA(merchantPDA, TOKEN_MINT);

  const signature = await program.methods
    .registerMerchant(name, Array.from(encryptionPubkey))
    .accounts({
      wallet: walletPubkey,
      mint: TOKEN_MINT,
      merchant: merchantPDA,
      merchantLedger: merchantLedgerPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });

  return signature;
}

/**
 * Execute create subscription plan transaction
 */
export async function executeCreatePlan(
  program: Program<Idl>,
  walletPubkey: PublicKey,
  planId: bigint,
  name: string,
  price: bigint,
  billingCycleDays: number
): Promise<string> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [planPDA] = getSubscriptionPlanPDA(merchantPDA, planId);

  const signature = await program.methods
    .createSubscriptionPlan(
      new BN(planId.toString()),
      name,
      new BN(price.toString()),
      billingCycleDays
    )
    .accounts({
      wallet: walletPubkey,
      merchant: merchantPDA,
      mint: TOKEN_MINT,
      subscriptionPlan: planPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });

  return signature;
}

/**
 * Execute update subscription plan transaction
 */
export async function executeUpdatePlan(
  program: Program<Idl>,
  walletPubkey: PublicKey,
  planPDA: PublicKey,
  updates: {
    name?: string;
    price?: bigint;
    billingCycleDays?: number;
    isActive?: boolean;
  }
): Promise<string> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);

  const signature = await program.methods
    .updateSubscriptionPlan(
      updates.name ?? null,
      updates.price ? new BN(updates.price.toString()) : null,
      updates.billingCycleDays ?? null,
      updates.isActive ?? null
    )
    .accounts({
      wallet: walletPubkey,
      merchant: merchantPDA,
      subscriptionPlan: planPDA,
    })
    .rpc({ commitment: "confirmed" });

  return signature;
}

/**
 * Execute claim revenue transaction with Arcium MPC
 */
export async function executeClaimRevenue(
  program: Program<Idl>,
  walletPubkey: PublicKey,
  amount: bigint
): Promise<string> {
  const computationOffset = generateComputationOffset();

  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [merchantLedgerPDA] = getMerchantLedgerPDA(merchantPDA, TOKEN_MINT);
  const [protocolPoolPDA] = getProtocolPoolPDA(TOKEN_MINT);

  // Get token accounts
  const merchantTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT,
    walletPubkey
  );

  // Get pool token account from ProtocolPool account
  const protocolPoolAccount = await (program.account as any).protocolPool.fetch(
    protocolPoolPDA
  );
  const poolTokenAccount = protocolPoolAccount.tokenAccount as PublicKey;

  // Get Arcium accounts
  const arciumAccounts = getArciumAccounts(
    PROGRAM_ID,
    COMP_DEF_OFFSETS.CLAIM_REVENUE,
    computationOffset
  );

  const signature = await program.methods
    .claimRevenue(computationOffset, new BN(amount.toString()))
    .accounts({
      wallet: walletPubkey,
      mint: TOKEN_MINT,
      merchant: merchantPDA,
      protocolPool: protocolPoolPDA,
      poolTokenAccount,
      merchantTokenAccount,
      merchantLedger: merchantLedgerPDA,
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
 * Fetch Merchant account data
 */
export async function fetchMerchant(
  program: Program<Idl>,
  walletPubkey: PublicKey
): Promise<{
  publicKey: PublicKey;
  wallet: PublicKey;
  name: number[];
  isActive: boolean;
  registeredAt: BN;
  bump: number;
} | null> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);

  try {
    const account = await (program.account as any).merchant.fetch(merchantPDA);
    return {
      publicKey: merchantPDA,
      wallet: account.wallet,
      name: account.name,
      isActive: account.isActive,
      registeredAt: account.registeredAt,
      bump: account.bump,
    };
  } catch {
    // Account doesn't exist yet
    return null;
  }
}

/**
 * Fetch MerchantLedger account data
 */
export async function fetchMerchantLedger(
  program: Program<Idl>,
  walletPubkey: PublicKey
): Promise<{
  publicKey: PublicKey;
  merchant: PublicKey;
  mint: PublicKey;
  encryptionPubkey: number[];
  encryptedBalance: number[];
  encryptedTotalClaimed: number[];
  nonce: BN;
  bump: number;
} | null> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [merchantLedgerPDA] = getMerchantLedgerPDA(merchantPDA, TOKEN_MINT);

  try {
    const account = await (program.account as any).merchantLedger.fetch(
      merchantLedgerPDA
    );
    return {
      publicKey: merchantLedgerPDA,
      merchant: account.merchant,
      mint: account.mint,
      encryptionPubkey: account.encryptionPubkey,
      encryptedBalance: account.encryptedBalance,
      encryptedTotalClaimed: account.encryptedTotalClaimed,
      nonce: account.nonce,
      bump: account.bump,
    };
  } catch {
    // Account doesn't exist yet
    return null;
  }
}

/**
 * Fetch all subscription plans for a merchant
 */
export async function fetchMerchantPlans(
  program: Program<Idl>,
  walletPubkey: PublicKey
): Promise<
  Array<{
    publicKey: PublicKey;
    account: {
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
  }>
> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);

  const accounts = await (program.account as any).subscriptionPlan.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: merchantPDA.toBase58(),
      },
    },
  ]);

  return accounts.map((acc: any) => ({
    publicKey: acc.publicKey,
    account: acc.account as {
      merchant: PublicKey;
      planId: BN;
      name: number[];
      mint: PublicKey;
      price: BN;
      billingCycleDays: number;
      isActive: boolean;
      createdAt: BN;
      bump: number;
    },
  }));
}

/**
 * Convert name bytes array to string
 */
export function nameToString(nameBytes: number[]): string {
  // Find the first null byte to trim the string
  const nullIndex = nameBytes.findIndex((b) => b === 0);
  const bytes = nullIndex >= 0 ? nameBytes.slice(0, nullIndex) : nameBytes;
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Generate next plan ID for a merchant
 */
export async function getNextPlanId(
  program: Program<Idl>,
  walletPubkey: PublicKey
): Promise<bigint> {
  const plans = await fetchMerchantPlans(program, walletPubkey);
  if (plans.length === 0) {
    return BigInt(1);
  }

  // Find the highest plan ID and increment
  const maxPlanId = plans.reduce((max, plan) => {
    const planId = BigInt(plan.account.planId.toString());
    return planId > max ? planId : max;
  }, BigInt(0));

  return maxPlanId + BigInt(1);
}

/**
 * Count active subscribers for a merchant's plans
 * Note: This counts UserSubscription accounts that reference the merchant's plans
 */
export async function countActiveSubscribers(
  program: Program<Idl>,
  walletPubkey: PublicKey
): Promise<number> {
  // Plan is encrypted on-chain, so we cannot filter subscriptions by plan
  // without an MPC aggregation flow. Return 0 until a privacy-preserving
  // counter is implemented.
  const _ = program;
  const __ = walletPubkey;
  return 0;
}
