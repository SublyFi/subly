import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Program IDs
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "B2WX7o3djQSAus1QdHYuezL95qUox6C1zmRS6JdDL7Ye"
);

export const ARCIUM_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ARCIUM_PROGRAM_ID || "arcm2q7TLNUFpKtTg6Fv8mzJVLhVAAEDvPXYLfuiXjN"
);

// Token Mint (Wrapped SOL)
export const TOKEN_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_MINT || "So11111111111111111111111111111111111111112"
);

// Arcium Configuration
export const ARCIUM_CLUSTER_OFFSET = new BN(
  process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET || "0"
);

// PDA Seeds (must match on-chain program)
export const SEEDS = {
  PROTOCOL_CONFIG: "protocol_config",
  PROTOCOL_POOL: "protocol_pool",
  MERCHANT: "merchant",
  MERCHANT_LEDGER: "merchant_ledger",
  SUBSCRIPTION_PLAN: "subscription_plan",
  USER_LEDGER: "user_ledger",
  USER_SUBSCRIPTION: "user_subscription",
} as const;

// Computation Definition Offsets (for Arcium)
export const COMP_DEF_OFFSETS = {
  DEPOSIT: 0,
  WITHDRAW: 1,
  SUBSCRIBE: 2,
  UNSUBSCRIBE: 3,
  PROCESS_PAYMENT: 4,
  VERIFY_SUBSCRIPTION: 5,
  CLAIM_REVENUE: 6,
} as const;

// Token decimals
export const SOL_DECIMALS = 9;
export const LAMPORTS_PER_SOL = 1_000_000_000;

// UI Constants
export const MAX_DISPLAY_DECIMALS = 4;

// Transaction confirmation
export const CONFIRMATION_COMMITMENT = "confirmed" as const;

// Arcium fixed addresses
export const ARCIUM_POOL_ADDRESS = new PublicKey("9Mwcvx2dLMZ4qxaAgLQ8ykpRtMfW1BQFUTdE4zXkD8kz");
export const ARCIUM_CLOCK_ADDRESS = new PublicKey("ArcCLK11111111111111111111111111111111111111");
