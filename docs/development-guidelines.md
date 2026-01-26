# 開発ガイドライン (Development Guidelines)

## 概要

本ドキュメントはSublyプロジェクトの開発規約を定義する。Sublyは以下の技術スタックで構成される：

- **オンチェーン**: Solana / Anchor Framework (Rust)
- **オフチェーン**: TypeScript / React / Next.js
- **プライバシー技術**: Arcium MPC, Light Protocol, MagicBlock PER, Privacy Cash

## プロトコル固有の規約

SublyはProtocol A（Devnet）とProtocol B（Mainnet）で異なる技術スタックを使用するため、それぞれに固有の規約がある。

### Protocol A: subly-membership（Devnet / Arcium）

**重要**: Protocol AはArcium MPCを使用するため、Arcis固有の制約に従う必要がある。

#### 環境制約

| 項目 | 制約 |
|------|------|
| ネットワーク | **Devnetのみ**（Arcium Mainnetは未リリース） |
| クライアントSDK | **@solana/web3.js**（レガシー版を使用、@solana/kitは非対応） |
| テスト環境 | Devnet上での統合テストが必須 |

#### Arcis回路のコーディング制約

Arcisは固定回路構造にコンパイルされるため、以下のRust構文は**使用不可**：

**使用不可の構文**:
```rust
// ❌ 使用不可: 動的ループ制御
while condition { }           // 不可
loop { }                      // 不可
break;                        // 不可
continue;                     // 不可

// ❌ 使用不可: パターンマッチング
match value { }               // 不可
if let Some(x) = option { }   // 不可

// ❌ 使用不可: その他
return early_value;           // 早期リターン不可
async fn foo() { }            // async/await不可
unsafe { }                    // unsafe不可
items.filter(|x| predicate)   // .filter()不可

// ❌ 使用不可: 可変長データ型
let v: Vec<T> = vec![];       // 不可
let s: String = String::new();// 不可
let m: HashMap<K, V>;         // 不可
```

**使用可能な構文**:
```rust
// ✅ 使用可能: 固定回数ループ
for i in 0..COMPILE_TIME_CONSTANT {
    // OK: ループ回数がコンパイル時に決定
}

// ✅ 使用可能: if/else（両分岐が評価される点に注意）
if condition {
    result_a
} else {
    result_b
}

// ✅ 使用可能: 固定サイズ配列
let data: [u8; 32] = [0u8; 32];

// ✅ 使用可能: イテレータ（filter以外）
items.iter().map(|x| transform(x)).collect()
items.iter().fold(init, |acc, x| acc + x)
items.iter().sum()
items.iter().enumerate()
items.iter().zip(other.iter())
```

**Arcis固有の注意点**:
```rust
// ⚠️ 条件分岐は両方の分岐が常に評価される
// セキュリティ上、どちらの分岐が選択されたかを隠すため
let result = if secret_condition {
    expensive_operation_a()  // 常に実行される
} else {
    expensive_operation_b()  // 常に実行される
};
// → 結果のみが条件に基づいて選択される

// ⚠️ 動的インデックスはO(n)のコスト
let value = array[secret_index];  // 全要素をチェックするため高コスト

// ⚠️ .reveal()と.from_arcis()は条件分岐内で使用不可
// 情報漏洩を防ぐため
```

#### Anchorアカウント命名規則（Protocol A専用）

Arcium SDKとの互換性のため、アカウント変数名は `_account` サフィックスを付ける：

```rust
// ✅ Protocol A: _account サフィックス必須
#[derive(Accounts)]
pub struct CreateSubscription<'info> {
    #[account(mut)]
    pub payer_account: Signer<'info>,

    #[account(
        init,
        payer = payer_account,
        space = Subscription::SPACE,
        seeds = [b"subscription", plan_account.key().as_ref(), user_commitment.as_ref()],
        bump
    )]
    pub subscription_account: Account<'info, Subscription>,

    #[account(mut)]
    pub plan_account: Account<'info, Plan>,

    pub system_program_account: Program<'info, System>,
}

// ❌ Protocol Aでは不可: サフィックスなし
#[derive(Accounts)]
pub struct CreateSubscription<'info> {
    pub payer: Signer<'info>,           // NG: _account なし
    pub subscription: Account<...>,      // NG: _account なし
}
```

