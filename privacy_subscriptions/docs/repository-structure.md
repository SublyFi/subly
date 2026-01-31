# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造

```
privacy_subscriptions/
├── programs/                    # Solana Anchorプログラム
│   └── privacy_subscriptions/   # メインプログラム
│       ├── Cargo.toml           # Rustパッケージ設定
│       └── src/
│           └── lib.rs           # プログラムエントリポイント
├── encrypted-ixs/               # Arcis暗号化回路（MPC処理定義）
│   ├── Cargo.toml               # Rustパッケージ設定
│   └── src/
│       └── lib.rs               # 暗号化回路定義
├── sdk/                         # Subly SDK（事業者アプリ組込用）
│   ├── package.json             # npm設定
│   ├── tsconfig.json            # TypeScript設定
│   └── src/
│       ├── index.ts             # エントリポイント
│       ├── client.ts            # SublySDKクラス
│       ├── instructions/        # インストラクションビルダー
│       ├── accounts/            # アカウント取得・デコード
│       ├── encryption/          # Arcium暗号化処理
│       └── types/               # 型定義
├── app/                         # Subly Dashboard（ユーザー・事業者向けWebダッシュボード）
│   ├── package.json             # npm設定
│   ├── next.config.js           # Next.js設定
│   ├── tsconfig.json            # TypeScript設定
│   └── src/
│       ├── app/                 # App Router
│       │   ├── (user)/          # ユーザー向けページ（wallet, subscriptions）
│       │   └── (merchant)/      # 事業者向けページ（plans, revenue）
│       ├── components/          # UIコンポーネント
│       │   ├── user/            # ユーザー向けコンポーネント
│       │   ├── merchant/        # 事業者向けコンポーネント
│       │   └── common/          # 共通コンポーネント
│       ├── hooks/               # カスタムフック
│       ├── lib/                 # ユーティリティ
│       └── types/               # 型定義
├── tests/                       # 統合テスト
│   └── privacy_subscriptions.ts # TypeScriptテストファイル
├── migrations/                  # デプロイマイグレーション
│   └── deploy.ts                # デプロイスクリプト
├── build/                       # ビルド成果物（Arcis回路）
│   ├── *.arcis                  # コンパイル済み回路
│   ├── *.hash                   # 回路ハッシュ
│   ├── *.idarc                  # 回路ID
│   ├── *.ts                     # 生成されたTypeScriptクライアント
│   └── circuits.ts              # 回路エクスポート
├── target/                      # Rustビルド成果物
│   ├── deploy/                  # デプロイ用キーペア
│   ├── idl/                     # 生成されたIDL
│   └── types/                   # 生成されたTypeScript型定義
├── artifacts/                   # Arciumローカル環境設定
│   ├── localnet/                # ローカルMXEノード設定
│   └── *.json                   # MXE関連設定ファイル
├── docs/                        # プロジェクトドキュメント
│   ├── product-requirements.md  # プロダクト要求定義書
│   ├── functional-design.md     # 機能設計書
│   ├── architecture.md          # 技術仕様書
│   ├── repository-structure.md  # リポジトリ構造定義書（本ドキュメント）
│   ├── development-guidelines.md # 開発ガイドライン（未作成）
│   └── glossary.md              # 用語集（未作成）
├── runbooks/                    # 運用手順書
│   ├── README.md                # 概要
│   └── deployment/              # デプロイ手順
├── .steering/                   # ステアリングファイル（作業単位ドキュメント）
├── .anchor/                     # Anchor設定・キャッシュ
├── .claude/                     # Claude Code設定
│   ├── commands/                # スラッシュコマンド
│   ├── skills/                  # タスクモード別スキル
│   └── agents/                  # サブエージェント定義
├── .surfpool/                   # Surfpool設定
├── node_modules/                # npm依存関係
├── Anchor.toml                  # Anchorプロジェクト設定
├── Arcium.toml                  # Arcium設定
├── Cargo.toml                   # Rustワークスペース設定
├── Cargo.lock                   # Rust依存関係ロック
├── package.json                 # npm設定（ルート）
├── yarn.lock                    # yarn依存関係ロック
├── tsconfig.json                # TypeScript設定
├── rust-toolchain.toml          # Rustツールチェイン設定
├── txtx.yml                     # txtx設定
├── README.md                    # プロジェクト概要
└── CLAUDE.md                    # Claude Code設定
```

## ディレクトリ詳細

### programs/ (Solana Anchor プログラム)

#### programs/privacy_subscriptions/

