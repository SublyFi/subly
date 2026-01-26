# リポジトリ構造定義書 (Repository Structure Document)

## 概要

本ドキュメントは、Sublyプロジェクトのリポジトリ構造を定義する。Sublyは複数のコンポーネント（Solana Programs、SDK、ダッシュボード）で構成されるため、**pnpm workspaces + Turborepo**によるモノレポ構成を採用する。

### DevnetとMainnetの分離

SublyはDevnet（Arcium MPC）とMainnet（Anchor）で異なる技術スタックを使用するため、プログラムとSDKを環境ごとに分離する。

| 環境 | 用途 | 初期化コマンド | 技術スタック |
|------|------|---------------|-------------|
| Devnet | Protocol A: 会員管理 | `arcium init` | Arcium MPC、Light Protocol |
| Mainnet | Protocol B: Vault | `anchor init` | Anchor Framework、Privacy Cash |

**分離の理由**:
- `arcium init`と`anchor init`で生成されるディレクトリ構造が異なる
- 各環境固有の設定ファイル（Arcium.toml、Anchor.toml）が必要
- SDKもそれぞれの環境専用となり、共有パッケージは不要

### モノレポ採用の理由

| 観点 | モノレポ | マルチリポ |
|------|---------|-----------|
| 型共有 | 共通パッケージで一元管理 | npm公開が必要 |
| 依存管理 | pnpm workspacesで統一 | 各リポジトリで個別管理 |
| CI/CD | 1パイプラインで全コンポーネント | 複数パイプライン |
| コードレビュー | 関連変更を1PRで確認可能 | 複数PRに分散 |
| バージョン管理 | changesets で統一 | 個別バージョニング |

## プロジェクト構造

```
subly/
├── devnet/                         # Devnet環境 (Arcium MPC)
│   ├── programs/                   # Arciumプログラム
│   │   └── subly-membership/       # Protocol A: 会員管理
│   ├── packages/                   # Devnet用SDKパッケージ
│   │   └── membership-sdk/         # @subly/membership-sdk
│   ├── tests/                      # Devnet用テスト
│   ├── Arcium.toml                 # Arcium設定
│   ├── Cargo.toml                  # Rust workspace設定
│   └── package.json                # Devnet用package.json
│
├── mainnet/                        # Mainnet環境 (Anchor)
│   ├── programs/                   # Anchorプログラム
│   │   └── subly-vault/            # Protocol B: Vault
│   ├── packages/                   # Mainnet用SDKパッケージ
│   │   └── vault-sdk/              # @subly/vault-sdk
│   ├── tests/                      # Mainnet用テスト
│   ├── Anchor.toml                 # Anchor設定
│   ├── Cargo.toml                  # Rust workspace設定
│   └── package.json                # Mainnet用package.json
│
├── apps/                           # フロントエンドアプリケーション
│   ├── dashboard-business/         # 事業者ダッシュボード (Devnet)
│   └── dashboard-user/             # ユーザーダッシュボード (Devnet + Mainnet)
│
├── tests/                          # E2E・統合テスト
│   ├── e2e/                        # E2Eテスト (Playwright)
│   └── integration/                # 統合テスト
│
├── docs/                           # プロジェクトドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md     # 本ドキュメント
│   ├── development-guidelines.md
│   └── glossary.md
│
├── scripts/                        # ビルド・デプロイスクリプト
│   ├── deploy-devnet.sh            # Devnetデプロイ
│   ├── deploy-mainnet.sh           # Mainnetデプロイ
│   └── setup-local.sh              # ローカル環境セットアップ
│
├── .steering/                      # 作業単位のステアリングファイル
│   └── [YYYYMMDD]-[task-name]/
│
├── .claude/                        # Claude Code設定
│   ├── commands/
│   ├── skills/
│   └── settings.json
│
├── .github/                        # GitHub設定
│   └── workflows/                  # GitHub Actions
│
├── pnpm-workspace.yaml             # pnpm workspaces設定
├── turbo.json                      # Turborepo設定
├── package.json                    # ルートpackage.json
├── tsconfig.base.json              # TypeScript基本設定
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── CLAUDE.md                       # Claude Code プロジェクトメモリ
└── README.md
```

## ディレクトリ詳細

### devnet/ (Devnet環境 - Arcium MPC)

`arcium init`コマンドで生成されるディレクトリ構造をベースとする。Protocol A（会員管理）のプログラムとSDKを配置。