#### TypeScriptクライアント（Protocol A専用）

```typescript
// Protocol A: @solana/web3.js（レガシー版）を使用
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

// ⚠️ @solana/kit は Arcium SDK と互換性がないため使用不可
// import { ... } from '@solana/kit';  // NG

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl, programId, provider);
```

#### テスト戦略（Protocol A）

```typescript
// Arcis #[instruction] 関数はMPC実行環境が必要なためユニットテスト不可
// → ヘルパー関数やユーティリティに論理を抽出してテスト

// ✅ テスト可能: ヘルパー関数
function generateUserCommitment(secret: Uint8Array, planId: PublicKey): Uint8Array {
  // 純粋な論理はユニットテスト可能
}

// ✅ テスト可能: #[arcis_circuit] 関数（回路ロジック）
// ❌ テスト不可: #[instruction] 関数（MPC実行環境必須）

// → 統合テストはTypeScript SDKでDevnet上で実施
describe('Protocol A Integration', () => {
  it('should create subscription on devnet', async () => {
    // Devnetでの統合テスト
  });
});
```

### Protocol B: subly-vault（Mainnet）

Protocol BはMainnet上で動作し、標準的なSolana/Anchorのベストプラクティスに従う。

#### 環境

| 項目 | 設定 |
|------|------|
| ネットワーク | **Mainnet** |
| クライアントSDK | **@solana/kit**（推奨）または @solana/web3.js |
| テスト環境 | Localnet/Devnetでのテスト後、Mainnetデプロイ |

#### Anchorアカウント命名規則（Protocol B）

標準的なAnchor命名規則に従う（`_account` サフィックス不要）：

```rust
// ✅ Protocol B: 標準的なAnchor命名
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", payer.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
```

#### TypeScriptクライアント（Protocol B）

```typescript
// Protocol B: @solana/kit（推奨）または @solana/web3.js
// 新しいプロジェクトでは @solana/kit を推奨

// @solana/kit を使用する場合
import { createSolanaClient } from '@solana/kit';

const client = createSolanaClient({
  urlOrMoniker: 'mainnet-beta',
});

// または @solana/web3.js を使用する場合（既存コードとの互換性）
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
```

#### セキュリティ考慮事項（Protocol B）

Mainnet上で実資金を扱うため、追加のセキュリティ対策が必要：

```rust
// ✅ 必須: 権限チェック
#[account(
    mut,
    has_one = authority @ SublyError::Unauthorized
)]
pub vault: Account<'info, Vault>,

// ✅ 必須: 再入攻撃対策
// 状態変更を先に行い、外部呼び出しは最後に
vault.balance -= amount;  // 先に状態更新
transfer_tokens(...)?;     // 後で外部呼び出し

// ✅ 必須: オーバーフロー対策
let new_balance = vault.balance
    .checked_add(amount)
    .ok_or(SublyError::Overflow)?;
```

### プロトコル間の比較表

| 項目 | Protocol A (Devnet) | Protocol B (Mainnet) |
|------|---------------------|----------------------|
| ネットワーク | Devnet | Mainnet |
| プライバシー技術 | Arcium MPC + Light Protocol | Privacy Cash |
| クライアントSDK | @solana/web3.js（必須） | @solana/kit（推奨） |
| アカウント命名 | `_account` サフィックス必須 | 標準Anchor命名 |
| Rust制約 | Arcis固有の制約あり | 標準Rust |
| テスト | Devnet統合テスト | Localnet→Devnet→Mainnet |

## コーディング規約

### 共通設定

| 項目 | 設定値 |
|------|--------|
| インデント | 2スペース |
| 行の最大長 | 100文字 |
| 文字エンコーディング | UTF-8 |
| 改行コード | LF |

### TypeScript/JavaScript 規約

