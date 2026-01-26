/**
 * @subly/vault-sdk
 *
 * TypeScript SDK for Subly Vault - Privacy-first subscription payment protocol
 *
 * Features:
 * - Private USDC deposits and withdrawals
 * - DeFi yield generation via Kamino Lending
 * - Recurring payment automation
 * - ECIES encryption for balance privacy
 *
 * @example
 * ```typescript
 * import { createSublyVaultClient } from '@subly/vault-sdk';
 * import { Connection, Keypair } from '@solana/web3.js';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 * const wallet = new NodeWallet(Keypair.generate());
 *
 * const client = createSublyVaultClient(connection, wallet);
 * await client.initialize(idl);
 *
 * // Initialize user (generates secret and commitment)
 * const { secret, commitment } = client.initializeUser();
 *
 * // Deposit USDC
 * await client.deposit({ amount: 100_000_000 }); // 100 USDC
 *
 * // Check balance
 * const balance = await client.getBalance();
 * console.log(`Balance: ${balance.valueUsdc} USDC`);
 * ```
 */

// Main client
export { SublyVaultClient, createSublyVaultClient } from "./client";

// Types
export * from "./types";

// Utilities
export {
  generateSecret,
  generateCommitment,
  generateNullifier,
  verifyCommitment,
  storeSecret,
  retrieveSecret,
} from "./utils/commitment";

export {
  deriveEncryptionKey,
  encryptShares,
  decryptShares,
  createPlaceholderEncryptedShare,
  readPlaceholderShares,
  KEY_DERIVATION_MESSAGE,
} from "./utils/encryption";

export {
  getShieldPoolPda,
  getUserSharePda,
  getDepositHistoryPda,
  getScheduledTransferPda,
  getTransferHistoryPda,
  getNullifierPda,
  getBatchProofPda,
  SHIELD_POOL_SEED,
  USER_SHARE_SEED,
  DEPOSIT_HISTORY_SEED,
  SCHEDULED_TRANSFER_SEED,
  TRANSFER_HISTORY_SEED,
  NULLIFIER_SEED,
  BATCH_PROOF_SEED,
} from "./utils/pda";

// IDL utilities
export { getIdl } from "./idl/subly_vault";
export type { SublyVault } from "./idl/subly_vault";
