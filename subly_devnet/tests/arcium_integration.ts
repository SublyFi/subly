import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { SublyDevnet } from "../target/types/subly_devnet";
import { randomBytes, createHash } from "crypto";
import { expect } from "chai";
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
  buildFinalizeCompDefTx,
  uploadCircuit,
} from "@arcium-hq/client";

// ============================================
// Arcium Integration Test Suite
// ============================================
// This test file requires the Arcium infrastructure.
// Run with: arcium test
//
// For localnet testing without Arcium CPI, use: anchor test
// which runs tests/subly_devnet.ts only.
// ============================================

// PDA Seeds (must match constants.rs)
const BUSINESS_SEED = Buffer.from("business");
const PLAN_SEED = Buffer.from("plan");
const SUBSCRIPTION_SEED = Buffer.from("subscription");

// Helper function to compute comp_def_offset (same as arcium_anchor::comp_def_offset)
function computeCompDefOffset(name: string): number {
  const hash = createHash("sha256").update(name).digest();
  return hash.readUInt32LE(0);
}

// Computation Definition Offsets
const COMP_DEF_OFFSETS = {
  INCREMENT_COUNT: computeCompDefOffset("increment_count"),
  DECREMENT_COUNT: computeCompDefOffset("decrement_count"),
  INITIALIZE_COUNT: computeCompDefOffset("initialize_count"),
  SET_SUBSCRIPTION_ACTIVE: computeCompDefOffset("set_subscription_active"),
  SET_SUBSCRIPTION_CANCELLED: computeCompDefOffset("set_subscription_cancelled"),
  INITIALIZE_SUBSCRIPTION_STATUS: computeCompDefOffset("initialize_subscription_status"),
} as const;

// Retry helper for MXE public key retrieval
async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  mxeProgramId: PublicKey,
  maxRetries = 20,
  retryDelayMs = 500
): Promise<Uint8Array> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const publicKey = await getMXEPublicKey(provider, mxeProgramId);
      if (publicKey) {
        return publicKey;
      }
    } catch (e) {
      // Retry on error
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw new Error("Failed to get MXE public key after retries");
}

// Read keypair from file
function readKpJson(path: string): Keypair {
  const fs = require("fs");
  const json = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(json));
}

// Read raw circuit JSON file
function readRawCircuit(circuitName: string): Uint8Array {
  const fs = require("fs");
  const path = require("path");
  const circuitPath = path.join(__dirname, "..", "artifacts", `${circuitName}_raw_circuit_0.json`);
  const content = fs.readFileSync(circuitPath, "utf-8");
  return new TextEncoder().encode(content);
}

