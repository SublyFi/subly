//! Kamino Lending CPI Integration
//!
//! This module provides CPI (Cross-Program Invocation) helpers for interacting
//! with the Kamino Lending protocol on Solana mainnet.
//!
//! Kamino Lending allows depositing USDC to earn yield. The Shield Pool uses
//! Kamino to generate yield on aggregated user funds.
//!
//! Note: Kamino CPI requires careful account management. The actual instruction
//! execution may require additional accounts depending on the reserve configuration.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;

// Re-export from constants for convenience
pub use crate::constants::{
    KAMINO_CUSDC_MINT, KAMINO_LENDING_PROGRAM_ID, KAMINO_MAIN_MARKET, KAMINO_USDC_RESERVE,
};

// ============================================
// Instruction Discriminators
// ============================================

/// Kamino `deposit_reserve_liquidity` instruction discriminator
/// This is the Anchor discriminator for the instruction
/// Calculated as: sha256("global:deposit_reserve_liquidity")[0..8]
pub const KAMINO_DEPOSIT_RESERVE_LIQUIDITY_DISCRIMINATOR: [u8; 8] =
    [0x60, 0x5a, 0xd3, 0x7c, 0x52, 0xc2, 0xd7, 0x58];

/// Kamino `redeem_reserve_collateral` instruction discriminator
/// Calculated as: sha256("global:redeem_reserve_collateral")[0..8]
pub const KAMINO_REDEEM_RESERVE_COLLATERAL_DISCRIMINATOR: [u8; 8] =
    [0x2e, 0xd1, 0x5c, 0x2c, 0x4d, 0xa9, 0x3e, 0xf0];

// ============================================
// Account Structures for CPI
// ============================================

/// Accounts required for Kamino deposit_reserve_liquidity CPI
///
/// This instruction deposits liquidity (USDC) into a Kamino reserve and receives
/// cTokens (collateral tokens) in return.
#[derive(Clone)]
pub struct KaminoDepositAccounts<'info> {
    /// The owner/authority of the liquidity being deposited
    pub owner: AccountInfo<'info>,

    /// The lending market
    pub lending_market: AccountInfo<'info>,

    /// Lending market authority (PDA)
    pub lending_market_authority: AccountInfo<'info>,

    /// The reserve account
    pub reserve: AccountInfo<'info>,

    /// Reserve liquidity supply (where USDC is deposited)
    pub reserve_liquidity_supply: AccountInfo<'info>,

    /// Reserve collateral mint (cToken mint)
    pub reserve_collateral_mint: AccountInfo<'info>,

    /// User's liquidity token account (USDC source)
    pub user_source_liquidity: AccountInfo<'info>,

    /// User's collateral token account (cToken destination)
    pub user_destination_collateral: AccountInfo<'info>,

    /// SPL Token Program
    pub token_program: AccountInfo<'info>,

    /// System Program (optional for some operations)
    pub system_program: AccountInfo<'info>,
}

/// Accounts required for Kamino redeem_reserve_collateral CPI
///
/// This instruction redeems cTokens (collateral) for liquidity (USDC).
#[derive(Clone)]
pub struct KaminoRedeemAccounts<'info> {
    /// The owner/authority of the collateral being redeemed
    pub owner: AccountInfo<'info>,

    /// The lending market
    pub lending_market: AccountInfo<'info>,

    /// Lending market authority (PDA)
    pub lending_market_authority: AccountInfo<'info>,

    /// The reserve account
    pub reserve: AccountInfo<'info>,

    /// Reserve liquidity supply (where USDC is withdrawn from)
    pub reserve_liquidity_supply: AccountInfo<'info>,

    /// Reserve collateral mint (cToken mint)
    pub reserve_collateral_mint: AccountInfo<'info>,

    /// User's collateral token account (cToken source)
    pub user_source_collateral: AccountInfo<'info>,

    /// User's liquidity token account (USDC destination)
    pub user_destination_liquidity: AccountInfo<'info>,

    /// SPL Token Program
    pub token_program: AccountInfo<'info>,

    /// System Program (optional for some operations)
    pub system_program: AccountInfo<'info>,
}

