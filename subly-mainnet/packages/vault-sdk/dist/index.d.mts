import { PublicKey, TransactionSignature, Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { BN, Wallet, Idl } from '@coral-xyz/anchor';

/**
 * Shield Pool account data
 */
interface ShieldPool {
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
interface UserShare {
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
interface DepositHistory {
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
interface ScheduledTransfer {
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
interface NoteCommitmentRegistry {
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
interface TransferHistory {
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
declare enum TransferStatus {
    Pending = "Pending",
    Completed = "Completed",
    Failed = "Failed",
    Skipped = "Skipped"
}
/**
 * Nullifier for double-spend prevention
 */
interface Nullifier {
    nullifier: Uint8Array;
    isUsed: boolean;
    usedAt: BN;
    operationType: OperationType;
    bump: number;
}
/**
 * Operation type for nullifier tracking
 */
declare enum OperationType {
    Withdraw = "Withdraw",
    Transfer = "Transfer"
}
/**
 * Deposit parameters (DEPRECATED - use RegisterDepositParams)
 * @deprecated Use registerDeposit with Privacy Cash for privacy-preserving deposits
 */
interface DepositParams {
    /** Amount in USDC (6 decimals) */
    amount: number | BN;
    /** Optional user secret for commitment generation */
    secret?: Uint8Array;
}
/**
 * Register deposit parameters for Privacy Cash integration
 * This is the preferred privacy-preserving deposit method
 */
interface RegisterDepositParams {
    /** Note commitment from Privacy Cash deposit proof */
    noteCommitment: Uint8Array;
    /** Amount in USDC (6 decimals) */
    amount: number | BN;
}
/**
 * Withdraw parameters
 */
interface WithdrawParams {
    /** Amount in USDC (6 decimals) */
    amount: number | BN;
    /** User secret for proof generation */
    secret: Uint8Array;
}
/**
 * Setup recurring payment parameters
 * Note: recipient is encrypted and stored locally for privacy
 */
interface SetupRecurringPaymentParams {
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
interface BalanceResult {
    /** User's share amount */
    shares: bigint;
    /** Current value in USDC */
    valueUsdc: bigint;
}
/**
 * Yield information
 */
interface YieldInfo {
    /** Current APY as a percentage */
    apy: number;
    /** Total earned in USDC */
    earnedUsdc: bigint;
}
/**
 * Transaction result
 */
interface TransactionResult {
    signature: TransactionSignature;
    success: boolean;
}
/**
 * SDK configuration options
 */
interface VaultSdkConfig {
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
declare const INTERVAL_SECONDS: Record<SetupRecurringPaymentParams["interval"], number>;
/**
 * Program constants
 */
declare const PROGRAM_ID: PublicKey;
declare const USDC_MINT_MAINNET: PublicKey;
declare const USDC_DECIMALS = 6;
declare const KAMINO_USDC_RESERVE: PublicKey;
declare const KAMINO_CUSDC_MINT: PublicKey;
declare const POOL_TOKEN_ACCOUNT_SEED: Buffer<ArrayBuffer>;
declare const POOL_CTOKEN_ACCOUNT_SEED: Buffer<ArrayBuffer>;

/**
 * Local Storage Module for Privacy-Preserving Data
 *
 * This module handles the encrypted storage of sensitive data that
 * should not be stored on-chain, such as:
 * - Transfer recipient addresses
 * - User secrets
 * - Decryption keys
 *
 * All data is encrypted with AES-256-GCM before storage.
 */
/**
 * Local transfer data - stored off-chain for privacy
 */
interface LocalTransferData {
    /** The scheduled transfer PDA address */
    transferId: string;
    /** Recipient address (the business receiving payments) */
    recipient: string;
    /** Transfer amount in USDC */
    amount: number;
    /** Payment interval in seconds */
    intervalSeconds: number;
    /** When the transfer was created */
    createdAt: number;
    /** Last execution timestamp (if any) */
    lastExecuted?: number;
    /** Optional memo */
    memo?: string;
}
/**
 * Local vault data - user's complete local state
 */
interface LocalVaultData {
    /** User's secret (32 bytes, base64 encoded) */
    userSecret: string;
    /** User's commitment (32 bytes, base64 encoded) */
    userCommitment: string;
    /** Current share amount (string representation of bigint) */
    shares: string;
    /** All scheduled transfers */
    transfers: LocalTransferData[];
    /** Version for migration purposes */
    version: number;
    /** Last updated timestamp */
    lastUpdated: number;
}
/**
 * Local Storage Manager
 *
 * Handles encrypted storage of privacy-sensitive data.
 * Uses wallet-derived key for encryption.
 */
declare class LocalStorageManager {
    private encryptionKey;
    private storageKey;
    constructor(storageKeyPrefix?: string);
    /**
     * Initialize the storage manager with a password or signature
     *
     * @param passwordOrSignature - Password string or wallet signature bytes
     */
    initialize(passwordOrSignature: string | Uint8Array): Promise<void>;
    /**
     * Check if the manager is initialized
     */
    isInitialized(): boolean;
    /**
     * Encrypt data using nacl secretbox
     */
    private encrypt;
    /**
     * Decrypt data using nacl secretbox
     */
    private decrypt;
    /**
     * Get storage (browser localStorage or in-memory)
     */
    private setStorage;
    /**
     * Get from storage (browser localStorage or in-memory)
     */
    private getStorage;
    /**
     * Remove from storage
     */
    private removeStorage;
    /**
     * Save vault data to local storage
     */
    saveVaultData(data: LocalVaultData): Promise<void>;
    /**
     * Load vault data from local storage
     */
    loadVaultData(): Promise<LocalVaultData | null>;
    /**
     * Ensure vault data exists, create if not
     */
    private ensureVaultData;
    /**
     * Save a transfer to local storage
     * @alias saveTransferDetails
     */
    saveTransfer(transfer: LocalTransferData): Promise<void>;
    /**
     * Get a transfer from local storage
     * @alias loadTransferDetails
     */
    getTransfer(transferId: string): Promise<LocalTransferData | null>;
    /**
     * Get all transfers from local storage
     */
    getAllTransfers(): Promise<LocalTransferData[]>;
    /**
     * Delete a transfer from local storage
     */
    deleteTransfer(transferId: string): Promise<void>;
    /**
     * Clear all local storage data
     */
    clearAll(): Promise<void>;
    /**
     * Create initial vault data structure
     */
    static createInitialData(userSecret: Uint8Array, userCommitment: Uint8Array): LocalVaultData;
}
/**
 * Encrypt transfer data for on-chain storage
 *
 * This creates the encrypted_transfer_data that is stored on-chain.
 * Only the user can decrypt this data using their wallet-derived key.
 *
 * @param recipient - Recipient address
 * @param encryptionKey - 32-byte encryption key derived from wallet signature
 * @param memo - Optional memo
 * @returns 128-byte encrypted transfer data
 */
declare function encryptTransferData(recipient: string, encryptionKey: Uint8Array, memo?: string): Promise<Uint8Array>;
/**
 * Decrypt transfer data from on-chain storage
 *
 * @param encryptedData - 128-byte encrypted transfer data
 * @param encryptionKey - 32-byte encryption key
 * @returns Decrypted recipient and memo
 */
declare function decryptTransferData(encryptedData: Uint8Array, encryptionKey: Uint8Array): {
    recipient: string;
    memo: string;
};

/**
 * Tuk Tuk Integration Module
 *
 * Provides wrapper functions for Helium's Tuk Tuk automation engine
 * to enable scheduled/recurring transfer execution on Solana mainnet.
 *
 * Tuk Tuk is the replacement for the deprecated Clockwork protocol
 * (which shut down on October 31, 2023).
 *
 * Note: Tuk Tuk is currently under audit (as of Jan 2026).
 * Manual execution fallback is recommended for production use.
 *
 * Source: https://github.com/helium/tuktuk
 * Docs: https://www.tuktuk.fun/docs
 */

/**
 * Tuk Tuk program ID on mainnet
 */
declare const TUKTUK_PROGRAM_ID: PublicKey;
/**
 * Tuk Tuk Cron program ID on mainnet
 */
declare const TUKTUK_CRON_PROGRAM_ID: PublicKey;
/**
 * Cron job creation result
 */
interface CronJobResult {
    cronJobPda: PublicKey;
    tx: string;
}
/**
 * Pending transfer information
 */
interface PendingTransfer {
    transferId: string;
    transferPda: PublicKey;
    recipient: PublicKey;
    amount: number;
    nextExecution: Date;
    isOverdue: boolean;
}
/**
 * Tuk Tuk integration configuration
 */
interface TukTukConfig {
    connection: Connection;
    payer: Keypair;
    authority: PublicKey;
}
/**
 * Tuk Tuk Integration Class
 *
 * Wraps the Tuk Tuk SDK to provide cron job management
 * for automated transfer execution.
 *
 * Note: The Tuk Tuk SDK API is still evolving. Cron job creation methods
 * are placeholder implementations. Manual execution is fully functional.
 */
declare class TukTukIntegration {
    private connection;
    private payer;
    private authority;
    private taskQueuePda;
    private cronProgram;
    constructor(config: TukTukConfig);
    /**
     * Initialize the Tuk Tuk cron program client
     */
    initialize(): Promise<void>;
    /**
     * Initialize or get the task queue PDA
     */
    getOrCreateTaskQueue(): Promise<PublicKey>;
    /**
     * Create a cron job for automated transfer execution
     *
     * Note: This is a placeholder implementation. The Tuk Tuk SDK API
     * is evolving and cron job creation requires direct program interaction.
     * For production use, recommend manual execution mode.
     *
     * @param schedule Cron schedule string (e.g., "0 0 * * *" for daily)
     * @param targetInstruction The instruction to execute on schedule
     * @param jobName Unique name for the cron job
     * @returns Cron job creation result
     */
    createCronJob(schedule: string, targetInstruction: TransactionInstruction, jobName: string): Promise<CronJobResult>;
    /**
     * Fund a cron job with SOL for execution fees
     *
     * @param cronJobPda The cron job PDA
     * @param amount Amount in SOL to fund
     * @returns Transaction signature
     */
    fundCronJob(cronJobPda: PublicKey, amount: number): Promise<{
        tx: string;
    }>;
    /**
     * Close a cron job and recover remaining funds
     *
     * @param cronJobPda The cron job PDA
     * @returns Transaction signature
     */
    closeCronJob(cronJobPda: PublicKey): Promise<{
        tx: string;
    }>;
    /**
     * Check for pending transfers that are due for execution
     * This is the manual execution fallback when Tuk Tuk automation is not used
     *
     * @param scheduledTransferPdas List of scheduled transfer PDAs to check
     * @returns List of pending transfers that are due
     */
    checkPendingTransfers(scheduledTransferPdas: PublicKey[]): Promise<PendingTransfer[]>;
    /**
     * Manually execute a pending transfer
     * This is the fallback when Tuk Tuk automation is not active
     *
     * @param transferId Transfer ID (PDA address as string)
     * @param executeTransferIx The execute_transfer instruction to call
     * @returns Transaction signature
     */
    executePendingTransfer(transferId: string, executeTransferIx: TransactionInstruction): Promise<{
        tx: string;
    }>;
    /**
     * Hash a job name to a deterministic ID
     */
    private hashJobName;
}
/**
 * Tuk Tuk specific error class
 */
declare class TukTukError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Create a Tuk Tuk integration instance
 *
 * @param config Configuration options
 * @returns Tuk Tuk integration (not initialized - call initialize() for cron features)
 */
declare function createTukTukIntegration(config: TukTukConfig): TukTukIntegration;
/**
 * Convert payment interval to cron schedule string
 *
 * @param intervalSeconds Interval in seconds
 * @returns Cron schedule string
 */
declare function intervalToCronSchedule(intervalSeconds: number): string;

/**
 * Kamino Lending Integration Module
 *
 * Provides wrapper functions for the Kamino Finance SDK to enable
 * DeFi yield generation through USDC lending on Solana mainnet.
 *
 * Kamino Lending is used to generate yield on pooled user funds
 * in the Shield Pool.
 *
 * Source: https://github.com/Kamino-Finance/klend-sdk
 * Docs: https://docs.kamino.finance/
 */

/**
 * Kamino Lending program ID on mainnet
 */
declare const KAMINO_LENDING_PROGRAM_ID: PublicKey;
/**
 * Kamino Main Market address (for USDC lending)
 */
declare const KAMINO_MAIN_MARKET: PublicKey;
/**
 * Yield information
 */
interface KaminoYieldInfo {
    /** Annual Percentage Yield (as decimal, e.g., 0.05 = 5%) */
    apy: number;
    /** APY as percentage string (e.g., "5.00%") */
    apyFormatted: string;
    /** Total earned yield in USDC */
    earnedYield: number;
    /** Current deposited amount in USDC */
    depositedAmount: number;
    /** Current value including yield in USDC */
    currentValue: number;
    /** Last update timestamp */
    lastUpdated: Date;
}
/**
 * Deposit result
 */
interface KaminoDepositResult {
    tx: string;
    cTokensReceived: number;
    depositedAmount: number;
}
/**
 * Withdraw result
 */
interface KaminoWithdrawResult {
    tx: string;
    amountWithdrawn: number;
    cTokensBurned: number;
}
/**
 * Kamino integration configuration
 */
interface KaminoConfig {
    connection: Connection;
    payer: Keypair;
    /** The pool authority that owns the Kamino positions */
    poolAuthority: PublicKey;
    /** Optional: Use a specific Kamino market (defaults to main market) */
    marketAddress?: PublicKey;
}
/**
 * Kamino Lending Integration Class
 *
 * Wraps the Kamino SDK to provide USDC deposit/withdraw functionality
 * for yield generation.
 *
 * Note: The Kamino SDK API is complex and evolving. This implementation
 * provides a simplified interface. Production use may require adjustments
 * based on the specific SDK version.
 */
declare class KaminoIntegration {
    private connection;
    private payer;
    private poolAuthority;
    private marketAddress;
    private initialized;
    private kaminoMarket;
    constructor(config: KaminoConfig);
    /**
     * Initialize the Kamino market client
     */
    initialize(): Promise<void>;
    /**
     * Ensure the integration is initialized
     */
    private ensureInitialized;
    /**
     * Deposit USDC into Kamino Lending
     *
     * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
     * @returns Deposit result with transaction and cToken info
     */
    depositToKamino(amount: number): Promise<KaminoDepositResult>;
    /**
     * Withdraw USDC from Kamino Lending
     *
     * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
     * @returns Withdraw result with transaction info
     */
    withdrawFromKamino(amount: number): Promise<KaminoWithdrawResult>;
    /**
     * Get current yield information for the pool
     *
     * @returns Yield information including APY and earned amounts
     */
    getKaminoYieldInfo(): Promise<KaminoYieldInfo>;
    /**
     * Get the current USDC supply APY from Kamino
     *
     * @returns APY as a decimal (e.g., 0.05 = 5%)
     */
    getCurrentApy(): Promise<number>;
    /**
     * Estimate yield for a given amount and duration
     *
     * @param principal Amount in USDC
     * @param daysHeld Number of days to hold
     * @returns Estimated yield in USDC
     */
    estimateYield(principal: number, daysHeld: number): Promise<number>;
}
/**
 * Kamino specific error class
 */
declare class KaminoError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Create a Kamino integration instance
 *
 * @param config Configuration options
 * @returns Initialized Kamino integration
 */
declare function createKaminoIntegration(config: KaminoConfig): Promise<KaminoIntegration>;

/**
 * SublyVaultClient - Main SDK client for interacting with the Subly Vault program
 *
 * Provides methods for:
 * - Depositing USDC into the privacy pool
 * - Withdrawing USDC privately
 * - Setting up and managing recurring payments
 * - Checking balances and yield information
 */
declare class SublyVaultClient {
    private connection;
    private wallet;
    private program;
    private programId;
    private config;
    private privacyCash;
    private tuktuk;
    private kamino;
    private localStorage;
    private userSecret;
    private userCommitment;
    constructor(connection: Connection, wallet: Wallet, programId?: PublicKey, config?: VaultSdkConfig);
    /**
     * Initialize the SDK with the program IDL
     * Must be called before using other methods
     *
     * IMPORTANT: Privacy Cash is REQUIRED for privacy-preserving operations.
     * All deposits and transfers must go through Privacy Cash to protect user privacy.
     *
     * @param idl - Program IDL
     * @param options - Initialization options for external integrations
     */
    initialize(idl: Idl, options: {
        /** REQUIRED: Private key for Privacy Cash operations */
        privacyCashPrivateKey: string | Uint8Array | Keypair;
        rpcUrl?: string;
        enableTukTuk?: boolean;
        enableKamino?: boolean;
        /** Encryption password for local storage (default: derived from wallet) */
        storagePassword?: string;
    }): Promise<void>;
    /**
     * Get the Shield Pool PDA address
     */
    getShieldPoolAddress(): PublicKey;
    /**
     * Fetch the Shield Pool account data
     */
    getShieldPool(): Promise<ShieldPool | null>;
    /**
     * Initialize a user's secret and commitment
     * This should be called once when a user first interacts with the vault
     */
    initializeUser(existingSecret?: Uint8Array): {
        secret: Uint8Array;
        commitment: Uint8Array;
    };
    /**
     * Get or generate the user's commitment
     */
    getUserCommitment(): Uint8Array;
    /**
     * Register a private deposit from Privacy Cash
     *
     * This is the PREFERRED method for deposits as it preserves privacy.
     * The deposit flow is:
     * 1. User deposits USDC to Privacy Cash (separate transaction)
     * 2. Privacy Cash returns a note_commitment as proof
     * 3. User calls registerDeposit with the note_commitment
     * 4. The registrar (relayer or user) registers without exposing the user's wallet
     *
     * After registration, USDC is deposited to Kamino for yield generation.
     *
     * @param params - Register deposit parameters
     * @returns Transaction result
     */
    registerDeposit(params: RegisterDepositParams): Promise<TransactionResult>;
    /**
     * Deposit USDC into the Shield Pool via Privacy Cash
     *
     * This method performs a complete privacy-preserving deposit:
     * 1. Deposits USDC to Privacy Cash
     * 2. Gets the note_commitment from Privacy Cash
     * 3. Registers the deposit on-chain
     *
     * @deprecated For more control, use depositToPrivacyCash() + registerDeposit() separately
     * @param params - Deposit parameters
     * @returns Transaction result with Privacy Cash info
     */
    deposit(params: DepositParams): Promise<TransactionResult & {
        noteCommitment?: Uint8Array;
    }>;
    /**
     * Withdraw USDC from the Shield Pool via Privacy Cash
     *
     * All withdrawals go through Privacy Cash to preserve privacy.
     * USDC is first redeemed from Kamino, then transferred via Privacy Cash.
     *
     * @param params - Withdrawal parameters
     * @param recipient - Optional recipient address (defaults to self via Privacy Cash)
     * @returns Transaction result with Privacy Cash info
     */
    withdraw(params: WithdrawParams, recipient?: string): Promise<TransactionResult & {
        privacyCashTx: string;
        privacyCashFee: number;
    }>;
    /**
     * Get the user's current balance
     *
     * @returns Balance in shares and USDC value
     */
    getBalance(): Promise<BalanceResult>;
    /**
     * Set up a privacy-preserving recurring payment
     *
     * The recipient address is encrypted and stored locally - NOT on-chain.
     * On-chain only stores encrypted_transfer_data that cannot reveal the recipient.
     * At execution time, the recipient is loaded from local storage and sent via Privacy Cash.
     *
     * @param params - Recurring payment parameters
     * @param options - Optional configuration
     * @returns Transaction result with transfer ID and optional Tuk Tuk cron job info
     */
    setupRecurringPayment(params: SetupRecurringPaymentParams, options?: {
        /** Create a Tuk Tuk cron job for automated execution */
        enableTukTukAutomation?: boolean;
        /** Amount of SOL to fund the cron job (default: 0.1 SOL) */
        cronJobFundingSol?: number;
    }): Promise<TransactionResult & {
        transferId: string;
        cronJobPda?: string;
        cronJobTx?: string;
    }>;
    /**
     * Get the recipient address for a scheduled transfer from local storage
     *
     * @param transferId - The scheduled transfer PDA address
     * @returns Recipient address or null if not found
     */
    getTransferRecipient(transferId: string): Promise<string | null>;
    /**
     * Get all scheduled transfers from local storage
     *
     * @returns List of transfer data stored locally
     */
    getAllLocalTransfers(): Promise<LocalTransferData[]>;
    /**
     * Execute a scheduled transfer via Privacy Cash
     *
     * This method loads the recipient from local storage and sends via Privacy Cash.
     * On-chain, no recipient information is stored.
     *
     * @param transferId - The scheduled transfer PDA address
     * @param executionIndex - The execution index for tracking
     * @returns Transaction result with Privacy Cash info
     */
    executeScheduledTransfer(transferId: PublicKey, executionIndex: number): Promise<TransactionResult & {
        privacyCashTx: string;
    }>;
    /**
     * Cancel a recurring payment
     *
     * @param transferId - The scheduled transfer PDA address
     * @param options - Optional configuration
     * @returns Transaction result with optional Tuk Tuk cleanup info
     */
    cancelRecurringPayment(transferId: PublicKey, options?: {
        /** Close associated Tuk Tuk cron job */
        closeCronJob?: boolean;
        /** The cron job PDA to close (required if closeCronJob is true) */
        cronJobPda?: PublicKey;
    }): Promise<TransactionResult & {
        cronJobClosed?: boolean;
        refundedSol?: number;
    }>;
    /**
     * Get yield information for the pool
     *
     * @returns Current APY and earned yield
     */
    getYieldInfo(): Promise<YieldInfo>;
    /**
     * Deposit USDC privately using Privacy Cash
     *
     * @param amount Amount in USDC (human-readable)
     * @returns Transaction signature
     */
    depositPrivate(amount: number): Promise<{
        tx: string;
    }>;
    /**
     * Withdraw USDC privately using Privacy Cash
     *
     * @param amount Amount in USDC (human-readable)
     * @param recipient Optional recipient address
     * @returns Withdrawal result
     */
    withdrawPrivate(amount: number, recipient?: string): Promise<{
        tx: string;
        amountReceived: number;
        fee: number;
    }>;
    /**
     * Get private USDC balance from Privacy Cash
     *
     * @returns Balance in USDC
     */
    getPrivateBalance(): Promise<number>;
    /**
     * Check for pending transfers that are due for execution
     *
     * @param scheduledTransferPdas List of scheduled transfer PDAs to check
     * @returns List of pending transfers
     */
    checkPendingTransfers(scheduledTransferPdas: PublicKey[]): Promise<PendingTransfer[]>;
    /**
     * Manually execute a pending transfer
     * Use this when Tuk Tuk automation is not active
     *
     * @param transferId Transfer ID (PDA address as string)
     * @param executeTransferIx The execute_transfer instruction
     * @returns Transaction signature
     */
    executePendingTransfer(transferId: string, executeTransferIx: TransactionInstruction): Promise<{
        tx: string;
    }>;
    /**
     * Deposit to Kamino Lending for yield generation
     *
     * @param amount Amount in USDC
     * @returns Deposit result
     */
    depositToKamino(amount: number): Promise<{
        tx: string;
    }>;
    /**
     * Withdraw from Kamino Lending
     *
     * @param amount Amount in USDC
     * @returns Withdrawal result
     */
    withdrawFromKamino(amount: number): Promise<{
        tx: string;
    }>;
    /**
     * Get detailed yield information from Kamino
     *
     * @returns Kamino yield info
     */
    getKaminoYieldInfo(): Promise<KaminoYieldInfo>;
    /**
     * Update the pool's total value based on Kamino yield
     *
     * This reads the current cToken balance and calculates the equivalent
     * USDC value. Should be called periodically (e.g., daily) by the pool authority.
     *
     * @param exchangeRateNumerator - Current Kamino exchange rate numerator
     * @param exchangeRateDenominator - Current Kamino exchange rate denominator
     * @returns Transaction result
     */
    updatePoolValue(exchangeRateNumerator: BN, exchangeRateDenominator: BN): Promise<TransactionResult>;
    /**
     * Get the actual pool value including Kamino yield
     *
     * Calculates the current value by reading cToken balance and applying
     * the current exchange rate.
     *
     * @returns Pool value in USDC (base units)
     */
    getActualPoolValue(): Promise<bigint>;
    /**
     * Get Kamino reserve liquidity supply address
     * This is the token account where USDC liquidity is stored in the reserve
     */
    private getKaminoReserveLiquiditySupply;
    /**
     * Get user's share account
     */
    private getUserShareAccount;
    /**
     * Get user's current shares (decrypted)
     */
    private getUserShares;
    /**
     * Calculate shares to mint for a deposit
     */
    private calculateSharesForDeposit;
    /**
     * Calculate shares to burn for a withdrawal
     */
    private calculateSharesForWithdrawal;
    /**
     * Calculate the value of shares in USDC
     */
    private calculateShareValue;
}
/**
 * Create a new SublyVaultClient instance
 *
 * @param connection - Solana RPC connection
 * @param wallet - User's wallet
 * @param config - Optional SDK configuration
 * @returns A new SublyVaultClient instance
 */
declare function createSublyVaultClient(connection: Connection, wallet: Wallet, config?: VaultSdkConfig): SublyVaultClient;

/**
 * Generate a cryptographically secure random secret
 * @returns 32-byte random secret
 */
declare function generateSecret(): Uint8Array;
/**
 * Generate a commitment from a secret and pool ID
 * commitment = hash(secret || pool_id)
 *
 * @param secret - User's secret (32 bytes)
 * @param poolId - Shield Pool address
 * @returns 32-byte commitment hash
 */
declare function generateCommitment(secret: Uint8Array, poolId: PublicKey): Uint8Array;
/**
 * Generate a nullifier for withdrawal or transfer
 * nullifier = hash(secret || operation_type || nonce)
 *
 * @param secret - User's secret (32 bytes)
 * @param operationType - "withdraw" or "transfer"
 * @param nonce - Operation nonce (unique per operation)
 * @returns 32-byte nullifier hash
 */
declare function generateNullifier(secret: Uint8Array, operationType: "withdraw" | "transfer", nonce: bigint): Uint8Array;
/**
 * Verify a commitment matches a secret and pool
 *
 * @param commitment - The commitment to verify
 * @param secret - User's secret
 * @param poolId - Shield Pool address
 * @returns true if commitment is valid
 */
declare function verifyCommitment(commitment: Uint8Array, secret: Uint8Array, poolId: PublicKey): boolean;
/**
 * Store secret securely in browser localStorage (encrypted with a derived key)
 * Note: For production, consider using more secure storage mechanisms
 *
 * @param secret - The secret to store
 * @param walletAddress - Wallet address as identifier
 * @param poolId - Pool ID for key derivation
 */
declare function storeSecret(secret: Uint8Array, walletAddress: string, poolId: string): void;
/**
 * Retrieve a stored secret
 *
 * @param walletAddress - Wallet address as identifier
 * @param poolId - Pool ID
 * @returns The secret or null if not found
 */
declare function retrieveSecret(walletAddress: string, poolId: string): Uint8Array | null;

/**
 * ECIES-like encryption utilities for share amounts
 *
 * The encrypted share format is:
 * [32 bytes nonce] + [32 bytes ciphertext]
 *
 * The encryption key is derived from a wallet signature to ensure
 * only the user can decrypt their share amount.
 */
/**
 * Derive an encryption key from a wallet signature
 * This is used to encrypt/decrypt share amounts
 *
 * @param signatureMessage - A message to sign with the wallet
 * @param signature - The wallet's signature of the message
 * @returns 32-byte symmetric encryption key
 */
declare function deriveEncryptionKey(signature: Uint8Array): Uint8Array;
/**
 * Encrypt a share amount
 *
 * @param shares - The share amount to encrypt (as a bigint)
 * @param encryptionKey - 32-byte encryption key
 * @returns 64-byte encrypted data [nonce (32) + ciphertext (32)]
 */
declare function encryptShares(shares: bigint, encryptionKey: Uint8Array): Uint8Array;
/**
 * Decrypt a share amount
 *
 * @param encryptedData - 64-byte encrypted data
 * @param encryptionKey - 32-byte encryption key
 * @returns The decrypted share amount as a bigint
 */
declare function decryptShares(encryptedData: Uint8Array, encryptionKey: Uint8Array): bigint;
/**
 * Create a placeholder encrypted share (for testing/demo)
 * This creates a properly formatted 64-byte array
 *
 * @param shares - Share amount
 * @returns 64-byte array with shares encoded (not encrypted)
 */
declare function createPlaceholderEncryptedShare(shares: bigint): Uint8Array;
/**
 * Read shares from a placeholder encrypted share
 *
 * @param data - 64-byte encrypted data
 * @returns Share amount
 */
declare function readPlaceholderShares(data: Uint8Array): bigint;
/**
 * Message to sign for key derivation
 */
declare const KEY_DERIVATION_MESSAGE = "Sign this message to derive your Subly Vault encryption key.\n\nThis signature will be used to encrypt and decrypt your private balance.\n\nIt will not trigger any blockchain transaction or cost any fees.";

/**
 * PDA seeds constants
 */
declare const SHIELD_POOL_SEED: Buffer<ArrayBuffer>;
declare const USER_SHARE_SEED: Buffer<ArrayBuffer>;
declare const DEPOSIT_HISTORY_SEED: Buffer<ArrayBuffer>;
declare const SCHEDULED_TRANSFER_SEED: Buffer<ArrayBuffer>;
declare const TRANSFER_HISTORY_SEED: Buffer<ArrayBuffer>;
declare const NULLIFIER_SEED: Buffer<ArrayBuffer>;
declare const BATCH_PROOF_SEED: Buffer<ArrayBuffer>;
declare const NOTE_COMMITMENT_REGISTRY_SEED: Buffer<ArrayBuffer>;
/**
 * Derive the Shield Pool PDA address
 */
declare function getShieldPoolPda(programId?: PublicKey): [PublicKey, number];
/**
 * Derive the User Share PDA address
 * @param pool - Shield Pool address
 * @param commitment - User commitment (32 bytes)
 */
declare function getUserSharePda(pool: PublicKey, commitment: Uint8Array, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Deposit History PDA address
 * @param commitment - User commitment (32 bytes)
 * @param depositIndex - Index of this deposit
 */
declare function getDepositHistoryPda(commitment: Uint8Array, depositIndex: bigint, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Scheduled Transfer PDA address
 * @param commitment - User commitment (32 bytes)
 * @param transferNonce - Unique nonce for this transfer
 */
declare function getScheduledTransferPda(commitment: Uint8Array, transferNonce: bigint, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Transfer History PDA address
 * @param scheduledTransfer - Scheduled transfer address
 * @param executionIndex - Index of this execution
 */
declare function getTransferHistoryPda(scheduledTransfer: PublicKey, executionIndex: number, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Nullifier PDA address
 * @param nullifierHash - Nullifier hash (32 bytes)
 */
declare function getNullifierPda(nullifierHash: Uint8Array, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Batch Proof PDA address
 * @param scheduledTransfer - Scheduled transfer address
 * @param executionIndex - Index of this execution
 */
declare function getBatchProofPda(scheduledTransfer: PublicKey, executionIndex: number, programId?: PublicKey): [PublicKey, number];
/**
 * Derive the Note Commitment Registry PDA address
 * Used for Privacy Cash deposit proofs to prevent double-registration
 * @param noteCommitment - Note commitment from Privacy Cash (32 bytes)
 */
declare function getNoteCommitmentRegistryPda(noteCommitment: Uint8Array, programId?: PublicKey): [PublicKey, number];

/**
 * Program IDL type definition
 * This file is manually maintained until anchor build works with edition2024
 */

type SublyVault = Idl;
/**
 * Load the IDL from JSON
 * This is a manually maintained IDL that reflects the current on-chain program structure
 */
declare function getIdl(): SublyVault;

/**
 * Privacy Cash Integration Module
 *
 * Provides wrapper functions for the Privacy Cash SDK to enable
 * private USDC deposits and withdrawals on Solana mainnet.
 *
 * @packageDocumentation
 * @module privacy-cash
 *
 * SDK Information:
 * - Package: privacycash v1.1.11
 * - Repository: https://github.com/Privacy-Cash/privacy-cash-sdk
 * - Network: Mainnet only (no devnet support)
 * - Runtime: Node.js 24+ required
 *
 * API Reference (privacycash v1.1.11):
 * - depositUSDC({ base_units }) → { tx: string }
 * - withdrawUSDC({ base_units, recipientAddress?, referrer? }) → { isPartial, tx, recipient, base_units, fee_base_units }
 * - getPrivateBalanceUSDC() → { base_units, amount, lamports }
 * - getPrivateBalanceSpl(mintAddress) → { base_units, amount, lamports }
 * - depositSPL({ base_units?, amount?, mintAddress }) → { tx: string }
 * - withdrawSPL({ base_units?, amount?, mintAddress, recipientAddress?, referrer? }) → { isPartial, tx, recipient, base_units, fee_base_units }
 */

/**
 * USDC mint address on Solana mainnet
 */
declare const USDC_MINT: PublicKey;
/**
 * Privacy Cash program ID on mainnet
 */
declare const PRIVACY_CASH_PROGRAM_ID: PublicKey;
/**
 * Raw SDK response from depositUSDC/depositSPL
 * @internal
 */
interface SDKDepositResponse {
    tx: string;
}
/**
 * Result of a private withdrawal
 *
 * Maps SDK snake_case fields to camelCase for TypeScript consistency.
 *
 * @example
 * ```typescript
 * const result = await integration.withdrawPrivateUSDC(10);
 * console.log(`Withdrew ${result.baseUnits / 1_000_000} USDC`);
 * console.log(`Fee: ${result.feeBaseUnits / 1_000_000} USDC`);
 * ```
 */
interface WithdrawResult {
    /** Transaction signature */
    tx: string;
    /** Recipient address (base58) */
    recipient: string;
    /** Amount withdrawn in base units (1 USDC = 1,000,000 base units) */
    baseUnits: number;
    /** Protocol fee in base units */
    feeBaseUnits: number;
    /** True if withdrawal was partial due to insufficient private balance */
    isPartial: boolean;
}
/**
 * Privacy Cash integration configuration
 */
interface PrivacyCashConfig {
    rpcUrl: string;
    privateKey: string | Uint8Array | Keypair;
    enableDebug?: boolean;
}
/**
 * Privacy Cash Integration Class
 *
 * Wraps the Privacy Cash SDK to provide a clean interface for
 * private USDC operations.
 */
declare class PrivacyCashIntegration {
    private client;
    private initialized;
    private config;
    constructor(config: PrivacyCashConfig);
    /**
     * Initialize the Privacy Cash client
     * Must be called before any operations
     */
    initialize(): Promise<void>;
    /**
     * Ensure client is initialized
     */
    private ensureInitialized;
    /**
     * Deposit USDC privately
     *
     * Uses the USDC-specific depositUSDC method for better reliability.
     *
     * SDK Method: depositUSDC({ base_units }) → { tx: string }
     * Fallback: depositSPL({ mintAddress, base_units }) → { tx: string }
     *
     * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
     * @returns Transaction signature
     */
    depositPrivateUSDC(amount: number): Promise<SDKDepositResponse>;
    /**
     * Withdraw USDC privately
     *
     * Uses the USDC-specific withdrawUSDC method for better reliability.
     *
     * SDK Method: withdrawUSDC({ base_units, recipientAddress?, referrer? })
     *            → { isPartial, tx, recipient, base_units, fee_base_units }
     * Fallback: withdrawSPL({ mintAddress, base_units, recipientAddress? })
     *
     * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
     * @param recipient Optional recipient address (defaults to self)
     * @returns Withdrawal result with transaction and fee information
     */
    withdrawPrivateUSDC(amount: number, recipient?: string): Promise<WithdrawResult>;
    /**
     * Get private USDC balance
     *
     * Uses the USDC-specific getPrivateBalanceUSDC method for better reliability.
     *
     * SDK Method: getPrivateBalanceUSDC() → { base_units, amount, lamports }
     * Fallback: getPrivateBalanceSpl(mintAddress) → { base_units, amount, lamports }
     *
     * @returns Balance in USDC (human-readable)
     */
    getPrivateUSDCBalance(): Promise<number>;
    /**
     * Clear the local UTXO cache
     * Useful for forcing a refresh of balance data
     */
    clearCache(): Promise<void>;
    /**
     * Get estimated fees for a withdrawal
     *
     * @param amount Amount in USDC
     * @returns Estimated fee breakdown
     */
    getEstimatedWithdrawalFees(amount: number): {
        protocolFeePercent: number;
        protocolFeeUsdc: number;
        networkFeeSol: number;
        totalFeeUsdc: number;
    };
}
/**
 * Privacy Cash specific error class
 */
declare class PrivacyCashError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Create a Privacy Cash integration instance
 *
 * @param config Configuration options
 * @returns Initialized Privacy Cash integration
 */
declare function createPrivacyCashIntegration(config: PrivacyCashConfig): Promise<PrivacyCashIntegration>;

export { BATCH_PROOF_SEED, type BalanceResult, type CronJobResult, DEPOSIT_HISTORY_SEED, type DepositHistory, type DepositParams, INTERVAL_SECONDS, KAMINO_CUSDC_MINT, KAMINO_LENDING_PROGRAM_ID, KAMINO_MAIN_MARKET, KAMINO_USDC_RESERVE, KEY_DERIVATION_MESSAGE, type KaminoConfig, type KaminoDepositResult, KaminoError, KaminoIntegration, type KaminoWithdrawResult, type KaminoYieldInfo, LocalStorageManager, type LocalTransferData, type LocalVaultData, NOTE_COMMITMENT_REGISTRY_SEED, NULLIFIER_SEED, type NoteCommitmentRegistry, type Nullifier, OperationType, POOL_CTOKEN_ACCOUNT_SEED, POOL_TOKEN_ACCOUNT_SEED, PRIVACY_CASH_PROGRAM_ID, USDC_MINT as PRIVACY_CASH_USDC_MINT, PROGRAM_ID, type PendingTransfer, type PrivacyCashConfig, PrivacyCashError, PrivacyCashIntegration, type RegisterDepositParams, SCHEDULED_TRANSFER_SEED, SHIELD_POOL_SEED, type ScheduledTransfer, type SetupRecurringPaymentParams, type ShieldPool, type SublyVault, SublyVaultClient, TRANSFER_HISTORY_SEED, TUKTUK_CRON_PROGRAM_ID, TUKTUK_PROGRAM_ID, type TransactionResult, type TransferHistory, TransferStatus, type TukTukConfig, TukTukError, TukTukIntegration, USDC_DECIMALS, USDC_MINT_MAINNET, USER_SHARE_SEED, type UserShare, type VaultSdkConfig, type WithdrawParams, type WithdrawResult, type YieldInfo, createKaminoIntegration, createPlaceholderEncryptedShare, createPrivacyCashIntegration, createSublyVaultClient, createTukTukIntegration, decryptShares, decryptTransferData, deriveEncryptionKey, encryptShares, encryptTransferData, generateCommitment, generateNullifier, generateSecret, getBatchProofPda, getDepositHistoryPda, getIdl, getNoteCommitmentRegistryPda, getNullifierPda, getScheduledTransferPda, getShieldPoolPda, getTransferHistoryPda, getUserSharePda, intervalToCronSchedule, readPlaceholderShares, retrieveSecret, storeSecret, verifyCommitment };
