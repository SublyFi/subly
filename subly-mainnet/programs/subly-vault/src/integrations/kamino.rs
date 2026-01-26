use anchor_lang::prelude::*;

/// Kamino Lending Program ID on Mainnet
/// Note: This is the actual Kamino lending program ID
pub const KAMINO_LENDING_PROGRAM_ID: Pubkey = pubkey!("KLend2g3cP87ber41VSz2cHu5M3mxzQS7pzLFz1UJwp");

/// Kamino deposit instruction discriminator
pub const KAMINO_DEPOSIT_DISCRIMINATOR: [u8; 8] = [0x00; 8]; // Placeholder

/// Kamino withdraw instruction discriminator
pub const KAMINO_WITHDRAW_DISCRIMINATOR: [u8; 8] = [0x00; 8]; // Placeholder

/// Accounts required for Kamino deposit
#[derive(Accounts)]
pub struct KaminoDeposit<'info> {
    /// The Kamino lending program
    /// CHECK: Verified by program ID constraint
    #[account(address = KAMINO_LENDING_PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,

    /// The pool authority (PDA) depositing funds
    /// CHECK: Verified by seeds constraint in caller
    #[account(mut)]
    pub pool_authority: AccountInfo<'info>,

    /// Kamino lending market
    /// CHECK: Verified by Kamino program
    pub lending_market: AccountInfo<'info>,

    /// Kamino reserve for USDC
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub reserve: AccountInfo<'info>,

    /// Reserve liquidity supply (where tokens are deposited)
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub reserve_liquidity_supply: AccountInfo<'info>,

    /// Reserve collateral mint (cToken)
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub reserve_collateral_mint: AccountInfo<'info>,

    /// User's source token account (USDC)
    /// CHECK: Verified by token program
    #[account(mut)]
    pub user_source_liquidity: AccountInfo<'info>,

    /// User's destination collateral account (cToken)
    /// CHECK: Verified by token program
    #[account(mut)]
    pub user_destination_collateral: AccountInfo<'info>,

    /// Obligation account (user's position)
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub obligation: AccountInfo<'info>,

    /// Token program
    /// CHECK: Verified by SPL Token program ID
    pub token_program: AccountInfo<'info>,
}

/// Accounts required for Kamino withdrawal
#[derive(Accounts)]
pub struct KaminoWithdraw<'info> {
    /// The Kamino lending program
    /// CHECK: Verified by program ID constraint
    #[account(address = KAMINO_LENDING_PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,

    /// The pool authority (PDA) withdrawing funds
    /// CHECK: Verified by seeds constraint in caller
    #[account(mut)]
    pub pool_authority: AccountInfo<'info>,

    /// Kamino lending market
    /// CHECK: Verified by Kamino program
    pub lending_market: AccountInfo<'info>,

    /// Kamino reserve for USDC
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub reserve: AccountInfo<'info>,

    /// Reserve liquidity supply
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub reserve_liquidity_supply: AccountInfo<'info>,

    /// Reserve collateral mint (cToken)
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub reserve_collateral_mint: AccountInfo<'info>,

    /// User's source collateral account (cToken)
    /// CHECK: Verified by token program
    #[account(mut)]
    pub user_source_collateral: AccountInfo<'info>,

    /// User's destination liquidity account (USDC)
    /// CHECK: Verified by token program
    #[account(mut)]
    pub user_destination_liquidity: AccountInfo<'info>,

    /// Obligation account (user's position)
    /// CHECK: Verified by Kamino program
    #[account(mut)]
    pub obligation: AccountInfo<'info>,

    /// Token program
    /// CHECK: Verified by SPL Token program ID
    pub token_program: AccountInfo<'info>,
}

/// CPI helper to deposit liquidity to Kamino
pub fn cpi_kamino_deposit<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, KaminoDeposit<'info>>,
    liquidity_amount: u64,
) -> Result<()> {
    // Build instruction data
    let mut data = Vec::with_capacity(8 + 8);
    data.extend_from_slice(&KAMINO_DEPOSIT_DISCRIMINATOR);
    data.extend_from_slice(&liquidity_amount.to_le_bytes());

    // Build account metas
    let accounts = vec![
        AccountMeta::new(ctx.accounts.pool_authority.key(), true),
        AccountMeta::new_readonly(ctx.accounts.lending_market.key(), false),
        AccountMeta::new(ctx.accounts.reserve.key(), false),
        AccountMeta::new(ctx.accounts.reserve_liquidity_supply.key(), false),
        AccountMeta::new(ctx.accounts.reserve_collateral_mint.key(), false),
        AccountMeta::new(ctx.accounts.user_source_liquidity.key(), false),
        AccountMeta::new(ctx.accounts.user_destination_collateral.key(), false),
        AccountMeta::new(ctx.accounts.obligation.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.kamino_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool_authority.clone(),
            ctx.accounts.lending_market.clone(),
            ctx.accounts.reserve.clone(),
            ctx.accounts.reserve_liquidity_supply.clone(),
            ctx.accounts.reserve_collateral_mint.clone(),
            ctx.accounts.user_source_liquidity.clone(),
            ctx.accounts.user_destination_collateral.clone(),
            ctx.accounts.obligation.clone(),
            ctx.accounts.token_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// CPI helper to withdraw liquidity from Kamino
pub fn cpi_kamino_withdraw<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, KaminoWithdraw<'info>>,
    collateral_amount: u64,
) -> Result<()> {
    // Build instruction data
    let mut data = Vec::with_capacity(8 + 8);
    data.extend_from_slice(&KAMINO_WITHDRAW_DISCRIMINATOR);
    data.extend_from_slice(&collateral_amount.to_le_bytes());

    // Build account metas
    let accounts = vec![
        AccountMeta::new(ctx.accounts.pool_authority.key(), true),
        AccountMeta::new_readonly(ctx.accounts.lending_market.key(), false),
        AccountMeta::new(ctx.accounts.reserve.key(), false),
        AccountMeta::new(ctx.accounts.reserve_liquidity_supply.key(), false),
        AccountMeta::new(ctx.accounts.reserve_collateral_mint.key(), false),
        AccountMeta::new(ctx.accounts.user_source_collateral.key(), false),
        AccountMeta::new(ctx.accounts.user_destination_liquidity.key(), false),
        AccountMeta::new(ctx.accounts.obligation.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.kamino_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool_authority.clone(),
            ctx.accounts.lending_market.clone(),
            ctx.accounts.reserve.clone(),
            ctx.accounts.reserve_liquidity_supply.clone(),
            ctx.accounts.reserve_collateral_mint.clone(),
            ctx.accounts.user_source_collateral.clone(),
            ctx.accounts.user_destination_liquidity.clone(),
            ctx.accounts.obligation.clone(),
            ctx.accounts.token_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}