#### 命名規則

**変数・関数**:
```typescript
// 変数: camelCase、名詞
const subscriptionPlan = await getPlan(planId);
const isActiveSubscription = true;
const hasValidMembership = false;

// 関数: camelCase、動詞で始める
function createSubscription(planId: string): Promise<Subscription> { }
function verifyMembershipProof(proof: MembershipProof): boolean { }
async function fetchUserSubscriptions(userId: string): Promise<Subscription[]> { }

// Boolean: is, has, should, can で始める
const isVerified = true;
const hasPermission = false;
const shouldRetry = true;
const canCancel = false;
```

**クラス・インターフェース・型**:
```typescript
// クラス: PascalCase、名詞
class SubscriptionService { }
class MembershipProofGenerator { }

// インターフェース: PascalCase、I接頭辞なし
interface Plan {
  planId: string;
  name: string;
  priceUsdc: bigint;
  billingCycleSeconds: number;
}

interface Subscription {
  subscriptionId: string;
  plan: Plan;
  isActive: boolean;
}

// 型エイリアス: PascalCase
type PlanStatus = 'active' | 'inactive' | 'archived';
type UserId = string;
type Nullable<T> = T | null;
```

**定数**:
```typescript
// 環境変数・設定値: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_BILLING_CYCLE_SECONDS = 2592000; // 30 days
const USDC_DECIMALS = 6;

// 設定オブジェクト
const CONFIG = {
  network: 'devnet',
  commitment: 'confirmed',
  maxRetries: 3,
} as const;
```

**ファイル名**:
```
// コンポーネント: PascalCase
SubscriptionCard.tsx
MembershipProofVerifier.tsx

// ユーティリティ・サービス: camelCase
subscriptionService.ts
membershipProof.ts

// 定数・設定: camelCase
constants.ts
config.ts

// 型定義: camelCase
types.ts
subscription.types.ts
```

#### 型定義

**明示的な型注釈**:
```typescript
// ✅ 良い例: 関数の引数と戻り値に型を明示
async function createSubscription(
  planId: string,
  userCommitment: Uint8Array,
): Promise<TransactionSignature> {
  // 実装
}

// ❌ 悪い例: any型の使用
async function createSubscription(planId: any): Promise<any> {
  // 実装
}
```

**インターフェース vs 型エイリアス**:
```typescript
// インターフェース: オブジェクト型、拡張が必要な場合
interface BaseSubscription {
  subscriptionId: string;
  planId: string;
  isActive: boolean;
}

interface ActiveSubscription extends BaseSubscription {
  subscribedAt: Date;
  nextBillingAt: Date;
}

// 型エイリアス: ユニオン型、プリミティブ型、タプル
type SubscriptionStatus = 'active' | 'cancelled' | 'expired';
type TransactionResult = { success: true; signature: string } | { success: false; error: Error };
```

### Rust/Anchor 規約

#### 命名規則

```rust
// 変数・関数: snake_case
let subscription_count = 0u64;
fn create_subscription(ctx: Context<CreateSubscription>) -> Result<()> { }

// 構造体・列挙型・トレイト: PascalCase
pub struct Plan {
    pub plan_id: Pubkey,
    pub business: Pubkey,
    pub price_usdc: u64,
}

pub enum SubscriptionStatus {
    Active,
    Cancelled,
    Expired,
}

// 定数: UPPER_SNAKE_CASE
pub const MAX_NAME_LENGTH: usize = 32;
pub const USDC_DECIMALS: u8 = 6;

// モジュール: snake_case
mod subscription;
mod membership_proof;
```

#### Anchorアカウント構造

