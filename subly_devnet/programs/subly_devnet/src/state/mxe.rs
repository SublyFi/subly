use anchor_lang::prelude::*;

/// MXE Account - Arcium MXE integration account
/// PDA seeds: ["mxe"]
/// This account is used to interact with the Arcium MXE cluster
#[account]
pub struct MxeAccount {
    /// PDA bump
    pub bump: u8,
}

impl MxeAccount {
    /// Calculate account space
    pub const SPACE: usize = 8 + 1; // discriminator + bump
}