#### devnet/programs/subly-membership/

**役割**: Protocol A - 会員管理とプライバシー保護（Devnet）

**技術スタック**:
- Arcium MPC Framework
- Light Protocol連携
- MagicBlock PER連携（オプション）

**構造**（arcium initベース）:
```
devnet/programs/subly-membership/
├── src/
│   ├── lib.rs                      # プログラムエントリーポイント
│   ├── instructions/               # 命令ハンドラ
│   │   ├── mod.rs
│   │   ├── create_plan.rs          # プラン作成
│   │   ├── subscribe.rs            # サブスクリプション契約
│   │   ├── unsubscribe.rs          # 解約
│   │   └── verify_membership.rs    # 会員証明検証
│   ├── state/                      # PDAアカウント定義
│   │   ├── mod.rs
│   │   ├── plan.rs                 # Plan PDA
│   │   ├── subscription.rs         # Subscription PDA
│   │   └── business.rs             # Business PDA
│   ├── mxe/                        # Arcium MXE関連
│   │   ├── mod.rs
│   │   └── computations.rs         # MPC計算ロジック
│   ├── errors.rs                   # カスタムエラー
│   ├── events.rs                   # イベント定義
│   └── constants.rs                # 定数
├── tests/
│   └── subly-membership.ts
├── Cargo.toml
└── Xargo.toml
```

**命名規則**:
- ファイル名: snake_case
- 関数名: snake_case
- 構造体名: PascalCase
- PDAシード: UPPER_SNAKE_CASE

#### devnet/packages/membership-sdk/

**役割**: Protocol A用のTypeScript SDK（@subly/membership-sdk）

**公開先**: npm（`@subly/membership-sdk`）

**構造**:
```
devnet/packages/membership-sdk/
├── src/
│   ├── index.ts                    # エントリーポイント
│   ├── client.ts                   # SublyMembershipClient クラス
│   ├── instructions/               # 命令ビルダー
│   │   ├── index.ts
│   │   ├── createPlan.ts
│   │   ├── subscribe.ts
│   │   └── verifyMembership.ts
│   ├── accounts/                   # アカウントデコーダー
│   │   ├── index.ts
│   │   ├── plan.ts
│   │   └── subscription.ts
│   ├── types/                      # 型定義
│   │   ├── index.ts
│   │   ├── plan.ts
│   │   └── subscription.ts
│   └── utils/                      # ユーティリティ
│       ├── index.ts
│       ├── pda.ts                  # PDA計算
│       └── encryption.ts           # Arcium暗号化ヘルパー
├── tests/
│   └── client.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**API設計**:
```typescript
// 使用例
import { SublyMembershipClient } from '@subly/membership-sdk';

const client = new SublyMembershipClient(connection, wallet);

// 事業者: プラン作成
const plan = await client.createPlan({
  name: 'Premium',
  priceUsdc: 10_000_000, // 10 USDC (6 decimals)
  billingCycle: 'monthly',
});

// ユーザー: サブスクリプション契約
const subscription = await client.subscribe(planId);

// 事業者: 会員証明の検証
const isValid = await client.verifyMembership(proof, planId);

// 事業者: アクティブ契約数取得
const count = await client.getSubscriptionCount(planId);
```

#### devnet/tests/

**役割**: Devnet環境専用のテスト

**構造**:
```
devnet/tests/
├── unit/                           # ユニットテスト
│   └── membership.test.ts
├── integration/                    # 統合テスト
│   └── membership-flow.test.ts
└── fixtures/
    └── wallets.ts
```

#### devnet/設定ファイル

```
devnet/
├── Arcium.toml                     # Arcium設定ファイル
├── Cargo.toml                      # Rust workspace設定
├── package.json                    # Devnet用package.json
└── tsconfig.json                   # TypeScript設定
```

**Arcium.toml例**:
```toml
[programs.devnet]
subly_membership = "MEMBERSHIP_PROGRAM_ID"

[mxe]
cluster = "devnet"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

#### devnet/IDLファイルの出力先

```
devnet/target/
├── idl/
│   └── subly_membership.json       # Protocol A IDL
└── types/
    └── subly_membership.ts         # Protocol A 型定義
```

---

### mainnet/ (Mainnet環境 - Anchor)

