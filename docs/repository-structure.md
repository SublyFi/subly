# リポジトリ構造定義書 (Repository Structure Document)

## 概要

本ドキュメントは、Sublyプロジェクトのリポジトリ構造を定義する。Sublyは複数のコンポーネント（Solana Programs、SDK、ダッシュボード）で構成されるため、**pnpm workspaces + Turborepo**によるモノレポ構成を採用する。

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
├── programs/                       # Solana Programs (Anchor)
│   ├── subly-membership/           # Protocol A: 会員管理 (Devnet)
│   └── subly-vault/                # Protocol B: Vault (Mainnet)
│
├── packages/                       # 共有パッケージ (npm公開可能)
│   ├── membership-sdk/             # @subly/membership-sdk
│   ├── vault-sdk/                  # @subly/vault-sdk
│   └── shared/                     # @subly/shared (内部共有)
│
├── apps/                           # アプリケーション
│   ├── dashboard-business/         # 事業者ダッシュボード
│   └── dashboard-user/             # ユーザーダッシュボード
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
├── Anchor.toml                     # Anchor設定
├── Cargo.toml                      # Rust workspace設定
├── tsconfig.base.json              # TypeScript基本設定
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── CLAUDE.md                       # Claude Code プロジェクトメモリ
└── README.md
```

## ディレクトリ詳細

### programs/ (Solana Programs)

Anchor Frameworkで実装するSolana Programsを配置。

#### programs/subly-membership/

**役割**: Protocol A - 会員管理とプライバシー保護（Devnet）

**技術スタック**:
- Anchor Framework
- Arcium MPC連携
- Light Protocol連携
- MagicBlock PER連携（オプション）

**構造**:
```
programs/subly-membership/
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
│   ├── errors.rs                   # カスタムエラー
│   ├── events.rs                   # イベント定義
│   └── constants.rs                # 定数
├── tests/                          # Anchor テスト
│   └── subly-membership.ts
├── Cargo.toml
└── Xargo.toml
```

**命名規則**:
- ファイル名: snake_case
- 関数名: snake_case
- 構造体名: PascalCase
- PDAシード: UPPER_SNAKE_CASE

#### programs/subly-vault/

**役割**: Protocol B - 資金運用とプライベート決済（Mainnet）

**技術スタック**:
- Anchor Framework
- Privacy Cash連携
- Kamino Lending連携
- Clockwork連携（オートメーション）

**構造**:
```
programs/subly-vault/
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

---

### packages/ (共有パッケージ)

npm公開可能なTypeScriptパッケージを配置。

#### packages/membership-sdk/

**役割**: Protocol A用のTypeScript SDK（@subly/membership-sdk）

**公開先**: npm（`@subly/membership-sdk`）

**構造**:
```
packages/membership-sdk/
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

#### packages/vault-sdk/

**役割**: Protocol B用のTypeScript SDK（@subly/vault-sdk）

**公開先**: npm（`@subly/vault-sdk`）

**構造**:
```
packages/vault-sdk/
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

#### packages/shared/

**役割**: 内部共有パッケージ（@subly/shared）

**公開先**: 内部のみ（npm公開しない）

**構造**:
```
packages/shared/
├── src/
│   ├── index.ts
│   ├── types/                      # 共通型定義
│   │   ├── index.ts
│   │   ├── common.ts               # 共通型
│   │   └── errors.ts               # エラー型
│   ├── constants/                  # 共通定数
│   │   ├── index.ts
│   │   ├── programIds.ts           # プログラムID
│   │   └── tokens.ts               # トークンアドレス
│   └── utils/                      # 共通ユーティリティ
│       ├── index.ts
│       ├── formatters.ts           # フォーマッター
│       └── validators.ts           # バリデーター
├── package.json
└── tsconfig.json
```

---

### apps/ (アプリケーション)

フロントエンドアプリケーションを配置。

#### apps/dashboard-business/

**役割**: 事業者向けダッシュボード

**技術スタック**:
- Next.js 14 (App Router)
- TailwindCSS
- shadcn/ui
- @solana/wallet-adapter

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
│   │   ├── subly.ts                # SDK初期化
│   │   └── solana.ts               # Solana設定
│   ├── providers/                  # Providers
│   │   ├── WalletProvider.tsx
│   │   └── SublyProvider.tsx
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

#### apps/dashboard-user/

**役割**: ユーザー向けダッシュボード

**技術スタック**:
- Next.js 14 (App Router)
- TailwindCSS
- shadcn/ui
- @solana/wallet-adapter

