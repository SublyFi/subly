use anchor_lang::prelude::*;

use crate::constants::{MAX_METADATA_URI_LENGTH, MAX_NAME_LENGTH};

/// Business Account - stores business information
/// PDA seeds: ["business", authority]
#[account]
pub struct BusinessAccount {
    /// Business owner's wallet address
    pub authority: Pubkey,
    /// Business name (max 32 characters)
    pub name: String,
    /// Metadata URI (max 128 characters)
    pub metadata_uri: String,
    /// Account creation timestamp
    pub created_at: i64,
    /// Whether the business is active
    pub is_active: bool,
    /// Number of plans created by this business
    pub plan_count: u64,
    /// PDA bump
    pub bump: u8,
}

impl BusinessAccount {
    /// Calculate account space
    /// 8 (discriminator) + 32 (authority) + 4 + 32 (name) + 4 + 128 (metadata_uri)
    /// + 8 (created_at) + 1 (is_active) + 8 (plan_count) + 1 (bump)
    pub const SPACE: usize = 8    // discriminator
        + 32                       // authority: Pubkey
        + 4 + MAX_NAME_LENGTH      // name: String (4 bytes length + max content)
        + 4 + MAX_METADATA_URI_LENGTH // metadata_uri: String
        + 8                        // created_at: i64
        + 1                        // is_active: bool
        + 8                        // plan_count: u64
        + 1;                       // bump: u8
    // Total: 218 bytes
}