**役割**: Subly のメインオンチェーンプログラム。サブスクリプション管理、支払い処理、Arcium 連携を担当。

**配置ファイル**:

- `Cargo.toml`: Rust パッケージ設定、依存関係定義
- `src/lib.rs`: プログラムエントリポイント、インストラクション定義

**命名規則**:

- ディレクトリ名: snake_case（`privacy_subscriptions`）
- Rust ファイル名: snake_case（`lib.rs`）

**依存関係**:

- 依存可能: `encrypted-ixs/`（Arcis 回路呼び出し）
- 依存禁止: `tests/`, `app/`, `sdk/`

**例**:

```
programs/privacy_subscriptions/
├── Cargo.toml
└── src/
    └── lib.rs              # 全インストラクション定義
```

**拡張時（ファイル分割）**:

```
programs/privacy_subscriptions/
├── Cargo.toml
└── src/
    ├── lib.rs              # エントリポイント
    ├── instructions/       # インストラクション別ファイル
    │   ├── mod.rs
    │   ├── initialize.rs
    │   ├── deposit.rs
    │   ├── subscribe.rs
    │   └── ...
    ├── state/              # アカウント状態定義
    │   ├── mod.rs
    │   ├── protocol.rs
    │   ├── merchant.rs
    │   └── user.rs
    └── errors.rs           # エラーコード定義
```

### encrypted-ixs/ (Arcis 暗号化回路)

**役割**: Arcium MPC 回路の定義。暗号化データに対する計算ロジック（残高加算、減算、検証など）を記述。

**配置ファイル**:

- `Cargo.toml`: Rust パッケージ設定
- `src/lib.rs`: 暗号化回路定義（`#[arcis_program]`マクロ使用）

**命名規則**:

- ディレクトリ名: kebab-case（`encrypted-ixs`）
- 回路関数名: snake_case（`add_together`, `deposit_circuit`）

**依存関係**:

- 依存可能: Arcium クレート（`arcis`）
- 依存禁止: `programs/`（逆方向の依存）

**例**:

```
encrypted-ixs/
├── Cargo.toml
└── src/
    └── lib.rs              # 全回路定義
```

**拡張時（回路分割）**:

```
encrypted-ixs/
├── Cargo.toml
└── src/
    ├── lib.rs              # エントリポイント
    ├── deposit.rs          # deposit回路
    ├── withdraw.rs         # withdraw回路
    ├── subscribe.rs        # subscribe回路
    └── payment.rs          # payment回路
```

### sdk/ (Subly SDK)

**役割**: 事業者アプリ組み込み用の TypeScript/JavaScript SDK。トランザクション構築、暗号化処理、Arcium クライアント連携を提供。

**配置ファイル**:

- `package.json`: npm パッケージ設定
- `tsconfig.json`: TypeScript 設定
- `src/index.ts`: エントリポイント（エクスポート）
- `src/client.ts`: SublySDK メインクラス
- `src/instructions/`: インストラクションビルダー
- `src/accounts/`: アカウント取得・デコード
- `src/encryption/`: Arcium 暗号化・復号化処理
- `src/types/`: 型定義

**命名規則**:

- ディレクトリ名: kebab-case（`sdk`）
- TypeScript ファイル名: camelCase（`client.ts`, `subscriptionPlan.ts`）
- クラス名: PascalCase（`SublySDK`, `SubscriptionPlan`）
- メソッド名: camelCase（`checkSubscription`, `deposit`）

**依存関係**:

- 依存可能: `target/types/`（生成された型定義）、`build/`（回路クライアント）
- 依存禁止: `programs/`（直接参照）、`app/`

**構造**:

```
sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # エクスポート
│   ├── client.ts                # SublySDKクラス
│   ├── instructions/            # インストラクションビルダー
│   │   ├── index.ts
│   │   ├── deposit.ts
│   │   ├── withdraw.ts
│   │   ├── subscribe.ts
│   │   └── ...
│   ├── accounts/                # アカウント取得
│   │   ├── index.ts
│   │   ├── userLedger.ts
│   │   ├── merchantLedger.ts
│   │   └── subscriptionPlan.ts
│   ├── encryption/              # Arcium暗号化処理
│   │   ├── index.ts
│   │   ├── encrypt.ts
│   │   └── decrypt.ts
│   └── types/                   # 型定義
│       ├── index.ts
│       └── sdk.ts
└── tests/                       # SDKユニットテスト
    └── client.test.ts
```

**主要クラス・メソッド**（PRD 8.3 より）:

