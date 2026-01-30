use anchor_lang::prelude::*;
// sha2 crate removed - callback_ix helper handles discriminator generation

pub mod arcium;
pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use arcium::prelude::*;
use arcium::{comp_def_offsets, queue_computation, DEFAULT_CU_PRICE_MICRO, DEFAULT_NUM_CALLBACK_TXS};
use arcium::SignedComputationOutputs;

// ErrorCode enum required by callback_accounts macro
// Uses Anchor's #[error_code] to implement necessary conversions
#[error_code]
pub enum ErrorCode {
    #[msg("The cluster is not set")]
    ClusterNotSet,
    #[msg("The computation was aborted")]
    AbortedComputation,
}
use arcium_client::idl::arcium::types::CallbackAccount;
use arcium_macros::{arcium_program, arcium_callback, callback_accounts, init_computation_definition_accounts};
use constants::*;
use errors::SublyError;
use events::*;
use instructions::*;
use state::*;

// Note: Light Protocol types are used internally but not re-exported
// to avoid Anchor IDL generation issues. Instruction parameters use byte arrays
// which are deserialized internally to Light Protocol types.

declare_id!("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");

// ============================================
// Arcium MXE Integration Notes
// ============================================
// The Arcium MXE integration requires:
// 1. Running `arcium build` first to generate .arcis circuit files
// 2. Using #[arcium_program] macro (replaces #[program])
// 3. Using #[arcium_callback] macro for callback functions
// 4. Using queue_computation_accounts macro for account structures
// 5. Implementing QueueCompAccs trait for the accounts
//
// The MXE commands (subscribe_with_mxe, cancel_subscription_with_mxe)
// are currently placeholders that will queue computations once the
// full Arcium infrastructure is set up.
// ============================================

#[arcium_program]
pub mod subly_devnet {
    use super::*;