// ============================================
// CPI Helper Functions
// ============================================

/// Deposit liquidity (USDC) to Kamino reserve
///
/// This function performs a CPI call to Kamino's deposit_reserve_liquidity instruction.
/// The caller must provide PDA signer seeds if the owner is a PDA.
///
/// # Arguments
/// * `accounts` - The accounts required for the deposit
/// * `liquidity_amount` - Amount of USDC to deposit (in base units, 6 decimals)
/// * `signer_seeds` - Optional PDA signer seeds if owner is a PDA
///
/// # Returns
/// * `Result<()>` - Success or error
pub fn cpi_deposit_reserve_liquidity<'info>(
    accounts: KaminoDepositAccounts<'info>,
    liquidity_amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    // Build instruction data
    // Format: discriminator (8 bytes) + liquidity_amount (8 bytes)
    let mut data = Vec::with_capacity(16);
    data.extend_from_slice(&KAMINO_DEPOSIT_RESERVE_LIQUIDITY_DISCRIMINATOR);
    data.extend_from_slice(&liquidity_amount.to_le_bytes());

    // Build account metas in the order expected by Kamino
    let account_metas = vec![
        AccountMeta::new(accounts.owner.key(), true), // owner/signer
        AccountMeta::new_readonly(accounts.lending_market.key(), false),
        AccountMeta::new_readonly(accounts.lending_market_authority.key(), false),
        AccountMeta::new(accounts.reserve.key(), false),
        AccountMeta::new(accounts.reserve_liquidity_supply.key(), false),
        AccountMeta::new(accounts.reserve_collateral_mint.key(), false),
        AccountMeta::new(accounts.user_source_liquidity.key(), false),
        AccountMeta::new(accounts.user_destination_collateral.key(), false),
        AccountMeta::new_readonly(accounts.token_program.key(), false),
        AccountMeta::new_readonly(accounts.system_program.key(), false),
    ];

    let ix = Instruction {
        program_id: KAMINO_LENDING_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // Collect all account infos for invoke_signed
    let account_infos = vec![
        accounts.owner,
        accounts.lending_market,
        accounts.lending_market_authority,
        accounts.reserve,
        accounts.reserve_liquidity_supply,
        accounts.reserve_collateral_mint,
        accounts.user_source_liquidity,
        accounts.user_destination_collateral,
        accounts.token_program,
        accounts.system_program,
    ];

    invoke_signed(&ix, &account_infos, signer_seeds)?;

    Ok(())
}

/// Redeem collateral (cTokens) from Kamino reserve for liquidity (USDC)
///
/// This function performs a CPI call to Kamino's redeem_reserve_collateral instruction.
/// The caller must provide PDA signer seeds if the owner is a PDA.
///
/// # Arguments
/// * `accounts` - The accounts required for the redemption
/// * `collateral_amount` - Amount of cTokens to redeem
/// * `signer_seeds` - Optional PDA signer seeds if owner is a PDA
///
/// # Returns
/// * `Result<()>` - Success or error
pub fn cpi_redeem_reserve_collateral<'info>(
    accounts: KaminoRedeemAccounts<'info>,
    collateral_amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    // Build instruction data
    // Format: discriminator (8 bytes) + collateral_amount (8 bytes)
    let mut data = Vec::with_capacity(16);
    data.extend_from_slice(&KAMINO_REDEEM_RESERVE_COLLATERAL_DISCRIMINATOR);
    data.extend_from_slice(&collateral_amount.to_le_bytes());

    // Build account metas in the order expected by Kamino
    let account_metas = vec![
        AccountMeta::new(accounts.owner.key(), true), // owner/signer
        AccountMeta::new_readonly(accounts.lending_market.key(), false),
        AccountMeta::new_readonly(accounts.lending_market_authority.key(), false),
        AccountMeta::new(accounts.reserve.key(), false),
        AccountMeta::new(accounts.reserve_liquidity_supply.key(), false),
        AccountMeta::new(accounts.reserve_collateral_mint.key(), false),
        AccountMeta::new(accounts.user_source_collateral.key(), false),
        AccountMeta::new(accounts.user_destination_liquidity.key(), false),
        AccountMeta::new_readonly(accounts.token_program.key(), false),
        AccountMeta::new_readonly(accounts.system_program.key(), false),
    ];

    let ix = Instruction {
        program_id: KAMINO_LENDING_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // Collect all account infos for invoke_signed
    let account_infos = vec![
        accounts.owner,
        accounts.lending_market,
        accounts.lending_market_authority,
        accounts.reserve,
        accounts.reserve_liquidity_supply,
        accounts.reserve_collateral_mint,
        accounts.user_source_collateral,
        accounts.user_destination_liquidity,
        accounts.token_program,
        accounts.system_program,
    ];

    invoke_signed(&ix, &account_infos, signer_seeds)?;

    Ok(())
}

