use anchor_lang::prelude::*;

declare_id!("BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL");

#[program]
pub mod subly_mainnet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
