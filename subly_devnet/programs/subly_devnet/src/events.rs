use anchor_lang::prelude::*;

#[event]
pub struct BusinessRegisteredEvent {
    pub business: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct PlanCreatedEvent {
    pub plan: Pubkey,
    pub business: Pubkey,
    pub price_usdc: u64,
    pub billing_cycle_seconds: u32,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCreatedEvent {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub membership_commitment: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCountUpdatedEvent {
    pub plan: Pubkey,
    pub encrypted_count: [u8; 32],
    pub nonce: [u8; 16],
    pub timestamp: i64,
}

#[event]
pub struct MxeInitializedEvent {
    pub mxe_account: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ComputationQueuedEvent {
    pub plan: Pubkey,
    pub operation: String,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionStatusEncryptedEvent {
    pub subscription: Pubkey,
    pub encrypted_status: [u8; 64],
    pub status_nonce: [u8; 16],
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCancelledEvent {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub timestamp: i64,
}

// ============================================
// Light Protocol ZK Compression Events
// ============================================

#[event]
pub struct ZkSubscriptionCreatedEvent {
    /// The plan this subscription belongs to
    pub plan: Pubkey,
    /// Membership commitment for ZK proofs
    pub membership_commitment: [u8; 32],
    /// Address of the compressed subscription in Light Protocol
    pub compressed_address: [u8; 32],
    /// Leaf index in the state tree
    pub leaf_index: u32,
    /// Creation timestamp
    pub timestamp: i64,
}

#[event]
pub struct MembershipVerifiedEvent {
    /// The plan membership was verified for
    pub plan: Pubkey,
    /// Membership commitment that was verified
    pub membership_commitment: [u8; 32],
    /// Verification timestamp
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionMigratedToZkEvent {
    /// Original subscription account (PDA)
    pub original_subscription: Pubkey,
    /// The plan this subscription belongs to
    pub plan: Pubkey,
    /// Membership commitment for ZK proofs
    pub membership_commitment: [u8; 32],
    /// Address of the new compressed subscription
    pub compressed_address: [u8; 32],
    /// Migration timestamp
    pub timestamp: i64,
}

#[event]
pub struct ZkSubscriptionCancelledEvent {
    /// The plan this subscription belonged to
    pub plan: Pubkey,
    /// Membership commitment
    pub membership_commitment: [u8; 32],
    /// Cancellation timestamp
    pub timestamp: i64,
}
