use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VaultError;
use crate::state::{ShieldPool, UserShare, ScheduledTransfer};

#[derive(Accounts)]
#[instruction(recipient: Pubkey, amount: u64, interval_seconds: u32, transfer_nonce: u64)]
pub struct SetupTransfer<'info> {
    /// The user setting up the transfer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Shield Pool
    #[account(
        seeds = [SHIELD_POOL_SEED],
        bump = shield_pool.bump,
        constraint = shield_pool.is_active @ VaultError::PoolNotInitialized
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// User's share account
    #[account(
        seeds = [USER_SHARE_SEED, shield_pool.key().as_ref(), user_share.user_commitment.as_ref()],
        bump = user_share.bump,
        constraint = user_share.pool == shield_pool.key() @ VaultError::InvalidAccount
    )]
    pub user_share: Account<'info, UserShare>,

    /// The scheduled transfer account to be created
    #[account(
        init,
        payer = payer,
        space = ScheduledTransfer::SPACE,
        seeds = [
            SCHEDULED_TRANSFER_SEED,
            user_share.user_commitment.as_ref(),
            &transfer_nonce.to_le_bytes()
        ],
        bump
    )]
    pub scheduled_transfer: Account<'info, ScheduledTransfer>,

    /// System program
    pub system_program: Program<'info, System>,
}
