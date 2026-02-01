# Structure of this project

This project is structured pretty similarly to how a regular Solana Anchor project is structured. The main difference lies in there being two places to write code here:

- The `programs` dir like usual Anchor programs
- The `encrypted-ixs` dir for confidential computing instructions

When working with plaintext data, we can edit it inside our program as normal. When working with confidential data though, state transitions take place off-chain using the Arcium network as a co-processor. For this, we then always need two instructions in our program: one that gets called to initialize a confidential computation, and one that gets called when the computation is done and supplies the resulting data. Additionally, since the types and operations in a Solana program and in a confidential computing environment are a bit different, we define the operations themselves in the `encrypted-ixs` dir using our Rust-based framework called Arcis. To link all of this together, we provide a few macros that take care of ensuring the correct accounts and data are passed for the specific initialization and callback functions:

```rust
// encrypted-ixs/add_together.rs

use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

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
Program Id: 8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2

Signature: 4ykqe7Pip1uEZHSzDxgkJoY7inLYR5csu2F6Z3r8TiurAVTcTCnmEQfubfCvPor3uecezHRffTEwqSdj4qXTkRPR

Waiting for program 8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2 to be confirmed...
Program confirmed on-chain
Idl data length: 5408 bytes
Step 0/5408
Step 600/5408
Step 1200/5408
Step 1800/5408
Step 2400/5408
Step 3000/5408
Step 3600/5408
Step 4200/5408
Step 4800/5408
Step 5400/5408
Idl account created: D5SUdre419GjKDp7zDNRr7PcRUxVkeaC4D2fr3eWjKXt
Deploy success
MXE initialized: F8QanhaRiHeAFhEojGc8sQvuJeKu7vWFT92JYxd7TU84JRARoakms9JaCrZPNeEs5PyBJp7CDk8HGSaxb14ZcDq
✅ MXE deployed and initialized successfully
```

```
yukikimura@YukinoMacBook-Pro privacy_subscriptions % anchor run initialize
yarn run v1.22.22
$ /Users/yukikimura/work/solana-privacy/sublyfi/subly/privacy_subscriptions/node_modules/.bin/ts-node scripts/initialize.ts
╔════════════════════════════════════════════════════════════╗
║       Privacy Subscriptions - Initialization Script        ║
╚════════════════════════════════════════════════════════════╝

--- Configuration ---
Program ID: 8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2
Cluster: https://api.devnet.solana.com
USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
Fee Rate: 100 bps (1%)
Authority: nHSjCbSd3XD3UwGy5uAAUqEfDf4kBDYaJZ4eF82nCDZ
Balance: 7.476995162 SOL

=== Initializing Computation Definitions ===

[SKIP] deposit CompDef already initialized
[SKIP] withdraw CompDef already initialized
[SKIP] subscribe CompDef already initialized
[SKIP] unsubscribe CompDef already initialized
[INIT] Initializing process_payment CompDef...
       PDA: GA41HHA6Jm1Aupe8i8mmpGbxkzx7hh2LC3LTf6FP64Ks
       Tx: 4qcZzjPFANuFS1777PVbwpf9LUZbMFNdo8juR5vgF7urDVAqw8scv4UT23grqpDyoCd8ckzvPKYjUxaRYDJ8czgd
[DONE] process_payment CompDef initialized (offchain circuit source)

[INIT] Initializing verify_subscription CompDef...
       PDA: HjNXwUr5915ETKZf5Vvb6KV84tKL4oxzmenCK7WPJjqi
       Tx: 3ZNEv7zbKxdRZAJMNABQb3fXZqQUtt4oX42WVCznePAgz9LqFZXzwu4acaZadgfypRqQyaqJ2UdF2eQrgZzXerdm
[DONE] verify_subscription CompDef initialized (offchain circuit source)

[INIT] Initializing claim_revenue CompDef...
       PDA: 8z2nQVne833Z3vX9fD3YYr4hxhoqFscJ9bJmT3eFE4yZ
       [RETRY] claim_revenue attempt 1/3 failed, retrying in 3000ms...
       [RETRY] claim_revenue attempt 2/3 failed, retrying in 3000ms...
       Tx: 4pNbKzt8aymvoBzTy19ppqJQwB8SbSssVsvoAAS7tvoNqTKCAokqtFPwn47vBUXGvivEtkgd4vjYdHyCLexDJJvP
[DONE] claim_revenue CompDef initialized (offchain circuit source)


=== Initializing Protocol ===

[INIT] Initializing protocol with fee rate: 100 bps
       Authority: nHSjCbSd3XD3UwGy5uAAUqEfDf4kBDYaJZ4eF82nCDZ
       Config PDA: 3zsurq61stSM9ykdATC4J9MkPGX8oUAhb3x6rpBXHZkS
       Tx: VsypLyxh8no6DfSXswm9dKzmm7E7GLcDjfcKpYoKSmM1tZebfQcv3v1LsejL9xyuXS2xKFm2aCikt6hK8fSxdry
[DONE] Protocol initialized


=== Initializing Token Pool ===

[INIT] Initializing pool for mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
       Pool PDA: 8VvS2FarQWTX57DXihyJGVfk3D6df8odsmYkndYB5hDs
       Pool Token Account: HRaAUbo7LPor1oQY5H1V7r3TrvFxSFhNaELpLpzwfntK
       Tx: 5szAwoW5i27NXwLA5eYi5evgNMQGmTWAL3rNb1Wskg7vRshAd85nVAYtMUbfuSjf7StRf5ioKXuva8H5QuY6cwpZ
[DONE] Pool initialized

       Pool token account keypair saved to: ./pool-token-account-4zMMC9sr.json

╔════════════════════════════════════════════════════════════╗
║              Initialization Complete!                      ║
╚════════════════════════════════════════════════════════════╝

✨  Done in 17.38s.
yukikimura@YukinoMacBook-Pro privacy_subscriptions %
```

