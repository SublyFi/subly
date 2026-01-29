use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use light_sdk::{
    account::LightAccount,
    address::v2::derive_address,
    cpi::{v2::CpiAccounts, InvokeLightSystemProgram, LightCpiInstruction},
    instruction::{PackedAddressTreeInfo, ValidityProof},
};
use light_sdk_types::ADDRESS_TREE_V2;

use crate::constants::*;
use crate::errors::SublyError;
use crate::events::SubscriptionMigratedToZkEvent;
use crate::state::{CompressedSubscription, CompressedSubscriptionTracker, Plan, Subscription};

use super::subscribe_zk::LIGHT_CPI_SIGNER;

/// Migrate an existing PDA subscription to ZK compression
/// This creates a compressed subscription and optionally closes the original PDA
///
/// # Arguments
/// * `proof_data` - Serialized ValidityProof (borsh encoded)
/// * `address_tree_info_data` - Serialized PackedAddressTreeInfo (borsh encoded)
/// * `output_state_tree_index` - Index of the output state tree
/// * `close_original` - Whether to close the original subscription PDA
pub fn migrate_subscription_to_zk<'info>(
    ctx: Context<'_, '_, '_, 'info, MigrateToZk<'info>>,
    proof_data: Vec<u8>,
    address_tree_info_data: Vec<u8>,
    output_state_tree_index: u8,
    close_original: bool,
) -> Result<()> {
    // Deserialize Light Protocol types from bytes
    let proof = ValidityProof::try_from_slice(&proof_data)
        .map_err(|_| SublyError::InvalidProofData)?;
    let address_tree_info = PackedAddressTreeInfo::try_from_slice(&address_tree_info_data)
        .map_err(|_| SublyError::InvalidTreeInfo)?;
    let original_subscription = &ctx.accounts.original_subscription;
    let plan_key = ctx.accounts.plan_account.key();
    let clock = Clock::get()?;

    // Validate the original subscription is active
    require!(
        original_subscription.is_active,
        SublyError::SubscriptionNotActive
    );

    // Validate the subscription belongs to this plan
    require!(
        original_subscription.plan == plan_key,
        SublyError::InvalidPlan
    );

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

    // Use the same membership commitment from original subscription
    let membership_commitment = original_subscription.membership_commitment;

    // Derive compressed account address
    let (address, address_seed) = derive_address(
        &[
            COMPRESSED_SUBSCRIPTION_SEED,
            plan_key.as_ref(),
            &membership_commitment,
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Initialize the compressed subscription with data from original
    let mut compressed_subscription = LightAccount::<CompressedSubscription>::new_init(
        &crate::ID,
        Some(address),
        output_state_tree_index,
    );

    // Copy data from original subscription
    compressed_subscription.owner = ctx.accounts.user_account.key();
    compressed_subscription.plan = plan_key;
    compressed_subscription.membership_commitment = membership_commitment;
    compressed_subscription.encrypted_user_commitment = original_subscription.encrypted_user_commitment;
    compressed_subscription.encrypted_status = original_subscription.encrypted_status;
    compressed_subscription.status_nonce = original_subscription.status_nonce;
    compressed_subscription.created_at = original_subscription.subscribed_at;
    compressed_subscription.is_active = original_subscription.is_active;

    // Execute the Light Protocol CPI
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

    // Optionally close the original subscription account
    if close_original {
        let original = &mut ctx.accounts.original_subscription;
        original.is_active = false;
        original.cancelled_at = clock.unix_timestamp;

        // Transfer lamports back to user
        let lamports = original.to_account_info().lamports();
        **original.to_account_info().try_borrow_mut_lamports()? = 0;
        **ctx.accounts.user_account.try_borrow_mut_lamports()? = ctx
            .accounts
            .user_account
            .lamports()
            .checked_add(lamports)
            .ok_or(SublyError::Overflow)?;
    }

    // Emit migration event
    emit!(SubscriptionMigratedToZkEvent {
        original_subscription: ctx.accounts.original_subscription.key(),
        plan: plan_key,
        membership_commitment,
        compressed_address: address,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct MigrateToZk<'info> {
    /// The user who owns the subscription
    #[account(mut)]
    pub user_account: Signer<'info>,

    /// The plan
    pub plan_account: Account<'info, Plan>,

    /// The original subscription to migrate
    #[account(
        mut,
        constraint = original_subscription.is_active @ SublyError::SubscriptionNotActive,
        constraint = original_subscription.plan == plan_account.key() @ SublyError::InvalidPlan,
        seeds = [SUBSCRIPTION_SEED, plan_account.key().as_ref(), original_subscription.membership_commitment.as_ref()],
        bump = original_subscription.bump
    )]
    pub original_subscription: Account<'info, Subscription>,

    /// Tracker for compressed subscriptions
    #[account(
        mut,
        seeds = [b"zk_tracker", plan_account.key().as_ref()],
        bump = subscription_tracker.bump
    )]
    pub subscription_tracker: Account<'info, CompressedSubscriptionTracker>,

    /// System program
    pub system_program: Program<'info, System>,
    // Remaining accounts for Light Protocol CPI
}