```typescript
class SublySDK {
  // 初期化
  constructor(config: SublyConfig);

  // ユーザー操作
  deposit(amount: BN): Promise<TransactionSignature>;
  withdraw(amount: BN): Promise<TransactionSignature>;
  getBalance(): Promise<BN>;
  subscribe(planId: PublicKey): Promise<TransactionSignature>;
  unsubscribe(): Promise<TransactionSignature>;
  checkSubscription(wallet: PublicKey): Promise<SubscriptionStatus>;

  // 事業者操作
  getPlans(): Promise<SubscriptionPlan[]>;
}
```

### app/ (Subly Dashboard)

**役割**: ユーザー・事業者向け Web ダッシュボード（Next.js）。ユーザー向けには Deposit/Withdraw、サブスクリプション管理を、事業者向けにはプラン管理、収益確認、Claim 操作を提供。

**配置ファイル**:

- `package.json`: npm パッケージ設定
- `next.config.js`: Next.js 設定
- `tsconfig.json`: TypeScript 設定
- `src/app/`: App Router（ページ）
- `src/components/`: UI コンポーネント
- `src/hooks/`: カスタムフック
- `src/lib/`: ユーティリティ
- `src/types/`: 型定義

**命名規則**:

- ディレクトリ名: kebab-case（`app`, `components`）
- コンポーネントファイル: PascalCase（`PlanCard.tsx`, `RevenueChart.tsx`）
- フックファイル: camelCase + `use`プレフィックス（`useSubscriptionPlans.ts`）
- ユーティリティ: camelCase（`formatCurrency.ts`）

**依存関係**:

- 依存可能: `sdk/`（SublySDK を使用）
- 依存禁止: `programs/`（直接参照）、`encrypted-ixs/`

**構造**:

```
app/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── public/
│   └── images/
└── src/
    ├── app/                     # App Router
    │   ├── layout.tsx           # ルートレイアウト
    │   ├── page.tsx             # ホーム（ランディング）
    │   │
    │   ├── (user)/              # ユーザー向けページ
    │   │   ├── dashboard/       # ユーザーダッシュボード
    │   │   │   └── page.tsx
    │   │   ├── wallet/          # 資金管理
    │   │   │   └── page.tsx     # Deposit/Withdraw
    │   │   ├── subscriptions/   # サブスクリプション管理
    │   │   │   ├── page.tsx     # サブスク一覧
    │   │   │   └── [id]/
    │   │   │       └── page.tsx # サブスク詳細
    │   │   └── settings/        # ユーザー設定
    │   │       └── page.tsx
    │   │
    │   ├── (merchant)/          # 事業者向けページ
    │   │   ├── dashboard/       # 事業者ダッシュボード
    │   │   │   └── page.tsx
    │   │   ├── plans/           # プラン管理
    │   │   │   ├── page.tsx     # プラン一覧
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx # プラン作成
    │   │   │   └── [id]/
    │   │   │       └── page.tsx # プラン詳細・編集
    │   │   ├── revenue/         # 収益管理
    │   │   │   └── page.tsx     # Claim操作
    │   │   └── settings/        # 事業者設定
    │   │       └── page.tsx     # SDK設定ガイド
    │   │
    │   └── api/                 # API Routes（必要に応じて）
    │
    ├── components/              # UIコンポーネント
    │   ├── ui/                  # 汎用UIコンポーネント
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   └── ...
    │   ├── layout/              # レイアウトコンポーネント
    │   │   ├── Header.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── Footer.tsx
    │   ├── user/                # ユーザー向けコンポーネント
    │   │   ├── DepositForm.tsx
    │   │   ├── WithdrawForm.tsx
    │   │   ├── BalanceCard.tsx
    │   │   └── SubscriptionCard.tsx
    │   ├── merchant/            # 事業者向けコンポーネント
    │   │   ├── PlanCard.tsx
    │   │   ├── PlanForm.tsx
    │   │   ├── RevenueChart.tsx
    │   │   └── ClaimButton.tsx
    │   └── common/              # 共通コンポーネント
    │       ├── WalletButton.tsx
    │       └── TransactionStatus.tsx
    │
    ├── hooks/                   # カスタムフック
    │   ├── useWallet.ts
    │   ├── useSubly.ts
    │   ├── useBalance.ts        # ユーザー残高
    │   ├── useSubscriptions.ts  # ユーザーサブスク
    │   ├── usePlans.ts          # 事業者プラン
    │   └── useRevenue.ts        # 事業者収益
    │
    ├── lib/                     # ユーティリティ
    │   ├── subly.ts             # SublySDKインスタンス
    │   ├── solana.ts            # Solana接続
    │   └── format.ts            # フォーマッター
    │
    └── types/                   # 型定義
        └── index.ts
```

