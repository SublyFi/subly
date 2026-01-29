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

/// USDC mint on Mainnet
pub const USDC_MINT_MAINNET: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

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
