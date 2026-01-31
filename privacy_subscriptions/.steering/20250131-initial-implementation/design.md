# 設計書

## アーキテクチャ概要

Arcium 3フェーズパターン（Init/Queue/Callback）を採用し、暗号化データの計算をMPCクラスターで実行します。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Subly Program Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Non-Encrypted Instructions                    │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │    │
│  │  │initialize_      │ │register_        │ │create/update_   │   │    │
│  │  │protocol/pool    │ │merchant         │ │subscription_plan│   │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Encrypted Instructions (3-Phase)              │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │    │
│  │  │  Deposit  │ │ Withdraw  │ │ Subscribe │ │Unsubscribe│       │    │
│  │  │ init/q/cb │ │ init/q/cb │ │ init/q/cb │ │ init/q/cb │       │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                     │    │
│  │  │ Process   │ │  Verify   │ │  Claim    │                     │    │
│  │  │ Payment   │ │Subscription│ │ Revenue   │                     │    │
│  │  └───────────┘ └───────────┘ └───────────┘                     │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Arcium MPC Cluster                          │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │                    Arcis Circuits                        │    │    │
│  │  │  deposit | withdraw | subscribe | unsubscribe           │    │    │
│  │  │  process_payment | verify_subscription | claim_revenue  │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. アカウント構造体

#### ProtocolConfig

```rust
#[account]
pub struct ProtocolConfig {
    pub authority: Pubkey,      // プロトコル管理者
    pub fee_rate_bps: u16,      // 手数料率（BPS: 100 = 1%）
    pub is_paused: bool,        // プロトコル一時停止フラグ
    pub bump: u8,
}
// PDA Seeds: ["protocol_config"]
// サイズ: 8 + 32 + 2 + 1 + 1 = 44 bytes
```

#### ProtocolPool

```rust
#[account]
pub struct ProtocolPool {
    pub mint: Pubkey,           // トークンミント
    pub token_account: Pubkey,  // プールのトークンアカウント
    pub bump: u8,
}
// PDA Seeds: ["protocol_pool", mint]
// サイズ: 8 + 32 + 32 + 1 = 73 bytes
```

#### Merchant

```rust
#[account]
pub struct Merchant {
    pub wallet: Pubkey,         // 事業者ウォレット
    pub name: [u8; 64],         // 事業者名
    pub is_active: bool,        // 有効フラグ
    pub registered_at: i64,     // 登録日時
    pub bump: u8,
}
// PDA Seeds: ["merchant", wallet]
// サイズ: 8 + 32 + 64 + 1 + 8 + 1 = 114 bytes
```

#### MerchantLedger

```rust
#[account]
pub struct MerchantLedger {
    pub merchant: Pubkey,                    // 事業者
    pub mint: Pubkey,                        // トークンミント
    pub encrypted_balance: [u8; 64],         // 暗号化された残高
    pub encrypted_total_claimed: [u8; 64],   // 暗号化された累計引き出し額
    pub bump: u8,
}
// PDA Seeds: ["merchant_ledger", merchant, mint]
// サイズ: 8 + 32 + 32 + 64 + 64 + 1 = 201 bytes
```

#### SubscriptionPlan

```rust
#[account]
pub struct SubscriptionPlan {
    pub merchant: Pubkey,           // 事業者
    pub plan_id: u64,               // プランID（事業者ごとの連番）
    pub name: [u8; 32],             // プラン名
    pub mint: Pubkey,               // 支払いトークン
    pub price: u64,                 // 料金
    pub billing_cycle_days: u32,    // 請求サイクル（日数）
    pub is_active: bool,            // 有効フラグ
    pub created_at: i64,            // 作成日時
    pub bump: u8,
}
// PDA Seeds: ["subscription_plan", merchant, plan_id.to_le_bytes()]
// サイズ: 8 + 32 + 8 + 32 + 32 + 8 + 4 + 1 + 8 + 1 = 134 bytes
```

#### UserLedger

```rust
#[account]
pub struct UserLedger {
    pub user: Pubkey,                               // ユーザー
    pub mint: Pubkey,                               // トークンミント
    pub encrypted_balance: [u8; 64],                // 暗号化された残高
    pub encrypted_subscription_count: [u8; 64],     // 暗号化されたサブスクカウンター
    pub last_updated: i64,                          // 最終更新日時
    pub bump: u8,
}
// PDA Seeds: ["user_ledger", user, mint]
// サイズ: 8 + 32 + 32 + 64 + 64 + 8 + 1 = 209 bytes
```

#### UserSubscription

