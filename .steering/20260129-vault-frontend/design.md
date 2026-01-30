# 設計書: Vault Frontend Dashboard

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/dashboard-vault                      │
├─────────────────────────────────────────────────────────────┤
│  Pages (App Router)                                          │
│  ├── / (Dashboard - 残高・運用状況)                          │
│  ├── /deposit (入金)                                         │
│  ├── /withdraw (出金)                                        │
│  └── /transfers (定期送金管理)                               │
├─────────────────────────────────────────────────────────────┤
│  Providers                                                   │
│  ├── WalletProvider (Solana Wallet Adapter)                  │
│  └── VaultProvider (SublyVaultClient)                        │
├─────────────────────────────────────────────────────────────┤
│  Hooks                                                       │
│  ├── useVault() - VaultClient操作                            │
│  ├── useBalance() - 残高取得                                 │
│  ├── useYield() - 運用情報取得                               │
│  └── useTransfers() - 定期送金管理                           │
├─────────────────────────────────────────────────────────────┤
│  @subly/vault-sdk                                            │
│  └── SublyVaultClient                                        │
└─────────────────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
apps/dashboard-vault/
├── app/
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ダッシュボード（残高・運用状況）
│   ├── deposit/
│   │   └── page.tsx         # 入金ページ
│   ├── withdraw/
│   │   └── page.tsx         # 出金ページ
│   └── transfers/
│       ├── page.tsx         # 定期送金一覧
│       └── new/
│           └── page.tsx     # 定期送金設定
├── components/
│   ├── Header.tsx           # ヘッダー（ナビ + ウォレット）
│   ├── balance/
│   │   ├── BalanceCard.tsx  # 残高カード
│   │   └── YieldCard.tsx    # 運用状況カード
│   ├── deposit/
│   │   └── DepositForm.tsx  # 入金フォーム
│   ├── withdraw/
│   │   └── WithdrawForm.tsx # 出金フォーム
│   └── transfers/
│       ├── TransferCard.tsx # 定期送金カード
│       └── TransferForm.tsx # 定期送金設定フォーム
├── hooks/
│   ├── useVault.ts          # VaultClient hook
│   ├── useBalance.ts        # 残高取得 hook
│   ├── useYield.ts          # 運用情報 hook
│   └── useTransfers.ts      # 定期送金管理 hook
├── providers/
│   ├── index.tsx            # Provider統合
│   ├── WalletProvider.tsx   # Wallet Adapter
│   └── VaultProvider.tsx    # Vault SDK Provider
├── lib/
│   ├── solana.ts            # RPC設定
│   └── constants.ts         # 定数定義
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## コンポーネント設計

### 1. VaultProvider

```typescript
// providers/VaultProvider.tsx
interface VaultContextType {
  client: SublyVaultClient | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  initialize: (privacyCashPrivateKey: string) => Promise<void>;
}
```

**責務:**
- SublyVaultClient のインスタンス管理
- 初期化状態の管理
- Privacy Cash秘密鍵の受け取りと初期化

**初期化フロー:**
1. ウォレット接続検出
2. ユーザーにPrivacy Cash秘密鍵の入力を促す（モーダル）
3. `client.initialize()` 呼び出し
4. `client.initializeUser()` 呼び出し

### 2. useBalance Hook

