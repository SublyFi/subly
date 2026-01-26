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
        pool._reserved = [0u8; 64];

        emit!(PoolInitialized {
            pool: pool.key(),
            authority: pool.authority,
            timestamp: clock.unix_timestamp,
        });

        msg!("Shield Pool initialized: {}", pool.key());
        Ok(())
    }

    /// Deposit USDC into the Shield Pool
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
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
        nullifier_hash: [u8; 32],
        new_encrypted_share: [u8; 64],
        _proof: Vec<u8>,
        _public_inputs: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(amount > 0, VaultError::InvalidWithdrawalAmount);

        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        require!(pool.is_active, VaultError::PoolNotInitialized);
        require!(
            pool.total_pool_value >= amount,
            VaultError::InsufficientBalance
        );

        let shares_to_burn = pool
            .calculate_shares_for_withdrawal(amount)
            .ok_or(VaultError::InvalidShareCalculation)?;

        require!(shares_to_burn > 0, VaultError::InvalidShareCalculation);
        require!(
            shares_to_burn <= pool.total_shares,
            VaultError::InsufficientBalance
        );

        let nullifier = &mut ctx.accounts.nullifier;
        require!(!nullifier.is_used, VaultError::NullifierAlreadyUsed);

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
        Ok(())
    }

    /// Set up a recurring transfer
    pub fn setup_transfer(
        ctx: Context<SetupTransfer>,
        recipient: Pubkey,
        amount: u64,
        interval_seconds: u32,
        _transfer_nonce: u64,
    ) -> Result<()> {
        require!(amount > 0, VaultError::InvalidWithdrawalAmount);
        require!(
            interval_seconds >= MIN_TRANSFER_INTERVAL && interval_seconds <= MAX_TRANSFER_INTERVAL,
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
        transfer.recipient = recipient;
        transfer.amount = amount;
        transfer.interval_seconds = interval_seconds;
        transfer.next_execution = first_execution;
        transfer.is_active = true;
        transfer.skip_count = 0;
        transfer.execution_count = 0;
        transfer.total_transferred = 0;
        transfer.created_at = clock.unix_timestamp;
        transfer.clockwork_thread = Pubkey::default();
        transfer.bump = ctx.bumps.scheduled_transfer;
        transfer._reserved = [0u8; 32];

        emit!(TransferScheduled {
            transfer_id: transfer.key(),
            commitment,
            recipient,
            amount,
            interval_seconds,
            first_execution,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Scheduled transfer created: {} USDC to {} every {} seconds",
            amount,
            recipient,
            interval_seconds
        );
        Ok(())
    }

    /// Execute a scheduled transfer
    pub fn execute_transfer(ctx: Context<ExecuteTransfer>, execution_index: u32) -> Result<()> {
        let transfer = &mut ctx.accounts.scheduled_transfer;
        let pool = &mut ctx.accounts.shield_pool;
        let clock = Clock::get()?;

        require!(transfer.is_active, VaultError::TransferNotActive);
        require!(
            transfer.is_due(clock.unix_timestamp),
            VaultError::TransferNotDue
        );

        let commitment = transfer.user_commitment;
        let amount = transfer.amount;
        let recipient = transfer.recipient;

        let batch_proof = &ctx.accounts.batch_proof;
        require!(!batch_proof.is_used, VaultError::NullifierAlreadyUsed);

        let pool_value_diff = if pool.total_pool_value > batch_proof.pool_value_at_generation {
            pool.total_pool_value - batch_proof.pool_value_at_generation
        } else {
            batch_proof.pool_value_at_generation - pool.total_pool_value
        };

        let tolerance_amount = (batch_proof.pool_value_at_generation as u128)
            .checked_mul(batch_proof.pool_value_tolerance_bps as u128)
            .and_then(|v| v.checked_div(10000))
            .ok_or(VaultError::ArithmeticOverflow)? as u64;

        require!(
            pool_value_diff <= tolerance_amount,
            VaultError::InvalidProof
        );

        let shares_to_burn = pool
            .calculate_shares_for_withdrawal(amount)
            .ok_or(VaultError::InvalidShareCalculation)?;

        require!(
            pool.total_pool_value >= amount,
            VaultError::InsufficientBalance
        );

        let nullifier = &mut ctx.accounts.nullifier;
        nullifier.nullifier = batch_proof.nullifier;
        nullifier.is_used = true;
        nullifier.used_at = clock.unix_timestamp;
        nullifier.operation_type = OperationType::Transfer;
        nullifier.bump = ctx.bumps.nullifier;

        let user_share = &mut ctx.accounts.user_share;
        user_share.encrypted_share_amount = batch_proof.new_encrypted_share;
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

        emit!(TransferExecuted {
            transfer_id: transfer.key(),
            commitment,
            recipient,
            amount,
            execution_index: execution_index as u64,
            next_execution: transfer.next_execution,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Transfer executed: {} USDC to {}, next execution at {}",
            amount,
            recipient,
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
}