**主要機能**:

| 対象     | 機能                                   |
| -------- | -------------------------------------- |
| ユーザー | Deposit/Withdraw（資金管理）           |
| ユーザー | 残高確認（暗号化された残高の復号表示） |
| ユーザー | サブスクリプション一覧・詳細・解除     |
| 事業者   | 事業者登録/ログイン（Wallet 認証）     |
| 事業者   | プラン CRUD 操作                       |
| 事業者   | 収益ダッシュボード（暗号化された集計） |
| 事業者   | Claim 操作（収益引き出し）             |
| 事業者   | SDK 設定ガイド                         |

### tests/ (統合テスト)

**役割**: Anchor フレームワークを使用した統合テスト。ローカルバリデータ + Arcium MXE での E2E テスト。

**配置ファイル**:

- `*.ts`: TypeScript 統合テストファイル

**命名規則**:

- ファイル名: snake_case（`privacy_subscriptions.ts`）
- テスト関数: 説明的な文字列（`"Initialize protocol correctly"`）

**依存関係**:

- 依存可能: `target/types/`（生成された型定義）、`build/`（回路クライアント）、`sdk/`
- 依存禁止: なし（テストは全てのコードに依存可能）

**例**:

```
tests/
└── privacy_subscriptions.ts  # 全テストケース
```

**拡張時（テスト分割）**:

```
tests/
├── setup.ts                  # テストセットアップ共通処理
├── protocol.test.ts          # プロトコル初期化テスト
├── merchant.test.ts          # 事業者フローテスト
├── user.test.ts              # ユーザーフローテスト
├── subscription.test.ts      # サブスクリプションテスト
└── payment.test.ts           # 支払い処理テスト
```

### build/ (ビルド成果物)

**役割**: Arcis 回路のコンパイル成果物。`arcium build`コマンドで自動生成される。

**配置ファイル**:

- `*.arcis`: コンパイル済み回路バイナリ
- `*.arcis.ir`: 中間表現
- `*.hash`: 回路ハッシュ（デプロイ時の識別子）
- `*.idarc`: 回路 ID 設定
- `*.ts`: 生成された TypeScript クライアント
- `circuits.ts`: 回路エクスポート

**命名規則**:

- ファイル名: 回路関数名と同名（`add_together.arcis`）

**注意**:

- 自動生成ファイルのため、手動編集禁止
- `.gitignore`に含めるか、CI/CD で再生成

### target/ (Rust ビルド成果物)

**役割**: Rust/Anchor のビルド成果物。`anchor build`コマンドで自動生成される。

**重要なサブディレクトリ**:

- `deploy/`: プログラムキーペア（`privacy_subscriptions-keypair.json`）
- `idl/`: 生成された IDL ファイル（`privacy_subscriptions.json`）
- `types/`: 生成された TypeScript 型定義（`privacy_subscriptions.ts`）

**注意**:

- 自動生成ファイルのため、手動編集禁止
- `.gitignore`に含める（キーペアは除く）

### artifacts/ (Arcium ローカル環境)

**役割**: Arcium MXE ローカル環境の設定ファイル。`arcium localnet`コマンドで使用。

**配置ファイル**:

- `localnet/`: ローカル MXE ノード設定（ノードキー、BLS 鍵など）
- `*.json`: MXE 関連アカウント設定
- `*.toml`: ノード設定ファイル

**注意**:

- 開発環境専用。本番環境では使用しない
- `.gitignore`に含める

### docs/ (プロジェクトドキュメント)

**役割**: 永続的なプロジェクトドキュメント。アプリケーション全体の設計を定義。

**配置ドキュメント**:

| ファイル                    | 説明                         | 作成状況 |
| --------------------------- | ---------------------------- | -------- |
| `product-requirements.md`   | プロダクト要求定義書         | 作成済み |
| `functional-design.md`      | 機能設計書                   | 作成済み |
| `architecture.md`           | 技術仕様書                   | 作成済み |
| `repository-structure.md`   | リポジトリ構造定義書（本書） | 作成済み |
| `development-guidelines.md` | 開発ガイドライン             | 未作成   |
| `glossary.md`               | 用語集                       | 未作成   |

**命名規則**:

