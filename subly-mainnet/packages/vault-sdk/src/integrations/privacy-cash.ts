/**
 * Privacy Cash Integration Module
 *
 * Provides wrapper functions for the Privacy Cash SDK to enable
 * private USDC deposits and withdrawals on Solana mainnet.
 *
 * Note: Privacy Cash only works on mainnet (no devnet support).
 * Requires Node.js 24 or higher.
 */

import { Keypair, PublicKey } from '@solana/web3.js';

// Privacy Cash SDK types (imported dynamically to handle Node.js version requirements)
// The actual SDK is: import { PrivacyCash } from 'privacycash';

/**
 * USDC mint address on Solana mainnet
 */
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Privacy Cash program ID on mainnet
 */
export const PRIVACY_CASH_PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

/**
 * Result of a private withdrawal
 */
export interface WithdrawResult {
  tx: string;
  recipient: string;
  amountInBaseUnits: number;
  feeInBaseUnits: number;
  isPartial: boolean;
}

/**
 * Privacy Cash integration configuration
 */
export interface PrivacyCashConfig {
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
export class PrivacyCashIntegration {
  private client: any; // PrivacyCash client instance
  private initialized: boolean = false;
  private config: PrivacyCashConfig;

  constructor(config: PrivacyCashConfig) {
    this.config = config;
  }

  /**
   * Initialize the Privacy Cash client
   * Must be called before any operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import to handle Node.js version requirements
      const { PrivacyCash } = await import('privacycash');

      // Convert keypair to format expected by Privacy Cash SDK
      let ownerKey: string | number[] | Uint8Array;
      if (this.config.privateKey instanceof Keypair) {
        ownerKey = Array.from(this.config.privateKey.secretKey);
      } else if (this.config.privateKey instanceof Uint8Array) {
        ownerKey = Array.from(this.config.privateKey);
      } else {
        ownerKey = this.config.privateKey;
      }

      this.client = new PrivacyCash({
        RPC_url: this.config.rpcUrl,
        owner: ownerKey,
        enableDebug: this.config.enableDebug ?? false,
      });

      this.initialized = true;
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to initialize Privacy Cash client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_FAILED'
      );
    }
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new PrivacyCashError(
        'Privacy Cash client not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Deposit USDC privately
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Transaction signature
   */
  async depositPrivateUSDC(amount: number): Promise<{ tx: string }> {
    this.ensureInitialized();

    try {
      const result = await this.client.depositSPL({
        mintAddress: USDC_MINT.toBase58(),
        amount: amount, // Human-readable amount
      });

      return { tx: result.tx };
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to deposit USDC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEPOSIT_FAILED'
      );
    }
  }

  /**
   * Withdraw USDC privately
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @param recipient Optional recipient address (defaults to self)
   * @returns Withdrawal result with transaction and fee information
   */
  async withdrawPrivateUSDC(amount: number, recipient?: string): Promise<WithdrawResult> {
    this.ensureInitialized();

    try {
      const params: any = {
        mintAddress: USDC_MINT.toBase58(),
        amount: amount, // Human-readable amount
      };

      if (recipient) {
        params.recipientAddress = recipient;
      }

      const result = await this.client.withdrawSPL(params);

      return {
        tx: result.tx,
        recipient: result.recipient,
        amountInBaseUnits: result.amount_in_lamports || result.amount_in_base_units,
        feeInBaseUnits: result.fee_in_lamports || result.fee_in_base_units,
        isPartial: result.isPartial ?? false,
      };
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to withdraw USDC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WITHDRAW_FAILED'
      );
    }
  }

  /**
   * Get private USDC balance
   *
   * @returns Balance in USDC (human-readable)
   */
  async getPrivateUSDCBalance(): Promise<number> {
    this.ensureInitialized();

    try {
      // Try the USDC-specific method first
      if (typeof this.client.getPrivateBalanceUSDC === 'function') {
        const balance = await this.client.getPrivateBalanceUSDC();
        return balance;
      }

      // Fallback to generic SPL method
      const balance = await this.client.getPrivateBalanceSpl({
        mintAddress: USDC_MINT.toBase58(),
      });

      return balance;
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to get private balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BALANCE_FAILED'
      );
    }
  }

  /**
   * Clear the local UTXO cache
   * Useful for forcing a refresh of balance data
   */
  async clearCache(): Promise<void> {
    this.ensureInitialized();

    try {
      if (typeof this.client.clearCache === 'function') {
        await this.client.clearCache();
      }
    } catch (error) {
      // Cache clear is optional, don't throw
      console.warn('Failed to clear Privacy Cash cache:', error);
    }
  }

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
  } {
    const protocolFeePercent = 0.35; // 0.35%
    const networkFeeSol = 0.006; // ~0.006 SOL per recipient

    const protocolFeeUsdc = amount * (protocolFeePercent / 100);

    return {
      protocolFeePercent,
      protocolFeeUsdc,
      networkFeeSol,
      totalFeeUsdc: protocolFeeUsdc, // Note: SOL fee is separate
    };
  }
}

/**
 * Privacy Cash specific error class
 */
export class PrivacyCashError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(`Privacy Cash Error [${code}]: ${message}`);
    this.name = 'PrivacyCashError';
  }
}

/**
 * Create a Privacy Cash integration instance
 *
 * @param config Configuration options
 * @returns Initialized Privacy Cash integration
 */
export async function createPrivacyCashIntegration(
  config: PrivacyCashConfig
): Promise<PrivacyCashIntegration> {
  const integration = new PrivacyCashIntegration(config);
  await integration.initialize();
  return integration;
}