**構造**:
```
apps/dashboard-user/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # ホーム（残高・運用状況）
│   │   ├── deposit/                # 入金
│   │   │   └── page.tsx
│   │   ├── withdraw/               # 出金
│   │   │   └── page.tsx
│   │   ├── subscriptions/          # サブスクリプション
│   │   │   ├── page.tsx            # 契約一覧
│   │   │   └── [subscriptionId]/
│   │   │       └── page.tsx        # 契約詳細
│   │   ├── payments/               # 定期送金
│   │   │   ├── page.tsx            # 送金一覧
│   │   │   └── new/
│   │   │       └── page.tsx        # 新規設定
│   │   └── history/                # 履歴
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── vault/                  # Vault関連
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── YieldDisplay.tsx
│   │   │   └── DepositForm.tsx
│   │   ├── subscriptions/          # サブスクリプション関連
│   │   │   ├── SubscriptionCard.tsx
│   │   │   └── SubscriptionList.tsx
│   │   └── wallet/
│   │       └── WalletButton.tsx
│   ├── hooks/
│   │   ├── useVaultBalance.ts
│   │   ├── useYield.ts
│   │   ├── useSublyVault.ts
│   │   └── useSubscriptions.ts
│   ├── lib/
│   │   ├── subly.ts
│   │   └── solana.ts
│   ├── providers/
│   │   ├── WalletProvider.tsx
│   │   └── SublyProvider.tsx
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

### tests/ (E2E・統合テスト)

クロスパッケージのテストを配置。

**構造**:
```
tests/
├── e2e/                            # E2Eテスト (Playwright)
│   ├── business-dashboard/         # 事業者ダッシュボード
│   │   ├── plan-management.spec.ts
│   │   └── analytics.spec.ts
│   └── user-dashboard/             # ユーザーダッシュボード
│       ├── deposit-flow.spec.ts
│       └── subscription-flow.spec.ts
├── integration/                    # 統合テスト
│   ├── protocol-a/                 # Protocol A統合テスト
│   │   └── membership-flow.test.ts
│   └── protocol-b/                 # Protocol B統合テスト
│       └── vault-flow.test.ts
├── fixtures/                       # テストフィクスチャ
│   └── wallets.ts
├── playwright.config.ts
└── package.json
```

---

## 設定ファイル

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'tests'
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Anchor.toml

```toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
subly_membership = "MEMBERSHIP_PROGRAM_ID"

[programs.mainnet]
subly_vault = "VAULT_PROGRAM_ID"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Cargo.toml (Workspace)

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
packages/membership-sdk
    ↓ (依存可能)
packages/shared

apps/dashboard-user
    ↓ (依存可能)
packages/vault-sdk
    ↓ (依存可能)
packages/shared
    ↓ (依存可能)
packages/membership-sdk  (会員証明用)
```

### 禁止される依存

- `packages/*` → `apps/*`（パッケージがアプリに依存禁止）
- `programs/*` → `packages/*`（Rust → TypeScript依存禁止）
- `packages/shared` → 他の`packages/*`（循環依存防止）

---

## 命名規則

### ディレクトリ名

| 種別 | 規則 | 例 |
|------|------|-----|
| パッケージ | kebab-case | `membership-sdk`, `vault-sdk` |
| アプリ | kebab-case | `dashboard-business`, `dashboard-user` |
| Rustモジュール | snake_case | `instructions`, `state` |
| TypeScriptモジュール | kebab-case または camelCase | `components`, `hooks` |

### ファイル名

| 種別 | 規則 | 例 |
|------|------|-----|
| Rust | snake_case.rs | `create_plan.rs`, `user_account.rs` |
| TypeScript (クラス) | PascalCase.ts | `SublyMembershipClient.ts` |
| TypeScript (関数) | camelCase.ts | `createPlan.ts`, `formatDate.ts` |
| React コンポーネント | PascalCase.tsx | `PlanCard.tsx`, `Header.tsx` |
| React フック | camelCase.ts | `usePlans.ts`, `useVaultBalance.ts` |
| テスト | *.test.ts / *.spec.ts | `client.test.ts`, `deposit-flow.spec.ts` |

---

## スケーリング戦略

### 機能追加時の指針

1. **新しいプログラム命令**: `programs/*/src/instructions/` に追加
2. **新しいPDA**: `programs/*/src/state/` に追加
3. **新しいSDKメソッド**: `packages/*/src/instructions/` に追加
4. **新しいダッシュボードページ**: `apps/*/src/app/` に追加
5. **共通機能**: `packages/shared/` に追加

### ファイル分割の目安

- TypeScriptファイル: 300行以下推奨
- Rustファイル: 500行以下推奨
- Reactコンポーネント: 200行以下推奨（コンポーネント分割）

---

## 除外設定

### .gitignore

```gitignore
# Dependencies
node_modules/
target/

# Build outputs
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

# Anchor
.anchor/
test-ledger/

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
- [x] Protocol A/B の Anchor Program 構造定義
- [x] SDK パッケージ構造定義
- [x] ダッシュボードアプリ構造定義
- [x] 依存関係ルールの明確化
- [x] 命名規則の統一
- [x] スケーリング戦略の定義
- [x] 設定ファイルの定義