    /// Initialize MXE account for Arcium integration
    /// This should be called once after program deployment
    pub fn initialize_mxe(ctx: Context<InitializeMxe>) -> Result<()> {
        let mxe_account = &mut ctx.accounts.mxe_account;
        mxe_account.bump = ctx.bumps.mxe_account;

        let clock = Clock::get()?;
        emit!(MxeInitializedEvent {
            mxe_account: mxe_account.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============================================
    // Computation Definition Initialization
    // ============================================
    // These instructions must be called once per encrypted instruction
    // to register the computation definition with Arcium.

    /// Initialize computation definition for set_subscription_active
    pub fn init_set_subscription_active_comp_def(
        ctx: Context<InitSetSubscriptionActiveCompDef>,
    ) -> Result<()> {
        arcium::init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize computation definition for set_subscription_cancelled
    pub fn init_set_subscription_cancelled_comp_def(
        ctx: Context<InitSetSubscriptionCancelledCompDef>,
    ) -> Result<()> {
        arcium::init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize computation definition for increment_count
    pub fn init_increment_count_comp_def(
        ctx: Context<InitIncrementCountCompDef>,
    ) -> Result<()> {
        arcium::init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize computation definition for decrement_count
    pub fn init_decrement_count_comp_def(
        ctx: Context<InitDecrementCountCompDef>,
    ) -> Result<()> {
        arcium::init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize computation definition for initialize_count
    pub fn init_initialize_count_comp_def(
        ctx: Context<InitInitializeCountCompDef>,
    ) -> Result<()> {
        arcium::init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize computation definition for initialize_subscription_status
    pub fn init_initialize_subscription_status_comp_def(
        ctx: Context<InitInitializeSubscriptionStatusCompDef>,
    ) -> Result<()> {
        arcium::init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Register a new business account
    pub fn register_business(
        ctx: Context<RegisterBusiness>,
        name: String,
        metadata_uri: String,
    ) -> Result<()> {
        // Validate name length
        require!(
            name.len() <= MAX_NAME_LENGTH,
            SublyError::InvalidNameLength
        );

        // Validate metadata URI length
        require!(
            metadata_uri.len() <= MAX_METADATA_URI_LENGTH,
            SublyError::InvalidMetadataUriLength
        );

        let business_account = &mut ctx.accounts.business_account;
        let clock = Clock::get()?;

        // Initialize business account
        business_account.authority = ctx.accounts.authority_account.key();
        business_account.name = name.clone();
        business_account.metadata_uri = metadata_uri;
        business_account.created_at = clock.unix_timestamp;
        business_account.is_active = true;
        business_account.plan_count = 0;
        business_account.bump = ctx.bumps.business_account;

        // Emit event
        emit!(BusinessRegisteredEvent {
            business: business_account.key(),
            authority: business_account.authority,
            name,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Create a new subscription plan
    pub fn create_plan(
        ctx: Context<CreatePlan>,
        encrypted_name: [u8; 32],
        encrypted_description: [u8; 64],
        price_usdc: u64,
        billing_cycle_seconds: u32,
        nonce: u128,
    ) -> Result<()> {
        // Validate price (must be > 0)
        require!(price_usdc > 0, SublyError::InvalidPrice);

        // Validate billing cycle
        require!(
            billing_cycle_seconds >= MIN_BILLING_CYCLE_SECONDS
                && billing_cycle_seconds <= MAX_BILLING_CYCLE_SECONDS,
            SublyError::InvalidBillingCycle
        );

        // Validate business is active
        require!(
            ctx.accounts.business_account.is_active,
            SublyError::Unauthorized
        );

        // Validate authority
        require!(
            ctx.accounts.authority_account.key() == ctx.accounts.business_account.authority,
            SublyError::Unauthorized
        );

        let business_account = &mut ctx.accounts.business_account;
        let plan_account = &mut ctx.accounts.plan_account;
        let clock = Clock::get()?;

        // Get the plan nonce (sequential number for this business)
        let plan_nonce = business_account.plan_count;

        // Initialize plan account
        plan_account.plan_id = plan_account.key();
        plan_account.business = business_account.key();
        plan_account.encrypted_name = encrypted_name;
        plan_account.encrypted_description = encrypted_description;
        plan_account.price_usdc = price_usdc;
        plan_account.billing_cycle_seconds = billing_cycle_seconds;
        plan_account.created_at = clock.unix_timestamp;
        plan_account.is_active = true;
        plan_account.encrypted_subscription_count = [0u8; 32];
        plan_account.nonce = nonce;
        plan_account.plan_nonce = plan_nonce;
        plan_account.bump = ctx.bumps.plan_account;
        plan_account.pending_count_encryption = false; // No Arcium CPI in this version

        // Increment business plan count
        business_account.plan_count = business_account.plan_count.checked_add(1).unwrap();

        // Emit event
        emit!(PlanCreatedEvent {
            plan: plan_account.key(),
            business: business_account.key(),
            price_usdc,
            billing_cycle_seconds,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Subscribe to a plan
    pub fn subscribe(
        ctx: Context<Subscribe>,
        encrypted_user_commitment: [u8; 32],
        membership_commitment: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        // Validate plan is active
        require!(
            ctx.accounts.plan_account.is_active,
            SublyError::PlanNotActive
        );

        let plan_account = &ctx.accounts.plan_account;
        let subscription_account = &mut ctx.accounts.subscription_account;
        let clock = Clock::get()?;

        // Initialize subscription account
        subscription_account.subscription_id = subscription_account.key();
        subscription_account.plan = plan_account.key();
        subscription_account.encrypted_user_commitment = encrypted_user_commitment;
        subscription_account.membership_commitment = membership_commitment;
        subscription_account.subscribed_at = clock.unix_timestamp;
        subscription_account.cancelled_at = 0;
        subscription_account.is_active = true;
        subscription_account.nonce = nonce;
        subscription_account.bump = ctx.bumps.subscription_account;
        // Initialize encrypted status fields (will be updated via MXE callback)
        subscription_account.encrypted_status = [0u8; 64];
        subscription_account.status_nonce = [0u8; 16];

        // Emit event
        emit!(SubscriptionCreatedEvent {
            subscription: subscription_account.key(),
            plan: plan_account.key(),
            membership_commitment,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Subscribe to a plan with Arcium MXE encryption
    /// This version queues encrypted computations for subscription status and count
    pub fn subscribe_with_arcium(
        ctx: Context<SubscribeWithArcium>,
        computation_offset: u64,
        encrypted_user_commitment: [u8; 32],
        membership_commitment: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        // Validate plan is active
        require!(
            ctx.accounts.plan_account.is_active,
            SublyError::PlanNotActive
        );

        let clock = Clock::get()?;

        // Capture keys for event before mutable borrow
        let subscription_key = ctx.accounts.subscription_account.key();
        let plan_key = ctx.accounts.plan_account.key();

        // Initialize subscription account
        {
            let subscription_account = &mut ctx.accounts.subscription_account;
            subscription_account.subscription_id = subscription_key;
            subscription_account.plan = plan_key;
            subscription_account.encrypted_user_commitment = encrypted_user_commitment;
            subscription_account.membership_commitment = membership_commitment;
            subscription_account.subscribed_at = clock.unix_timestamp;
            subscription_account.cancelled_at = 0;
            subscription_account.is_active = true;
            subscription_account.nonce = nonce;
            subscription_account.bump = ctx.bumps.subscription_account;
            // Initialize encrypted status fields (will be updated via MXE callback)
            subscription_account.encrypted_status = [0u8; 64];
            subscription_account.status_nonce = [0u8; 16];
            // Mark as pending encryption until callback is received
            subscription_account.pending_encryption = true;
        }

        // Build arguments for set_subscription_active computation
        // Input is Enc<Mxe, i64> - the subscription timestamp
        let args = ArgBuilder::new()
            .plaintext_i64(clock.unix_timestamp)
            .build();

        // Build callback instruction using the generated helper method
        // The callback_ix helper handles the 6 standard Arcium accounts automatically
        let callback_ix = SetSubscriptionActiveCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount {
                pubkey: subscription_key,
                is_writable: true,
            }],
        )?;

        // Queue the set_subscription_active computation
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None, // No callback server
            vec![callback_ix],
            DEFAULT_NUM_CALLBACK_TXS,
            DEFAULT_CU_PRICE_MICRO,
        )?;

        // Emit event
        emit!(SubscriptionCreatedEvent {
            subscription: subscription_key,
            plan: plan_key,
            membership_commitment,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Get the encrypted subscription count for a plan
    /// Returns the encrypted count that can be decrypted by authorized parties
    pub fn get_subscription_count(ctx: Context<GetSubscriptionCount>) -> Result<[u8; 32]> {
        let plan_account = &ctx.accounts.plan_account;

        // Validate plan exists and is active
        require!(plan_account.is_active, SublyError::PlanNotActive);

        Ok(plan_account.encrypted_subscription_count)
    }

    /// Cancel a subscription
    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let subscription_account = &mut ctx.accounts.subscription_account;
        let clock = Clock::get()?;

        // Validate subscription is active
        require!(
            subscription_account.is_active,
            SublyError::SubscriptionNotActive
        );

        // Mark as cancelled
        subscription_account.is_active = false;
        subscription_account.cancelled_at = clock.unix_timestamp;

        Ok(())
    }

    /// Cancel a subscription with Arcium MXE encryption
    /// This version queues encrypted computations for status and count updates
    pub fn cancel_subscription_with_arcium(
        ctx: Context<CancelSubscriptionWithArcium>,
        computation_offset: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // Capture keys for callback and event
        let subscription_key = ctx.accounts.subscription_account.key();
        let plan_key = ctx.accounts.plan_account.key();

        // Validate and update subscription
        {
            let subscription_account = &mut ctx.accounts.subscription_account;

            // Validate subscription is active
            require!(
                subscription_account.is_active,
                SublyError::SubscriptionNotActive
            );

            // Mark as cancelled
            subscription_account.is_active = false;
            subscription_account.cancelled_at = clock.unix_timestamp;
            subscription_account.pending_encryption = true;
        }

        // Build arguments for set_subscription_cancelled computation
        let args = ArgBuilder::new()
            .plaintext_i64(clock.unix_timestamp)
            .build();

        // Build callback instruction using the generated helper method
        let callback_ix = SetSubscriptionCancelledCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &[CallbackAccount {
                pubkey: subscription_key,
                is_writable: true,
            }],
        )?;

        // Queue the set_subscription_cancelled computation
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![callback_ix],
            DEFAULT_NUM_CALLBACK_TXS,
            DEFAULT_CU_PRICE_MICRO,
        )?;

        // Emit event
        emit!(SubscriptionCancelledEvent {
            subscription: subscription_key,
            plan: plan_key,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Deactivate a plan (business owner only)
    pub fn deactivate_plan(ctx: Context<DeactivatePlan>) -> Result<()> {
        let plan_account = &mut ctx.accounts.plan_account;

        // Validate plan is currently active
        require!(plan_account.is_active, SublyError::PlanNotActive);

        // Deactivate the plan
        plan_account.is_active = false;

        Ok(())
    }

    // ============================================
    // Arcium MXE Callback Functions
    // ============================================
    // These callbacks are invoked by the Arcium network when MXE computations complete.
    // Callback function names must follow the pattern: <encrypted_ix>_callback
    // They receive SignedComputationOutputs<T> which must be verified before use.

    /// Callback for increment_count MXE computation
    /// Called by Arcium when the encrypted increment operation completes
    #[arcium_callback(encrypted_ix = "increment_count")]
    pub fn increment_count_callback(
        ctx: Context<IncrementCountCallback>,
        output: SignedComputationOutputs<IncrementCountOutput>,
    ) -> Result<()> {
        // Verify and extract the output
        let verified_output = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|_| SublyError::InvalidComputationOutput)?;

        // Update the plan's encrypted subscription count
        let plan_account = &mut ctx.accounts.plan_account;
        // The output contains encrypted u64 as ciphertexts (accessed via field_0)
        // ciphertexts is [[u8; 32]], so we take the first element
        if !verified_output.field_0.ciphertexts.is_empty() {
            plan_account.encrypted_subscription_count
                .copy_from_slice(&verified_output.field_0.ciphertexts[0]);
        }
        plan_account.pending_count_encryption = false;

        let clock = Clock::get()?;
        emit!(SubscriptionCountUpdatedEvent {
            plan: plan_account.key(),
            encrypted_count: plan_account.encrypted_subscription_count,
            nonce: [0u8; 16], // Nonce is handled internally by Arcium
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Callback for decrement_count MXE computation
    /// Called by Arcium when the encrypted decrement operation completes
    #[arcium_callback(encrypted_ix = "decrement_count")]
    pub fn decrement_count_callback(
        ctx: Context<DecrementCountCallback>,
        output: SignedComputationOutputs<DecrementCountOutput>,
    ) -> Result<()> {
        // Verify and extract the output
        let verified_output = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|_| SublyError::InvalidComputationOutput)?;

        // Update the plan's encrypted subscription count
        let plan_account = &mut ctx.accounts.plan_account;
        if !verified_output.field_0.ciphertexts.is_empty() {
            plan_account.encrypted_subscription_count
                .copy_from_slice(&verified_output.field_0.ciphertexts[0]);
        }
        plan_account.pending_count_encryption = false;

        let clock = Clock::get()?;
        emit!(SubscriptionCountUpdatedEvent {
            plan: plan_account.key(),
            encrypted_count: plan_account.encrypted_subscription_count,
            nonce: [0u8; 16],
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============================================
    // Subscription Status Encryption Callbacks
    // ============================================
    // These callbacks update the encrypted subscription status
    // (is_active, subscribed_at, cancelled_at) on the Subscription account.

    /// Callback for set_subscription_active MXE computation
    /// Called by Arcium when the encrypted status is ready after subscription
    #[arcium_callback(encrypted_ix = "set_subscription_active")]
    pub fn set_subscription_active_callback(
        ctx: Context<SetSubscriptionActiveCallback>,
        output: SignedComputationOutputs<SetSubscriptionActiveOutput>,
    ) -> Result<()> {
        // Verify and extract the output
        let verified_output = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|_| SublyError::InvalidComputationOutput)?;

        let subscription_account = &mut ctx.accounts.subscription_account;
        // The output contains encrypted SubscriptionStatus (accessed via field_0)
        // ciphertexts is [[u8; 32]], we need 2 elements for 64 bytes
        let ciphertexts = &verified_output.field_0.ciphertexts;
        if ciphertexts.len() >= 2 {
            subscription_account.encrypted_status[..32].copy_from_slice(&ciphertexts[0]);
            subscription_account.encrypted_status[32..64].copy_from_slice(&ciphertexts[1]);
        }
        subscription_account.pending_encryption = false;

        let clock = Clock::get()?;
        emit!(SubscriptionStatusEncryptedEvent {
            subscription: subscription_account.key(),
            encrypted_status: subscription_account.encrypted_status,
            status_nonce: [0u8; 16],
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Callback for set_subscription_cancelled MXE computation
    /// Called by Arcium when the encrypted cancellation status is ready
    #[arcium_callback(encrypted_ix = "set_subscription_cancelled")]
    pub fn set_subscription_cancelled_callback(
        ctx: Context<SetSubscriptionCancelledCallback>,
        output: SignedComputationOutputs<SetSubscriptionCancelledOutput>,
    ) -> Result<()> {
        // Verify and extract the output
        let verified_output = output
            .verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account)
            .map_err(|_| SublyError::InvalidComputationOutput)?;

        let subscription_account = &mut ctx.accounts.subscription_account;
        let ciphertexts = &verified_output.field_0.ciphertexts;
        if ciphertexts.len() >= 2 {
            subscription_account.encrypted_status[..32].copy_from_slice(&ciphertexts[0]);
            subscription_account.encrypted_status[32..64].copy_from_slice(&ciphertexts[1]);
        }
        subscription_account.pending_encryption = false;

        let clock = Clock::get()?;
        emit!(SubscriptionStatusEncryptedEvent {
            subscription: subscription_account.key(),
            encrypted_status: subscription_account.encrypted_status,
            status_nonce: [0u8; 16],
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ============================================
    // Light Protocol ZK Compression Instructions
    // ============================================
    // These instructions use Light Protocol for ZK compressed subscriptions
    // allowing membership proofs without revealing subscriber identity.

    /// Initialize ZK subscription tracker for a plan
    /// This must be called before creating ZK compressed subscriptions
    pub fn initialize_zk_tracker(ctx: Context<InitializeZkTracker>) -> Result<()> {
        instructions::initialize_zk_tracker(ctx)
    }

    /// Subscribe to a plan using ZK compression (Light Protocol)
    /// Creates a compressed subscription that can be proven via ZK proofs
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
        instructions::subscribe_zk(
            ctx,
            proof_data,
            address_tree_info_data,
            output_state_tree_index,
            membership_commitment,
            encrypted_user_commitment,
        )
    }

    /// Verify membership on-chain using ZK proof
    /// Validates that a membership commitment exists in the state tree
    ///
    /// # Arguments
    /// * `proof_data` - Serialized ValidityProof (borsh encoded)
    /// * `account_meta_data` - Serialized CompressedAccountMeta (borsh encoded)
    /// * `membership_commitment` - Commitment hash to verify
    /// * `owner` - Expected owner of the subscription
    pub fn verify_membership<'info>(
        ctx: Context<'_, '_, '_, 'info, VerifyMembership<'info>>,
        proof_data: Vec<u8>,
        account_meta_data: Vec<u8>,
        membership_commitment: [u8; 32],
        owner: Pubkey,
    ) -> Result<()> {
        instructions::verify_membership(
            ctx,
            proof_data,
            account_meta_data,
            membership_commitment,
            owner,
        )
    }

    /// Verify membership off-chain (signature-based)
    /// Simple verification using proof signature and expiry
    pub fn verify_membership_offchain(
        ctx: Context<VerifyMembershipOffchain>,
        membership_commitment: [u8; 32],
        proof_signature: [u8; 64],
        proof_nonce: [u8; 32],
        valid_until: i64,
    ) -> Result<()> {
        instructions::verify_membership_offchain(
            ctx,
            membership_commitment,
            proof_signature,
            proof_nonce,
            valid_until,
        )
    }

    /// Migrate existing PDA subscription to ZK compression
    /// Creates a compressed subscription and optionally closes the original PDA
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
        instructions::migrate_subscription_to_zk(
            ctx,
            proof_data,
            address_tree_info_data,
            output_state_tree_index,
            close_original,
        )
    }
}

// ============================================
// Account Structures
// ============================================

#[derive(Accounts)]
pub struct InitializeMxe<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = MxeAccount::SPACE,
        seeds = [b"mxe"],
        bump
    )]
    pub mxe_account: Account<'info, MxeAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterBusiness<'info> {
    /// The authority (owner) of the business
    #[account(mut)]
    pub authority_account: Signer<'info>,

    /// The business account PDA to create
    #[account(
        init,
        payer = authority_account,
        space = BusinessAccount::SPACE,
        seeds = [BUSINESS_SEED, authority_account.key().as_ref()],
        bump
    )]
    pub business_account: Account<'info, BusinessAccount>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    encrypted_name: [u8; 32],
    encrypted_description: [u8; 64],
    price_usdc: u64,
    billing_cycle_seconds: u32,
    nonce: u128
)]
pub struct CreatePlan<'info> {
    /// The authority (owner) of the business
    #[account(mut)]
    pub authority_account: Signer<'info>,

    /// The business account that owns this plan
    #[account(
        mut,
        seeds = [BUSINESS_SEED, authority_account.key().as_ref()],
        bump = business_account.bump,
        constraint = business_account.authority == authority_account.key() @ SublyError::Unauthorized
    )]
    pub business_account: Account<'info, BusinessAccount>,

    /// The plan account PDA to create
    #[account(
        init,
        payer = authority_account,
        space = Plan::SPACE,
        seeds = [PLAN_SEED, business_account.key().as_ref(), &business_account.plan_count.to_le_bytes()],
        bump
    )]
    pub plan_account: Account<'info, Plan>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    encrypted_user_commitment: [u8; 32],
    membership_commitment: [u8; 32],
    nonce: u128
)]
pub struct Subscribe<'info> {
    /// The user subscribing to the plan
    #[account(mut)]
    pub user_account: Signer<'info>,

    /// The plan being subscribed to
    #[account(
        mut,
        constraint = plan_account.is_active @ SublyError::PlanNotActive
    )]
    pub plan_account: Account<'info, Plan>,

    /// The subscription account PDA to create
    #[account(
        init,
        payer = user_account,
        space = Subscription::SPACE,
        seeds = [SUBSCRIPTION_SEED, plan_account.key().as_ref(), membership_commitment.as_ref()],
        bump
    )]
    pub subscription_account: Account<'info, Subscription>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Subscribe with Arcium MXE encryption
/// This account structure includes all required Arcium accounts for queue_computation
#[queue_computation_accounts("set_subscription_active", payer)]
#[derive(Accounts)]
#[instruction(
    computation_offset: u64,
    encrypted_user_commitment: [u8; 32],
    membership_commitment: [u8; 32],
    nonce: u128
)]
pub struct SubscribeWithArcium<'info> {
    /// The payer for the transaction (user subscribing)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// MXE Account - Arcium MXE configuration
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// Mempool Account
    /// CHECK: Validated by Arcium program
    #[account(mut, address = derive_mempool_pda!(mxe_account, SublyError::InvalidMxeAccount))]
    pub mempool_account: UncheckedAccount<'info>,

    /// Executing Pool
    /// CHECK: Validated by Arcium program
    #[account(mut, address = derive_execpool_pda!(mxe_account, SublyError::InvalidMxeAccount))]
    pub executing_pool: UncheckedAccount<'info>,

    /// Computation Account
    /// CHECK: Validated by Arcium program
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, SublyError::InvalidMxeAccount))]
    pub computation_account: UncheckedAccount<'info>,

    /// Computation Definition Account for set_subscription_active
    #[account(address = derive_comp_def_pda!(comp_def_offsets::SET_SUBSCRIPTION_ACTIVE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    /// Cluster Account
    #[account(mut, address = derive_cluster_pda!(mxe_account, SublyError::InvalidMxeAccount))]
    pub cluster_account: Account<'info, Cluster>,

    /// Fee Pool Account
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    /// Clock Account
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    /// Sign PDA for CPI signing
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [arcium_anchor::SIGN_PDA_SEED],
        bump,
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,

    /// System Program
    pub system_program: Program<'info, System>,

    /// Arcium Program
    pub arcium_program: Program<'info, Arcium>,

    // --- Custom accounts for this instruction ---

    /// The plan being subscribed to
    #[account(
        mut,
        constraint = plan_account.is_active @ SublyError::PlanNotActive
    )]
    pub plan_account: Account<'info, Plan>,

