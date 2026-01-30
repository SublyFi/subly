use anchor_lang::prelude::*;

#[error_code]
pub enum SublyError {
    #[msg("Business account already exists")]
    BusinessAlreadyExists,

    #[msg("Plan not found")]
    PlanNotFound,

    #[msg("Plan is not active")]
    PlanNotActive,

    #[msg("Subscription already exists")]
    SubscriptionAlreadyExists,

    #[msg("Subscription is not active")]
    SubscriptionNotActive,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("MXE computation failed")]
    MxeComputationFailed,

    #[msg("Invalid computation output")]
    InvalidComputationOutput,

    #[msg("Cluster not set")]
    ClusterNotSet,

    #[msg("The computation was aborted")]
    AbortedComputation,

    #[msg("Invalid name length")]
    InvalidNameLength,

    #[msg("Invalid metadata URI length")]
    InvalidMetadataUriLength,

    #[msg("Invalid price")]
    InvalidPrice,

    #[msg("Invalid billing cycle")]
    InvalidBillingCycle,

    // Light Protocol ZK Compression errors
    #[msg("Invalid Merkle tree")]
    InvalidMerkleTree,

    #[msg("Invalid plan")]
    InvalidPlan,

    #[msg("Invalid membership commitment")]
    InvalidMembershipCommitment,

    #[msg("Proof has expired")]
    ProofExpired,

    #[msg("Invalid proof signature")]
    InvalidProofSignature,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Compressed subscription not found")]
    CompressedSubscriptionNotFound,

    #[msg("Invalid proof data")]
    InvalidProofData,

    #[msg("Invalid tree info data")]
    InvalidTreeInfo,

    #[msg("Invalid account meta data")]
    InvalidAccountMeta,

    #[msg("Invalid MXE account - cluster not set")]
    InvalidMxeAccount,
}