```rust
// アカウント構造体
#[account]
pub struct Plan {
    /// プランの一意識別子
    pub plan_id: Pubkey,
    /// 事業者アカウントへの参照
    pub business: Pubkey,
    /// 暗号化されたプラン名
    pub encrypted_name: [u8; 32],
    /// 価格（USDC、6桁精度）
    pub price_usdc: u64,
    /// 課金周期（秒）
    pub billing_cycle_seconds: u32,
    /// 作成日時
    pub created_at: i64,
    /// 有効フラグ
    pub is_active: bool,
    /// PDAバンプ
    pub bump: u8,
}

impl Plan {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // plan_id
        + 32                       // business
        + 32                       // encrypted_name
        + 8                        // price_usdc
        + 4                        // billing_cycle_seconds
        + 8                        // created_at
        + 1                        // is_active
        + 1;                       // bump
}
```

#### エラー定義

```rust
#[error_code]
pub enum SublyError {
    #[msg("Plan not found")]
    PlanNotFound,

    #[msg("Subscription already exists")]
    SubscriptionAlreadyExists,

    #[msg("Invalid membership proof")]
    InvalidMembershipProof,

    #[msg("Sanctions check failed")]
    SanctionsCheckFailed,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Unauthorized access")]
    Unauthorized,
}
```

### コードフォーマット

**TypeScript**:
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

**Rust**:
```toml
# rustfmt.toml
edition = "2021"
max_width = 100
tab_spaces = 2
use_small_heuristics = "Max"
```

### コメント規約

**TSDoc形式（TypeScript）**:
```typescript
/**
 * サブスクリプションを作成する
 *
 * @param planId - 契約するプランのID
 * @param userCommitment - ユーザーのコミットメント（秘密情報のハッシュ）
 * @returns トランザクション署名
 * @throws {PlanNotFoundError} プランが見つからない場合
 * @throws {SanctionsCheckFailedError} 制裁チェックに失敗した場合
 *
 * @example
 * ```typescript
 * const signature = await createSubscription(
 *   'plan_abc123',
 *   generateUserCommitment(secret, planId)
 * );
 * ```
 */
async function createSubscription(
  planId: string,
  userCommitment: Uint8Array,
): Promise<TransactionSignature> {
  // 実装
}
```

**Rustdoc形式**:
```rust
/// サブスクリプションを作成する
///
/// # Arguments
///
/// * `ctx` - 命令コンテキスト
/// * `user_commitment` - ユーザーのコミットメント
///
/// # Errors
///
/// * `SublyError::PlanNotFound` - プランが見つからない場合
/// * `SublyError::SanctionsCheckFailed` - 制裁チェックに失敗した場合
///
/// # Example
///
/// ```rust
/// let result = create_subscription(ctx, user_commitment)?;
/// ```
pub fn create_subscription(
    ctx: Context<CreateSubscription>,
    user_commitment: [u8; 32],
) -> Result<()> {
    // 実装
}
```

**インラインコメント**:
```typescript
// ✅ 良い例: なぜそうするかを説明
// Arciumの暗号化ではnonceが必要なため、毎回新しいnonceを生成
const nonce = generateNonce();

// ❌ 悪い例: 何をしているかを繰り返す
// nonceを生成
const nonce = generateNonce();
```

### エラーハンドリング

**TypeScript**:
```typescript
// カスタムエラークラス
export class SublyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SublyError';
  }
}

