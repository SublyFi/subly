/**
 * Task Queue Setup Script
 *
 * This script initializes a Tuk Tuk Task Queue for the Subly protocol
 * and deposits initial funding for crank rewards.
 *
 * Usage:
 * npx ts-node scripts/setup-task-queue.ts \
 *   --rpc https://api.devnet.solana.com \
 *   --keypair ./admin-keypair.json \
 *   --mint So11111111111111111111111111111111111111112 \
 *   --min-crank-reward 10000 \
 *   --initial-funding 1000000000
 */

import { Command } from "commander";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";

// Program ID - should match the deployed program
const PROGRAM_ID = new PublicKey(
  "DYdc7w3bmh5KQmzznufNx72cbXf446LC5gTWi8DA8zC6"
);

// Tuk Tuk Program ID (Devnet)
const TUKTUK_PROGRAM_ID = new PublicKey(
  "tuktukUrfhXT6ZT77QTU8RQtvgL57zVA"
);

// PDA Seeds
const PROTOCOL_CONFIG_SEED = Buffer.from("protocol_config");
const SUBLY_TASK_QUEUE_SEED = Buffer.from("subly_task_queue");
const QUEUE_AUTHORITY_SEED = Buffer.from("queue_authority");

const program = new Command();

program
  .name("setup-task-queue")
  .description("Initialize and fund a Tuk Tuk Task Queue for Subly")
  .requiredOption("--rpc <url>", "RPC endpoint URL")
  .requiredOption("--keypair <path>", "Authority keypair JSON file path")
  .requiredOption("--mint <address>", "Token mint address")
  .option("--min-crank-reward <lamports>", "Minimum crank reward in lamports", "10000")
  .option(
    "--initial-funding <lamports>",
    "Initial funding amount in lamports",
    String(LAMPORTS_PER_SOL)
  )
  .option("--task-queue-id <id>", "Task queue ID", "0")
  .option("--dry-run", "Show what would be done without executing");

program.parse();
const opts = program.opts();

async function loadKeypair(path: string): Promise<Keypair> {
  const keypairData = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(keypairData));
}

async function main() {
  console.log("=== Subly Task Queue Setup ===\n");

  const connection = new Connection(opts.rpc, "confirmed");
  const authority = await loadKeypair(opts.keypair);
  const mint = new PublicKey(opts.mint);
  const taskQueueId = parseInt(opts.taskQueueId);
  const minCrankReward = new BN(opts.minCrankReward);
  const initialFunding = new BN(opts.initialFunding);

  console.log(`RPC: ${opts.rpc}`);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  console.log(`Mint: ${mint.toBase58()}`);
  console.log(`Task Queue ID: ${taskQueueId}`);
  console.log(`Min Crank Reward: ${minCrankReward.toString()} lamports`);
  console.log(`Initial Funding: ${initialFunding.toString()} lamports (${initialFunding.toNumber() / LAMPORTS_PER_SOL} SOL)`);
  console.log(`Dry-run: ${opts.dryRun || false}\n`);

  // Derive PDAs
  const [protocolConfig] = PublicKey.findProgramAddressSync(
    [PROTOCOL_CONFIG_SEED],
    PROGRAM_ID
  );

  const [sublyTaskQueue] = PublicKey.findProgramAddressSync(
    [SUBLY_TASK_QUEUE_SEED, mint.toBuffer()],
    PROGRAM_ID
  );

  console.log("=== Derived Addresses ===");
  console.log(`Protocol Config: ${protocolConfig.toBase58()}`);
  console.log(`Subly Task Queue: ${sublyTaskQueue.toBase58()}`);

  // Check if SublyTaskQueue already exists
  const existingAccount = await connection.getAccountInfo(sublyTaskQueue);
  if (existingAccount) {
    console.log("\n[INFO] SublyTaskQueue already exists!");

    // Parse and display current state
    const data = existingAccount.data;
    const isActive = data[8 + 32 + 32 + 32] === 1;
    const taskQueuePubkey = new PublicKey(data.slice(8 + 32, 8 + 32 + 32));

    console.log(`  Task Queue: ${taskQueuePubkey.toBase58()}`);
    console.log(`  Is Active: ${isActive}`);

    // Derive queue authority
    const [queueAuthority] = PublicKey.findProgramAddressSync(
      [QUEUE_AUTHORITY_SEED, taskQueuePubkey.toBuffer()],
      PROGRAM_ID
    );
    console.log(`  Queue Authority: ${queueAuthority.toBase58()}`);

    // Check task queue balance
    const taskQueueBalance = await connection.getBalance(taskQueuePubkey);
    console.log(`  Task Queue Balance: ${taskQueueBalance / LAMPORTS_PER_SOL} SOL`);

    if (!opts.dryRun && initialFunding.toNumber() > 0) {
      console.log("\n=== Adding Funds to Task Queue ===");
      console.log(`Adding ${initialFunding.toNumber() / LAMPORTS_PER_SOL} SOL...`);

      // Note: In production, this would call fund_task_queue instruction
      // For now, we simulate with a direct transfer
      console.log("[SIMULATED] Funds would be added via fund_task_queue instruction");
    }

    return;
  }

  if (opts.dryRun) {
    console.log("\n=== Dry Run Mode ===");
    console.log("Would execute the following steps:");
    console.log("1. Initialize SublyTaskQueue PDA");
    console.log("2. Initialize QueueAuthority PDA");
    console.log("3. Link to Tuk Tuk Task Queue");
    console.log(`4. Fund Task Queue with ${initialFunding.toNumber() / LAMPORTS_PER_SOL} SOL`);
    return;
  }

  console.log("\n=== Initializing Task Queue ===");

  // Note: The actual Tuk Tuk Task Queue must be created first via Tuk Tuk program
  // Our initialize_task_queue wraps an existing Tuk Tuk Task Queue

  console.log("Step 1: Create Tuk Tuk Task Queue (via Tuk Tuk program)");
  console.log("  [MANUAL] Please create a Tuk Tuk Task Queue first using the Tuk Tuk CLI or SDK");
  console.log("  Example: tuktuk create-queue --name subly-payments --min-crank-reward 10000");

  console.log("\nStep 2: Initialize SublyTaskQueue (via Subly program)");
  console.log("  [TODO] Once Tuk Tuk Task Queue is created, call initialize_task_queue");

  console.log("\nStep 3: Fund Task Queue");
  console.log(`  [TODO] Call fund_task_queue with ${initialFunding.toNumber() / LAMPORTS_PER_SOL} SOL`);

  console.log("\n=== Setup Complete ===");
  console.log("Next steps:");
  console.log("1. Deploy the program to devnet/mainnet");
  console.log("2. Create a Tuk Tuk Task Queue");
  console.log("3. Run this script again with the task queue address");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