```rust
#[account]
pub struct UserSubscription {
    pub user: Pubkey,                               // ユーザー
    pub subscription_index: u64,                    // サブスクインデックス
    pub encrypted_plan: [u8; 64],                   // 暗号化されたプラン
    pub encrypted_status: [u8; 32],                 // 暗号化されたステータス
    pub encrypted_next_payment_date: [u8; 32],      // 暗号化された次回支払日
    pub encrypted_start_date: [u8; 32],             // 暗号化された開始日
    pub bump: u8,
}
// PDA Seeds: ["user_subscription", user, subscription_index.to_le_bytes()]
// サイズ: 8 + 32 + 8 + 64 + 32 + 32 + 32 + 1 = 209 bytes
```

### 2. 非暗号化インストラクション

#### initialize_protocol

**責務**:
- ProtocolConfig PDAの初期化
- 手数料率の設定

**実装の要点**:
- authorityは署名者から取得
- fee_rate_bpsは最大10000（100%）まで
- is_pausedは初期値false

#### initialize_pool

**責務**:
- ProtocolPool PDAの初期化
- プールトークンアカウントの作成

**実装の要点**:
- mintごとに1つのプール
- Associated Token Accountを使用

#### register_merchant

**責務**:
- Merchant PDAの初期化
- MerchantLedger PDAの初期化（暗号化初期残高0）

**実装の要点**:
- walletは署名者から取得
- nameは最大64バイト
- registered_atはClock::get()から取得

#### create_subscription_plan

**責務**:
- SubscriptionPlan PDAの初期化

**実装の要点**:
- plan_idはMerchant内でユニークである必要あり（引数で指定）
- priceは0より大きい
- billing_cycle_daysは1-365の範囲

#### update_subscription_plan

**責務**:
- SubscriptionPlanの更新

**実装の要点**:
- merchantの署名が必要
- 料金変更は既存サブスクに影響しない

### 3. 暗号化インストラクション（Arcium 3フェーズ）

#### Deposit

**Queue Phase: deposit**

```rust
pub fn deposit(
    ctx: Context<Deposit>,
    computation_offset: u64,
    amount: u64,                    // 平文（Pool への実送金額）
    encrypted_amount: EncryptedValue,  // 暗号化（帳簿更新用）
) -> Result<()>
```

**処理フロー**:
1. ユーザーからPoolへトークンを転送（amount）
2. Arciumにdepositキューを追加
3. MPCでUserLedgerの暗号化残高を加算
4. コールバックで新残高を保存

**Callback Phase: deposit_callback**
- 出力: encrypted_new_balance
- UserLedgerを更新

#### Withdraw

**Queue Phase: withdraw**

```rust
pub fn withdraw(
    ctx: Context<Withdraw>,
    computation_offset: u64,
    encrypted_amount: EncryptedValue,  // 暗号化引き出し額
) -> Result<()>
```

**処理フロー**:
1. Arciumにwithdrawキューを追加
2. MPCで残高検証 + 残高減算
3. コールバックで残高更新 + 実送金

**Callback Phase: withdraw_callback**
- 出力: encrypted_new_balance, withdraw_amount (平文)
- UserLedger更新 + Pool→ユーザーへ送金

#### Subscribe

**Queue Phase: subscribe**

```rust
pub fn subscribe(
    ctx: Context<Subscribe>,
    computation_offset: u64,
    encrypted_plan: EncryptedValue,     // 暗号化されたプラン
    encrypted_price: EncryptedValue,    // 暗号化された価格
) -> Result<()>
```

**処理フロー**:
1. Arciumにsubscribeキューを追加
2. MPCでプラン検証 + 残高検証 + 初回支払い
3. コールバックでUserSubscription作成 + 帳簿更新

**Callback Phase: subscribe_callback**
- 出力: 暗号化されたサブスク状態、更新された帳簿残高

#### ProcessPayment

**Queue Phase: process_payment**

```rust
pub fn process_payment(
    ctx: Context<ProcessPayment>,
    computation_offset: u64,
) -> Result<()>
```

**処理フロー**:
1. Arciumにprocess_paymentキューを追加
2. MPCで支払日チェック + 残高検証 + 帳簿更新
3. コールバックで帳簿更新 or 自動解約

**Callback Phase: process_payment_callback**
- 出力: 更新された帳簿残高、サブスク状態、次回支払日

### 4. Arcis回路設計

#### deposit_circuit

```rust
#[instruction]
pub fn deposit_circuit(
    current_balance: Enc<Mxe, u64>,
    deposit_amount: Enc<Shared, u64>,
) -> Enc<Mxe, u64> {
    let current = current_balance.to_arcis();
    let amount = deposit_amount.to_arcis();
    let new_balance = current + amount;
    current_balance.owner.from_arcis(new_balance)
}
```

#### withdraw_circuit

