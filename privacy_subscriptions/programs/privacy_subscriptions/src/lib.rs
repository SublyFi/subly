use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CallbackAccount, CircuitSource, OffChainCircuitSource};
use arcium_macros::circuit_hash;

declare_id!("8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2");

// ============================================================================
// Constants
// ============================================================================

pub const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_config";
pub const PROTOCOL_POOL_SEED: &[u8] = b"protocol_pool";
pub const MERCHANT_SEED: &[u8] = b"merchant";
pub const MERCHANT_LEDGER_SEED: &[u8] = b"merchant_ledger";
pub const SUBSCRIPTION_PLAN_SEED: &[u8] = b"subscription_plan";
pub const USER_LEDGER_SEED: &[u8] = b"user_ledger";
pub const USER_SUBSCRIPTION_SEED: &[u8] = b"user_subscription";

pub const MAX_NAME_LENGTH: usize = 64;
pub const MAX_PLAN_NAME_LENGTH: usize = 32;
pub const MAX_FEE_RATE_BPS: u16 = 10000; // 100%
pub const MIN_BILLING_CYCLE_DAYS: u32 = 1;
pub const MAX_BILLING_CYCLE_DAYS: u32 = 365;

// ============================================================================
// Arcium Computation Definition Offsets
// ============================================================================

const COMP_DEF_OFFSET_DEPOSIT: u32 = comp_def_offset("deposit");
const COMP_DEF_OFFSET_WITHDRAW: u32 = comp_def_offset("withdraw");
const COMP_DEF_OFFSET_SUBSCRIBE: u32 = comp_def_offset("subscribe");
const COMP_DEF_OFFSET_UNSUBSCRIBE: u32 = comp_def_offset("unsubscribe");
const COMP_DEF_OFFSET_PROCESS_PAYMENT: u32 = comp_def_offset("process_payment");
const COMP_DEF_OFFSET_VERIFY_SUBSCRIPTION: u32 = comp_def_offset("verify_subscription");
const COMP_DEF_OFFSET_CLAIM_REVENUE: u32 = comp_def_offset("claim_revenue");

// ============================================================================
// Program Module
// ============================================================================

#[arcium_program]
pub mod privacy_subscriptions {
    use super::*;

    // ========================================================================
    // Phase 1: Non-Encrypted Instructions
    // ========================================================================