- ファイル名: kebab-case（`product-requirements.md`）
- 言語: 日本語

### runbooks/ (運用手順書)

**役割**: デプロイ、運用、トラブルシューティングの手順書。

**配置ファイル**:

- `README.md`: 概要
- `deployment/`: デプロイ手順

**例**:

```
runbooks/
├── README.md
└── deployment/
    ├── devnet.md       # Devnetデプロイ手順
    └── mainnet.md      # Mainnetデプロイ手順
```

### .steering/ (ステアリングファイル)

**役割**: 作業単位のドキュメント。特定の開発作業における「今回何をするか」を定義。

**構造**:

```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md      # 今回の作業の要求内容
    ├── design.md            # 変更内容の設計
    └── tasklist.md          # タスクリスト
```

**命名規則**:

- ディレクトリ名: `YYYYMMDD-task-name`形式
- 例: `20250131-add-subscription-feature`

### migrations/ (マイグレーション)

**役割**: Anchor デプロイマイグレーションスクリプト。

**配置ファイル**:

- `deploy.ts`: デプロイスクリプト

## ファイル配置規則

### ソースファイル

| ファイル種別             | 配置先                 | 命名規則   | 例                         |
| ------------------------ | ---------------------- | ---------- | -------------------------- |
| Anchor プログラム        | `programs/[name]/src/` | snake_case | `lib.rs`                   |
| Arcis 回路               | `encrypted-ixs/src/`   | snake_case | `lib.rs`                   |
| SDK ソース               | `sdk/src/`             | camelCase  | `client.ts`                |
| Dashboard ページ         | `app/src/app/`         | kebab-case | `dashboard/page.tsx`       |
| Dashboard コンポーネント | `app/src/components/`  | PascalCase | `PlanCard.tsx`             |
| 統合テスト               | `tests/`               | snake_case | `privacy_subscriptions.ts` |
| マイグレーション         | `migrations/`          | camelCase  | `deploy.ts`                |

### 設定ファイル

| ファイル種別          | 配置先             | 命名規則              |
| --------------------- | ------------------ | --------------------- |
| Anchor 設定           | プロジェクトルート | `Anchor.toml`         |
| Arcium 設定           | プロジェクトルート | `Arcium.toml`         |
| Rust ワークスペース   | プロジェクトルート | `Cargo.toml`          |
| npm 設定（ルート）    | プロジェクトルート | `package.json`        |
| npm 設定（SDK）       | `sdk/`             | `package.json`        |
| npm 設定（Dashboard） | `app/`             | `package.json`        |
| TypeScript 設定       | 各パッケージルート | `tsconfig.json`       |
| Rust ツールチェイン   | プロジェクトルート | `rust-toolchain.toml` |

### ドキュメント

| ドキュメント種別     | 配置先       | 命名規則      |
| -------------------- | ------------ | ------------- |
| 永続的ドキュメント   | `docs/`      | kebab-case.md |
| 作業単位ドキュメント | `.steering/` | kebab-case.md |
| 運用手順書           | `runbooks/`  | kebab-case.md |
| プロジェクト概要     | ルート       | `README.md`   |

## 命名規則

### ディレクトリ名

| 種別         | 規則          | 例                      |
| ------------ | ------------- | ----------------------- |
| プログラム名 | snake_case    | `privacy_subscriptions` |
| Arcis 回路   | kebab-case    | `encrypted-ixs`         |
| SDK          | kebab-case    | `sdk`                   |
| Dashboard    | kebab-case    | `app`                   |
| ドキュメント | kebab-case    | `docs`, `runbooks`      |
| ステアリング | YYYYMMDD-name | `20250131-add-feature`  |

### ファイル名

| 種別                 | 規則       | 例                                 |
| -------------------- | ---------- | ---------------------------------- |
| Rust ソース          | snake_case | `lib.rs`, `instructions.rs`        |
| TypeScript ソース    | camelCase  | `client.ts`, `subscriptionPlan.ts` |
| React コンポーネント | PascalCase | `PlanCard.tsx`, `Header.tsx`       |
| 設定ファイル         | PascalCase | `Anchor.toml`, `Cargo.toml`        |
| ドキュメント         | kebab-case | `product-requirements.md`          |

### コード内命名規則

