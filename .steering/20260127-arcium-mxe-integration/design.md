# 設計書: Arcium MXE統合

## アーキテクチャ概要

### 処理フロー

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. ユーザーがsubscribe命令を呼び出し                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Anchor Program                                                        │
│    - Subscriptionアカウント作成                                          │
│    - queue_computation() でArciumプログラムにCPI                         │
│    - 引数: 暗号化された現在の契約数、increment=1                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Arcium MXE Cluster                                                    │
│    - 暗号化データを秘密分散に変換                                        │
│    - increment_count回路を実行: new_count = current_count + 1            │
│    - 結果を暗号化して返却                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ 4. arcium_callback (オンチェーン)                                        │
│    - 暗号化された新しい契約数を受け取り                                  │
│    - Plan.encrypted_subscription_countを更新                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Arcis回路設計 (encrypted-ixs)

### increment_count回路

```rust
#[instruction]
pub fn increment_count(
    current_count_ctxt: Enc<Mxe, u64>,  // MXEのみ復号可能
) -> Enc<Mxe, u64> {
    let current = current_count_ctxt.to_arcis();
    let new_count = current + 1;
    current_count_ctxt.owner.from_arcis(new_count)
}
```

### decrement_count回路

```rust
#[instruction]
pub fn decrement_count(
    current_count_ctxt: Enc<Mxe, u64>,
) -> Enc<Mxe, u64> {
    let current = current_count_ctxt.to_arcis();
    // 0未満にならないよう保護
    let new_count = if current > 0 { current - 1 } else { 0 };
    current_count_ctxt.owner.from_arcis(new_count)
}
```

## メインプログラム変更

### 1. #[arcium_program]マクロの追加

```rust
use arcium_macros::arcium_program;

#[arcium_program]
#[program]
pub mod subly_devnet {
    // ...
}
```

### 2. MXEアカウント構造体

```rust
// MXE Account - Arciumとの連携用
#[account]
pub struct MxeAccount {
    pub bump: u8,
}

impl MxeAccount {
    pub const SPACE: usize = 8 + 1; // discriminator + bump
}
```

### 3. 新規命令: initialize_mxe

プログラム初期化時にMXEアカウントを作成する。

```rust
pub fn initialize_mxe(ctx: Context<InitializeMxe>) -> Result<()> {
    let mxe_account = &mut ctx.accounts.mxe_account;
    mxe_account.bump = ctx.bumps.mxe_account;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeMxe<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = MxeAccount::SPACE,
        seeds = [b"mxe"],
        bump
    )]
    pub mxe_account: Account<'info, MxeAccount>,

    pub system_program: Program<'info, System>,
}
```

### 4. subscribe命令の変更

```rust
pub fn subscribe(
    ctx: Context<Subscribe>,
    encrypted_user_commitment: [u8; 32],
    membership_commitment: [u8; 32],
    nonce: u128,
) -> Result<()> {
    // 既存のSubscription作成ロジック
    // ...

    // queue_computationでMXE計算をキュー
    let args = ArgBuilder::new()
        .add_mxe_pubkey(ctx.accounts.mxe_account.key())
        .add_ciphertext(&ctx.accounts.plan_account.encrypted_subscription_count)
        .build();

    queue_computation(
        CpiContext::new(
            ctx.accounts.arcium_program.to_account_info(),
            QueueComputation {
                mxe_account: ctx.accounts.mxe_account.to_account_info(),
                mempool: ctx.accounts.mempool.to_account_info(),
                // ... 他のArciumアカウント
            },
        ),
        args,
        INCREMENT_COUNT_OFFSET, // 回路オフセット
    )?;

    Ok(())
}
```

### 5. arcium_callbackの実装

```rust
#[arcium_callback(encrypted_ix = "increment_count")]
pub fn increment_count_callback(
    ctx: Context<IncrementCountCallback>,
    output: SignedComputationOutputs<IncrementCountOutput>,
) -> Result<()> {
    // 出力を検証
    let result = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account
    ) {
        Ok(IncrementCountOutput { field_0 }) => field_0,
        Err(_) => return Err(SublyError::MxeComputationFailed.into()),
    };

    // Plan.encrypted_subscription_countを更新
    let plan_account = &mut ctx.accounts.plan_account;
    plan_account.encrypted_subscription_count
        .copy_from_slice(&result.ciphertexts[0]);

    // イベント発行
    emit!(SubscriptionCountUpdatedEvent {
        plan: plan_account.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct IncrementCountCallback<'info> {
    #[account(mut)]
    pub plan_account: Account<'info, Plan>,

    /// Arcium required accounts
    pub arcium_program: Program<'info, Arcium>,
    pub comp_def_account: AccountInfo<'info>,
    pub mxe_account: Account<'info, MxeAccount>,
    pub computation_account: AccountInfo<'info>,
    pub cluster_account: AccountInfo<'info>,

    /// CHECK: Instructions sysvar
    #[account(address = sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}
```

## アカウント構造の変更

### 追加するアカウント

| アカウント | PDA Seeds | 用途 |
|-----------|-----------|------|
| MxeAccount | `["mxe"]` | Arcium MXE連携用 |

### 既存アカウントの変更

- `Plan.encrypted_subscription_count`: 初期値を暗号化された0に変更

## 依存関係

既存の依存関係を維持（Cargo.tomlに追加の変更なし）:
- `arcium-client = "0.5.4"`
- `arcium-macros = "0.5.4"`
- `arcium-anchor = "0.5.4"`

## テスト計画

1. **ユニットテスト**: Arcis回路の動作確認（arcium test）
2. **統合テスト**: subscribe→callback→count更新の一連フロー
3. **Devnetテスト**: 実際のMXEクラスターでの動作確認

## 影響範囲

### 変更が必要なファイル

| ファイル | 変更内容 |
|---------|---------|
| `encrypted-ixs/src/lib.rs` | Arcis回路の実装 |
| `programs/subly_devnet/src/lib.rs` | arcium_program, callbacks |
| `programs/subly_devnet/src/state/mod.rs` | MxeAccount export |
| `programs/subly_devnet/src/state/mxe.rs` | MxeAccount構造体（新規） |
| `programs/subly_devnet/src/events.rs` | SubscriptionCountUpdatedEvent |
| `programs/subly_devnet/src/errors.rs` | MXE関連エラー（既存） |
| `packages/membership-sdk/src/client.ts` | initializeMxe, コールバック対応 |

### 後方互換性

- 既存のAPI（subscribe, cancel_subscription）は維持
- MXE初期化が追加で必要（1回のみ）
- クライアントSDKの更新が必要

## リスクと軽減策

| リスク | 軽減策 |
|-------|--------|
| MXE計算の遅延 | タイムアウト処理、リトライロジック |
| SBFツールチェーン互換性 | blake3, constant_time_eqのバージョン固定を維持 |
| コールバック失敗 | エラーイベント発行、手動リカバリー手順 |