export class PlanNotFoundError extends SublyError {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`, 'PLAN_NOT_FOUND');
    this.name = 'PlanNotFoundError';
  }
}

export class MembershipVerificationError extends SublyError {
  constructor(message: string) {
    super(message, 'MEMBERSHIP_VERIFICATION_FAILED');
    this.name = 'MembershipVerificationError';
  }
}

// エラーハンドリング
async function verifyAndAccessContent(proof: MembershipProof): Promise<Content> {
  try {
    const isValid = await verifyMembershipProof(proof);
    if (!isValid) {
      throw new MembershipVerificationError('Invalid proof');
    }
    return await fetchMemberContent(proof.planId);
  } catch (error) {
    if (error instanceof MembershipVerificationError) {
      // 予期されるエラー: ユーザーにフィードバック
      logger.warn('Membership verification failed', { proof });
      throw error;
    }
    // 予期しないエラー: ラップして上位に伝播
    throw new SublyError('Failed to access content', 'CONTENT_ACCESS_FAILED');
  }
}
```

**Rust/Anchor**:
```rust
// Result型を使用したエラーハンドリング
pub fn create_subscription(
    ctx: Context<CreateSubscription>,
    user_commitment: [u8; 32],
) -> Result<()> {
    let plan = &ctx.accounts.plan;

    // 前提条件のチェック
    require!(plan.is_active, SublyError::PlanNotFound);

    // 制裁チェック
    let user = &ctx.accounts.user_account;
    require!(
        user.sanctions_passed,
        SublyError::SanctionsCheckFailed
    );

    // 処理の実行
    // ...

    Ok(())
}
```

## Git運用ルール

### ブランチ戦略（Git Flow）

```
main (本番環境)
└── develop (開発・統合環境)
    ├── feature/* (新機能開発)
    ├── fix/* (バグ修正)
    └── release/* (リリース準備)
```

**ブランチ命名規則**:
```
feature/[機能名]     例: feature/subscription-creation
fix/[修正内容]       例: fix/membership-proof-validation
refactor/[対象]      例: refactor/sdk-structure
docs/[対象]          例: docs/api-reference
```

**運用ルール**:
- **main**: 本番リリース済みの安定版コードのみ。直接コミット禁止
- **develop**: 次期リリースに向けた開発コード。PRレビュー必須
- **feature/\*、fix/\***: developから分岐、完了後にPRでdevelopへマージ
- **マージ方針**: feature→develop は squash merge、develop→main は merge commit

### コミットメッセージ規約（Conventional Commits）

**フォーマット**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type一覧**:
| Type | 説明 |
|------|------|
| feat | 新機能 |
| fix | バグ修正 |
| docs | ドキュメント |
| style | フォーマット（コードの動作に影響なし） |
| refactor | リファクタリング |
| perf | パフォーマンス改善 |
| test | テスト追加・修正 |
| build | ビルドシステム |
| ci | CI/CD設定 |
| chore | その他（依存関係更新など） |

**Scope例**:
- `membership`: Protocol A 会員管理
- `vault`: Protocol B 資金運用
- `sdk`: SDK関連
- `program`: Anchorプログラム
- `ui`: フロントエンド

**例**:
```
feat(membership): サブスクリプション契約機能を実装

Arcium MPCを使用した暗号化契約データの生成と保存を実装。
- ユーザーコミットメントの生成
- 暗号化されたサブスクリプションデータの保存
- 契約数のインクリメント（平文）

Closes #45
```

### プルリクエストプロセス

**作成前のチェック**:
- [ ] 全てのテストがパス（`npm test` / `anchor test`）
- [ ] Lintエラーがない（`npm run lint`）
- [ ] 型チェックがパス（`npm run typecheck` / `cargo check`）
- [ ] 競合が解決されている

**PRテンプレート**:
```markdown
## 変更の種類
- [ ] 新機能 (feat)
- [ ] バグ修正 (fix)
- [ ] リファクタリング (refactor)
- [ ] ドキュメント (docs)
- [ ] その他 (chore)

## 変更内容
### 何を変更したか
[簡潔な説明]

### なぜ変更したか
[背景・理由]

### どのように変更したか
- [変更点1]
- [変更点2]

## テスト
### 実施したテスト
- [ ] ユニットテスト追加
- [ ] 統合テスト追加
- [ ] 手動テスト実施

### テスト結果
[テスト結果の説明]

## 関連Issue
Closes #[番号]

## レビューポイント
[レビュアーに特に見てほしい点]
```

**レビュープロセス**:
1. セルフレビュー実施
2. 自動テスト実行（CI）
3. レビュアーアサイン（最低1名）
4. レビューフィードバック対応
5. 承認後マージ

## テスト戦略

### テストピラミッド

```
       /\
      /E2E\       少 (遅い、高コスト)
     /------\
    / 統合   \     中
   /----------\
  / ユニット   \   多 (速い、低コスト)
 /--------------\
```

**目標比率**:
- ユニットテスト: 70%
- 統合テスト: 20%
- E2Eテスト: 10%

### カバレッジ目標

| 対象 | 目標カバレッジ |
|------|----------------|
| 全体 | 80% |
| ビジネスロジック（services/） | 90% |
| Anchorプログラム | 90% |
| UI層 | 70% |

### テスト命名規則

**パターン**: `[対象]_[条件]_[期待結果]`

```typescript
describe('SubscriptionService', () => {
  describe('createSubscription', () => {
    it('should create subscription when valid plan and user', async () => {
      // Given-When-Then
    });

    it('should throw PlanNotFoundError when plan does not exist', async () => {
      // Given-When-Then
    });

    it('should throw SanctionsCheckFailedError when user is sanctioned', async () => {
      // Given-When-Then
    });
  });
});
```

### モック・スタブの使用

```typescript
// 外部依存をモック化
const mockArciumClient = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  queueComputation: jest.fn(),
};

const mockLightProtocol = {
  generateProof: jest.fn(),
  verifyProof: jest.fn(),
};

// サービスは実際の実装を使用
const service = new MembershipService(mockArciumClient, mockLightProtocol);
```

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] 要件を満たしているか
- [ ] エッジケースが考慮されているか
- [ ] エラーハンドリングが適切か

