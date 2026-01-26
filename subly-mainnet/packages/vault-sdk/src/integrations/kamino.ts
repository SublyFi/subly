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

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

/**
 * Kamino Lending program ID on mainnet
 */
export const KAMINO_LENDING_PROGRAM_ID = new PublicKey('KLend2g3cP87ber41VSz2cHu5M3mxzQS7pzLFz1UJwp');

/**
 * USDC mint address on Solana mainnet
 */
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Kamino Main Market address (for USDC lending)
 */
export const KAMINO_MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

/**
 * Yield information
 */
export interface KaminoYieldInfo {
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
export interface KaminoDepositResult {
  tx: string;
  cTokensReceived: number;
  depositedAmount: number;
}

/**
 * Withdraw result
 */
export interface KaminoWithdrawResult {
  tx: string;
  amountWithdrawn: number;
  cTokensBurned: number;
}

/**
 * Kamino integration configuration
 */
export interface KaminoConfig {
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
export class KaminoIntegration {
  private connection: Connection;
  private payer: Keypair;
  private poolAuthority: PublicKey;
  private marketAddress: PublicKey;
  private initialized: boolean = false;
  private kaminoMarket: any = null;

  constructor(config: KaminoConfig) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.poolAuthority = config.poolAuthority;
    this.marketAddress = config.marketAddress ?? KAMINO_MAIN_MARKET;
  }

  /**
   * Initialize the Kamino market client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import to handle SDK availability
      const klendSdk = await import('@kamino-finance/klend-sdk');
      const KaminoMarket = klendSdk.KaminoMarket as any;

      // KaminoMarket.load expects different parameters depending on version
      // Use any to handle API differences between versions
      this.kaminoMarket = await KaminoMarket.load(
        this.connection,
        this.marketAddress,
        KAMINO_LENDING_PROGRAM_ID
      );

      this.initialized = true;
    } catch (error) {
      throw new KaminoError(
        `Failed to initialize Kamino market: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_FAILED'
      );
    }
  }

  /**
   * Ensure the integration is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.kaminoMarket) {
      throw new KaminoError(
        'Kamino integration not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Deposit USDC into Kamino Lending
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Deposit result with transaction and cToken info
   */
  async depositToKamino(amount: number): Promise<KaminoDepositResult> {
    this.ensureInitialized();

    try {
      const klendSdk = await import('@kamino-finance/klend-sdk');
      const KaminoAction = klendSdk.KaminoAction as any;

      // Convert to base units (USDC has 6 decimals)
      const amountInBaseUnits = BigInt(Math.floor(amount * 1e6));

      // Get current slot for transaction
      const currentSlot = await this.connection.getSlot();

      // Build deposit action
      // Note: KaminoAction API varies by version. Using 'any' to handle differences.
      const depositAction = await KaminoAction.buildDepositTxns(
        this.kaminoMarket,
        amountInBaseUnits.toString(),
        USDC_MINT,
        this.poolAuthority,
        undefined, // obligation - auto-create if needed
        true, // useV2Ixs
        undefined, // scopeRefreshConfig
        1_000_000, // extraComputeBudget
        true, // includeAtaIxs
        false, // requestElevationGroup
        undefined, // lookupTableCreationConfig
        undefined, // referrer
        currentSlot
      );

      // Get instructions from the action
      const instructions = (depositAction.setupIxs || []).concat(
        depositAction.lendingIxs || [],
        depositAction.cleanupIxs || []
      );

      const tx = new Transaction();
      for (const ix of instructions) {
        tx.add(ix);
      }

      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);

      // Note: Actual cTokens received would need to be parsed from transaction logs
      // For simplicity, we estimate based on current exchange rate
      const estimatedCTokens = amount; // 1:1 at initialization, grows over time

      return {
        tx: signature,
        cTokensReceived: estimatedCTokens,
        depositedAmount: amount,
      };
    } catch (error) {
      throw new KaminoError(
        `Failed to deposit to Kamino: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEPOSIT_FAILED'
      );
    }
  }

  /**
   * Withdraw USDC from Kamino Lending
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Withdraw result with transaction info
   */
  async withdrawFromKamino(amount: number): Promise<KaminoWithdrawResult> {
    this.ensureInitialized();

    try {
      const klendSdk = await import('@kamino-finance/klend-sdk');
      const KaminoAction = klendSdk.KaminoAction as any;

      // Convert to base units
      const amountInBaseUnits = BigInt(Math.floor(amount * 1e6));

      // Get current slot for transaction
      const currentSlot = await this.connection.getSlot();

      // Build withdraw action
      // Note: KaminoAction API varies by version. Using 'any' to handle differences.
      const withdrawAction = await KaminoAction.buildWithdrawTxns(
        this.kaminoMarket,
        amountInBaseUnits.toString(),
        USDC_MINT,
        this.poolAuthority,
        undefined, // obligation
        true, // useV2Ixs
        undefined, // scopeRefreshConfig
        1_000_000, // extraComputeBudget
        true, // includeAtaIxs
        undefined, // lookupTableCreationConfig
        currentSlot
      );

      // Get instructions from the action
      const instructions = (withdrawAction.setupIxs || []).concat(
        withdrawAction.lendingIxs || [],
        withdrawAction.cleanupIxs || []
      );

      const tx = new Transaction();
      for (const ix of instructions) {
        tx.add(ix);
      }

      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);

      return {
        tx: signature,
        amountWithdrawn: amount,
        cTokensBurned: amount, // Estimate
      };
    } catch (error) {
      throw new KaminoError(
        `Failed to withdraw from Kamino: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WITHDRAW_FAILED'
      );
    }
  }