```rust
#[instruction]
pub fn withdraw_circuit(
    current_balance: Enc<Mxe, u64>,
    withdraw_amount: Enc<Shared, u64>,
) -> (Enc<Mxe, u64>, u64) {
    let current = current_balance.to_arcis();
    let amount = withdraw_amount.to_arcis();

    // 残高検証
    let has_balance = current.ge(&amount);

    // 条件付き減算
    let new_balance = if has_balance {
        current - amount
    } else {
        current  // 残高不足時は変更なし
    };

    (
        current_balance.owner.from_arcis(new_balance),
        if has_balance { amount.reveal() } else { 0 }
    )
}
```

#### subscribe_circuit

```rust
#[instruction]
pub fn subscribe_circuit(
    user_balance: Enc<Mxe, u64>,
    merchant_balance: Enc<Mxe, u64>,
    subscription_count: Enc<Mxe, u64>,
    plan_pubkey: Enc<Shared, [u8; 32]>,
    price: Enc<Shared, u64>,
    current_timestamp: i64,
    billing_cycle_days: u32,
) -> SubscribeOutput {
    // 残高検証
    let user_bal = user_balance.to_arcis();
    let merchant_bal = merchant_balance.to_arcis();
    let price_val = price.to_arcis();
    let count = subscription_count.to_arcis();

    let has_balance = user_bal.ge(&price_val);

    // 帳簿更新
    let new_user_bal = user_bal - price_val;
    let new_merchant_bal = merchant_bal + price_val;
    let new_count = count + 1;

    // 次回支払日
    let next_payment = current_timestamp + (billing_cycle_days as i64 * 86400);

    SubscribeOutput {
        new_user_balance: user_balance.owner.from_arcis(new_user_bal),
        new_merchant_balance: merchant_balance.owner.from_arcis(new_merchant_bal),
        new_subscription_count: subscription_count.owner.from_arcis(new_count),
        encrypted_plan: plan_pubkey.owner.from_arcis(plan_pubkey.to_arcis()),
        encrypted_status: 0u8, // Active
        encrypted_next_payment_date: next_payment,
        encrypted_start_date: current_timestamp,
        success: has_balance.reveal(),
    }
}
```

#### process_payment_circuit

```rust
#[instruction]
pub fn process_payment_circuit(
    user_balance: Enc<Mxe, u64>,
    merchant_balance: Enc<Mxe, u64>,
    subscription_status: Enc<Mxe, u8>,
    next_payment_date: Enc<Mxe, i64>,
    current_timestamp: i64,
    plan_price: u64,
    billing_cycle_days: u32,
) -> ProcessPaymentOutput {
    let user_bal = user_balance.to_arcis();
    let merchant_bal = merchant_balance.to_arcis();
    let status = subscription_status.to_arcis();
    let next_date = next_payment_date.to_arcis();

    // Active かつ 支払日到来
    let is_active = status.eq(&0u8);
    let is_due = next_date.le(&current_timestamp);
    let should_process = is_active & is_due;

    // 残高検証
    let has_balance = user_bal.ge(&plan_price);
    let can_pay = should_process & has_balance;

    // 帳簿更新
    let new_user_bal = if can_pay { user_bal - plan_price } else { user_bal };
    let new_merchant_bal = if can_pay { merchant_bal + plan_price } else { merchant_bal };

    // ステータス更新
    let new_status = if should_process & !has_balance { 1u8 } else { status }; // Cancelled

    // 次回支払日
    let cycle_seconds = (billing_cycle_days as i64) * 86400;
    let new_next_date = if can_pay { next_date + cycle_seconds } else { next_date };

    ProcessPaymentOutput {
        new_user_balance: user_balance.owner.from_arcis(new_user_bal),
        new_merchant_balance: merchant_balance.owner.from_arcis(new_merchant_bal),
        new_status: subscription_status.owner.from_arcis(new_status),
        new_next_payment_date: next_payment_date.owner.from_arcis(new_next_date),
        payment_processed: can_pay.reveal(),
    }
}
```

## データフロー

### Deposit フロー

```
1. ユーザーがdeposit(amount, encrypted_amount)を呼び出し
2. Poolへトークンを転送
3. Arciumにqueue_computation
4. MPC: current_balance + deposit_amount = new_balance
5. deposit_callback: UserLedger.encrypted_balance = new_balance
```

### Subscribe フロー

```
1. ユーザーがsubscribe(encrypted_plan, encrypted_price)を呼び出し
2. Arciumにqueue_computation
3. MPC:
   - 残高検証 (user_balance >= price)
   - UserLedger.balance -= price
   - MerchantLedger.balance += price
   - subscription_count++
   - UserSubscription状態を生成
4. subscribe_callback:
   - UserLedger更新
   - MerchantLedger更新
   - UserSubscription PDA作成
```

