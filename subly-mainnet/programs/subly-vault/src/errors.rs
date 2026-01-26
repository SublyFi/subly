use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    // Shield Pool errors
    #[msg("Shield pool is not initialized")]
    PoolNotInitialized,

    #[msg("Shield pool is already initialized")]
    PoolAlreadyInitialized,

    #[msg("Invalid pool authority")]
    InvalidPoolAuthority,

    // Commitment errors
    #[msg("Invalid commitment")]
    InvalidCommitment,

    #[msg("Commitment already exists")]
    CommitmentAlreadyExists,

    // Deposit errors
    #[msg("Deposit amount must be greater than zero")]
    InsufficientDeposit,

    #[msg("Deposit amount exceeds maximum allowed")]
    DepositExceedsMaximum,

    // Withdrawal errors
    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,

    #[msg("Withdrawal amount must be greater than zero")]
    InvalidWithdrawalAmount,

    // Nullifier errors
    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,

    #[msg("Invalid nullifier")]
    InvalidNullifier,

    // Share errors
    #[msg("Invalid share calculation")]
    InvalidShareCalculation,

    #[msg("Share amount overflow")]
    ShareOverflow,

    // Transfer errors
    #[msg("Transfer is not active")]
    TransferNotActive,

    #[msg("Invalid transfer interval")]
    InvalidInterval,

    #[msg("Transfer not yet due")]
    TransferNotDue,

    #[msg("Transfer already cancelled")]
    TransferAlreadyCancelled,

    // External protocol errors
    #[msg("Privacy Cash operation failed")]
    PrivacyCashError,

    #[msg("Kamino lending operation failed")]
    KaminoError,

    #[msg("Clockwork automation error")]
    ClockworkError,

    // ZK Proof errors
    #[msg("Invalid ZK proof")]
    InvalidProof,

    #[msg("Proof verification failed")]
    ProofVerificationFailed,

    // Encryption errors
    #[msg("Decryption failed")]
    DecryptionFailed,

    #[msg("Invalid encrypted data")]
    InvalidEncryptedData,

    // General errors
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid account")]
    InvalidAccount,

    #[msg("Unauthorized")]
    Unauthorized,
}
