use crate::constants::*;
use crate::errors::VaultError;
use crate::state::{
    BatchProofStorage, Nullifier, ScheduledTransfer, ShieldPool, TransferHistory, UserShare,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(execution_index: u32)]
pub struct ExecuteTransfer<'info> {
    /// The executor (can be Clockwork thread or manual caller)
    #[account(mut)]
    pub executor: Signer<'info>,

    /// The Shield Pool
    #[account(
        mut,
        seeds = [SHIELD_POOL_SEED],
        bump = shield_pool.bump,
        constraint = shield_pool.is_active @ VaultError::PoolNotInitialized
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// The scheduled transfer
    #[account(
        mut,
        constraint = scheduled_transfer.is_active @ VaultError::TransferNotActive
    )]
    pub scheduled_transfer: Account<'info, ScheduledTransfer>,

    /// User's share account
    #[account(
        mut,
        seeds = [
            USER_SHARE_SEED,
            shield_pool.key().as_ref(),
            scheduled_transfer.user_commitment.as_ref()
        ],
        bump = user_share.bump,
        constraint = user_share.pool == shield_pool.key() @ VaultError::InvalidAccount
    )]
    pub user_share: Account<'info, UserShare>,

    /// Pre-generated batch proof for this execution
    #[account(
        mut,
        seeds = [
            BATCH_PROOF_SEED,
            scheduled_transfer.key().as_ref(),
            &execution_index.to_le_bytes()
        ],
        bump = batch_proof.bump,
        constraint = !batch_proof.is_used @ VaultError::NullifierAlreadyUsed
    )]
    pub batch_proof: Account<'info, BatchProofStorage>,

    /// Nullifier account
    #[account(
        init,
        payer = executor,
        space = Nullifier::SPACE,
        seeds = [NULLIFIER_SEED, batch_proof.nullifier.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, Nullifier>,

    /// Transfer history record
    #[account(
        init,
        payer = executor,
        space = TransferHistory::SPACE,
        seeds = [
            TRANSFER_HISTORY_SEED,
            scheduled_transfer.key().as_ref(),
            &execution_index.to_le_bytes()
        ],
        bump
    )]
    pub transfer_history: Account<'info, TransferHistory>,

    /// System program
    pub system_program: Program<'info, System>,
}
