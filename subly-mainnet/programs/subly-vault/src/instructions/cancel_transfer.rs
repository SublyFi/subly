use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VaultError;
use crate::state::{ShieldPool, UserShare, ScheduledTransfer};

#[derive(Accounts)]
pub struct CancelTransfer<'info> {
    /// The user cancelling the transfer
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Shield Pool
    #[account(
        seeds = [SHIELD_POOL_SEED],
        bump = shield_pool.bump
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// User's share account (proves ownership via commitment)
    #[account(
        seeds = [
            USER_SHARE_SEED,
            shield_pool.key().as_ref(),
            user_share.user_commitment.as_ref()
        ],
        bump = user_share.bump,
        constraint = user_share.pool == shield_pool.key() @ VaultError::InvalidAccount
    )]
    pub user_share: Account<'info, UserShare>,

    /// The scheduled transfer to cancel
    #[account(
        mut,
        constraint = scheduled_transfer.user_commitment == user_share.user_commitment @ VaultError::Unauthorized,
        constraint = scheduled_transfer.is_active @ VaultError::TransferAlreadyCancelled
    )]
    pub scheduled_transfer: Account<'info, ScheduledTransfer>,

    /// System program
    pub system_program: Program<'info, System>,
}
