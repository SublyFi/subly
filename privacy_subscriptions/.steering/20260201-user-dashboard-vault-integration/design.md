# 設計書

## アーキテクチャ概要

Next.js 14 App Router を採用し、React Server Components と Client Components を適切に使い分けます。ウォレット接続と暗号化処理はクライアントサイドで実行し、静的なレイアウトはサーバーサイドでレンダリングします。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         User Dashboard Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           Next.js App (app/)                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      App Router (src/app/)                       │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │  │  │
│  │  │  │  /          │  │  /wallet    │  │  /subscriptions         │  │  │  │
│  │  │  │  (Landing)  │  │  (Deposit/  │  │  (List/Manage)          │  │  │  │
│  │  │  │             │  │   Withdraw) │  │                         │  │  │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      Client Components                           │  │  │
│  │  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │  │  │
│  │  │  │ WalletButton  │  │ DepositForm   │  │ SubscriptionCard  │   │  │  │
│  │  │  │ BalanceCard   │  │ WithdrawForm  │  │ UnsubscribeButton │   │  │  │
│  │  │  └───────────────┘  └───────────────┘  └───────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                         Hooks Layer                              │  │  │
│  │  │  useWallet | useBalance | useSubscriptions | useDeposit | ...   │  │  │
│  │  └──────────────────────────────┬──────────────────────────────────┘  │  │
│  └─────────────────────────────────┼──────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐  │
│  │                         SDK/Lib Layer (src/lib/)                        │  │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │  │
│  │  │ - subly.ts (SDK client wrapper)                                    │ │  │
│  │  │ - solana.ts (Connection, RPC)                                      │ │  │
│  │  │ - encryption.ts (Arcium encrypt/decrypt)                           │ │  │
│  │  └───────────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────┬──────────────────────────────────────┘  │
│                                    │                                         │
│                          ┌─────────▼─────────┐                              │
│                          │  Solana Devnet    │                              │
│                          │  + Arcium MPC     │                              │
│                          └───────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. レイアウトコンポーネント

#### RootLayout (src/app/layout.tsx)

**責務**:
- 共通のメタデータ設定
- Wallet Provider のラップ
- グローバルスタイル適用

**実装の要点**:
- `WalletConnectionProvider` で全ページをラップ
- Tailwind CSS の設定読み込み

#### Header (src/components/layout/Header.tsx)

**責務**:
- ロゴ・ナビゲーション表示
- ウォレット接続ボタン

#### Sidebar (src/components/layout/Sidebar.tsx)

**責務**:
- ダッシュボードナビゲーション
- 現在のページハイライト

### 2. ページコンポーネント

#### / (Landing Page)

**責務**:
- サービス紹介
- ウォレット接続への誘導

#### /wallet (Wallet Page)

**責務**:
- 残高表示
- Deposit/Withdraw フォーム

#### /subscriptions (Subscriptions Page)

**責務**:
- サブスクリプション一覧
- 各サブスクの詳細・解約

### 3. 機能コンポーネント

#### WalletButton (src/components/common/WalletButton.tsx)

**責務**:
- ウォレット接続/切断
- 接続状態表示

**実装の要点**:
- `@solana/wallet-adapter-react` の `useWallet` フック使用
- 接続中は短縮アドレス表示

#### BalanceCard (src/components/user/BalanceCard.tsx)

**責務**:
- 暗号化残高の復号表示
- リフレッシュボタン

**実装の要点**:
- Arcium client で残高を復号
- 本人のみ閲覧可能（他者には `****` 表示）

#### DepositForm (src/components/user/DepositForm.tsx)

**責務**:
- デポジット金額入力
- トランザクション送信
- 状態表示（loading/success/error）

**実装の要点**:
- 金額バリデーション（正数、ウォレット残高以下）
- トランザクション送信後のポーリング

#### WithdrawForm (src/components/user/WithdrawForm.tsx)

**責務**:
- 引き出し金額入力
- 残高チェック
- トランザクション送信

**実装の要点**:
- 帳簿残高以下の金額のみ許可
- エラーハンドリング

#### SubscriptionCard (src/components/user/SubscriptionCard.tsx)

**責務**:
- 単一サブスクリプションの表示
- ステータス、次回支払日表示
- 解約ボタン

