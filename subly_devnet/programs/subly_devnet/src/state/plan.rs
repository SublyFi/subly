use anchor_lang::prelude::*;

/// Plan - stores subscription plan information
/// PDA seeds: ["plan", business, plan_nonce]
#[account]
pub struct Plan {
    /// Plan's own address (for reference)
    pub plan_id: Pubkey,
    /// Reference to business account
    pub business: Pubkey,
    /// Encrypted plan name (Arcium encrypted)
    pub encrypted_name: [u8; 32],
    /// Encrypted plan description (Arcium encrypted)
    pub encrypted_description: [u8; 64],
    /// Price in USDC (6 decimals, e.g., 10_000_000 = 10 USDC)
    pub price_usdc: u64,
    /// Billing cycle in seconds
    pub billing_cycle_seconds: u32,
    /// Plan creation timestamp
    pub created_at: i64,
    /// Whether the plan is active
    pub is_active: bool,
    /// Encrypted subscription count (Arcium encrypted, only count is known)
    pub encrypted_subscription_count: [u8; 32],
    /// Nonce for encryption
    pub nonce: u128,
    /// Plan nonce (sequential number for this business)
    pub plan_nonce: u64,
    /// PDA bump
    pub bump: u8,
    /// Whether count encryption is pending (waiting for Arcium callback)
    pub pending_count_encryption: bool,
}

impl Plan {
    /// Calculate account space
    pub const SPACE: usize = 8    // discriminator
        + 32                       // plan_id: Pubkey
        + 32                       // business: Pubkey
        + 32                       // encrypted_name: [u8; 32]
        + 64                       // encrypted_description: [u8; 64]
        + 8                        // price_usdc: u64
        + 4                        // billing_cycle_seconds: u32
        + 8                        // created_at: i64
        + 1                        // is_active: bool
        + 32                       // encrypted_subscription_count: [u8; 32]
        + 16                       // nonce: u128
        + 8                        // plan_nonce: u64
        + 1                        // bump: u8
        + 1;                       // pending_count_encryption: bool
    // Total: 247 bytes
}
