import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { SublyDevnet } from "../target/types/subly_devnet";
import { randomBytes, createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  getArciumEnv,
  getClusterAccAddress,
  getMXEPublicKey,
  getMXEAccAddress,
  getCompDefAccAddress,
  getComputationAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getClockAccAddress,
  awaitComputationFinalization,
  getArciumProgramId,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";

// PDA Seeds
const BUSINESS_SEED = Buffer.from("business");
const PLAN_SEED = Buffer.from("plan");
const SUBSCRIPTION_SEED = Buffer.from("subscription");

// Computation Definition Offsets
function computeCompDefOffset(name: string): number {
  const hash = createHash("sha256").update(name).digest();
  return hash.readUInt32LE(0);
}

const COMP_DEF_OFFSETS = {
  SET_SUBSCRIPTION_ACTIVE: computeCompDefOffset("set_subscription_active"),
  SET_SUBSCRIPTION_CANCELLED: computeCompDefOffset("set_subscription_cancelled"),
  INCREMENT_COUNT: computeCompDefOffset("increment_count"),
  DECREMENT_COUNT: computeCompDefOffset("decrement_count"),
  INITIALIZE_COUNT: computeCompDefOffset("initialize_count"),
  INITIALIZE_SUBSCRIPTION_STATUS: computeCompDefOffset("initialize_subscription_status"),
} as const;

// Read keypair from file
function readKpJson(keypairPath: string): Keypair {
  const file = fs.readFileSync(keypairPath);
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}

// PDA derivation functions
function deriveBusinessPda(authority: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BUSINESS_SEED, authority.toBuffer()],
    programId
  );
}

function derivePlanPda(business: PublicKey, planNonce: number, programId: PublicKey): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(planNonce));
  return PublicKey.findProgramAddressSync(
    [PLAN_SEED, business.toBuffer(), nonceBuffer],
    programId
  );
}

function deriveSubscriptionPda(
  plan: PublicKey,
  membershipCommitment: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SUBSCRIPTION_SEED, plan.toBuffer(), membershipCommitment],
    programId
  );
}

function generateRandomBytes(length: number): number[] {
  return Array.from(randomBytes(length));
}

function generateComputationOffset(): BN {
  const buffer = randomBytes(8);
  return new BN(buffer);
}