#### SubscriptionList (src/components/user/SubscriptionList.tsx)

**責務**:
- サブスクリプション一覧表示
- 空状態の表示

## データフロー

### Deposit フロー

```
1. ユーザーが金額を入力
2. DepositForm が useDeposit フックを呼び出し
3. useDeposit:
   a. 金額を暗号化（Arcium）
   b. deposit トランザクション構築
   c. ウォレットで署名・送信
4. Arcium MPC で帳簿更新
5. コールバック完了後、useBalance が残高を再取得
6. BalanceCard に新残高が表示
```

### Withdraw フロー

```
1. ユーザーが金額を入力
2. WithdrawForm が useWithdraw フックを呼び出し
3. useWithdraw:
   a. 金額を暗号化
   b. withdraw トランザクション構築
   c. ウォレットで署名・送信
4. Arcium MPC で残高検証・減算
5. コールバック完了後、Pool からユーザーウォレットへ送金
6. useBalance が残高を再取得
```

### Unsubscribe フロー

```
1. ユーザーが Unsubscribe ボタンをクリック
2. 確認ダイアログ表示
3. SubscriptionCard が useUnsubscribe フックを呼び出し
4. useUnsubscribe:
   a. unsubscribe トランザクション構築
   b. ウォレットで署名・送信
5. Arcium MPC で UserSubscription を Cancelled に更新
6. useSubscriptions が一覧を再取得
```

## エラーハンドリング戦略

### エラー種別

| エラー種別 | 対応 |
|-----------|------|
| ウォレット未接続 | 接続を促すメッセージ表示 |
| 残高不足 | 赤字でエラーメッセージ表示、送信ボタン無効化 |
| トランザクション失敗 | エラーメッセージ表示、リトライボタン |
| ネットワークエラー | 接続エラーメッセージ、自動リトライ |
| Arcium MPC エラー | ユーザーフレンドリーなメッセージ表示 |

### エラーハンドリングパターン

```typescript
// hooks/useDeposit.ts
const useDeposit = () => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const deposit = async (amount: number) => {
    try {
      setState('loading');
      setError(null);
      // ... トランザクション処理
      setState('success');
    } catch (e) {
      setState('error');
      if (e instanceof InsufficientBalanceError) {
        setError('Insufficient balance');
      } else if (e instanceof WalletNotConnectedError) {
        setError('Please connect your wallet');
      } else {
        setError('Transaction failed. Please try again.');
      }
    }
  };

  return { deposit, state, error };
};
```

## テスト戦略

### コンポーネントテスト

- BalanceCard: 残高表示、ローディング状態
- DepositForm: バリデーション、送信状態
- WithdrawForm: バリデーション、残高チェック
- SubscriptionCard: ステータス表示、解約ボタン

### E2E テスト（将来）

- ウォレット接続 → Deposit → 残高確認
- Deposit → Subscribe → Unsubscribe
- Withdraw フロー全体

## 依存ライブラリ

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@solana/web3.js": "^1.95.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@coral-xyz/anchor": "^0.30.1",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

## ディレクトリ構造

```
app/
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── public/
│   └── images/
└── src/
    ├── app/
    │   ├── layout.tsx              # ルートレイアウト
    │   ├── page.tsx                # ランディングページ
    │   ├── globals.css             # グローバルスタイル
    │   │
    │   ├── wallet/
    │   │   └── page.tsx            # Deposit/Withdraw ページ
    │   │
    │   └── subscriptions/
    │       └── page.tsx            # サブスクリプション一覧
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── Footer.tsx
    │   │
    │   ├── user/
    │   │   ├── BalanceCard.tsx
    │   │   ├── DepositForm.tsx
    │   │   ├── WithdrawForm.tsx
    │   │   ├── SubscriptionCard.tsx
    │   │   └── SubscriptionList.tsx
    │   │
    │   ├── common/
    │   │   ├── WalletButton.tsx
    │   │   ├── TransactionStatus.tsx
    │   │   └── LoadingSpinner.tsx
    │   │
    │   └── providers/
    │       └── WalletConnectionProvider.tsx
    │
    ├── hooks/
    │   ├── useBalance.ts
    │   ├── useDeposit.ts
    │   ├── useWithdraw.ts
    │   └── useSubscriptions.ts
    │
    ├── lib/
    │   ├── solana.ts              # Connection 設定
    │   ├── constants.ts           # プログラムID、RPC URL
    │   └── format.ts              # フォーマットユーティリティ
    │
    └── types/
        └── index.ts               # 型定義
```

