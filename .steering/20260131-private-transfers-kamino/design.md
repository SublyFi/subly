# 設計書: プライベート定期送金 & プライベートKamino Deposit

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  TransferForm.tsx    │  KaminoDepositForm.tsx  │  YieldCard.tsx │
│  (定期送金設定)       │  (Kamino操作)            │  (APY表示)     │
└──────────┬───────────┴──────────┬───────────────┴───────┬───────┘
           │                      │                       │
           ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Hooks Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  useTransfers.ts     │  useKamino.ts (NEW)     │  useYield.ts   │
│  - setupTransfer()   │  - deposit()            │  - getAPY()    │
│  - cancelTransfer()  │  - withdraw()           │  - getEarned() │
│  - executeTransfer() │  - getReserveStats()    │                │
└──────────┬───────────┴──────────┬───────────────┴───────┬───────┘
           │                      │                       │
           ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  privacy-cash-service.ts  │  kamino-service.ts (NEW)            │
│  - deposit()              │  - KaminoMarket.load()              │
│  - withdraw()             │  - KaminoAction.buildDepositTxns()  │
│  - getBalance()           │  - KaminoAction.buildWithdrawTxns() │
└──────────┬────────────────┴──────────┬──────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Solana Programs                              │
├─────────────────────────────────────────────────────────────────┤
│  Privacy Cash         │  Subly Vault          │  Kamino Lending │
│  (Relayer経由)        │  (Shield Pool管理)     │  (SDK経由)      │
└───────────────────────┴───────────────────────┴─────────────────┘
```

---

## Kamino SDK 統合設計

### 依存パッケージ

```json
{
  "dependencies": {
    "@kamino-finance/klend-sdk": "^3.x.x",
    "decimal.js": "^10.x.x"
  }
}
```

### 新規ファイル: `lib/kamino-service.ts`

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket, KaminoAction, KaminoReserve } from '@kamino-finance/klend-sdk';
import { BN } from '@coral-xyz/anchor';
import Decimal from 'decimal.js';

// Kamino Mainnet Constants
export const KAMINO_MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export class KaminoService {
  private connection: Connection;
  private market: KaminoMarket | null = null;
  private usdcReserve: KaminoReserve | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Initialize Kamino Market
   */
  async initialize(): Promise<void> {
    this.market = await KaminoMarket.load(this.connection, KAMINO_MAIN_MARKET);
    this.usdcReserve = this.market.getReserveByMint(USDC_MINT);

    if (!this.usdcReserve) {
      throw new Error('USDC reserve not found in Kamino market');
    }
  }

  /**
   * Get current APY for USDC reserve
   */
  async getSupplyAPY(): Promise<number> {
    if (!this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const slot = await this.connection.getSlot('confirmed');
    const apy = this.usdcReserve.totalSupplyAPY(BigInt(slot));
    return apy.toNumber();
  }

  /**
   * Get reserve statistics
   */
  async getReserveStats(): Promise<{
    totalSupply: Decimal;
    utilizationRate: Decimal;
    supplyAPY: Decimal;
  }> {
    if (!this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const slot = await this.connection.getSlot('confirmed');

    return {
      totalSupply: this.usdcReserve.getEstimatedTotalSupply(),
      utilizationRate: this.usdcReserve.getEstimatedUtilizationRatio(),
      supplyAPY: this.usdcReserve.totalSupplyAPY(BigInt(slot)),
    };
  }

  /**
   * Build deposit transaction
   */
  async buildDepositTransaction(
    walletPublicKey: PublicKey,
    amountUsdc: number
  ): Promise<Transaction> {
    if (!this.market || !this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const decimals = this.usdcReserve.stats.decimals;
    const amount = new BN(amountUsdc * Math.pow(10, decimals));

    // Get or create obligation
    const obligation = await this.market.getObligationByWallet(walletPublicKey);

    const depositAction = await KaminoAction.buildDepositTxns(
      this.market,
      amount,
      USDC_MINT,
      walletPublicKey,
      obligation,
      true,  // useV2Ixs
    );

    return depositAction.transaction;
  }

  /**
   * Build withdraw transaction
   */
  async buildWithdrawTransaction(
    walletPublicKey: PublicKey,
    amountUsdc: number
  ): Promise<Transaction> {
    if (!this.market || !this.usdcReserve) {
      throw new Error('KaminoService not initialized');
    }

    const decimals = this.usdcReserve.stats.decimals;
    const amount = new BN(amountUsdc * Math.pow(10, decimals));

    const obligation = await this.market.getObligationByWallet(walletPublicKey);
    if (!obligation) {
      throw new Error('No obligation found for wallet');
    }

    const withdrawAction = await KaminoAction.buildWithdrawTxns(
      this.market,
      amount,
      USDC_MINT,
      walletPublicKey,
      obligation,
      true,  // useV2Ixs
    );

    return withdrawAction.transaction;
  }
}
```