| 種別                 | 規則            | 例                         |
| -------------------- | --------------- | -------------------------- |
| Rust 関数            | snake_case      | `initialize_protocol`      |
| Rust 構造体          | PascalCase      | `ProtocolConfig`           |
| Rust 定数            | UPPER_SNAKE     | `MAX_NAME_LENGTH`          |
| TypeScript 関数      | camelCase       | `initializeProtocol`       |
| TypeScript 型        | PascalCase      | `ProtocolConfig`           |
| TypeScript 定数      | UPPER_SNAKE     | `PROGRAM_ID`               |
| React コンポーネント | PascalCase      | `PlanCard`, `RevenueChart` |
| React フック         | camelCase + use | `useWallet`, `usePlans`    |

## 依存関係のルール

### レイヤー間の依存

```
テストレイヤー (tests/)
    ↓ (OK)
Dashboardレイヤー (app/)
    ↓ (OK)
SDKレイヤー (sdk/)
    ↓ (OK)
オンチェーンレイヤー (programs/) ← target/types/, build/ を参照
    ↓ (OK)
MPC回路レイヤー (encrypted-ixs/)
```

**許可される依存**:

- `tests/` → `programs/`, `encrypted-ixs/`, `target/types/`, `build/`, `sdk/`
- `app/` → `sdk/`
- `sdk/` → `target/types/`, `build/`
- `programs/` → `encrypted-ixs/`（回路呼び出し）

**禁止される依存**:

- `encrypted-ixs/` → `programs/` (逆方向)
- `programs/` → `tests/`, `sdk/`, `app/` (逆方向)
- `sdk/` → `programs/` (直接参照。`target/types/`経由で型のみ使用)
- `app/` → `programs/`, `encrypted-ixs/` (SDK 経由で操作)

### モジュール間の依存

**循環依存の禁止**:

```rust
// ❌ 悪い例: 循環依存
// instructions/deposit.rs
use crate::instructions::withdraw;  // 循環依存の可能性

// instructions/withdraw.rs
use crate::instructions::deposit;   // 循環依存
```

**解決策**:

```rust
// ✅ 良い例: 共通モジュールの抽出
// state/ledger.rs
pub fn update_balance(...) { /* ... */ }

// instructions/deposit.rs
use crate::state::ledger;

// instructions/withdraw.rs
use crate::state::ledger;
```

## スケーリング戦略

### 機能追加時の配置方針

1. **小規模機能**: 既存ファイル（`lib.rs`, `client.ts`）に追加
2. **中規模機能**: 同一ディレクトリ内に新ファイルを作成
3. **大規模機能**: サブディレクトリを作成してモジュール化

### ファイルサイズの管理

**ファイル分割の目安**:

- 1 ファイル: 500 行以下を推奨
- 500-1000 行: リファクタリングを検討
- 1000 行以上: 分割を強く推奨

**分割方法**:

```rust
// Before: 全てlib.rsに記述
// programs/privacy_subscriptions/src/lib.rs (2000行)

// After: 責務ごとに分割
// programs/privacy_subscriptions/src/
// ├── lib.rs (200行) - エントリポイント
// ├── instructions/
// │   ├── mod.rs (50行)
// │   ├── deposit.rs (150行)
// │   ├── withdraw.rs (150行)
// │   └── ...
// └── state/
//     ├── mod.rs (50行)
//     └── accounts.rs (300行)
```

## 除外設定

### .gitignore

```
# Rust
/target/
!target/deploy/*.json
!target/idl/*.json
!target/types/*.ts

# Node.js
/node_modules/
/sdk/node_modules/
/app/node_modules/
/app/.next/

# Arcium
/artifacts/
/build/

# 環境設定
.env
.env.*
.env.local

# OS
.DS_Store

# エディタ
.idea/
.vscode/
*.swp
```

### 注意事項

- `target/deploy/`のキーペアはバージョン管理に含める（プログラム ID 維持のため）
- `target/idl/`と`target/types/`は必要に応じてバージョン管理に含める
- `artifacts/`はローカル開発環境専用のため除外
- `app/.next/`は Next.js ビルド成果物のため除外

---

## 変更履歴

| 日付       | バージョン | 変更内容                                                             | 作成者 |
| ---------- | ---------- | -------------------------------------------------------------------- | ------ |
| 2025-01-31 | 1.0        | 初版作成                                                             | -      |
| 2025-01-31 | 1.1        | SDK、Dashboard を初期実装スコープとして正式記載                      | -      |
| 2025-01-31 | 1.2        | Dashboard にユーザー向け機能（Deposit/Withdraw、サブスク管理）を追加 | -      |
| 2025-01-31 | 1.3        | プロジェクト構造ツリーとディレクトリ詳細の整合性を修正               | -      |
