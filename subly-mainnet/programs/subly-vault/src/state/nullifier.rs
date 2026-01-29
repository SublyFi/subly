use anchor_lang::prelude::*;

/// Operation type for nullifier tracking
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OperationType {
    Withdraw,
    Transfer,
}

/// Nullifier - Prevents double-spending of funds
///
/// Each withdrawal or transfer operation requires a unique nullifier.
/// Once a nullifier is used, it cannot be reused, preventing replay attacks.
#[account]
pub struct Nullifier {
    /// The nullifier hash: hash(secret || operation_type || nonce)
    pub nullifier: [u8; 32],

    /// Whether this nullifier has been used
    pub is_used: bool,

    /// Timestamp when the nullifier was used
    pub used_at: i64,

    /// Type of operation this nullifier was used for
    pub operation_type: OperationType,

    /// PDA bump seed
    pub bump: u8,
}

impl Nullifier {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // nullifier: [u8; 32]
        + 1                        // is_used: bool
        + 8                        // used_at: i64
        + 1                        // operation_type: OperationType (enum = 1 byte)
        + 1; // bump: u8
             // Total: 51 bytes
}

/// Withdraw Request - Tracks pending withdrawals
#[account]
pub struct WithdrawRequest {
    /// Unique identifier (PDA address)
    pub request_id: Pubkey,

    /// User commitment
    pub commitment: [u8; 32],

    /// Withdrawal amount in USDC
    pub amount: u64,

    /// Request status
    pub status: WithdrawStatus,

    /// Number of retry attempts
    pub retry_count: u8,

    /// Timestamp when request was created
    pub created_at: i64,

    /// Timestamp when request was completed (0 if pending)
    pub completed_at: i64,

    /// Timestamp when request expires
    pub expires_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum WithdrawStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Expired,
}

impl WithdrawRequest {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // request_id: Pubkey
        + 32                       // commitment: [u8; 32]
        + 8                        // amount: u64
        + 1                        // status: WithdrawStatus (enum = 1 byte)
        + 1                        // retry_count: u8
        + 8                        // created_at: i64
        + 8                        // completed_at: i64
        + 8                        // expires_at: i64
        + 1; // bump: u8
             // Total: 107 bytes
}