```
Program Id: 8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2

Signature: uPnrxGEbG4RTSgFmThcMMkKiWMKRsBkezicwTH3sMyF8aCNJ2ZabXZTcQX3wXrxxViEx2Cm9PBvHzEcoTmJWS9a

Waiting for program 8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2 to be confirmed...
Program confirmed on-chain
Idl data length: 5408 bytes
Step 0/5408
Step 600/5408
Step 1200/5408
Step 1800/5408
Step 2400/5408
Step 3000/5408
Step 3600/5408
Step 4200/5408
Step 4800/5408
Step 5400/5408
Idl account 2iG1TvwNV12PhTuPnV9rQNBJE9iHUepjCMyEgKKM2VGG successfully upgraded
Deploy success
MXE initialized: 4ngbG3nDYcrqG1S6y7FGUedLcV1VdcbzTPsX8LcmkwvjQGtahzDKGt6DZdeLPmatQd12ZQxzMQZozCY7mL3aDQNN
✅ MXE deployed and initialized successfully
```

```
yukikimura@YukinoMacBook-Pro privacy_subscriptions % anchor run initialize
yarn run v1.22.22
$ /Users/yukikimura/work/solana-privacy/sublyfi/subly/privacy_subscriptions/node_modules/.bin/ts-node scripts/initialize.ts
╔════════════════════════════════════════════════════════════╗
║       Privacy Subscriptions - Initialization Script        ║
╚════════════════════════════════════════════════════════════╝

--- Configuration ---
Program ID: 8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2
Cluster: https://devnet.helius-rpc.com/?api-key=8725da20-c68a-48f9-bac4-bed8f6e9fa0a
USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
Fee Rate: 0 bps (0%)
Authority: nHSjCbSd3XD3UwGy5uAAUqEfDf4kBDYaJZ4eF82nCDZ
Balance: 10.225194211 SOL

=== Initializing Computation Definitions ===

[INIT] Initializing deposit CompDef...
       PDA: 6Rrn2BjJg6oX2Huon7rj9ZpKBHnUun9RAZ7BPrcbgnvp
       Tx: 25pQXdAhBpqz4MTnX2JwaVXPfadNnd4tPZAayZHKVJBTVhQQ3oGnMmwyrVwEcxC4CPGRsy4jDr9dRjhAUDVJkXzP
[DONE] deposit CompDef initialized (offchain circuit source)

[INIT] Initializing withdraw CompDef...
       PDA: byWh9DnYxkUpgS5iYur2Dit7J4zkb1GwCGnwaczNHvU
       Tx: 4afwe9XYMxKvxSkGyk3ZwUW7oSsoivARLejujaNveJrK3RFdqPRxt7GE6KgWiGKEwjfMVFJoUE4zkuuZzZe5knKB
[DONE] withdraw CompDef initialized (offchain circuit source)

[INIT] Initializing subscribe CompDef...
       PDA: F2h8u49d8fa2STcvDcrTADYiNCnfLhF6tU2g1gWNDiK4
       Tx: 5PhU8wdjxNFYqNexQLoqL99UgSktbEESDrcka5DYj8pmpXoGEvKQ224LkWzQEzJfZYb6BHteRSN8Xf1RB2PLnBLZ
[DONE] subscribe CompDef initialized (offchain circuit source)

[INIT] Initializing unsubscribe CompDef...
       PDA: 2CLwTRoChrvcWnWsAfgjLcMLeFgsydoPoaTTTMPveuCW
       Tx: 3A9QbVwWTY1YyMCEMDVFBZitFEgmne17mH6YjHtc5GgKHo5TpxqTdEdBVbkkVsi9Y2PMNBz2j39K5kUCKTqSxatu
[DONE] unsubscribe CompDef initialized (offchain circuit source)

[INIT] Initializing process_payment CompDef...
       PDA: 6KbjPqqRDWhLFHB3sXv29QMxjnAiigY8qgZKmwJFUXYK
       Tx: 3Z83vsYWoDZTfvefspSCD5ouLHvpwx84cosrSod5iCvvYjbfTFD6TtyachQM7sCLtECicnSAEfJBXSZntBgnpc7y
[DONE] process_payment CompDef initialized (offchain circuit source)

[INIT] Initializing verify_subscription CompDef...
       PDA: 4htJEY2EXCMAWRLcvkLGbZo9rL6ADzgR3QNDYgZYtrmZ
       Tx: 258ZGsUV6H1TZHqEqWzzuEa8rej7JBk9RjdBtGby4cACiCuqWvfk1cAmzxYFT7RFgsiMG3BrhxT6ZKTYZPwKUkVF
[DONE] verify_subscription CompDef initialized (offchain circuit source)

[INIT] Initializing claim_revenue CompDef...
       PDA: DjxwochUCAFCWRVTaZKXto55CY4JoypEPtdriQYEbY2V
       Tx: 3X6REti5yYRrJR8D8HVU2H9FSvmVyCXZtR38FFbWXPmGkkr1u4iuwzdpR3sKxyydRpZexyssUg5oxGTKmT4v2xG8
[DONE] claim_revenue CompDef initialized (offchain circuit source)


=== Initializing Protocol ===

[INIT] Initializing protocol with fee rate: 0 bps
       Authority: nHSjCbSd3XD3UwGy5uAAUqEfDf4kBDYaJZ4eF82nCDZ
       Config PDA: DM2Sww87KMVNXFvvGbExucevAWpbSFgn8eFWGsaDohcF
       Tx: 2SUsgm1SygTHpGgUqz5mrUpUp4bjuhxiTRwPRcfMuysEmb5FuM73K9V8x2ZzXAPiUyQeakPJ1PFf4ChgcTkkq348
[DONE] Protocol initialized


=== Initializing Token Pool ===

[INIT] Initializing pool for mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
       Pool PDA: 8NFiNVidws7n9uyZgUqXoNBaL5yRZGpJtoE4AwuJH2do
       Pool Token Account: 4qeJuTFhkKHQyy5eqWc54qNaJCJKfKNDgqqJGdutVbBw
       Tx: QMYQhKaDiZUCQRqFHXvffPybEcdTyP1UCNBYLVKRhcRwrjAWPNFzHdBfepp61LFKsgjLoTBxjX3rC6B9focwRDK
[DONE] Pool initialized

       Pool token account keypair saved to: ./pool-token-account-4zMMC9sr.json

╔════════════════════════════════════════════════════════════╗
║              Initialization Complete!                      ║
╚════════════════════════════════════════════════════════════╝

✨  Done in 30.96s.
```
