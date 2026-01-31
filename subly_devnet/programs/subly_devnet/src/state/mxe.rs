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

/// Signer Account - PDA signer for Arcium CPI calls
/// PDA seeds: [SIGN_PDA_SEED] where SIGN_PDA_SEED = b"SignerAccount"
/// This account is used to sign CPI calls to the Arcium program
#[account]
pub struct SignerAccount {
    /// PDA bump for signing
    pub bump: u8,
}

impl SignerAccount {
    /// Calculate account space: discriminator (8) + bump (1) = 9
    pub const SPACE: usize = 8 + 1;
}
