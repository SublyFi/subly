use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use light_sdk::{
    account::LightAccount,
    address::v2::derive_address,
    cpi::{v2::CpiAccounts, CpiSigner, InvokeLightSystemProgram, LightCpiInstruction},
    derive_light_cpi_signer,
    instruction::{PackedAddressTreeInfo, ValidityProof},
};
use light_sdk_types::ADDRESS_TREE_V2;

use crate::constants::*;
use crate::errors::SublyError;
use crate::events::ZkSubscriptionCreatedEvent;
use crate::state::{CompressedSubscription, CompressedSubscriptionTracker, Plan};

// Derive the Light CPI signer at compile time
// This PDA is used to authorize CPIs to the Light System Program
pub const LIGHT_CPI_SIGNER: CpiSigner =
    derive_light_cpi_signer!("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");

/// Subscribe to a plan using ZK compression (Light Protocol)
/// This creates a compressed subscription account that can be proven via ZK proofs
///
/// # Arguments
/// * `proof_data` - Serialized ValidityProof (borsh encoded)
/// * `address_tree_info_data` - Serialized PackedAddressTreeInfo (borsh encoded)
/// * `output_state_tree_index` - Index of the output state tree
/// * `membership_commitment` - Commitment hash for membership proofs
/// * `encrypted_user_commitment` - Encrypted user commitment (Arcium)
pub fn subscribe_zk<'info>(
    ctx: Context<'_, '_, '_, 'info, SubscribeZk<'info>>,
    proof_data: Vec<u8>,
    address_tree_info_data: Vec<u8>,
    output_state_tree_index: u8,
    membership_commitment: [u8; 32],
    encrypted_user_commitment: [u8; 32],
) -> Result<()> {
    // Deserialize Light Protocol types from bytes
    let proof = ValidityProof::try_from_slice(&proof_data)
        .map_err(|_| SublyError::InvalidProofData)?;
    let address_tree_info = PackedAddressTreeInfo::try_from_slice(&address_tree_info_data)
        .map_err(|_| SublyError::InvalidTreeInfo)?;
    // Validate plan is active
    require!(ctx.accounts.plan_account.is_active, SublyError::PlanNotActive);

    let clock = Clock::get()?;
    let signer_key = ctx.accounts.user_account.key();
    let plan_key = ctx.accounts.plan_account.key();

    // Create Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        ctx.accounts.user_account.as_ref(),
        ctx.remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Validate address tree
    let address_tree_pubkey = address_tree_info
        .get_tree_pubkey(&light_cpi_accounts)
        .map_err(|_| SublyError::InvalidMerkleTree)?;

    if address_tree_pubkey.to_bytes() != ADDRESS_TREE_V2 {
        return Err(SublyError::InvalidMerkleTree.into());
    }

    // Derive compressed account address
    // Seeds: ["compressed_sub", plan, membership_commitment]
    let (address, address_seed) = derive_address(
        &[
            COMPRESSED_SUBSCRIPTION_SEED,
            plan_key.as_ref(),
            &membership_commitment,
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Initialize the compressed subscription account
    let mut compressed_subscription = LightAccount::<CompressedSubscription>::new_init(
        &crate::ID,
        Some(address),
        output_state_tree_index,
    );

    // Set the subscription data
    compressed_subscription.owner = signer_key;
    compressed_subscription.plan = plan_key;
    compressed_subscription.membership_commitment = membership_commitment;
    compressed_subscription.encrypted_user_commitment = encrypted_user_commitment;
    compressed_subscription.encrypted_status = [0u8; 64]; // Will be set via MXE callback
    compressed_subscription.status_nonce = [0u8; 16];
    compressed_subscription.created_at = clock.unix_timestamp;
    compressed_subscription.is_active = true;

    // Execute the Light Protocol CPI to create the compressed account
    light_sdk::cpi::v2::LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(compressed_subscription)?
        .with_new_addresses(&[address_tree_info.into_new_address_params_assigned_packed(address_seed, Some(0))])
        .invoke(light_cpi_accounts)?;

    // Update tracker
    let tracker = &mut ctx.accounts.subscription_tracker;
    tracker.total_compressed_subscriptions = tracker
        .total_compressed_subscriptions
        .checked_add(1)
        .ok_or(SublyError::Overflow)?;
    tracker.last_leaf_index = tracker
        .last_leaf_index
        .checked_add(1)
        .ok_or(SublyError::Overflow)?;

    // Emit event
    emit!(ZkSubscriptionCreatedEvent {
        plan: plan_key,
        membership_commitment,
        compressed_address: address,
        leaf_index: tracker.last_leaf_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Initialize the compressed subscription tracker for a plan
pub fn initialize_zk_tracker(ctx: Context<InitializeZkTracker>) -> Result<()> {
    let tracker = &mut ctx.accounts.subscription_tracker;
    tracker.plan = ctx.accounts.plan_account.key();
    tracker.total_compressed_subscriptions = 0;
    tracker.merkle_tree = Pubkey::default(); // Will be set by Light Protocol
    tracker.last_leaf_index = 0;
    tracker.bump = ctx.bumps.subscription_tracker;

    Ok(())
}

#[derive(Accounts)]
pub struct SubscribeZk<'info> {
    /// The user subscribing to the plan
    #[account(mut)]
    pub user_account: Signer<'info>,

    /// The plan being subscribed to
    #[account(
        constraint = plan_account.is_active @ SublyError::PlanNotActive
    )]
    pub plan_account: Account<'info, Plan>,

    /// Tracker for compressed subscriptions
    #[account(
        mut,
        seeds = [b"zk_tracker", plan_account.key().as_ref()],
        bump = subscription_tracker.bump
    )]
    pub subscription_tracker: Account<'info, CompressedSubscriptionTracker>,

    /// System program
    pub system_program: Program<'info, System>,
    // Remaining accounts are passed for Light Protocol CPI:
    // - Light System Program
    // - CPI Authority PDA
    // - Registered Program PDA
    // - Account Compression Authority
    // - Account Compression Program
    // - State tree accounts
    // - Address tree accounts
}

#[derive(Accounts)]
pub struct InitializeZkTracker<'info> {
    /// Authority (business owner)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The plan to track
    pub plan_account: Account<'info, Plan>,

    /// Tracker account to initialize
    #[account(
        init,
        payer = authority,
        space = CompressedSubscriptionTracker::SPACE,
        seeds = [b"zk_tracker", plan_account.key().as_ref()],
        bump
    )]
    pub subscription_tracker: Account<'info, CompressedSubscriptionTracker>,

    /// System program
    pub system_program: Program<'info, System>,
}
