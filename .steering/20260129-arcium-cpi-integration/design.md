# 設計書: Arcium CPI統合

## 実装アプローチ

### 選択肢の比較

| アプローチ | メリット | デメリット |
|-----------|---------|-----------|
| **A: `#[arcium_program]`に移行** | Arciumマクロの恩恵を受けられる | `#[program]`との競合、大規模な書き換え |
| **B: 手動CPI実装** | 既存コードへの影響が小さい | ボイラープレートが増える |
| **C: ハイブリッド（推奨）** | 段階的移行が可能 | 複雑性が増す可能性 |

### 推奨: アプローチB（手動CPI実装）

既存の`#[program]`を維持しつつ、Arciumへの`queue_computation` CPIを手動で実装する。

**理由**:
1. 既存のIDL・SDKへの影響を最小化
2. Light Protocol統合との整合性を維持
3. 段階的なArcium統合が可能

---

## アーキテクチャ

### 現在の構造

```
subly_devnet/
├── programs/subly_devnet/src/
│   ├── lib.rs              # メインプログラム（#[program]）
│   ├── instructions/       # 命令ハンドラ
│   ├── state/              # アカウント構造体
│   └── events.rs           # イベント定義
└── encrypted-ixs/src/
    └── lib.rs              # Arcis回路（#[encrypted]）
```

### 変更後の構造

```
subly_devnet/
├── programs/subly_devnet/src/
│   ├── lib.rs              # メインプログラム
│   ├── instructions/
│   │   ├── mod.rs
│   │   ├── subscribe.rs    # 更新: Arcium CPI追加
│   │   ├── cancel_subscription.rs  # 更新: Arcium CPI追加
│   │   ├── create_plan.rs  # 更新: Arcium CPI追加
│   │   └── ...
│   ├── state/
│   │   └── ...
│   ├── events.rs
│   └── arcium/             # 新規: Arcium CPI関連
│       ├── mod.rs
│       ├── cpi.rs          # queue_computation CPI実装
│       └── accounts.rs     # Arciumアカウント構造体
└── encrypted-ixs/src/
    └── lib.rs              # 既存（変更なし）
```

---

## 詳細設計

### 1. Arcium CPIモジュール

#### `src/arcium/accounts.rs`

```rust
use anchor_lang::prelude::*;

/// Arcium MXE計算キューに必要なアカウント
#[derive(Accounts)]
pub struct QueueComputationAccounts<'info> {
    /// 計算をキューするユーザー（支払者）
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Arciumクラスタアカウント
    /// CHECK: Arciumプログラムで検証
    pub cluster: AccountInfo<'info>,

    /// MXEアカウント（暗号化キー管理）
    /// CHECK: Arciumプログラムで検証
    pub mxe_account: AccountInfo<'info>,

    /// 計算結果を格納するアカウント
    /// CHECK: Arciumプログラムで検証
    #[account(mut)]
    pub computation_account: AccountInfo<'info>,

    /// Arciumプログラム
    /// CHECK: プログラムIDで検証
    pub arcium_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

#### `src/arcium/cpi.rs`

```rust
use anchor_lang::prelude::*;
use crate::arcium::accounts::QueueComputationAccounts;

/// Arciumクラスタオフセット（Devnet）
pub const ARCIUM_CLUSTER_OFFSET: u16 = 456;

/// Arciumプログラム ID
pub const ARCIUM_PROGRAM_ID: Pubkey = pubkey!("...");  // 要調査

/// 計算タイプ
pub enum ComputationType {
    IncrementCount,
    DecrementCount,
    InitializeCount,
    SetSubscriptionActive,
    SetSubscriptionCancelled,
}

/// queue_computation CPIを実行
pub fn queue_computation<'info>(
    accounts: &QueueComputationAccounts<'info>,
    computation_type: ComputationType,
    input_data: &[u8],
    callback_program: Pubkey,
    callback_instruction: &str,
) -> Result<()> {
    // TODO: Arciumのqueue_computation命令データを構築
    // TODO: CPI呼び出しを実行

    Ok(())
}
```

### 2. 命令の更新

#### `subscribe`命令の変更

```rust
// 変更前（現在）
pub fn subscribe(...) -> Result<()> {
    // ... アカウント初期化 ...
    subscription_account.encrypted_status = [0u8; 64];  // ← 問題：常にゼロ
    subscription_account.status_nonce = [0u8; 16];
    Ok(())
}

// 変更後
pub fn subscribe<'info>(
    ctx: Context<'_, '_, '_, 'info, Subscribe<'info>>,
    // ... 既存パラメータ ...
) -> Result<()> {
    // ... アカウント初期化 ...

    // Arcium MXEに暗号化計算をキュー
    arcium::cpi::queue_computation(
        &ctx.accounts.arcium_accounts,
        ComputationType::SetSubscriptionActive,
        &timestamp.to_le_bytes(),
        crate::ID,  // コールバック先
        "subscribe_status_callback",
    )?;

    // encrypted_statusはコールバックで更新されるため、ここでは初期化のみ
    subscription_account.encrypted_status = [0u8; 64];
    subscription_account.status_nonce = [0u8; 16];
    subscription_account.pending_encryption = true;  // 新規フラグ

    Ok(())
}
```

### 3. アカウント構造体の更新

#### `Subscription`構造体

```rust
pub struct Subscription {
    // ... 既存フィールド ...

    /// 暗号化処理が保留中かどうか
    /// コールバック受信後にfalseになる
    pub pending_encryption: bool,  // 新規追加
}
```

---

## 調査が必要な項目

### 優先度: 高

1. **Arcium `queue_computation` API仕様**
   - 必要なアカウント一覧
   - 命令データのフォーマット
   - `.arcis`ファイルの参照方法

2. **コールバック呼び出し仕様**
   - コールバック関数の引数形式
   - 呼び出し元の検証方法

3. **Arciumプログラム ID**
   - Devnet環境のプログラムアドレス

### 優先度: 中

4. **テスト環境構築**
   - `arcium test`のDocker環境セットアップ
   - ローカルバリデータとの連携

5. **エラーハンドリング**
   - 計算失敗時のリカバリー
   - タイムアウト処理

---

## 影響範囲

### プログラム変更

| ファイル | 変更内容 |
|---------|---------|
| `lib.rs` | Arciumモジュールのインポート |
| `instructions/subscribe.rs` | CPI呼び出し追加 |
| `instructions/cancel_subscription.rs` | CPI呼び出し追加 |
| `instructions/create_plan.rs` | CPI呼び出し追加 |
| `state/subscription.rs` | `pending_encryption`フラグ追加 |
| `arcium/` (新規) | CPIモジュール |

### SDK変更

| ファイル | 変更内容 |
|---------|---------|
| `client.ts` | 追加アカウントの自動取得 |
| `types/` | 新しいアカウント型の追加 |

### IDL変更

- 命令に追加のアカウントが必要
- `Subscription`構造体に新フィールド

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Arcium API変更 | CPI失敗 | バージョン固定、公式サンプル参照 |
| コールバック遅延 | UX低下 | pending状態の表示、ポーリング実装 |
| 計算コスト超過 | トランザクション失敗 | compute unit制限の調整 |

---

## 参考

- 既存コールバック実装: `lib.rs:255-345`
- Arcis回路: `encrypted-ixs/src/lib.rs`
- デプロイ情報: `docs/privacy-implementation-status.md`
