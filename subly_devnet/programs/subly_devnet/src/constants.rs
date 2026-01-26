/// Maximum length for business/plan name (32 characters)
pub const MAX_NAME_LENGTH: usize = 32;

/// Maximum length for metadata URI (128 characters)
pub const MAX_METADATA_URI_LENGTH: usize = 128;

/// USDC decimals (6)
pub const USDC_DECIMALS: u8 = 6;

/// Minimum billing cycle in seconds (1 hour)
pub const MIN_BILLING_CYCLE_SECONDS: u32 = 3600;

/// Maximum billing cycle in seconds (365 days)
pub const MAX_BILLING_CYCLE_SECONDS: u32 = 31536000;

/// PDA Seeds
pub const BUSINESS_SEED: &[u8] = b"business";
pub const PLAN_SEED: &[u8] = b"plan";
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";
pub const MXE_SEED: &[u8] = b"mxe";

/// Sign PDA Seed for Arcium
pub const SIGN_PDA_SEED: &[u8] = b"sign_pda";
