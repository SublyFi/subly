use crate::constants::*;
use crate::errors::VaultError;
use crate::state::{NoteCommitmentRegistry, ShieldPool, UserShare};
use anchor_lang::prelude::*;

/// Register a private deposit from Privacy Cash
///
/// This instruction is called after a user has:
/// 1. Deposited USDC to their Privacy Cash account
/// 2. Withdrawn from Privacy Cash to the Shield Pool's token account
///
/// The note_commitment serves as proof of the Privacy Cash deposit,
/// preventing double-registration.
#[derive(Accounts)]
#[instruction(
    note_commitment: [u8; 32],
    user_commitment: [u8; 32],
    encrypted_share: [u8; 64],
    amount: u64
)]
pub struct RegisterDeposit<'info> {
    /// The relayer or pool authority registering the deposit
    /// This is NOT the user's wallet - maintaining privacy
    #[account(mut)]
    pub registrar: Signer<'info>,

    /// The Shield Pool
    #[account(
        mut,
        seeds = [SHIELD_POOL_SEED],
        bump = shield_pool.bump,
        constraint = shield_pool.is_active @ VaultError::PoolNotInitialized
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// Note Commitment Registry - prevents double registration
    /// Initialized fresh for each unique note_commitment
    #[account(
        init,
        payer = registrar,
        space = NoteCommitmentRegistry::SPACE,
        seeds = [NOTE_COMMITMENT_REGISTRY_SEED, note_commitment.as_ref()],
        bump
    )]
    pub note_commitment_registry: Account<'info, NoteCommitmentRegistry>,

    /// User's share account - created or updated
    #[account(
        init_if_needed,
        payer = registrar,
        space = UserShare::SPACE,
        seeds = [USER_SHARE_SEED, shield_pool.key().as_ref(), user_commitment.as_ref()],
        bump
    )]
    pub user_share: Account<'info, UserShare>,

    /// System program
    pub system_program: Program<'info, System>,
}
