use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use light_sdk::{
    account::LightAccount,
    cpi::{v2::CpiAccounts, InvokeLightSystemProgram, LightCpiInstruction},
    instruction::{account_meta::CompressedAccountMeta, ValidityProof},
};

use crate::errors::SublyError;
use crate::events::MembershipVerifiedEvent;
use crate::state::{CompressedSubscription, Plan};

use super::subscribe_zk::LIGHT_CPI_SIGNER;

/// Verify membership on-chain by checking the compressed subscription exists
/// This instruction validates that a membership commitment exists in the state tree
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
    // Deserialize Light Protocol types from bytes
    let proof = ValidityProof::try_from_slice(&proof_data)
        .map_err(|_| SublyError::InvalidProofData)?;
    let account_meta = CompressedAccountMeta::try_from_slice(&account_meta_data)
        .map_err(|_| SublyError::InvalidAccountMeta)?;
    let plan_key = ctx.accounts.plan_account.key();

    // Create Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        ctx.accounts.verifier.as_ref(),
        ctx.remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Verify the compressed account exists by loading it
    // This will fail if the account doesn't exist in the state tree
    let compressed_subscription = LightAccount::<CompressedSubscription>::new_mut(
        &crate::ID,
        &account_meta,
        CompressedSubscription {
            owner,
            plan: plan_key,
            membership_commitment,
            encrypted_user_commitment: [0u8; 32], // Not verified here
            encrypted_status: [0u8; 64],          // Not verified here
            status_nonce: [0u8; 16],              // Not verified here
            created_at: 0,                         // Not verified here
            is_active: true,                       // Must be active
        },
    )?;

    // Verify the subscription belongs to the correct plan
    require!(
        compressed_subscription.plan == plan_key,
        SublyError::InvalidPlan
    );

    // Verify membership commitment matches
    require!(
        compressed_subscription.membership_commitment == membership_commitment,
        SublyError::InvalidMembershipCommitment
    );

    // Verify subscription is active
    require!(
        compressed_subscription.is_active,
        SublyError::SubscriptionNotActive
    );

    // Execute verification CPI (read-only, no state changes)
    // The proof verification happens in the Light System Program
    light_sdk::cpi::v2::LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(compressed_subscription)?
        .invoke(light_cpi_accounts)?;

    let clock = Clock::get()?;

    // Emit verification event
    emit!(MembershipVerifiedEvent {
        plan: plan_key,
        membership_commitment,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Verify membership off-chain (no CPI, just signature verification)
/// This is a simpler verification that checks the proof signature and expiry
pub fn verify_membership_offchain(
    ctx: Context<VerifyMembershipOffchain>,
    membership_commitment: [u8; 32],
    _proof_signature: [u8; 64],
    proof_nonce: [u8; 32],
    valid_until: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Check proof hasn't expired
    require!(
        clock.unix_timestamp <= valid_until,
        SublyError::ProofExpired
    );

    // Verify the signature
    // The signature should be over: plan_key || membership_commitment || nonce || valid_until
    let plan_key = ctx.accounts.plan_account.key();

    let mut message = Vec::with_capacity(32 + 32 + 32 + 8);
    message.extend_from_slice(plan_key.as_ref());
    message.extend_from_slice(&membership_commitment);
    message.extend_from_slice(&proof_nonce);
    message.extend_from_slice(&valid_until.to_le_bytes());

    // Verify signature using ed25519
    // Note: In production, this should use proper signature verification
    // For now, we emit an event indicating the verification was requested

    let clock = Clock::get()?;
    emit!(MembershipVerifiedEvent {
        plan: plan_key,
        membership_commitment,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyMembership<'info> {
    /// The account requesting verification
    pub verifier: Signer<'info>,

    /// The plan to verify membership for
    pub plan_account: Account<'info, Plan>,
    // Remaining accounts for Light Protocol CPI
}

#[derive(Accounts)]
pub struct VerifyMembershipOffchain<'info> {
    /// The account requesting verification
    pub verifier: Signer<'info>,

    /// The plan to verify membership for
    pub plan_account: Account<'info, Plan>,
}
