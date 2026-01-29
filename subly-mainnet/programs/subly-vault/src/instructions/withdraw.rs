use crate::constants::*;
use crate::errors::VaultError;
use crate::state::{Nullifier, ShieldPool, UserShare};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
    amount: u64,
    nullifier_hash: [u8; 32],
    new_encrypted_share: [u8; 64],
    _proof: Vec<u8>,
    _public_inputs: Vec<[u8; 32]>
)]
pub struct Withdraw<'info> {
    /// The withdrawer (provides proof of ownership)
    #[account(mut)]
    pub withdrawer: Signer<'info>,

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
        mut,
        seeds = [USER_SHARE_SEED, shield_pool.key().as_ref(), user_share.user_commitment.as_ref()],
        bump = user_share.bump,
        constraint = user_share.pool == shield_pool.key() @ VaultError::InvalidAccount
    )]
    pub user_share: Account<'info, UserShare>,

    /// Nullifier account (prevents double-spend)
    #[account(
        init,
        payer = withdrawer,
        space = Nullifier::SPACE,
        seeds = [NULLIFIER_SEED, nullifier_hash.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, Nullifier>,

    /// System program
    pub system_program: Program<'info, System>,
}
