import { PublicKey } from "@solana/web3.js";

/**
 * Merchant account information
 */
export interface Merchant {
  // Public key of the merchant account
  publicKey: PublicKey;
  // Wallet address
  wallet: PublicKey;
  // Merchant name
  name: string;
  // Active status
  isActive: boolean;
  // Registration timestamp (Unix seconds)
  registeredAt: number;
}

/**
 * Merchant Ledger account information
 */
export interface MerchantLedger {
  // Public key of the ledger account
  publicKey: PublicKey;
  // Associated merchant
  merchant: PublicKey;
  // Token mint
  mint: PublicKey;
  // Encrypted balance (array of ciphertexts)
  encryptedBalance: number[][];
  // Nonce for encryption
  nonce: bigint;
}

/**
 * Subscription plan information
 */
export interface SubscriptionPlan {
  // Public key of the plan account
  publicKey: PublicKey;
  // Associated merchant
  merchant: PublicKey;
  // Plan ID (unique per merchant)
  planId: bigint;
  // Plan name
  name: string;
  // Token mint
  mint: PublicKey;
  // Price in lamports
  price: bigint;
  // Billing cycle in days
  billingCycleDays: number;
  // Active status
  isActive: boolean;
  // Creation timestamp (Unix seconds)
  createdAt: number;
}

/**
 * Data for creating a new plan
 */
export interface CreatePlanData {
  name: string;
  price: bigint;
  billingCycleDays: number;
}

/**
 * Data for updating an existing plan
 */
export interface UpdatePlanData {
  name?: string;
  price?: bigint;
  billingCycleDays?: number;
  isActive?: boolean;
}

/**
 * Claim transaction state
 */
export type ClaimState =
  | "idle"
  | "encrypting"
  | "sending"
  | "waiting_mpc"
  | "success"
  | "error";

/**
 * Revenue data
 */
export interface RevenueData {
  // Total revenue (decrypted, in lamports)
  totalRevenue: bigint | null;
  // Whether the balance is currently being decrypted
  isDecrypting: boolean;
  // Whether the balance has been decrypted
  isDecrypted: boolean;
}