    /// The subscription account PDA to create
    #[account(
        init,
        payer = payer,
        space = Subscription::SPACE,
        seeds = [SUBSCRIPTION_SEED, plan_account.key().as_ref(), membership_commitment.as_ref()],
        bump
    )]
    pub subscription_account: Account<'info, Subscription>,
}

#[derive(Accounts)]
pub struct GetSubscriptionCount<'info> {
    /// The plan to get subscription count for
    #[account(
        constraint = plan_account.is_active @ SublyError::PlanNotActive
    )]
    pub plan_account: Account<'info, Plan>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    /// The user who owns the subscription
    #[account(mut)]
    pub user_account: Signer<'info>,

    /// The subscription to cancel
    #[account(
        mut,
        constraint = subscription_account.is_active @ SublyError::SubscriptionNotActive,
        seeds = [SUBSCRIPTION_SEED, subscription_account.plan.as_ref(), subscription_account.membership_commitment.as_ref()],
        bump = subscription_account.bump
    )]
    pub subscription_account: Account<'info, Subscription>,
}

/// Cancel subscription with Arcium MXE encryption
/// This account structure includes all required Arcium accounts for queue_computation
#[queue_computation_accounts("set_subscription_cancelled", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CancelSubscriptionWithArcium<'info> {
    /// The payer for the transaction (user cancelling)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// MXE Account - Arcium MXE configuration
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// Mempool Account
    /// CHECK: Validated by Arcium program
    #[account(mut, address = derive_mempool_pda!(mxe_account, SublyError::InvalidMxeAccount))]
    pub mempool_account: UncheckedAccount<'info>,

    /// Executing Pool
    /// CHECK: Validated by Arcium program
    #[account(mut, address = derive_execpool_pda!(mxe_account, SublyError::InvalidMxeAccount))]
    pub executing_pool: UncheckedAccount<'info>,

    /// Computation Account
    /// CHECK: Validated by Arcium program
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, SublyError::InvalidMxeAccount))]
    pub computation_account: UncheckedAccount<'info>,

    /// Computation Definition Account for set_subscription_cancelled
    #[account(address = derive_comp_def_pda!(comp_def_offsets::SET_SUBSCRIPTION_CANCELLED))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    /// Cluster Account
    #[account(mut, address = derive_cluster_pda!(mxe_account, SublyError::InvalidMxeAccount))]
    pub cluster_account: Account<'info, Cluster>,

    /// Fee Pool Account
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    /// Clock Account
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    /// Sign PDA for CPI signing
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [arcium_anchor::SIGN_PDA_SEED],
        bump,
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,

    /// System Program
    pub system_program: Program<'info, System>,

    /// Arcium Program
    pub arcium_program: Program<'info, Arcium>,

    // --- Custom accounts for this instruction ---

    /// The subscription to cancel
    #[account(
        mut,
        constraint = subscription_account.is_active @ SublyError::SubscriptionNotActive,
        seeds = [SUBSCRIPTION_SEED, subscription_account.plan.as_ref(), subscription_account.membership_commitment.as_ref()],
        bump = subscription_account.bump
    )]
    pub subscription_account: Account<'info, Subscription>,

    /// The plan associated with the subscription (for decrementing count)
    #[account(
        mut,
        address = subscription_account.plan
    )]
    pub plan_account: Account<'info, Plan>,
}

