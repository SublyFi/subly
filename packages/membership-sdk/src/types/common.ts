import type { PublicKey } from "@solana/web3.js";

/**
 * Network configuration for the SDK
 */
export type NetworkConfig = {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Program ID */
  programId: PublicKey;
  /** Network name */
  network: "devnet" | "mainnet-beta" | "localnet";
};

/**
 * Transaction result with signature
 */
export type TransactionResult = {
  /** Transaction signature */
  signature: string;
  /** Whether the transaction was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
};

/**
 * Encrypted data structure
 */
export type EncryptedData = {
  /** Encrypted bytes */
  data: Uint8Array;
  /** Nonce used for encryption */
  nonce: bigint;
};

/**
 * Constants for the protocol
 */
export const CONSTANTS = {
  /** Maximum name length in bytes */
  MAX_NAME_LENGTH: 32,
  /** Maximum metadata URI length in bytes */
  MAX_METADATA_URI_LENGTH: 128,
  /** USDC decimals */
  USDC_DECIMALS: 6,
  /** Minimum billing cycle in seconds (1 hour) */
  MIN_BILLING_CYCLE_SECONDS: 3600,
  /** Maximum billing cycle in seconds (365 days) */
  MAX_BILLING_CYCLE_SECONDS: 31536000,
  /** PDA seeds */
  SEEDS: {
    BUSINESS: "business",
    PLAN: "plan",
    SUBSCRIPTION: "subscription",
  },
} as const;
