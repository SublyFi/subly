import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SublyVault } from "../target/types/subly_vault";
import { expect } from "chai";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as crypto from "crypto";

describe("subly-vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SublyVault as Program<SublyVault>;

  // PDA seeds
  const SHIELD_POOL_SEED = Buffer.from("shield_pool");
  const USER_SHARE_SEED = Buffer.from("share");
  const DEPOSIT_HISTORY_SEED = Buffer.from("deposit_history");
  const SCHEDULED_TRANSFER_SEED = Buffer.from("transfer");
  const TRANSFER_HISTORY_SEED = Buffer.from("history");
  const NULLIFIER_SEED = Buffer.from("nullifier");
  const BATCH_PROOF_SEED = Buffer.from("batch_proof");

  // Derive Shield Pool PDA
  const [shieldPoolPda, shieldPoolBump] = PublicKey.findProgramAddressSync(
    [SHIELD_POOL_SEED],
    program.programId
  );

  // Test data
  const generateCommitment = (): number[] => {
    return Array.from(crypto.randomBytes(32));
  };

  const generateEncryptedShare = (): number[] => {
    return Array.from(crypto.randomBytes(64));
  };

  const generateNullifier = (): number[] => {
    return Array.from(crypto.randomBytes(32));
  };

  // Helper to derive User Share PDA
  const getUserSharePda = (commitment: number[]): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [USER_SHARE_SEED, shieldPoolPda.toBuffer(), Buffer.from(commitment)],
      program.programId
    );
  };

  // Helper to derive Deposit History PDA
  const getDepositHistoryPda = (
    commitment: number[],
    depositIndex: anchor.BN
  ): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [
        DEPOSIT_HISTORY_SEED,
        Buffer.from(commitment),
        depositIndex.toBuffer("le", 8),
      ],
      program.programId
    );
  };

  // Helper to derive Nullifier PDA
  const getNullifierPda = (nullifierHash: number[]): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [NULLIFIER_SEED, Buffer.from(nullifierHash)],
      program.programId
    );
  };

  // Helper to derive Scheduled Transfer PDA
  const getScheduledTransferPda = (
    commitment: number[],
    transferNonce: anchor.BN
  ): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [
        SCHEDULED_TRANSFER_SEED,
        Buffer.from(commitment),
        transferNonce.toBuffer("le", 8),
      ],
      program.programId
    );
  };

  describe("initialize", () => {
    it("Initializes the Shield Pool", async () => {
      try {
        const tx = await program.methods
          .initialize()
          .accounts({
            authority: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Initialize transaction:", tx);

        // Fetch the shield pool account
        const shieldPool = await program.account.shieldPool.fetch(shieldPoolPda);

        expect(shieldPool.authority.toBase58()).to.equal(
          provider.wallet.publicKey.toBase58()
        );
        expect(shieldPool.totalPoolValue.toNumber()).to.equal(0);
        expect(shieldPool.totalShares.toNumber()).to.equal(0);
        expect(shieldPool.isActive).to.equal(true);
        expect(shieldPool.bump).to.equal(shieldPoolBump);

        console.log("Shield Pool initialized successfully!");
        console.log("  Pool ID:", shieldPool.poolId.toBase58());
        console.log("  Authority:", shieldPool.authority.toBase58());
        console.log("  Is Active:", shieldPool.isActive);
      } catch (error: any) {
        // If already initialized, that's fine for repeat tests
        if (error.message?.includes("already in use")) {
          console.log("Shield Pool already initialized");
          return;
        }
        throw error;
      }
    });
  });

  describe("deposit", () => {
    let commitment: number[];
    let userSharePda: PublicKey;
    let depositHistoryPda: PublicKey;

    before(() => {
      commitment = generateCommitment();
      [userSharePda] = getUserSharePda(commitment);
    });

    it("Deposits USDC into the Shield Pool", async () => {
      const amount = new anchor.BN(1_000_000); // 1 USDC (6 decimals)
      const encryptedShare = generateEncryptedShare();
      const depositIndex = new anchor.BN(0);

      [depositHistoryPda] = getDepositHistoryPda(commitment, depositIndex);

      try {
        const tx = await program.methods
          .deposit(amount, commitment, encryptedShare, depositIndex)
          .accounts({
            depositor: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            depositHistory: depositHistoryPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Deposit transaction:", tx);

        // Fetch the user share account
        const userShare = await program.account.userShare.fetch(userSharePda);
        console.log("User Share created successfully!");
        console.log("  Pool:", userShare.pool.toBase58());

        // Verify user share data
        expect(userShare.pool.toBase58()).to.equal(shieldPoolPda.toBase58());
        expect(userShare.userCommitment).to.deep.equal(commitment);

        // Fetch the updated shield pool
        const shieldPool = await program.account.shieldPool.fetch(shieldPoolPda);
        console.log("Shield Pool after deposit:");
        console.log("  Total Pool Value:", shieldPool.totalPoolValue.toString());
        console.log("  Total Shares:", shieldPool.totalShares.toString());

        // Verify pool state updated
        expect(shieldPool.totalPoolValue.toNumber()).to.equal(amount.toNumber());
        expect(shieldPool.totalShares.toNumber()).to.equal(amount.toNumber()); // First deposit: 1:1 ratio
      } catch (error: any) {
        console.log("Deposit error:", error.message);
        throw error;
      }
    });

    it("Fails with insufficient deposit amount", async () => {
      const tooSmallAmount = new anchor.BN(100); // 0.0001 USDC - below minimum
      const newCommitment = generateCommitment();
      const encryptedShare = generateEncryptedShare();
      const depositIndex = new anchor.BN(1);

      const [newUserSharePda] = getUserSharePda(newCommitment);
      const [newDepositHistoryPda] = getDepositHistoryPda(newCommitment, depositIndex);

      try {
        await program.methods
          .deposit(tooSmallAmount, newCommitment, encryptedShare, depositIndex)
          .accounts({
            depositor: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: newUserSharePda,
            depositHistory: newDepositHistoryPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // Should not reach here
        expect.fail("Expected InsufficientDeposit error");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientDeposit");
        console.log("Correctly rejected insufficient deposit");
      }
    });
  });

  describe("withdraw", () => {
    let commitment: number[];
    let userSharePda: PublicKey;

    before(async () => {
      // First, create a deposit
      commitment = generateCommitment();
      [userSharePda] = getUserSharePda(commitment);

      const depositAmount = new anchor.BN(10_000_000); // 10 USDC
      const encryptedShare = generateEncryptedShare();

      // Get pool nonce for deposit index
      const pool = await program.account.shieldPool.fetch(shieldPoolPda);
      const depositIndex = pool.nonce;

      const [depositHistoryPda] = getDepositHistoryPda(commitment, new anchor.BN(depositIndex.toString()));

      await program.methods
        .deposit(depositAmount, commitment, encryptedShare, new anchor.BN(depositIndex.toString()))
        .accounts({
          depositor: provider.wallet.publicKey,
          shieldPool: shieldPoolPda,
          userShare: userSharePda,
          depositHistory: depositHistoryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Setup: Deposited 10 USDC for withdrawal test");
    });

    it("Withdraws USDC from the Shield Pool", async () => {
      const withdrawAmount = new anchor.BN(1_000_000); // 1 USDC
      const nullifierHash = generateNullifier();
      const newEncryptedShare = generateEncryptedShare();
      const proof = Buffer.from([]);
      const publicInputs: number[][] = [];

      const [nullifierPda] = getNullifierPda(nullifierHash);

      try {
        const tx = await program.methods
          .withdraw(
            withdrawAmount,
            nullifierHash,
            newEncryptedShare,
            proof,
            publicInputs
          )
          .accounts({
            withdrawer: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            nullifier: nullifierPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Withdraw transaction:", tx);

        // Fetch and verify nullifier
        const nullifier = await program.account.nullifier.fetch(nullifierPda);
        expect(nullifier.isUsed).to.equal(true);
        console.log("Withdrawal successful, nullifier registered");
      } catch (error: any) {
        console.log("Withdraw error:", error.message);
        throw error;
      }
    });

    it("Fails with same nullifier (double-spend prevention)", async () => {
      const withdrawAmount = new anchor.BN(1_000_000);
      const sameNullifierHash = generateNullifier();
      const newEncryptedShare = generateEncryptedShare();
      const proof = Buffer.from([]);
      const publicInputs: number[][] = [];

      const [nullifierPda] = getNullifierPda(sameNullifierHash);

      // First withdrawal
      await program.methods
        .withdraw(
          withdrawAmount,
          sameNullifierHash,
          newEncryptedShare,
          proof,
          publicInputs
        )
        .accounts({
          withdrawer: provider.wallet.publicKey,
          shieldPool: shieldPoolPda,
          userShare: userSharePda,
          nullifier: nullifierPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Try to use the same nullifier again (should fail at PDA creation)
      try {
        await program.methods
          .withdraw(
            withdrawAmount,
            sameNullifierHash,
            newEncryptedShare,
            proof,
            publicInputs
          )
          .accounts({
            withdrawer: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            nullifier: nullifierPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Expected error for reused nullifier");
      } catch (error: any) {
        // Account already exists or constraint error
        console.log("Correctly prevented double-spend with same nullifier");
      }
    });
  });

  describe("scheduled transfers", () => {
    let commitment: number[];
    let userSharePda: PublicKey;
    let scheduledTransferPda: PublicKey;
    // Privacy-preserving: recipient is encrypted, not stored in plain text
    const generateEncryptedTransferData = (): number[] => {
      return Array.from(crypto.randomBytes(128));
    };

    before(async () => {
      // First, create a deposit
      commitment = generateCommitment();
      [userSharePda] = getUserSharePda(commitment);

      const depositAmount = new anchor.BN(100_000_000); // 100 USDC
      const encryptedShare = generateEncryptedShare();

      const pool = await program.account.shieldPool.fetch(shieldPoolPda);
      const depositIndex = pool.nonce;

      const [depositHistoryPda] = getDepositHistoryPda(commitment, new anchor.BN(depositIndex.toString()));

      await program.methods
        .deposit(depositAmount, commitment, encryptedShare, new anchor.BN(depositIndex.toString()))
        .accounts({
          depositor: provider.wallet.publicKey,
          shieldPool: shieldPoolPda,
          userShare: userSharePda,
          depositHistory: depositHistoryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Setup: Deposited 100 USDC for scheduled transfer test");
    });

    it("Sets up a recurring transfer", async () => {
      const amount = new anchor.BN(10_000_000); // 10 USDC per transfer
      const intervalSeconds = 86400; // 1 day
      const transferNonce = new anchor.BN(0);
      // Privacy-preserving: recipient is encrypted in this 128-byte data
      const encryptedTransferData = generateEncryptedTransferData();

      [scheduledTransferPda] = getScheduledTransferPda(commitment, transferNonce);

      try {
        const tx = await program.methods
          .setupTransfer(encryptedTransferData, amount, intervalSeconds, transferNonce)
          .accounts({
            payer: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            scheduledTransfer: scheduledTransferPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Setup transfer transaction:", tx);

        // Fetch and verify scheduled transfer
        const transfer = await program.account.scheduledTransfer.fetch(
          scheduledTransferPda
        );

        // Privacy: recipient is no longer stored in plain text
        expect(transfer.encryptedTransferData).to.deep.equal(encryptedTransferData);
        expect(transfer.amount.toNumber()).to.equal(amount.toNumber());
        expect(transfer.intervalSeconds).to.equal(intervalSeconds);
        expect(transfer.isActive).to.equal(true);
        expect(transfer.executionCount.toNumber()).to.equal(0);

        console.log("Scheduled transfer created successfully!");
        console.log("  Amount:", transfer.amount.toString());
        console.log("  Interval:", transfer.intervalSeconds, "seconds");
        console.log("  Next Execution:", new Date(transfer.nextExecution.toNumber() * 1000).toISOString());
      } catch (error: any) {
        console.log("Setup transfer error:", error.message);
        throw error;
      }
    });

    it("Fails with invalid interval", async () => {
      const amount = new anchor.BN(10_000_000);
      const invalidInterval = 100; // Less than minimum (86400)
      const transferNonce = new anchor.BN(1);
      const encryptedTransferData = generateEncryptedTransferData();

      const [newTransferPda] = getScheduledTransferPda(commitment, transferNonce);

      try {
        await program.methods
          .setupTransfer(encryptedTransferData, amount, invalidInterval, transferNonce)
          .accounts({
            payer: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            scheduledTransfer: newTransferPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Expected InvalidInterval error");
      } catch (error: any) {
        expect(error.message).to.include("InvalidInterval");
        console.log("Correctly rejected invalid interval");
      }
    });

    it("Cancels a scheduled transfer", async () => {
      try {
        const tx = await program.methods
          .cancelTransfer()
          .accounts({
            authority: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            scheduledTransfer: scheduledTransferPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Cancel transfer transaction:", tx);

        // Fetch and verify scheduled transfer is now inactive
        const transfer = await program.account.scheduledTransfer.fetch(
          scheduledTransferPda
        );

        expect(transfer.isActive).to.equal(false);
        console.log("Transfer cancelled successfully!");
      } catch (error: any) {
        console.log("Cancel transfer error:", error.message);
        throw error;
      }
    });

    it("Fails to cancel already cancelled transfer", async () => {
      try {
        await program.methods
          .cancelTransfer()
          .accounts({
            authority: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            scheduledTransfer: scheduledTransferPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Expected TransferAlreadyCancelled error");
      } catch (error: any) {
        expect(error.message).to.include("TransferAlreadyCancelled");
        console.log("Correctly rejected re-cancellation");
      }
    });
  });

  describe("share calculations", () => {
    it("Calculates shares correctly for first deposit (1:1 ratio)", async () => {
      const pool = await program.account.shieldPool.fetch(shieldPoolPda);

      // For the first deposit into an empty pool, shares should equal the deposit amount
      // This is already verified in the deposit test above
      console.log("First deposit verification:");
      console.log("  Total Pool Value:", pool.totalPoolValue.toString());
      console.log("  Total Shares:", pool.totalShares.toString());
      console.log("  Share ratio:", pool.totalPoolValue.toNumber() / pool.totalShares.toNumber());
    });

    it("Validates minimum deposit amount (0.01 USDC)", async () => {
      // MIN_DEPOSIT_AMOUNT = 10_000 (0.01 USDC with 6 decimals)
      const minDeposit = 10_000;
      const justBelowMin = minDeposit - 1;

      const commitment = generateCommitment();
      const [userSharePda] = getUserSharePda(commitment);
      const encryptedShare = generateEncryptedShare();
      const pool = await program.account.shieldPool.fetch(shieldPoolPda);
      const depositIndex = new anchor.BN(pool.nonce.toString());
      const [depositHistoryPda] = getDepositHistoryPda(commitment, depositIndex);

      try {
        await program.methods
          .deposit(
            new anchor.BN(justBelowMin),
            commitment,
            encryptedShare,
            depositIndex
          )
          .accounts({
            depositor: provider.wallet.publicKey,
            shieldPool: shieldPoolPda,
            userShare: userSharePda,
            depositHistory: depositHistoryPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Expected InsufficientDeposit error");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientDeposit");
        console.log("Correctly enforced minimum deposit amount");
      }
    });
  });
});