**セキュリティ（重要）**:
- [ ] 秘密情報がハードコードされていないか
- [ ] ユーザー入力が適切に検証されているか
- [ ] Anchorの制約（constraints）が適切か
- [ ] プライバシー要件が満たされているか

**可読性**:
- [ ] 命名が明確か
- [ ] コメントが適切か
- [ ] 複雑なロジックが説明されているか

**パフォーマンス**:
- [ ] 不要な計算がないか
- [ ] オンチェーンの計算ユニット（CU）を考慮しているか

### レビューコメントの書き方

**優先度の明示**:
```markdown
[必須] セキュリティ: 秘密鍵が環境変数ではなくハードコードされています
[推奨] パフォーマンス: この処理はオフチェーンで行う方がCU効率が良いです
[提案] 可読性: この関数名をもっと明確にできませんか？
[質問] この処理の意図を教えてください
```

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | 24.x | `nvm install 24` |
| Rust | 1.87+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | 2.x | `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"` |
| Anchor CLI | 0.31+ | `cargo install --git https://github.com/coral-xyz/anchor anchor-cli` |
| pnpm | 9.x | `npm install -g pnpm` |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone https://github.com/[org]/subly.git
cd subly

# 2. 依存関係のインストール
pnpm install

# 3. 環境変数の設定
cp .env.example .env
# .envファイルを編集

# 4. Solana設定
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json

# 5. Anchorビルド
anchor build

# 6. テスト実行
anchor test
pnpm test
```

### 推奨VSCode拡張機能

- **Rust Analyzer**: Rust言語サポート
- **ESLint**: TypeScript/JavaScriptリンター
- **Prettier**: コードフォーマッター
- **Anchor**: Anchor Framework サポート

## 自動化

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test
      - run: anchor build
      - run: anchor test
```

### Pre-commit フック

```json
// package.json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.rs": [
      "rustfmt"
    ]
  }
}
```

## チェックリスト

### 実装完了前

**コード品質**:
- [ ] 命名が明確で一貫している
- [ ] 関数が単一の責務を持っている
- [ ] マジックナンバーがない
- [ ] 型注釈が適切に記載されている
- [ ] エラーハンドリングが実装されている

**セキュリティ**:
- [ ] 入力検証が実装されている
- [ ] 秘密情報がハードコードされていない
- [ ] Anchorの制約が適切に設定されている

**テスト**:
- [ ] ユニットテストが書かれている
- [ ] テストがパスする
- [ ] エッジケースがカバーされている

**ドキュメント**:
- [ ] 関数・クラスにドキュメントコメントがある
- [ ] 複雑なロジックにコメントがある

### リリース前

- [ ] 全てのテストがパス
- [ ] Lintエラーがない
- [ ] 型チェックがパス
- [ ] コードレビュー承認済み
- [ ] 関連ドキュメントが更新されている
