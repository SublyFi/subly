import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Program IDs
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "Hwmvq4rJ1P6bxHD5G6KvzteuXdMtMzpwZTT7AJb3wSa9"
);

export const ARCIUM_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ARCIUM_PROGRAM_ID || "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
);

// Token Mint (Devnet USDC)
export const TOKEN_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
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
  DEPOSIT: 1894255896,
  WITHDRAW: 2549376853,
  SUBSCRIBE: 524592853,
  UNSUBSCRIBE: 3264881130,
  PROCESS_PAYMENT: 930732409,
  VERIFY_SUBSCRIPTION: 1451574225,
  CLAIM_REVENUE: 2315398764,
} as const;

// Token decimals
export const USDC_DECIMALS = 6;
export const USDC_UNITS_PER_TOKEN = 1_000_000;

// UI Constants
export const MAX_DISPLAY_DECIMALS = 4;

// Transaction confirmation
export const CONFIRMATION_COMMITMENT = "confirmed" as const;

// Arcium fixed addresses (from @arcium-hq/client)
// Fee pool: getFeePoolAccAddress()
export const ARCIUM_POOL_ADDRESS = new PublicKey("G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC");
// Clock: getClockAccAddress()
export const ARCIUM_CLOCK_ADDRESS = new PublicKey("7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot");
