use anchor_lang::prelude::*;

/// Shield Pool - Aggregates all user funds for privacy
///
/// The Shield Pool is the core component that enables privacy by mixing
/// all user funds together. Individual users hold "shares" in the pool
/// rather than direct token balances, breaking the link between users
/// and their DeFi positions.
#[account]
pub struct ShieldPool {
    /// Unique identifier for this pool (PDA address)
    pub pool_id: Pubkey,

    /// Authority that can perform admin operations
    pub authority: Pubkey,

    /// Total value of all assets in the pool (in USDC, 6 decimals)
    pub total_pool_value: u64,

    /// Total number of shares issued to all users
    pub total_shares: u64,

    /// Kamino obligation account (for yield generation)
    pub kamino_obligation: Pubkey,

    /// Timestamp of last yield update
    pub last_yield_update: i64,

    /// Operation nonce for replay protection
    pub nonce: u128,

    /// PDA bump seed
    pub bump: u8,

    /// Whether the pool is active
    pub is_active: bool,

    /// Shield Pool's USDC Token Account (ATA)
    /// This holds USDC temporarily before depositing to Kamino
    pub token_account: Pubkey,

    /// Kamino cToken account for receiving collateral tokens
    /// When we deposit USDC to Kamino, we receive cTokens representing our position
    pub kamino_ctoken_account: Pubkey,

    /// Reserved space for future upgrades (reduced due to new fields)
    pub _reserved: [u8; 64],
}

impl ShieldPool {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // pool_id: Pubkey
        + 32                       // authority: Pubkey
        + 8                        // total_pool_value: u64
        + 8                        // total_shares: u64
        + 32                       // kamino_obligation: Pubkey
        + 8                        // last_yield_update: i64
        + 16                       // nonce: u128
        + 1                        // bump: u8
        + 1                        // is_active: bool
        + 32                       // token_account: Pubkey
        + 32                       // kamino_ctoken_account: Pubkey
        + 64; // _reserved: [u8; 64]
              // Total: 274 bytes

    /// Calculate shares to mint for a given deposit amount
    /// Formula: new_shares = deposit_amount * total_shares / total_pool_value
    /// If pool is empty, shares = deposit_amount
    pub fn calculate_shares_for_deposit(&self, deposit_amount: u64) -> Option<u64> {
        if self.total_pool_value == 0 || self.total_shares == 0 {
            // First deposit: 1:1 ratio
            Some(deposit_amount)
        } else {
            // Proportional shares: deposit * total_shares / total_value
            (deposit_amount as u128)
                .checked_mul(self.total_shares as u128)?
                .checked_div(self.total_pool_value as u128)?
                .try_into()
                .ok()
        }
    }

    /// Calculate the value of shares in USDC
    /// Formula: value = shares * total_pool_value / total_shares
    pub fn calculate_share_value(&self, shares: u64) -> Option<u64> {
        if self.total_shares == 0 {
            return Some(0);
        }
        (shares as u128)
            .checked_mul(self.total_pool_value as u128)?
            .checked_div(self.total_shares as u128)?
            .try_into()
            .ok()
    }

    /// Calculate shares to burn for a given withdrawal amount
    /// Formula: shares_to_burn = withdrawal_amount * total_shares / total_pool_value
    pub fn calculate_shares_for_withdrawal(&self, withdrawal_amount: u64) -> Option<u64> {
        if self.total_pool_value == 0 {
            return None;
        }
        (withdrawal_amount as u128)
            .checked_mul(self.total_shares as u128)?
            .checked_div(self.total_pool_value as u128)?
            .try_into()
            .ok()
    }
}