`anchor init`コマンドで生成されるディレクトリ構造をベースとする。Protocol B（Vault）のプログラムとSDKを配置。

#### mainnet/programs/subly-vault/

**役割**: Protocol B - 資金運用とプライベート決済（Mainnet）

**技術スタック**:
- Anchor Framework
- Privacy Cash連携
- Kamino Lending連携
- Clockwork連携（オートメーション）

**構造**（anchor initベース）:
```
mainnet/programs/subly-vault/
├── src/
│   ├── lib.rs                      # プログラムエントリーポイント
│   ├── instructions/               # 命令ハンドラ
│   │   ├── mod.rs
│   │   ├── deposit.rs              # 入金
│   │   ├── withdraw.rs             # 出金
│   │   ├── setup_recurring.rs      # 定期送金設定
│   │   └── execute_payment.rs      # 決済実行
│   ├── state/                      # PDAアカウント定義
│   │   ├── mod.rs
│   │   ├── user_account.rs         # UserAccount PDA
│   │   ├── shield_pool.rs          # ShieldPool PDA
│   │   └── recurring_payment.rs    # RecurringPayment PDA
│   ├── integrations/               # 外部プロトコル連携
│   │   ├── mod.rs
│   │   ├── privacy_cash.rs         # Privacy Cash CPI
│   │   └── kamino.rs               # Kamino CPI
│   ├── errors.rs
│   ├── events.rs
│   └── constants.rs
├── tests/
│   └── subly-vault.ts
├── Cargo.toml
└── Xargo.toml
```

#### mainnet/packages/vault-sdk/

**役割**: Protocol B用のTypeScript SDK（@subly/vault-sdk）

**公開先**: npm（`@subly/vault-sdk`）

**構造**:
```
mainnet/packages/vault-sdk/
├── src/
│   ├── index.ts                    # エントリーポイント
│   ├── client.ts                   # SublyVaultClient クラス
│   ├── instructions/               # 命令ビルダー
│   │   ├── index.ts
│   │   ├── deposit.ts
│   │   ├── withdraw.ts
│   │   └── setupRecurring.ts
│   ├── accounts/                   # アカウントデコーダー
│   │   ├── index.ts
│   │   ├── userAccount.ts
│   │   └── recurringPayment.ts
│   ├── types/                      # 型定義
│   │   ├── index.ts
│   │   └── vault.ts
│   └── utils/                      # ユーティリティ
│       ├── index.ts
│       └── pda.ts
├── tests/
│   └── client.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**API設計**:
```typescript
// 使用例
import { SublyVaultClient } from '@subly/vault-sdk';

const client = new SublyVaultClient(connection, wallet);

// ユーザー: プライベート入金
await client.deposit({
  amountUsdc: 100_000_000, // 100 USDC
});

// ユーザー: 残高確認（本人のみ）
const balance = await client.getBalance();

// ユーザー: 定期送金設定
await client.setupRecurringPayment({
  recipientAddress: businessWallet,
  amountUsdc: 10_000_000, // 10 USDC
  interval: 'monthly',
});

// ユーザー: 出金
await client.withdraw({
  amountUsdc: 50_000_000,
});
```

#### mainnet/tests/

**役割**: Mainnet環境専用のテスト

**構造**:
```
mainnet/tests/
├── unit/                           # ユニットテスト
│   └── vault.test.ts
├── integration/                    # 統合テスト
│   └── vault-flow.test.ts
└── fixtures/
    └── wallets.ts
```

#### mainnet/設定ファイル

```
mainnet/
├── Anchor.toml                     # Anchor設定ファイル
├── Cargo.toml                      # Rust workspace設定
├── package.json                    # Mainnet用package.json
└── tsconfig.json                   # TypeScript設定
```

**Anchor.toml例**:
```toml
[features]
seeds = false
skip-lint = false

[programs.mainnet]
subly_vault = "VAULT_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "mainnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

#### mainnet/IDLファイルの出力先

```
mainnet/target/
├── idl/
│   └── subly_vault.json            # Protocol B IDL
└── types/
    └── subly_vault.ts              # Protocol B 型定義
```

**注意**: `target/` ディレクトリはビルド成果物のため `.gitignore` で除外される。CI/CDでは都度ビルドして生成する。

---

### apps/ (フロントエンドアプリケーション)

フロントエンドアプリケーションはルート直下に配置。ユーザーダッシュボードはDevnet（会員管理）とMainnet（Vault）の両方を利用するため、最上段で管理する。