// ============================================
// Helper Functions
// ============================================

/// Derive the lending market authority PDA
///
/// # Arguments
/// * `lending_market` - The lending market pubkey
///
/// # Returns
/// * `(Pubkey, u8)` - The PDA and bump seed
pub fn derive_lending_market_authority(lending_market: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"lma", lending_market.as_ref()],
        &KAMINO_LENDING_PROGRAM_ID,
    )
}

/// Calculate the exchange rate between liquidity and collateral
///
/// This is an estimate based on typical Kamino reserve behavior.
/// For exact calculations, the reserve state should be read on-chain.
///
/// # Arguments
/// * `liquidity_amount` - Amount of liquidity tokens
/// * `total_liquidity` - Total liquidity in the reserve
/// * `total_collateral` - Total collateral minted
///
/// # Returns
/// * `Option<u64>` - Estimated collateral tokens to receive
pub fn estimate_collateral_for_liquidity(
    liquidity_amount: u64,
    total_liquidity: u64,
    total_collateral: u64,
) -> Option<u64> {
    if total_liquidity == 0 || total_collateral == 0 {
        // Initial deposit: 1:1 ratio
        return Some(liquidity_amount);
    }

    // collateral = liquidity * total_collateral / total_liquidity
    (liquidity_amount as u128)
        .checked_mul(total_collateral as u128)?
        .checked_div(total_liquidity as u128)?
        .try_into()
        .ok()
}

/// Calculate the liquidity amount for a given collateral amount
///
/// # Arguments
/// * `collateral_amount` - Amount of collateral tokens
/// * `total_liquidity` - Total liquidity in the reserve
/// * `total_collateral` - Total collateral minted
///
/// # Returns
/// * `Option<u64>` - Estimated liquidity tokens to receive
pub fn estimate_liquidity_for_collateral(
    collateral_amount: u64,
    total_liquidity: u64,
    total_collateral: u64,
) -> Option<u64> {
    if total_collateral == 0 {
        return None;
    }

    // liquidity = collateral * total_liquidity / total_collateral
    (collateral_amount as u128)
        .checked_mul(total_liquidity as u128)?
        .checked_div(total_collateral as u128)?
        .try_into()
        .ok()
}

// ============================================
// Legacy Compatibility (for existing code)
// ============================================

/// Legacy constant alias
pub const KAMINO_DEPOSIT_DISCRIMINATOR: [u8; 8] = KAMINO_DEPOSIT_RESERVE_LIQUIDITY_DISCRIMINATOR;

/// Legacy constant alias
pub const KAMINO_WITHDRAW_DISCRIMINATOR: [u8; 8] = KAMINO_REDEEM_RESERVE_COLLATERAL_DISCRIMINATOR;
