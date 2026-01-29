use crate::constants::*;
use crate::errors::VaultError;
use crate::integrations::kamino::{cpi_redeem_reserve_collateral, KaminoRedeemAccounts};
use crate::state::{Nullifier, ShieldPool, UserShare};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

/// Withdraw USDC from the Shield Pool
///
/// This instruction withdraws USDC from Kamino and prepares it for
/// transfer via Privacy Cash. The actual privacy-preserving transfer
/// is done off-chain via the SDK.
///
/// Flow:
/// 1. Verify nullifier hasn't been used (prevents double-spend)
/// 2. Calculate cTokens to redeem based on withdrawal amount
/// 3. Redeem cTokens from Kamino to get USDC
/// 4. Update user shares and pool state
/// 5. (SDK) Transfer USDC via Privacy Cash
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

    // ============================================
    // Token Accounts
    // ============================================
    /// Pool's USDC Token Account (destination for redeemed USDC)
    #[account(
        mut,
        seeds = [POOL_TOKEN_ACCOUNT_SEED, shield_pool.key().as_ref()],
        bump,
        constraint = pool_token_account.key() == shield_pool.token_account @ VaultError::InvalidAccount
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    /// Pool's cToken Account (source of Kamino collateral)
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

    /// Reserve liquidity supply (where USDC comes from)
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

impl<'info> Withdraw<'info> {
    /// Redeem cTokens from Kamino to get USDC
    ///
    /// Note: collateral_amount should be calculated based on the current
    /// exchange rate between cTokens and USDC. For simplicity, we use 1:1
    /// ratio here, but in production this should be calculated properly.
    pub fn redeem_from_kamino(&self, collateral_amount: u64) -> Result<()> {
        let bump = self.shield_pool.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[SHIELD_POOL_SEED, &[bump]]];

        let kamino_accounts = KaminoRedeemAccounts {
            owner: self.shield_pool.to_account_info(),
            lending_market: self.kamino_lending_market.to_account_info(),
            lending_market_authority: self.kamino_lending_market_authority.to_account_info(),
            reserve: self.kamino_reserve.to_account_info(),
            reserve_liquidity_supply: self.kamino_reserve_liquidity_supply.to_account_info(),
            reserve_collateral_mint: self.kamino_reserve_collateral_mint.to_account_info(),
            user_source_collateral: self.pool_ctoken_account.to_account_info(),
            user_destination_liquidity: self.pool_token_account.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };

        cpi_redeem_reserve_collateral(kamino_accounts, collateral_amount, signer_seeds)?;

        msg!("Redeemed {} cTokens from Kamino", collateral_amount);
        Ok(())
    }
}
