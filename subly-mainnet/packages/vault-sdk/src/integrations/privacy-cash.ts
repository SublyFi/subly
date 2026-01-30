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

import { Keypair, PublicKey } from '@solana/web3.js';

// Privacy Cash SDK (privacycash v1.1.11)
// Dynamic import to handle Node.js version requirements

/**
 * USDC mint address on Solana mainnet
 */
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Privacy Cash program ID on mainnet
 */
export const PRIVACY_CASH_PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

// ============================================================================
// SDK Response Types (matching privacycash v1.1.11 actual return values)
// ============================================================================

/**
 * Raw SDK response from depositUSDC/depositSPL
 * @internal
 */
export interface SDKDepositResponse {
  tx: string;
}

/**
 * Raw SDK response from withdrawUSDC/withdrawSPL
 * @internal
 */
export interface SDKWithdrawResponse {
  isPartial: boolean;
  tx: string;
  recipient: string;
  base_units: number;
  fee_base_units: number;
}

/**
 * Raw SDK response from getPrivateBalanceUSDC/getPrivateBalanceSpl
 * @internal
 */
export interface SDKBalanceResponse {
  base_units: number;
  amount: number;   // Human-readable amount
  lamports: number; // SOL lamports (for SOL operations)
}

// ============================================================================
// Public Types
// ============================================================================

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
export interface WithdrawResult {
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
   * Uses the USDC-specific depositUSDC method for better reliability.
   *
   * SDK Method: depositUSDC({ base_units }) → { tx: string }
   * Fallback: depositSPL({ mintAddress, base_units }) → { tx: string }
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Transaction signature
   */
  async depositPrivateUSDC(amount: number): Promise<SDKDepositResponse> {
    this.ensureInitialized();

    try {
      // Convert human-readable amount to base units (1 USDC = 1,000,000 base units)
      const baseUnits = Math.floor(amount * 1_000_000);

      // Use USDC-specific method (preferred)
      if (typeof this.client.depositUSDC === 'function') {
        const result = await this.client.depositUSDC({
          base_units: baseUnits,
        });
        return { tx: result.tx };
      }

      // Fallback to generic SPL method
      const result = await this.client.depositSPL({
        mintAddress: USDC_MINT.toBase58(),
        base_units: baseUnits,
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
  async withdrawPrivateUSDC(amount: number, recipient?: string): Promise<WithdrawResult> {
    this.ensureInitialized();

    try {
      // Convert human-readable amount to base units (1 USDC = 1,000,000 base units)
      const baseUnits = Math.floor(amount * 1_000_000);

      // Use USDC-specific method (preferred)
      if (typeof this.client.withdrawUSDC === 'function') {
        const result = await this.client.withdrawUSDC({
          base_units: baseUnits,
          recipientAddress: recipient,
        });

        return {
          tx: result.tx,
          recipient: result.recipient,
          baseUnits: result.base_units,
          feeBaseUnits: result.fee_base_units,
          isPartial: result.isPartial ?? false,
        };
      }

      // Fallback to generic SPL method
      const result = await this.client.withdrawSPL({
        mintAddress: USDC_MINT.toBase58(),
        base_units: baseUnits,
        recipientAddress: recipient,
      });

      return {
        tx: result.tx,
        recipient: result.recipient,
        baseUnits: result.base_units,
        feeBaseUnits: result.fee_base_units,
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
   * Uses the USDC-specific getPrivateBalanceUSDC method for better reliability.
   *
   * SDK Method: getPrivateBalanceUSDC() → { base_units, amount, lamports }
   * Fallback: getPrivateBalanceSpl(mintAddress) → { base_units, amount, lamports }
   *
   * @returns Balance in USDC (human-readable)
   */
  async getPrivateUSDCBalance(): Promise<number> {
    this.ensureInitialized();

    try {
      // Try the USDC-specific method first (preferred)
      if (typeof this.client.getPrivateBalanceUSDC === 'function') {
        const result = await this.client.getPrivateBalanceUSDC();
        // SDK returns { base_units, amount, lamports }
        // amount is human-readable USDC
        return result.amount ?? (result.base_units / 1_000_000);
      }

      // Fallback to generic SPL method
      // Note: getPrivateBalanceSpl takes mintAddress directly, not as an object
      const result = await this.client.getPrivateBalanceSpl(USDC_MINT.toBase58());
      return result.amount ?? (result.base_units / 1_000_000);
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
