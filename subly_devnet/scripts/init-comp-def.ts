import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, AddressLookupTableProgram } from "@solana/web3.js";
import { SublyDevnet } from "../target/types/subly_devnet";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  getArciumEnv,
  getClusterAccAddress,
  getMXEAccAddress,
  getCompDefAccAddress,
  getArciumProgramId,
  uploadCircuit,
  buildFinalizeCompDefTx,
  getAddressLookupTableAccAddress,
} from "@arcium-hq/client";

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

// Read raw circuit JSON file
function readRawCircuit(circuitName: string): Uint8Array {
  const circuitPath = path.join(__dirname, "..", "artifacts", `${circuitName}_raw_circuit_0.json`);
  const content = fs.readFileSync(circuitPath, "utf-8");
  return new TextEncoder().encode(content);
}

async function initializeCompDef(
  program: Program<SublyDevnet>,
  provider: anchor.AnchorProvider,
  wallet: Keypair,
  circuitName: string,
  initMethod: string,
  compDefOffset: number,
  clusterAccount: PublicKey
) {
  const compDefAccount = getCompDefAccAddress(program.programId, compDefOffset);
  console.log(`\n--- Initializing ${circuitName} ---`);
  console.log("CompDef Account:", compDefAccount.toString());

  // Check if already initialized
  const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
  if (existingAccount) {
    console.log("✅ Already initialized, skipping...");
    return;
  }

  const mxeAccount = getMXEAccAddress(program.programId);
  const addressLookupTable = getAddressLookupTableAccAddress(program.programId);

  // Step 1: Initialize comp_def
  console.log("\nStep 1: Initializing comp_def...");
  try {
    const tx = await (program.methods as any)[initMethod]()
      .accountsPartial({
        payer: wallet.publicKey,
        mxeAccount,
        compDefAccount,
        clusterAccount,
        addressLookupTable,
        lutProgram: AddressLookupTableProgram.programId,
        systemProgram: SystemProgram.programId,
        arciumProgram: getArciumProgramId(),
      })
      .signers([wallet])
      .rpc({ commitment: "confirmed" });

    console.log("✅ Init tx:", tx);
  } catch (e: any) {
    console.error("❌ Init failed:", e.message);
    return;
  }

  // Step 2: Upload raw circuit
  console.log("\nStep 2: Uploading circuit...");
  try {
    const rawCircuit = readRawCircuit(circuitName);
    const uploadTxs = await uploadCircuit(
      provider,
      circuitName,
      program.programId,
      rawCircuit,
      true
    );
    console.log(`✅ Uploaded in ${uploadTxs.length} transactions`);
  } catch (e: any) {
    console.error("❌ Upload failed:", e.message);
    return;
  }

  // Step 3: Finalize comp_def
  console.log("\nStep 3: Finalizing comp_def...");
  try {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider,
      compDefOffset,
      program.programId
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.feePayer = wallet.publicKey;
    finalizeTx.sign(wallet);
    const finalizeSig = await provider.sendAndConfirm(finalizeTx);
    console.log("✅ Finalize tx:", finalizeSig);
  } catch (e: any) {
    console.error("❌ Finalize failed:", e.message);
    return;
  }

  console.log(`✅ ${circuitName} initialized successfully!`);
}

async function main() {
  console.log("=== Initialize Arcium CompDefs on Devnet ===\n");

  // Setup connection
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

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Setup Anchor provider
  const provider = new anchor.AnchorProvider(connection, anchorWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load program
  const idlPath = path.join(__dirname, "..", "target", "idl", "subly_devnet.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");
  const program = new anchor.Program(idl, provider) as Program<SublyDevnet>;

  console.log("Program ID:", programId.toString());

  // Get Arcium environment
  let arciumEnv: { arciumClusterOffset: number };
  let clusterAccount: PublicKey;

  try {
    arciumEnv = getArciumEnv();
    clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);
    console.log("Arcium Cluster Offset:", arciumEnv.arciumClusterOffset);
    console.log("Cluster Account:", clusterAccount.toString());
  } catch (e: any) {
    console.error("Arcium environment not available:", e.message);
    process.exit(1);
  }

  // Check MXE account
  const mxeAccount = getMXEAccAddress(programId);
  const mxeInfo = await connection.getAccountInfo(mxeAccount);
  if (!mxeInfo) {
    console.error("\n❌ MXE account not initialized. Initialize MXE first.");
    process.exit(1);
  }
  console.log("MXE Account:", mxeAccount.toString(), "✅");

  // Initialize all CompDefs
  const compDefs = [
    { name: "set_subscription_active", method: "initSetSubscriptionActiveCompDef", offset: COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE },
    { name: "set_subscription_cancelled", method: "initSetSubscriptionCancelledCompDef", offset: COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED },
    { name: "increment_count", method: "initIncrementCountCompDef", offset: COMP_DEF_OFFSETS.INCREMENT_COUNT },
    { name: "decrement_count", method: "initDecrementCountCompDef", offset: COMP_DEF_OFFSETS.DECREMENT_COUNT },
    { name: "initialize_count", method: "initInitializeCountCompDef", offset: COMP_DEF_OFFSETS.INITIALIZE_COUNT },
    { name: "initialize_subscription_status", method: "initInitializeSubscriptionStatusCompDef", offset: COMP_DEF_OFFSETS.INITIALIZE_SUBSCRIPTION_STATUS },
  ];

  for (const compDef of compDefs) {
    await initializeCompDef(
      program,
      provider,
      wallet,
      compDef.name,
      compDef.method,
      compDef.offset,
      clusterAccount
    );
  }

  console.log("\n=== CompDef Initialization Complete ===");
}

main().catch(console.error);
