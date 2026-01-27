# 設計: Arcium MXE サブスクリプションステータス暗号化

## 概要

サブスクリプションのステータス情報（`is_active`、`subscribed_at`、`cancelled_at`）をArcium MXE暗号化で保護します。

## アーキテクチャ

### データモデル変更

#### Before（現在）

```rust
pub struct Subscription {
    pub subscribed_at: i64,        // 平文
    pub cancelled_at: i64,         // 平文
    pub is_active: bool,           // 平文
}
```

#### After（変更後）

```rust
pub struct Subscription {
    // 平文フィールド（後方互換性のため保持、将来削除予定）
    pub subscribed_at: i64,
    pub cancelled_at: i64,
    pub is_active: bool,

    // 暗号化フィールド（新規追加）
    pub encrypted_status: [u8; 64],  // 暗号化されたステータス情報
    pub status_nonce: [u8; 16],      // 暗号化ナンス
}
```

### 暗号化データ構造

```rust
// Arcis回路で使用する構造体
pub struct SubscriptionStatus {
    pub is_active: u8,        // 0 = inactive, 1 = active
    pub subscribed_at: i64,   // タイムスタンプ
    pub cancelled_at: i64,    // タイムスタンプ (0 = not cancelled)
}
```

### Arcis回路

#### 1. set_subscription_active

契約時にステータスを「アクティブ」に設定

```rust
#[instruction]
pub fn set_subscription_active(
    timestamp_ctxt: Enc<Mxe, i64>
) -> Enc<Mxe, SubscriptionStatus>
```

#### 2. set_subscription_cancelled

解約時にステータスを「非アクティブ」に更新

```rust
#[instruction]
pub fn set_subscription_cancelled(
    current_status: Enc<Mxe, SubscriptionStatus>,
    cancel_timestamp: Enc<Mxe, i64>
) -> Enc<Mxe, SubscriptionStatus>
```

### コールバック関数

```rust
// 契約完了コールバック
pub fn subscribe_status_callback(ctx: Context<SubscribeStatusCallback>) -> Result<()>

// 解約完了コールバック
pub fn cancel_status_callback(ctx: Context<CancelStatusCallback>) -> Result<()>
```

## 実装アプローチ

### Phase 1: 構造体更新（本フェーズ）

1. Subscription構造体に暗号化フィールドを追加
2. 平文フィールドは後方互換性のため保持
3. SPACEを再計算

### Phase 2: Arcis回路実装（本フェーズ）

1. `set_subscription_active`回路を追加
2. `set_subscription_cancelled`回路を追加

### Phase 3: コールバック実装（本フェーズ）

1. `subscribe_status_callback`を追加
2. `cancel_status_callback`を追加

### Phase 4: CPI統合（将来フェーズ）

1. `queue_computation`の完全統合
2. 既存の`subscribe`/`cancel_subscription`命令との連携

### Phase 5: 平文フィールド削除（将来フェーズ）

1. 完全移行後、平文フィールドを削除
2. マイグレーション処理の実装

## 影響範囲

- `programs/subly_devnet/src/state/subscription.rs`
- `encrypted-ixs/src/lib.rs`
- `programs/subly_devnet/src/lib.rs`
- `programs/subly_devnet/src/events.rs`

## セキュリティ考慮事項

1. 暗号化と平文の両方が存在する過渡期の整合性管理
2. 将来のZK証明との連携を考慮した設計
3. MXEクラスター外からのデータアクセス制御
