import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

/**
 * Shield Pool account data
 */
export interface ShieldPool {
  poolId: PublicKey;
  authority: PublicKey;
  totalPoolValue: BN;
  totalShares: BN;
  kaminoObligation: PublicKey;
  lastYieldUpdate: BN;
  nonce: BN;
  bump: number;
  isActive: boolean;
}

/**
 * User share account data
 */
export interface UserShare {
  shareId: PublicKey;
  pool: PublicKey;
  encryptedShareAmount: Uint8Array;
  userCommitment: Uint8Array;
  lastUpdate: BN;
  bump: number;
}

/**
 * Deposit history record
 */
export interface DepositHistory {
  historyId: PublicKey;
  pool: PublicKey;
  userCommitment: Uint8Array;
  amount: BN;
  sharesReceived: BN;
  poolValueAtDeposit: BN;
  totalSharesAtDeposit: BN;
  depositedAt: BN;
  bump: number;
}

/**
 * Scheduled transfer configuration
 * Note: recipient is NOT stored on-chain - it's encrypted in encryptedTransferData
 * and stored locally for privacy
 */
export interface ScheduledTransfer {
  transferId: PublicKey;
  userCommitment: Uint8Array;
  /** Encrypted transfer data (recipient is encrypted within this) */
  encryptedTransferData: Uint8Array;
  amount: BN;
  intervalSeconds: number;
  nextExecution: BN;
  isActive: boolean;
  skipCount: number;
  executionCount: BN;
  totalTransferred: BN;
  createdAt: BN;
  /** Tuk Tuk cron job (replaces deprecated Clockwork) */
  tuktukCronJob: PublicKey;
  bump: number;
}

/**
 * Note Commitment Registry - tracks Privacy Cash deposits
 */
export interface NoteCommitmentRegistry {
  noteCommitment: Uint8Array;
  userCommitment: Uint8Array;
  amount: BN;
  registeredAt: BN;
  pool: PublicKey;
  bump: number;
}

/**
 * Transfer history record
 */
export interface TransferHistory {
  historyId: PublicKey;
  scheduledTransfer: PublicKey;
  privacyCashTx: Uint8Array;
  amount: BN;
  executedAt: BN;
  status: TransferStatus;
  executionIndex: BN;
  bump: number;
}

/**
 * Transfer status enum
 */
export enum TransferStatus {
  Pending = "Pending",
  Completed = "Completed",
  Failed = "Failed",
  Skipped = "Skipped",
}

/**
 * Nullifier for double-spend prevention
 */
export interface Nullifier {
  nullifier: Uint8Array;
  isUsed: boolean;
  usedAt: BN;
  operationType: OperationType;
  bump: number;
}

/**
 * Operation type for nullifier tracking
 */
export enum OperationType {
  Withdraw = "Withdraw",
  Transfer = "Transfer",
}

/**
 * Deposit parameters (DEPRECATED - use RegisterDepositParams)
 * @deprecated Use registerDeposit with Privacy Cash for privacy-preserving deposits
 */
export interface DepositParams {
  /** Amount in USDC (6 decimals) */
  amount: number | BN;
  /** Optional user secret for commitment generation */
  secret?: Uint8Array;
}

/**
 * Register deposit parameters for Privacy Cash integration
 * This is the preferred privacy-preserving deposit method
 */
export interface RegisterDepositParams {
  /** Note commitment from Privacy Cash deposit proof */
  noteCommitment: Uint8Array;
  /** Amount in USDC (6 decimals) */
  amount: number | BN;
}

/**
 * Withdraw parameters
 */
export interface WithdrawParams {
  /** Amount in USDC (6 decimals) */
  amount: number | BN;
  /** User secret for proof generation */
  secret: Uint8Array;
}

/**
 * Setup recurring payment parameters
 * Note: recipient is encrypted and stored locally for privacy
 */
export interface SetupRecurringPaymentParams {
  /** Recipient address (business) - stored locally, NOT on-chain */
  recipientAddress: PublicKey;
  /** Amount per transfer in USDC */
  amountUsdc: number;
  /** Transfer interval */
  interval: "hourly" | "daily" | "weekly" | "monthly";
  /** Optional memo for local reference */
  memo?: string;
}

/**
 * Balance result
 */
export interface BalanceResult {
  /** User's share amount */
  shares: bigint;
  /** Current value in USDC */
  valueUsdc: bigint;
}

/**
 * Yield information
 */
export interface YieldInfo {
  /** Current APY as a percentage */
  apy: number;
  /** Total earned in USDC */
  earnedUsdc: bigint;
}

/**
 * Transaction result
 */
export interface TransactionResult {
  signature: TransactionSignature;
  success: boolean;
}

/**
 * SDK configuration options
 */
export interface VaultSdkConfig {
  /** Commitment level for transactions */
  commitment?: "processed" | "confirmed" | "finalized";
  /** Skip preflight simulation */
  skipPreflight?: boolean;
  /** Storage key for local encrypted storage (default: 'subly-vault') */
  storageKey?: string;
}

/**
 * Interval to seconds mapping
 */
export const INTERVAL_SECONDS: Record<SetupRecurringPaymentParams["interval"], number> = {
  hourly: 3600,
  daily: 86400,
  weekly: 604800,
  monthly: 2592000, // 30 days
};

/**
 * Program constants
 */
export const PROGRAM_ID = new PublicKey("BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL");
export const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const USDC_DECIMALS = 6;
