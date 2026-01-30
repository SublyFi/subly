import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { SublyDevnet } from "../target/types/subly_devnet";
import { randomBytes } from "crypto";
import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";

// PDA Seeds (must match constants.rs)
const BUSINESS_SEED = Buffer.from("business");
const PLAN_SEED = Buffer.from("plan");
const SUBSCRIPTION_SEED = Buffer.from("subscription");

describe("SublyDevnet", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.SublyDevnet as Program<SublyDevnet>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Helper function to read keypair from JSON file
  function readKpJson(path: string): Keypair {
    const file = fs.readFileSync(path);
    return Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(file.toString()))
    );
  }

  // Generate a unique test keypair to avoid conflicts with other tests
  const owner = Keypair.generate();

  // Helper function to derive Business PDA
  function deriveBusinessPda(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [BUSINESS_SEED, authority.toBuffer()],
      program.programId
    );
  }

  // Helper function to derive Plan PDA
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

  // Helper function to derive Subscription PDA
  function deriveSubscriptionPda(
    plan: PublicKey,
    membershipCommitment: Uint8Array
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SUBSCRIPTION_SEED, plan.toBuffer(), membershipCommitment],
      program.programId
    );
  }

  // Generate random bytes for encrypted data
  function generateRandomBytes(length: number): number[] {
    return Array.from(randomBytes(length));
  }

  // Test state
  let businessPda: PublicKey;
  let planPda: PublicKey;
  let subscriptionPda: PublicKey;
  let membershipCommitment: Uint8Array;

  // Setup: Fund the test wallet
  before(async () => {
    const airdropSig = await provider.connection.requestAirdrop(
      owner.publicKey,
      10_000_000_000 // 10 SOL
    );
    await provider.connection.confirmTransaction(airdropSig, "confirmed");
    console.log("Test wallet funded:", owner.publicKey.toString());
  });

  describe("Business Registration", () => {
    it("should register a new business", async () => {
      const [businessAccount, bump] = deriveBusinessPda(owner.publicKey);
      businessPda = businessAccount;

      const name = "Test Business";
      const metadataUri = "https://example.com/metadata.json";

      const tx = await program.methods
        .registerBusiness(name, metadataUri)
        .accountsPartial({
          authorityAccount: owner.publicKey,
          businessAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Register business tx:", tx);

      // Fetch and verify the business account
      const business = await program.account.businessAccount.fetch(
        businessAccount
      );

      expect(business.authority.toString()).to.equal(
        owner.publicKey.toString()
      );
      expect(business.name).to.equal(name);
      expect(business.metadataUri).to.equal(metadataUri);
      expect(business.isActive).to.be.true;
      expect(business.planCount.toNumber()).to.equal(0);
      expect(business.bump).to.equal(bump);
    });

    it("should fail to register duplicate business", async () => {
      const [businessAccount] = deriveBusinessPda(owner.publicKey);

      try {
        await program.methods
          .registerBusiness("Duplicate", "https://example.com")
          .accountsPartial({
            authorityAccount: owner.publicKey,
            businessAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        // Account already initialized error
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Plan Creation", () => {
    it("should create a new plan", async () => {
      // Generate encrypted data (placeholder - in production, use Arcium encryption)
      const encryptedName = generateRandomBytes(32);
      const encryptedDescription = generateRandomBytes(64);
      const priceUsdc = new anchor.BN(10_000_000); // 10 USDC
      const billingCycleSeconds = 2592000; // 30 days
      const nonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

      // Derive plan PDA (plan_nonce = 0 for first plan)
      const [planAccount, bump] = derivePlanPda(businessPda, 0);
      planPda = planAccount;

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

      // Fetch and verify the plan account
      const plan = await program.account.plan.fetch(planAccount);

      expect(plan.planId.toString()).to.equal(planAccount.toString());
      expect(plan.business.toString()).to.equal(businessPda.toString());
      expect(plan.priceUsdc.toNumber()).to.equal(10_000_000);
      expect(plan.billingCycleSeconds).to.equal(billingCycleSeconds);
      expect(plan.isActive).to.be.true;
      expect(plan.planNonce.toNumber()).to.equal(0);
      expect(plan.bump).to.equal(bump);

      // Verify business plan count was incremented
      const business = await program.account.businessAccount.fetch(businessPda);
      expect(business.planCount.toNumber()).to.equal(1);
    });

    it("should fail to create plan with invalid price", async () => {
      const [planAccount] = derivePlanPda(businessPda, 1);

      try {
        await program.methods
          .createPlan(
            generateRandomBytes(32),
            generateRandomBytes(64),
            new anchor.BN(0), // Invalid: price = 0
            2592000,
            new anchor.BN(randomBytes(16).toString("hex"), "hex")
          )
          .accountsPartial({
            authorityAccount: owner.publicKey,
            businessAccount: businessPda,
            planAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("InvalidPrice");
      }
    });

    it("should fail to create plan with invalid billing cycle", async () => {
      const [planAccount] = derivePlanPda(businessPda, 1);

      try {
        await program.methods
          .createPlan(
            generateRandomBytes(32),
            generateRandomBytes(64),
            new anchor.BN(10_000_000),
            100, // Invalid: less than 1 hour (3600 seconds)
            new anchor.BN(randomBytes(16).toString("hex"), "hex")
          )
          .accountsPartial({
            authorityAccount: owner.publicKey,
            businessAccount: businessPda,
            planAccount,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("InvalidBillingCycle");
      }
    });
  });

  describe("Subscription", () => {
    it("should subscribe to a plan", async () => {
      // Generate commitment values
      const encryptedUserCommitment = generateRandomBytes(32);
      membershipCommitment = new Uint8Array(generateRandomBytes(32));
      const nonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

      // Derive subscription PDA
      const [subscriptionAccount, bump] = deriveSubscriptionPda(
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

      // Fetch and verify the subscription account
      const subscription = await program.account.subscription.fetch(
        subscriptionAccount
      );

      expect(subscription.subscriptionId.toString()).to.equal(
        subscriptionAccount.toString()
      );
      expect(subscription.plan.toString()).to.equal(planPda.toString());
      expect(subscription.isActive).to.be.true;
      expect(subscription.cancelledAt.toNumber()).to.equal(0);
      expect(subscription.bump).to.equal(bump);
    });

    it("should fail to create duplicate subscription", async () => {
      const [subscriptionAccount] = deriveSubscriptionPda(
        planPda,
        membershipCommitment
      );

      try {
        await program.methods
          .subscribe(
            generateRandomBytes(32),
            Array.from(membershipCommitment),
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

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Get Subscription Count", () => {
    it("should get subscription count for a plan", async () => {
      const count = await program.methods
        .getSubscriptionCount()
        .accounts({
          planAccount: planPda,
        })
        .view();

      // Count is encrypted, so we just verify it's a 32-byte array
      expect(count).to.have.length(32);
      console.log("Encrypted subscription count:", count);
    });
  });

  describe("Cancel Subscription", () => {
    it("should cancel an active subscription", async () => {
      const tx = await program.methods
        .cancelSubscription()
        .accountsPartial({
          userAccount: owner.publicKey,
          subscriptionAccount: subscriptionPda,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Cancel subscription tx:", tx);

      // Fetch and verify the subscription was cancelled
      const subscription = await program.account.subscription.fetch(
        subscriptionPda
      );

      expect(subscription.isActive).to.be.false;
      expect(subscription.cancelledAt.toNumber()).to.be.greaterThan(0);
    });

    it("should fail to cancel already cancelled subscription", async () => {
      try {
        await program.methods
          .cancelSubscription()
          .accountsPartial({
            userAccount: owner.publicKey,
            subscriptionAccount: subscriptionPda,
          })
          .signers([owner])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("SubscriptionNotActive");
      }
    });
  });

  describe("Deactivate Plan", () => {
    it("should deactivate an active plan", async () => {
      const tx = await program.methods
        .deactivatePlan()
        .accountsPartial({
          authorityAccount: owner.publicKey,
          businessAccount: businessPda,
          planAccount: planPda,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });

      console.log("Deactivate plan tx:", tx);

      // Fetch and verify the plan was deactivated
      const plan = await program.account.plan.fetch(planPda);
      expect(plan.isActive).to.be.false;
    });

    it("should fail to deactivate already inactive plan", async () => {
      try {
        await program.methods
          .deactivatePlan()
          .accountsPartial({
            authorityAccount: owner.publicKey,
            businessAccount: businessPda,
            planAccount: planPda,
          })
          .signers([owner])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("PlanNotActive");
      }
    });

    it("should fail to subscribe to inactive plan", async () => {
      const newMembershipCommitment = new Uint8Array(generateRandomBytes(32));
      const [newSubscriptionPda] = deriveSubscriptionPda(
        planPda,
        newMembershipCommitment
      );

      try {
        await program.methods
          .subscribe(
            generateRandomBytes(32),
            Array.from(newMembershipCommitment),
            new anchor.BN(randomBytes(16).toString("hex"), "hex")
          )
          .accountsPartial({
            userAccount: owner.publicKey,
            planAccount: planPda,
            subscriptionAccount: newSubscriptionPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).to.include("PlanNotActive");
      }
    });
  });

  describe("Authorization", () => {
    it("should fail to create plan with wrong authority", async () => {
      const wrongAuthority = Keypair.generate();

      // Airdrop some SOL to the wrong authority
      const airdropSig = await provider.connection.requestAirdrop(
        wrongAuthority.publicKey,
        1_000_000_000 // 1 SOL
      );
      await provider.connection.confirmTransaction(airdropSig, "confirmed");

      // Try to create plan with wrong authority
      // First need to get business PDA for wrong authority
      const [wrongBusinessPda] = deriveBusinessPda(wrongAuthority.publicKey);

      // Register business for wrong authority first
      await program.methods
        .registerBusiness("Wrong Authority Business", "https://wrong.com")
        .accountsPartial({
          authorityAccount: wrongAuthority.publicKey,
          businessAccount: wrongBusinessPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([wrongAuthority])
        .rpc({ commitment: "confirmed" });

      // Now try to create a plan for the original business with wrong authority
      const [newPlanPda] = derivePlanPda(businessPda, 1);

      try {
        await program.methods
          .createPlan(
            generateRandomBytes(32),
            generateRandomBytes(64),
            new anchor.BN(10_000_000),
            2592000,
            new anchor.BN(randomBytes(16).toString("hex"), "hex")
          )
          .accountsPartial({
            authorityAccount: wrongAuthority.publicKey,
            businessAccount: businessPda, // Original business
            planAccount: newPlanPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongAuthority])
          .rpc({ commitment: "confirmed" });

        expect.fail("Should have thrown an error");
      } catch (error: any) {
        // Should fail with seeds constraint error (PDA mismatch)
        expect(error.message).to.include("seeds");
      }
    });
  });
});
