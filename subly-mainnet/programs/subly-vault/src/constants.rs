use anchor_lang::prelude::*;

/// Shield Pool PDA seed
pub const SHIELD_POOL_SEED: &[u8] = b"shield_pool";

/// User Share PDA seed
pub const USER_SHARE_SEED: &[u8] = b"share";

/// Kamino Position PDA seed
pub const KAMINO_POSITION_SEED: &[u8] = b"kamino_position";

/// Scheduled Transfer PDA seed
pub const SCHEDULED_TRANSFER_SEED: &[u8] = b"transfer";

/// Transfer History PDA seed
pub const TRANSFER_HISTORY_SEED: &[u8] = b"history";

/// Deposit History PDA seed
pub const DEPOSIT_HISTORY_SEED: &[u8] = b"deposit_history";

/// Nullifier PDA seed
pub const NULLIFIER_SEED: &[u8] = b"nullifier";

/// Withdraw Request PDA seed
pub const WITHDRAW_REQUEST_SEED: &[u8] = b"withdraw";

/// Batch Proof Storage PDA seed
pub const BATCH_PROOF_SEED: &[u8] = b"batch_proof";

/// Note Commitment Registry PDA seed (Privacy Cash deposit proof)
pub const NOTE_COMMITMENT_REGISTRY_SEED: &[u8] = b"note_commitment_registry";

/// Pool Token Account PDA seed
pub const POOL_TOKEN_ACCOUNT_SEED: &[u8] = b"pool_token";

/// Pool cToken Account PDA seed (for Kamino)
pub const POOL_CTOKEN_ACCOUNT_SEED: &[u8] = b"pool_ctoken";

// ============================================
// External Protocol Addresses (Mainnet)
// ============================================

/// USDC mint on Mainnet (pubkey! macro)
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/// USDC mint on Mainnet (string for legacy compatibility)
pub const USDC_MINT_MAINNET: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/// Kamino Lending Program ID on Mainnet
pub const KAMINO_LENDING_PROGRAM_ID: Pubkey =
    pubkey!("KLend2g3cP87ber41VSz2cHu5M3mxzQS7pzLFz1UJwp");

/// Kamino Main Market address (for USDC lending)
pub const KAMINO_MAIN_MARKET: Pubkey = pubkey!("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");

/// Kamino USDC Reserve address (derived from main market)
/// This is the reserve account for USDC in the main market
pub const KAMINO_USDC_RESERVE: Pubkey = pubkey!("d4A2prbA2whSmMHHaHmRNKRpvqH8UgFfGzTqZGKfJxB");

/// Kamino cUSDC mint (collateral token for USDC deposits)
pub const KAMINO_CUSDC_MINT: Pubkey = pubkey!("BNBUwNTkDEYgYfFg8sVB6S9gqTfzfj2uYPBYfRAJYr7u");

/// USDC decimals
pub const USDC_DECIMALS: u8 = 6;

/// Minimum deposit amount (0.01 USDC)
pub const MIN_DEPOSIT_AMOUNT: u64 = 10_000; // 0.01 * 10^6

/// Maximum deposit amount (1,000,000 USDC)
pub const MAX_DEPOSIT_AMOUNT: u64 = 1_000_000_000_000; // 1,000,000 * 10^6

/// Minimum transfer interval (1 day in seconds)
pub const MIN_TRANSFER_INTERVAL: u32 = 86_400;

/// Maximum transfer interval (365 days in seconds)
pub const MAX_TRANSFER_INTERVAL: u32 = 31_536_000;

/// Pool value tolerance for batch proofs (basis points)
pub const POOL_VALUE_TOLERANCE_BPS: u16 = 100; // 1%

/// Maximum consecutive transfer skips before auto-cancel
pub const MAX_CONSECUTIVE_SKIPS: u8 = 3;