#### apps/dashboard-business/

**役割**: 事業者向けダッシュボード（Devnet: 会員管理のみ）

**接続環境**: Devnet（Protocol A: membership-sdk使用）

**技術スタック**:
- Next.js 14 (App Router)
- TailwindCSS
- shadcn/ui
- @solana/wallet-adapter
- @subly/membership-sdk

**構造**:
```
apps/dashboard-business/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # ホーム
│   │   ├── plans/                  # プラン管理
│   │   │   ├── page.tsx            # プラン一覧
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # プラン作成
│   │   │   └── [planId]/
│   │   │       └── page.tsx        # プラン詳細・編集
│   │   ├── analytics/              # 分析
│   │   │   └── page.tsx
│   │   └── settings/               # 設定
│   │       └── page.tsx
│   ├── components/                 # UIコンポーネント
│   │   ├── ui/                     # 基本UIコンポーネント
│   │   ├── layout/                 # レイアウト
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── plans/                  # プラン関連
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PlanForm.tsx
│   │   │   └── PlanList.tsx
│   │   └── wallet/                 # ウォレット
│   │       └── WalletButton.tsx
│   ├── hooks/                      # カスタムフック
│   │   ├── usePlans.ts
│   │   ├── useSubscriptionCount.ts
│   │   └── useSublyMembership.ts
│   ├── lib/                        # ライブラリ
│   │   ├── membership.ts           # membership-sdk初期化
│   │   └── solana.ts               # Solana設定 (Devnet)
│   ├── providers/                  # Providers
│   │   ├── WalletProvider.tsx
│   │   └── MembershipProvider.tsx
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

#### apps/dashboard-user/

**役割**: ユーザー向けダッシュボード（Devnet + Mainnet: 両環境使用）

**接続環境**:
- Devnet: Protocol A（サブスクリプション契約、会員証明 - membership-sdk使用）
- Mainnet: Protocol B（Vault入出金、定期送金 - vault-sdk使用）

**技術スタック**:
- Next.js 14 (App Router)
- TailwindCSS
- shadcn/ui
- @solana/wallet-adapter
- @subly/membership-sdk（Devnet用）
- @subly/vault-sdk（Mainnet用）

**構造**:
```
apps/dashboard-user/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # ホーム（残高・運用状況）
│   │   ├── vault/                  # Vault関連 (Mainnet)
│   │   │   ├── page.tsx            # Vault概要
│   │   │   ├── deposit/
│   │   │   │   └── page.tsx        # 入金
│   │   │   └── withdraw/
│   │   │       └── page.tsx        # 出金
│   │   ├── subscriptions/          # サブスクリプション (Devnet)
│   │   │   ├── page.tsx            # 契約一覧
│   │   │   ├── browse/
│   │   │   │   └── page.tsx        # プラン検索
│   │   │   └── [subscriptionId]/
│   │   │       └── page.tsx        # 契約詳細
│   │   ├── payments/               # 定期送金 (Mainnet)
│   │   │   ├── page.tsx            # 送金一覧
│   │   │   └── new/
│   │   │       └── page.tsx        # 新規設定
│   │   └── history/                # 履歴
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── vault/                  # Vault関連 (Mainnet)
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── YieldDisplay.tsx
│   │   │   └── DepositForm.tsx
│   │   ├── subscriptions/          # サブスクリプション関連 (Devnet)
│   │   │   ├── SubscriptionCard.tsx
│   │   │   ├── SubscriptionList.tsx
│   │   │   └── PlanBrowser.tsx
│   │   ├── payments/               # 定期送金関連 (Mainnet)
│   │   │   ├── PaymentCard.tsx
│   │   │   └── PaymentForm.tsx
│   │   └── wallet/
│   │       └── WalletButton.tsx
│   ├── hooks/
│   │   ├── useVaultBalance.ts      # Mainnet
│   │   ├── useYield.ts             # Mainnet
│   │   ├── useSublyVault.ts        # Mainnet
│   │   ├── useSubscriptions.ts     # Devnet
│   │   └── useSublyMembership.ts   # Devnet
│   ├── lib/
│   │   ├── membership.ts           # membership-sdk初期化 (Devnet)
│   │   ├── vault.ts                # vault-sdk初期化 (Mainnet)
│   │   ├── solana-devnet.ts        # Solana設定 (Devnet)
│   │   └── solana-mainnet.ts       # Solana設定 (Mainnet)
│   ├── providers/
│   │   ├── WalletProvider.tsx      # マルチクラスタ対応
│   │   ├── MembershipProvider.tsx  # Devnet
│   │   └── VaultProvider.tsx       # Mainnet
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