    /// Initialize the protocol configuration
    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        fee_rate_bps: u16,
    ) -> Result<()> {
        require!(
            fee_rate_bps <= MAX_FEE_RATE_BPS,
            ErrorCode::InvalidFeeRate
        );

        let protocol_config = &mut ctx.accounts.protocol_config;
        protocol_config.authority = ctx.accounts.authority.key();
        protocol_config.fee_rate_bps = fee_rate_bps;
        protocol_config.is_paused = false;
        protocol_config.bump = ctx.bumps.protocol_config;

        Ok(())
    }

    /// Initialize a token pool for the protocol
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let protocol_pool = &mut ctx.accounts.protocol_pool;
        protocol_pool.mint = ctx.accounts.mint.key();
        protocol_pool.token_account = ctx.accounts.pool_token_account.key();
        protocol_pool.bump = ctx.bumps.protocol_pool;

        Ok(())
    }

    /// Register a new merchant
    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        name: String,
    ) -> Result<()> {
        require!(name.len() <= MAX_NAME_LENGTH, ErrorCode::NameTooLong);

        let merchant = &mut ctx.accounts.merchant;
        merchant.wallet = ctx.accounts.wallet.key();

        // Store name as fixed-size array
        let mut name_bytes = [0u8; MAX_NAME_LENGTH];
        let name_slice = name.as_bytes();
        let copy_len = name_slice.len().min(MAX_NAME_LENGTH);
        name_bytes[..copy_len].copy_from_slice(&name_slice[..copy_len]);
        merchant.name = name_bytes;

        merchant.is_active = true;
        merchant.registered_at = Clock::get()?.unix_timestamp;
        merchant.bump = ctx.bumps.merchant;

        // Initialize MerchantLedger with encrypted zero balance
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.merchant = ctx.accounts.merchant.key();
        merchant_ledger.mint = ctx.accounts.mint.key();
        merchant_ledger.encrypted_balance = [[0u8; 32]; 2];
        merchant_ledger.nonce = 0;
        merchant_ledger.bump = ctx.bumps.merchant_ledger;

        Ok(())
    }

    /// Create a new subscription plan
    pub fn create_subscription_plan(
        ctx: Context<CreateSubscriptionPlan>,
        plan_id: u64,
        name: String,
        price: u64,
        billing_cycle_days: u32,
    ) -> Result<()> {
        require!(name.len() <= MAX_PLAN_NAME_LENGTH, ErrorCode::NameTooLong);
        require!(price > 0, ErrorCode::InvalidPrice);
        require!(
            billing_cycle_days >= MIN_BILLING_CYCLE_DAYS
                && billing_cycle_days <= MAX_BILLING_CYCLE_DAYS,
            ErrorCode::InvalidBillingCycle
        );
        require!(ctx.accounts.merchant.is_active, ErrorCode::MerchantNotActive);

        let plan = &mut ctx.accounts.subscription_plan;
        plan.merchant = ctx.accounts.merchant.key();
        plan.plan_id = plan_id;

        // Store name as fixed-size array
        let mut name_bytes = [0u8; MAX_PLAN_NAME_LENGTH];
        let name_slice = name.as_bytes();
        let copy_len = name_slice.len().min(MAX_PLAN_NAME_LENGTH);
        name_bytes[..copy_len].copy_from_slice(&name_slice[..copy_len]);
        plan.name = name_bytes;

        plan.mint = ctx.accounts.mint.key();
        plan.price = price;
        plan.billing_cycle_days = billing_cycle_days;
        plan.is_active = true;
        plan.created_at = Clock::get()?.unix_timestamp;
        plan.bump = ctx.bumps.subscription_plan;

        Ok(())
    }

    /// Update an existing subscription plan
    pub fn update_subscription_plan(
        ctx: Context<UpdateSubscriptionPlan>,
        name: Option<String>,
        price: Option<u64>,
        billing_cycle_days: Option<u32>,
        is_active: Option<bool>,
    ) -> Result<()> {
        require!(ctx.accounts.merchant.is_active, ErrorCode::MerchantNotActive);

        let plan = &mut ctx.accounts.subscription_plan;

        if let Some(new_name) = name {
            require!(new_name.len() <= MAX_PLAN_NAME_LENGTH, ErrorCode::NameTooLong);
            let mut name_bytes = [0u8; MAX_PLAN_NAME_LENGTH];
            let name_slice = new_name.as_bytes();
            let copy_len = name_slice.len().min(MAX_PLAN_NAME_LENGTH);
            name_bytes[..copy_len].copy_from_slice(&name_slice[..copy_len]);
            plan.name = name_bytes;
        }

        if let Some(new_price) = price {
            require!(new_price > 0, ErrorCode::InvalidPrice);
            plan.price = new_price;
        }

        if let Some(new_billing_cycle_days) = billing_cycle_days {
            require!(
                new_billing_cycle_days >= MIN_BILLING_CYCLE_DAYS
                    && new_billing_cycle_days <= MAX_BILLING_CYCLE_DAYS,
                ErrorCode::InvalidBillingCycle
            );
            plan.billing_cycle_days = new_billing_cycle_days;
        }

        if let Some(new_is_active) = is_active {
            plan.is_active = new_is_active;
        }

        Ok(())
    }

    // ========================================================================
    // Phase 2: Encrypted Instructions - Computation Definition Initialization
    // ========================================================================

    pub fn init_deposit_comp_def(ctx: Context<InitDepositCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/deposit.arcis".to_string(),
                hash: circuit_hash!("deposit"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_withdraw_comp_def(ctx: Context<InitWithdrawCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/withdraw.arcis".to_string(),
                hash: circuit_hash!("withdraw"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_subscribe_comp_def(ctx: Context<InitSubscribeCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/subscribe.arcis".to_string(),
                hash: circuit_hash!("subscribe"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_unsubscribe_comp_def(ctx: Context<InitUnsubscribeCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/unsubscribe.arcis".to_string(),
                hash: circuit_hash!("unsubscribe"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_process_payment_comp_def(ctx: Context<InitProcessPaymentCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/process_payment.arcis".to_string(),
                hash: circuit_hash!("process_payment"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_verify_subscription_comp_def(ctx: Context<InitVerifySubscriptionCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/verify_subscription.arcis".to_string(),
                hash: circuit_hash!("verify_subscription"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_claim_revenue_comp_def(ctx: Context<InitClaimRevenueCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/claim_revenue.arcis".to_string(),
                hash: circuit_hash!("claim_revenue"),
            })),
            None,
        )?;
        Ok(())
    }

    // ========================================================================
    // Phase 2: Encrypted Instructions - Queue Phase
    // ========================================================================

    /// Deposit tokens to user's encrypted ledger
    pub fn deposit(
        ctx: Context<Deposit>,
        computation_offset: u64,
        amount: u64,
        encrypted_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Transfer tokens from user to pool
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.pool_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        // Initialize user ledger if it's new
        let user_ledger = &mut ctx.accounts.user_ledger;
        if user_ledger.user == Pubkey::default() {
            user_ledger.user = ctx.accounts.user.key();
            user_ledger.mint = ctx.accounts.mint.key();
            user_ledger.encrypted_balance = [[0u8; 32]; 2];
            user_ledger.nonce = 0;
            user_ledger.bump = ctx.bumps.user_ledger;
        }
        user_ledger.last_updated = Clock::get()?.unix_timestamp;

        // Queue computation to Arcium
        // ArgBuilder order must match Arcis circuit's DepositInput struct:
        //   1. current_balance (encrypted)
        //   2. deposit_amount (encrypted)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(user_ledger.encrypted_balance[0])  // current_balance
            .encrypted_u64(encrypted_amount)                   // deposit_amount
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![DepositCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.user_ledger.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Withdraw tokens from user's encrypted ledger
    pub fn withdraw(
        ctx: Context<Withdraw>,
        computation_offset: u64,
        encrypted_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.last_updated = Clock::get()?.unix_timestamp;

        // ArgBuilder order must match Arcis circuit's WithdrawInput struct:
        //   1. current_balance (encrypted)
        //   2. withdraw_amount (encrypted)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(user_ledger.encrypted_balance[0])  // current_balance
            .encrypted_u64(encrypted_amount)                   // withdraw_amount
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![WithdrawCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.user_ledger.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.protocol_pool.key(),
                        is_writable: false,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.pool_token_account.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.user_token_account.key(),
                        is_writable: true,
                    },
                ],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Subscribe to a plan
    pub fn subscribe(
        ctx: Context<Subscribe>,
        computation_offset: u64,
        subscription_index: u64,
        encrypted_price: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        require!(ctx.accounts.subscription_plan.is_active, ErrorCode::PlanNotActive);
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Initialize user subscription PDA
        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.user = ctx.accounts.user.key();
        user_subscription.subscription_index = subscription_index;
        user_subscription.plan = ctx.accounts.subscription_plan.key();
        user_subscription.encrypted_status = [0u8; 32];
        user_subscription.encrypted_next_payment_date = [0u8; 32];
        user_subscription.nonce = 0;
        user_subscription.bump = ctx.bumps.user_subscription;

        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.last_updated = Clock::get()?.unix_timestamp;

        let current_timestamp = Clock::get()?.unix_timestamp;
        let billing_cycle_days = ctx.accounts.subscription_plan.billing_cycle_days;

        // ArgBuilder order must match Arcis circuit's SubscribeInput struct:
        //   1. user_balance (encrypted)
        //   2. merchant_balance (encrypted)
        //   3. price (encrypted)
        //   4. current_timestamp (plaintext)
        //   5. billing_cycle_days (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(user_ledger.encrypted_balance[0])                   // user_balance
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance[0])  // merchant_balance
            .encrypted_u64(encrypted_price)                                     // price
            .plaintext_i64(current_timestamp)                                   // current_timestamp
            .plaintext_u32(billing_cycle_days)                                  // billing_cycle_days
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![SubscribeCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.user_ledger.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.merchant_ledger.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.user_subscription.key(),
                        is_writable: true,
                    },
                ],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Unsubscribe from a plan
    pub fn unsubscribe(
        ctx: Context<Unsubscribe>,
        computation_offset: u64,
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // ArgBuilder order must match Arcis circuit's UnsubscribeInput struct:
        //   1. current_status (encrypted)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)  // current_status
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![UnsubscribeCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.user_subscription.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Process subscription payment (called by cron or keeper)
    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        computation_offset: u64,
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let current_timestamp = Clock::get()?.unix_timestamp;
        let plan_price = ctx.accounts.subscription_plan.price;
        let billing_cycle_days = ctx.accounts.subscription_plan.billing_cycle_days;

        // ArgBuilder order must match Arcis circuit's ProcessPaymentInput struct:
        //   1. user_balance (encrypted)
        //   2. merchant_balance (encrypted)
        //   3. subscription_status (encrypted)
        //   4. next_payment_date (encrypted)
        //   5. current_timestamp (plaintext)
        //   6. plan_price (plaintext)
        //   7. billing_cycle_days (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ctx.accounts.user_ledger.encrypted_balance[0])               // user_balance
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance[0])           // merchant_balance
            .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)              // subscription_status
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_next_payment_date)  // next_payment_date
            .plaintext_i64(current_timestamp)                                           // current_timestamp
            .plaintext_u64(plan_price)                                                  // plan_price
            .plaintext_u32(billing_cycle_days)                                          // billing_cycle_days
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ProcessPaymentCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.user_ledger.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.merchant_ledger.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.user_subscription.key(),
                        is_writable: true,
                    },
                ],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Verify subscription status
    pub fn verify_subscription(
        ctx: Context<VerifySubscription>,
        computation_offset: u64,
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let current_timestamp = Clock::get()?.unix_timestamp;

        // ArgBuilder order must match Arcis circuit's VerifySubscriptionInput struct:
        //   1. subscription_status (encrypted)
        //   2. next_payment_date (encrypted)
        //   3. current_timestamp (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)              // subscription_status
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_next_payment_date)  // next_payment_date
            .plaintext_i64(current_timestamp)                                           // current_timestamp
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![VerifySubscriptionCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    /// Claim revenue for merchant
    pub fn claim_revenue(
        ctx: Context<ClaimRevenue>,
        computation_offset: u64,
        encrypted_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        require!(ctx.accounts.merchant.is_active, ErrorCode::MerchantNotActive);
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // ArgBuilder order must match Arcis circuit's ClaimRevenueInput struct:
        //   1. current_balance (encrypted)
        //   2. claim_amount (encrypted)
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance[0])  // current_balance
            .encrypted_u64(encrypted_amount)                                    // claim_amount
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![ClaimRevenueCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[
                    CallbackAccount {
                        pubkey: ctx.accounts.merchant_ledger.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.protocol_pool.key(),
                        is_writable: false,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.pool_token_account.key(),
                        is_writable: true,
                    },
                    CallbackAccount {
                        pubkey: ctx.accounts.merchant_token_account.key(),
                        is_writable: true,
                    },
                ],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    // ========================================================================
    // Phase 2: Encrypted Instructions - Callback Phase
    // ========================================================================

    #[arcium_callback(encrypted_ix = "deposit")]
    pub fn deposit_callback(
        ctx: Context<DepositCallback>,
        output: SignedComputationOutputs<DepositOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(DepositOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance[0] = o.ciphertexts[0];
        user_ledger.nonce = o.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "withdraw")]
    pub fn withdraw_callback(
        ctx: Context<WithdrawCallback>,
        output: SignedComputationOutputs<WithdrawOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(WithdrawOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update user ledger with new encrypted balance
        let user_ledger = &mut ctx.accounts.user_ledger;
        // o contains (new_balance, actual_amount, success) as ciphertexts
        user_ledger.encrypted_balance[0] = o.ciphertexts[0];
        user_ledger.nonce = o.nonce;

        // Note: actual token transfer would need to be handled differently
        // as the amount is revealed by the MPC. For now, the amount is encrypted
        // in the output and we trust the MPC computation result.

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "subscribe")]
    pub fn subscribe_callback(
        ctx: Context<SubscribeCallback>,
        output: SignedComputationOutputs<SubscribeOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(SubscribeOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update user ledger
        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance[0] = o.ciphertexts[0];
        user_ledger.nonce = o.nonce;

        // Update merchant ledger
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.encrypted_balance[0] = o.ciphertexts[1];

        // Update user subscription
        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.encrypted_status = o.ciphertexts[2];
        user_subscription.encrypted_next_payment_date = o.ciphertexts[3];

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "unsubscribe")]
    pub fn unsubscribe_callback(
        ctx: Context<UnsubscribeCallback>,
        output: SignedComputationOutputs<UnsubscribeOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(UnsubscribeOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.encrypted_status = o.ciphertexts[0];
        user_subscription.nonce = o.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "process_payment")]
    pub fn process_payment_callback(
        ctx: Context<ProcessPaymentCallback>,
        output: SignedComputationOutputs<ProcessPaymentOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ProcessPaymentOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update user ledger
        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance[0] = o.ciphertexts[0];
        user_ledger.nonce = o.nonce;

        // Update merchant ledger
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.encrypted_balance[0] = o.ciphertexts[1];

        // Update user subscription
        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.encrypted_status = o.ciphertexts[2];
        user_subscription.encrypted_next_payment_date = o.ciphertexts[3];

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "verify_subscription")]
    pub fn verify_subscription_callback(
        ctx: Context<VerifySubscriptionCallback>,
        output: SignedComputationOutputs<VerifySubscriptionOutput>,
    ) -> Result<()> {
        // VerifySubscriptionOutput.field_0 is a revealed bool (not encrypted)
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(VerifySubscriptionOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Emit the revealed boolean result
        emit!(SubscriptionVerified {
            is_valid: o,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "claim_revenue")]
    pub fn claim_revenue_callback(
        ctx: Context<ClaimRevenueCallback>,
        output: SignedComputationOutputs<ClaimRevenueOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ClaimRevenueOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update merchant ledger
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.encrypted_balance[0] = o.ciphertexts[0];
        merchant_ledger.nonce = o.nonce;

        // Note: actual token transfer would be handled separately

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

/// Protocol configuration account
/// PDA Seeds: ["protocol_config"]
#[account]
pub struct ProtocolConfig {
    /// Protocol administrator
    pub authority: Pubkey,
    /// Fee rate in basis points (100 = 1%)
    pub fee_rate_bps: u16,
    /// Protocol pause flag
    pub is_paused: bool,
    /// PDA bump
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SIZE: usize = 8 + 32 + 2 + 1 + 1;
}

/// Protocol token pool account
/// PDA Seeds: ["protocol_pool", mint]
#[account]
pub struct ProtocolPool {
    /// Token mint
    pub mint: Pubkey,
    /// Pool's token account
    pub token_account: Pubkey,
    /// PDA bump
    pub bump: u8,
}

impl ProtocolPool {
    pub const SIZE: usize = 8 + 32 + 32 + 1;
}

/// Merchant account
/// PDA Seeds: ["merchant", wallet]
#[account]
pub struct Merchant {
    /// Merchant wallet address
    pub wallet: Pubkey,
    /// Merchant name (fixed-size)
    pub name: [u8; MAX_NAME_LENGTH],
    /// Active flag
    pub is_active: bool,
    /// Registration timestamp
    pub registered_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl Merchant {
    pub const SIZE: usize = 8 + 32 + MAX_NAME_LENGTH + 1 + 8 + 1;
}

/// Merchant ledger for encrypted balance tracking
/// PDA Seeds: ["merchant_ledger", merchant, mint]
#[account]
pub struct MerchantLedger {
    /// Associated merchant
    pub merchant: Pubkey,
    /// Token mint
    pub mint: Pubkey,
    /// Encrypted balance (array of [u8; 32] ciphertexts)
    pub encrypted_balance: [[u8; 32]; 2],
    /// Nonce for encryption
    pub nonce: u128,
    /// PDA bump
    pub bump: u8,
}

impl MerchantLedger {
    pub const SIZE: usize = 8 + 32 + 32 + (32 * 2) + 16 + 1;
}

/// Subscription plan account
/// PDA Seeds: ["subscription_plan", merchant, plan_id.to_le_bytes()]
#[account]
pub struct SubscriptionPlan {
    /// Associated merchant
    pub merchant: Pubkey,
    /// Plan ID (unique per merchant)
    pub plan_id: u64,
    /// Plan name (fixed-size)
    pub name: [u8; MAX_PLAN_NAME_LENGTH],
    /// Payment token mint
    pub mint: Pubkey,
    /// Subscription price
    pub price: u64,
    /// Billing cycle in days
    pub billing_cycle_days: u32,
    /// Active flag
    pub is_active: bool,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl SubscriptionPlan {
    pub const SIZE: usize = 8 + 32 + 8 + MAX_PLAN_NAME_LENGTH + 32 + 8 + 4 + 1 + 8 + 1;
}

/// User ledger for encrypted balance tracking
/// PDA Seeds: ["user_ledger", user, mint]
#[account]
pub struct UserLedger {
    /// User wallet
    pub user: Pubkey,
    /// Token mint
    pub mint: Pubkey,
    /// Encrypted balance (array of [u8; 32] ciphertexts)
    pub encrypted_balance: [[u8; 32]; 2],
    /// Nonce for encryption
    pub nonce: u128,
    /// Last update timestamp
    pub last_updated: i64,
    /// PDA bump
    pub bump: u8,
}

impl UserLedger {
    pub const SIZE: usize = 8 + 32 + 32 + (32 * 2) + 16 + 8 + 1;
}

/// User subscription account
/// PDA Seeds: ["user_subscription", user, subscription_index.to_le_bytes()]
#[account]
pub struct UserSubscription {
    /// User wallet
    pub user: Pubkey,
    /// Subscription index (unique per user)
    pub subscription_index: u64,
    /// Associated plan
    pub plan: Pubkey,
    /// Encrypted status (0: Active, 1: Cancelled, 2: Expired)
    pub encrypted_status: [u8; 32],
    /// Encrypted next payment date
    pub encrypted_next_payment_date: [u8; 32],
    /// Nonce for encryption
    pub nonce: u128,
    /// PDA bump
    pub bump: u8,
}

impl UserSubscription {
    pub const SIZE: usize = 8 + 32 + 8 + 32 + 32 + 32 + 16 + 1;
}

// ============================================================================
// Context Structures - Phase 1: Non-Encrypted
// ============================================================================

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = ProtocolConfig::SIZE,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump,
        has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = ProtocolPool::SIZE,
        seeds = [PROTOCOL_POOL_SEED, mint.key().as_ref()],
        bump,
    )]
    pub protocol_pool: Account<'info, ProtocolPool>,
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = protocol_pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterMerchant<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = wallet,
        space = Merchant::SIZE,
        seeds = [MERCHANT_SEED, wallet.key().as_ref()],
        bump,
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(
        init,
        payer = wallet,
        space = MerchantLedger::SIZE,
        seeds = [MERCHANT_LEDGER_SEED, merchant.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct CreateSubscriptionPlan<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(
        seeds = [MERCHANT_SEED, wallet.key().as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = wallet,
        space = SubscriptionPlan::SIZE,
        seeds = [SUBSCRIPTION_PLAN_SEED, merchant.key().as_ref(), &plan_id.to_le_bytes()],
        bump,
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSubscriptionPlan<'info> {
    pub wallet: Signer<'info>,
    #[account(
        seeds = [MERCHANT_SEED, wallet.key().as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(
        mut,
        seeds = [SUBSCRIPTION_PLAN_SEED, merchant.key().as_ref(), &subscription_plan.plan_id.to_le_bytes()],
        bump = subscription_plan.bump,
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
}

// ============================================================================
// Context Structures - Phase 2: Computation Definition Initialization
// ============================================================================

#[init_computation_definition_accounts("deposit", payer)]
#[derive(Accounts)]
pub struct InitDepositCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("withdraw", payer)]
#[derive(Accounts)]
pub struct InitWithdrawCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("subscribe", payer)]
#[derive(Accounts)]
pub struct InitSubscribeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("unsubscribe", payer)]
#[derive(Accounts)]
pub struct InitUnsubscribeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("process_payment", payer)]
#[derive(Accounts)]
pub struct InitProcessPaymentCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("verify_subscription", payer)]
#[derive(Accounts)]
pub struct InitVerifySubscriptionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("claim_revenue", payer)]
#[derive(Accounts)]
pub struct InitClaimRevenueCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// Context Structures - Phase 2: Queue Computation
// ============================================================================

#[queue_computation_accounts("deposit", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [PROTOCOL_POOL_SEED, mint.key().as_ref()],
        bump = protocol_pool.bump,
    )]
    pub protocol_pool: Account<'info, ProtocolPool>,
    #[account(
        mut,
        constraint = pool_token_account.key() == protocol_pool.token_account @ ErrorCode::Unauthorized,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == mint.key() @ ErrorCode::Unauthorized,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = UserLedger::SIZE,
        seeds = [USER_LEDGER_SEED, user.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub user_ledger: Account<'info, UserLedger>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("withdraw", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [PROTOCOL_POOL_SEED, mint.key().as_ref()],
        bump = protocol_pool.bump,
    )]
    pub protocol_pool: Account<'info, ProtocolPool>,
    #[account(
        mut,
        constraint = pool_token_account.key() == protocol_pool.token_account @ ErrorCode::Unauthorized,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == mint.key() @ ErrorCode::Unauthorized,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [USER_LEDGER_SEED, user.key().as_ref(), mint.key().as_ref()],
        bump = user_ledger.bump,
    )]
    pub user_ledger: Account<'info, UserLedger>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_WITHDRAW))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("subscribe", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, subscription_index: u64)]
pub struct Subscribe<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [SUBSCRIPTION_PLAN_SEED, subscription_plan.merchant.as_ref(), &subscription_plan.plan_id.to_le_bytes()],
        bump = subscription_plan.bump,
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    #[account(
        mut,
        seeds = [USER_LEDGER_SEED, user.key().as_ref(), mint.key().as_ref()],
        bump = user_ledger.bump,
    )]
    pub user_ledger: Account<'info, UserLedger>,
    #[account(
        mut,
        seeds = [MERCHANT_LEDGER_SEED, subscription_plan.merchant.as_ref(), mint.key().as_ref()],
        bump = merchant_ledger.bump,
    )]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    #[account(
        init,
        payer = user,
        space = UserSubscription::SIZE,
        seeds = [USER_SUBSCRIPTION_SEED, user.key().as_ref(), &subscription_index.to_le_bytes()],
        bump,
    )]
    pub user_subscription: Account<'info, UserSubscription>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBSCRIBE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("unsubscribe", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct Unsubscribe<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [USER_SUBSCRIPTION_SEED, user.key().as_ref(), &user_subscription.subscription_index.to_le_bytes()],
        bump = user_subscription.bump,
    )]
    pub user_subscription: Account<'info, UserSubscription>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_UNSUBSCRIBE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("process_payment", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [SUBSCRIPTION_PLAN_SEED, subscription_plan.merchant.as_ref(), &subscription_plan.plan_id.to_le_bytes()],
        bump = subscription_plan.bump,
    )]
    pub subscription_plan: Account<'info, SubscriptionPlan>,
    #[account(
        mut,
        seeds = [USER_LEDGER_SEED, user_subscription.user.as_ref(), mint.key().as_ref()],
        bump = user_ledger.bump,
    )]
    pub user_ledger: Account<'info, UserLedger>,
    #[account(
        mut,
        seeds = [MERCHANT_LEDGER_SEED, subscription_plan.merchant.as_ref(), mint.key().as_ref()],
        bump = merchant_ledger.bump,
    )]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    #[account(
        mut,
        seeds = [USER_SUBSCRIPTION_SEED, user_subscription.user.as_ref(), &user_subscription.subscription_index.to_le_bytes()],
        bump = user_subscription.bump,
    )]
    pub user_subscription: Account<'info, UserSubscription>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PROCESS_PAYMENT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("verify_subscription", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct VerifySubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        seeds = [USER_SUBSCRIPTION_SEED, user_subscription.user.as_ref(), &user_subscription.subscription_index.to_le_bytes()],
        bump = user_subscription.bump,
    )]
    pub user_subscription: Account<'info, UserSubscription>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_SUBSCRIPTION))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("claim_revenue", wallet)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ClaimRevenue<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [MERCHANT_SEED, wallet.key().as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(
        seeds = [PROTOCOL_POOL_SEED, mint.key().as_ref()],
        bump = protocol_pool.bump,
    )]
    pub protocol_pool: Account<'info, ProtocolPool>,
    #[account(
        mut,
        constraint = pool_token_account.key() == protocol_pool.token_account @ ErrorCode::Unauthorized,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = merchant_token_account.owner == wallet.key() @ ErrorCode::Unauthorized,
        constraint = merchant_token_account.mint == mint.key() @ ErrorCode::Unauthorized,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [MERCHANT_LEDGER_SEED, merchant.key().as_ref(), mint.key().as_ref()],
        bump = merchant_ledger.bump,
    )]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    #[account(
        init_if_needed,
        space = 9,
        payer = wallet,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLAIM_REVENUE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

