use anchor_lang::prelude::*;

/// Scheduled Transfer - Recurring payment configuration (Privacy-Preserving)
///
/// Enables automated subscription payments from the Shield Pool.
/// The recipient address is stored encrypted to preserve privacy.
/// Actual recipient is stored in the user's local storage and provided
/// at execution time via Privacy Cash.
#[account]
pub struct ScheduledTransfer {
    /// Unique identifier (PDA address)
    pub transfer_id: Pubkey,

    /// User commitment (links to UserShare)
    pub user_commitment: [u8; 32],

    /// Encrypted transfer data (contains recipient, memo, etc.)
    /// Encrypted with user's derived key - only user can decrypt
    /// Format: AES-256-GCM encrypted { recipient: Pubkey, memo: String }
    pub encrypted_transfer_data: [u8; 128],

    /// Transfer amount in USDC per interval
    pub amount: u64,

    /// Transfer interval in seconds
    pub interval_seconds: u32,

    /// Next scheduled execution timestamp
    pub next_execution: i64,

    /// Whether the transfer is active
    pub is_active: bool,

    /// Number of consecutive skipped transfers (insufficient balance)
    pub skip_count: u8,

    /// Total number of successful transfers
    pub execution_count: u64,

    /// Total amount transferred
    pub total_transferred: u64,

    /// Timestamp when transfer was created
    pub created_at: i64,

    /// Tuk Tuk cron job address (for automation)
    /// Note: Clockwork was deprecated in Oct 2023, replaced by Tuk Tuk (Helium)
    pub tuktuk_cron_job: Pubkey,

    /// PDA bump seed
    pub bump: u8,

    /// Reserved space for future upgrades
    pub _reserved: [u8; 32],
}

impl ScheduledTransfer {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // transfer_id: Pubkey
        + 32                       // user_commitment: [u8; 32]
        + 128                      // encrypted_transfer_data: [u8; 128]
        + 8                        // amount: u64
        + 4                        // interval_seconds: u32
        + 8                        // next_execution: i64
        + 1                        // is_active: bool
        + 1                        // skip_count: u8
        + 8                        // execution_count: u64
        + 8                        // total_transferred: u64
        + 8                        // created_at: i64
        + 32                       // tuktuk_cron_job: Pubkey
        + 1                        // bump: u8
        + 32; // _reserved: [u8; 32]
              // Total: 311 bytes

    /// Check if the transfer is due for execution
    pub fn is_due(&self, current_timestamp: i64) -> bool {
        self.is_active && current_timestamp >= self.next_execution
    }

    /// Calculate the next execution timestamp
    pub fn calculate_next_execution(&self) -> i64 {
        self.next_execution + (self.interval_seconds as i64)
    }
}

/// Batch Proof Storage - Pre-generated proofs for recurring transfers
///
/// Allows users to pre-generate ZK proofs for multiple future transfers,
/// enabling seamless automated execution without user interaction.
#[account]
pub struct BatchProofStorage {
    /// Reference to the scheduled transfer
    pub transfer_id: Pubkey,

    /// Index of this proof in the batch
    pub index: u32,

    /// The ZK proof data
    pub proof: Vec<u8>,

    /// Public inputs for the proof
    pub public_inputs: Vec<[u8; 32]>,

    /// New encrypted share amount after this transfer
    pub new_encrypted_share: [u8; 64],

    /// Nullifier for this specific transfer execution
    pub nullifier: [u8; 32],

    /// Whether this proof has been used
    pub is_used: bool,

    /// Pool value at time of proof generation
    pub pool_value_at_generation: u64,

    /// Tolerance for pool value changes (basis points)
    pub pool_value_tolerance_bps: u16,

    /// PDA bump seed
    pub bump: u8,
}

impl BatchProofStorage {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // transfer_id: Pubkey
        + 4                        // index: u32
        + 4 + 256                  // proof: Vec<u8> (max 256 bytes)
        + 4 + (32 * 8)             // public_inputs: Vec<[u8; 32]> (max 8 inputs)
        + 64                       // new_encrypted_share: [u8; 64]
        + 32                       // nullifier: [u8; 32]
        + 1                        // is_used: bool
        + 8                        // pool_value_at_generation: u64
        + 2                        // pool_value_tolerance_bps: u16
        + 1; // bump: u8
             // Total: 672 bytes
}
