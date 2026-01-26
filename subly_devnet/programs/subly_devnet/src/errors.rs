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
}