#[derive(Accounts)]
pub struct DeactivatePlan<'info> {
    /// The authority (owner) of the business
    #[account(mut)]
    pub authority_account: Signer<'info>,

    /// The business account that owns this plan
    #[account(
        seeds = [BUSINESS_SEED, authority_account.key().as_ref()],
        bump = business_account.bump,
        constraint = business_account.authority == authority_account.key() @ SublyError::Unauthorized
    )]
    pub business_account: Account<'info, BusinessAccount>,

    /// The plan to deactivate
    #[account(
        mut,
        constraint = plan_account.business == business_account.key() @ SublyError::Unauthorized,
        constraint = plan_account.is_active @ SublyError::PlanNotActive
    )]
    pub plan_account: Account<'info, Plan>,
}

// ============================================
// Callback Account Structures
// ============================================
// These structures must include the 6 standard Arcium accounts in this exact order:
// 1. arcium_program
// 2. comp_def_account
// 3. mxe_account
// 4. computation_account
// 5. cluster_account
// 6. instructions_sysvar
// Custom accounts follow after the standard accounts.

#[callback_accounts("increment_count")]
#[derive(Accounts)]
pub struct IncrementCountCallback<'info> {
    // Standard Arcium accounts (required order)
    /// Arcium program
    pub arcium_program: Program<'info, Arcium>,

    /// Computation definition account for increment_count
    #[account(address = derive_comp_def_pda!(comp_def_offsets::INCREMENT_COUNT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    /// MXE account
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// Computation account
    /// CHECK: Validated by Arcium program
    pub computation_account: UncheckedAccount<'info>,

    /// Cluster account
    pub cluster_account: Account<'info, Cluster>,

    /// Instructions sysvar
    /// CHECK: Solana instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // Custom accounts
    /// The plan to update
    #[account(mut)]
    pub plan_account: Account<'info, Plan>,
}

