use crate::constants::*;
use crate::errors::VaultError;
use crate::integrations::kamino::{cpi_deposit_reserve_liquidity, KaminoDepositAccounts};
use crate::state::{NoteCommitmentRegistry, ShieldPool, UserShare};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

/// Register a private deposit from Privacy Cash
///
/// This instruction is called after a user has:
/// 1. Deposited USDC to their Privacy Cash account
/// 2. Withdrawn from Privacy Cash to the Shield Pool's token account
///
/// The note_commitment serves as proof of the Privacy Cash deposit,
/// preventing double-registration.
///
/// After registration, the USDC is deposited to Kamino for yield generation.
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

    // ============================================
    // Token Accounts
    // ============================================
    /// Pool's USDC Token Account (source of liquidity)
    #[account(
        mut,
        seeds = [POOL_TOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        constraint = pool_token_account.key() == shield_pool.token_account @ VaultError::InvalidAccount
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    /// Pool's cToken Account (destination for Kamino collateral)
    #[account(
        mut,
        seeds = [POOL_CTOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        constraint = pool_ctoken_account.key() == shield_pool.kamino_ctoken_account @ VaultError::InvalidAccount
    )]
    pub pool_ctoken_account: Account<'info, TokenAccount>,

    // ============================================
    // Kamino Accounts
    // ============================================
    /// Kamino lending market
    /// CHECK: Verified by address constraint
    #[account(address = KAMINO_MAIN_MARKET)]
    pub kamino_lending_market: AccountInfo<'info>,

    /// Kamino lending market authority (PDA)
    /// CHECK: Verified by Kamino program during CPI
    pub kamino_lending_market_authority: AccountInfo<'info>,

    /// Kamino USDC reserve
    /// CHECK: Verified by address constraint
    #[account(mut, address = KAMINO_USDC_RESERVE)]
    pub kamino_reserve: AccountInfo<'info>,

    /// Reserve liquidity supply (where USDC goes)
    /// CHECK: Verified by Kamino program during CPI
    #[account(mut)]
    pub kamino_reserve_liquidity_supply: AccountInfo<'info>,

    /// Reserve collateral mint (cToken mint)
    /// CHECK: Verified by address constraint
    #[account(mut, address = KAMINO_CUSDC_MINT)]
    pub kamino_reserve_collateral_mint: AccountInfo<'info>,

    /// Kamino Lending Program
    /// CHECK: Verified by address constraint
    #[account(address = KAMINO_LENDING_PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,

    // ============================================
    // System Programs
    // ============================================
    /// Token Program
    pub token_program: Program<'info, Token>,

    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> RegisterDeposit<'info> {
    /// Deposit USDC from pool token account to Kamino
    pub fn deposit_to_kamino(&self, amount: u64) -> Result<()> {
        let bump = self.shield_pool.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[SHIELD_POOL_SEED, &[bump]]];

        let kamino_accounts = KaminoDepositAccounts {
            owner: self.shield_pool.to_account_info(),
            lending_market: self.kamino_lending_market.to_account_info(),
            lending_market_authority: self.kamino_lending_market_authority.to_account_info(),
            reserve: self.kamino_reserve.to_account_info(),
            reserve_liquidity_supply: self.kamino_reserve_liquidity_supply.to_account_info(),
            reserve_collateral_mint: self.kamino_reserve_collateral_mint.to_account_info(),
            user_source_liquidity: self.pool_token_account.to_account_info(),
            user_destination_collateral: self.pool_ctoken_account.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };

        cpi_deposit_reserve_liquidity(kamino_accounts, amount, signer_seeds)?;

        msg!("Deposited {} USDC to Kamino", amount);
        Ok(())
    }
}
