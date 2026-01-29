/**
 * Program IDL type definition
 * This file is manually maintained until anchor build works with edition2024
 */
import { Idl } from "@coral-xyz/anchor";

// Define the SublyVault IDL type
// In production, use the generated types from anchor build
export type SublyVault = Idl;

// Program address
export const PROGRAM_ADDRESS = "BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL";

/**
 * Load the IDL from JSON
 * This is a manually maintained IDL that reflects the current on-chain program structure
 */
export function getIdl(): SublyVault {
  return {
    address: PROGRAM_ADDRESS,
    metadata: {
      name: "subly_vault",
      version: "0.1.0",
      spec: "0.1.0",
      description: "Subly Vault - Privacy-first subscription payment protocol for Solana Mainnet with Kamino yield integration",
    },
    instructions: [
      {
        name: "initialize",
        discriminator: [],
        accounts: [
          { name: "authority", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "poolTokenAccount", writable: true },
          { name: "poolCtokenAccount", writable: true },
          { name: "usdcMint" },
          { name: "ctokenMint" },
          { name: "tokenProgram" },
          { name: "associatedTokenProgram" },
          { name: "systemProgram" },
        ],
        args: [],
      },
      {
        name: "registerDeposit",
        discriminator: [],
        accounts: [
          { name: "registrar", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "noteCommitmentRegistry", writable: true },
          { name: "userShare", writable: true },
          { name: "poolTokenAccount", writable: true },
          { name: "poolCtokenAccount", writable: true },
          { name: "kaminoLendingMarket" },
          { name: "kaminoLendingMarketAuthority" },
          { name: "kaminoReserve", writable: true },
          { name: "kaminoReserveLiquiditySupply", writable: true },
          { name: "kaminoReserveCollateralMint", writable: true },
          { name: "kaminoProgram" },
          { name: "tokenProgram" },
          { name: "systemProgram" },
        ],
        args: [
          { name: "noteCommitment", type: { array: ["u8", 32] } },
          { name: "userCommitment", type: { array: ["u8", 32] } },
          { name: "encryptedShare", type: { array: ["u8", 64] } },
          { name: "amount", type: "u64" },
        ],
      },
      {
        name: "deposit",
        discriminator: [],
        accounts: [
          { name: "depositor", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "userShare", writable: true },
          { name: "depositHistory", writable: true },
          { name: "systemProgram" },
        ],
        args: [
          { name: "amount", type: "u64" },
          { name: "commitment", type: { array: ["u8", 32] } },
          { name: "encryptedShare", type: { array: ["u8", 64] } },
          { name: "_depositIndex", type: "u64" },
        ],
      },
      {
        name: "withdraw",
        discriminator: [],
        accounts: [
          { name: "withdrawer", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "userShare", writable: true },
          { name: "nullifier", writable: true },
          { name: "poolTokenAccount", writable: true },
          { name: "poolCtokenAccount", writable: true },
          { name: "kaminoLendingMarket" },
          { name: "kaminoLendingMarketAuthority" },
          { name: "kaminoReserve", writable: true },
          { name: "kaminoReserveLiquiditySupply", writable: true },
          { name: "kaminoReserveCollateralMint", writable: true },
          { name: "kaminoProgram" },
          { name: "tokenProgram" },
          { name: "systemProgram" },
        ],
        args: [
          { name: "amount", type: "u64" },
          { name: "nullifierHash", type: { array: ["u8", 32] } },
          { name: "newEncryptedShare", type: { array: ["u8", 64] } },
          { name: "_proof", type: "bytes" },
          { name: "_publicInputs", type: { vec: { array: ["u8", 32] } } },
        ],
      },
      {
        name: "setupTransfer",
        discriminator: [],
        accounts: [
          { name: "payer", writable: true, signer: true },
          { name: "shieldPool" },
          { name: "userShare" },
          { name: "scheduledTransfer", writable: true },
          { name: "systemProgram" },
        ],
        args: [
          { name: "encryptedTransferData", type: { array: ["u8", 128] } },
          { name: "amount", type: "u64" },
          { name: "intervalSeconds", type: "u32" },
          { name: "_transferNonce", type: "u64" },
        ],
      },
      {
        name: "executeTransfer",
        discriminator: [],
        accounts: [
          { name: "executor", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "scheduledTransfer", writable: true },
          { name: "userShare", writable: true },
          { name: "batchProof", writable: true },
          { name: "nullifier", writable: true },
          { name: "transferHistory", writable: true },
          { name: "poolTokenAccount", writable: true },
          { name: "poolCtokenAccount", writable: true },
          { name: "kaminoLendingMarket" },
          { name: "kaminoLendingMarketAuthority" },
          { name: "kaminoReserve", writable: true },
          { name: "kaminoReserveLiquiditySupply", writable: true },
          { name: "kaminoReserveCollateralMint", writable: true },
          { name: "kaminoProgram" },
          { name: "tokenProgram" },
          { name: "systemProgram" },
        ],
        args: [{ name: "executionIndex", type: "u32" }],
      },
      {
        name: "cancelTransfer",
        discriminator: [],
        accounts: [
          { name: "authority", writable: true, signer: true },
          { name: "shieldPool" },
          { name: "userShare" },
          { name: "scheduledTransfer", writable: true },
          { name: "systemProgram" },
        ],
        args: [],
      },
      {
        name: "updatePoolValue",
        discriminator: [],
        accounts: [
          { name: "authority", signer: true },
          { name: "shieldPool", writable: true },
          { name: "poolCtokenAccount" },
          { name: "poolTokenAccount" },
        ],
        args: [
          { name: "exchangeRateNumerator", type: "u64" },
          { name: "exchangeRateDenominator", type: "u64" },
        ],
      },
    ],
    accounts: [
      { name: "ShieldPool", discriminator: [] },
      { name: "UserShare", discriminator: [] },
      { name: "DepositHistory", discriminator: [] },
      { name: "Nullifier", discriminator: [] },
      { name: "ScheduledTransfer", discriminator: [] },
      { name: "TransferHistory", discriminator: [] },
      { name: "BatchProofStorage", discriminator: [] },
      { name: "NoteCommitmentRegistry", discriminator: [] },
    ],
    errors: [
      { code: 6000, name: "InsufficientDeposit", msg: "Deposit amount is below minimum" },
      { code: 6001, name: "DepositExceedsMaximum", msg: "Deposit amount exceeds maximum" },
      { code: 6002, name: "InsufficientBalance", msg: "Insufficient balance for operation" },
      { code: 6003, name: "InvalidShareCalculation", msg: "Invalid share calculation" },
      { code: 6004, name: "PoolNotInitialized", msg: "Pool is not initialized or inactive" },
      { code: 6005, name: "NullifierAlreadyUsed", msg: "Nullifier has already been used" },
      { code: 6006, name: "TransferNotActive", msg: "Transfer is not active" },
      { code: 6007, name: "TransferNotDue", msg: "Transfer is not yet due for execution" },
      { code: 6008, name: "InvalidProof", msg: "Invalid proof or pool value changed too much" },
      { code: 6009, name: "ArithmeticOverflow", msg: "Arithmetic overflow" },
      { code: 6010, name: "InvalidWithdrawalAmount", msg: "Invalid withdrawal amount" },
      { code: 6011, name: "InvalidInterval", msg: "Invalid transfer interval" },
      { code: 6012, name: "TransferAlreadyCancelled", msg: "Transfer has already been cancelled" },
      { code: 6013, name: "Unauthorized", msg: "Unauthorized operation" },
      { code: 6014, name: "InvalidAccount", msg: "Invalid account" },
    ],
    types: [
      {
        name: "ShieldPool",
        type: {
          kind: "struct",
          fields: [
            { name: "poolId", type: "pubkey" },
            { name: "authority", type: "pubkey" },
            { name: "totalPoolValue", type: "u64" },
            { name: "totalShares", type: "u64" },
            { name: "kaminoObligation", type: "pubkey" },
            { name: "lastYieldUpdate", type: "i64" },
            { name: "nonce", type: "u64" },
            { name: "bump", type: "u8" },
            { name: "isActive", type: "bool" },
            { name: "tokenAccount", type: "pubkey" },
            { name: "kaminoCtokenAccount", type: "pubkey" },
            { name: "_reserved", type: { array: ["u8", 64] } },
          ],
        },
      },
      {
        name: "UserShare",
        type: {
          kind: "struct",
          fields: [
            { name: "shareId", type: "pubkey" },
            { name: "pool", type: "pubkey" },
            { name: "userCommitment", type: { array: ["u8", 32] } },
            { name: "encryptedShareAmount", type: { array: ["u8", 64] } },
            { name: "lastUpdate", type: "i64" },
            { name: "bump", type: "u8" },
            { name: "_reserved", type: { array: ["u8", 32] } },
          ],
        },
      },
      {
        name: "NoteCommitmentRegistry",
        type: {
          kind: "struct",
          fields: [
            { name: "noteCommitment", type: { array: ["u8", 32] } },
            { name: "userCommitment", type: { array: ["u8", 32] } },
            { name: "amount", type: "u64" },
            { name: "registeredAt", type: "i64" },
            { name: "pool", type: "pubkey" },
            { name: "bump", type: "u8" },
            { name: "_reserved", type: { array: ["u8", 31] } },
          ],
        },
      },
      {
        name: "ScheduledTransfer",
        type: {
          kind: "struct",
          fields: [
            { name: "transferId", type: "pubkey" },
            { name: "userCommitment", type: { array: ["u8", 32] } },
            { name: "encryptedTransferData", type: { array: ["u8", 128] } },
            { name: "amount", type: "u64" },
            { name: "intervalSeconds", type: "u32" },
            { name: "nextExecution", type: "i64" },
            { name: "isActive", type: "bool" },
            { name: "skipCount", type: "u8" },
            { name: "executionCount", type: "u64" },
            { name: "totalTransferred", type: "u64" },
            { name: "createdAt", type: "i64" },
            { name: "tuktukCronJob", type: "pubkey" },
            { name: "bump", type: "u8" },
            { name: "_reserved", type: { array: ["u8", 32] } },
          ],
        },
      },
      {
        name: "TransferStatus",
        type: {
          kind: "enum",
          variants: [
            { name: "Pending" },
            { name: "Completed" },
            { name: "Failed" },
            { name: "Skipped" },
          ],
        },
      },
      {
        name: "OperationType",
        type: {
          kind: "enum",
          variants: [
            { name: "Withdraw" },
            { name: "Transfer" },
          ],
        },
      },
    ],
  } as unknown as SublyVault;
}
