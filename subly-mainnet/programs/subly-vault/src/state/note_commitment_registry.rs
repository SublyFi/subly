use anchor_lang::prelude::*;

/// Note Commitment Registry - Tracks Privacy Cash deposit proofs
///
/// This account prevents double-registration of the same Privacy Cash deposit.
/// When a user deposits through Privacy Cash and then transfers to the Shield Pool,
/// the note_commitment serves as a unique identifier for that deposit.
#[account]
pub struct NoteCommitmentRegistry {
    /// The note commitment from Privacy Cash (unique identifier for the deposit)
    pub note_commitment: [u8; 32],

    /// User's commitment (anonymous identifier within the vault)
    pub user_commitment: [u8; 32],

    /// Amount deposited (in USDC base units, 6 decimals)
    pub amount: u64,

    /// Timestamp when this deposit was registered
    pub registered_at: i64,

    /// The Shield Pool this deposit belongs to
    pub pool: Pubkey,

    /// PDA bump seed
    pub bump: u8,

    /// Reserved space for future upgrades
    pub _reserved: [u8; 31],
}

impl NoteCommitmentRegistry {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // note_commitment: [u8; 32]
        + 32                       // user_commitment: [u8; 32]
        + 8                        // amount: u64
        + 8                        // registered_at: i64
        + 32                       // pool: Pubkey
        + 1                        // bump: u8
        + 31; // _reserved: [u8; 31]
              // Total: 152 bytes
}

/// Seeds for deriving NoteCommitmentRegistry PDA
pub const NOTE_COMMITMENT_REGISTRY_SEED: &[u8] = b"note_commitment_registry";
