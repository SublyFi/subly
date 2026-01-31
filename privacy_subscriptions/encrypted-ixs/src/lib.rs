use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    // ========================================================================
    // Input Structures
    // ========================================================================

    /// Deposit circuit input
    pub struct DepositInput {
        pub current_balance: u64,
        pub deposit_amount: u64,
    }

    /// Withdraw circuit input
    pub struct WithdrawInput {
        pub current_balance: u64,
        pub withdraw_amount: u64,
    }

    /// Subscribe circuit input
    pub struct SubscribeInput {
        pub user_balance: u64,
        pub merchant_balance: u64,
        pub subscription_count: u64,
        pub plan_pubkey: [u8; 32],
        pub price: u64,
        pub current_timestamp: i64,
        pub billing_cycle_days: u32,
    }

    /// Unsubscribe circuit input
    pub struct UnsubscribeInput {
        pub current_status: u8,
    }

    /// ProcessPayment circuit input
    pub struct ProcessPaymentInput {
        pub user_balance: u64,
        pub merchant_balance: u64,
        pub subscription_status: u8,
        pub next_payment_date: i64,
        pub current_timestamp: i64,
        pub plan_price: u64,
        pub billing_cycle_days: u32,
    }

    /// VerifySubscription circuit input
    pub struct VerifySubscriptionInput {
        pub subscription_status: u8,
        pub next_payment_date: i64,
        pub current_timestamp: i64,
    }

    /// ClaimRevenue circuit input
    pub struct ClaimRevenueInput {
        pub current_balance: u64,
        pub claim_amount: u64,
    }

    // ========================================================================
    // Output Structures
    // ========================================================================

    /// Withdraw circuit output
    pub struct WithdrawOutput {
        pub new_balance: u64,
        pub actual_amount: u64,
        pub success: bool,
    }

    /// Subscribe circuit output
    pub struct SubscribeOutput {
        pub new_user_balance: u64,
        pub new_merchant_balance: u64,
        pub new_subscription_count: u64,
        pub encrypted_plan: [u8; 32],
        pub encrypted_status: u8,
        pub encrypted_next_payment_date: i64,
        pub encrypted_start_date: i64,
        pub success: bool,
    }

    /// ProcessPayment circuit output
    pub struct ProcessPaymentOutput {
        pub new_user_balance: u64,
        pub new_merchant_balance: u64,
        pub new_status: u8,
        pub new_next_payment_date: i64,
        pub payment_processed: bool,
    }

    /// ClaimRevenue circuit output
    pub struct ClaimRevenueOutput {
        pub new_balance: u64,
        pub actual_amount: u64,
        pub success: bool,
    }

    // ========================================================================
    // Circuit Implementations
    // ========================================================================

    /// Deposit circuit: Add funds to user's encrypted balance
    /// Input: current_balance (encrypted), deposit_amount (encrypted)
    /// Output: new_balance (encrypted)
    #[instruction]
    pub fn deposit(input: Enc<Shared, DepositInput>) -> Enc<Shared, u64> {
        let inp = input.to_arcis();
        let new_balance = inp.current_balance + inp.deposit_amount;
        input.owner.from_arcis(new_balance)
    }

    /// Withdraw circuit: Subtract funds from user's encrypted balance
    /// Input: current_balance (encrypted), withdraw_amount (encrypted)
    /// Output: WithdrawOutput with new_balance, actual_amount, and success flag
    #[instruction]
    pub fn withdraw(input: Enc<Shared, WithdrawInput>) -> Enc<Shared, WithdrawOutput> {
        let inp = input.to_arcis();

        // Check if user has sufficient balance
        let has_balance = inp.current_balance >= inp.withdraw_amount;

        // Conditional subtraction: only subtract if has_balance is true
        let new_balance = if has_balance {
            inp.current_balance - inp.withdraw_amount
        } else {
            inp.current_balance
        };

        // Actual withdraw amount: if success, use withdraw_amount, else 0
        let actual_amount = if has_balance {
            inp.withdraw_amount
        } else {
            0u64
        };

        let output = WithdrawOutput {
            new_balance,
            actual_amount,
            success: has_balance,
        };

        input.owner.from_arcis(output)
    }

    /// Subscribe circuit: Create subscription and process initial payment
    /// Input: Various encrypted values for user balance, merchant balance, plan info
    /// Output: Updated balances, subscription state
    #[instruction]
    pub fn subscribe(input: Enc<Shared, SubscribeInput>) -> Enc<Shared, SubscribeOutput> {
        let inp = input.to_arcis();

        // Check if user has sufficient balance for initial payment
        let has_balance = inp.user_balance >= inp.price;

        // Calculate new balances (only if has_balance)
        let new_user_bal = if has_balance {
            inp.user_balance - inp.price
        } else {
            inp.user_balance
        };

        let new_merchant_bal = if has_balance {
            inp.merchant_balance + inp.price
        } else {
            inp.merchant_balance
        };

        // Increment subscription count only if successful
        let new_count = if has_balance {
            inp.subscription_count + 1
        } else {
            inp.subscription_count
        };

        // Calculate next payment date: current_timestamp + (billing_cycle_days * 86400 seconds)
        let seconds_per_day: i64 = 86400;
        let cycle_seconds = (inp.billing_cycle_days as i64) * seconds_per_day;
        let next_payment = inp.current_timestamp + cycle_seconds;

        // Status: 0 = Active, 1 = Cancelled, 2 = Expired
        let status: u8 = if has_balance { 0 } else { 1 };

        let output = SubscribeOutput {
            new_user_balance: new_user_bal,
            new_merchant_balance: new_merchant_bal,
            new_subscription_count: new_count,
            encrypted_plan: inp.plan_pubkey,
            encrypted_status: status,
            encrypted_next_payment_date: if has_balance { next_payment } else { 0 },
            encrypted_start_date: if has_balance { inp.current_timestamp } else { 0 },
            success: has_balance,
        };

        input.owner.from_arcis(output)
    }

    /// Unsubscribe circuit: Cancel subscription
    /// Input: current_status (encrypted)
    /// Output: new_status (encrypted) - always set to Cancelled (1)
    #[instruction]
    pub fn unsubscribe(input: Enc<Shared, UnsubscribeInput>) -> Enc<Shared, u8> {
        // Status 1 = Cancelled
        let cancelled_status: u8 = 1;
        input.owner.from_arcis(cancelled_status)
    }

    /// ProcessPayment circuit: Process recurring subscription payment
    /// Input: User/merchant balances, subscription state, timestamp info
    /// Output: Updated balances, subscription state
    #[instruction]
    pub fn process_payment(input: Enc<Shared, ProcessPaymentInput>) -> Enc<Shared, ProcessPaymentOutput> {
        let inp = input.to_arcis();

        // Check if subscription is Active (status == 0)
        let is_active = inp.subscription_status == 0;

        // Check if payment is due (next_payment_date <= current_timestamp)
        let is_due = inp.next_payment_date <= inp.current_timestamp;

        // Should we process this payment?
        let should_process = is_active && is_due;

        // Check if user has sufficient balance
        let has_balance = inp.user_balance >= inp.plan_price;

        // Can we actually process the payment?
        let can_pay = should_process && has_balance;

        // Calculate new balances
        let new_user_bal = if can_pay {
            inp.user_balance - inp.plan_price
        } else {
            inp.user_balance
        };

        let new_merchant_bal = if can_pay {
            inp.merchant_balance + inp.plan_price
        } else {
            inp.merchant_balance
        };

        // Update status: If should_process but !has_balance, cancel the subscription
        let new_status = if should_process && !has_balance {
            1u8 // Cancelled due to insufficient balance
        } else {
            inp.subscription_status
        };

        // Calculate next payment date
        let seconds_per_day: i64 = 86400;
        let cycle_seconds = (inp.billing_cycle_days as i64) * seconds_per_day;
        let new_next_date = if can_pay {
            inp.next_payment_date + cycle_seconds
        } else {
            inp.next_payment_date
        };

        let output = ProcessPaymentOutput {
            new_user_balance: new_user_bal,
            new_merchant_balance: new_merchant_bal,
            new_status,
            new_next_payment_date: new_next_date,
            payment_processed: can_pay,
        };

        input.owner.from_arcis(output)
    }

    /// VerifySubscription circuit: Check if subscription is valid
    /// Input: subscription_status (encrypted), next_payment_date (encrypted), current_timestamp
    /// Output: is_valid (bool, revealed)
    #[instruction]
    pub fn verify_subscription(input: Enc<Shared, VerifySubscriptionInput>) -> bool {
        let inp = input.to_arcis();

        // Subscription is valid if:
        // 1. Status is Active (0)
        // 2. Not past the grace period (next_payment_date + some buffer)
        let is_active = inp.subscription_status == 0;

        // Allow some grace period (e.g., 3 days = 259200 seconds)
        let grace_period: i64 = 259200;
        let grace_deadline = inp.next_payment_date + grace_period;
        let not_expired = inp.current_timestamp <= grace_deadline;

        let is_valid = is_active && not_expired;

        is_valid.reveal()
    }

    /// ClaimRevenue circuit: Merchant withdraws accumulated revenue
    /// Input: current_balance (encrypted), claim_amount (encrypted)
    /// Output: ClaimRevenueOutput with new_balance, actual_amount, and success flag
    #[instruction]
    pub fn claim_revenue(input: Enc<Shared, ClaimRevenueInput>) -> Enc<Shared, ClaimRevenueOutput> {
        let inp = input.to_arcis();

        // Check if merchant has sufficient balance
        let has_balance = inp.current_balance >= inp.claim_amount;

        // Conditional subtraction
        let new_balance = if has_balance {
            inp.current_balance - inp.claim_amount
        } else {
            inp.current_balance
        };

        // Actual claim amount
        let actual_amount = if has_balance {
            inp.claim_amount
        } else {
            0u64
        };

        let output = ClaimRevenueOutput {
            new_balance,
            actual_amount,
            success: has_balance,
        };

        input.owner.from_arcis(output)
    }
}