```typescript
// hooks/useBalance.ts
interface BalanceState {
  shares: bigint;
  valueUsdc: bigint;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**データ取得:**
- `client.getBalance()` を呼び出し
- 30秒ごとに自動リフレッシュ

### 3. useYield Hook

```typescript
// hooks/useYield.ts
interface YieldState {
  apy: number;           // 現在のAPY（%）
  earnedUsdc: bigint;    // 獲得した運用益
  poolValue: bigint;     // プール全体の価値
  poolShares: bigint;    // プール全体のシェア
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**データ取得:**
- `client.getYieldInfo()` を呼び出し
- `client.getShieldPool()` でプール情報取得

### 4. useTransfers Hook

```typescript
// hooks/useTransfers.ts
interface TransfersState {
  transfers: LocalTransferData[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setupTransfer: (params: SetupRecurringPaymentParams) => Promise<TransactionResult>;
  cancelTransfer: (transferId: PublicKey) => Promise<TransactionResult>;
  executeTransfer: (transferId: string) => Promise<TransactionResult>;
}
```

**データ取得:**
- `client.getAllLocalTransfers()` でローカルストレージから取得

## 画面設計

### ダッシュボード（/）

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Subly Vault              [Wallet: 8xKj...4mNp]      │
│  Dashboard | Deposit | Withdraw | Transfers                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │  Your Balance        │  │  Yield Information   │         │
│  │                      │  │                      │         │
│  │  1,234.56 USDC      │  │  APY: 5.2%           │         │
│  │  (1,200 shares)     │  │  Earned: 12.34 USDC  │         │
│  │                      │  │                      │         │
│  │  [Deposit] [Withdraw]│  │  Pool: 50,000 USDC   │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Active Transfers (3)                    [+ New]     │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ To: 7xAb...9cDe  │ 10 USDC/month │ [Execute]  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ To: 3fGh...2iJk  │ 5 USDC/week  │ [Execute]   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 入金ページ（/deposit）

```
┌─────────────────────────────────────────────────────────────┐
│  Deposit USDC                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your current balance: 1,234.56 USDC                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Amount (USDC)                                        │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │ 100                                          │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │  [25%] [50%] [75%] [Max]                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ⚠️ Privacy Notice:                                         │
│  Your deposit will be processed through Privacy Cash.       │
│  The transaction will be private and untraceable.           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              [Deposit via Privacy Cash]               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 定期送金設定（/transfers/new）

```
┌─────────────────────────────────────────────────────────────┐
│  Set Up Recurring Payment                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Recipient Address                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 7xAbCd...                                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Amount (USDC)                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 10                                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Interval                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ○ Hourly  ○ Daily  ● Weekly  ○ Monthly               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Memo (optional)                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Netflix subscription                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              [Create Recurring Payment]               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 状態管理

### Privacy Cash秘密鍵の取り扱い

**方針:** セキュリティ重視のため、秘密鍵はメモリ上のみで保持

```typescript
// VaultProvider内での管理
const [privacyCashKey, setPrivacyCashKey] = useState<string | null>(null);

// 初期化時にモーダルで入力を促す
// セッション中はメモリに保持
// ページリロードで消去（再入力が必要）
```

**代替案（将来）:**
- ウォレット署名から派生キーを生成
- 暗号化してlocalStorageに保存（ユーザー同意のもと）

### ローカルストレージ

```typescript
// 定期送金の送金先アドレスは暗号化して保存
// vault-sdk の LocalStorageManager を使用
const localStorage = new LocalStorageManager("subly-vault");
```

## エラーハンドリング

### エラー種別と表示

| エラー種別 | 表示方法 | メッセージ例 |
|-----------|---------|-------------|
| ウォレット未接続 | 全画面 | "Please connect your wallet to continue" |
| SDK未初期化 | モーダル | "Enter your Privacy Cash private key" |
| トランザクション失敗 | トースト | "Transaction failed: Insufficient balance" |
| ネットワークエラー | トースト | "Network error. Please try again." |
| Privacy Cash エラー | トースト | "Privacy Cash error: [details]" |

### ローディング状態

```typescript
interface LoadingState {
  isConnecting: boolean;      // ウォレット接続中
  isInitializing: boolean;    // SDK初期化中
  isDepositing: boolean;      // 入金処理中
  isWithdrawing: boolean;     // 出金処理中
  isSettingUpTransfer: boolean; // 定期送金設定中
}
```

## 依存関係

### package.json

```json
{
  "name": "@subly/dashboard-vault",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@solana/web3.js": "^1.98.0",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@subly/vault-sdk": "workspace:*",
    "@coral-xyz/anchor": "^0.30.0",
    "tailwindcss": "^4.0.0"
  }
}
```

## テスト戦略

### 制約
- Privacy Cash: Mainnet専用（Devnetテスト不可）
- Kamino: Mainnet専用

### テスト方法
1. **UIコンポーネントテスト**: Jest + React Testing Library
2. **Hook テスト**: モック化したvault-sdkでテスト
3. **E2Eテスト**: Mainnet-forkでのテスト（将来）

### モック戦略

```typescript
// テスト用モッククライアント
const mockVaultClient = {
  getBalance: async () => ({ shares: 1000n, valueUsdc: 1000000n }),
  getYieldInfo: async () => ({ apy: 5.0, earnedUsdc: 10000n }),
  deposit: async () => ({ signature: "mock_sig", success: true }),
  // ...
};
```

## 実装順序

1. **基盤構築** - プロジェクト作成、Provider、基本レイアウト
2. **ダッシュボード** - 残高・運用状況表示
3. **入金機能** - Privacy Cash経由の入金
4. **出金機能** - Privacy Cash経由の出金
5. **定期送金** - 設定・一覧・管理

## 参考資料

- [dashboard-user実装](../../apps/dashboard-user)
- [vault-sdk client.ts](../../subly-mainnet/packages/vault-sdk/src/client.ts)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
