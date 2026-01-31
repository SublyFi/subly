import {
  Address,
  address,
  createSolanaRpc,
  Rpc,
  Slot,
  TransactionSigner,
  createKeyPairSignerFromBytes,
  KeyPairSigner,
} from '@solana/kit';
import { KaminoMarket, KaminoAction, KaminoReserve, VanillaObligation, PROGRAM_ID } from '@kamino-finance/klend-sdk';
import type { KaminoMarketRpcApi } from '@kamino-finance/klend-sdk';
import Decimal from 'decimal.js';

// Kamino Mainnet Constants
export const KAMINO_MAIN_MARKET: Address = address('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');
export const USDC_MINT: Address = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Slot duration in milliseconds (default: 400ms per slot)
const RECENT_SLOT_DURATION_MS = 400;

export interface ReserveStats {
  totalSupply: Decimal;
  utilizationRate: Decimal;
  supplyAPY: Decimal;
  borrowAPY: Decimal;
}

export interface KaminoActionResult {
  action: KaminoAction;
  setupIxs: KaminoAction['setupIxs'];
  lendingIxs: KaminoAction['lendingIxs'];
  cleanupIxs: KaminoAction['cleanupIxs'];
}

export class KaminoService {
  private rpc: Rpc<KaminoMarketRpcApi>;
  private rpcUrl: string;
  private market: KaminoMarket | null = null;
  private usdcReserve: KaminoReserve | null = null;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.rpc = createSolanaRpc(rpcUrl) as Rpc<KaminoMarketRpcApi>;
  }

  /**
   * Initialize Kamino Market
   */
  async initialize(): Promise<void> {
    const market = await KaminoMarket.load(
      this.rpc,
      KAMINO_MAIN_MARKET,
      RECENT_SLOT_DURATION_MS
    );

    if (!market) {
      throw new Error('Failed to load Kamino market');
    }

    this.market = market;
    this.usdcReserve = this.market.getReserveByMint(USDC_MINT) ?? null;

    if (!this.usdcReserve) {
      throw new Error('USDC reserve not found in Kamino market');
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.market !== null && this.usdcReserve !== null;
  }

  /**
   * Get current slot
   */
  async getCurrentSlot(): Promise<Slot> {
    const slot = await this.rpc.getSlot({ commitment: 'confirmed' }).send();
    return slot;
  }

  /**
   * Get current APY for USDC reserve
   * @returns APY as a decimal (e.g., 0.05 for 5%)
   */
  async getSupplyAPY(): Promise<number> {
    if (!this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const slot = await this.getCurrentSlot();
    const apy = this.usdcReserve.totalSupplyAPY(slot);
    return apy;
  }

  /**
   * Get reserve statistics
   */
  async getReserveStats(): Promise<ReserveStats> {
    if (!this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const slot = await this.getCurrentSlot();

    return {
      totalSupply: this.usdcReserve.getTotalSupply(),
      utilizationRate: new Decimal(this.usdcReserve.calculateUtilizationRatio()),
      supplyAPY: new Decimal(this.usdcReserve.totalSupplyAPY(slot)),
      borrowAPY: new Decimal(this.usdcReserve.totalBorrowAPY(slot)),
    };
  }

  /**
   * Get USDC reserve decimals
   */
  getDecimals(): number {
    if (!this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }
    return this.usdcReserve.stats.decimals;
  }

  /**
   * Get market instance
   */
  getMarket(): KaminoMarket {
    if (!this.market) {
      throw new Error('KaminoService not initialized');
    }
    return this.market;
  }

  /**
   * Get RPC URL
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Build deposit transaction
   * @param ownerSigner - Transaction signer (owner)
   * @param amountUsdc - Amount in USDC (human readable, e.g., 100 for 100 USDC)
   */
  async buildDepositTransaction(
    ownerSigner: TransactionSigner,
    amountUsdc: number
  ): Promise<KaminoActionResult> {
    if (!this.market || !this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const decimals = this.usdcReserve.stats.decimals;
    const amountLamports = BigInt(Math.floor(amountUsdc * Math.pow(10, decimals)));

    // Create vanilla obligation for deposit
    const obligation = new VanillaObligation(PROGRAM_ID);

    const depositAction = await KaminoAction.buildDepositTxns(
      this.market,
      amountLamports.toString(),
      USDC_MINT,
      ownerSigner,
      obligation,
      true,      // useV2Ixs
      undefined, // scopeRefreshConfig
      1_000_000, // extraComputeBudget
      true,      // includeAtaIxs
      false,     // requestElevationGroup
      { skipInitialization: false, skipLutCreation: false }, // initUserMetadata
      undefined, // referrer
      undefined, // currentSlot
    );

    return {
      action: depositAction,
      setupIxs: depositAction.setupIxs,
      lendingIxs: depositAction.lendingIxs,
      cleanupIxs: depositAction.cleanupIxs,
    };
  }

  /**
   * Build withdraw transaction
   * @param ownerSigner - Transaction signer (owner)
   * @param amountUsdc - Amount in USDC (human readable, e.g., 100 for 100 USDC)
   */
  async buildWithdrawTransaction(
    ownerSigner: TransactionSigner,
    amountUsdc: number
  ): Promise<KaminoActionResult> {
    if (!this.market || !this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const decimals = this.usdcReserve.stats.decimals;
    const amountLamports = BigInt(Math.floor(amountUsdc * Math.pow(10, decimals)));

    // Get user's existing obligation
    const ownerAddress = ownerSigner.address;
    const obligation = await this.market.getUserVanillaObligation(ownerAddress);

    if (!obligation) {
      throw new Error('No obligation found for wallet');
    }

    const withdrawAction = await KaminoAction.buildWithdrawTxns(
      this.market,
      amountLamports.toString(),
      USDC_MINT,
      ownerSigner,
      obligation,
      true,      // useV2Ixs
      undefined, // scopeRefreshConfig
      1_000_000, // extraComputeBudget
      true,      // includeAtaIxs
      false,     // requestElevationGroup
      { skipInitialization: false, skipLutCreation: false }, // initUserMetadata
      undefined, // referrer
      undefined, // currentSlot
    );

    return {
      action: withdrawAction,
      setupIxs: withdrawAction.setupIxs,
      lendingIxs: withdrawAction.lendingIxs,
      cleanupIxs: withdrawAction.cleanupIxs,
    };
  }

  /**
   * Get user's deposited amount in Kamino
   * @param walletAddress - User's wallet address
   * @returns Deposited amount in USDC (human readable)
   */
  async getUserDepositedAmount(walletAddress: Address): Promise<number> {
    if (!this.market || !this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const obligation = await this.market.getUserVanillaObligation(walletAddress);
    if (!obligation) {
      return 0;
    }

    const deposits = obligation.deposits;

    // Find USDC deposit
    let usdcDeposit: Decimal | undefined;
    for (const [mintAddress, deposit] of deposits) {
      if (mintAddress === USDC_MINT) {
        usdcDeposit = deposit.amount;
        break;
      }
    }

    if (!usdcDeposit) {
      return 0;
    }

    return usdcDeposit.toNumber();
  }
}

// Singleton instance for client-side usage
let kaminoServiceInstance: KaminoService | null = null;

export async function getKaminoService(rpcUrl: string): Promise<KaminoService> {
  if (!kaminoServiceInstance || !kaminoServiceInstance.isInitialized()) {
    kaminoServiceInstance = new KaminoService(rpcUrl);
    await kaminoServiceInstance.initialize();
  }
  return kaminoServiceInstance;
}

/**
 * Convert base58 public key string to @solana/kit Address
 */
export function toKitAddress(pubkeyStr: string): Address {
  return address(pubkeyStr);
}