// ============================================================================
// Context Structures - Phase 2: Callback
// ============================================================================

#[callback_accounts("deposit")]
#[derive(Accounts)]
pub struct DepositCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_DEPOSIT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_ledger: Account<'info, UserLedger>,
}

#[callback_accounts("withdraw")]
#[derive(Accounts)]
pub struct WithdrawCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_WITHDRAW))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_ledger: Account<'info, UserLedger>,
    pub protocol_pool: Account<'info, ProtocolPool>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[callback_accounts("subscribe")]
#[derive(Accounts)]
pub struct SubscribeCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBSCRIBE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_ledger: Account<'info, UserLedger>,
    #[account(mut)]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    #[account(mut)]
    pub user_subscription: Account<'info, UserSubscription>,
}

#[callback_accounts("unsubscribe")]
#[derive(Accounts)]
pub struct UnsubscribeCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_UNSUBSCRIBE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_subscription: Account<'info, UserSubscription>,
}

#[callback_accounts("process_payment")]
#[derive(Accounts)]
pub struct ProcessPaymentCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PROCESS_PAYMENT))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_ledger: Account<'info, UserLedger>,
    #[account(mut)]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    #[account(mut)]
    pub user_subscription: Account<'info, UserSubscription>,
}

#[callback_accounts("verify_subscription")]
#[derive(Accounts)]
pub struct VerifySubscriptionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_SUBSCRIPTION))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("claim_revenue")]
#[derive(Accounts)]
pub struct ClaimRevenueCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLAIM_REVENUE))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub merchant_ledger: Account<'info, MerchantLedger>,
    pub protocol_pool: Account<'info, ProtocolPool>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct SubscriptionVerified {
    pub is_valid: bool,
}

// ============================================================================
// Errors
// ============================================================================

/// Error codes must be named "ErrorCode" for Arcium macros
#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,

    #[msg("Cluster not set")]
    ClusterNotSet,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Invalid fee rate (must be 0-10000)")]
    InvalidFeeRate,

    #[msg("Invalid price (must be greater than 0)")]
    InvalidPrice,

    #[msg("Invalid billing cycle (must be 1-365 days)")]
    InvalidBillingCycle,

    #[msg("Name too long")]
    NameTooLong,

    #[msg("Merchant not active")]
    MerchantNotActive,

    #[msg("Plan not active")]
    PlanNotActive,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Subscription not active")]
    SubscriptionNotActive,
}
