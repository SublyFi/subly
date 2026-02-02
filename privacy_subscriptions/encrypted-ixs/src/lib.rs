use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    // ========================================================================
    // Encrypted State Structures
    // ========================================================================

    /// User ledger state (encrypted)
    pub struct UserLedgerState {
        pub balance: u64,
        pub subscription_count: u64,
    }

    /// Merchant ledger state (encrypted)
    pub struct MerchantLedgerState {
        pub balance: u64,
        pub total_claimed: u64,
    }

    /// User subscription state (encrypted)
    pub struct UserSubscriptionState {
        /// Encrypted plan public key as two u128 values (32 bytes total)
        pub plan: [u128; 2],
        /// Subscription status (0=Active, 1=Cancelled, 2=Expired)
        pub status: u8,
        /// Next payment date (unix timestamp)
        pub next_payment_date: i64,
        /// Start date (unix timestamp)
        pub start_date: i64,
    }

    // ========================================================================
    // Circuit Implementations
    // ========================================================================

    /// Deposit circuit: Add funds to user's encrypted balance
    /// Input: user_ledger (encrypted), amount (encrypted), is_new (plaintext)
    /// Output: updated user_ledger (encrypted)
    #[instruction]
    pub fn deposit_v2(
        user_ledger: Enc<Shared, UserLedgerState>,
        amount: Enc<Shared, u64>,
        is_new: bool,
    ) -> Enc<Shared, UserLedgerState> {
        let mut ledger = user_ledger.to_arcis();
        let deposit_amount = amount.to_arcis();

        if is_new {
            ledger.balance = 0;
            ledger.subscription_count = 0;
        }

        let new_balance = ledger.balance + deposit_amount;
        let new_state = UserLedgerState {
            balance: new_balance,
            subscription_count: ledger.subscription_count,
        };

        user_ledger.owner.from_arcis(new_state)
    }

    /// Withdraw circuit: Subtract funds from user's encrypted balance
    /// Input: user_ledger (encrypted), amount (plaintext), is_new (plaintext)
    /// Output: updated user_ledger (encrypted) and actual_amount (revealed)
    #[instruction]
    pub fn withdraw_v2(
        user_ledger: Enc<Shared, UserLedgerState>,
        amount: u64,
        is_new: bool,
    ) -> (Enc<Shared, UserLedgerState>, u64) {
        let mut ledger = user_ledger.to_arcis();

        if is_new {
            ledger.balance = 0;
            ledger.subscription_count = 0;
        }

        // Check if user has sufficient balance
        let has_balance = ledger.balance >= amount;

        // Conditional subtraction: only subtract if has_balance is true
        let new_balance = if has_balance {
            ledger.balance - amount
        } else {
            ledger.balance
        };

        // Actual withdraw amount: if success, use amount, else 0
        let actual_amount = if has_balance { amount } else { 0u64 };

        let new_state = UserLedgerState {
            balance: new_balance,
            subscription_count: ledger.subscription_count,
        };

        (
            user_ledger.owner.from_arcis(new_state),
            actual_amount.reveal(),
        )
    }

    /// Subscribe circuit: Create subscription and process initial payment
    /// Input: user_ledger, merchant_ledger (encrypted), plan/price/cycle (encrypted), timestamps + plan metadata (plaintext)
    /// Output: Updated ledgers + subscription state (encrypted)
    #[instruction]
    pub fn subscribe_v2(
        user_ledger: Enc<Shared, UserLedgerState>,
        merchant_ledger: Enc<Shared, MerchantLedgerState>,
        plan: Enc<Shared, [u128; 2]>,
        price: Enc<Shared, u64>,
        billing_cycle_days: Enc<Shared, u32>,
        current_timestamp: i64,
        plan_pubkey: [u128; 2],
        plan_price: u64,
        plan_billing_cycle_days: u32,
        user_is_new: bool,
        merchant_is_new: bool,
    ) -> (
        Enc<Shared, UserLedgerState>,
        Enc<Shared, MerchantLedgerState>,
        Enc<Shared, UserSubscriptionState>,
    ) {
        let mut user = user_ledger.to_arcis();
        let mut merchant = merchant_ledger.to_arcis();
        let input_plan = plan.to_arcis();
        let input_price = price.to_arcis();
        let input_cycle = billing_cycle_days.to_arcis();

        if user_is_new {
            user.balance = 0;
            user.subscription_count = 0;
        }

        if merchant_is_new {
            merchant.balance = 0;
            merchant.total_claimed = 0;
        }

        // Validate encrypted inputs against the provided plan metadata
        let is_plan_match =
            (input_plan[0] == plan_pubkey[0]) & (input_plan[1] == plan_pubkey[1]);
        let is_price_match = input_price == plan_price;
        let is_cycle_match = input_cycle == plan_billing_cycle_days;
        let is_valid_plan = is_plan_match & is_price_match & is_cycle_match;

        // Check if user has sufficient balance for initial payment (use plaintext plan price)
        let has_balance = user.balance >= plan_price;

        // Calculate new balances (only if has_balance)
        let can_subscribe = is_valid_plan & has_balance;
        let new_user_bal = if can_subscribe {
            user.balance - plan_price
        } else {
            user.balance
        };

        let new_merchant_bal = if can_subscribe {
            merchant.balance + plan_price
        } else {
            merchant.balance
        };

        let new_subscription_count = if can_subscribe {
            user.subscription_count + 1
        } else {
            user.subscription_count
        };

        // Calculate next payment date: current_timestamp + (billing_cycle_days * 86400 seconds)
        let seconds_per_day: i64 = 86400;
        let cycle_seconds = (plan_billing_cycle_days as i64) * seconds_per_day;
        let next_payment = current_timestamp + cycle_seconds;

        // Status: 0 = Active, 1 = Cancelled
        let status: u8 = if can_subscribe { 0 } else { 1 };

        let user_state = UserLedgerState {
            balance: new_user_bal,
            subscription_count: new_subscription_count,
        };

        let merchant_state = MerchantLedgerState {
            balance: new_merchant_bal,
            total_claimed: merchant.total_claimed,
        };

        let subscription_state = UserSubscriptionState {
            plan: plan_pubkey,
            status,
            next_payment_date: if can_subscribe { next_payment } else { 0 },
            start_date: if can_subscribe { current_timestamp } else { 0 },
        };

        let subscription_owner = Shared::new(user_ledger.owner.public_key);

        (
            user_ledger.owner.from_arcis(user_state),
            merchant_ledger.owner.from_arcis(merchant_state),
            subscription_owner.from_arcis(subscription_state),
        )
    }

    /// Unsubscribe circuit: Cancel subscription
    /// Input: subscription (encrypted)
    /// Output: updated subscription (encrypted) - always set to Cancelled (1)
    #[instruction]
    pub fn unsubscribe_v2(
        subscription: Enc<Shared, UserSubscriptionState>,
    ) -> Enc<Shared, UserSubscriptionState> {
        let mut sub = subscription.to_arcis();
        sub.status = 1;
        sub.next_payment_date = 0;
        subscription.owner.from_arcis(sub)
    }

    /// ProcessPayment circuit: Process recurring subscription payment
    /// Input: ledgers + subscription (encrypted), timestamps + plan metadata (plaintext)
    /// Output: Updated ledgers + subscription (encrypted)
    #[instruction]
    pub fn process_payment_v2(
        user_ledger: Enc<Shared, UserLedgerState>,
        merchant_ledger: Enc<Shared, MerchantLedgerState>,
        subscription: Enc<Shared, UserSubscriptionState>,
        current_timestamp: i64,
        plan_price: u64,
        billing_cycle_days: u32,
        plan_pubkey: [u128; 2],
        user_is_new: bool,
        merchant_is_new: bool,
    ) -> (
        Enc<Shared, UserLedgerState>,
        Enc<Shared, MerchantLedgerState>,
        Enc<Shared, UserSubscriptionState>,
    ) {
        let mut user = user_ledger.to_arcis();
        let mut merchant = merchant_ledger.to_arcis();
        let mut sub = subscription.to_arcis();

        if user_is_new {
            user.balance = 0;
            user.subscription_count = 0;
        }

        if merchant_is_new {
            merchant.balance = 0;
            merchant.total_claimed = 0;
        }

        // Check if subscription is Active (status == 0)
        let is_active = sub.status == 0;

        // Check if payment is due (next_payment_date <= current_timestamp)
        let is_due = sub.next_payment_date <= current_timestamp;

        // Ensure the subscription plan matches the provided plan metadata
        let is_plan_match =
            (sub.plan[0] == plan_pubkey[0]) & (sub.plan[1] == plan_pubkey[1]);

        // Should we process this payment?
        let should_process = is_active && is_due && is_plan_match;

        // Check if user has sufficient balance
        let has_balance = user.balance >= plan_price;

        // Can we actually process the payment?
        let can_pay = should_process && has_balance;

        // Calculate new balances
        let new_user_bal = if can_pay {
            user.balance - plan_price
        } else {
            user.balance
        };

        let new_merchant_bal = if can_pay {
            merchant.balance + plan_price
        } else {
            merchant.balance
        };

        // Update status: If should_process but !has_balance, cancel the subscription
        if should_process && !has_balance {
            sub.status = 1u8; // Cancelled due to insufficient balance
        }

        // Calculate next payment date
        let seconds_per_day: i64 = 86400;
        let cycle_seconds = (billing_cycle_days as i64) * seconds_per_day;

        if can_pay {
            let base_date = if sub.next_payment_date == 0 {
                current_timestamp
            } else {
                sub.next_payment_date
            };
            sub.next_payment_date = base_date + cycle_seconds;
        }

        let user_state = UserLedgerState {
            balance: new_user_bal,
            subscription_count: user.subscription_count,
        };

        let merchant_state = MerchantLedgerState {
            balance: new_merchant_bal,
            total_claimed: merchant.total_claimed,
        };

        (
            user_ledger.owner.from_arcis(user_state),
            merchant_ledger.owner.from_arcis(merchant_state),
            subscription.owner.from_arcis(sub),
        )
    }

    /// VerifySubscription circuit: Check if subscription is valid
    /// Input: subscription_status (encrypted), next_payment_date (encrypted), current_timestamp
    /// Output: is_valid (bool, revealed)
    #[instruction]
    pub fn verify_subscription_v2(
        subscription: Enc<Shared, UserSubscriptionState>,
        current_timestamp: i64,
    ) -> bool {
        let sub = subscription.to_arcis();

        // Subscription is valid if:
        // 1. Status is Active (0)
        // 2. Not past the grace period (next_payment_date + some buffer)
        let is_active = sub.status == 0;

        // Allow some grace period (e.g., 3 days = 259200 seconds)
        let grace_period: i64 = 259200;
        let grace_deadline = sub.next_payment_date + grace_period;
        let not_expired = current_timestamp <= grace_deadline;

        let is_valid = is_active && not_expired;

        is_valid.reveal()
    }

    /// ClaimRevenue circuit: Merchant withdraws accumulated revenue
    /// Input: merchant_ledger (encrypted), amount (plaintext), is_new (plaintext)
    /// Output: updated merchant_ledger (encrypted) and actual_amount (revealed)
    #[instruction]
    pub fn claim_revenue_v2(
        merchant_ledger: Enc<Shared, MerchantLedgerState>,
        amount: u64,
        is_new: bool,
    ) -> (Enc<Shared, MerchantLedgerState>, u64) {
        let mut merchant = merchant_ledger.to_arcis();

        if is_new {
            merchant.balance = 0;
            merchant.total_claimed = 0;
        }

        // Check if merchant has sufficient balance
        let has_balance = merchant.balance >= amount;

        // Conditional subtraction
        let new_balance = if has_balance {
            merchant.balance - amount
        } else {
            merchant.balance
        };

        // Actual claim amount
        let actual_amount = if has_balance { amount } else { 0u64 };

        let new_state = MerchantLedgerState {
            balance: new_balance,
            total_claimed: if has_balance {
                merchant.total_claimed + amount
            } else {
                merchant.total_claimed
            },
        };

        (
            merchant_ledger.owner.from_arcis(new_state),
            actual_amount.reveal(),
        )
    }
}