## 実装の順序

### フェーズ1: プロジェクトセットアップ
1. Next.js プロジェクト初期化
2. Tailwind CSS 設定
3. TypeScript 設定
4. 依存ライブラリインストール

### フェーズ2: ウォレット接続
1. WalletConnectionProvider 実装
2. WalletButton 実装
3. 接続状態管理

### フェーズ3: レイアウト・ページ
1. Header/Sidebar 実装
2. ランディングページ
3. /wallet ページ
4. /subscriptions ページ

### フェーズ4: Deposit/Withdraw 機能
1. useBalance フック
2. BalanceCard 実装
3. useDeposit フック
4. DepositForm 実装
5. useWithdraw フック
6. WithdrawForm 実装

### フェーズ5: サブスクリプション機能
1. useSubscriptions フック
2. SubscriptionCard 実装
3. SubscriptionList 実装
4. Unsubscribe 機能

### フェーズ6: 品質チェック
1. TypeScript 型チェック
2. ESLint
3. ビルド確認

## セキュリティ考慮事項

- **秘密鍵の扱い**: ウォレットアダプター経由で署名。アプリは秘密鍵にアクセスしない
- **XSS 対策**: React の自動エスケープ、dangerouslySetInnerHTML 不使用
- **入力バリデーション**: クライアントサイドとオンチェーン両方でバリデーション
- **HTTPS 強制**: 本番環境では HTTPS のみ許可

## パフォーマンス考慮事項

- **コード分割**: Next.js の自動コード分割
- **Server Components**: 静的部分は Server Component で SSR
- **クライアント状態**: 必要最小限の Client Component 使用
- **RPC 最適化**: バッチリクエスト、キャッシュ活用

## 将来の拡張性

- **複数トークン対応**: トークンセレクターコンポーネント追加
- **Merchant Dashboard**: 同一コードベースで `/merchant` ルート追加
- **多言語対応**: next-intl 導入可能な構造
- **テーマ切り替え**: CSS 変数によるダークモード対応準備

---

## オンチェーン連携設計（モック実装からの移行）

### アーキテクチャ概要（オンチェーン連携版）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    User Dashboard Architecture (On-chain)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           Next.js App (app/)                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                         Hooks Layer                              │  │  │
│  │  │  useBalance | useDeposit | useWithdraw | useSubscriptions | ...  │  │  │
│  │  └──────────────────────────────┬──────────────────────────────────┘  │  │
│  └─────────────────────────────────┼──────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐  │
│  │                    SDK/Lib Layer (src/lib/) - NEW                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │  │ arcium.ts     - Arcium暗号化/復号ユーティリティ                     │   │  │
│  │  │ anchor.ts     - Anchorプログラムクライアント                        │   │  │
│  │  │ pda.ts        - PDA導出ユーティリティ                              │   │  │
│  │  │ transactions.ts - トランザクション構築ヘルパー                      │   │  │
│  │  │ solana.ts     - Connection, RPC (既存)                            │   │  │
│  │  │ constants.ts  - プログラムID、シード定数 (既存)                     │   │  │
│  │  └─────────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                          ┌─────────▼─────────┐                              │
│                          │  Solana Devnet    │                              │
│                          │  ┌─────────────┐  │                              │
│                          │  │   Subly     │  │                              │
│                          │  │  Program    │  │                              │
│                          │  └──────┬──────┘  │                              │
│                          │         │         │                              │
│                          │  ┌──────▼──────┐  │                              │
│                          │  │  Arcium MPC │  │                              │
│                          │  │  Network    │  │                              │
│                          │  └─────────────┘  │                              │
│                          └───────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 新規ユーティリティモジュール設計

#### 1. arcium.ts - Arcium 暗号化/復号ユーティリティ