**マルチクラスタ対応の注意点**:
- WalletProviderはDevnetとMainnetの両方に接続可能に設定
- 各SDKは対応するクラスタのConnectionを使用
- ユーザーはウォレット接続時にネットワーク切り替えが必要な場合がある

---

### tests/ (E2E・統合テスト)

クロスパッケージのテストを配置。Devnet/Mainnet横断のテストもここで管理。

**構造**:
```
tests/
├── e2e/                            # E2Eテスト (Playwright)
│   ├── business-dashboard/         # 事業者ダッシュボード (Devnet)
│   │   ├── plan-management.spec.ts
│   │   └── analytics.spec.ts
│   └── user-dashboard/             # ユーザーダッシュボード (Devnet + Mainnet)
│       ├── deposit-flow.spec.ts    # Mainnet
│       ├── subscription-flow.spec.ts # Devnet
│       └── cross-network.spec.ts   # クロスネットワーク
├── integration/                    # 統合テスト（環境横断）
│   └── full-flow.test.ts           # Devnet + Mainnet統合フロー
├── fixtures/                       # テストフィクスチャ
│   ├── wallets.ts
│   └── test-accounts.ts
├── playwright.config.ts
└── package.json
```

---

## 設定ファイル

### pnpm-workspace.yaml

```yaml
packages:
  - 'devnet/packages/*'
  - 'mainnet/packages/*'
  - 'apps/*'
  - 'tests'
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "build:devnet": {
      "dependsOn": ["^build"],
      "outputs": ["devnet/target/**"]
    },
    "build:mainnet": {
      "dependsOn": ["^build"],
      "outputs": ["mainnet/target/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "test:devnet": {
      "dependsOn": ["build:devnet"]
    },
    "test:mainnet": {
      "dependsOn": ["build:mainnet"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### devnet/Arcium.toml

```toml
[programs.devnet]
subly_membership = "MEMBERSHIP_PROGRAM_ID"

[mxe]
cluster = "devnet"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### devnet/Cargo.toml

```toml
[workspace]
members = [
    "programs/*"
]

[workspace.dependencies]
arcium-client = "0.1"
arcium-macros = "0.1"
solana-program = "1.18"
```

### mainnet/Anchor.toml

```toml
[features]
seeds = false
skip-lint = false

[programs.mainnet]
subly_vault = "VAULT_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "mainnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### mainnet/Cargo.toml

```toml
[workspace]
members = [
    "programs/*"
]

