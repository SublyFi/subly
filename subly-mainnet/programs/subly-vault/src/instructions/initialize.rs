use crate::constants::*;
use crate::state::ShieldPool;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

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

    /// USDC Mint account
    #[account(
        address = USDC_MINT @ crate::errors::VaultError::InvalidAccount
    )]
    pub usdc_mint: Account<'info, Mint>,

    /// Kamino cUSDC Mint account (collateral token)
    #[account(
        address = KAMINO_CUSDC_MINT @ crate::errors::VaultError::InvalidAccount
    )]
    pub cusdc_mint: Account<'info, Mint>,

    /// Pool's USDC Token Account (PDA-owned ATA)
    /// Used to hold USDC temporarily before depositing to Kamino
    #[account(
        init,
        payer = authority,
        seeds = [POOL_TOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = shield_pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    /// Pool's cUSDC Token Account (PDA-owned)
    /// Used to hold Kamino cTokens representing our yield position
    #[account(
        init,
        payer = authority,
        seeds = [POOL_CTOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        token::mint = cusdc_mint,
        token::authority = shield_pool,
    )]
    pub pool_ctoken_account: Account<'info, TokenAccount>,

    /// Token Program
    pub token_program: Program<'info, Token>,

    /// Associated Token Program
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}
