use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    /// Input for subscription count operations
    /// The count is stored as u64 and encrypted with MXE key
    pub struct CountInput {
        current_count: u64,
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
}
