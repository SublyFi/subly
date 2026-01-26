/**
 * Program IDL type definition
 * This file is auto-generated from the program's IDL
 */
import { Idl } from "@coral-xyz/anchor";

// Define the SublyVault IDL type
// In production, use the generated types from anchor build
export type SublyVault = Idl;

// Program address
export const PROGRAM_ADDRESS = "BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL";

/**
 * Load the IDL from JSON
 * In production, import the generated IDL JSON file from target/idl/subly_vault.json
 */
export function getIdl(): SublyVault {
  // This would normally be imported from the generated IDL file
  // For now, we return a minimal IDL structure compatible with Anchor 0.32+
  return {
    address: PROGRAM_ADDRESS,
    metadata: {
      name: "subly_vault",
      version: "0.1.0",
      spec: "0.1.0",
      description: "Subly Vault - Privacy-first subscription payment protocol for Solana Mainnet",
    },
    instructions: [
      {
        name: "initialize",
        discriminator: [],
        accounts: [
          { name: "authority", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "systemProgram" },
        ],
        args: [],
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
          { name: "recipient", type: "pubkey" },
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
    ],
    accounts: [
      { name: "ShieldPool", discriminator: [] },
      { name: "UserShare", discriminator: [] },
      { name: "DepositHistory", discriminator: [] },
      { name: "Nullifier", discriminator: [] },
      { name: "ScheduledTransfer", discriminator: [] },
      { name: "TransferHistory", discriminator: [] },
      { name: "BatchProofStorage", discriminator: [] },
    ],
    errors: [],
    types: [],
  } as unknown as SublyVault;
}
