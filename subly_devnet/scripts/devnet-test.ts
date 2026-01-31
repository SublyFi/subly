import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { SublyDevnet } from "../target/types/subly_devnet";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";

// PDA Seeds
const BUSINESS_SEED = Buffer.from("business");
const PLAN_SEED = Buffer.from("plan");
const SUBSCRIPTION_SEED = Buffer.from("subscription");

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

async function main() {
  console.log("=== Subly Devnet Test Script ===\n");

  // Setup connection
  const connection = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  // Load wallet
  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const wallet = readKpJson(walletPath);
  const anchorWallet = new anchor.Wallet(wallet);

  console.log("Wallet:", wallet.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.1 * 1e9) {
    console.error("Insufficient balance. Please fund your wallet on devnet.");
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
  console.log("---\n");

  // Derive PDAs
  const [businessPda] = deriveBusinessPda(wallet.publicKey, programId);
  console.log("Business PDA:", businessPda.toString());

  // Check if business already exists
  let businessAccount;
  try {
    businessAccount = await program.account.businessAccount.fetch(businessPda);
    console.log("✅ Business already exists");
    console.log("   Name:", businessAccount.name);
    console.log("   Plan Count:", businessAccount.planCount.toString());
  } catch (e) {
    console.log("❌ Business does not exist. Creating...");

    try {
      const tx = await program.methods
        .registerBusiness("Devnet Test Business", "https://example.com/metadata")
        .accountsPartial({
          authorityAccount: wallet.publicKey,
          businessAccount: businessPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc({ commitment: "confirmed" });

      console.log("✅ Business created. Tx:", tx);
      businessAccount = await program.account.businessAccount.fetch(businessPda);
    } catch (createError: any) {
      console.error("Failed to create business:", createError.message);
      process.exit(1);
    }
  }

  console.log("---\n");

  // Check for existing plan or create one
  const planCount = typeof businessAccount.planCount === "number"
    ? businessAccount.planCount
    : (businessAccount.planCount as BN).toNumber();

  let planPda: PublicKey;
  let planAccount;

  if (planCount > 0) {
    // Use existing plan
    [planPda] = derivePlanPda(businessPda, 0, programId);
    console.log("Plan PDA (nonce=0):", planPda.toString());

    try {
      planAccount = await program.account.plan.fetch(planPda);
      console.log("✅ Plan exists");
      console.log("   Price:", planAccount.priceUsdc.toString(), "USDC (scaled)");
      console.log("   Active:", planAccount.isActive);
    } catch (e) {
      console.log("❌ Plan not found despite planCount > 0");
    }
  } else {
    // Create new plan
    [planPda] = derivePlanPda(businessPda, 0, programId);
    console.log("Creating new plan...");

    try {
      const tx = await program.methods
        .createPlan(
          generateRandomBytes(32),
          generateRandomBytes(64),
          new anchor.BN(10_000_000), // 10 USDC
          2592000, // 30 days
          new anchor.BN(randomBytes(16).toString("hex"), "hex")
        )
        .accountsPartial({
          authorityAccount: wallet.publicKey,
          businessAccount: businessPda,
          planAccount: planPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([wallet])
        .rpc({ commitment: "confirmed" });

      console.log("✅ Plan created. Tx:", tx);
      planAccount = await program.account.plan.fetch(planPda);
    } catch (createError: any) {
      console.error("Failed to create plan:", createError.message);
      process.exit(1);
    }
  }

  console.log("---\n");

  // Test subscription
  if (planAccount && planAccount.isActive) {
    console.log("Testing subscription...");

    const membershipCommitment = new Uint8Array(generateRandomBytes(32));
    const [subscriptionPda] = deriveSubscriptionPda(planPda, membershipCommitment, programId);

    console.log("Subscription PDA:", subscriptionPda.toString());

    try {
      // Check if subscription exists
      const existingSubscription = await connection.getAccountInfo(subscriptionPda);
      if (existingSubscription) {
        console.log("⚠️ Subscription already exists (different commitment needed for new one)");
      } else {
        const tx = await program.methods
          .subscribe(
            generateRandomBytes(32),
            Array.from(membershipCommitment),
            new anchor.BN(randomBytes(16).toString("hex"), "hex")
          )
          .accountsPartial({
            userAccount: wallet.publicKey,
            planAccount: planPda,
            subscriptionAccount: subscriptionPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([wallet])
          .rpc({ commitment: "confirmed" });

        console.log("✅ Subscription created. Tx:", tx);

        const subscription = await program.account.subscription.fetch(subscriptionPda);
        console.log("   Active:", subscription.isActive);
        console.log("   Subscribed At:", new Date(subscription.subscribedAt.toNumber() * 1000).toISOString());
      }
    } catch (subError: any) {
      console.error("Subscription error:", subError.message);
    }
  } else {
    console.log("⚠️ Plan is not active, skipping subscription test");
  }

  console.log("\n=== Test Complete ===");
}

main().catch(console.error);
