use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;

use constants::*;
use errors::SublyError;
use events::*;
use state::*;

declare_id!("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");

#[program]
pub mod subly_devnet {
    use super::*;

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
