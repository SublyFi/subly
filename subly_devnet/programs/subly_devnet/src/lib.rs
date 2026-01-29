use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

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

#[program]
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
    // They update the encrypted subscription count on the Plan account.

    /// Callback for increment_count MXE computation
    /// Called by Arcium when the encrypted increment operation completes
    pub fn increment_count_callback(
        ctx: Context<IncrementCountCallback>,
        encrypted_count: [u8; 32],
        nonce: [u8; 16],
    ) -> Result<()> {
        // Update the plan's encrypted subscription count
        let plan_account = &mut ctx.accounts.plan_account;
        plan_account.encrypted_subscription_count = encrypted_count;

        let clock = Clock::get()?;
        emit!(SubscriptionCountUpdatedEvent {
            plan: plan_account.key(),
            encrypted_count,
            nonce,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Callback for decrement_count MXE computation
    /// Called by Arcium when the encrypted decrement operation completes
    pub fn decrement_count_callback(
        ctx: Context<DecrementCountCallback>,
        encrypted_count: [u8; 32],
        nonce: [u8; 16],
    ) -> Result<()> {
        // Update the plan's encrypted subscription count
        let plan_account = &mut ctx.accounts.plan_account;
        plan_account.encrypted_subscription_count = encrypted_count;

        let clock = Clock::get()?;
        emit!(SubscriptionCountUpdatedEvent {
            plan: plan_account.key(),
            encrypted_count,
            nonce,
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
    pub fn subscribe_status_callback(
        ctx: Context<SubscribeStatusCallback>,
        encrypted_status: [u8; 64],
        status_nonce: [u8; 16],
    ) -> Result<()> {
        let subscription_account = &mut ctx.accounts.subscription_account;
        subscription_account.encrypted_status = encrypted_status;
        subscription_account.status_nonce = status_nonce;

        let clock = Clock::get()?;
        emit!(SubscriptionStatusEncryptedEvent {
            subscription: subscription_account.key(),
            encrypted_status,
            status_nonce,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Callback for set_subscription_cancelled MXE computation
    /// Called by Arcium when the encrypted cancellation status is ready
    pub fn cancel_status_callback(
        ctx: Context<CancelStatusCallback>,
        encrypted_status: [u8; 64],
        status_nonce: [u8; 16],
    ) -> Result<()> {
        let subscription_account = &mut ctx.accounts.subscription_account;
        subscription_account.encrypted_status = encrypted_status;
        subscription_account.status_nonce = status_nonce;

        let clock = Clock::get()?;
        emit!(SubscriptionStatusEncryptedEvent {
            subscription: subscription_account.key(),
            encrypted_status,
            status_nonce,
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

#[derive(Accounts)]
pub struct IncrementCountCallback<'info> {
    /// The plan to update
    #[account(mut)]
    pub plan_account: Account<'info, Plan>,

    /// CHECK: Arcium cluster account for verification
    pub cluster_account: AccountInfo<'info>,

    /// CHECK: Arcium computation account for verification
    pub computation_account: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DecrementCountCallback<'info> {
    /// The plan to update
    #[account(mut)]
    pub plan_account: Account<'info, Plan>,

    /// CHECK: Arcium cluster account for verification
    pub cluster_account: AccountInfo<'info>,

    /// CHECK: Arcium computation account for verification
    pub computation_account: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SubscribeStatusCallback<'info> {
    /// The subscription to update
    #[account(mut)]
    pub subscription_account: Account<'info, Subscription>,

    /// CHECK: Arcium cluster account for verification
    pub cluster_account: AccountInfo<'info>,

    /// CHECK: Arcium computation account for verification
    pub computation_account: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CancelStatusCallback<'info> {
    /// The subscription to update
    #[account(mut)]
    pub subscription_account: Account<'info, Subscription>,

    /// CHECK: Arcium cluster account for verification
    pub cluster_account: AccountInfo<'info>,

    /// CHECK: Arcium computation account for verification
    pub computation_account: AccountInfo<'info>,
}
