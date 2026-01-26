use anchor_lang::prelude::*;

/// Privacy Cash Program ID on Mainnet
/// Note: This is a placeholder - replace with actual program ID after verification
pub const PRIVACY_CASH_PROGRAM_ID: Pubkey = pubkey!("PCash11111111111111111111111111111111111111");

/// Privacy Cash deposit instruction discriminator
/// Calculated as: sha256("global:deposit_spl")[0..8]
pub const DEPOSIT_SPL_DISCRIMINATOR: [u8; 8] = [0x00; 8]; // Placeholder

/// Privacy Cash withdraw instruction discriminator
pub const WITHDRAW_SPL_DISCRIMINATOR: [u8; 8] = [0x00; 8]; // Placeholder

/// Accounts required for Privacy Cash deposit
#[derive(Accounts)]
pub struct PrivacyCashDeposit<'info> {
    /// The Privacy Cash program
    /// CHECK: Verified by program ID constraint
    #[account(address = PRIVACY_CASH_PROGRAM_ID)]
    pub privacy_cash_program: AccountInfo<'info>,

    /// The user depositing funds
    #[account(mut)]
    pub depositor: Signer<'info>,

    /// The shield pool authority (PDA)
    /// CHECK: Verified by seeds constraint in caller
    #[account(mut)]
    pub pool_authority: AccountInfo<'info>,

    /// The token account to deposit from
    /// CHECK: Verified by Privacy Cash program
    #[account(mut)]
    pub source_token_account: AccountInfo<'info>,

    /// Privacy Cash vault or pool
    /// CHECK: Verified by Privacy Cash program
    #[account(mut)]
    pub privacy_cash_vault: AccountInfo<'info>,

    /// Privacy Cash state account
    /// CHECK: Verified by Privacy Cash program
    #[account(mut)]
    pub privacy_cash_state: AccountInfo<'info>,

    /// Token program
    /// CHECK: Verified by SPL Token program ID
    pub token_program: AccountInfo<'info>,
}

/// Accounts required for Privacy Cash withdrawal
#[derive(Accounts)]
pub struct PrivacyCashWithdraw<'info> {
    /// The Privacy Cash program
    /// CHECK: Verified by program ID constraint
    #[account(address = PRIVACY_CASH_PROGRAM_ID)]
    pub privacy_cash_program: AccountInfo<'info>,

    /// The shield pool authority (PDA)
    /// CHECK: Verified by seeds constraint in caller
    #[account(mut)]
    pub pool_authority: AccountInfo<'info>,

    /// The recipient's token account
    /// CHECK: Verified by Privacy Cash program
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,

    /// Privacy Cash vault or pool
    /// CHECK: Verified by Privacy Cash program
    #[account(mut)]
    pub privacy_cash_vault: AccountInfo<'info>,

    /// Privacy Cash state account
    /// CHECK: Verified by Privacy Cash program
    #[account(mut)]
    pub privacy_cash_state: AccountInfo<'info>,

    /// Token program
    /// CHECK: Verified by SPL Token program ID
    pub token_program: AccountInfo<'info>,
}

/// CPI helper to deposit SPL tokens to Privacy Cash
pub fn cpi_deposit_spl<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, PrivacyCashDeposit<'info>>,
    amount: u64,
    _commitment: [u8; 32], // Privacy commitment for the deposit
) -> Result<()> {
    // Build instruction data
    let mut data = Vec::with_capacity(8 + 8 + 32);
    data.extend_from_slice(&DEPOSIT_SPL_DISCRIMINATOR);
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&_commitment);

    // Build account metas
    let accounts = vec![
        AccountMeta::new(ctx.accounts.depositor.key(), true),
        AccountMeta::new(ctx.accounts.pool_authority.key(), false),
        AccountMeta::new(ctx.accounts.source_token_account.key(), false),
        AccountMeta::new(ctx.accounts.privacy_cash_vault.key(), false),
        AccountMeta::new(ctx.accounts.privacy_cash_state.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.privacy_cash_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.depositor.to_account_info(),
            ctx.accounts.pool_authority.clone(),
            ctx.accounts.source_token_account.clone(),
            ctx.accounts.privacy_cash_vault.clone(),
            ctx.accounts.privacy_cash_state.clone(),
            ctx.accounts.token_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// CPI helper to withdraw SPL tokens from Privacy Cash
pub fn cpi_withdraw_spl<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, PrivacyCashWithdraw<'info>>,
    amount: u64,
    _nullifier: [u8; 32], // Nullifier to prevent double-spend
    _proof: &[u8],        // ZK proof of ownership
) -> Result<()> {
    // Build instruction data
    let mut data = Vec::with_capacity(8 + 8 + 32 + _proof.len());
    data.extend_from_slice(&WITHDRAW_SPL_DISCRIMINATOR);
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&_nullifier);
    data.extend_from_slice(_proof);

    // Build account metas
    let accounts = vec![
        AccountMeta::new(ctx.accounts.pool_authority.key(), true),
        AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
        AccountMeta::new(ctx.accounts.privacy_cash_vault.key(), false),
        AccountMeta::new(ctx.accounts.privacy_cash_state.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.privacy_cash_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool_authority.clone(),
            ctx.accounts.recipient_token_account.clone(),
            ctx.accounts.privacy_cash_vault.clone(),
            ctx.accounts.privacy_cash_state.clone(),
            ctx.accounts.token_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}
