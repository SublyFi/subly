use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CallbackAccount, CircuitSource, OffChainCircuitSource};
use arcium_macros::circuit_hash;

declare_id!("Hwmvq4rJ1P6bxHD5G6KvzteuXdMtMzpwZTT7AJb3wSa9");

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

const COMP_DEF_OFFSET_DEPOSIT: u32 = comp_def_offset("deposit_v2");
const COMP_DEF_OFFSET_WITHDRAW: u32 = comp_def_offset("withdraw_v2");
const COMP_DEF_OFFSET_SUBSCRIBE: u32 = comp_def_offset("subscribe_v2");
const COMP_DEF_OFFSET_UNSUBSCRIBE: u32 = comp_def_offset("unsubscribe_v2");
const COMP_DEF_OFFSET_PROCESS_PAYMENT: u32 = comp_def_offset("process_payment_v2");
const COMP_DEF_OFFSET_VERIFY_SUBSCRIPTION: u32 = comp_def_offset("verify_subscription_v2");
const COMP_DEF_OFFSET_CLAIM_REVENUE: u32 = comp_def_offset("claim_revenue_v2");

// ============================================================================
// Helpers
// ============================================================================

fn is_zero_pubkey(pubkey: &[u8; 32]) -> bool {
    pubkey.iter().all(|b| *b == 0u8)
}

fn u128_from_le_bytes(bytes: &[u8]) -> u128 {
    let mut out = 0u128;
    let mut shift = 0u32;
    for b in bytes {
        out |= (*b as u128) << shift;
        shift += 8;
    }
    out
}

