use crate::constants::*;
use crate::errors::VaultError;
use crate::integrations::kamino::{cpi_redeem_reserve_collateral, KaminoRedeemAccounts};
use crate::state::{
    BatchProofStorage, Nullifier, ScheduledTransfer, ShieldPool, TransferHistory, UserShare,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

/// Execute a scheduled transfer
///
/// This instruction executes a recurring payment by:
/// 1. Verifying the batch proof
/// 2. Redeeming cTokens from Kamino
/// 3. Updating pool and user state
/// 4. (SDK handles) Transfer USDC via Privacy Cash
#[derive(Accounts)]
#[instruction(execution_index: u32)]
pub struct ExecuteTransfer<'info> {
    /// The executor (can be Tuk Tuk thread or manual caller)
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

impl<'info> ExecuteTransfer<'info> {
    /// Redeem cTokens from Kamino to get USDC for the transfer
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

        msg!(
            "Redeemed {} cTokens from Kamino for transfer",
            collateral_amount
        );
        Ok(())
    }
}
