use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod integrations;
pub mod state;

use constants::*;
use errors::VaultError;
use events::*;
use instructions::*;
use state::*;

declare_id!("BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL");

#[program]
pub mod subly_vault {
    use super::*;

    /// Initialize the Shield Pool
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        pool.pool_id = pool.key();
        pool.authority = ctx.accounts.authority.key();
        pool.total_pool_value = 0;
        pool.total_shares = 0;
        pool.kamino_obligation = Pubkey::default();
        pool.last_yield_update = clock.unix_timestamp;
        pool.nonce = 0;
        pool.bump = ctx.bumps.shield_pool;
        pool.is_active = true;
        pool.token_account = ctx.accounts.pool_token_account.key();
        pool.kamino_ctoken_account = ctx.accounts.pool_ctoken_account.key();
        pool._reserved = [0u8; 64];

        emit!(PoolInitialized {
            pool: pool.key(),
            authority: pool.authority,
            timestamp: clock.unix_timestamp,
        });

        msg!("Shield Pool initialized: {}", pool.key());
        msg!("  Token Account: {}", pool.token_account);
        msg!("  cToken Account: {}", pool.kamino_ctoken_account);
        Ok(())
    }

    /// Register a private deposit from Privacy Cash
    ///
    /// This is the preferred method for deposits as it preserves privacy.
    /// The registrar (relayer or pool authority) registers the deposit
    /// without exposing the user's wallet address.
    ///
    /// Flow:
    /// 1. Verify deposit amount meets requirements
    /// 2. Verify pool token account has sufficient balance (Privacy Cash has already deposited)
    /// 3. Calculate shares to mint
    /// 4. Deposit USDC to Kamino for yield generation
    /// 5. Update pool state
    pub fn register_deposit(
        ctx: Context<RegisterDeposit>,
        note_commitment: [u8; 32],
        user_commitment: [u8; 32],
        encrypted_share: [u8; 64],
        amount: u64,
    ) -> Result<()> {
        require!(
            amount >= MIN_DEPOSIT_AMOUNT,
            VaultError::InsufficientDeposit
        );
        require!(
            amount <= MAX_DEPOSIT_AMOUNT,
            VaultError::DepositExceedsMaximum
        );

        // Verify pool token account has sufficient balance
        // (Privacy Cash should have already transferred USDC to this account)
        let pool_token_balance = ctx.accounts.pool_token_account.amount;
        require!(
            pool_token_balance >= amount,
            VaultError::InsufficientBalance
        );

        // Calculate shares for this deposit before mutable borrow
        let shares_to_mint = ctx
            .accounts
            .shield_pool
            .calculate_shares_for_deposit(amount)
            .ok_or(VaultError::InvalidShareCalculation)?;

        require!(shares_to_mint > 0, VaultError::InvalidShareCalculation);

        // Deposit USDC to Kamino for yield generation (before mutable borrows)
        ctx.accounts.deposit_to_kamino(amount)?;

        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        // Initialize note commitment registry (prevents double registration)
        let registry = &mut ctx.accounts.note_commitment_registry;
        registry.note_commitment = note_commitment;
        registry.user_commitment = user_commitment;
        registry.amount = amount;
        registry.registered_at = clock.unix_timestamp;
        registry.pool = pool.key();
        registry.bump = ctx.bumps.note_commitment_registry;
        registry._reserved = [0u8; 31];

        // Initialize or update user share
        let user_share = &mut ctx.accounts.user_share;
        if user_share.pool == Pubkey::default() {
            // New user - initialize
            user_share.share_id = user_share.key();
            user_share.pool = pool.key();
            user_share.user_commitment = user_commitment;
            user_share.bump = ctx.bumps.user_share;
            user_share._reserved = [0u8; 32];
        }

        // Update encrypted share amount
        user_share.encrypted_share_amount = encrypted_share;
        user_share.last_update = clock.unix_timestamp;

        // Update pool totals
        pool.total_pool_value = pool
            .total_pool_value
            .checked_add(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.total_shares = pool
            .total_shares
            .checked_add(shares_to_mint)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.nonce = pool
            .nonce
            .checked_add(1)
            .ok_or(VaultError::ArithmeticOverflow)?;

        emit!(PrivateDepositRegistered {
            pool: pool.key(),
            note_commitment,
            shares_minted: shares_to_mint,
            pool_value_after: pool.total_pool_value,
            total_shares_after: pool.total_shares,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Private deposit registered: {} USDC, {} shares minted",
            amount,
            shares_to_mint
        );
        msg!("  USDC deposited to Kamino for yield generation");

        Ok(())
    }

    /// Deposit USDC into the Shield Pool
    /// DEPRECATED: Use register_deposit for privacy-preserving deposits
    #[deprecated(note = "Use register_deposit for privacy-preserving deposits")]
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        commitment: [u8; 32],
        encrypted_share: [u8; 64],
        _deposit_index: u64,
    ) -> Result<()> {
        require!(
            amount >= MIN_DEPOSIT_AMOUNT,
            VaultError::InsufficientDeposit
        );
        require!(
            amount <= MAX_DEPOSIT_AMOUNT,
            VaultError::DepositExceedsMaximum
        );

        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        require!(pool.is_active, VaultError::PoolNotInitialized);

        let shares_to_mint = pool
            .calculate_shares_for_deposit(amount)
            .ok_or(VaultError::InvalidShareCalculation)?;

        require!(shares_to_mint > 0, VaultError::InvalidShareCalculation);

        let user_share = &mut ctx.accounts.user_share;
        if user_share.pool == Pubkey::default() {
            user_share.share_id = user_share.key();
            user_share.pool = pool.key();
            user_share.user_commitment = commitment;
            user_share.bump = ctx.bumps.user_share;
            user_share._reserved = [0u8; 32];
        }

        user_share.encrypted_share_amount = encrypted_share;
        user_share.last_update = clock.unix_timestamp;

        let history = &mut ctx.accounts.deposit_history;
        history.history_id = history.key();
        history.pool = pool.key();
        history.user_commitment = commitment;
        history.amount = amount;
        history.shares_received = shares_to_mint;
        history.pool_value_at_deposit = pool.total_pool_value;
        history.total_shares_at_deposit = pool.total_shares;
        history.deposited_at = clock.unix_timestamp;
        history.bump = ctx.bumps.deposit_history;

        pool.total_pool_value = pool
            .total_pool_value
            .checked_add(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.total_shares = pool
            .total_shares
            .checked_add(shares_to_mint)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.nonce = pool
            .nonce
            .checked_add(1)
            .ok_or(VaultError::ArithmeticOverflow)?;

        emit!(Deposited {
            pool: pool.key(),
            commitment,
            shares_minted: shares_to_mint,
            pool_value_after: pool.total_pool_value,
            total_shares_after: pool.total_shares,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Deposited {} USDC, minted {} shares",
            amount,
            shares_to_mint
        );
        Ok(())
    }

    /// Withdraw USDC from the Shield Pool
    ///
    /// Flow:
    /// 1. Verify nullifier hasn't been used (prevents double-spend)
    /// 2. Calculate shares to burn
    /// 3. Redeem cTokens from Kamino to get USDC
    /// 4. Update user shares and pool state
    /// 5. (SDK handles) Transfer USDC via Privacy Cash
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
        nullifier_hash: [u8; 32],
        new_encrypted_share: [u8; 64],
        _proof: Vec<u8>,
        _public_inputs: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(amount > 0, VaultError::InvalidWithdrawalAmount);

        // Read-only checks first (before mutable borrow)
        require!(
            ctx.accounts.shield_pool.is_active,
            VaultError::PoolNotInitialized
        );
        require!(
            ctx.accounts.shield_pool.total_pool_value >= amount,
            VaultError::InsufficientBalance
        );

        let shares_to_burn = ctx
            .accounts
            .shield_pool
            .calculate_shares_for_withdrawal(amount)
            .ok_or(VaultError::InvalidShareCalculation)?;

        require!(shares_to_burn > 0, VaultError::InvalidShareCalculation);
        require!(
            shares_to_burn <= ctx.accounts.shield_pool.total_shares,
            VaultError::InsufficientBalance
        );

        // Check nullifier before CPI
        require!(
            !ctx.accounts.nullifier.is_used,
            VaultError::NullifierAlreadyUsed
        );

        // Redeem cTokens from Kamino to get USDC (before mutable borrows)
        // Note: Using amount as collateral_amount assumes 1:1 ratio
        // In production, this should be calculated based on exchange rate
        ctx.accounts.redeem_from_kamino(amount)?;

        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        let nullifier = &mut ctx.accounts.nullifier;
        nullifier.nullifier = nullifier_hash;
        nullifier.is_used = true;
        nullifier.used_at = clock.unix_timestamp;
        nullifier.operation_type = OperationType::Withdraw;
        nullifier.bump = ctx.bumps.nullifier;

        let user_share = &mut ctx.accounts.user_share;
        let commitment = user_share.user_commitment;
        user_share.encrypted_share_amount = new_encrypted_share;
        user_share.last_update = clock.unix_timestamp;

        pool.total_pool_value = pool
            .total_pool_value
            .checked_sub(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.total_shares = pool
            .total_shares
            .checked_sub(shares_to_burn)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.nonce = pool
            .nonce
            .checked_add(1)
            .ok_or(VaultError::ArithmeticOverflow)?;

        emit!(Withdrawn {
            pool: pool.key(),
            commitment,
            amount,
            shares_burned: shares_to_burn,
            nullifier: nullifier_hash,
            pool_value_after: pool.total_pool_value,
            total_shares_after: pool.total_shares,
            timestamp: clock.unix_timestamp,
        });

        msg!("Withdrew {} USDC, burned {} shares", amount, shares_to_burn);
        msg!("  USDC redeemed from Kamino, ready for Privacy Cash transfer");
        Ok(())
    }

    /// Set up a privacy-preserving recurring transfer
    ///
    /// The recipient address is encrypted and stored in `encrypted_transfer_data`.
    /// The actual recipient is known only to the user and stored locally.
    /// At execution time, the user provides the recipient to Privacy Cash.
    pub fn setup_transfer(
        ctx: Context<SetupTransfer>,
        encrypted_transfer_data: [u8; 128],
        amount: u64,
        interval_seconds: u32,
        _transfer_nonce: u64,
    ) -> Result<()> {
        require!(amount > 0, VaultError::InvalidWithdrawalAmount);
        require!(
            (MIN_TRANSFER_INTERVAL..=MAX_TRANSFER_INTERVAL).contains(&interval_seconds),
            VaultError::InvalidInterval
        );

        let pool = &ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        require!(pool.is_active, VaultError::PoolNotInitialized);

        let commitment = ctx.accounts.user_share.user_commitment;
        let first_execution = clock.unix_timestamp + (interval_seconds as i64);

        let transfer = &mut ctx.accounts.scheduled_transfer;
        transfer.transfer_id = transfer.key();
        transfer.user_commitment = commitment;
        transfer.encrypted_transfer_data = encrypted_transfer_data;
        transfer.amount = amount;
        transfer.interval_seconds = interval_seconds;
        transfer.next_execution = first_execution;
        transfer.is_active = true;
        transfer.skip_count = 0;
        transfer.execution_count = 0;
        transfer.total_transferred = 0;
        transfer.created_at = clock.unix_timestamp;
        transfer.tuktuk_cron_job = Pubkey::default();
        transfer.bump = ctx.bumps.scheduled_transfer;
        transfer._reserved = [0u8; 32];

        // Privacy-preserving event: recipient is NOT emitted
        emit!(PrivateTransferScheduled {
            transfer_id: transfer.key(),
            commitment,
            amount,
            interval_seconds,
            first_execution,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Private scheduled transfer created: {} USDC every {} seconds",
            amount,
            interval_seconds
        );
        Ok(())
    }

    /// Record a transfer execution (privacy-preserving)
    ///
    /// This records that a transfer has been executed, without revealing
    /// the recipient. The actual transfer is done via Privacy Cash off-chain.
    ///
    /// Flow:
    /// 1. Verify batch proof
    /// 2. Redeem cTokens from Kamino
    /// 3. Update pool and transfer state
    /// 4. (SDK handles) Transfer USDC via Privacy Cash
    pub fn execute_transfer(ctx: Context<ExecuteTransfer>, execution_index: u32) -> Result<()> {
        let clock = Clock::get()?;

        // Read-only checks first (before mutable borrow)
        require!(
            ctx.accounts.scheduled_transfer.is_active,
            VaultError::TransferNotActive
        );
        require!(
            ctx.accounts.scheduled_transfer.is_due(clock.unix_timestamp),
            VaultError::TransferNotDue
        );

        let amount = ctx.accounts.scheduled_transfer.amount;
        // Note: recipient is NOT read from on-chain - it's stored encrypted
        // and provided by the client at execution time via Privacy Cash

        require!(
            !ctx.accounts.batch_proof.is_used,
            VaultError::NullifierAlreadyUsed
        );

        let pool_value_diff = ctx
            .accounts
            .shield_pool
            .total_pool_value
            .abs_diff(ctx.accounts.batch_proof.pool_value_at_generation);

        let tolerance_amount = (ctx.accounts.batch_proof.pool_value_at_generation as u128)
            .checked_mul(ctx.accounts.batch_proof.pool_value_tolerance_bps as u128)
            .and_then(|v| v.checked_div(10000))
            .ok_or(VaultError::ArithmeticOverflow)? as u64;

        require!(
            pool_value_diff <= tolerance_amount,
            VaultError::InvalidProof
        );

        let shares_to_burn = ctx
            .accounts
            .shield_pool
            .calculate_shares_for_withdrawal(amount)
            .ok_or(VaultError::InvalidShareCalculation)?;

        require!(
            ctx.accounts.shield_pool.total_pool_value >= amount,
            VaultError::InsufficientBalance
        );

        // Copy batch_proof values before CPI (they'll be needed after mutable borrow)
        let batch_proof_nullifier = ctx.accounts.batch_proof.nullifier;
        let batch_proof_new_encrypted_share = ctx.accounts.batch_proof.new_encrypted_share;

        // Redeem cTokens from Kamino to get USDC for the transfer (before mutable borrows)
        ctx.accounts.redeem_from_kamino(amount)?;

        // Now take mutable borrows
        let transfer = &mut ctx.accounts.scheduled_transfer;
        let pool = &mut ctx.accounts.shield_pool;

        let nullifier = &mut ctx.accounts.nullifier;
        nullifier.nullifier = batch_proof_nullifier;
        nullifier.is_used = true;
        nullifier.used_at = clock.unix_timestamp;
        nullifier.operation_type = OperationType::Transfer;
        nullifier.bump = ctx.bumps.nullifier;

        let user_share = &mut ctx.accounts.user_share;
        user_share.encrypted_share_amount = batch_proof_new_encrypted_share;
        user_share.last_update = clock.unix_timestamp;

        let batch_proof = &mut ctx.accounts.batch_proof;
        batch_proof.is_used = true;

        pool.total_pool_value = pool
            .total_pool_value
            .checked_sub(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;
        pool.total_shares = pool
            .total_shares
            .checked_sub(shares_to_burn)
            .ok_or(VaultError::ArithmeticOverflow)?;

        transfer.execution_count = transfer
            .execution_count
            .checked_add(1)
            .ok_or(VaultError::ArithmeticOverflow)?;
        transfer.total_transferred = transfer
            .total_transferred
            .checked_add(amount)
            .ok_or(VaultError::ArithmeticOverflow)?;
        transfer.skip_count = 0;
        transfer.next_execution = transfer.calculate_next_execution();

        let history = &mut ctx.accounts.transfer_history;
        history.history_id = history.key();
        history.scheduled_transfer = transfer.key();
        history.privacy_cash_tx = [0u8; 32];
        history.amount = amount;
        history.executed_at = clock.unix_timestamp;
        history.status = TransferStatus::Completed;
        history.execution_index = execution_index as u64;
        history.bump = ctx.bumps.transfer_history;

        // Privacy-preserving event: recipient is NOT emitted
        emit!(TransferExecutionRecorded {
            transfer_id: transfer.key(),
            execution_index: execution_index as u64,
            amount,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Transfer recorded: {} USDC, execution #{}, next at {}",
            amount,
            execution_index,
            transfer.next_execution
        );
        Ok(())
    }

    /// Cancel a scheduled transfer
    pub fn cancel_transfer(ctx: Context<CancelTransfer>) -> Result<()> {
        let transfer = &mut ctx.accounts.scheduled_transfer;
        let clock = Clock::get()?;

        require!(transfer.is_active, VaultError::TransferAlreadyCancelled);

        let commitment = transfer.user_commitment;

        transfer.is_active = false;

        emit!(TransferCancelled {
            transfer_id: transfer.key(),
            commitment,
            timestamp: clock.unix_timestamp,
        });

        msg!("Transfer {} cancelled", transfer.key());
        Ok(())
    }

    /// Update the pool's total value based on Kamino yield
    ///
    /// This reads the current cToken balance and calculates the equivalent
    /// USDC value. The exchange rate between cTokens and USDC increases
    /// over time as yield accrues.
    ///
    /// Should be called periodically (e.g., daily) by the pool authority
    /// or an automated keeper.
    ///
    /// Note: The exchange_rate parameter is provided by the caller after
    /// reading the current rate from Kamino's reserve state off-chain.
    /// This approach avoids complex on-chain oracle integration.
    pub fn update_pool_value(
        ctx: Context<UpdatePoolValue>,
        exchange_rate_numerator: u64,
        exchange_rate_denominator: u64,
    ) -> Result<()> {
        require!(
            exchange_rate_denominator > 0,
            VaultError::ArithmeticOverflow
        );

        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        let ctoken_balance = ctx.accounts.pool_ctoken_account.amount;
        let usdc_balance = ctx.accounts.pool_token_account.amount;

        // Calculate USDC value from cToken balance using exchange rate
        // ctoken_value = ctoken_balance * exchange_rate_numerator / exchange_rate_denominator
        let ctoken_value = (ctoken_balance as u128)
            .checked_mul(exchange_rate_numerator as u128)
            .and_then(|v| v.checked_div(exchange_rate_denominator as u128))
            .ok_or(VaultError::ArithmeticOverflow)? as u64;

        // Total pool value = USDC balance + cToken value
        let new_pool_value = usdc_balance
            .checked_add(ctoken_value)
            .ok_or(VaultError::ArithmeticOverflow)?;

        let old_pool_value = pool.total_pool_value;
        pool.total_pool_value = new_pool_value;
        pool.last_yield_update = clock.unix_timestamp;

        emit!(PoolValueUpdated {
            pool: pool.key(),
            old_value: old_pool_value,
            new_value: new_pool_value,
            ctoken_balance,
            usdc_balance,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Pool value updated: {} -> {} USDC (cTokens: {}, USDC: {})",
            old_pool_value,
            new_pool_value,
            ctoken_balance,
            usdc_balance
        );
        Ok(())
    }
}
