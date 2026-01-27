# 設計書: 資金フロー実装

## アーキテクチャ概要

現在のオンチェーンプログラムに、実際のトークン移動とKamino統合を追加する。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          現状（帳簿のみ）                                │
├─────────────────────────────────────────────────────────────────────────┤
│  register_deposit() → total_pool_value++ → シェア発行                   │
│  withdraw()         → total_pool_value-- → シェア消却                   │
│  execute_transfer() → total_pool_value-- → シェア消却                   │
│                                                                         │
│  ❌ 実際のトークン移動なし                                              │
│  ❌ Kamino統合なし                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          目標（資金フロー完備）                          │
├─────────────────────────────────────────────────────────────────────────┤
│  register_deposit()                                                     │
│    → Shield Pool ATA残高確認                                            │
│    → Kamino deposit CPI                                                 │
│    → total_pool_value++ → シェア発行                                    │
│                                                                         │
│  withdraw()                                                             │
│    → Kamino withdraw CPI                                                │
│    → total_pool_value-- → シェア消却                                    │
│    → (SDK: Privacy Cash経由で送金)                                      │
│                                                                         │
│  execute_transfer()                                                     │
│    → Kamino withdraw CPI                                                │
│    → total_pool_value-- → シェア消却                                    │
│    → (SDK: Privacy Cash経由で事業者送金)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. 新しいアカウント構造

#### Shield Pool Token Account (追加)

```rust
// ShieldPool に追加するフィールド
pub struct ShieldPool {
    // ... 既存フィールド ...

    /// Shield Pool が保持する USDC Token Account (ATA)
    pub token_account: Pubkey,

    /// Kamino の cToken (利回り付きトークン) を保持するアカウント
    pub kamino_ctoken_account: Pubkey,
}
```

### 2. 命令の変更

#### register_deposit の変更

```rust
#[derive(Accounts)]
pub struct RegisterDeposit<'info> {
    // ... 既存アカウント ...

    /// Shield Pool の USDC Token Account
    #[account(
        mut,
        constraint = shield_pool_token_account.owner == shield_pool.key()
    )]
    pub shield_pool_token_account: Account<'info, TokenAccount>,

    /// Kamino Market
    pub kamino_market: AccountInfo<'info>,

    /// Kamino Reserve (USDC)
    pub kamino_reserve: AccountInfo<'info>,

    /// Kamino cToken アカウント
    #[account(mut)]
    pub kamino_ctoken_account: Account<'info, TokenAccount>,

    /// Token Program
    pub token_program: Program<'info, Token>,

    /// Kamino Program
    pub kamino_program: Program<'info, KaminoLending>,
}
```

処理フロー:
```rust
pub fn register_deposit(ctx: Context<RegisterDeposit>, ...) -> Result<()> {
    // 1. Shield Pool ATA の残高確認（Privacy Cashからの入金確認）
    let expected_balance = ctx.accounts.shield_pool_token_account.amount;
    require!(expected_balance >= amount, VaultError::InsufficientDeposit);

    // 2. Kamino に Deposit (CPI)
    kamino_deposit_cpi(
        ctx.accounts.kamino_program,
        ctx.accounts.shield_pool_token_account,
        ctx.accounts.kamino_ctoken_account,
        amount
    )?;

    // 3. シェア計算・発行（既存ロジック）
    let shares_to_mint = pool.calculate_shares_for_deposit(amount)?;

    // 4. 状態更新
    pool.total_pool_value += amount;
    pool.total_shares += shares_to_mint;

    Ok(())
}
```

#### withdraw の変更

```rust
#[derive(Accounts)]
pub struct Withdraw<'info> {
    // ... 既存アカウント ...

    /// Shield Pool の USDC Token Account
    #[account(mut)]
    pub shield_pool_token_account: Account<'info, TokenAccount>,

    /// Kamino 関連アカウント
    pub kamino_market: AccountInfo<'info>,
    pub kamino_reserve: AccountInfo<'info>,
    #[account(mut)]
    pub kamino_ctoken_account: Account<'info, TokenAccount>,

    /// Token Program
    pub token_program: Program<'info, Token>,
    pub kamino_program: Program<'info, KaminoLending>,
}
```

処理フロー:
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64, ...) -> Result<()> {
    // 1. シェア計算
    let shares_to_burn = pool.calculate_shares_for_withdrawal(amount)?;

    // 2. Kamino から Withdraw (CPI)
    kamino_withdraw_cpi(
        ctx.accounts.kamino_program,
        ctx.accounts.kamino_ctoken_account,
        ctx.accounts.shield_pool_token_account,
        amount
    )?;

    // 3. 状態更新
    pool.total_pool_value -= amount;
    pool.total_shares -= shares_to_burn;

    // 4. SDK側で Privacy Cash 経由の送金を実行
    // (オンチェーンでは Shield Pool ATA に USDC が残る)

    Ok(())
}
```

### 3. Kamino CPI モジュール

```rust
// programs/subly-vault/src/integrations/kamino_cpi.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

/// Kamino Lending への Deposit CPI
pub fn kamino_deposit<'info>(
    kamino_program: &AccountInfo<'info>,
    from_token_account: &Account<'info, TokenAccount>,
    ctoken_account: &Account<'info, TokenAccount>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    // Kamino SDK の deposit instruction を構築
    // CPI で呼び出し
    todo!("Kamino deposit CPI implementation")
}