```typescript
// src/lib/arcium.ts

import {
  getMXEPublicKey,
  getMXEAccAddress,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import { Connection, PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";

export interface ArciumContext {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  sharedSecret: Uint8Array;
  cipher: RescueCipher;
}

/**
 * MXE公開鍵を取得（リトライ付き）
 */
export async function getMXEPublicKeyWithRetry(
  connection: Connection,
  programId: PublicKey,
  maxRetries: number = 10
): Promise<Uint8Array> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const mxePubkey = await getMXEPublicKey({ connection }, programId);
      if (mxePubkey) return mxePubkey;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Failed to fetch MXE public key");
}

/**
 * Arcium暗号化コンテキストを作成
 */
export async function createArciumContext(
  connection: Connection,
  programId: PublicKey
): Promise<ArciumContext> {
  const mxePubkey = await getMXEPublicKeyWithRetry(connection, programId);

  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePubkey);
  const cipher = new RescueCipher(sharedSecret);

  return { privateKey, publicKey, sharedSecret, cipher };
}

/**
 * 金額を暗号化
 */
export function encryptAmount(
  cipher: RescueCipher,
  amount: bigint
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const nonce = randomBytes(16);
  const [ciphertext] = cipher.encrypt([amount], nonce);
  return { ciphertext: new Uint8Array(ciphertext), nonce };
}

/**
 * 暗号化残高を復号
 */
export function decryptBalance(
  cipher: RescueCipher,
  encryptedBalance: Uint8Array,
  nonce: Uint8Array
): bigint {
  const [decrypted] = cipher.decrypt([Array.from(encryptedBalance)], nonce);
  return decrypted;
}
```

#### 2. pda.ts - PDA 導出ユーティリティ

```typescript
// src/lib/pda.ts

import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";

// PDA Seeds (オンチェーンプログラムと一致させる)
const SEEDS = {
  PROTOCOL_CONFIG: Buffer.from("protocol_config"),
  PROTOCOL_POOL: Buffer.from("protocol_pool"),
  MERCHANT: Buffer.from("merchant"),
  MERCHANT_LEDGER: Buffer.from("merchant_ledger"),
  SUBSCRIPTION_PLAN: Buffer.from("subscription_plan"),
  USER_LEDGER: Buffer.from("user_ledger"),
  USER_SUBSCRIPTION: Buffer.from("user_subscription"),
} as const;

/**
 * UserLedger PDA を導出
 */
export function getUserLedgerPDA(
  user: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.USER_LEDGER, user.toBuffer(), mint.toBuffer()],
    programId
  );
}

/**
 * UserSubscription PDA を導出
 */
export function getUserSubscriptionPDA(
  user: PublicKey,
  subscriptionIndex: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(subscriptionIndex);

  return PublicKey.findProgramAddressSync(
    [SEEDS.USER_SUBSCRIPTION, user.toBuffer(), indexBuffer],
    programId
  );
}

/**
 * ProtocolPool PDA を導出
 */
export function getProtocolPoolPDA(
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.PROTOCOL_POOL, mint.toBuffer()],
    programId
  );
}

/**
 * SubscriptionPlan PDA を導出
 */
export function getSubscriptionPlanPDA(
  merchant: PublicKey,
  planId: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const planIdBuffer = Buffer.alloc(8);
  planIdBuffer.writeBigUInt64LE(planId);

  return PublicKey.findProgramAddressSync(
    [SEEDS.SUBSCRIPTION_PLAN, merchant.toBuffer(), planIdBuffer],
    programId
  );
}
```

#### 3. anchor.ts - Anchor プログラムクライアント

```typescript
// src/lib/anchor.ts

import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "./constants";

// IDL は anchor build 後に target/idl/ から取得
import idl from "../idl/privacy_subscriptions.json";

export type PrivacySubscriptionsProgram = Program<typeof idl>;

/**
 * Anchor Provider を作成（ウォレット接続用）
 */
export function createAnchorProvider(
  connection: Connection,
  wallet: WalletContextState
): AnchorProvider {
  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey!,
      signTransaction: wallet.signTransaction!,
      signAllTransactions: wallet.signAllTransactions!,
    },
    { commitment: "confirmed" }
  );
}

/**
 * Subly プログラムクライアントを取得
 */
export function getProgram(
  provider: AnchorProvider
): PrivacySubscriptionsProgram {
  return new Program(idl as Idl, provider) as PrivacySubscriptionsProgram;
}
```

