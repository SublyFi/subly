# 設計書

## アーキテクチャ概要

Protocol A（subly-membership）は、Arcium MPC Frameworkを使用したプライバシー保護付きサブスクリプション管理システム。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Layer                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  dashboard-business (Next.js)  │  dashboard-user (Next.js)              │
│  - プラン管理                   │  - サブスクリプション管理               │
│  - 契約数確認                   │  - プラン検索・契約                     │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    @subly/membership-sdk                                 │
│  - SublyMembershipClient                                                 │
│  - 暗号化ヘルパー                                                        │
│  - トランザクションビルダー                                              │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              subly-membership Program (Solana Devnet)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Instructions                     │  PDA Accounts                        │
│  - initialize_mxe                 │  - BusinessAccount                   │
│  - register_business              │  - Plan                              │
│  - create_plan                    │  - Subscription                      │
│  - subscribe                      │  - MxeAccount                        │
│  - get_subscription_count         │                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                        Arcium MPC Layer                                  │
│  - queue_computation()                                                   │
│  - arcium_callback                                                       │
│  - 暗号化データ処理                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. Arciumプログラム（subly_devnet/programs/subly_devnet/）

**責務**:
- サブスクリプションプランのオンチェーン管理
- 暗号化された契約データの保存
- Arcium MPCとの連携による秘匿計算

**実装の要点**:
- Arcis固有の制約（動的構文禁止）に従う
- アカウント変数名は`_account`サフィックス必須
- `queue_computation`でMXEに計算をキュー
- `#[arcium_callback]`で結果を受け取り

**ディレクトリ構造**:
```
subly_devnet/programs/subly_devnet/src/
├── lib.rs                      # プログラムエントリーポイント
├── instructions/               # 命令ハンドラ
│   ├── mod.rs
│   ├── initialize_mxe.rs
│   ├── register_business.rs
│   ├── create_plan.rs
│   └── subscribe.rs
├── state/                      # PDAアカウント定義
│   ├── mod.rs
│   ├── business.rs
│   ├── plan.rs
│   └── subscription.rs
├── mxe/                        # Arcium MXE関連
│   ├── mod.rs
│   └── computations.rs
├── errors.rs                   # カスタムエラー
├── events.rs                   # イベント定義
└── constants.rs                # 定数
```

### 2. TypeScript SDK（packages/membership-sdk/）

**責務**:
- プログラムとの対話をカプセル化
- トランザクション構築
- クライアント側暗号化処理

**実装の要点**:
- `@solana/web3.js`（レガシー版）を使用（Arcium互換性）
- `@coral-xyz/anchor`でIDLからクライアント生成
- Arciumの暗号化ヘルパーを提供

**ディレクトリ構造**:
```
packages/membership-sdk/
├── src/
│   ├── index.ts                # エントリーポイント
│   ├── client.ts               # SublyMembershipClient クラス
│   ├── instructions/           # 命令ビルダー
│   │   ├── index.ts
│   │   ├── registerBusiness.ts
│   │   ├── createPlan.ts
│   │   └── subscribe.ts
│   ├── accounts/               # アカウントデコーダー
│   │   ├── index.ts
│   │   ├── business.ts
│   │   ├── plan.ts
│   │   └── subscription.ts
│   ├── types/                  # 型定義
│   │   ├── index.ts
│   │   ├── plan.ts
│   │   └── subscription.ts
│   └── utils/                  # ユーティリティ
│       ├── index.ts
│       ├── pda.ts
│       └── encryption.ts
├── tests/
│   └── client.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**API設計**:
```typescript
import { SublyMembershipClient } from '@subly/membership-sdk';

// クライアント初期化
const client = new SublyMembershipClient(connection, wallet);

// 事業者登録
const business = await client.registerBusiness({
  name: 'My Company',
  metadataUri: 'https://example.com/metadata.json',
});

// プラン作成
const plan = await client.createPlan({
  name: 'Premium',
  description: 'Premium membership',
  priceUsdc: 10_000_000, // 10 USDC (6 decimals)
  billingCycleSeconds: 2592000, // 30 days
});

// プラン一覧取得
const plans = await client.getPlans();

// サブスクリプション契約
const subscription = await client.subscribe(planId);

