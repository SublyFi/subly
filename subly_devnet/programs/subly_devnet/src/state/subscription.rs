use anchor_lang::prelude::*;

/// Subscription - stores subscription contract information
/// PDA seeds: ["subscription", plan, user_commitment]
#[account]
pub struct Subscription {
    /// Subscription's own address (for reference)
    pub subscription_id: Pubkey,
    /// Reference to plan account
    pub plan: Pubkey,
    /// Encrypted user commitment (Arcium encrypted)
    /// user_commitment = hash(secret || plan_id)
    pub encrypted_user_commitment: [u8; 32],
    /// Membership commitment for Light Protocol ZK proofs
    pub membership_commitment: [u8; 32],
    /// Subscription creation timestamp (plaintext - for backward compatibility, will be deprecated)
    pub subscribed_at: i64,
    /// Cancellation timestamp (0 if not cancelled) (plaintext - for backward compatibility, will be deprecated)
    pub cancelled_at: i64,
    /// Whether the subscription is active (plaintext - for backward compatibility, will be deprecated)
    pub is_active: bool,
    /// Nonce for encryption
    pub nonce: u128,
    /// PDA bump
    pub bump: u8,
    /// Encrypted subscription status (Arcium MXE encrypted)
    /// Contains: is_active (u8), subscribed_at (i64), cancelled_at (i64)
    pub encrypted_status: [u8; 64],
    /// Nonce for status encryption
    pub status_nonce: [u8; 16],
}

impl Subscription {
    /// Calculate account space
    pub const SPACE: usize = 8    // discriminator
        + 32                       // subscription_id: Pubkey
        + 32                       // plan: Pubkey
        + 32                       // encrypted_user_commitment: [u8; 32]
        + 32                       // membership_commitment: [u8; 32]
        + 8                        // subscribed_at: i64
        + 8                        // cancelled_at: i64
        + 1                        // is_active: bool
        + 16                       // nonce: u128
        + 1                        // bump: u8
        + 64                       // encrypted_status: [u8; 64]
        + 16;                      // status_nonce: [u8; 16]
    // Total: 250 bytes
}
