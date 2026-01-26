use anchor_lang::prelude::*;

/// Tuk Tuk Program ID on Mainnet
/// Tuk Tuk is Helium's on-chain automation engine, replacing the deprecated Clockwork.
/// Source: https://github.com/helium/tuktuk
pub const TUKTUK_PROGRAM_ID: Pubkey = pubkey!("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");

/// Tuk Tuk Cron Program ID on Mainnet
/// Handles scheduled/recurring task execution
pub const TUKTUK_CRON_PROGRAM_ID: Pubkey = pubkey!("cronAjRZnJn3MTP3B9kE62NWDrjSuAPVXf9c4hu4grM");

// Note: Clockwork was shut down on October 31, 2023.
// The following constants are kept for backwards compatibility reference only.
#[allow(dead_code)]
const DEPRECATED_CLOCKWORK_PROGRAM_ID: Pubkey =
    pubkey!("CLoCKyJ6DXBJqqu2VWx9RLbgnwwR6BMHHuyasVmfMzBh");

/// Trigger types for Tuk Tuk scheduled tasks
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TukTukTrigger {
    /// Cron-based trigger using cron syntax (e.g., "0 0 * * *" for daily)
    Cron { schedule: String, skippable: bool },
    /// One-time trigger at a specific Unix timestamp
    Timestamp { unix_ts: i64 },
    /// Trigger on a specific slot
    Slot { slot: u64 },
    /// Trigger on a specific epoch
    Epoch { epoch: u64 },
    /// Trigger on account data change
    Account {
        address: Pubkey,
        offset: u64,
        size: u64,
    },
}

/// Settings for a Tuk Tuk cron job
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CronJobSettings {
    /// Minimum reward for crankers
    pub min_crank_reward: Option<u64>,
    /// The instruction to execute
    pub target_instruction: Option<SerializableInstruction>,
    /// Trigger configuration
    pub trigger: Option<TukTukTrigger>,
}

/// Serializable instruction for cron job execution
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

/// Accounts required for creating a Tuk Tuk cron job
#[derive(Accounts)]
pub struct TukTukCronJobCreate<'info> {
    /// The Tuk Tuk cron program
    /// CHECK: Verified by program ID constraint
    #[account(address = TUKTUK_CRON_PROGRAM_ID)]
    pub tuktuk_cron_program: AccountInfo<'info>,

    /// The payer for cron job creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The authority for the cron job
    /// CHECK: This is the pool authority PDA
    pub authority: AccountInfo<'info>,

    /// The task queue account
    /// CHECK: Verified by Tuk Tuk program
    #[account(mut)]
    pub task_queue: AccountInfo<'info>,

    /// The cron job account to be created
    /// CHECK: Verified by Tuk Tuk program
    #[account(mut)]
    pub cron_job: AccountInfo<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Accounts required for closing a Tuk Tuk cron job
#[derive(Accounts)]
pub struct TukTukCronJobClose<'info> {
    /// The Tuk Tuk cron program
    /// CHECK: Verified by program ID constraint
    #[account(address = TUKTUK_CRON_PROGRAM_ID)]
    pub tuktuk_cron_program: AccountInfo<'info>,

    /// The authority for the cron job
    /// CHECK: This is the pool authority PDA
    pub authority: AccountInfo<'info>,

    /// The cron job account to be closed
    /// CHECK: Verified by Tuk Tuk program
    #[account(mut)]
    pub cron_job: AccountInfo<'info>,

    /// Account to receive the remaining lamports
    /// CHECK: Any account can receive lamports
    #[account(mut)]
    pub refund_to: AccountInfo<'info>,
}

/// Create a Tuk Tuk cron job for automated transfer execution
///
/// Note: In the current architecture, cron job creation is handled via the
/// TypeScript SDK (@helium/cron-sdk) which provides better ergonomics.
/// This CPI interface is available for future on-chain automation needs.
pub fn create_cron_job<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, TukTukCronJobCreate<'info>>,
    job_name: Vec<u8>,
    target_instruction: SerializableInstruction,
    trigger: TukTukTrigger,
) -> Result<()> {
    // Cron job create discriminator
    // Note: Actual discriminator should be calculated from Tuk Tuk IDL
    let discriminator: [u8; 8] = [0x00; 8]; // Placeholder - use SDK for actual implementation

    // Serialize the instruction data
    let cron_settings = CronJobSettings {
        min_crank_reward: Some(5000), // ~5000 lamports minimum
        target_instruction: Some(target_instruction),
        trigger: Some(trigger),
    };

    let mut data = Vec::new();
    data.extend_from_slice(&discriminator);
    data.extend_from_slice(&(job_name.len() as u32).to_le_bytes());
    data.extend_from_slice(&job_name);
    cron_settings.serialize(&mut data)?;

    // Build account metas
    let accounts = vec![
        AccountMeta::new(ctx.accounts.payer.key(), true),
        AccountMeta::new_readonly(ctx.accounts.authority.key(), false),
        AccountMeta::new(ctx.accounts.task_queue.key(), false),
        AccountMeta::new(ctx.accounts.cron_job.key(), false),
        AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.tuktuk_cron_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.authority.clone(),
            ctx.accounts.task_queue.clone(),
            ctx.accounts.cron_job.clone(),
            ctx.accounts.system_program.to_account_info(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Close a Tuk Tuk cron job
pub fn close_cron_job<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, TukTukCronJobClose<'info>>,
) -> Result<()> {
    // Cron job close discriminator
    let discriminator: [u8; 8] = [0x00; 8]; // Placeholder - use SDK for actual implementation

    let data = discriminator.to_vec();

    // Build account metas
    let accounts = vec![
        AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
        AccountMeta::new(ctx.accounts.cron_job.key(), false),
        AccountMeta::new(ctx.accounts.refund_to.key(), false),
    ];

    // Execute CPI
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.tuktuk_cron_program.key(),
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.authority.clone(),
            ctx.accounts.cron_job.clone(),
            ctx.accounts.refund_to.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Derive the cron job PDA address
pub fn get_cron_job_pda(task_queue: &Pubkey, job_name: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"cron_job", task_queue.as_ref(), job_name],
        &TUKTUK_CRON_PROGRAM_ID,
    )
}

/// Derive the task queue PDA address
pub fn get_task_queue_pda(authority: &Pubkey, queue_name: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"task_queue", authority.as_ref(), queue_name],
        &TUKTUK_PROGRAM_ID,
    )
}

// Legacy aliases for backwards compatibility during migration
pub type Trigger = TukTukTrigger;
pub type ThreadSettings = CronJobSettings;
