# Structure of this project

This project is structured pretty similarly to how a regular Solana Anchor project is structured. The main difference lies in there being two places to write code here:

- The `programs` dir like usual Anchor programs
- The `encrypted-ixs` dir for confidential computing instructions

When working with plaintext data, we can edit it inside our program as normal. When working with confidential data though, state transitions take place off-chain using the Arcium network as a co-processor. For this, we then always need two instructions in our program: one that gets called to initialize a confidential computation, and one that gets called when the computation is done and supplies the resulting data. Additionally, since the types and operations in a Solana program and in a confidential computing environment are a bit different, we define the operations themselves in the `encrypted-ixs` dir using our Rust-based framework called Arcis. To link all of this together, we provide a few macros that take care of ensuring the correct accounts and data are passed for the specific initialization and callback functions:

```rust
// encrypted-ixs/add_together.rs

use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct InputValues {
        v1: u8,
        v2: u8,
    }

    #[instruction]
    pub fn add_together(input_ctxt: Enc<Shared, InputValues>) -> Enc<Shared, u16> {
        let input = input_ctxt.to_arcis();
        let sum = input.v1 as u16 + input.v2 as u16;
        input_ctxt.owner.from_arcis(sum)
    }
}

// programs/my_program/src/lib.rs

use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

declare_id!("<some ID>");

#[arcium_program]
pub mod my_program {
    use super::*;

    pub fn init_add_together_comp_def(ctx: Context<InitAddTogetherCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn add_together(
        ctx: Context<AddTogether>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        ciphertext_1: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8(ciphertext_0)
            .encrypted_u8(ciphertext_1)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![AddTogetherCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "add_together")]
    pub fn add_together_callback(
        ctx: Context<AddTogetherCallback>,
        output: SignedComputationOutputs<AddTogetherOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(&ctx.accounts.cluster_account, &ctx.accounts.computation_account) {
            Ok(AddTogetherOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(SumEvent {
            sum: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }
}

#[queue_computation_accounts("add_together", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AddTogether<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
}

#[callback_accounts("add_together")]
#[derive(Accounts)]
pub struct AddTogetherCallback<'info> {
    // ... required accounts
    pub some_extra_acc: AccountInfo<'info>,
}

#[init_computation_definition_accounts("add_together", payer)]
#[derive(Accounts)]
pub struct InitAddTogetherCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
}
```

```
yukikimura@YukinoMacBook-Pro subly_devnet % arcium deploy --cluster-offset 123 --recovery-set-size 4 --keypair-path ~/.config/solana/id.json --rpc-url "https://devnet.helius-rpc.com/?api-key=8725da20-c68a-48f9-bac4-bed8f6e9fa0a"
Deploying and initializing MXE...
Deploying cluster: https://devnet.helius-rpc.com/?api-key=8725da20-c68a-48f9-bac4-bed8f6e9fa0a
Upgrade authority: /Users/yukikimura/.config/solana/id.json
Deploying program "subly_devnet"...
Program path: /Users/yukikimura/work/solana-privacy/subly-devnet/subly_devnet/target/deploy/subly_devnet.so...
Program Id: 2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA

Signature: 3GGMEDehtMjCtGFD4Vd8w7BY6Bkv27AXa7GDJRJ7dFBeLTStK6tMeWnJB5n1D3ZagQsCuq4Qf4mmuDagycfEd8ch

Waiting for program 2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA to be confirmed...
Program confirmed on-chain
Idl data length: 7109 bytes
Step 0/7109
Step 600/7109
Step 1200/7109
Step 1800/7109
Step 2400/7109
Step 3000/7109
Step 3600/7109
Step 4200/7109
Step 4800/7109
Step 5400/7109
Step 6000/7109
Step 6600/7109
Idl account ATeW527XKpzBJLucBy8qrYjHCqEFCjC6PpBufybCCPqm successfully upgraded
Deploy success

thread 'main' panicked at /Users/runner/work/arcium-tooling/arcium-tooling/client/src/transactions.rs:573:10:
called `Result::unwrap()` on an `Err` value: SolanaClientError(Error { request: Some(SendTransaction), kind: RpcError(RpcResponseError { code: -32002, message: "Transaction simulation failed: Error processing Instruction 1: custom program error: 0xbc4", data: SendTransactionPreflightFailure(RpcSimulateTransactionResult { err: Some(InstructionError(1, Custom(3012))), logs: Some(["Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ invoke [1]", "Program log: Instruction: InitMxePart1", "Program 11111111111111111111111111111111 invoke [2]", "Program 11111111111111111111111111111111 success", "Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ consumed 6605 of 400000 compute units", "Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ success", "Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ invoke [1]", "Program log: Instruction: InitMxePart2", "Program log: AnchorError caused by account: clock. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized.", "Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ consumed 13053 of 393395 compute units", "Program Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ failed: custom program error: 0xbc4"]), accounts: None, units_consumed: Some(19658), loaded_accounts_data_size: Some(2408318), return_data: None, inner_instructions: None, replacement_blockhash: None }) }) })
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```
