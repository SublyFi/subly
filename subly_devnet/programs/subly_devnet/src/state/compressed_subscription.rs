use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};
use light_sdk::LightDiscriminator;

/// CompressedSubscription - ZK compressed subscription stored in Light Protocol Merkle tree
/// This is the compressed version of Subscription that provides privacy through ZK proofs
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, LightDiscriminator)]
pub struct CompressedSubscription {
    /// Owner of this compressed subscription (the subscriber)
    pub owner: Pubkey,
    /// Reference to plan account
    pub plan: Pubkey,
    /// Membership commitment for ZK proofs
    /// This allows proving membership without revealing subscriber identity
    pub membership_commitment: [u8; 32],
    /// Encrypted user commitment (Arcium MXE encrypted)
    pub encrypted_user_commitment: [u8; 32],
    /// Encrypted subscription status (Arcium MXE encrypted)
    /// Contains: is_active (u8), subscribed_at (i64), cancelled_at (i64)
    pub encrypted_status: [u8; 64],
    /// Nonce for status encryption
    pub status_nonce: [u8; 16],
    /// Subscription creation timestamp
    pub created_at: i64,
    /// Whether this subscription is active (for quick filtering)
    pub is_active: bool,
}

impl Default for CompressedSubscription {
    fn default() -> Self {
        Self {
            owner: Pubkey::default(),
            plan: Pubkey::default(),
            membership_commitment: [0u8; 32],
            encrypted_user_commitment: [0u8; 32],
            encrypted_status: [0u8; 64],
            status_nonce: [0u8; 16],
            created_at: 0,
            is_active: false,
        }
    }
}

impl CompressedSubscription {
    /// Calculate the hash of this subscription for Merkle tree inclusion
    /// Uses a simple concatenation and hash for leaf identification
    pub fn compute_leaf_hash(&self) -> [u8; 32] {
        use light_hasher::{Hasher, Poseidon};

        let mut data = Vec::with_capacity(200);
        data.extend_from_slice(self.owner.as_ref());
        data.extend_from_slice(self.plan.as_ref());
        data.extend_from_slice(&self.membership_commitment);
        data.extend_from_slice(&self.encrypted_user_commitment);
        data.extend_from_slice(&self.encrypted_status);
        data.extend_from_slice(&self.status_nonce);
        data.extend_from_slice(&self.created_at.to_le_bytes());
        data.push(self.is_active as u8);

        // Use Poseidon hash for compatibility with Light Protocol
        Poseidon::hashv(&[&data]).unwrap_or([0u8; 32])
    }
}

/// MembershipProofData - Data structure for off-chain membership proof
/// This is used by the SDK to generate and verify membership proofs
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct MembershipProofData {
    /// The plan this membership proves subscription to
    pub plan_id: Pubkey,
    /// Membership commitment (hash that proves membership)
    pub membership_commitment: [u8; 32],
    /// Validity proof (from Light Protocol RPC)
    pub validity_proof: [u8; 128],
    /// Root index for proof verification
    pub root_index: u16,
    /// Leaf index in the state tree
    pub leaf_index: u32,
    /// Timestamp when proof was generated
    pub proof_timestamp: i64,
    /// Proof expiry timestamp
    pub valid_until: i64,
    /// Signature to prevent replay attacks
    pub signature: [u8; 64],
    /// Nonce for replay protection
    pub nonce: [u8; 32],
}

impl MembershipProofData {
    /// Check if this proof has expired
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp > self.valid_until
    }
}

/// CompressedSubscriptionTracker - PDA account to track compressed subscription metadata
/// This provides a way to link regular accounts to compressed subscriptions
#[account]
pub struct CompressedSubscriptionTracker {
    /// The plan this tracker is for
    pub plan: Pubkey,
    /// Total number of compressed subscriptions for this plan
    pub total_compressed_subscriptions: u64,
    /// Merkle tree pubkey where subscriptions are stored
    pub merkle_tree: Pubkey,
    /// Last leaf index used
    pub last_leaf_index: u32,
    /// PDA bump
    pub bump: u8,
}

impl CompressedSubscriptionTracker {
    pub const SPACE: usize = 8    // discriminator
        + 32                       // plan: Pubkey
        + 8                        // total_compressed_subscriptions: u64
        + 32                       // merkle_tree: Pubkey
        + 4                        // last_leaf_index: u32
        + 1;                       // bump: u8
    // Total: 85 bytes
}