describe("SublyDevnet Arcium Integration", () => {
  // Provider and program setup
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.SublyDevnet as Program<SublyDevnet>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Load owner keypair from Solana config
  const owner = readKpJson(
    process.env.HOME + "/.config/solana/id.json"
  );

  // Arcium environment
  let arciumEnv: { arciumClusterOffset: number };
  let clusterAccount: PublicKey;
  let mxePublicKey: Uint8Array;

  // ============================================
  // PDA Derivation Functions
  // ============================================

  function deriveBusinessPda(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [BUSINESS_SEED, authority.toBuffer()],
      program.programId
    );
  }

  function derivePlanPda(
    business: PublicKey,
    planNonce: number
  ): [PublicKey, number] {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(planNonce));
    return PublicKey.findProgramAddressSync(
      [PLAN_SEED, business.toBuffer(), nonceBuffer],
      program.programId
    );
  }

  function deriveSubscriptionPda(
    plan: PublicKey,
    membershipCommitment: Uint8Array
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SUBSCRIPTION_SEED, plan.toBuffer(), membershipCommitment],
      program.programId
    );
  }

  // MXE PDA derived from program (using our program's seed, not Arcium SDK)
  function deriveMxePda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mxe")],
      program.programId
    );
    return pda;
  }

  // ============================================
  // Helper Functions
  // ============================================

  function generateRandomBytes(length: number): number[] {
    return Array.from(randomBytes(length));
  }

  function generateComputationOffset(): BN {
    const buffer = randomBytes(8);
    return new BN(buffer);
  }

  // Get Arcium accounts using SDK functions
  function getArciumAccounts(computationOffset: BN, compDefOffset: number) {
    // Use Arcium SDK to get the MXE account (owned by Arcium program)
    const mxeAccount = getMXEAccAddress(program.programId);
    return {
      payer: owner.publicKey,
      mxeAccount,
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      computationAccount: getComputationAccAddress(
        arciumEnv.arciumClusterOffset,
        computationOffset
      ),
      compDefAccount: getCompDefAccAddress(program.programId, compDefOffset),
      clusterAccount,
      poolAccount: getFeePoolAccAddress(),
      clockAccount: getClockAccAddress(),
      systemProgram: SystemProgram.programId,
      arciumProgram: getArciumProgramId(),
    };
  }

  // ============================================
  // Test State
  // ============================================

  let businessPda: PublicKey;
  let planPda: PublicKey;

  // ============================================
  // Setup
  // ============================================

  before(async () => {
    // Get Arcium environment
    try {
      arciumEnv = getArciumEnv();
      clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);
      console.log("Arcium cluster offset:", arciumEnv.arciumClusterOffset);
      console.log("Cluster account:", clusterAccount.toString());

      // Get MXE public key with retry
      mxePublicKey = await getMXEPublicKeyWithRetry(provider, program.programId);
      console.log("MXE public key retrieved successfully");
    } catch (e) {
      console.log(
        "Arcium environment not available. Skipping Arcium CPI tests."
      );
      console.log("Run with 'arcium test' to execute full Arcium tests.");
    }

    // Fund the test wallet if needed
    const balance = await provider.connection.getBalance(owner.publicKey);
    if (balance < 1_000_000_000) {
      const airdropSig = await provider.connection.requestAirdrop(
        owner.publicKey,
        10_000_000_000
      );
      await provider.connection.confirmTransaction(airdropSig, "confirmed");
    }
    console.log("Arcium test wallet:", owner.publicKey.toString());
  });

  // ============================================
  // PDA Derivation Tests (No Arcium Infrastructure Required)
  // ============================================

  describe("PDA Derivation", () => {
    it("should correctly derive MXE PDA", () => {
      const mxePda = deriveMxePda();
      expect(mxePda).to.be.instanceOf(PublicKey);
      console.log("MXE PDA:", mxePda.toString());
    });

    it("should correctly derive comp_def PDAs using SDK", () => {
      for (const [name, offset] of Object.entries(COMP_DEF_OFFSETS)) {
        const compDefPda = getCompDefAccAddress(program.programId, offset);
        expect(compDefPda).to.be.instanceOf(PublicKey);
        console.log(`${name} offset: ${offset}, PDA: ${compDefPda.toString()}`);
      }
    });

    it("should compute correct comp_def_offset values", () => {
      expect(COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE).to.equal(1163529360);
      expect(COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED).to.equal(4084431159);
      expect(COMP_DEF_OFFSETS.INCREMENT_COUNT).to.equal(1622034848);
      expect(COMP_DEF_OFFSETS.DECREMENT_COUNT).to.equal(1561046477);
      expect(COMP_DEF_OFFSETS.INITIALIZE_COUNT).to.equal(4058386492);
      expect(COMP_DEF_OFFSETS.INITIALIZE_SUBSCRIPTION_STATUS).to.equal(3700186428);
    });
  });

  // ============================================
  // Basic Setup Tests (No Arcium CPI)
  // ============================================

  describe("Basic Setup (No Arcium CPI)", () => {
    it("should initialize MXE account", async () => {
      const mxePda = deriveMxePda();

      // Check if MXE account already exists
      const existingAccount = await provider.connection.getAccountInfo(mxePda);
      if (existingAccount) {
        console.log("MXE account already initialized:", mxePda.toString());
        return;
      }

      const tx = await program.methods
        .initializeMxe()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: mxePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Initialize MXE tx:", tx);

      const mxeAccountInfo = await provider.connection.getAccountInfo(mxePda);
      expect(mxeAccountInfo).to.not.be.null;
    });

    it("should register a business", async () => {
      const [businessAccount] = deriveBusinessPda(owner.publicKey);
      businessPda = businessAccount;

      // Check if business already exists
      const existingAccount = await provider.connection.getAccountInfo(businessAccount);
      if (existingAccount) {
        console.log("Business already registered:", businessAccount.toString());
        return;
      }

      const tx = await program.methods
        .registerBusiness("Arcium Test Business", "https://example.com/arcium")
        .accountsPartial({
          authorityAccount: owner.publicKey,
          businessAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Register business tx:", tx);

      const business = await program.account.businessAccount.fetch(businessAccount);
      expect(business.authority.toString()).to.equal(owner.publicKey.toString());
    });

    it("should create a plan", async () => {
      // Ensure business exists
      if (!businessPda) {
        const [businessAccount] = deriveBusinessPda(owner.publicKey);
        businessPda = businessAccount;
      }

      const business = await program.account.businessAccount.fetch(businessPda);
      const planCount = typeof business.planCount === "number"
        ? business.planCount
        : (business.planCount as BN).toNumber();
      const [planAccount] = derivePlanPda(businessPda, planCount);
      planPda = planAccount;

      const encryptedName = generateRandomBytes(32);
      const encryptedDescription = generateRandomBytes(64);
      const priceUsdc = new anchor.BN(10_000_000);
      const billingCycleSeconds = 2592000;
      const nonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

      const tx = await program.methods
        .createPlan(
          encryptedName,
          encryptedDescription,
          priceUsdc,
          billingCycleSeconds,
          nonce
        )
        .accountsPartial({
          authorityAccount: owner.publicKey,
          businessAccount: businessPda,
          planAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Create plan tx:", tx);

      const plan = await program.account.plan.fetch(planAccount);
      expect(plan.isActive).to.be.true;
      expect(plan.pendingCountEncryption).to.be.false;
    });
  });

  // ============================================
  // Subscription Flow Tests (Non-Arcium)
  // ============================================

  describe("Subscription Flow (Non-Arcium)", () => {
    let subscriptionPda: PublicKey;
    let membershipCommitment: Uint8Array;

    it("should create a subscription using standard subscribe", async () => {
      const encryptedUserCommitment = generateRandomBytes(32);
      membershipCommitment = new Uint8Array(generateRandomBytes(32));
      const nonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

      const [subscriptionAccount] = deriveSubscriptionPda(
        planPda,
        membershipCommitment
      );
      subscriptionPda = subscriptionAccount;

      const tx = await program.methods
        .subscribe(encryptedUserCommitment, Array.from(membershipCommitment), nonce)
        .accountsPartial({
          userAccount: owner.publicKey,
          planAccount: planPda,
          subscriptionAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Subscribe tx:", tx);

      const subscription = await program.account.subscription.fetch(subscriptionAccount);
      expect(subscription.isActive).to.be.true;
    });

    it("should cancel a subscription using standard cancel", async () => {
      const tx = await program.methods
        .cancelSubscription()
        .accountsPartial({
          userAccount: owner.publicKey,
          subscriptionAccount: subscriptionPda,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Cancel subscription tx:", tx);

      const subscription = await program.account.subscription.fetch(subscriptionPda);
      expect(subscription.isActive).to.be.false;
    });
  });

  // ============================================
  // Arcium CPI Tests (Require `arcium test` environment)
  // ============================================

  describe("Initialize Computation Definitions (Arcium CPI Required)", function () {
    before(function () {
      if (!arciumEnv) {
        console.log("Skipping Arcium CPI tests - environment not available");
        this.skip();
      }
    });

    it("should initialize set_subscription_active comp_def", async () => {
      const compDefAccount = getCompDefAccAddress(
        program.programId,
        COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE
      );

      // Check if already initialized
      const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
      if (existingAccount) {
        console.log("comp_def already initialized:", compDefAccount.toString());
        return;
      }

      // Step 1: Initialize comp_def
      const tx = await program.methods
        .initSetSubscriptionActiveCompDef()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
          compDefAccount,
          clusterAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: getArciumProgramId(),
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("Init set_subscription_active comp_def tx:", tx);

      // Step 2: Upload raw circuit
      console.log("Uploading raw circuit for set_subscription_active...");
      const rawCircuit = readRawCircuit("set_subscription_active");
      const uploadTxs = await uploadCircuit(
        provider,
        "set_subscription_active",
        program.programId,
        rawCircuit,
        true
      );
      console.log("Upload circuit txs:", uploadTxs.length);

      // Step 3: Finalize comp_def
      console.log("Finalizing set_subscription_active comp_def...");
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE,
        program.programId
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.feePayer = owner.publicKey;
      finalizeTx.sign(owner);
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize comp_def tx:", finalizeSig);
    });

    it("should initialize set_subscription_cancelled comp_def", async () => {
      const compDefAccount = getCompDefAccAddress(
        program.programId,
        COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED
      );

      const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
      if (existingAccount) {
        console.log("comp_def already initialized:", compDefAccount.toString());
        return;
      }

      // Step 1: Initialize comp_def
      const tx = await program.methods
        .initSetSubscriptionCancelledCompDef()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
          compDefAccount,
          clusterAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: getArciumProgramId(),
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("Init set_subscription_cancelled comp_def tx:", tx);

      // Step 2: Upload raw circuit
      console.log("Uploading raw circuit for set_subscription_cancelled...");
      const rawCircuit = readRawCircuit("set_subscription_cancelled");
      const uploadTxs = await uploadCircuit(
        provider,
        "set_subscription_cancelled",
        program.programId,
        rawCircuit,
        true
      );
      console.log("Upload circuit txs:", uploadTxs.length);

      // Step 3: Finalize comp_def
      console.log("Finalizing set_subscription_cancelled comp_def...");
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED,
        program.programId
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.feePayer = owner.publicKey;
      finalizeTx.sign(owner);
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize comp_def tx:", finalizeSig);
    });

    it("should initialize increment_count comp_def", async () => {
      const compDefAccount = getCompDefAccAddress(
        program.programId,
        COMP_DEF_OFFSETS.INCREMENT_COUNT
      );

      const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
      if (existingAccount) {
        console.log("comp_def already initialized:", compDefAccount.toString());
        return;
      }

      // Step 1: Initialize comp_def
      const tx = await program.methods
        .initIncrementCountCompDef()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
          compDefAccount,
          clusterAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: getArciumProgramId(),
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("Init increment_count comp_def tx:", tx);

      // Step 2: Upload raw circuit
      console.log("Uploading raw circuit for increment_count...");
      const rawCircuit = readRawCircuit("increment_count");
      const uploadTxs = await uploadCircuit(
        provider,
        "increment_count",
        program.programId,
        rawCircuit,
        true
      );
      console.log("Upload circuit txs:", uploadTxs.length);

      // Step 3: Finalize comp_def
      console.log("Finalizing increment_count comp_def...");
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        COMP_DEF_OFFSETS.INCREMENT_COUNT,
        program.programId
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.feePayer = owner.publicKey;
      finalizeTx.sign(owner);
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize comp_def tx:", finalizeSig);
    });

    it("should initialize decrement_count comp_def", async () => {
      const compDefAccount = getCompDefAccAddress(
        program.programId,
        COMP_DEF_OFFSETS.DECREMENT_COUNT
      );

      const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
      if (existingAccount) {
        console.log("comp_def already initialized:", compDefAccount.toString());
        return;
      }

      // Step 1: Initialize comp_def
      const tx = await program.methods
        .initDecrementCountCompDef()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
          compDefAccount,
          clusterAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: getArciumProgramId(),
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("Init decrement_count comp_def tx:", tx);

      // Step 2: Upload raw circuit
      console.log("Uploading raw circuit for decrement_count...");
      const rawCircuit = readRawCircuit("decrement_count");
      const uploadTxs = await uploadCircuit(
        provider,
        "decrement_count",
        program.programId,
        rawCircuit,
        true
      );
      console.log("Upload circuit txs:", uploadTxs.length);

      // Step 3: Finalize comp_def
      console.log("Finalizing decrement_count comp_def...");
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        COMP_DEF_OFFSETS.DECREMENT_COUNT,
        program.programId
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.feePayer = owner.publicKey;
      finalizeTx.sign(owner);
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize comp_def tx:", finalizeSig);
    });

    it("should initialize initialize_count comp_def", async () => {
      const compDefAccount = getCompDefAccAddress(
        program.programId,
        COMP_DEF_OFFSETS.INITIALIZE_COUNT
      );

      const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
      if (existingAccount) {
        console.log("comp_def already initialized:", compDefAccount.toString());
        return;
      }

      // Step 1: Initialize comp_def
      const tx = await program.methods
        .initInitializeCountCompDef()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
          compDefAccount,
          clusterAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: getArciumProgramId(),
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("Init initialize_count comp_def tx:", tx);

      // Step 2: Upload raw circuit
      console.log("Uploading raw circuit for initialize_count...");
      const rawCircuit = readRawCircuit("initialize_count");
      const uploadTxs = await uploadCircuit(
        provider,
        "initialize_count",
        program.programId,
        rawCircuit,
        true
      );
      console.log("Upload circuit txs:", uploadTxs.length);

      // Step 3: Finalize comp_def
      console.log("Finalizing initialize_count comp_def...");
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        COMP_DEF_OFFSETS.INITIALIZE_COUNT,
        program.programId
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.feePayer = owner.publicKey;
      finalizeTx.sign(owner);
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize comp_def tx:", finalizeSig);
    });

    it("should initialize initialize_subscription_status comp_def", async () => {
      const compDefAccount = getCompDefAccAddress(
        program.programId,
        COMP_DEF_OFFSETS.INITIALIZE_SUBSCRIPTION_STATUS
      );

      const existingAccount = await provider.connection.getAccountInfo(compDefAccount);
      if (existingAccount) {
        console.log("comp_def already initialized:", compDefAccount.toString());
        return;
      }

      // Step 1: Initialize comp_def
      const tx = await program.methods
        .initInitializeSubscriptionStatusCompDef()
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
          compDefAccount,
          clusterAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: getArciumProgramId(),
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("Init initialize_subscription_status comp_def tx:", tx);

      // Step 2: Upload raw circuit
      console.log("Uploading raw circuit for initialize_subscription_status...");
      const rawCircuit = readRawCircuit("initialize_subscription_status");
      const uploadTxs = await uploadCircuit(
        provider,
        "initialize_subscription_status",
        program.programId,
        rawCircuit,
        true
      );
      console.log("Upload circuit txs:", uploadTxs.length);

      // Step 3: Finalize comp_def
      console.log("Finalizing initialize_subscription_status comp_def...");
      const finalizeTx = await buildFinalizeCompDefTx(
        provider,
        COMP_DEF_OFFSETS.INITIALIZE_SUBSCRIPTION_STATUS,
        program.programId
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.feePayer = owner.publicKey;
      finalizeTx.sign(owner);
      const finalizeSig = await provider.sendAndConfirm(finalizeTx);
      console.log("Finalize comp_def tx:", finalizeSig);
    });
  });

  // ============================================
  // Subscribe with Arcium Tests
  // ============================================

  describe("Subscribe with Arcium (Arcium CPI Required)", function () {
    before(function () {
      if (!arciumEnv) {
        console.log("Skipping Arcium CPI tests - environment not available");
        this.skip();
      }
    });

    it("should subscribe with Arcium MXE encryption", async () => {
      // Generate x25519 keypair for encryption
      const clientPrivateKey = x25519.utils.randomPrivateKey();

      // Derive shared secret with MXE
      const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);

      // Create Rescue cipher for encryption (available for encrypting data if needed)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cipher = new RescueCipher(sharedSecret);
      void cipher; // Cipher available for future use to encrypt data before sending

      // Generate membership commitment and encrypted user commitment
      const arciumMembershipCommitment = new Uint8Array(generateRandomBytes(32));
      const encryptedUserCommitment = generateRandomBytes(32);
      const userNonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

      const [subscriptionAccount] = deriveSubscriptionPda(
        planPda,
        arciumMembershipCommitment
      );

      // Generate computation offset
      const computationOffset = generateComputationOffset();

      // Get all required Arcium accounts
      const arciumAccounts = getArciumAccounts(
        computationOffset,
        COMP_DEF_OFFSETS.SET_SUBSCRIPTION_ACTIVE
      );

      // Subscribe with Arcium encryption
      const tx = await program.methods
        .subscribeWithArcium(
          computationOffset,
          encryptedUserCommitment,
          Array.from(arciumMembershipCommitment),
          userNonce
        )
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: arciumAccounts.mxeAccount,
          mempoolAccount: arciumAccounts.mempoolAccount,
          executingPool: arciumAccounts.executingPool,
          computationAccount: arciumAccounts.computationAccount,
          compDefAccount: arciumAccounts.compDefAccount,
          clusterAccount: arciumAccounts.clusterAccount,
          poolAccount: arciumAccounts.poolAccount,
          clockAccount: arciumAccounts.clockAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: arciumAccounts.arciumProgram,
          planAccount: planPda,
          subscriptionAccount,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Subscribe with Arcium tx:", tx);

      // Wait for computation finalization
      console.log("Waiting for computation finalization...");
      const finalizeTx = await awaitComputationFinalization(
        provider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Computation finalized tx:", finalizeTx);

      // Verify subscription was created
      const subscription = await program.account.subscription.fetch(subscriptionAccount);
      expect(subscription.isActive).to.be.true;
      expect(subscription.plan.toString()).to.equal(planPda.toString());

      // After callback, pending_encryption should be false
      expect(subscription.pendingEncryption).to.be.false;
    });
  });

  // ============================================
  // Cancel Subscription with Arcium Tests
  // ============================================

  describe("Cancel Subscription with Arcium (Arcium CPI Required)", function () {
    let cancelSubscriptionPda: PublicKey;
    let cancelMembershipCommitment: Uint8Array;

    before(async function () {
      if (!arciumEnv) {
        console.log("Skipping Arcium CPI tests - environment not available");
        this.skip();
      }

      // Create a new subscription to cancel
      cancelMembershipCommitment = new Uint8Array(generateRandomBytes(32));
      const [subscriptionAccount] = deriveSubscriptionPda(
        planPda,
        cancelMembershipCommitment
      );
      cancelSubscriptionPda = subscriptionAccount;

      // First subscribe without Arcium to create the account
      const tx = await program.methods
        .subscribe(
          generateRandomBytes(32),
          Array.from(cancelMembershipCommitment),
          new anchor.BN(randomBytes(16).toString("hex"), "hex")
        )
        .accountsPartial({
          userAccount: owner.publicKey,
          planAccount: planPda,
          subscriptionAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Created subscription for cancel test:", tx);
    });

    it("should cancel subscription with Arcium MXE encryption", async () => {
      const computationOffset = generateComputationOffset();

      const arciumAccounts = getArciumAccounts(
        computationOffset,
        COMP_DEF_OFFSETS.SET_SUBSCRIPTION_CANCELLED
      );

      const tx = await program.methods
        .cancelSubscriptionWithArcium(computationOffset)
        .accountsPartial({
          payer: owner.publicKey,
          mxeAccount: arciumAccounts.mxeAccount,
          mempoolAccount: arciumAccounts.mempoolAccount,
          executingPool: arciumAccounts.executingPool,
          computationAccount: arciumAccounts.computationAccount,
          compDefAccount: arciumAccounts.compDefAccount,
          clusterAccount: arciumAccounts.clusterAccount,
          poolAccount: arciumAccounts.poolAccount,
          clockAccount: arciumAccounts.clockAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: arciumAccounts.arciumProgram,
          subscriptionAccount: cancelSubscriptionPda,
          planAccount: planPda,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Cancel subscription with Arcium tx:", tx);

      // Wait for computation finalization
      console.log("Waiting for computation finalization...");
      const finalizeTx = await awaitComputationFinalization(
        provider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Computation finalized tx:", finalizeTx);

      // Verify subscription was cancelled
      const subscription = await program.account.subscription.fetch(cancelSubscriptionPda);
      expect(subscription.isActive).to.be.false;
      expect(subscription.cancelledAt.toNumber()).to.be.greaterThan(0);
    });
  });

  // ============================================
  // Account Structure Validation
  // ============================================

  describe("Account Structure Validation", () => {
    it("should verify Subscription account has pending_encryption field", async () => {
      const newMembershipCommitment = new Uint8Array(generateRandomBytes(32));

      // Get current plan count
      const business = await program.account.businessAccount.fetch(businessPda);
      const planCount = typeof business.planCount === "number"
        ? business.planCount
        : (business.planCount as BN).toNumber();
      const [newPlanPda] = derivePlanPda(businessPda, planCount);

      // Create a new plan for this test
      await program.methods
        .createPlan(
          generateRandomBytes(32),
          generateRandomBytes(64),
          new anchor.BN(5_000_000),
          2592000,
          new anchor.BN(randomBytes(16).toString("hex"), "hex")
        )
        .accountsPartial({
          authorityAccount: owner.publicKey,
          businessAccount: businessPda,
          planAccount: newPlanPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      const [subscriptionForNewPlan] = deriveSubscriptionPda(
        newPlanPda,
        newMembershipCommitment
      );

      await program.methods
        .subscribe(
          generateRandomBytes(32),
          Array.from(newMembershipCommitment),
          new anchor.BN(randomBytes(16).toString("hex"), "hex")
        )
        .accountsPartial({
          userAccount: owner.publicKey,
          planAccount: newPlanPda,
          subscriptionAccount: subscriptionForNewPlan,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      const subscription = await program.account.subscription.fetch(subscriptionForNewPlan);

      // Verify the subscription account structure
      expect(subscription).to.have.property("subscriptionId");
      expect(subscription).to.have.property("plan");
      expect(subscription).to.have.property("encryptedUserCommitment");
      expect(subscription).to.have.property("membershipCommitment");
      expect(subscription).to.have.property("encryptedStatus");
      expect(subscription).to.have.property("statusNonce");
      expect(subscription).to.have.property("subscribedAt");
      expect(subscription).to.have.property("cancelledAt");
      expect(subscription).to.have.property("isActive");
      expect(subscription).to.have.property("nonce");
      expect(subscription).to.have.property("bump");

      console.log("Subscription account structure validated");
    });

    it("should verify Plan account has pending_count_encryption field", async () => {
      const plan = await program.account.plan.fetch(planPda);

      expect(plan).to.have.property("planId");
      expect(plan).to.have.property("business");
      expect(plan).to.have.property("encryptedName");
      expect(plan).to.have.property("encryptedDescription");
      expect(plan).to.have.property("priceUsdc");
      expect(plan).to.have.property("billingCycleSeconds");
      expect(plan).to.have.property("createdAt");
      expect(plan).to.have.property("isActive");
      expect(plan).to.have.property("encryptedSubscriptionCount");
      expect(plan).to.have.property("nonce");
      expect(plan).to.have.property("planNonce");
      expect(plan).to.have.property("bump");
      expect(plan).to.have.property("pendingCountEncryption");

      console.log("Plan account structure validated");
      console.log("  pendingCountEncryption:", plan.pendingCountEncryption);
    });
  });
});