[workspace.dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
solana-program = "1.18"
```

---

## 依存関係のルール

### パッケージ間の依存

```
apps/dashboard-business
    ↓ (依存可能)
devnet/packages/membership-sdk

apps/dashboard-user
    ├─→ devnet/packages/membership-sdk (サブスクリプション契約用)
    └─→ mainnet/packages/vault-sdk (Vault入出金用)
```

**重要**: DevnetとMainnetのSDKは独立しており、相互に依存しない。
- `devnet/packages/membership-sdk`: Devnet専用、Arciumとの連携に特化
- `mainnet/packages/vault-sdk`: Mainnet専用、Anchorとの連携に特化

### 禁止される依存

- `devnet/packages/*` → `mainnet/packages/*`（クロス環境依存禁止）
- `mainnet/packages/*` → `devnet/packages/*`（クロス環境依存禁止）
- `*/packages/*` → `apps/*`（パッケージがアプリに依存禁止）
- `*/programs/*` → `*/packages/*`（Rust → TypeScript依存禁止）

### 許可される依存

- `apps/*` → `devnet/packages/*`（フロントエンドからDevnet SDKへ）
- `apps/*` → `mainnet/packages/*`（フロントエンドからMainnet SDKへ）
- `tests/*` → すべてのパッケージ（テストは全環境にアクセス可能）

---

## 命名規則

### 環境ディレクトリ

| 環境 | ディレクトリ名 | 用途 |
|------|--------------|------|
| Devnet | `devnet/` | Arcium MPC環境（Protocol A） |
| Mainnet | `mainnet/` | Anchor環境（Protocol B） |

### ディレクトリ名

| 種別 | 規則 | 例 |
|------|------|-----|
| 環境ディレクトリ | lowercase | `devnet`, `mainnet` |
| パッケージ | kebab-case | `membership-sdk`, `vault-sdk` |
| アプリ | kebab-case | `dashboard-business`, `dashboard-user` |
| Rustモジュール | snake_case | `instructions`, `state` |
| TypeScriptモジュール | kebab-case または camelCase | `components`, `hooks` |

### ファイル名

| 種別 | 規則 | 例 |
|------|------|-----|
| Rust | snake_case.rs | `create_plan.rs`, `user_account.rs` |
| TypeScript (モジュール/エントリー) | camelCase.ts | `client.ts`, `index.ts`, `pda.ts` |
| TypeScript (関数) | camelCase.ts | `createPlan.ts`, `formatDate.ts` |
| TypeScript (型定義) | camelCase.ts | `plan.ts`, `subscription.ts` |
| React コンポーネント | PascalCase.tsx | `PlanCard.tsx`, `Header.tsx` |
| React フック | camelCase.ts | `usePlans.ts`, `useVaultBalance.ts` |
| テスト | *.test.ts / *.spec.ts | `client.test.ts`, `deposit-flow.spec.ts` |
| 環境別設定 | 環境名を接尾辞に | `solana-devnet.ts`, `solana-mainnet.ts` |

**補足**: TypeScriptファイルは基本的にcamelCaseを使用する。Reactコンポーネント（`.tsx`）のみPascalCaseを使用する。

---

## スケーリング戦略

### 機能追加時の指針

**Devnet（Protocol A: 会員管理）への追加**:
1. **新しいプログラム命令**: `devnet/programs/subly-membership/src/instructions/` に追加
2. **新しいPDA**: `devnet/programs/subly-membership/src/state/` に追加
3. **新しいSDKメソッド**: `devnet/packages/membership-sdk/src/instructions/` に追加
4. **MPC計算ロジック**: `devnet/programs/subly-membership/src/mxe/` に追加

**Mainnet（Protocol B: Vault）への追加**:
1. **新しいプログラム命令**: `mainnet/programs/subly-vault/src/instructions/` に追加
2. **新しいPDA**: `mainnet/programs/subly-vault/src/state/` に追加
3. **新しいSDKメソッド**: `mainnet/packages/vault-sdk/src/instructions/` に追加
4. **外部プロトコル連携**: `mainnet/programs/subly-vault/src/integrations/` に追加

**フロントエンドへの追加**:
1. **新しいダッシュボードページ**: `apps/*/src/app/` に追加
2. **Devnet機能用コンポーネント**: `apps/*/src/components/` 内でDevnet用フォルダに配置
3. **Mainnet機能用コンポーネント**: `apps/*/src/components/` 内でMainnet用フォルダに配置

### ファイル分割の目安

- TypeScriptファイル: 300行以下推奨
- Rustファイル: 500行以下推奨
- Reactコンポーネント: 200行以下推奨（コンポーネント分割）

### 新しいプロトコルの追加

将来的に新しいプロトコルを追加する場合:
1. 該当する環境（devnet/mainnet）の `programs/` に新しいプログラムディレクトリを作成
2. 対応するSDKを同環境の `packages/` に作成
3. フロントエンドで必要に応じてProviderとhooksを追加

---

## 除外設定

### .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs (環境別)
devnet/target/
mainnet/target/
dist/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store

# Anchor (mainnet)
mainnet/.anchor/
mainnet/test-ledger/

# Arcium (devnet)
devnet/.arcium/
devnet/test-ledger/

# Logs
*.log
npm-debug.log*

# Coverage
coverage/

# Turbo
.turbo/
```

---

## チェックリスト

- [x] モノレポ構成（pnpm workspaces + Turborepo）
- [x] Devnet/Mainnet環境の分離
- [x] Protocol A（Devnet: Arcium）Program構造定義
- [x] Protocol B（Mainnet: Anchor）Program構造定義
- [x] 環境別SDKパッケージ構造定義
- [x] ダッシュボードアプリ構造定義（マルチクラスタ対応）
- [x] 依存関係ルールの明確化（クロス環境依存禁止）
- [x] 命名規則の統一
- [x] スケーリング戦略の定義
- [x] 環境別設定ファイルの定義
