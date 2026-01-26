use anchor_lang::prelude::*;

/// Emitted when the Shield Pool is initialized
#[event]
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

/// Emitted when a user deposits into the Shield Pool
#[event]
pub struct Deposited {
    pub pool: Pubkey,
    pub commitment: [u8; 32],
    pub shares_minted: u64,
    pub pool_value_after: u64,
    pub total_shares_after: u64,
    pub timestamp: i64,
}

/// Emitted when a user withdraws from the Shield Pool
#[event]
pub struct Withdrawn {
    pub pool: Pubkey,
    pub commitment: [u8; 32],
    pub amount: u64,
    pub shares_burned: u64,
    pub nullifier: [u8; 32],
    pub pool_value_after: u64,
    pub total_shares_after: u64,
    pub timestamp: i64,
}

/// Emitted when a scheduled transfer is created
#[event]
pub struct TransferScheduled {
    pub transfer_id: Pubkey,
    pub commitment: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub interval_seconds: u32,
    pub first_execution: i64,
    pub timestamp: i64,
}

/// Emitted when a scheduled transfer is executed
#[event]
pub struct TransferExecuted {
    pub transfer_id: Pubkey,
    pub commitment: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub execution_index: u64,
    pub next_execution: i64,
    pub timestamp: i64,
}

/// Emitted when a scheduled transfer is cancelled
#[event]
pub struct TransferCancelled {
    pub transfer_id: Pubkey,
    pub commitment: [u8; 32],
    pub timestamp: i64,
}

/// Emitted when pool value is updated (e.g., yield accrual)
#[event]
pub struct PoolValueUpdated {
    pub pool: Pubkey,
    pub old_value: u64,
    pub new_value: u64,
    pub yield_amount: u64,
    pub timestamp: i64,
}
