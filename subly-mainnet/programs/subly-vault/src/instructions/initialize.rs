use crate::constants::*;
use crate::state::ShieldPool;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The authority that will manage the pool
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Shield Pool account to be created
    #[account(
        init,
        payer = authority,
        space = ShieldPool::SPACE,
        seeds = [SHIELD_POOL_SEED],
        bump
    )]
    pub shield_pool: Account<'info, ShieldPool>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}
