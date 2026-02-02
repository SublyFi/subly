import { PublicKey } from "@solana/web3.js";

// Re-export merchant types
export * from "./merchant";

/**
 * Transaction state for UI
 */
export type TransactionState = "idle" | "loading" | "success" | "error";

/**
 * Balance information
 */
export interface Balance {
  // Raw balance in lamports (encrypted on-chain)
  lamports: bigint;
  // Decrypted balance in lamports (for display)
  decryptedLamports: bigint | null;
  // Whether the balance has been decrypted
  isDecrypted: boolean;
  // Loading state
  isLoading: boolean;
  // Error message if any
  error: string | null;
}

/**
 * Subscription status
 */
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "unknown";

/**
 * User subscription information
 */
export interface UserSubscription {
  // Public key of the subscription account
  publicKey: PublicKey;
  // Subscription index (unique per user)
  subscriptionIndex: bigint;
  // Merchant public key
  merchant: PublicKey;
  // Plan public key
  plan: PublicKey | null;
  // Encrypted plan name (decrypted for owner)
  planName: string | null;
  // Subscription status
  status: SubscriptionStatus;
  // Next payment timestamp (Unix seconds)
  nextPaymentAt: number;
  // Payment amount in lamports
  paymentAmount: bigint;
  // Created timestamp
  createdAt: number;
  // Updated timestamp
  updatedAt: number;
}

/**
 * Deposit/Withdraw form values
 */
export interface TransactionFormValues {
  amount: string;
}

/**
 * Hook return type for mutations
 */
export interface UseMutationResult<T = void> {
  mutate: (params: T) => Promise<void>;
  state: TransactionState;
  error: string | null;
  signature: string | null;
  reset: () => void;
}

/**
 * Deposit parameters
 */
export interface DepositParams {
  amount: number; // USDC amount
}

/**
 * Withdraw parameters
 */
export interface WithdrawParams {
  amount: number; // USDC amount
}

/**
 * Unsubscribe parameters
 */
export interface UnsubscribeParams {
  subscriptionPubkey: PublicKey;
  subscriptionIndex?: bigint;
}
