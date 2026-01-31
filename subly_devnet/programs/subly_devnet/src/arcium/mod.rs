//! Arcium CPI Module
//!
//! This module provides the integration with Arcium MXE for confidential computations.
//!
//! # Architecture
//!
//! Instead of manually constructing CPI calls, we use Arcium's macros:
//! - `#[queue_computation_accounts("instruction_name", payer)]` - Adds required accounts
//! - `queue_computation()` - The CPI function
//! - `#[arcium_callback(encrypted_ix = "instruction_name")]` - For callback functions
//! - `#[callback_accounts("instruction_name", payer)]` - For callback account structures
//!
//! # Re-exports
//!
//! This module re-exports commonly used Arcium types and macros from `arcium_anchor::prelude`.

pub mod constants;

pub use constants::*;

// Re-export Arcium prelude for convenient access
pub use arcium_anchor::prelude::*;

// Re-export PDA derivation macros
pub use arcium_anchor::{
    derive_cluster_pda, derive_comp_def_pda, derive_comp_pda, derive_execpool_pda,
    derive_mempool_pda, derive_mxe_pda, derive_sign_pda,
};

// Re-export the queue_computation function
pub use arcium_anchor::queue_computation;

// Re-export the init_comp_def function
pub use arcium_anchor::init_comp_def;

// Re-export callback-related types
pub use arcium_anchor::{SignedComputationOutputs, HasSize, ArciumError};

// Re-export types from arcium_client for CallbackInstruction
pub use arcium_client::idl::arcium::types::CallbackInstruction;