---

## 新規ファイル: `hooks/useKamino.ts`

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { KaminoService } from "@/lib/kamino-service";
import Decimal from "decimal.js";

interface KaminoState {
  apy: number;
  totalSupply: Decimal | null;
  utilizationRate: Decimal | null;
  loading: boolean;
  error: string | null;
  deposit: (amountUsdc: number) => Promise<string>;
  withdraw: (amountUsdc: number) => Promise<string>;
  refresh: () => Promise<void>;
}

export function useKamino(): KaminoState {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [service, setService] = useState<KaminoService | null>(null);
  const [apy, setApy] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<Decimal | null>(null);
  const [utilizationRate, setUtilizationRate] = useState<Decimal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    const initService = async () => {
      const kaminoService = new KaminoService(connection);
      await kaminoService.initialize();
      setService(kaminoService);
    };

    initService().catch(console.error);
  }, [connection]);

  // Refresh stats
  const refresh = useCallback(async () => {
    if (!service) return;

    setLoading(true);
    try {
      const stats = await service.getReserveStats();
      setApy(stats.supplyAPY.toNumber() * 100); // Convert to percentage
      setTotalSupply(stats.totalSupply);
      setUtilizationRate(stats.utilizationRate);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [service]);

  // Deposit to Kamino
  const deposit = useCallback(async (amountUsdc: number): Promise<string> => {
    if (!service || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected or service not initialized');
    }

    const tx = await service.buildDepositTransaction(publicKey, amountUsdc);
    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }, [service, publicKey, signTransaction, connection]);

  // Withdraw from Kamino
  const withdraw = useCallback(async (amountUsdc: number): Promise<string> => {
    if (!service || !publicKey || !signTransaction) {
      throw new Error('Wallet not connected or service not initialized');
    }

    const tx = await service.buildWithdrawTransaction(publicKey, amountUsdc);
    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }, [service, publicKey, signTransaction, connection]);

  // Auto-refresh on mount
  useEffect(() => {
    if (service) {
      refresh();
      const interval = setInterval(refresh, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [service, refresh]);

  return {
    apy,
    totalSupply,
    utilizationRate,
    loading,
    error,
    deposit,
    withdraw,
    refresh,
  };
}
```

---

## プライベート統合フロー

### Privacy Cash → Kamino Deposit フロー

```
1. User initiates deposit from Privacy Cash balance
   │
2. Privacy Cash SDK withdraws to Shield Pool token account
   │   (Private withdrawal via relayer)
   │
3. Shield Pool calls Kamino via CPI
   │   └── cpi_deposit_reserve_liquidity()
   │
4. User's share in Shield Pool is updated
   │   └── encrypted_share_amount incremented
   │
5. User sees updated balance in UI
```

### Kamino → Privacy Cash Withdraw フロー

```
1. User initiates withdrawal
   │
2. Shield Pool calls Kamino via CPI
   │   └── cpi_redeem_reserve_collateral()
   │
3. USDC returned to Shield Pool token account
   │
4. Privacy Cash SDK deposits to user's private balance
   │   (Private deposit via relayer)
   │
5. User's share in Shield Pool is decremented
```

---

## コンポーネント変更

### YieldCard.tsx の更新

- `useYield` の代わりに `useKamino` から APY を取得
- 実際のKamino SDK経由のデータを表示

### 新規: KaminoDepositForm.tsx

```typescript
// Deposit/Withdraw UI for Kamino operations
// Uses useKamino hook for actual transactions
// Shows current APY, deposited amount, and earned yield
```

---

## API エンドポイント

### 既存の維持

- `/api/privacy-cash/deposit` - Privacy Cash入金
- `/api/privacy-cash/withdraw` - Privacy Cash出金
- `/api/privacy-cash/balance` - 残高取得

### 新規追加（オプション）

- `/api/kamino/stats` - APY・統計情報取得（サーバーサイドキャッシュ用）

---

## セキュリティ考慮事項

1. **Shield Pool経由の操作**
   - 個別ユーザーとKaminoポジションを紐付けない
   - プール単位で資金を管理

2. **暗号化シェア**
   - ユーザーのシェア量は暗号化して保存
   - ユーザーのみが自分のシェアを復号可能

3. **Kamino SDKの使用**
   - 公式SDKを使用することでセキュリティリスクを軽減
   - トランザクション構築を信頼できるライブラリに委譲