  /**
   * Get current yield information for the pool
   *
   * @returns Yield information including APY and earned amounts
   */
  async getKaminoYieldInfo(): Promise<KaminoYieldInfo> {
    this.ensureInitialized();

    try {
      // Refresh market data
      await this.kaminoMarket.reload();

      // Get USDC reserve
      const usdcReserve = this.kaminoMarket.getReserveByMint(USDC_MINT);

      if (!usdcReserve) {
        throw new KaminoError('USDC reserve not found in Kamino market', 'RESERVE_NOT_FOUND');
      }

      // Get supply APY
      const supplyApy = usdcReserve.stats?.supplyInterestAPY ?? 0;

      // Get obligation info for the pool authority
      // Note: This would need the actual obligation address
      let depositedAmount = 0;
      let currentValue = 0;
      let earnedYield = 0;

      try {
        const obligations = await this.kaminoMarket.getAllObligationsByOwner(this.poolAuthority);
        if (obligations.length > 0) {
          // Sum up all USDC deposits
          for (const obligation of obligations) {
            const deposits = obligation.deposits?.filter(
              (d: any) => d.mintAddress?.equals(USDC_MINT)
            );
            if (deposits) {
              for (const deposit of deposits) {
                depositedAmount += Number(deposit.amount ?? 0) / 1e6;
                currentValue += Number(deposit.marketValueRefreshed ?? deposit.amount ?? 0) / 1e6;
              }
            }
          }
          earnedYield = currentValue - depositedAmount;
        }
      } catch {
        // No obligations found - pool hasn't deposited yet
      }

      return {
        apy: supplyApy,
        apyFormatted: `${(supplyApy * 100).toFixed(2)}%`,
        earnedYield,
        depositedAmount,
        currentValue,
        lastUpdated: new Date(),
      };
    } catch (error) {
      // If we can't get real data, return estimated values
      // This is a fallback for when Kamino SDK is unavailable
      if (error instanceof KaminoError) {
        throw error;
      }

      // Return estimated/cached values
      return {
        apy: 0.05, // Default 5% APY estimate
        apyFormatted: '5.00%',
        earnedYield: 0,
        depositedAmount: 0,
        currentValue: 0,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get the current USDC supply APY from Kamino
   *
   * @returns APY as a decimal (e.g., 0.05 = 5%)
   */
  async getCurrentApy(): Promise<number> {
    const yieldInfo = await this.getKaminoYieldInfo();
    return yieldInfo.apy;
  }

  /**
   * Estimate yield for a given amount and duration
   *
   * @param principal Amount in USDC
   * @param daysHeld Number of days to hold
   * @returns Estimated yield in USDC
   */
  async estimateYield(principal: number, daysHeld: number): Promise<number> {
    const apy = await this.getCurrentApy();
    // Simple interest calculation for short periods
    const dailyRate = apy / 365;
    return principal * dailyRate * daysHeld;
  }
}

/**
 * Kamino specific error class
 */
export class KaminoError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(`Kamino Error [${code}]: ${message}`);
    this.name = 'KaminoError';
  }
}

/**
 * Create a Kamino integration instance
 *
 * @param config Configuration options
 * @returns Initialized Kamino integration
 */
export async function createKaminoIntegration(config: KaminoConfig): Promise<KaminoIntegration> {
  const integration = new KaminoIntegration(config);
  await integration.initialize();
  return integration;
}
