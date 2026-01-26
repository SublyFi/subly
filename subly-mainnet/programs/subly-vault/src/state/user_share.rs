use anchor_lang::prelude::*;

/// User Share - Represents a user's stake in the Shield Pool
///
/// The user's identity is protected through a commitment scheme.
/// The actual share amount is encrypted using ECIES, so only the
/// user (with their wallet) can decrypt and know their balance.
#[account]
pub struct UserShare {
    /// Unique identifier for this share account (PDA address)
    pub share_id: Pubkey,

    /// Reference to the Shield Pool
    pub pool: Pubkey,

    /// ECIES-encrypted share amount
    /// Format: [32 bytes nonce] + [32 bytes ciphertext]
    /// Only the user can decrypt this using their wallet signature
    pub encrypted_share_amount: [u8; 64],

    /// User commitment: hash(secret || pool_id)
    /// This links the user to their share without revealing identity
    pub user_commitment: [u8; 32],

    /// Timestamp of last update
    pub last_update: i64,

    /// PDA bump seed
    pub bump: u8,

    /// Reserved space for future upgrades
    pub _reserved: [u8; 32],
}

impl UserShare {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // share_id: Pubkey
        + 32                       // pool: Pubkey
        + 64                       // encrypted_share_amount: [u8; 64]
        + 32                       // user_commitment: [u8; 32]
        + 8                        // last_update: i64
        + 1                        // bump: u8
        + 32;                      // _reserved: [u8; 32]
    // Total: 209 bytes
}

/// Deposit History - Records individual deposits for yield tracking
#[account]
pub struct DepositHistory {
    /// Unique identifier (PDA address)
    pub history_id: Pubkey,

    /// Reference to the Shield Pool
    pub pool: Pubkey,

    /// User commitment (links to UserShare)
    pub user_commitment: [u8; 32],

    /// Deposit amount in USDC
    pub amount: u64,

    /// Shares received for this deposit
    pub shares_received: u64,

    /// Pool value at time of deposit
    pub pool_value_at_deposit: u64,

    /// Total shares at time of deposit
    pub total_shares_at_deposit: u64,

    /// Timestamp of deposit
    pub deposited_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl DepositHistory {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // history_id: Pubkey
        + 32                       // pool: Pubkey
        + 32                       // user_commitment: [u8; 32]
        + 8                        // amount: u64
        + 8                        // shares_received: u64
        + 8                        // pool_value_at_deposit: u64
        + 8                        // total_shares_at_deposit: u64
        + 8                        // deposited_at: i64
        + 1;                       // bump: u8
    // Total: 145 bytes
}
