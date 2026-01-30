use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    /// Input for subscription count operations
    /// The count is stored as u64 and encrypted with MXE key
    pub struct CountInput {
        current_count: u64,
    }

    /// Subscription status structure
    /// Contains all privacy-sensitive subscription information
    pub struct SubscriptionStatus {
        /// 0 = inactive, 1 = active
        is_active: u8,
        /// Unix timestamp when subscription was created
        subscribed_at: i64,
        /// Unix timestamp when subscription was cancelled (0 if not cancelled)
        cancelled_at: i64,
    }

    /// Input for subscription cancellation
    pub struct CancelInput {
        /// Current status
        current_status: SubscriptionStatus,
        /// Cancellation timestamp
        cancel_timestamp: i64,
    }

    /// Increment the subscription count by 1
    /// Used when a user subscribes to a plan
    #[instruction]
    pub fn increment_count(input_ctxt: Enc<Mxe, CountInput>) -> Enc<Mxe, u64> {
        let input = input_ctxt.to_arcis();
        let new_count = input.current_count + 1;
        input_ctxt.owner.from_arcis(new_count)
    }

    /// Decrement the subscription count by 1
    /// Used when a user cancels their subscription
    /// Protects against underflow (count cannot go below 0)
    #[instruction]
    pub fn decrement_count(input_ctxt: Enc<Mxe, CountInput>) -> Enc<Mxe, u64> {
        let input = input_ctxt.to_arcis();
        // Protect against underflow
        let new_count = if input.current_count > 0 {
            input.current_count - 1
        } else {
            0
        };
        input_ctxt.owner.from_arcis(new_count)
    }

    /// Initialize count to zero (encrypted)
    /// Used when creating a new plan
    #[instruction]
    pub fn initialize_count(mxe_pk: Enc<Mxe, ()>) -> Enc<Mxe, u64> {
        mxe_pk.owner.from_arcis(0u64)
    }

    /// Set subscription status to active
    /// Used when a user subscribes to a plan
    /// Creates encrypted status with is_active=1, subscribed_at=timestamp, cancelled_at=0
    #[instruction]
    pub fn set_subscription_active(timestamp_ctxt: Enc<Mxe, i64>) -> Enc<Mxe, SubscriptionStatus> {
        let timestamp = timestamp_ctxt.to_arcis();
        let status = SubscriptionStatus {
            is_active: 1,
            subscribed_at: timestamp,
            cancelled_at: 0,
        };
        timestamp_ctxt.owner.from_arcis(status)
    }

    /// Set subscription status to cancelled
    /// Used when a user cancels their subscription
    /// Updates encrypted status with is_active=0 and cancelled_at=cancel_timestamp
    #[instruction]
    pub fn set_subscription_cancelled(
        input_ctxt: Enc<Mxe, CancelInput>,
    ) -> Enc<Mxe, SubscriptionStatus> {
        let input = input_ctxt.to_arcis();
        let status = SubscriptionStatus {
            is_active: 0,
            subscribed_at: input.current_status.subscribed_at,
            cancelled_at: input.cancel_timestamp,
        };
        input_ctxt.owner.from_arcis(status)
    }

    /// Initialize subscription status (inactive, no timestamps)
    /// Used for creating empty/placeholder status
    #[instruction]
    pub fn initialize_subscription_status(mxe_pk: Enc<Mxe, ()>) -> Enc<Mxe, SubscriptionStatus> {
        let status = SubscriptionStatus {
            is_active: 0,
            subscribed_at: 0,
            cancelled_at: 0,
        };
        mxe_pk.owner.from_arcis(status)
    }
}