/// Kamino Lending からの Withdraw CPI
pub fn kamino_withdraw<'info>(
    kamino_program: &AccountInfo<'info>,
    ctoken_account: &Account<'info, TokenAccount>,
    to_token_account: &Account<'info, TokenAccount>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    // Kamino SDK の withdraw instruction を構築
    // CPI で呼び出し
    todo!("Kamino withdraw CPI implementation")
}
```

### 4. total_pool_value の更新メカニズム

Kaminoの収益を反映するため、定期的に `total_pool_value` を更新する必要がある。

#### オプション A: オンチェーン更新命令

```rust
/// Pool価値を更新（Kamino収益を反映）
pub fn update_pool_value(ctx: Context<UpdatePoolValue>) -> Result<()> {
    let kamino_position_value = get_kamino_position_value(
        &ctx.accounts.kamino_market,
        &ctx.accounts.kamino_ctoken_account
    )?;

    let pool = &mut ctx.accounts.shield_pool;
    pool.total_pool_value = kamino_position_value;
    pool.last_yield_update = Clock::get()?.unix_timestamp;

    Ok(())
}
```

#### オプション B: SDK側で計算

```typescript
// SDK でリアルタイム計算
async getActualPoolValue(): Promise<bigint> {
    const kaminoValue = await this.kamino.getKaminoYieldInfo();
    return BigInt(kaminoValue.currentValue * 1e6);
}
```

### 5. SDK側の変更

#### deposit() の変更

```typescript
async deposit(params: DepositParams): Promise<TransactionResult> {
    // 1. Privacy Cash に deposit
    await this.privacyCash.depositPrivateUSDC(params.amountUsdc);

    // 2. Privacy Cash から Shield Pool ATA に withdraw
    await this.privacyCash.withdrawPrivateUSDC(
        params.amountUsdc,
        this.getShieldPoolTokenAccount().toBase58()
    );

    // 3. register_deposit 呼び出し
    // → オンチェーンで Kamino deposit が実行される
    const result = await this.registerDeposit({ ... });

    return result;
}
```

#### executeScheduledTransfer() の変更

```typescript
async executeScheduledTransfer(transferId: PublicKey): Promise<TransactionResult> {
    // 1. オンチェーン execute_transfer 呼び出し
    // → Kamino withdraw が実行され、Shield Pool ATA に USDC が入る
    await this.program.methods.executeTransfer(...).rpc();

    // 2. ローカルから recipient 取得
    const localTransfer = await this.localStorage.getTransfer(transferId);

    // 3. Shield Pool ATA から Privacy Cash 経由で事業者に送金
    // (この部分の権限管理が課題)
    await this.privacyCash.withdrawPrivateUSDC(
        localTransfer.amount,
        localTransfer.recipient
    );

    return result;
}
```

## 課題と検討事項

### 1. Shield Pool ATA からの送金権限

**問題**: Shield Pool ATA から Privacy Cash への送金には、Pool の署名が必要

**解決策**:
- オプション A: Pool Authority が署名する専用命令を追加
- オプション B: PDA 署名を使用
- オプション C: 2段階（オンチェーン承認 → オフチェーン実行）

### 2. Kamino CPI の複雑さ

**問題**: Kamino の deposit/withdraw は多数のアカウントを必要とする

**解決策**:
- Kamino SDK のドキュメントを参照して正確なアカウント構造を把握
- テスト環境での検証

### 3. トランザクションサイズ制限

**問題**: Kamino CPI を含むとトランザクションが大きくなる可能性

**解決策**:
- 複数トランザクションに分割
- Lookup Table の使用

### 4. Privacy Cash との連携

**問題**: Privacy Cash は独立したプロトコル。Shield Pool との統合方法

**解決策**:
- SDK レベルで連携（オンチェーン連携は不要）
- Privacy Cash の note_commitment を検証に使用（既存設計）

## データフロー図

### 入金フロー（詳細）

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ユーザー   │    │ Privacy Cash │    │ Shield Pool │    │   Kamino    │
│   Wallet    │    │             │    │    ATA      │    │   Lending   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. depositSPL()  │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ 2. withdrawSPL(ShieldPoolATA)       │                  │
       │─────────────────>│                  │                  │
       │                  │ 3. USDC Transfer │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │ 4. registerDeposit()               │                  │
       │─────────────────────────────────────>│                  │
       │                  │                  │ 5. Kamino CPI    │
       │                  │                  │ deposit()        │
       │                  │                  │─────────────────>│
       │                  │                  │                  │
       │                  │                  │ 6. cToken mint   │
       │                  │                  │<─────────────────│
       │                  │                  │                  │
       │ 7. Success + シェア発行             │                  │
       │<─────────────────────────────────────│                  │
```

### 定期送金フロー（詳細）

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Executor   │    │   Kamino    │    │ Shield Pool │    │   事業者    │
│ (Tuk Tuk)   │    │   Lending   │    │    ATA      │    │  (recipient)│
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. executeTransfer()               │                  │
       │─────────────────────────────────────>│                  │
       │                  │                  │                  │
       │                  │ 2. Kamino CPI    │                  │
       │                  │ withdraw()       │                  │
       │                  │<─────────────────│                  │
       │                  │                  │                  │
       │                  │ 3. USDC Transfer │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │ 4. SDK: Privacy Cash withdrawSPL(recipient)           │
       │─────────────────────────────────────────────────────────>│
       │                  │                  │                  │
       │ 5. Success (recipient はオンチェーンに記録されない)     │
       │<─────────────────────────────────────────────────────────│
```

## 実装の優先順位

1. **Phase 1**: Shield Pool Token Account の追加
2. **Phase 2**: Kamino CPI モジュールの実装
3. **Phase 3**: register_deposit への統合
4. **Phase 4**: withdraw への統合
5. **Phase 5**: execute_transfer への統合
6. **Phase 6**: SDK の更新
7. **Phase 7**: テスト・検証
