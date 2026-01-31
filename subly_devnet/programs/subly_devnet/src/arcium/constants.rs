//! Arcium CPI Constants
//!
//! Constants for Arcium MXE integration.

use arcium_anchor::comp_def_offset;

/// Computation Definition Offsets
///
/// These are computed using `arcium_anchor::comp_def_offset()` which calculates
/// sha256(<instruction_name>).slice(0,4) as little-endian u32.
pub mod comp_def_offsets {
    use super::*;

    /// increment_count computation definition offset
    pub const INCREMENT_COUNT: u32 = comp_def_offset("increment_count");

    /// decrement_count computation definition offset
    pub const DECREMENT_COUNT: u32 = comp_def_offset("decrement_count");

    /// initialize_count computation definition offset
    pub const INITIALIZE_COUNT: u32 = comp_def_offset("initialize_count");

    /// set_subscription_active computation definition offset
    pub const SET_SUBSCRIPTION_ACTIVE: u32 = comp_def_offset("set_subscription_active");

    /// set_subscription_cancelled computation definition offset
    pub const SET_SUBSCRIPTION_CANCELLED: u32 = comp_def_offset("set_subscription_cancelled");

    /// initialize_subscription_status computation definition offset
    pub const INITIALIZE_SUBSCRIPTION_STATUS: u32 = comp_def_offset("initialize_subscription_status");
}

/// Default CU price in micro-lamports for computations
pub const DEFAULT_CU_PRICE_MICRO: u64 = 0;

/// Default number of callback transactions
pub const DEFAULT_NUM_CALLBACK_TXS: u8 = 1;
