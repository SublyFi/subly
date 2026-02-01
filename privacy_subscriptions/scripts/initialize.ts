import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { PrivacySubscriptions } from "../target/types/privacy_subscriptions";
import {
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getCompDefAccOffset,
  getMXEAccAddress,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

// ============================================================================
// Configuration
// ============================================================================

// Devnet USDC address
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// Protocol fee rate in basis points (100 = 1%)
const FEE_RATE_BPS = 0;

// PDA Seeds (must match the program)
const PROTOCOL_CONFIG_SEED = Buffer.from("protocol_config");
const PROTOCOL_POOL_SEED = Buffer.from("protocol_pool");

// Computation definition names
const COMP_DEF_NAMES = [
  "deposit",
  "withdraw",
  "subscribe",
  "unsubscribe",
  "process_payment",
  "verify_subscription",
  "claim_revenue",
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

function readKeypairFromFile(path: string): Keypair {
  const file = fs.readFileSync(path);
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}

function getProtocolConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PROTOCOL_CONFIG_SEED], programId);
}

function getProtocolPoolPDA(
  programId: PublicKey,
  mint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROTOCOL_POOL_SEED, mint.toBuffer()],
    programId,
  );
}

function getCompDefPDA(
  programId: PublicKey,
  compDefName: string,
): [PublicKey, number] {
  const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
  const offset = getCompDefAccOffset(compDefName);
  return PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), offset],
    getArciumProgramId(),
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 3,
  delayMs: number = 2000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error.message?.includes("Blockhash not found") ||
        error.message?.includes("block height exceeded") ||
        error.message?.includes("rate limit");

      if (isRetryable && attempt < maxRetries) {
        console.log(
          `       [RETRY] ${label} attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`,
        );
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label} failed after ${maxRetries} attempts`);
}

// ============================================================================
// Initialization Functions
// ============================================================================

async function initializeCompDefs(
  program: Program<PrivacySubscriptions>,
  payer: Keypair,
  provider: anchor.AnchorProvider,
): Promise<void> {
  console.log("\n=== Initializing Computation Definitions ===\n");

  const mxeAccount = getMXEAccAddress(program.programId);

  for (const compDefName of COMP_DEF_NAMES) {
    const [compDefPDA] = getCompDefPDA(program.programId, compDefName);

    // Check if already initialized
    const accountInfo = await provider.connection.getAccountInfo(compDefPDA);
    if (accountInfo !== null) {
      console.log(`[SKIP] ${compDefName} CompDef already initialized`);
      continue;
    }

    console.log(`[INIT] Initializing ${compDefName} CompDef...`);
    console.log(`       PDA: ${compDefPDA.toBase58()}`);

    try {
      // Helper to build the transaction for each comp def type
      const buildTx = () => {
        const baseAccounts = {
          payer: payer.publicKey,
          mxeAccount,
          compDefAccount: compDefPDA,
        };

        switch (compDefName) {
          case "deposit":
            return program.methods.initDepositCompDef().accounts(baseAccounts);
          case "withdraw":
            return program.methods.initWithdrawCompDef().accounts(baseAccounts);
          case "subscribe":
            return program.methods
              .initSubscribeCompDef()
              .accounts(baseAccounts);
          case "unsubscribe":
            return program.methods
              .initUnsubscribeCompDef()
              .accounts(baseAccounts);
          case "process_payment":
            return program.methods
              .initProcessPaymentCompDef()
              .accounts(baseAccounts);
          case "verify_subscription":
            return program.methods
              .initVerifySubscriptionCompDef()
              .accounts(baseAccounts);
          case "claim_revenue":
            return program.methods
              .initClaimRevenueCompDef()
              .accounts(baseAccounts);
          default:
            throw new Error(`Unknown comp def: ${compDefName}`);
        }
      };

      const sig = await withRetry(
        async () => {
          return buildTx().signers([payer]).rpc({ commitment: "confirmed" });
        },
        compDefName,
        3,
        3000,
      );

      console.log(`       Tx: ${sig}`);
      console.log(
        `[DONE] ${compDefName} CompDef initialized (offchain circuit source)\n`,
      );

      // Delay between transactions to avoid rate limiting
      await sleep(2000);
    } catch (error) {
      console.error(`[ERROR] Failed to initialize ${compDefName}:`, error);
      throw error;
    }
  }
}

async function initializeProtocol(
  program: Program<PrivacySubscriptions>,
  authority: Keypair,
  provider: anchor.AnchorProvider,
): Promise<void> {
  console.log("\n=== Initializing Protocol ===\n");

  const [protocolConfigPDA] = getProtocolConfigPDA(program.programId);

  // Check if already initialized
  const accountInfo = await provider.connection.getAccountInfo(
    protocolConfigPDA,
  );
  if (accountInfo !== null) {
    console.log(`[SKIP] Protocol already initialized`);
    console.log(`       Config PDA: ${protocolConfigPDA.toBase58()}`);
    return;
  }

  console.log(
    `[INIT] Initializing protocol with fee rate: ${FEE_RATE_BPS} bps`,
  );
  console.log(`       Authority: ${authority.publicKey.toBase58()}`);
  console.log(`       Config PDA: ${protocolConfigPDA.toBase58()}`);

  try {
    const sig = await program.methods
      .initializeProtocol(FEE_RATE_BPS)
      .accountsPartial({
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc({ commitment: "confirmed" });

    console.log(`       Tx: ${sig}`);
    console.log(`[DONE] Protocol initialized\n`);
  } catch (error) {
    console.error("[ERROR] Failed to initialize protocol:", error);
    throw error;
  }
}

async function initializePool(
  program: Program<PrivacySubscriptions>,
  authority: Keypair,
  mint: PublicKey,
  provider: anchor.AnchorProvider,
): Promise<void> {
  console.log("\n=== Initializing Token Pool ===\n");

  const [protocolPoolPDA] = getProtocolPoolPDA(program.programId, mint);

  // Check if already initialized
  const accountInfo = await provider.connection.getAccountInfo(protocolPoolPDA);
  if (accountInfo !== null) {
    console.log(`[SKIP] Pool already initialized for mint: ${mint.toBase58()}`);
    console.log(`       Pool PDA: ${protocolPoolPDA.toBase58()}`);
    return;
  }

  // Generate a new keypair for the pool token account
  const poolTokenAccount = Keypair.generate();

  console.log(`[INIT] Initializing pool for mint: ${mint.toBase58()}`);
  console.log(`       Pool PDA: ${protocolPoolPDA.toBase58()}`);
  console.log(
    `       Pool Token Account: ${poolTokenAccount.publicKey.toBase58()}`,
  );

  try {
    const sig = await program.methods
      .initializePool()
      .accountsPartial({
        authority: authority.publicKey,
        mint,
        poolTokenAccount: poolTokenAccount.publicKey,
      })
      .signers([authority, poolTokenAccount])
      .rpc({ commitment: "confirmed" });

    console.log(`       Tx: ${sig}`);
    console.log(`[DONE] Pool initialized\n`);

    // Save the pool token account keypair for reference
    const poolTokenAccountPath = `./pool-token-account-${mint
      .toBase58()
      .slice(0, 8)}.json`;
    fs.writeFileSync(
      poolTokenAccountPath,
      JSON.stringify(Array.from(poolTokenAccount.secretKey)),
    );
    console.log(
      `       Pool token account keypair saved to: ${poolTokenAccountPath}`,
    );
  } catch (error) {
    console.error("[ERROR] Failed to initialize pool:", error);
    throw error;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       Privacy Subscriptions - Initialization Script        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Setup provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace
    .PrivacySubscriptions as Program<PrivacySubscriptions>;

  console.log("\n--- Configuration ---");
  console.log(`Program ID: ${program.programId.toBase58()}`);
  console.log(`Cluster: ${provider.connection.rpcEndpoint}`);
  console.log(`USDC Mint: ${USDC_MINT.toBase58()}`);
  console.log(`Fee Rate: ${FEE_RATE_BPS} bps (${FEE_RATE_BPS / 100}%)`);

  // Load authority keypair
  const walletPath =
    process.env.ANCHOR_WALLET || `${os.homedir()}/.config/solana/id.json`;
  const authority = readKeypairFromFile(walletPath);
  console.log(`Authority: ${authority.publicKey.toBase58()}`);

  // Check balance
  const balance = await provider.connection.getBalance(authority.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);

  if (balance < 0.1 * 1e9) {
    console.warn(
      "\n⚠️  Warning: Low balance. You may need more SOL for transactions.",
    );
  }

  // Run initialization steps
  try {
    // Step 1: Initialize Computation Definitions
    await initializeCompDefs(program, authority, provider);

    // Step 2: Initialize Protocol
    await initializeProtocol(program, authority, provider);

    // Step 3: Initialize USDC Pool
    await initializePool(program, authority, USDC_MINT, provider);

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║              Initialization Complete!                      ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝\n",
    );
  } catch (error) {
    console.error("\n❌ Initialization failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