// 契約数取得
const count = await client.getSubscriptionCount(planId);
```

### 3. 事業者ダッシュボード（apps/dashboard-business/）

**責務**:
- 事業者のプラン管理UI
- 契約状況の可視化

**実装の要点**:
- Next.js 15 App Router
- TailwindCSS + shadcn/ui
- @solana/wallet-adapter でウォレット接続

**ページ構成**:
```
apps/dashboard-business/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホーム（ダッシュボード）
│   │   ├── plans/
│   │   │   ├── page.tsx        # プラン一覧
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # プラン作成
│   │   │   └── [planId]/
│   │   │       └── page.tsx    # プラン詳細
│   │   └── settings/
│   │       └── page.tsx        # 設定
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── plans/
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PlanForm.tsx
│   │   │   └── PlanList.tsx
│   │   ├── ui/                 # shadcn/ui コンポーネント
│   │   └── wallet/
│   │       └── WalletButton.tsx
│   ├── hooks/
│   │   ├── usePlans.ts
│   │   ├── useSubscriptionCount.ts
│   │   └── useSublyMembership.ts
│   ├── lib/
│   │   ├── membership.ts       # SDK初期化
│   │   └── solana.ts           # Solana設定
│   └── providers/
│       ├── WalletProvider.tsx
│       └── MembershipProvider.tsx
```

### 4. ユーザーダッシュボード（apps/dashboard-user/）

**責務**:
- ユーザーのサブスクリプション管理UI
- プラン検索・契約UI

**実装の要点**:
- 事業者ダッシュボードと同様の技術スタック
- ユーザー視点のUI/UX

**ページ構成**:
```
apps/dashboard-user/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # ホーム（契約一覧）
│   │   └── subscriptions/
│   │       ├── page.tsx        # 契約一覧
│   │       └── browse/
│   │           └── page.tsx    # プラン検索・契約
│   ├── components/
│   │   ├── layout/
│   │   ├── subscriptions/
│   │   │   ├── SubscriptionCard.tsx
│   │   │   ├── SubscriptionList.tsx
│   │   │   └── PlanBrowser.tsx
│   │   ├── ui/
│   │   └── wallet/
│   ├── hooks/
│   │   ├── useSubscriptions.ts
│   │   └── useSublyMembership.ts
│   ├── lib/
│   └── providers/
```

## データフロー

### プラン作成フロー
```
1. 事業者がダッシュボードでプラン情報を入力
2. SDKがデータを暗号化（Arcium公開鍵 + nonce）
3. SDK経由でcreate_plan命令を実行
4. プログラムがqueue_computationでArcium MPCにキュー
5. MXEクラスターが暗号化データを処理
6. arcium_callbackで結果を受け取り
7. Plan PDAにデータを保存
```

### サブスクリプション契約フロー
```
1. ユーザーがダッシュボードでプランを選択
2. SDKがuser_commitmentを生成: hash(secret || plan_id)
3. SDKが暗号化データを作成
4. subscribe命令を実行
5. プログラムがqueue_computationで契約処理
6. MXEが契約数をインクリメント（暗号化状態のまま）
7. arcium_callbackでSubscription PDAを作成
8. ユーザーにsubscription_idを返却
```

## エラーハンドリング戦略

### カスタムエラークラス（Rust）

```rust
#[error_code]
pub enum SublyError {
    #[msg("Business account already exists")]
    BusinessAlreadyExists,

    #[msg("Plan not found")]
    PlanNotFound,

    #[msg("Plan is not active")]
    PlanNotActive,

    #[msg("Subscription already exists")]
    SubscriptionAlreadyExists,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("MXE computation failed")]
    MxeComputationFailed,

    #[msg("Invalid computation output")]
    InvalidComputationOutput,
}
```

### カスタムエラークラス（TypeScript）

```typescript
export class SublyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SublyError';
  }
}

export class PlanNotFoundError extends SublyError {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`, 'PLAN_NOT_FOUND');
  }
}

export class TransactionError extends SublyError {
  constructor(message: string, public signature?: string) {
    super(message, 'TRANSACTION_FAILED');
  }
}
```

## テスト戦略

### ユニットテスト
- PDA導出ロジック
- 暗号化ヘルパー関数
- アカウントデコーダー

### 統合テスト（Devnet）
- `arcium test` でプログラム全体のテスト
- SDK経由での全フローテスト
- ダッシュボードE2Eテスト（後回し可）

## 依存ライブラリ

### Rust（subly_devnet/Cargo.toml）
```toml
[dependencies]
anchor-lang = "0.30.1"
arcium-anchor = "0.1"
arcium-client = "0.1"
arcium-macros = "0.1"
```

### TypeScript（packages/membership-sdk/package.json）
```json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.30.0",
    "@solana/web3.js": "^1.95.0",
    "tweetnacl": "^1.0.3"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

### フロントエンド（apps/*/package.json）
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@solana/wallet-adapter-react": "^0.15.0",
    "@solana/wallet-adapter-wallets": "^0.19.0",
    "tailwindcss": "^4.0.0"
  }
}
```

## 実装の順序

1. **フェーズ1: Arciumプログラム基盤**
   - アカウント構造体定義
   - initialize_mxe命令
   - register_business命令
   - create_plan命令

2. **フェーズ2: サブスクリプション機能**
   - subscribe命令
   - get_subscription_count命令
   - Devnetデプロイ・テスト

3. **フェーズ3: SDK実装**
   - SublyMembershipClientクラス
   - 各命令のビルダー
   - 暗号化ヘルパー

4. **フェーズ4: ダッシュボード実装**
   - 共通コンポーネント（ウォレット接続等）
   - 事業者ダッシュボード
   - ユーザーダッシュボード

5. **フェーズ5: 品質チェック**
   - 全テスト実行
   - リント・型チェック
   - ドキュメント更新

## セキュリティ考慮事項

- **秘密情報の取り扱い**: ユーザーのsecretはクライアント側のみで保持、オンチェーンにはcommitmentのみ保存
- **Arcium暗号化**: X25519公開鍵 + nonceで暗号化、MXEクラスターのみが復号可能
- **アクセス制御**: 事業者は自分のプランのみ操作可能、ユーザーは自分の契約のみ確認可能

## パフォーマンス考慮事項

- **MXE計算レイテンシ**: 5-15秒を想定、UIでローディング表示
- **アカウントサイズ**: Plan 214バイト、Subscription 170バイト（Solana制限内）
- **CU使用量**: queue_computation呼び出しは高CU消費、必要最小限に

## 将来の拡張性

- **Light Protocol統合**: ZK証明による会員検証（次フェーズ）
- **解約機能**: unsubscribe命令、契約数デクリメント（次フェーズ）
- **制裁チェック**: Range Risk API連携（次フェーズ）
