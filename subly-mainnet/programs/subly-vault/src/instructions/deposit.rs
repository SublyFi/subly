use crate::constants::*;
use crate::errors::VaultError;
use crate::state::{DepositHistory, ShieldPool, UserShare};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(amount: u64, commitment: [u8; 32], encrypted_share: [u8; 64], deposit_index: u64)]
pub struct Deposit<'info> {
    /// The depositor
    #[account(mut)]
    pub depositor: Signer<'info>,

    /// The Shield Pool
    #[account(
        mut,
        seeds = [SHIELD_POOL_SEED],
        bump = shield_pool.bump,
        constraint = shield_pool.is_active @ VaultError::PoolNotInitialized
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// User's share account
    #[account(
        init_if_needed,
        payer = depositor,
        space = UserShare::SPACE,
        seeds = [USER_SHARE_SEED, shield_pool.key().as_ref(), commitment.as_ref()],
        bump
    )]
    pub user_share: Account<'info, UserShare>,

    /// Deposit history record
    #[account(
        init,
        payer = depositor,
        space = DepositHistory::SPACE,
        seeds = [DEPOSIT_HISTORY_SEED, commitment.as_ref(), &deposit_index.to_le_bytes()],
        bump
    )]
    pub deposit_history: Account<'info, DepositHistory>,

    /// System program
    pub system_program: Program<'info, System>,
}
