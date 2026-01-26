use anchor_lang::prelude::*;

/// Transfer Status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TransferStatus {
    Pending,
    Completed,
    Failed,
    Skipped,
}

/// Transfer History - Records executed transfers
#[account]
pub struct TransferHistory {
    /// Unique identifier (PDA address)
    pub history_id: Pubkey,

    /// Reference to the scheduled transfer
    pub scheduled_transfer: Pubkey,

    /// Privacy Cash transaction reference (for tracking)
    pub privacy_cash_tx: [u8; 32],

    /// Transfer amount in USDC
    pub amount: u64,

    /// Timestamp when transfer was executed
    pub executed_at: i64,

    /// Transfer status
    pub status: TransferStatus,

    /// Execution index (nth execution of this scheduled transfer)
    pub execution_index: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl TransferHistory {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // history_id: Pubkey
        + 32                       // scheduled_transfer: Pubkey
        + 32                       // privacy_cash_tx: [u8; 32]
        + 8                        // amount: u64
        + 8                        // executed_at: i64
        + 1                        // status: TransferStatus (enum = 1 byte)
        + 8                        // execution_index: u64
        + 1; // bump: u8
             // Total: 130 bytes
}

/// Kamino Position - Tracks the pool's DeFi position
#[account]
pub struct KaminoPosition {
    /// Unique identifier (PDA address)
    pub position_id: Pubkey,

    /// Reference to the Shield Pool
    pub pool: Pubkey,

    /// Kamino obligation account
    pub kamino_obligation: Pubkey,

    /// Total deposited amount
    pub deposited_amount: u64,

    /// Current value (including yield)
    pub current_value: u64,

    /// Current APY in basis points
    pub apy_bps: u64,

    /// Last update timestamp
    pub last_update: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl KaminoPosition {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // position_id: Pubkey
        + 32                       // pool: Pubkey
        + 32                       // kamino_obligation: Pubkey
        + 8                        // deposited_amount: u64
        + 8                        // current_value: u64
        + 8                        // apy_bps: u64
        + 8                        // last_update: i64
        + 1; // bump: u8
             // Total: 137 bytes
}