### ProcessPayment フロー

```
1. Cron/外部がprocess_payment(subscription)を呼び出し
2. Arciumにqueue_computation
3. MPC:
   - status == Active かチェック
   - next_payment_date <= now かチェック
   - 残高検証
   - 帳簿更新 or 自動解約
4. process_payment_callback:
   - UserLedger更新
   - MerchantLedger更新
   - UserSubscription更新
```

## エラーハンドリング戦略

### カスタムエラーコード

```rust
#[error_code]
pub enum SublyError {
    #[msg("The computation was aborted")]
    AbortedComputation,

    #[msg("Cluster not set")]
    ClusterNotSet,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Invalid fee rate")]
    InvalidFeeRate,

    #[msg("Invalid price")]
    InvalidPrice,

    #[msg("Invalid billing cycle")]
    InvalidBillingCycle,

    #[msg("Name too long")]
    NameTooLong,

    #[msg("Merchant not active")]
    MerchantNotActive,

    #[msg("Plan not active")]
    PlanNotActive,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Subscription not active")]
    SubscriptionNotActive,
}
```

## テスト戦略

### ユニットテスト（Rust）
- アカウント構造体のサイズ検証
- PDAシード計算の検証
- エラーコードの網羅

### 統合テスト（TypeScript）

#### テストシナリオ1: プロトコル初期化
```typescript
describe("Protocol Initialization", () => {
  it("initializes protocol config correctly");
  it("initializes protocol pool correctly");
  it("fails with invalid fee rate");
});
```

#### テストシナリオ2: 事業者フロー
```typescript
describe("Merchant Flow", () => {
  it("registers merchant correctly");
  it("creates subscription plan correctly");
  it("updates subscription plan correctly");
});
```

#### テストシナリオ3: ユーザーフロー
```typescript
describe("User Flow", () => {
  it("deposits to pool correctly");
  it("subscribes to plan correctly");
  it("processes payment correctly");
  it("unsubscribes correctly");
  it("withdraws from pool correctly");
});
```

## 依存ライブラリ

### Rust (Cargo.toml)

```toml
[dependencies]
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
arcium-anchor = "=0.6.3"
arcium-macros = "=0.6.3"

[dev-dependencies]
arcium-client = "=0.6.3"
```

### Arcis (encrypted-ixs/Cargo.toml)

```toml
[dependencies]
arcis = "=0.6.3"
```

## ディレクトリ構造

```
programs/privacy_subscriptions/src/
├── lib.rs                      # エントリポイント + 全インストラクション
├── state/                      # アカウント状態（将来の分割用）
│   └── mod.rs
├── instructions/               # インストラクション（将来の分割用）
│   └── mod.rs
└── errors.rs                   # エラーコード

encrypted-ixs/src/
└── lib.rs                      # 全Arcis回路

tests/
└── privacy_subscriptions.ts    # 統合テスト
```

## 実装の順序

### フェーズ1: 基盤（非暗号化）
1. アカウント構造体の定義
2. エラーコードの定義
3. initialize_protocol
4. initialize_pool
5. register_merchant
6. create_subscription_plan
7. update_subscription_plan
8. フェーズ1の統合テスト

### フェーズ2: 暗号化インストラクション
1. Arcis回路の実装（全7回路）
2. Deposit (init/queue/callback)
3. Withdraw (init/queue/callback)
4. Subscribe (init/queue/callback)
5. Unsubscribe (init/queue/callback)
6. ProcessPayment (init/queue/callback)
7. VerifySubscription (init/queue/callback)
8. ClaimRevenue (init/queue/callback)
9. フェーズ2の統合テスト

### フェーズ3: 品質チェック
1. 全テスト実行
2. ビルド確認
3. Devnetデプロイテスト

## セキュリティ考慮事項

- **署名検証**: 全インストラクションで適切な署名者チェック
- **PDA検証**: derive_*マクロによるアドレス検証
- **残高検証**: MPC内で暗号化された状態で残高検証
- **Callback検証**: verify_output()による署名検証
- **オーバーフロー防止**: checked_add/checked_subの使用

## パフォーマンス考慮事項

- **Compute Units**: 各インストラクションで200,000 CU以内
- **アカウントサイズ**: 各PDAは10KB以内（実際は最大209バイト）
- **MPC レイテンシ**: 暗号化処理で2-5秒のレイテンシを許容

## 将来の拡張性

- **SDK**: TypeScriptクライアントの追加（次フェーズ）
- **Dashboard**: Webフロントエンドの追加（次フェーズ）
- **Clockwork**: 自動支払いトリガーの統合（次フェーズ）
- **CSPL対応**: Confidential SPLトークン対応（将来）
- **マルチチェーン**: Ethereum L2等への展開（将来）