#[callback_accounts("decrement_count")]
#[derive(Accounts)]
pub struct DecrementCountCallback<'info> {
    // Standard Arcium accounts (required order)
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(comp_def_offsets::DECREMENT_COUNT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Validated by Arcium program
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    /// CHECK: Solana instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // Custom accounts
    #[account(mut)]
    pub plan_account: Account<'info, Plan>,
}

#[callback_accounts("set_subscription_active")]
#[derive(Accounts)]
pub struct SetSubscriptionActiveCallback<'info> {
    // Standard Arcium accounts (required order)
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(comp_def_offsets::SET_SUBSCRIPTION_ACTIVE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Validated by Arcium program
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    /// CHECK: Solana instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // Custom accounts
    #[account(mut)]
    pub subscription_account: Account<'info, Subscription>,
}

#[callback_accounts("set_subscription_cancelled")]
#[derive(Accounts)]
pub struct SetSubscriptionCancelledCallback<'info> {
    // Standard Arcium accounts (required order)
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(comp_def_offsets::SET_SUBSCRIPTION_CANCELLED))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: Validated by Arcium program
    pub computation_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    /// CHECK: Solana instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // Custom accounts
    #[account(mut)]
    pub subscription_account: Account<'info, Subscription>,
}

// ============================================
// Init Computation Definition Account Structures
// ============================================

