/**
 * Program IDL type definition
 * This file is auto-generated from the program's IDL
 */
import { Idl } from "@coral-xyz/anchor";

export type SublyVault = Idl;

/**
 * Load the IDL from JSON
 * In production, import the generated IDL JSON file
 */
export function getIdl(): SublyVault {
  // This would normally be imported from the generated IDL file
  // For now, we return a minimal IDL structure
  return {
    version: "0.1.0",
    name: "subly_vault",
    instructions: [
      {
        name: "initialize",
        accounts: [
          { name: "authority", isMut: true, isSigner: true },
          { name: "shieldPool", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [],
      },
      {
        name: "deposit",
        accounts: [
          { name: "depositor", isMut: true, isSigner: true },
          { name: "shieldPool", isMut: true, isSigner: false },
          { name: "userShare", isMut: true, isSigner: false },
          { name: "depositHistory", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
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
        accounts: [
          { name: "withdrawer", isMut: true, isSigner: true },
          { name: "shieldPool", isMut: true, isSigner: false },
          { name: "userShare", isMut: true, isSigner: false },
          { name: "nullifier", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
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
        accounts: [
          { name: "payer", isMut: true, isSigner: true },
          { name: "shieldPool", isMut: false, isSigner: false },
          { name: "userShare", isMut: false, isSigner: false },
          { name: "scheduledTransfer", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [
          { name: "recipient", type: "publicKey" },
          { name: "amount", type: "u64" },
          { name: "intervalSeconds", type: "u32" },
          { name: "_transferNonce", type: "u64" },
        ],
      },
      {
        name: "executeTransfer",
        accounts: [
          { name: "executor", isMut: true, isSigner: true },
          { name: "shieldPool", isMut: true, isSigner: false },
          { name: "scheduledTransfer", isMut: true, isSigner: false },
          { name: "userShare", isMut: true, isSigner: false },
          { name: "batchProof", isMut: true, isSigner: false },
          { name: "nullifier", isMut: true, isSigner: false },
          { name: "transferHistory", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [{ name: "executionIndex", type: "u32" }],
      },
      {
        name: "cancelTransfer",
        accounts: [
          { name: "authority", isMut: true, isSigner: true },
          { name: "shieldPool", isMut: false, isSigner: false },
          { name: "userShare", isMut: false, isSigner: false },
          { name: "scheduledTransfer", isMut: true, isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [],
      },
    ],
    accounts: [
      { name: "ShieldPool", type: { kind: "struct", fields: [] } },
      { name: "UserShare", type: { kind: "struct", fields: [] } },
      { name: "DepositHistory", type: { kind: "struct", fields: [] } },
      { name: "Nullifier", type: { kind: "struct", fields: [] } },
      { name: "ScheduledTransfer", type: { kind: "struct", fields: [] } },
      { name: "TransferHistory", type: { kind: "struct", fields: [] } },
      { name: "BatchProofStorage", type: { kind: "struct", fields: [] } },
    ],
    errors: [],
  } as SublyVault;
}
