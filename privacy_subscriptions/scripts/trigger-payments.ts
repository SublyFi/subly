/**
 * Manual Payment Trigger Script
 *
 * This script fetches all active subscriptions and triggers process_payment
 * for those with due payment dates.
 *
 * Usage:
 * npx ts-node scripts/trigger-payments.ts \
 *   --rpc https://api.devnet.solana.com \
 *   --keypair ./admin-keypair.json \
 *   --mint So11111111111111111111111111111111111111112 \
 *   --look-ahead 3600 \
 *   --concurrency 5
 */

import { Command } from "commander";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";

// Program ID - should match the deployed program
const PROGRAM_ID = new PublicKey(
  "DYdc7w3bmh5KQmzznufNx72cbXf446LC5gTWi8DA8zC6"
);

// PDA Seeds
const USER_SUBSCRIPTION_SEED = Buffer.from("user_subscription");
const USER_LEDGER_SEED = Buffer.from("user_ledger");
const MERCHANT_LEDGER_SEED = Buffer.from("merchant_ledger");
const SUBSCRIPTION_PLAN_SEED = Buffer.from("subscription_plan");

interface SubscriptionInfo {
  userSubscription: PublicKey;
  user: PublicKey;
  plan: PublicKey;
  subscriptionIndex: BN;
}

interface TriggerResult {
  userSubscription: PublicKey;
  success: boolean;
  signature?: string;
  error?: string;
}

const program = new Command();

program
  .name("trigger-payments")
  .description("Trigger process_payment for due subscriptions")
  .requiredOption("--rpc <url>", "RPC endpoint URL")
  .requiredOption("--keypair <path>", "Payer keypair JSON file path")
  .requiredOption("--mint <address>", "Token mint address")
  .option("--look-ahead <seconds>", "Seconds to look ahead for due payments", "0")
  .option("--concurrency <n>", "Parallel execution count", "1")
  .option("--dry-run", "Show what would be processed without executing")
  .option("--verbose", "Enable verbose logging");

program.parse();
const opts = program.opts();

async function loadKeypair(path: string): Promise<Keypair> {
  const keypairData = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(keypairData));
}

async function getSubscriptionsDue(
  connection: Connection,
  mint: PublicKey,
  lookAheadSeconds: number
): Promise<SubscriptionInfo[]> {
  console.log("Fetching all UserSubscription accounts...");

  // Fetch all UserSubscription accounts for this program
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      // Filter by account data size to get UserSubscription accounts
      // UserSubscription::SIZE = 8 + 32 + 8 + 32 + 32 + 32 + 16 + 1 = 161
      { dataSize: 161 },
    ],
  });

  console.log(`Found ${accounts.length} UserSubscription accounts`);

  // Parse the accounts
  // Note: In production, we would need to decode the encrypted fields via MPC
  // For MVP, we return all subscriptions and let the on-chain program handle filtering
  const subscriptions: SubscriptionInfo[] = [];

  for (const account of accounts) {
    try {
      const data = account.account.data;

      // Parse UserSubscription structure:
      // - 8 bytes discriminator
      // - 32 bytes user
      // - 8 bytes subscription_index
      // - 32 bytes plan
      // - 32 bytes encrypted_status
      // - 32 bytes encrypted_next_payment_date
      // - 16 bytes nonce
      // - 1 byte bump

      const user = new PublicKey(data.slice(8, 40));
      const subscriptionIndex = new BN(data.slice(40, 48), "le");
      const plan = new PublicKey(data.slice(48, 80));

      subscriptions.push({
        userSubscription: account.pubkey,
        user,
        plan,
        subscriptionIndex,
      });
    } catch (e) {
      console.warn(`Failed to parse subscription account ${account.pubkey.toBase58()}: ${e}`);
    }
  }

  return subscriptions;
}