#### 4. transactions.ts - トランザクション構築ヘルパー

```typescript
// src/lib/transactions.ts

import {
  getCompDefAccAddress,
  getComputationAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getClusterAccAddress,
  getArciumEnv,
  awaitComputationFinalization,
  deserializeLE,
} from "@arcium-hq/client";
import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { randomBytes } from "crypto";
import { ArciumContext } from "./arcium";
import { getUserLedgerPDA, getProtocolPoolPDA } from "./pda";

/**
 * Deposit トランザクションを構築・送信
 */
export async function executeDeposit(
  program: Program,
  userPubkey: PublicKey,
  mint: PublicKey,
  amount: bigint,
  arciumContext: ArciumContext,
  userTokenAccount: PublicKey,
  poolTokenAccount: PublicKey
): Promise<string> {
  const arciumEnv = getArciumEnv();
  const computationOffset = new BN(randomBytes(8), "hex");

  // 金額を暗号化
  const nonce = randomBytes(16);
  const [encryptedAmount] = arciumContext.cipher.encrypt([amount], nonce);

  const [userLedgerPDA] = getUserLedgerPDA(userPubkey, mint);
  const [protocolPoolPDA] = getProtocolPoolPDA(mint);

  // Arcium 関連アカウント
  const mxeAccount = getMXEAccAddress(program.programId);
  const mempoolAccount = getMempoolAccAddress(arciumEnv.arciumClusterOffset);
  const executingPool = getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset);
  const computationAccount = getComputationAccAddress(
    arciumEnv.arciumClusterOffset,
    computationOffset
  );
  const compDefAccount = getCompDefAccAddress(
    program.programId,
    Buffer.from("deposit").readUInt32LE(0) // comp_def_offset
  );
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  const signature = await program.methods
    .deposit(
      computationOffset,
      new BN(amount.toString()),
      Array.from(encryptedAmount),
      Array.from(arciumContext.publicKey),
      new BN(deserializeLE(nonce).toString())
    )
    .accounts({
      user: userPubkey,
      mint,
      protocolPool: protocolPoolPDA,
      poolTokenAccount,
      userTokenAccount,
      userLedger: userLedgerPDA,
      mxeAccount,
      mempoolAccount,
      executingPool,
      computationAccount,
      compDefAccount,
      clusterAccount,
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  // Arcium MPC 計算完了を待機
  await awaitComputationFinalization(
    { connection: program.provider.connection } as any,
    computationOffset,
    program.programId,
    "confirmed"
  );

  return signature;
}

/**
 * Withdraw トランザクションを構築・送信
 */
export async function executeWithdraw(
  program: Program,
  userPubkey: PublicKey,
  mint: PublicKey,
  amount: bigint,
  arciumContext: ArciumContext,
  userTokenAccount: PublicKey,
  poolTokenAccount: PublicKey
): Promise<string> {
  // Deposit と同様のパターンで実装
  // ...
}

/**
 * Unsubscribe トランザクションを構築・送信
 */
export async function executeUnsubscribe(
  program: Program,
  userPubkey: PublicKey,
  subscriptionIndex: bigint,
  arciumContext: ArciumContext
): Promise<string> {
  // ...
}
```

### データフロー（オンチェーン連携版）

