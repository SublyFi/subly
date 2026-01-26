use anchor_lang::prelude::*;

/// Clockwork Thread Program ID
/// Note: This is the official Clockwork thread program on Mainnet
pub const CLOCKWORK_THREAD_PROGRAM_ID: Pubkey =
    pubkey!("CLoCKyJ6DXBJqqu2VWx9RLbgnwwR6BMHHuyasVmfMzBh");

/// Thread trigger types
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Trigger {
    /// Cron-based trigger
    Cron { schedule: String, skippable: bool },
    /// Timestamp-based trigger
    Timestamp { unix_ts: i64 },
    /// Slot-based trigger
    Slot { slot: u64 },
    /// Epoch-based trigger
    Epoch { epoch: u64 },
    /// Account change trigger
    Account {
        address: Pubkey,
        offset: u64,
        size: u64,
    },
}

/// Thread settings
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ThreadSettings {
    pub fee: Option<u64>,
    pub kickoff_instruction: Option<SerializableInstruction>,
    pub trigger: Option<Trigger>,
}

/// Serializable instruction for thread execution
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SerializableInstruction {
    pub program_id: Pubkey,
    pub accounts: Vec<SerializableAccountMeta>,
    pub data: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SerializableAccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

/// Accounts required for creating a Clockwork thread
#[derive(Accounts)]
pub struct ClockworkThreadCreate<'info> {
    /// The Clockwork thread program
    /// CHECK: Verified by program ID constraint
    #[account(address = CLOCKWORK_THREAD_PROGRAM_ID)]
    pub clockwork_program: AccountInfo<'info>,

    /// The payer for thread creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The authority for the thread
    /// CHECK: This is the pool authority PDA
    pub authority: AccountInfo<'info>,

    /// The thread account to be created
    /// CHECK: Verified by Clockwork program
    #[account(mut)]
    pub thread: AccountInfo<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Accounts required for deleting a Clockwork thread
#[derive(Accounts)]
pub struct ClockworkThreadDelete<'info> {
    /// The Clockwork thread program
    /// CHECK: Verified by program ID constraint
    #[account(address = CLOCKWORK_THREAD_PROGRAM_ID)]
    pub clockwork_program: AccountInfo<'info>,

    /// The authority for the thread
    /// CHECK: This is the pool authority PDA
    pub authority: AccountInfo<'info>,

    /// The thread account to be deleted
    /// CHECK: Verified by Clockwork program
    #[account(mut)]
    pub thread: AccountInfo<'info>,

    /// Account to receive the remaining lamports
    /// CHECK: Any account can receive lamports
    #[account(mut)]
    pub close_to: AccountInfo<'info>,
}

/// Create a Clockwork thread for automated transfer execution
pub fn create_thread<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, ClockworkThreadCreate<'info>>,
    thread_id: Vec<u8>,
    kickoff_instruction: SerializableInstruction,
    trigger: Trigger,
) -> Result<()> {
    // Thread create discriminator: sha256("global:thread_create")[0..8]
    let discriminator: [u8; 8] = [0x00; 8]; // Placeholder

    // Serialize the instruction data
    let thread_settings = ThreadSettings {
        fee: None,
        kickoff_instruction: Some(kickoff_instruction),
        trigger: Some(trigger),
    };

    let mut data = Vec::new();
    data.extend_from_slice(&discriminator);
    data.extend_from_slice(&(thread_id.len() as u32).to_le_bytes());
    data.extend_from_slice(&thread_id);
    thread_settings.serialize(&mut data)?;

    // Build account metas
    let accounts = vec![
        AccountMeta::new(ctx.accounts.payer.key(), true),
        AccountMeta::new_readonly(ctx.accounts.authority.key(), false),
        AccountMeta::new(ctx.accounts.thread.key(), false),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.clockwork_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.authority.clone(),
            ctx.accounts.thread.clone(),
            ctx.accounts.system_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Delete a Clockwork thread
pub fn delete_thread<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, ClockworkThreadDelete<'info>>,
) -> Result<()> {
    // Thread delete discriminator: sha256("global:thread_delete")[0..8]
    let discriminator: [u8; 8] = [0x00; 8]; // Placeholder

    let data = discriminator.to_vec();

    // Build account metas
    let accounts = vec![
        AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
        AccountMeta::new(ctx.accounts.thread.key(), false),
        AccountMeta::new(ctx.accounts.close_to.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.clockwork_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.authority.clone(),
            ctx.accounts.thread.clone(),
            ctx.accounts.close_to.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Derive the thread PDA address
pub fn get_thread_pda(authority: &Pubkey, thread_id: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"thread", authority.as_ref(), thread_id],
        &CLOCKWORK_THREAD_PROGRAM_ID,
    )
}
