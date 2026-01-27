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