fn pubkey_to_u128s(pubkey: &Pubkey) -> [u128; 2] {
    let bytes = pubkey.to_bytes();
    let first = u128_from_le_bytes(&bytes[0..16]);
    let second = u128_from_le_bytes(&bytes[16..32]);
    [first, second]
}

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
        encryption_pubkey: [u8; 32],
    ) -> Result<()> {
        require!(
            !is_zero_pubkey(&encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
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
        merchant_ledger.encryption_pubkey = encryption_pubkey;
        merchant_ledger.encrypted_balance = [0u8; 32];
        merchant_ledger.encrypted_total_claimed = [0u8; 32];
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
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/deposit_v2.arcis".to_string(),
                hash: circuit_hash!("deposit_v2"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_withdraw_comp_def(ctx: Context<InitWithdrawCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/withdraw_v2.arcis".to_string(),
                hash: circuit_hash!("withdraw_v2"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_subscribe_comp_def(ctx: Context<InitSubscribeCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/subscribe_v2.arcis".to_string(),
                hash: circuit_hash!("subscribe_v2"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_unsubscribe_comp_def(ctx: Context<InitUnsubscribeCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/unsubscribe_v2.arcis".to_string(),
                hash: circuit_hash!("unsubscribe_v2"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_process_payment_comp_def(ctx: Context<InitProcessPaymentCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/process_payment_v2.arcis".to_string(),
                hash: circuit_hash!("process_payment_v2"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_verify_subscription_comp_def(ctx: Context<InitVerifySubscriptionCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/verify_subscription_v2.arcis".to_string(),
                hash: circuit_hash!("verify_subscription_v2"),
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_claim_revenue_comp_def(ctx: Context<InitClaimRevenueCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/SublyFi/circuits/main/claim_revenue_v2.arcis".to_string(),
                hash: circuit_hash!("claim_revenue_v2"),
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
        encryption_pubkey: [u8; 32],
        encrypted_amount: [u8; 32],
        encrypted_amount_nonce: u128,
    ) -> Result<()> {
        require!(
            !is_zero_pubkey(&encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        require!(amount > 0, ErrorCode::InvalidAmount);
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
            user_ledger.encryption_pubkey = encryption_pubkey;
            user_ledger.encrypted_balance = [0u8; 32];
            user_ledger.encrypted_subscription_count = [0u8; 32];
            user_ledger.nonce = 0;
            user_ledger.bump = ctx.bumps.user_ledger;
        } else {
            require!(
                user_ledger.encryption_pubkey == encryption_pubkey,
                ErrorCode::EncryptionKeyMismatch
            );
        }
        user_ledger.last_updated = Clock::get()?.unix_timestamp;

        let user_is_new = user_ledger.nonce == 0;

        // Queue computation to Arcium
        // ArgBuilder order must match Arcis circuit's deposit parameters:
        //   1. user_ledger (Enc<Shared, UserLedgerState>)
        //   2. amount (Enc<Shared, u64>)
        //   3. is_new (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(user_ledger.nonce)
            .encrypted_u64(user_ledger.encrypted_balance)               // balance
            .encrypted_u64(user_ledger.encrypted_subscription_count)    // subscription_count
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(encrypted_amount_nonce)
            .encrypted_u64(encrypted_amount)                            // amount
            .plaintext_bool(user_is_new)                                // is_new
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![DepositV2Callback::callback_ix(
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
        amount: u64,
        encryption_pubkey: [u8; 32],
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let user_ledger = &mut ctx.accounts.user_ledger;
        require!(
            user_ledger.encryption_pubkey == encryption_pubkey,
            ErrorCode::EncryptionKeyMismatch
        );
        user_ledger.last_updated = Clock::get()?.unix_timestamp;

        let user_is_new = user_ledger.nonce == 0;

        // ArgBuilder order must match Arcis circuit's withdraw parameters:
        //   1. user_ledger (Enc<Shared, UserLedgerState>)
        //   2. amount (plaintext)
        //   3. is_new (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(user_ledger.nonce)
            .encrypted_u64(user_ledger.encrypted_balance)               // balance
            .encrypted_u64(user_ledger.encrypted_subscription_count)    // subscription_count
            .plaintext_u64(amount)                                      // amount
            .plaintext_bool(user_is_new)                                // is_new
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![WithdrawV2Callback::callback_ix(
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
        encrypted_plan: [[u8; 32]; 2],
        encrypted_plan_nonce: u128,
        encrypted_price: [u8; 32],
        encrypted_price_nonce: u128,
        encrypted_billing_cycle: [u8; 32],
        encrypted_billing_cycle_nonce: u128,
    ) -> Result<()> {
        require!(ctx.accounts.subscription_plan.is_active, ErrorCode::PlanNotActive);
        require!(
            !is_zero_pubkey(&ctx.accounts.user_ledger.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        require!(
            !is_zero_pubkey(&ctx.accounts.merchant_ledger.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Initialize user subscription PDA
        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.user = ctx.accounts.user.key();
        user_subscription.subscription_index = subscription_index;
        user_subscription.encryption_pubkey = ctx.accounts.user_ledger.encryption_pubkey;
        user_subscription.encrypted_plan = [[0u8; 32]; 2];
        user_subscription.encrypted_status = [0u8; 32];
        user_subscription.encrypted_next_payment_date = [0u8; 32];
        user_subscription.encrypted_start_date = [0u8; 32];
        user_subscription.nonce = 0;
        user_subscription.bump = ctx.bumps.user_subscription;

        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.last_updated = Clock::get()?.unix_timestamp;

        let current_timestamp = Clock::get()?.unix_timestamp;
        let billing_cycle_days = ctx.accounts.subscription_plan.billing_cycle_days;
        let price = ctx.accounts.subscription_plan.price;

        let user_is_new = user_ledger.nonce == 0;
        let merchant_is_new = ctx.accounts.merchant_ledger.nonce == 0;

        let plan_bytes = pubkey_to_u128s(&ctx.accounts.subscription_plan.key());

        // ArgBuilder order must match Arcis circuit's subscribe parameters:
        //   1. user_ledger (Enc<Shared, UserLedgerState>)
        //   2. merchant_ledger (Enc<Shared, MerchantLedgerState>)
        //   3. plan (Enc<Shared, [u128; 2]>)
        //   4. price (Enc<Shared, u64>)
        //   5. billing_cycle_days (Enc<Shared, u32>)
        //   6. current_timestamp (plaintext)
        //   7. plan_pubkey (plaintext [u128; 2])
        //   8. plan_price (plaintext)
        //   9. plan_billing_cycle_days (plaintext)
        //  10. user_is_new (plaintext)
        //  11. merchant_is_new (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(user_ledger.nonce)
            .encrypted_u64(user_ledger.encrypted_balance)                       // user_balance
            .encrypted_u64(user_ledger.encrypted_subscription_count)            // subscription_count
            .x25519_pubkey(ctx.accounts.merchant_ledger.encryption_pubkey)
            .plaintext_u128(ctx.accounts.merchant_ledger.nonce)
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance)      // merchant_balance
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_total_claimed)// total_claimed
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(encrypted_plan_nonce)
            .encrypted_u128(encrypted_plan[0])                                  // plan_part1
            .encrypted_u128(encrypted_plan[1])                                  // plan_part2
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(encrypted_price_nonce)
            .encrypted_u64(encrypted_price)                                     // price
            .x25519_pubkey(user_ledger.encryption_pubkey)
            .plaintext_u128(encrypted_billing_cycle_nonce)
            .encrypted_u32(encrypted_billing_cycle)                             // billing_cycle_days
            .plaintext_i64(current_timestamp)                                   // current_timestamp
            .plaintext_u128(plan_bytes[0])                                      // plan_pubkey_part1
            .plaintext_u128(plan_bytes[1])                                      // plan_pubkey_part2
            .plaintext_u64(price)                                               // plan_price
            .plaintext_u32(billing_cycle_days)                                  // plan_billing_cycle_days
            .plaintext_bool(user_is_new)                                        // user_is_new
            .plaintext_bool(merchant_is_new)                                    // merchant_is_new
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![SubscribeV2Callback::callback_ix(
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
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        require!(
            !is_zero_pubkey(&ctx.accounts.user_subscription.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );

        // ArgBuilder order must match Arcis circuit's unsubscribe parameters:
        //   1. subscription (Enc<Shared, UserSubscriptionState>)
        let args = ArgBuilder::new()
            .x25519_pubkey(ctx.accounts.user_subscription.encryption_pubkey)
            .plaintext_u128(ctx.accounts.user_subscription.nonce)
            .encrypted_u128(ctx.accounts.user_subscription.encrypted_plan[0])
            .encrypted_u128(ctx.accounts.user_subscription.encrypted_plan[1])
            .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_next_payment_date)
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_start_date)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![UnsubscribeV2Callback::callback_ix(
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
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        require!(
            !is_zero_pubkey(&ctx.accounts.user_ledger.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        require!(
            !is_zero_pubkey(&ctx.accounts.merchant_ledger.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        require!(
            !is_zero_pubkey(&ctx.accounts.user_subscription.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        require!(
            ctx.accounts.user_subscription.encryption_pubkey
                == ctx.accounts.user_ledger.encryption_pubkey,
            ErrorCode::EncryptionKeyMismatch
        );

        let current_timestamp = Clock::get()?.unix_timestamp;
        let plan_price = ctx.accounts.subscription_plan.price;
        let billing_cycle_days = ctx.accounts.subscription_plan.billing_cycle_days;
        let plan_bytes = pubkey_to_u128s(&ctx.accounts.subscription_plan.key());
        let user_is_new = ctx.accounts.user_ledger.nonce == 0;
        let merchant_is_new = ctx.accounts.merchant_ledger.nonce == 0;

        // ArgBuilder order must match Arcis circuit's process_payment parameters:
        //   1. user_ledger (Enc<Shared, UserLedgerState>)
        //   2. merchant_ledger (Enc<Shared, MerchantLedgerState>)
        //   3. subscription (Enc<Shared, UserSubscriptionState>)
        //   4. current_timestamp (plaintext)
        //   5. plan_price (plaintext)
        //   6. billing_cycle_days (plaintext)
        //   7. plan_pubkey (plaintext [u128; 2])
        //   8. user_is_new (plaintext)
        //   9. merchant_is_new (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(ctx.accounts.user_ledger.encryption_pubkey)
            .plaintext_u128(ctx.accounts.user_ledger.nonce)
            .encrypted_u64(ctx.accounts.user_ledger.encrypted_balance)               // user_balance
            .encrypted_u64(ctx.accounts.user_ledger.encrypted_subscription_count)    // subscription_count
            .x25519_pubkey(ctx.accounts.merchant_ledger.encryption_pubkey)
            .plaintext_u128(ctx.accounts.merchant_ledger.nonce)
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance)           // merchant_balance
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_total_claimed)     // total_claimed
            .x25519_pubkey(ctx.accounts.user_subscription.encryption_pubkey)
            .plaintext_u128(ctx.accounts.user_subscription.nonce)
            .encrypted_u128(ctx.accounts.user_subscription.encrypted_plan[0])
            .encrypted_u128(ctx.accounts.user_subscription.encrypted_plan[1])
            .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_next_payment_date)
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_start_date)
            .plaintext_i64(current_timestamp)                                       // current_timestamp
            .plaintext_u64(plan_price)                                              // plan_price
            .plaintext_u32(billing_cycle_days)                                      // billing_cycle_days
            .plaintext_u128(plan_bytes[0])                                          // plan_pubkey_part1
            .plaintext_u128(plan_bytes[1])                                          // plan_pubkey_part2
            .plaintext_bool(user_is_new)                                            // user_is_new
            .plaintext_bool(merchant_is_new)                                        // merchant_is_new
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ProcessPaymentV2Callback::callback_ix(
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
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        require!(
            !is_zero_pubkey(&ctx.accounts.user_subscription.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );

        let current_timestamp = Clock::get()?.unix_timestamp;

        // ArgBuilder order must match Arcis circuit's verify_subscription parameters:
        //   1. subscription (Enc<Shared, UserSubscriptionState>)
        //   2. current_timestamp (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(ctx.accounts.user_subscription.encryption_pubkey)
            .plaintext_u128(ctx.accounts.user_subscription.nonce)
            .encrypted_u128(ctx.accounts.user_subscription.encrypted_plan[0])
            .encrypted_u128(ctx.accounts.user_subscription.encrypted_plan[1])
            .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_next_payment_date)
            .encrypted_i64(ctx.accounts.user_subscription.encrypted_start_date)
            .plaintext_i64(current_timestamp)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![VerifySubscriptionV2Callback::callback_ix(
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
        amount: u64,
    ) -> Result<()> {
        require!(ctx.accounts.merchant.is_active, ErrorCode::MerchantNotActive);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(
            !is_zero_pubkey(&ctx.accounts.merchant_ledger.encryption_pubkey),
            ErrorCode::InvalidEncryptionKey
        );
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let merchant_is_new = ctx.accounts.merchant_ledger.nonce == 0;

        // ArgBuilder order must match Arcis circuit's claim_revenue parameters:
        //   1. merchant_ledger (Enc<Shared, MerchantLedgerState>)
        //   2. amount (plaintext)
        //   3. is_new (plaintext)
        let args = ArgBuilder::new()
            .x25519_pubkey(ctx.accounts.merchant_ledger.encryption_pubkey)
            .plaintext_u128(ctx.accounts.merchant_ledger.nonce)
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance)          // balance
            .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_total_claimed)    // total_claimed
            .plaintext_u64(amount)                                                  // amount
            .plaintext_bool(merchant_is_new)                                        // is_new
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ClaimRevenueV2Callback::callback_ix(
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

    const SHARED_ENCRYPTED_BASE_SIZE: usize = 32 + 16;
    const SHARED_ENCRYPTED_SIZE_2: usize = SHARED_ENCRYPTED_BASE_SIZE + (32 * 2);
    const SHARED_ENCRYPTED_SIZE_5: usize = SHARED_ENCRYPTED_BASE_SIZE + (32 * 5);

    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct WithdrawResult {
        pub field_0: SharedEncryptedStruct<2>,
        pub field_1: u64,
    }

    impl HasSize for WithdrawResult {
        const SIZE: usize = SHARED_ENCRYPTED_SIZE_2 + 8;
    }

    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct ClaimRevenueResult {
        pub field_0: SharedEncryptedStruct<2>,
        pub field_1: u64,
    }

    impl HasSize for ClaimRevenueResult {
        const SIZE: usize = SHARED_ENCRYPTED_SIZE_2 + 8;
    }

    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct SubscribeResult {
        pub field_0: SharedEncryptedStruct<2>,
        pub field_1: SharedEncryptedStruct<2>,
        pub field_2: SharedEncryptedStruct<5>,
    }

    impl HasSize for SubscribeResult {
        const SIZE: usize = (SHARED_ENCRYPTED_SIZE_2 * 2) + SHARED_ENCRYPTED_SIZE_5;
    }

    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct ProcessPaymentResult {
        pub field_0: SharedEncryptedStruct<2>,
        pub field_1: SharedEncryptedStruct<2>,
        pub field_2: SharedEncryptedStruct<5>,
    }

    impl HasSize for ProcessPaymentResult {
        const SIZE: usize = (SHARED_ENCRYPTED_SIZE_2 * 2) + SHARED_ENCRYPTED_SIZE_5;
    }

    #[arcium_callback(encrypted_ix = "deposit_v2")]
    pub fn deposit_v2_callback(
        ctx: Context<DepositV2Callback>,
        output: SignedComputationOutputs<DepositV2Output>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(DepositV2Output { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance = o.ciphertexts[0];
        user_ledger.encrypted_subscription_count = o.ciphertexts[1];
        user_ledger.nonce = o.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "withdraw_v2", auto_serialize = false)]
    pub fn withdraw_v2_callback(
        ctx: Context<WithdrawV2Callback>,
        output: SignedComputationOutputs<WithdrawResult>,
    ) -> Result<()> {
        let WithdrawResult { field_0: o, field_1: actual_amount } = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(result) => result,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update user ledger with new encrypted balance
        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance = o.ciphertexts[0];
        user_ledger.encrypted_subscription_count = o.ciphertexts[1];
        user_ledger.nonce = o.nonce;

        // Transfer actual amount from pool to user if approved by MPC
        if actual_amount > 0 {
            let protocol_pool = &ctx.accounts.protocol_pool;
            let signer_seeds: &[&[u8]] = &[
                PROTOCOL_POOL_SEED,
                protocol_pool.mint.as_ref(),
                &[protocol_pool.bump],
            ];
            let signer = &[signer_seeds];

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.pool_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.protocol_pool.to_account_info(),
                },
                signer,
            );
            anchor_spl::token::transfer(cpi_ctx, actual_amount)?;
        }

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "subscribe_v2", auto_serialize = false)]
    pub fn subscribe_v2_callback(
        ctx: Context<SubscribeV2Callback>,
        output: SignedComputationOutputs<SubscribeResult>,
    ) -> Result<()> {
        let SubscribeResult { field_0: user_out, field_1: merchant_out, field_2: sub_out } = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(result) => result,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update user ledger
        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance = user_out.ciphertexts[0];
        user_ledger.encrypted_subscription_count = user_out.ciphertexts[1];
        user_ledger.nonce = user_out.nonce;

        // Update merchant ledger
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.encrypted_balance = merchant_out.ciphertexts[0];
        merchant_ledger.encrypted_total_claimed = merchant_out.ciphertexts[1];
        merchant_ledger.nonce = merchant_out.nonce;

        // Update user subscription
        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.encrypted_plan[0] = sub_out.ciphertexts[0];
        user_subscription.encrypted_plan[1] = sub_out.ciphertexts[1];
        user_subscription.encrypted_status = sub_out.ciphertexts[2];
        user_subscription.encrypted_next_payment_date = sub_out.ciphertexts[3];
        user_subscription.encrypted_start_date = sub_out.ciphertexts[4];
        user_subscription.nonce = sub_out.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "unsubscribe_v2")]
    pub fn unsubscribe_v2_callback(
        ctx: Context<UnsubscribeV2Callback>,
        output: SignedComputationOutputs<UnsubscribeV2Output>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(UnsubscribeV2Output { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.encrypted_plan[0] = o.ciphertexts[0];
        user_subscription.encrypted_plan[1] = o.ciphertexts[1];
        user_subscription.encrypted_status = o.ciphertexts[2];
        user_subscription.encrypted_next_payment_date = o.ciphertexts[3];
        user_subscription.encrypted_start_date = o.ciphertexts[4];
        user_subscription.nonce = o.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "process_payment_v2", auto_serialize = false)]
    pub fn process_payment_v2_callback(
        ctx: Context<ProcessPaymentV2Callback>,
        output: SignedComputationOutputs<ProcessPaymentResult>,
    ) -> Result<()> {
        let ProcessPaymentResult { field_0: user_out, field_1: merchant_out, field_2: sub_out } = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(result) => result,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update user ledger
        let user_ledger = &mut ctx.accounts.user_ledger;
        user_ledger.encrypted_balance = user_out.ciphertexts[0];
        user_ledger.encrypted_subscription_count = user_out.ciphertexts[1];
        user_ledger.nonce = user_out.nonce;

        // Update merchant ledger
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.encrypted_balance = merchant_out.ciphertexts[0];
        merchant_ledger.encrypted_total_claimed = merchant_out.ciphertexts[1];
        merchant_ledger.nonce = merchant_out.nonce;

        // Update user subscription
        let user_subscription = &mut ctx.accounts.user_subscription;
        user_subscription.encrypted_plan[0] = sub_out.ciphertexts[0];
        user_subscription.encrypted_plan[1] = sub_out.ciphertexts[1];
        user_subscription.encrypted_status = sub_out.ciphertexts[2];
        user_subscription.encrypted_next_payment_date = sub_out.ciphertexts[3];
        user_subscription.encrypted_start_date = sub_out.ciphertexts[4];
        user_subscription.nonce = sub_out.nonce;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "verify_subscription_v2")]
    pub fn verify_subscription_v2_callback(
        ctx: Context<VerifySubscriptionV2Callback>,
        output: SignedComputationOutputs<VerifySubscriptionV2Output>,
    ) -> Result<()> {
        // VerifySubscriptionV2Output.field_0 is a revealed bool (not encrypted)
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(VerifySubscriptionV2Output { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Emit the revealed boolean result
        emit!(SubscriptionVerified {
            is_valid: o,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "claim_revenue_v2", auto_serialize = false)]
    pub fn claim_revenue_v2_callback(
        ctx: Context<ClaimRevenueV2Callback>,
        output: SignedComputationOutputs<ClaimRevenueResult>,
    ) -> Result<()> {
        let ClaimRevenueResult { field_0: o, field_1: actual_amount } = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(result) => result,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update merchant ledger
        let merchant_ledger = &mut ctx.accounts.merchant_ledger;
        merchant_ledger.encrypted_balance = o.ciphertexts[0];
        merchant_ledger.encrypted_total_claimed = o.ciphertexts[1];
        merchant_ledger.nonce = o.nonce;

        // Transfer actual amount from pool to merchant if approved by MPC
        if actual_amount > 0 {
            let protocol_pool = &ctx.accounts.protocol_pool;
            let signer_seeds: &[&[u8]] = &[
                PROTOCOL_POOL_SEED,
                protocol_pool.mint.as_ref(),
                &[protocol_pool.bump],
            ];
            let signer = &[signer_seeds];

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.pool_token_account.to_account_info(),
                    to: ctx.accounts.merchant_token_account.to_account_info(),
                    authority: ctx.accounts.protocol_pool.to_account_info(),
                },
                signer,
            );
            anchor_spl::token::transfer(cpi_ctx, actual_amount)?;
        }

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
    /// X25519 encryption public key (used for Enc<Shared, T>)
    pub encryption_pubkey: [u8; 32],
    /// Encrypted balance (Enc<Shared, u64>)
    pub encrypted_balance: [u8; 32],
    /// Encrypted total claimed (Enc<Shared, u64>)
    pub encrypted_total_claimed: [u8; 32],
    /// Nonce for encryption
    pub nonce: u128,
    /// PDA bump
    pub bump: u8,
}

impl MerchantLedger {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 32 + 32 + 16 + 1;
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
    /// X25519 encryption public key (used for Enc<Shared, T>)
    pub encryption_pubkey: [u8; 32],
    /// Encrypted balance (Enc<Shared, u64>)
    pub encrypted_balance: [u8; 32],
    /// Encrypted subscription count (Enc<Shared, u64>)
    pub encrypted_subscription_count: [u8; 32],
    /// Nonce for encryption
    pub nonce: u128,
    /// Last update timestamp
    pub last_updated: i64,
    /// PDA bump
    pub bump: u8,
}

impl UserLedger {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 32 + 32 + 16 + 8 + 1;
}

/// User subscription account
/// PDA Seeds: ["user_subscription", user, subscription_index.to_le_bytes()]
#[account]
pub struct UserSubscription {
    /// User wallet
    pub user: Pubkey,
    /// Subscription index (unique per user)
    pub subscription_index: u64,
    /// X25519 encryption public key (used for Enc<Shared, T>)
    pub encryption_pubkey: [u8; 32],
    /// Encrypted plan public key (Enc<Shared, [u128; 2]>)
    pub encrypted_plan: [[u8; 32]; 2],
    /// Encrypted status (Enc<Shared, u8>)
    pub encrypted_status: [u8; 32],
    /// Encrypted next payment date (Enc<Shared, i64>)
    pub encrypted_next_payment_date: [u8; 32],
    /// Encrypted start date (Enc<Shared, i64>)
    pub encrypted_start_date: [u8; 32],
    /// Nonce for encryption
    pub nonce: u128,
    /// PDA bump
    pub bump: u8,
}

impl UserSubscription {
    pub const SIZE: usize = 8 + 32 + 8 + 32 + (32 * 2) + 32 + 32 + 32 + 16 + 1;
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

#[init_computation_definition_accounts("deposit_v2", payer)]
#[derive(Accounts)]
pub struct InitDepositCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("withdraw_v2", payer)]
#[derive(Accounts)]
pub struct InitWithdrawCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("subscribe_v2", payer)]
#[derive(Accounts)]
pub struct InitSubscribeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("unsubscribe_v2", payer)]
#[derive(Accounts)]
pub struct InitUnsubscribeCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("process_payment_v2", payer)]
#[derive(Accounts)]
pub struct InitProcessPaymentCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("verify_subscription_v2", payer)]
#[derive(Accounts)]
pub struct InitVerifySubscriptionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("claim_revenue_v2", payer)]
#[derive(Accounts)]
pub struct InitClaimRevenueCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!())]
    /// CHECK: address lookup table for the MXE program
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = ::arcium_anchor::solana_address_lookup_table_interface::program::ID)]
    /// CHECK: address lookup table program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// Context Structures - Phase 2: Queue Computation
// ============================================================================

#[queue_computation_accounts("deposit_v2", user)]
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

#[queue_computation_accounts("withdraw_v2", user)]
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

#[queue_computation_accounts("subscribe_v2", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, subscription_index: u64)]
pub struct Subscribe<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [SUBSCRIPTION_PLAN_SEED, subscription_plan.merchant.as_ref(), &subscription_plan.plan_id.to_le_bytes()],
        bump = subscription_plan.bump,
        constraint = subscription_plan.mint == mint.key() @ ErrorCode::InvalidMint,
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

#[queue_computation_accounts("unsubscribe_v2", user)]
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

#[queue_computation_accounts("process_payment_v2", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [SUBSCRIPTION_PLAN_SEED, subscription_plan.merchant.as_ref(), &subscription_plan.plan_id.to_le_bytes()],
        bump = subscription_plan.bump,
        constraint = subscription_plan.mint == mint.key() @ ErrorCode::InvalidMint,
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

#[queue_computation_accounts("verify_subscription_v2", payer)]
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

#[queue_computation_accounts("claim_revenue_v2", wallet)]
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

#[callback_accounts("deposit_v2")]
#[derive(Accounts)]
pub struct DepositV2Callback<'info> {
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

#[callback_accounts("withdraw_v2")]
#[derive(Accounts)]
pub struct WithdrawV2Callback<'info> {
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

#[callback_accounts("subscribe_v2")]
#[derive(Accounts)]
pub struct SubscribeV2Callback<'info> {
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

#[callback_accounts("unsubscribe_v2")]
#[derive(Accounts)]
pub struct UnsubscribeV2Callback<'info> {
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

#[callback_accounts("process_payment_v2")]
#[derive(Accounts)]
pub struct ProcessPaymentV2Callback<'info> {
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

#[callback_accounts("verify_subscription_v2")]
#[derive(Accounts)]
pub struct VerifySubscriptionV2Callback<'info> {
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

#[callback_accounts("claim_revenue_v2")]
#[derive(Accounts)]
pub struct ClaimRevenueV2Callback<'info> {
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

    #[msg("Invalid amount (must be greater than 0)")]
    InvalidAmount,

    #[msg("Invalid billing cycle (must be 1-365 days)")]
    InvalidBillingCycle,

    #[msg("Name too long")]
    NameTooLong,

    #[msg("Merchant not active")]
    MerchantNotActive,

    #[msg("Plan not active")]
    PlanNotActive,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Invalid encryption key")]
    InvalidEncryptionKey,

    #[msg("Encryption key mismatch")]
    EncryptionKeyMismatch,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Subscription not active")]
    SubscriptionNotActive,
}