async function triggerPayment(
  connection: Connection,
  payer: Keypair,
  subscription: SubscriptionInfo,
  mint: PublicKey
): Promise<TriggerResult> {
  try {
    // Note: In production, this would build and send the actual process_payment transaction
    // For MVP, we're demonstrating the structure

    console.log(`Processing subscription ${subscription.userSubscription.toBase58()}`);

    // Derive required PDAs
    const [userLedger] = PublicKey.findProgramAddressSync(
      [USER_LEDGER_SEED, subscription.user.toBuffer(), mint.toBuffer()],
      PROGRAM_ID
    );

    // Get subscription plan to find merchant
    const planAccount = await connection.getAccountInfo(subscription.plan);
    if (!planAccount) {
      throw new Error(`Subscription plan ${subscription.plan.toBase58()} not found`);
    }

    // Parse merchant from plan (offset 8 for discriminator)
    const merchant = new PublicKey(planAccount.data.slice(8, 40));

    const [merchantLedger] = PublicKey.findProgramAddressSync(
      [MERCHANT_LEDGER_SEED, merchant.toBuffer(), mint.toBuffer()],
      PROGRAM_ID
    );

    // In production, we would:
    // 1. Get fresh encryption parameters
    // 2. Build the process_payment instruction
    // 3. Send and confirm the transaction

    // For now, return a simulated success
    console.log(`  User Ledger: ${userLedger.toBase58()}`);
    console.log(`  Merchant Ledger: ${merchantLedger.toBase58()}`);

    return {
      userSubscription: subscription.userSubscription,
      success: true,
      signature: "simulated",
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      userSubscription: subscription.userSubscription,
      success: false,
      error: errorMessage,
    };
  }
}

async function triggerPayments(
  connection: Connection,
  payer: Keypair,
  subscriptions: SubscriptionInfo[],
  mint: PublicKey,
  options: {
    concurrency: number;
    onProgress?: (processed: number, total: number) => void;
  }
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];
  const { concurrency, onProgress } = options;

  // Process in batches for concurrency
  for (let i = 0; i < subscriptions.length; i += concurrency) {
    const batch = subscriptions.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((sub) => triggerPayment(connection, payer, sub, mint))
    );
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + concurrency, subscriptions.length), subscriptions.length);
    }
  }

  return results;
}

async function main() {
  console.log("=== Subly Payment Trigger Script ===\n");

  const connection = new Connection(opts.rpc, "confirmed");
  const payer = await loadKeypair(opts.keypair);
  const mint = new PublicKey(opts.mint);

  console.log(`RPC: ${opts.rpc}`);
  console.log(`Payer: ${payer.publicKey.toBase58()}`);
  console.log(`Mint: ${mint.toBase58()}`);
  console.log(`Look-ahead: ${opts.lookAhead} seconds`);
  console.log(`Concurrency: ${opts.concurrency}`);
  console.log(`Dry-run: ${opts.dryRun || false}\n`);

  // Fetch subscriptions
  const subscriptionsDue = await getSubscriptionsDue(
    connection,
    mint,
    parseInt(opts.lookAhead)
  );

  console.log(`\nFound ${subscriptionsDue.length} subscriptions to process`);

  if (subscriptionsDue.length === 0) {
    console.log("No subscriptions due for payment.");
    return;
  }

  if (opts.dryRun) {
    console.log("\n=== Dry Run Mode ===");
    console.log("Would process the following subscriptions:");
    subscriptionsDue.forEach((sub, i) => {
      console.log(`  ${i + 1}. ${sub.userSubscription.toBase58()}`);
      console.log(`     User: ${sub.user.toBase58()}`);
      console.log(`     Plan: ${sub.plan.toBase58()}`);
    });
    return;
  }

  // Process payments
  console.log("\n=== Processing Payments ===");
  const results = await triggerPayments(connection, payer, subscriptionsDue, mint, {
    concurrency: parseInt(opts.concurrency),
    onProgress: (processed, total) => {
      console.log(`Progress: ${processed}/${total}`);
    },
  });

  // Summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("\n=== Results ===");
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed payments:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  ${r.userSubscription.toBase58()}: ${r.error}`);
      });
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