#### Deposit フロー（詳細）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Deposit Flow (On-chain)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User Input                                                               │
│     └─> DepositForm: amount = 1.5 SOL                                       │
│                                                                              │
│  2. Create Arcium Context                                                    │
│     └─> createArciumContext()                                               │
│         ├─> getMXEPublicKey() → MXE X25519 公開鍵                           │
│         ├─> x25519.randomSecretKey() → ユーザー秘密鍵                        │
│         ├─> x25519.getPublicKey() → ユーザー公開鍵                          │
│         ├─> x25519.getSharedSecret() → 共有シークレット                      │
│         └─> new RescueCipher() → 暗号化インスタンス                          │
│                                                                              │
│  3. Encrypt Amount                                                           │
│     └─> cipher.encrypt([1_500_000_000n], nonce)                             │
│         └─> encrypted_amount: [u8; 32]                                      │
│                                                                              │
│  4. Build & Send Transaction                                                 │
│     └─> program.methods.deposit(...)                                        │
│         ├─> computation_offset: random u64                                  │
│         ├─> amount: 1_500_000_000 (lamports)                                │
│         ├─> encrypted_amount: [u8; 32]                                      │
│         ├─> pubkey: [u8; 32] (ユーザー X25519 公開鍵)                        │
│         └─> nonce: u128                                                     │
│                                                                              │
│  5. On-chain Execution                                                       │
│     └─> Subly Program                                                       │
│         ├─> SPL Token Transfer: User → Pool                                 │
│         └─> queue_computation() → Arcium MPC                                │
│                                                                              │
│  6. Arcium MPC Computation                                                   │
│     └─> deposit.arcis circuit                                               │
│         ├─> encrypted_balance += encrypted_amount                           │
│         └─> new_encrypted_balance                                           │
│                                                                              │
│  7. Callback Execution                                                       │
│     └─> deposit_callback()                                                  │
│         └─> UserLedger.encrypted_balance = new_encrypted_balance            │
│                                                                              │
│  8. Client Finalization                                                      │
│     └─> awaitComputationFinalization()                                      │
│         └─> トランザクション完了                                              │
│                                                                              │
│  9. Refresh Balance                                                          │
│     └─> useBalance.refresh()                                                │
│         └─> fetchUserLedger() → 新残高表示                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 残高復号フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Balance Decryption Flow                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Fetch UserLedger Account                                                 │
│     └─> connection.getAccountInfo(userLedgerPDA)                            │
│         └─> UserLedger { encrypted_balance: [[u8; 32]; 2], nonce: u128 }    │
│                                                                              │
│  2. Create Arcium Context (with stored keys or re-derive)                    │
│     └─> 注: 復号には同じ共有シークレットが必要                                │
│         └─> 方法1: セッション中はコンテキストを保持                          │
│         └─> 方法2: ウォレット署名でシードを導出                              │
│                                                                              │
│  3. Decrypt Balance                                                          │
│     └─> cipher.decrypt([encrypted_balance[0]], nonce)                       │
│         └─> balance: bigint (lamports)                                      │
│                                                                              │
│  4. Display                                                                  │
│     └─> lamportsToSol(balance) → "2.5 SOL"                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### アカウント構造（オンチェーン）

```typescript
// UserLedger アカウント構造（オンチェーンと対応）
interface UserLedger {
  user: PublicKey;           // 32 bytes
  mint: PublicKey;           // 32 bytes
  encryptedBalance: number[][]; // [[u8; 32]; 2] = 64 bytes
  nonce: bigint;             // u128 = 16 bytes
  lastUpdated: bigint;       // i64 = 8 bytes
  bump: number;              // u8 = 1 byte
}

// UserSubscription アカウント構造
interface UserSubscription {
  user: PublicKey;                    // 32 bytes
  subscriptionIndex: bigint;          // u64 = 8 bytes
  plan: PublicKey;                    // 32 bytes
  encryptedStatus: number[];          // [u8; 32]
  encryptedNextPaymentDate: number[]; // [u8; 32]
  nonce: bigint;                      // u128 = 16 bytes
  bump: number;                       // u8 = 1 byte
}
```

### 状態管理の考慮事項

1. **Arcium コンテキストの保持**
   - セッション中は暗号化コンテキストを React Context で保持
   - ページリロード時は再生成が必要

2. **トランザクション状態の追跡**
   - `awaitComputationFinalization` は数秒〜数十秒かかる
   - ユーザーにローディング状態を明確に表示
   - タイムアウト処理の実装

3. **エラーハンドリング**
   - MPC 計算の失敗（AbortedComputation）
   - 残高不足（InsufficientBalance）
   - ネットワークエラー
   - ウォレット拒否

### セキュリティ考慮事項（オンチェーン連携）

1. **秘密鍵の扱い**
   - X25519 秘密鍵はメモリ内のみ、永続化しない
   - ウォレット秘密鍵には一切アクセスしない

2. **ノンスの一意性**
   - `randomBytes(16)` で毎回新しいノンスを生成
   - ノンスの再利用は暗号強度を低下させる

3. **トランザクション検証**
   - シミュレーション結果の確認
   - 署名前にトランザクション内容を表示