#[init_computation_definition_accounts("set_subscription_active", payer)]
#[derive(Accounts)]
pub struct InitSetSubscriptionActiveCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    pub system_program: Program<'info, System>,

    pub arcium_program: Program<'info, Arcium>,
}

#[init_computation_definition_accounts("set_subscription_cancelled", payer)]
#[derive(Accounts)]
pub struct InitSetSubscriptionCancelledCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: comp_def_account, checked by arcium program.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    pub system_program: Program<'info, System>,

    pub arcium_program: Program<'info, Arcium>,
}

#[init_computation_definition_accounts("increment_count", payer)]
#[derive(Accounts)]
pub struct InitIncrementCountCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: comp_def_account, checked by arcium program.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    pub system_program: Program<'info, System>,

    pub arcium_program: Program<'info, Arcium>,
}

#[init_computation_definition_accounts("decrement_count", payer)]
#[derive(Accounts)]
pub struct InitDecrementCountCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: comp_def_account, checked by arcium program.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    pub system_program: Program<'info, System>,

    pub arcium_program: Program<'info, Arcium>,
}

#[init_computation_definition_accounts("initialize_count", payer)]
#[derive(Accounts)]
pub struct InitInitializeCountCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: comp_def_account, checked by arcium program.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    pub system_program: Program<'info, System>,

    pub arcium_program: Program<'info, Arcium>,
}

#[init_computation_definition_accounts("initialize_subscription_status", payer)]
#[derive(Accounts)]
pub struct InitInitializeSubscriptionStatusCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: comp_def_account, checked by arcium program.
    #[account(mut)]
    pub comp_def_account: UncheckedAccount<'info>,

    pub cluster_account: Account<'info, Cluster>,

    pub system_program: Program<'info, System>,

    pub arcium_program: Program<'info, Arcium>,
}