async function main() {
  console.log("=== Subly Devnet Arcium Test Script ===\n");

  // Setup connection - use Helius for better reliability
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 120000,
  });

  // Load wallet
  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const wallet = readKpJson(walletPath);
  const anchorWallet = new anchor.Wallet(wallet);

  console.log("Wallet:", wallet.publicKey.toString());
  console.log("RPC:", rpcUrl);

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.5 * 1e9) {
    console.error("Insufficient balance. Need at least 0.5 SOL for Arcium operations.");
    process.exit(1);
  }

  // Setup Anchor provider
  const provider = new anchor.AnchorProvider(connection, anchorWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load program IDL
  const idlPath = path.join(__dirname, "..", "target", "idl", "subly_devnet.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");
  const program = new anchor.Program(idl, provider) as Program<SublyDevnet>;

  console.log("Program ID:", programId.toString());
  console.log("Arcium Program ID:", getArciumProgramId().toString());
  console.log("---\n");

  // Get Arcium environment
  let arciumEnv: { arciumClusterOffset: number };
  let clusterAccount: PublicKey;
  let mxePublicKey: Uint8Array;

  try {
    arciumEnv = getArciumEnv();
    clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);
    console.log("✅ Arcium Environment detected");
    console.log("   Cluster Offset:", arciumEnv.arciumClusterOffset);
    console.log("   Cluster Account:", clusterAccount.toString());
  } catch (e: any) {
    console.error("❌ Arcium environment not available:", e.message);
    console.log("\nMake sure ARCIUM_CLUSTER_OFFSET environment variable is set.");
    console.log("For devnet, try: export ARCIUM_CLUSTER_OFFSET=0");
    process.exit(1);
  }

  // Get MXE public key
  try {
    console.log("\nFetching MXE public key...");
    mxePublicKey = await getMXEPublicKey(provider, programId);
    console.log("✅ MXE public key retrieved");
  } catch (e: any) {
    console.error("❌ Failed to get MXE public key:", e.message);
    console.log("\nThis might mean:");
    console.log("  1. MXE account is not initialized on devnet");
    console.log("  2. Arcium cluster is not available on devnet");
    process.exit(1);
  }

  console.log("---\n");

  // Derive PDAs
  const [businessPda] = deriveBusinessPda(wallet.publicKey, programId);
  console.log("Business PDA:", businessPda.toString());

  // Check business exists
  let businessAccount;
  try {
    businessAccount = await program.account.businessAccount.fetch(businessPda);
    console.log("✅ Business exists:", businessAccount.name);
  } catch (e) {
    console.error("❌ Business not found. Run basic devnet-test.ts first.");
    process.exit(1);
  }

  // Get plan
  const planCount = typeof businessAccount.planCount === "number"
    ? businessAccount.planCount
    : (businessAccount.planCount as BN).toNumber();

  if (planCount === 0) {
    console.error("❌ No plans found. Run basic devnet-test.ts first.");
    process.exit(1);
  }

  const [planPda] = derivePlanPda(businessPda, 0, programId);
  console.log("Plan PDA:", planPda.toString());

  const planAccount = await program.account.plan.fetch(planPda);
  if (!planAccount.isActive) {
    console.error("❌ Plan is not active.");
    process.exit(1);
  }
  console.log("✅ Plan is active");

  console.log("---\n");

  // Check comp_def accounts
  console.log("Checking Computation Definitions...");

  const compDefAccount = getCompDefAccAddress(programId, COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE);
  console.log("  set_subscription_active CompDef:", compDefAccount.toString());

  const compDefInfo = await connection.getAccountInfo(compDefAccount);
  if (!compDefInfo) {
    console.log("⚠️ CompDef not initialized. Need to initialize comp_def first.");
    console.log("\nTo initialize comp_def on devnet, you need to:");
    console.log("  1. Call initSetSubscriptionActiveCompDef");
    console.log("  2. Upload the circuit");
    console.log("  3. Finalize the comp_def");
    process.exit(1);
  }
  console.log("✅ CompDef exists");

  console.log("---\n");

  // Test subscribeWithArcium
  console.log("Testing subscribeWithArcium...\n");

  // Generate x25519 keypair for encryption
  const clientPrivateKey = x25519.utils.randomPrivateKey();
  const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  // Generate subscription data
  const membershipCommitment = new Uint8Array(generateRandomBytes(32));
  const encryptedUserCommitment = generateRandomBytes(32);
  const userNonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

  const [subscriptionPda] = deriveSubscriptionPda(planPda, membershipCommitment, programId);
  console.log("Subscription PDA:", subscriptionPda.toString());

  // Check if subscription already exists
  const existingSubscription = await connection.getAccountInfo(subscriptionPda);
  if (existingSubscription) {
    console.log("⚠️ Subscription already exists with this commitment. Generating new one...");
    // This is expected since we use random commitment each time
  }

  // Generate computation offset
  const computationOffset = generateComputationOffset();
  console.log("Computation Offset:", computationOffset.toString());

  // Get Arcium accounts
  const mxeAccount = getMXEAccAddress(programId);
  const mempoolAccount = getMempoolAccAddress(arciumEnv.arciumClusterOffset);
  const executingPool = getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset);
  const computationAccount = getComputationAccAddress(arciumEnv.arciumClusterOffset, computationOffset);
  const poolAccount = getFeePoolAccAddress();
  const clockAccount = getClockAccAddress();

  console.log("\nArcium Accounts:");
  console.log("  MXE Account:", mxeAccount.toString());
  console.log("  Mempool:", mempoolAccount.toString());
  console.log("  Executing Pool:", executingPool.toString());
  console.log("  Computation Account:", computationAccount.toString());
  console.log("  CompDef Account:", compDefAccount.toString());
  console.log("  Fee Pool:", poolAccount.toString());
  console.log("  Clock:", clockAccount.toString());

  try {
    console.log("\nSending subscribeWithArcium transaction...");

    const tx = await program.methods
      .subscribeWithArcium(
        computationOffset,
        encryptedUserCommitment,
        Array.from(membershipCommitment),
        userNonce
      )
      .accountsPartial({
        payer: wallet.publicKey,
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
        poolAccount,
        clockAccount,
        systemProgram: SystemProgram.programId,
        arciumProgram: getArciumProgramId(),
        planAccount: planPda,
        subscriptionAccount: subscriptionPda,
      })
      .signers([wallet])
      .rpc({ commitment: "confirmed" });

    console.log("✅ subscribeWithArcium tx:", tx);
    console.log("\nWaiting for computation finalization...");

    // Wait for computation to finalize
    const finalizeTx = await awaitComputationFinalization(
      provider,
      computationOffset,
      programId,
      "confirmed"
    );
    console.log("✅ Computation finalized tx:", finalizeTx);

    // Verify subscription
    const subscription = await program.account.subscription.fetch(subscriptionPda);
    console.log("\n✅ Subscription created with Arcium!");
    console.log("   Active:", subscription.isActive);
    console.log("   Pending Encryption:", subscription.pendingEncryption);

  } catch (e: any) {
    console.error("\n❌ subscribeWithArcium failed:", e.message);
    if (e.logs) {
      console.log("\nTransaction logs:");
      e.logs.forEach((log: string) => console.log("  ", log));
    }
  }

  console.log("\n=== Arcium Test Complete ===");
}

main().catch(console.error);
