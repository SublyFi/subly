use crate::constants::*;
use crate::errors::VaultError;
use crate::state::ShieldPool;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

/// Update the pool's total value based on Kamino cToken balance
///
/// This instruction reads the current cToken balance and calculates the
/// equivalent USDC value based on the Kamino exchange rate.
///
/// Should be called periodically (e.g., daily) to reflect yield accrual.
#[derive(Accounts)]
pub struct UpdatePoolValue<'info> {
    /// The pool authority (only authority can update pool value)
    #[account(
        constraint = authority.key() == shield_pool.authority @ VaultError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// The Shield Pool to update
    #[account(
        mut,
        seeds = [SHIELD_POOL_SEED],
        bump = shield_pool.bump,
        constraint = shield_pool.is_active @ VaultError::PoolNotInitialized
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// Pool's cToken Account (read current balance)
    #[account(
        seeds = [POOL_CTOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        constraint = pool_ctoken_account.key() == shield_pool.kamino_ctoken_account @ VaultError::InvalidAccount
    )]
    pub pool_ctoken_account: Account<'info, TokenAccount>,

    /// Pool's USDC Token Account (read current USDC balance)
    #[account(
        seeds = [POOL_TOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        constraint = pool_token_account.key() == shield_pool.token_account @ VaultError::InvalidAccount
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
}
