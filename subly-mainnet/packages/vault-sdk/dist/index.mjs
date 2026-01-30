import {
  TUKTUK_CRON_PROGRAM_ID,
  TUKTUK_PROGRAM_ID,
  TukTukError,
  TukTukIntegration,
  createTukTukIntegration,
  intervalToCronSchedule
} from "./chunk-WREQS6E7.mjs";

// src/client.ts
import {
  PublicKey as PublicKey6,
  SystemProgram,
  Keypair as Keypair3
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// src/types/index.ts
import { PublicKey } from "@solana/web3.js";
var TransferStatus = /* @__PURE__ */ ((TransferStatus2) => {
  TransferStatus2["Pending"] = "Pending";
  TransferStatus2["Completed"] = "Completed";
  TransferStatus2["Failed"] = "Failed";
  TransferStatus2["Skipped"] = "Skipped";
  return TransferStatus2;
})(TransferStatus || {});
var OperationType = /* @__PURE__ */ ((OperationType2) => {
  OperationType2["Withdraw"] = "Withdraw";
  OperationType2["Transfer"] = "Transfer";
  return OperationType2;
})(OperationType || {});
var INTERVAL_SECONDS = {
  hourly: 3600,
  daily: 86400,
  weekly: 604800,
  monthly: 2592e3
  // 30 days
};
var PROGRAM_ID = new PublicKey("BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL");
var USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
var USDC_DECIMALS = 6;
var KAMINO_LENDING_PROGRAM_ID = new PublicKey("KLend2g3cP87ber41VSz2cHu5M3mxzQS7pzLFz1UJwp");
var KAMINO_MAIN_MARKET = new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");
var KAMINO_USDC_RESERVE = new PublicKey("d4A2prbA2whSmMHHaHmRNKRpvqH8UgFfGzTqZGKfJxB");
var KAMINO_CUSDC_MINT = new PublicKey("BNBUwNTkDEYgYfFg8sVB6S9gqTfzfj2uYPBYfRAJYr7u");
var SHIELD_POOL_SEED = Buffer.from("shield_pool");
var USER_SHARE_SEED = Buffer.from("share");
var POOL_TOKEN_ACCOUNT_SEED = Buffer.from("pool_token");
var POOL_CTOKEN_ACCOUNT_SEED = Buffer.from("pool_ctoken");
var NOTE_COMMITMENT_REGISTRY_SEED = Buffer.from("note_commitment_registry");
var NULLIFIER_SEED = Buffer.from("nullifier");
var SCHEDULED_TRANSFER_SEED = Buffer.from("transfer");
var DEPOSIT_HISTORY_SEED = Buffer.from("deposit_history");
var TRANSFER_HISTORY_SEED = Buffer.from("history");
var BATCH_PROOF_SEED = Buffer.from("batch_proof");

// src/utils/pda.ts
import { PublicKey as PublicKey2 } from "@solana/web3.js";
var SHIELD_POOL_SEED2 = Buffer.from("shield_pool");
var USER_SHARE_SEED2 = Buffer.from("share");
var DEPOSIT_HISTORY_SEED2 = Buffer.from("deposit_history");
var SCHEDULED_TRANSFER_SEED2 = Buffer.from("transfer");
var TRANSFER_HISTORY_SEED2 = Buffer.from("history");
var NULLIFIER_SEED2 = Buffer.from("nullifier");
var BATCH_PROOF_SEED2 = Buffer.from("batch_proof");
var NOTE_COMMITMENT_REGISTRY_SEED2 = Buffer.from("note_commitment_registry");
var POOL_TOKEN_ACCOUNT_SEED2 = Buffer.from("pool_token");
var POOL_CTOKEN_ACCOUNT_SEED2 = Buffer.from("pool_ctoken");
function getShieldPoolPda(programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync([SHIELD_POOL_SEED2], programId);
}
function getUserSharePda(pool, commitment, programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync(
    [USER_SHARE_SEED2, pool.toBuffer(), Buffer.from(commitment)],
    programId
  );
}
function getDepositHistoryPda(commitment, depositIndex, programId = PROGRAM_ID) {
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(depositIndex);
  return PublicKey2.findProgramAddressSync(
    [DEPOSIT_HISTORY_SEED2, Buffer.from(commitment), indexBuffer],
    programId
  );
}
function getScheduledTransferPda(commitment, transferNonce, programId = PROGRAM_ID) {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(transferNonce);
  return PublicKey2.findProgramAddressSync(
    [SCHEDULED_TRANSFER_SEED2, Buffer.from(commitment), nonceBuffer],
    programId
  );
}
function getTransferHistoryPda(scheduledTransfer, executionIndex, programId = PROGRAM_ID) {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(executionIndex);
  return PublicKey2.findProgramAddressSync(
    [TRANSFER_HISTORY_SEED2, scheduledTransfer.toBuffer(), indexBuffer],
    programId
  );
}
function getNullifierPda(nullifierHash, programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync(
    [NULLIFIER_SEED2, Buffer.from(nullifierHash)],
    programId
  );
}
function getBatchProofPda(scheduledTransfer, executionIndex, programId = PROGRAM_ID) {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(executionIndex);
  return PublicKey2.findProgramAddressSync(
    [BATCH_PROOF_SEED2, scheduledTransfer.toBuffer(), indexBuffer],
    programId
  );
}
function getNoteCommitmentRegistryPda(noteCommitment, programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync(
    [NOTE_COMMITMENT_REGISTRY_SEED2, Buffer.from(noteCommitment)],
    programId
  );
}
function getPoolTokenAccountPda(pool, programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync(
    [POOL_TOKEN_ACCOUNT_SEED2, pool.toBuffer()],
    programId
  );
}
function getPoolCtokenAccountPda(pool, programId = PROGRAM_ID) {
  return PublicKey2.findProgramAddressSync(
    [POOL_CTOKEN_ACCOUNT_SEED2, pool.toBuffer()],
    programId
  );
}
function getKaminoLendingMarketAuthorityPda(market, kaminoProgramId) {
  return PublicKey2.findProgramAddressSync(
    [Buffer.from("lma"), market.toBuffer()],
    kaminoProgramId
  );
}

// node_modules/@solana/spl-token/lib/esm/constants.js
import { PublicKey as PublicKey3 } from "@solana/web3.js";
var TOKEN_PROGRAM_ID = new PublicKey3("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
var TOKEN_2022_PROGRAM_ID = new PublicKey3("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
var ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey3("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
var NATIVE_MINT = new PublicKey3("So11111111111111111111111111111111111111112");
var NATIVE_MINT_2022 = new PublicKey3("9pan9bMn5HatX4EJdBwg9VgCa7Uz5HL8N1m5D3NdXejP");

// src/utils/commitment.ts
import nacl from "tweetnacl";
function generateSecret() {
  return nacl.randomBytes(32);
}
function generateCommitment(secret, poolId) {
  if (secret.length !== 32) {
    throw new Error("Secret must be 32 bytes");
  }
  const data = new Uint8Array(64);
  data.set(secret, 0);
  data.set(poolId.toBytes(), 32);
  return nacl.hash(data).slice(0, 32);
}
function generateNullifier(secret, operationType, nonce) {
  if (secret.length !== 32) {
    throw new Error("Secret must be 32 bytes");
  }
  const operationBytes = new TextEncoder().encode(operationType);
  const nonceBuffer = new Uint8Array(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, nonce, true);
  const data = new Uint8Array(secret.length + operationBytes.length + 8);
  let offset = 0;
  data.set(secret, offset);
  offset += secret.length;
  data.set(operationBytes, offset);
  offset += operationBytes.length;
  data.set(nonceBuffer, offset);
  return nacl.hash(data).slice(0, 32);
}
function verifyCommitment(commitment, secret, poolId) {
  const expectedCommitment = generateCommitment(secret, poolId);
  return nacl.verify(commitment, expectedCommitment);
}
function storeSecret(secret, walletAddress, poolId) {
  const key = `subly_secret_${walletAddress}_${poolId}`;
  const encoded = Buffer.from(secret).toString("base64");
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, encoded);
  }
}
function retrieveSecret(walletAddress, poolId) {
  const key = `subly_secret_${walletAddress}_${poolId}`;
  if (typeof localStorage !== "undefined") {
    const encoded = localStorage.getItem(key);
    if (encoded) {
      return new Uint8Array(Buffer.from(encoded, "base64"));
    }
  }
  return null;
}

// src/utils/encryption.ts
import nacl2 from "tweetnacl";
function deriveEncryptionKey(signature) {
  return nacl2.hash(signature).slice(0, 32);
}
function encryptShares(shares, encryptionKey) {
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  const sharesBytes = new Uint8Array(8);
  const view = new DataView(sharesBytes.buffer);
  view.setBigUint64(0, shares, true);
  const nonce = nacl2.randomBytes(24);
  const ciphertext = nacl2.secretbox(sharesBytes, nonce, encryptionKey);
  const result = new Uint8Array(64);
  result.set(nonce, 0);
  result.set(ciphertext.slice(0, 32), 32);
  return result;
}
function decryptShares(encryptedData, encryptionKey) {
  if (encryptedData.length !== 64) {
    throw new Error("Encrypted data must be 64 bytes");
  }
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  const nonce = encryptedData.slice(0, 24);
  const ciphertext = new Uint8Array(24);
  ciphertext.set(encryptedData.slice(32, 56));
  const decrypted = nacl2.secretbox.open(ciphertext, nonce, encryptionKey);
  if (!decrypted) {
    throw new Error("Decryption failed");
  }
  const view = new DataView(decrypted.buffer, decrypted.byteOffset, 8);
  return view.getBigUint64(0, true);
}
function createPlaceholderEncryptedShare(shares) {
  const result = new Uint8Array(64);
  const view = new DataView(result.buffer);
  view.setBigUint64(0, shares, true);
  return result;
}
function readPlaceholderShares(data) {
  if (data.length !== 64) {
    throw new Error("Data must be 64 bytes");
  }
  const view = new DataView(data.buffer, data.byteOffset, 8);
  return view.getBigUint64(0, true);
}
var KEY_DERIVATION_MESSAGE = "Sign this message to derive your Subly Vault encryption key.\n\nThis signature will be used to encrypt and decrypt your private balance.\n\nIt will not trigger any blockchain transaction or cost any fees.";

// src/utils/local-storage.ts
import nacl3 from "tweetnacl";
import { createHash } from "crypto";
var memoryStorage = /* @__PURE__ */ new Map();
function isBrowser() {
  return typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined" && typeof globalThis.window.localStorage !== "undefined";
}
function deriveKeyFromPassword(password) {
  const hash = createHash("sha256");
  hash.update(password);
  return new Uint8Array(hash.digest());
}
var LocalStorageManager = class {
  encryptionKey = null;
  storageKey;
  constructor(storageKeyPrefix = "subly-vault") {
    this.storageKey = storageKeyPrefix;
  }
  /**
   * Initialize the storage manager with a password or signature
   *
   * @param passwordOrSignature - Password string or wallet signature bytes
   */
  async initialize(passwordOrSignature) {
    if (typeof passwordOrSignature === "string") {
      this.encryptionKey = deriveKeyFromPassword(passwordOrSignature);
    } else {
      this.encryptionKey = passwordOrSignature.slice(0, 32);
    }
  }
  /**
   * Check if the manager is initialized
   */
  isInitialized() {
    return this.encryptionKey !== null;
  }
  /**
   * Encrypt data using nacl secretbox
   */
  encrypt(data) {
    if (!this.encryptionKey) {
      throw new Error("LocalStorageManager not initialized");
    }
    const nonce = nacl3.randomBytes(24);
    const dataBytes = new TextEncoder().encode(data);
    const ciphertext = nacl3.secretbox(dataBytes, nonce, this.encryptionKey);
    return {
      nonce: Buffer.from(nonce).toString("base64"),
      ciphertext: Buffer.from(ciphertext).toString("base64"),
      version: 1
    };
  }
  /**
   * Decrypt data using nacl secretbox
   */
  decrypt(encrypted) {
    if (!this.encryptionKey) {
      throw new Error("LocalStorageManager not initialized");
    }
    const nonce = Buffer.from(encrypted.nonce, "base64");
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
    const decrypted = nacl3.secretbox.open(ciphertext, nonce, this.encryptionKey);
    if (!decrypted) {
      throw new Error("Failed to decrypt local storage data");
    }
    return new TextDecoder().decode(decrypted);
  }
  /**
   * Get storage (browser localStorage or in-memory)
   */
  setStorage(key, value) {
    if (isBrowser()) {
      globalThis.window.localStorage.setItem(key, value);
    } else {
      memoryStorage.set(key, value);
    }
  }
  /**
   * Get from storage (browser localStorage or in-memory)
   */
  getStorage(key) {
    if (isBrowser()) {
      return globalThis.window.localStorage.getItem(key);
    } else {
      return memoryStorage.get(key) ?? null;
    }
  }
  /**
   * Remove from storage
   */
  removeStorage(key) {
    if (isBrowser()) {
      globalThis.window.localStorage.removeItem(key);
    } else {
      memoryStorage.delete(key);
    }
  }
  /**
   * Save vault data to local storage
   */
  async saveVaultData(data) {
    const json = JSON.stringify(data);
    const encrypted = this.encrypt(json);
    this.setStorage(this.storageKey, JSON.stringify(encrypted));
  }
  /**
   * Load vault data from local storage
   */
  async loadVaultData() {
    const stored = this.getStorage(this.storageKey);
    if (!stored) {
      return null;
    }
    try {
      const encrypted = JSON.parse(stored);
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Failed to load vault data:", error);
      return null;
    }
  }
  /**
   * Ensure vault data exists, create if not
   */
  async ensureVaultData() {
    let data = await this.loadVaultData();
    if (!data) {
      data = {
        userSecret: "",
        userCommitment: "",
        shares: "0",
        transfers: [],
        version: 1,
        lastUpdated: Date.now()
      };
      await this.saveVaultData(data);
    }
    return data;
  }
  /**
   * Save a transfer to local storage
   * @alias saveTransferDetails
   */
  async saveTransfer(transfer) {
    const data = await this.ensureVaultData();
    const existingIndex = data.transfers.findIndex((t) => t.transferId === transfer.transferId);
    if (existingIndex >= 0) {
      data.transfers[existingIndex] = transfer;
    } else {
      data.transfers.push(transfer);
    }
    data.lastUpdated = Date.now();
    await this.saveVaultData(data);
  }
  /**
   * Get a transfer from local storage
   * @alias loadTransferDetails
   */
  async getTransfer(transferId) {
    const data = await this.loadVaultData();
    if (!data) {
      return null;
    }
    return data.transfers.find((t) => t.transferId === transferId) || null;
  }
  /**
   * Get all transfers from local storage
   */
  async getAllTransfers() {
    const data = await this.loadVaultData();
    if (!data) {
      return [];
    }
    return data.transfers;
  }
  /**
   * Delete a transfer from local storage
   */
  async deleteTransfer(transferId) {
    const data = await this.loadVaultData();
    if (!data) {
      return;
    }
    data.transfers = data.transfers.filter((t) => t.transferId !== transferId);
    data.lastUpdated = Date.now();
    await this.saveVaultData(data);
  }
  /**
   * Clear all local storage data
   */
  async clearAll() {
    this.removeStorage(this.storageKey);
  }
  /**
   * Create initial vault data structure
   */
  static createInitialData(userSecret, userCommitment) {
    return {
      userSecret: Buffer.from(userSecret).toString("base64"),
      userCommitment: Buffer.from(userCommitment).toString("base64"),
      shares: "0",
      transfers: [],
      version: 1,
      lastUpdated: Date.now()
    };
  }
};
async function encryptTransferData(recipient, encryptionKey, memo) {
  const data = JSON.stringify({ recipient, memo: memo || "" });
  const dataBytes = new TextEncoder().encode(data);
  const paddedData = new Uint8Array(96);
  paddedData.set(dataBytes.slice(0, Math.min(dataBytes.length, 96)));
  const nonce = nacl3.randomBytes(24);
  const ciphertext = nacl3.secretbox(paddedData, nonce, encryptionKey);
  const result = new Uint8Array(128);
  result.set(nonce, 0);
  result.set(ciphertext.slice(0, 104), 24);
  return result;
}
function decryptTransferData(encryptedData, encryptionKey) {
  if (encryptedData.length !== 128) {
    throw new Error("Encrypted transfer data must be 128 bytes");
  }
  const nonce = encryptedData.slice(0, 24);
  const ciphertext = new Uint8Array(112);
  ciphertext.set(encryptedData.slice(24, 128));
  const decrypted = nacl3.secretbox.open(ciphertext, nonce, encryptionKey);
  if (!decrypted) {
    throw new Error("Failed to decrypt transfer data");
  }
  const text = new TextDecoder().decode(decrypted).replace(/\0+$/, "");
  const data = JSON.parse(text);
  return {
    recipient: data.recipient || "",
    memo: data.memo || ""
  };
}

// src/integrations/privacy-cash.ts
import { Keypair, PublicKey as PublicKey4 } from "@solana/web3.js";
var USDC_MINT = new PublicKey4("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
var PRIVACY_CASH_PROGRAM_ID = new PublicKey4("9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD");
var PrivacyCashIntegration = class {
  client;
  // PrivacyCash client instance
  initialized = false;
  config;
  constructor(config) {
    this.config = config;
  }
  /**
   * Initialize the Privacy Cash client
   * Must be called before any operations
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    try {
      const { PrivacyCash } = await import("privacycash");
      let ownerKey;
      if (this.config.privateKey instanceof Keypair) {
        ownerKey = Array.from(this.config.privateKey.secretKey);
      } else if (this.config.privateKey instanceof Uint8Array) {
        ownerKey = Array.from(this.config.privateKey);
      } else {
        ownerKey = this.config.privateKey;
      }
      this.client = new PrivacyCash({
        RPC_url: this.config.rpcUrl,
        owner: ownerKey,
        enableDebug: this.config.enableDebug ?? false
      });
      this.initialized = true;
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to initialize Privacy Cash client: ${error instanceof Error ? error.message : "Unknown error"}`,
        "INIT_FAILED"
      );
    }
  }
  /**
   * Ensure client is initialized
   */
  ensureInitialized() {
    if (!this.initialized || !this.client) {
      throw new PrivacyCashError(
        "Privacy Cash client not initialized. Call initialize() first.",
        "NOT_INITIALIZED"
      );
    }
  }
  /**
   * Deposit USDC privately
   *
   * Uses the USDC-specific depositUSDC method for better reliability.
   *
   * SDK Method: depositUSDC({ base_units }) → { tx: string }
   * Fallback: depositSPL({ mintAddress, base_units }) → { tx: string }
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Transaction signature
   */
  async depositPrivateUSDC(amount) {
    this.ensureInitialized();
    try {
      const baseUnits = Math.floor(amount * 1e6);
      if (typeof this.client.depositUSDC === "function") {
        const result2 = await this.client.depositUSDC({
          base_units: baseUnits
        });
        return { tx: result2.tx };
      }
      const result = await this.client.depositSPL({
        mintAddress: USDC_MINT.toBase58(),
        base_units: baseUnits
      });
      return { tx: result.tx };
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to deposit USDC: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DEPOSIT_FAILED"
      );
    }
  }
  /**
   * Withdraw USDC privately
   *
   * Uses the USDC-specific withdrawUSDC method for better reliability.
   *
   * SDK Method: withdrawUSDC({ base_units, recipientAddress?, referrer? })
   *            → { isPartial, tx, recipient, base_units, fee_base_units }
   * Fallback: withdrawSPL({ mintAddress, base_units, recipientAddress? })
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @param recipient Optional recipient address (defaults to self)
   * @returns Withdrawal result with transaction and fee information
   */
  async withdrawPrivateUSDC(amount, recipient) {
    this.ensureInitialized();
    try {
      const baseUnits = Math.floor(amount * 1e6);
      if (typeof this.client.withdrawUSDC === "function") {
        const result2 = await this.client.withdrawUSDC({
          base_units: baseUnits,
          recipientAddress: recipient
        });
        return {
          tx: result2.tx,
          recipient: result2.recipient,
          baseUnits: result2.base_units,
          feeBaseUnits: result2.fee_base_units,
          isPartial: result2.isPartial ?? false
        };
      }
      const result = await this.client.withdrawSPL({
        mintAddress: USDC_MINT.toBase58(),
        base_units: baseUnits,
        recipientAddress: recipient
      });
      return {
        tx: result.tx,
        recipient: result.recipient,
        baseUnits: result.base_units,
        feeBaseUnits: result.fee_base_units,
        isPartial: result.isPartial ?? false
      };
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to withdraw USDC: ${error instanceof Error ? error.message : "Unknown error"}`,
        "WITHDRAW_FAILED"
      );
    }
  }
  /**
   * Get private USDC balance
   *
   * Uses the USDC-specific getPrivateBalanceUSDC method for better reliability.
   *
   * SDK Method: getPrivateBalanceUSDC() → { base_units, amount, lamports }
   * Fallback: getPrivateBalanceSpl(mintAddress) → { base_units, amount, lamports }
   *
   * @returns Balance in USDC (human-readable)
   */
  async getPrivateUSDCBalance() {
    this.ensureInitialized();
    try {
      if (typeof this.client.getPrivateBalanceUSDC === "function") {
        const result2 = await this.client.getPrivateBalanceUSDC();
        return result2.amount ?? result2.base_units / 1e6;
      }
      const result = await this.client.getPrivateBalanceSpl(USDC_MINT.toBase58());
      return result.amount ?? result.base_units / 1e6;
    } catch (error) {
      throw new PrivacyCashError(
        `Failed to get private balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        "BALANCE_FAILED"
      );
    }
  }
  /**
   * Clear the local UTXO cache
   * Useful for forcing a refresh of balance data
   */
  async clearCache() {
    this.ensureInitialized();
    try {
      if (typeof this.client.clearCache === "function") {
        await this.client.clearCache();
      }
    } catch (error) {
      console.warn("Failed to clear Privacy Cash cache:", error);
    }
  }
  /**
   * Get estimated fees for a withdrawal
   *
   * @param amount Amount in USDC
   * @returns Estimated fee breakdown
   */
  getEstimatedWithdrawalFees(amount) {
    const protocolFeePercent = 0.35;
    const networkFeeSol = 6e-3;
    const protocolFeeUsdc = amount * (protocolFeePercent / 100);
    return {
      protocolFeePercent,
      protocolFeeUsdc,
      networkFeeSol,
      totalFeeUsdc: protocolFeeUsdc
      // Note: SOL fee is separate
    };
  }
};
var PrivacyCashError = class extends Error {
  constructor(message, code) {
    super(`Privacy Cash Error [${code}]: ${message}`);
    this.code = code;
    this.name = "PrivacyCashError";
  }
};
async function createPrivacyCashIntegration(config) {
  const integration = new PrivacyCashIntegration(config);
  await integration.initialize();
  return integration;
}

// src/integrations/kamino.ts
import {
  PublicKey as PublicKey5,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
var KAMINO_LENDING_PROGRAM_ID2 = new PublicKey5("KLend2g3cP87ber41VSz2cHu5M3mxzQS7pzLFz1UJwp");
var USDC_MINT2 = new PublicKey5("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
var KAMINO_MAIN_MARKET2 = new PublicKey5("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");
var KaminoIntegration = class {
  connection;
  payer;
  poolAuthority;
  marketAddress;
  initialized = false;
  kaminoMarket = null;
  constructor(config) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.poolAuthority = config.poolAuthority;
    this.marketAddress = config.marketAddress ?? KAMINO_MAIN_MARKET2;
  }
  /**
   * Initialize the Kamino market client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    try {
      const klendSdk = await import("@kamino-finance/klend-sdk");
      const KaminoMarket = klendSdk.KaminoMarket;
      this.kaminoMarket = await KaminoMarket.load(
        this.connection,
        this.marketAddress,
        KAMINO_LENDING_PROGRAM_ID2
      );
      this.initialized = true;
    } catch (error) {
      throw new KaminoError(
        `Failed to initialize Kamino market: ${error instanceof Error ? error.message : "Unknown error"}`,
        "INIT_FAILED"
      );
    }
  }
  /**
   * Ensure the integration is initialized
   */
  ensureInitialized() {
    if (!this.initialized || !this.kaminoMarket) {
      throw new KaminoError(
        "Kamino integration not initialized. Call initialize() first.",
        "NOT_INITIALIZED"
      );
    }
  }
  /**
   * Deposit USDC into Kamino Lending
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Deposit result with transaction and cToken info
   */
  async depositToKamino(amount) {
    this.ensureInitialized();
    try {
      const klendSdk = await import("@kamino-finance/klend-sdk");
      const KaminoAction = klendSdk.KaminoAction;
      const amountInBaseUnits = BigInt(Math.floor(amount * 1e6));
      const currentSlot = await this.connection.getSlot();
      const depositAction = await KaminoAction.buildDepositTxns(
        this.kaminoMarket,
        amountInBaseUnits.toString(),
        USDC_MINT2,
        this.poolAuthority,
        void 0,
        // obligation - auto-create if needed
        true,
        // useV2Ixs
        void 0,
        // scopeRefreshConfig
        1e6,
        // extraComputeBudget
        true,
        // includeAtaIxs
        false,
        // requestElevationGroup
        void 0,
        // lookupTableCreationConfig
        void 0,
        // referrer
        currentSlot
      );
      const instructions = (depositAction.setupIxs || []).concat(
        depositAction.lendingIxs || [],
        depositAction.cleanupIxs || []
      );
      const tx = new Transaction();
      for (const ix of instructions) {
        tx.add(ix);
      }
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      const estimatedCTokens = amount;
      return {
        tx: signature,
        cTokensReceived: estimatedCTokens,
        depositedAmount: amount
      };
    } catch (error) {
      throw new KaminoError(
        `Failed to deposit to Kamino: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DEPOSIT_FAILED"
      );
    }
  }
  /**
   * Withdraw USDC from Kamino Lending
   *
   * @param amount Amount in USDC (human-readable, e.g., 10 = 10 USDC)
   * @returns Withdraw result with transaction info
   */
  async withdrawFromKamino(amount) {
    this.ensureInitialized();
    try {
      const klendSdk = await import("@kamino-finance/klend-sdk");
      const KaminoAction = klendSdk.KaminoAction;
      const amountInBaseUnits = BigInt(Math.floor(amount * 1e6));
      const currentSlot = await this.connection.getSlot();
      const withdrawAction = await KaminoAction.buildWithdrawTxns(
        this.kaminoMarket,
        amountInBaseUnits.toString(),
        USDC_MINT2,
        this.poolAuthority,
        void 0,
        // obligation
        true,
        // useV2Ixs
        void 0,
        // scopeRefreshConfig
        1e6,
        // extraComputeBudget
        true,
        // includeAtaIxs
        void 0,
        // lookupTableCreationConfig
        currentSlot
      );
      const instructions = (withdrawAction.setupIxs || []).concat(
        withdrawAction.lendingIxs || [],
        withdrawAction.cleanupIxs || []
      );
      const tx = new Transaction();
      for (const ix of instructions) {
        tx.add(ix);
      }
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      return {
        tx: signature,
        amountWithdrawn: amount,
        cTokensBurned: amount
        // Estimate
      };
    } catch (error) {
      throw new KaminoError(
        `Failed to withdraw from Kamino: ${error instanceof Error ? error.message : "Unknown error"}`,
        "WITHDRAW_FAILED"
      );
    }
  }
  /**
   * Get current yield information for the pool
   *
   * @returns Yield information including APY and earned amounts
   */
  async getKaminoYieldInfo() {
    this.ensureInitialized();
    try {
      await this.kaminoMarket.reload();
      const usdcReserve = this.kaminoMarket.getReserveByMint(USDC_MINT2);
      if (!usdcReserve) {
        throw new KaminoError("USDC reserve not found in Kamino market", "RESERVE_NOT_FOUND");
      }
      const supplyApy = usdcReserve.stats?.supplyInterestAPY ?? 0;
      let depositedAmount = 0;
      let currentValue = 0;
      let earnedYield = 0;
      try {
        const obligations = await this.kaminoMarket.getAllObligationsByOwner(this.poolAuthority);
        if (obligations.length > 0) {
          for (const obligation of obligations) {
            const deposits = obligation.deposits?.filter(
              (d) => d.mintAddress?.equals(USDC_MINT2)
            );
            if (deposits) {
              for (const deposit of deposits) {
                depositedAmount += Number(deposit.amount ?? 0) / 1e6;
                currentValue += Number(deposit.marketValueRefreshed ?? deposit.amount ?? 0) / 1e6;
              }
            }
          }
          earnedYield = currentValue - depositedAmount;
        }
      } catch {
      }
      return {
        apy: supplyApy,
        apyFormatted: `${(supplyApy * 100).toFixed(2)}%`,
        earnedYield,
        depositedAmount,
        currentValue,
        lastUpdated: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      if (error instanceof KaminoError) {
        throw error;
      }
      return {
        apy: 0.05,
        // Default 5% APY estimate
        apyFormatted: "5.00%",
        earnedYield: 0,
        depositedAmount: 0,
        currentValue: 0,
        lastUpdated: /* @__PURE__ */ new Date()
      };
    }
  }
  /**
   * Get the current USDC supply APY from Kamino
   *
   * @returns APY as a decimal (e.g., 0.05 = 5%)
   */
  async getCurrentApy() {
    const yieldInfo = await this.getKaminoYieldInfo();
    return yieldInfo.apy;
  }
  /**
   * Estimate yield for a given amount and duration
   *
   * @param principal Amount in USDC
   * @param daysHeld Number of days to hold
   * @returns Estimated yield in USDC
   */
  async estimateYield(principal, daysHeld) {
    const apy = await this.getCurrentApy();
    const dailyRate = apy / 365;
    return principal * dailyRate * daysHeld;
  }
};
var KaminoError = class extends Error {
  constructor(message, code) {
    super(`Kamino Error [${code}]: ${message}`);
    this.code = code;
    this.name = "KaminoError";
  }
};
async function createKaminoIntegration(config) {
  const integration = new KaminoIntegration(config);
  await integration.initialize();
  return integration;
}

// src/client.ts
var SublyVaultClient = class {
  connection;
  wallet;
  program = null;
  programId;
  config;
  // External protocol integrations (Privacy Cash is REQUIRED)
  privacyCash = null;
  tuktuk = null;
  kamino = null;
  // Local storage for privacy-sensitive data (recipient addresses)
  localStorage;
  // Cached data
  userSecret = null;
  userCommitment = null;
  constructor(connection, wallet, programId = PROGRAM_ID, config = {}) {
    this.connection = connection;
    this.wallet = wallet;
    this.programId = programId;
    this.config = {
      commitment: config.commitment ?? "confirmed",
      skipPreflight: config.skipPreflight ?? false,
      storageKey: config.storageKey ?? "subly-vault"
    };
    this.localStorage = new LocalStorageManager(this.config.storageKey);
  }
  /**
   * Initialize the SDK with the program IDL
   * Must be called before using other methods
   *
   * IMPORTANT: Privacy Cash is REQUIRED for privacy-preserving operations.
   * All deposits and transfers must go through Privacy Cash to protect user privacy.
   *
   * @param idl - Program IDL
   * @param options - Initialization options for external integrations
   */
  async initialize(idl, options) {
    const provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: this.config.commitment,
      skipPreflight: this.config.skipPreflight
    });
    this.program = new Program(idl, provider);
    const storagePassword = options.storagePassword ?? this.wallet.publicKey.toBase58();
    await this.localStorage.initialize(storagePassword);
    const rpcUrl = options.rpcUrl ?? this.connection.rpcEndpoint;
    this.privacyCash = await createPrivacyCashIntegration({
      rpcUrl,
      privateKey: options.privacyCashPrivateKey,
      enableDebug: false
    });
    if (options.enableTukTuk) {
      const poolAuthority = this.getShieldPoolAddress();
      this.tuktuk = createTukTukIntegration({
        connection: this.connection,
        payer: Keypair3.generate(),
        // Placeholder - should be provided
        authority: poolAuthority
      });
    }
    if (options.enableKamino) {
      const poolAuthority = this.getShieldPoolAddress();
      this.kamino = await createKaminoIntegration({
        connection: this.connection,
        payer: Keypair3.generate(),
        // Placeholder - should be provided
        poolAuthority
      });
    }
  }
  /**
   * Get the Shield Pool PDA address
   */
  getShieldPoolAddress() {
    const [pda] = getShieldPoolPda(this.programId);
    return pda;
  }
  /**
   * Fetch the Shield Pool account data
   */
  async getShieldPool() {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    try {
      const poolAddress = this.getShieldPoolAddress();
      const pool = await this.program.account.shieldPool.fetch(poolAddress);
      return pool;
    } catch {
      return null;
    }
  }
  /**
   * Initialize a user's secret and commitment
   * This should be called once when a user first interacts with the vault
   */
  initializeUser(existingSecret) {
    const poolAddress = this.getShieldPoolAddress();
    this.userSecret = existingSecret ?? generateSecret();
    this.userCommitment = generateCommitment(this.userSecret, poolAddress);
    return {
      secret: this.userSecret,
      commitment: this.userCommitment
    };
  }
  /**
   * Get or generate the user's commitment
   */
  getUserCommitment() {
    if (!this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    return this.userCommitment;
  }
  /**
   * Register a private deposit from Privacy Cash
   *
   * This is the PREFERRED method for deposits as it preserves privacy.
   * The deposit flow is:
   * 1. User deposits USDC to Privacy Cash (separate transaction)
   * 2. Privacy Cash returns a note_commitment as proof
   * 3. User calls registerDeposit with the note_commitment
   * 4. The registrar (relayer or user) registers without exposing the user's wallet
   *
   * After registration, USDC is deposited to Kamino for yield generation.
   *
   * @param params - Register deposit parameters
   * @returns Transaction result
   */
  async registerDeposit(params) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.userSecret || !this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    if (!this.privacyCash) {
      throw new Error("Privacy Cash is required for privacy-preserving deposits.");
    }
    const pool = await this.getShieldPool();
    if (!pool) {
      throw new Error("Shield Pool not initialized");
    }
    const amount = typeof params.amount === "number" ? new BN(params.amount) : params.amount;
    const shares = this.calculateSharesForDeposit(
      amount,
      pool.totalPoolValue,
      pool.totalShares
    );
    const encryptedShare = createPlaceholderEncryptedShare(shares);
    const poolAddress = this.getShieldPoolAddress();
    const [userSharePda] = getUserSharePda(poolAddress, this.userCommitment, this.programId);
    const [noteCommitmentRegistryPda] = getNoteCommitmentRegistryPda(
      params.noteCommitment,
      this.programId
    );
    const [poolTokenAccountPda] = getPoolTokenAccountPda(poolAddress, this.programId);
    const [poolCtokenAccountPda] = getPoolCtokenAccountPda(poolAddress, this.programId);
    const [kaminoLendingMarketAuthority] = getKaminoLendingMarketAuthorityPda(
      KAMINO_MAIN_MARKET,
      KAMINO_LENDING_PROGRAM_ID
    );
    const kaminoReserveLiquiditySupply = await this.getKaminoReserveLiquiditySupply();
    try {
      const signature = await this.program.methods.registerDeposit(
        Array.from(params.noteCommitment),
        Array.from(this.userCommitment),
        Array.from(encryptedShare),
        amount
      ).accounts({
        registrar: this.wallet.publicKey,
        shieldPool: poolAddress,
        noteCommitmentRegistry: noteCommitmentRegistryPda,
        userShare: userSharePda,
        poolTokenAccount: poolTokenAccountPda,
        poolCtokenAccount: poolCtokenAccountPda,
        kaminoLendingMarket: KAMINO_MAIN_MARKET,
        kaminoLendingMarketAuthority,
        kaminoReserve: KAMINO_USDC_RESERVE,
        kaminoReserveLiquiditySupply,
        kaminoReserveCollateralMint: KAMINO_CUSDC_MINT,
        kaminoProgram: KAMINO_LENDING_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      }).rpc();
      return { signature, success: true };
    } catch (error) {
      console.error("Register deposit failed:", error);
      throw error;
    }
  }
  /**
   * Deposit USDC into the Shield Pool via Privacy Cash
   *
   * This method performs a complete privacy-preserving deposit:
   * 1. Deposits USDC to Privacy Cash
   * 2. Gets the note_commitment from Privacy Cash
   * 3. Registers the deposit on-chain
   *
   * @deprecated For more control, use depositToPrivacyCash() + registerDeposit() separately
   * @param params - Deposit parameters
   * @returns Transaction result with Privacy Cash info
   */
  async deposit(params) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.userSecret || !this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    if (!this.privacyCash) {
      throw new Error("Privacy Cash is required. Initialize with privacyCashPrivateKey.");
    }
    const pool = await this.getShieldPool();
    if (!pool) {
      throw new Error("Shield Pool not initialized");
    }
    const amount = typeof params.amount === "number" ? new BN(params.amount) : params.amount;
    const amountUsdc = Number(amount.toString()) / 1e6;
    let noteCommitment;
    try {
      const privacyResult = await this.privacyCash.depositPrivateUSDC(amountUsdc);
      console.log("Privacy Cash deposit completed:", privacyResult.tx);
      noteCommitment = new Uint8Array(32);
      const txBytes = Buffer.from(privacyResult.tx, "base64");
      noteCommitment.set(txBytes.slice(0, 32));
    } catch (error) {
      console.error("Privacy Cash deposit failed:", error);
      throw new Error(`Privacy Cash deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    const registerResult = await this.registerDeposit({
      noteCommitment,
      amount
    });
    return {
      ...registerResult,
      noteCommitment
    };
  }
  /**
   * Withdraw USDC from the Shield Pool via Privacy Cash
   *
   * All withdrawals go through Privacy Cash to preserve privacy.
   * USDC is first redeemed from Kamino, then transferred via Privacy Cash.
   *
   * @param params - Withdrawal parameters
   * @param recipient - Optional recipient address (defaults to self via Privacy Cash)
   * @returns Transaction result with Privacy Cash info
   */
  async withdraw(params, recipient) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.userSecret || !this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    if (!this.privacyCash) {
      throw new Error("Privacy Cash is required. Initialize with privacyCashPrivateKey.");
    }
    const pool = await this.getShieldPool();
    if (!pool) {
      throw new Error("Shield Pool not initialized");
    }
    const amount = typeof params.amount === "number" ? new BN(params.amount) : params.amount;
    const amountUsdc = Number(amount.toString()) / 1e6;
    const nullifier = generateNullifier(this.userSecret, "withdraw", BigInt(pool.nonce.toString()));
    const currentShares = await this.getUserShares();
    const sharesToBurn = this.calculateSharesForWithdrawal(
      amount,
      pool.totalPoolValue,
      pool.totalShares
    );
    const newShares = currentShares - sharesToBurn;
    const newEncryptedShare = createPlaceholderEncryptedShare(newShares);
    const poolAddress = this.getShieldPoolAddress();
    const [userSharePda] = getUserSharePda(poolAddress, this.userCommitment, this.programId);
    const [nullifierPda] = getNullifierPda(nullifier, this.programId);
    const [poolTokenAccountPda] = getPoolTokenAccountPda(poolAddress, this.programId);
    const [poolCtokenAccountPda] = getPoolCtokenAccountPda(poolAddress, this.programId);
    const [kaminoLendingMarketAuthority] = getKaminoLendingMarketAuthorityPda(
      KAMINO_MAIN_MARKET,
      KAMINO_LENDING_PROGRAM_ID
    );
    const kaminoReserveLiquiditySupply = await this.getKaminoReserveLiquiditySupply();
    const proof = [];
    const publicInputs = [];
    try {
      const signature = await this.program.methods.withdraw(
        amount,
        Array.from(nullifier),
        Array.from(newEncryptedShare),
        Buffer.from(proof),
        publicInputs.map((input) => Array.from(input))
      ).accounts({
        withdrawer: this.wallet.publicKey,
        shieldPool: poolAddress,
        userShare: userSharePda,
        nullifier: nullifierPda,
        poolTokenAccount: poolTokenAccountPda,
        poolCtokenAccount: poolCtokenAccountPda,
        kaminoLendingMarket: KAMINO_MAIN_MARKET,
        kaminoLendingMarketAuthority,
        kaminoReserve: KAMINO_USDC_RESERVE,
        kaminoReserveLiquiditySupply,
        kaminoReserveCollateralMint: KAMINO_CUSDC_MINT,
        kaminoProgram: KAMINO_LENDING_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      }).rpc();
      const privacyResult = await this.privacyCash.withdrawPrivateUSDC(amountUsdc, recipient);
      console.log("Privacy Cash withdrawal completed:", privacyResult.tx);
      return {
        signature,
        success: true,
        privacyCashTx: privacyResult.tx,
        privacyCashFee: privacyResult.feeBaseUnits / 1e6
      };
    } catch (error) {
      console.error("Withdraw failed:", error);
      throw error;
    }
  }
  /**
   * Get the user's current balance
   *
   * @returns Balance in shares and USDC value
   */
  async getBalance() {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    const pool = await this.getShieldPool();
    if (!pool) {
      return { shares: 0n, valueUsdc: 0n };
    }
    const shares = await this.getUserShares();
    const valueUsdc = this.calculateShareValue(
      shares,
      pool.totalPoolValue,
      pool.totalShares
    );
    return { shares, valueUsdc };
  }
  /**
   * Set up a privacy-preserving recurring payment
   *
   * The recipient address is encrypted and stored locally - NOT on-chain.
   * On-chain only stores encrypted_transfer_data that cannot reveal the recipient.
   * At execution time, the recipient is loaded from local storage and sent via Privacy Cash.
   *
   * @param params - Recurring payment parameters
   * @param options - Optional configuration
   * @returns Transaction result with transfer ID and optional Tuk Tuk cron job info
   */
  async setupRecurringPayment(params, options) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    const pool = await this.getShieldPool();
    if (!pool) {
      throw new Error("Shield Pool not initialized");
    }
    const intervalSeconds = INTERVAL_SECONDS[params.interval];
    const amount = new BN(params.amountUsdc * 10 ** USDC_DECIMALS);
    const transferNonce = new BN(pool.nonce.toString());
    const poolAddress = this.getShieldPoolAddress();
    const [userSharePda] = getUserSharePda(poolAddress, this.userCommitment, this.programId);
    const [scheduledTransferPda] = getScheduledTransferPda(
      this.userCommitment,
      BigInt(transferNonce.toString()),
      this.programId
    );
    const encryptionKey = this.userSecret.slice(0, 32);
    const encryptedTransferData = await encryptTransferData(
      params.recipientAddress.toBase58(),
      encryptionKey,
      params.memo
    );
    try {
      const signature = await this.program.methods.setupTransfer(
        Array.from(encryptedTransferData),
        amount,
        intervalSeconds,
        transferNonce
      ).accounts({
        payer: this.wallet.publicKey,
        shieldPool: poolAddress,
        userShare: userSharePda,
        scheduledTransfer: scheduledTransferPda,
        systemProgram: SystemProgram.programId
      }).rpc();
      const transferId = scheduledTransferPda.toBase58();
      const localTransferData = {
        transferId,
        recipient: params.recipientAddress.toBase58(),
        amount: params.amountUsdc,
        intervalSeconds,
        createdAt: Date.now(),
        memo: params.memo
      };
      await this.localStorage.saveTransfer(localTransferData);
      let result = {
        signature,
        success: true,
        transferId
      };
      if (options?.enableTukTukAutomation && this.tuktuk) {
        try {
          const { intervalToCronSchedule: intervalToCronSchedule2 } = await import("./tuktuk-SJ7UWURF.mjs");
          const cronSchedule = intervalToCronSchedule2(intervalSeconds);
          const jobName = `subly_transfer_${scheduledTransferPda.toBase58().slice(0, 8)}`;
          const executeTransferIx = await this.program.methods.executeTransfer(0).accounts({
            executor: this.wallet.publicKey,
            shieldPool: poolAddress,
            scheduledTransfer: scheduledTransferPda,
            systemProgram: SystemProgram.programId
          }).instruction();
          const cronResult = await this.tuktuk.createCronJob(cronSchedule, executeTransferIx, jobName);
          result.cronJobPda = cronResult.cronJobPda.toBase58();
          result.cronJobTx = cronResult.tx;
          const fundingAmount = options.cronJobFundingSol ?? 0.1;
          await this.tuktuk.fundCronJob(cronResult.cronJobPda, fundingAmount);
          console.log("Tuk Tuk cron job created:", cronResult.cronJobPda.toBase58());
        } catch (error) {
          console.warn("Failed to create Tuk Tuk cron job:", error);
        }
      }
      return result;
    } catch (error) {
      console.error("Setup recurring payment failed:", error);
      throw error;
    }
  }
  /**
   * Get the recipient address for a scheduled transfer from local storage
   *
   * @param transferId - The scheduled transfer PDA address
   * @returns Recipient address or null if not found
   */
  async getTransferRecipient(transferId) {
    const transfer = await this.localStorage.getTransfer(transferId);
    return transfer?.recipient ?? null;
  }
  /**
   * Get all scheduled transfers from local storage
   *
   * @returns List of transfer data stored locally
   */
  async getAllLocalTransfers() {
    return this.localStorage.getAllTransfers();
  }
  /**
   * Execute a scheduled transfer via Privacy Cash
   *
   * This method loads the recipient from local storage and sends via Privacy Cash.
   * On-chain, no recipient information is stored.
   *
   * @param transferId - The scheduled transfer PDA address
   * @param executionIndex - The execution index for tracking
   * @returns Transaction result with Privacy Cash info
   */
  async executeScheduledTransfer(transferId, executionIndex) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.privacyCash) {
      throw new Error("Privacy Cash is required. Initialize with privacyCashPrivateKey.");
    }
    const localTransfer = await this.localStorage.getTransfer(transferId.toBase58());
    if (!localTransfer) {
      throw new Error(`Transfer not found in local storage: ${transferId.toBase58()}. Cannot execute without recipient.`);
    }
    const privacyResult = await this.privacyCash.withdrawPrivateUSDC(
      localTransfer.amount,
      localTransfer.recipient
    );
    localTransfer.lastExecuted = Date.now();
    await this.localStorage.saveTransfer(localTransfer);
    return {
      signature: privacyResult.tx,
      // Use Privacy Cash tx as signature
      success: true,
      privacyCashTx: privacyResult.tx
    };
  }
  /**
   * Cancel a recurring payment
   *
   * @param transferId - The scheduled transfer PDA address
   * @param options - Optional configuration
   * @returns Transaction result with optional Tuk Tuk cleanup info
   */
  async cancelRecurringPayment(transferId, options) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    if (!this.userCommitment) {
      throw new Error("User not initialized. Call initializeUser() first.");
    }
    const poolAddress = this.getShieldPoolAddress();
    const [userSharePda] = getUserSharePda(poolAddress, this.userCommitment, this.programId);
    try {
      const signature = await this.program.methods.cancelTransfer().accounts({
        authority: this.wallet.publicKey,
        shieldPool: poolAddress,
        userShare: userSharePda,
        scheduledTransfer: transferId,
        systemProgram: SystemProgram.programId
      }).rpc();
      let result = {
        signature,
        success: true
      };
      if (options?.closeCronJob && options.cronJobPda && this.tuktuk) {
        try {
          await this.tuktuk.closeCronJob(options.cronJobPda);
          result.cronJobClosed = true;
          console.log("Tuk Tuk cron job closed:", options.cronJobPda.toBase58());
        } catch (error) {
          console.warn("Failed to close Tuk Tuk cron job:", error);
          result.cronJobClosed = false;
        }
      }
      return result;
    } catch (error) {
      console.error("Cancel recurring payment failed:", error);
      throw error;
    }
  }
  /**
   * Get yield information for the pool
   *
   * @returns Current APY and earned yield
   */
  async getYieldInfo() {
    const pool = await this.getShieldPool();
    if (!pool) {
      return { apy: 0, earnedUsdc: 0n };
    }
    if (this.kamino) {
      try {
        const kaminoYield = await this.kamino.getKaminoYieldInfo();
        return {
          apy: kaminoYield.apy * 100,
          // Convert decimal to percentage
          earnedUsdc: BigInt(Math.floor(kaminoYield.earnedYield * 1e6))
          // Convert to base units
        };
      } catch (error) {
        console.warn("Failed to get Kamino yield info:", error);
      }
    }
    const apy = 5;
    const earnedUsdc = 0n;
    return { apy, earnedUsdc };
  }
  // ============================================
  // Privacy Cash Integration Methods
  // ============================================
  /**
   * Deposit USDC privately using Privacy Cash
   *
   * @param amount Amount in USDC (human-readable)
   * @returns Transaction signature
   */
  async depositPrivate(amount) {
    if (!this.privacyCash) {
      throw new Error("Privacy Cash not initialized. Enable it during initialize()");
    }
    return this.privacyCash.depositPrivateUSDC(amount);
  }
  /**
   * Withdraw USDC privately using Privacy Cash
   *
   * @param amount Amount in USDC (human-readable)
   * @param recipient Optional recipient address
   * @returns Withdrawal result
   */
  async withdrawPrivate(amount, recipient) {
    if (!this.privacyCash) {
      throw new Error("Privacy Cash not initialized. Enable it during initialize()");
    }
    const result = await this.privacyCash.withdrawPrivateUSDC(amount, recipient);
    return {
      tx: result.tx,
      amountReceived: result.baseUnits / 1e6,
      fee: result.feeBaseUnits / 1e6
    };
  }
  /**
   * Get private USDC balance from Privacy Cash
   *
   * @returns Balance in USDC
   */
  async getPrivateBalance() {
    if (!this.privacyCash) {
      throw new Error("Privacy Cash not initialized. Enable it during initialize()");
    }
    return this.privacyCash.getPrivateUSDCBalance();
  }
  // ============================================
  // Tuk Tuk Automation Methods
  // ============================================
  /**
   * Check for pending transfers that are due for execution
   *
   * @param scheduledTransferPdas List of scheduled transfer PDAs to check
   * @returns List of pending transfers
   */
  async checkPendingTransfers(scheduledTransferPdas) {
    if (!this.tuktuk) {
      throw new Error("Tuk Tuk not initialized. Enable it during initialize()");
    }
    return this.tuktuk.checkPendingTransfers(scheduledTransferPdas);
  }
  /**
   * Manually execute a pending transfer
   * Use this when Tuk Tuk automation is not active
   *
   * @param transferId Transfer ID (PDA address as string)
   * @param executeTransferIx The execute_transfer instruction
   * @returns Transaction signature
   */
  async executePendingTransfer(transferId, executeTransferIx) {
    if (!this.tuktuk) {
      throw new Error("Tuk Tuk not initialized. Enable it during initialize()");
    }
    return this.tuktuk.executePendingTransfer(transferId, executeTransferIx);
  }
  // ============================================
  // Kamino Yield Methods
  // ============================================
  /**
   * Deposit to Kamino Lending for yield generation
   *
   * @param amount Amount in USDC
   * @returns Deposit result
   */
  async depositToKamino(amount) {
    if (!this.kamino) {
      throw new Error("Kamino not initialized. Enable it during initialize()");
    }
    const result = await this.kamino.depositToKamino(amount);
    return { tx: result.tx };
  }
  /**
   * Withdraw from Kamino Lending
   *
   * @param amount Amount in USDC
   * @returns Withdrawal result
   */
  async withdrawFromKamino(amount) {
    if (!this.kamino) {
      throw new Error("Kamino not initialized. Enable it during initialize()");
    }
    const result = await this.kamino.withdrawFromKamino(amount);
    return { tx: result.tx };
  }
  /**
   * Get detailed yield information from Kamino
   *
   * @returns Kamino yield info
   */
  async getKaminoYieldInfo() {
    if (!this.kamino) {
      throw new Error("Kamino not initialized. Enable it during initialize()");
    }
    return this.kamino.getKaminoYieldInfo();
  }
  // ============================================
  // Pool Value Management
  // ============================================
  /**
   * Update the pool's total value based on Kamino yield
   *
   * This reads the current cToken balance and calculates the equivalent
   * USDC value. Should be called periodically (e.g., daily) by the pool authority.
   *
   * @param exchangeRateNumerator - Current Kamino exchange rate numerator
   * @param exchangeRateDenominator - Current Kamino exchange rate denominator
   * @returns Transaction result
   */
  async updatePoolValue(exchangeRateNumerator, exchangeRateDenominator) {
    if (!this.program) throw new Error("SDK not initialized. Call initialize() first.");
    const poolAddress = this.getShieldPoolAddress();
    const [poolTokenAccountPda] = getPoolTokenAccountPda(poolAddress, this.programId);
    const [poolCtokenAccountPda] = getPoolCtokenAccountPda(poolAddress, this.programId);
    try {
      const signature = await this.program.methods.updatePoolValue(exchangeRateNumerator, exchangeRateDenominator).accounts({
        authority: this.wallet.publicKey,
        shieldPool: poolAddress,
        poolCtokenAccount: poolCtokenAccountPda,
        poolTokenAccount: poolTokenAccountPda
      }).rpc();
      return { signature, success: true };
    } catch (error) {
      console.error("Update pool value failed:", error);
      throw error;
    }
  }
  /**
   * Get the actual pool value including Kamino yield
   *
   * Calculates the current value by reading cToken balance and applying
   * the current exchange rate.
   *
   * @returns Pool value in USDC (base units)
   */
  async getActualPoolValue() {
    if (!this.kamino) {
      const pool = await this.getShieldPool();
      return pool ? BigInt(pool.totalPoolValue.toString()) : 0n;
    }
    try {
      const yieldInfo = await this.kamino.getKaminoYieldInfo();
      return BigInt(Math.floor(yieldInfo.currentValue * 1e6));
    } catch (error) {
      console.warn("Failed to get actual pool value from Kamino:", error);
      const pool = await this.getShieldPool();
      return pool ? BigInt(pool.totalPoolValue.toString()) : 0n;
    }
  }
  // ============================================
  // Private helper methods
  // ============================================
  /**
   * Get Kamino reserve liquidity supply address
   * This is the token account where USDC liquidity is stored in the reserve
   */
  async getKaminoReserveLiquiditySupply() {
    try {
      if (this.kamino) {
        const klendSdk = await import("@kamino-finance/klend-sdk");
      }
    } catch {
    }
    return new PublicKey6("BDdS2G7cZPVxJNkHqTEMHk8WkFvhGNm3X1sNzTMPaLbk");
  }
  /**
   * Get user's share account
   */
  async getUserShareAccount() {
    if (!this.program || !this.userCommitment) return null;
    try {
      const poolAddress = this.getShieldPoolAddress();
      const [userSharePda] = getUserSharePda(poolAddress, this.userCommitment, this.programId);
      const userShare = await this.program.account.userShare.fetch(userSharePda);
      return userShare;
    } catch {
      return null;
    }
  }
  /**
   * Get user's current shares (decrypted)
   */
  async getUserShares() {
    const userShare = await this.getUserShareAccount();
    if (!userShare) return 0n;
    return readPlaceholderShares(new Uint8Array(userShare.encryptedShareAmount));
  }
  /**
   * Calculate shares to mint for a deposit
   */
  calculateSharesForDeposit(depositAmount, totalPoolValue, totalShares) {
    if (totalPoolValue.isZero() || totalShares.isZero()) {
      return BigInt(depositAmount.toString());
    }
    const shares = depositAmount.mul(totalShares).div(totalPoolValue);
    return BigInt(shares.toString());
  }
  /**
   * Calculate shares to burn for a withdrawal
   */
  calculateSharesForWithdrawal(withdrawalAmount, totalPoolValue, totalShares) {
    if (totalPoolValue.isZero()) return 0n;
    const shares = withdrawalAmount.mul(totalShares).div(totalPoolValue);
    return BigInt(shares.toString());
  }
  /**
   * Calculate the value of shares in USDC
   */
  calculateShareValue(shares, totalPoolValue, totalShares) {
    if (totalShares.isZero()) return 0n;
    const value = new BN(shares.toString()).mul(totalPoolValue).div(totalShares);
    return BigInt(value.toString());
  }
};
function createSublyVaultClient(connection, wallet, config) {
  return new SublyVaultClient(connection, wallet, PROGRAM_ID, config);
}

// src/idl/subly_vault.ts
var PROGRAM_ADDRESS = "BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL";
function getIdl() {
  return {
    address: PROGRAM_ADDRESS,
    metadata: {
      name: "subly_vault",
      version: "0.1.0",
      spec: "0.1.0",
      description: "Subly Vault - Privacy-first subscription payment protocol for Solana Mainnet with Kamino yield integration"
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
          { name: "systemProgram" }
        ],
        args: []
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
          { name: "systemProgram" }
        ],
        args: [
          { name: "noteCommitment", type: { array: ["u8", 32] } },
          { name: "userCommitment", type: { array: ["u8", 32] } },
          { name: "encryptedShare", type: { array: ["u8", 64] } },
          { name: "amount", type: "u64" }
        ]
      },
      {
        name: "deposit",
        discriminator: [],
        accounts: [
          { name: "depositor", writable: true, signer: true },
          { name: "shieldPool", writable: true },
          { name: "userShare", writable: true },
          { name: "depositHistory", writable: true },
          { name: "systemProgram" }
        ],
        args: [
          { name: "amount", type: "u64" },
          { name: "commitment", type: { array: ["u8", 32] } },
          { name: "encryptedShare", type: { array: ["u8", 64] } },
          { name: "_depositIndex", type: "u64" }
        ]
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
          { name: "systemProgram" }
        ],
        args: [
          { name: "amount", type: "u64" },
          { name: "nullifierHash", type: { array: ["u8", 32] } },
          { name: "newEncryptedShare", type: { array: ["u8", 64] } },
          { name: "_proof", type: "bytes" },
          { name: "_publicInputs", type: { vec: { array: ["u8", 32] } } }
        ]
      },
      {
        name: "setupTransfer",
        discriminator: [],
        accounts: [
          { name: "payer", writable: true, signer: true },
          { name: "shieldPool" },
          { name: "userShare" },
          { name: "scheduledTransfer", writable: true },
          { name: "systemProgram" }
        ],
        args: [
          { name: "encryptedTransferData", type: { array: ["u8", 128] } },
          { name: "amount", type: "u64" },
          { name: "intervalSeconds", type: "u32" },
          { name: "_transferNonce", type: "u64" }
        ]
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
          { name: "systemProgram" }
        ],
        args: [{ name: "executionIndex", type: "u32" }]
      },
      {
        name: "cancelTransfer",
        discriminator: [],
        accounts: [
          { name: "authority", writable: true, signer: true },
          { name: "shieldPool" },
          { name: "userShare" },
          { name: "scheduledTransfer", writable: true },
          { name: "systemProgram" }
        ],
        args: []
      },
      {
        name: "updatePoolValue",
        discriminator: [],
        accounts: [
          { name: "authority", signer: true },
          { name: "shieldPool", writable: true },
          { name: "poolCtokenAccount" },
          { name: "poolTokenAccount" }
        ],
        args: [
          { name: "exchangeRateNumerator", type: "u64" },
          { name: "exchangeRateDenominator", type: "u64" }
        ]
      }
    ],
    accounts: [
      { name: "ShieldPool", discriminator: [] },
      { name: "UserShare", discriminator: [] },
      { name: "DepositHistory", discriminator: [] },
      { name: "Nullifier", discriminator: [] },
      { name: "ScheduledTransfer", discriminator: [] },
      { name: "TransferHistory", discriminator: [] },
      { name: "BatchProofStorage", discriminator: [] },
      { name: "NoteCommitmentRegistry", discriminator: [] }
    ],
    errors: [
      { code: 6e3, name: "InsufficientDeposit", msg: "Deposit amount is below minimum" },
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
      { code: 6014, name: "InvalidAccount", msg: "Invalid account" }
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
            { name: "_reserved", type: { array: ["u8", 64] } }
          ]
        }
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
            { name: "_reserved", type: { array: ["u8", 32] } }
          ]
        }
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
            { name: "_reserved", type: { array: ["u8", 31] } }
          ]
        }
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
            { name: "_reserved", type: { array: ["u8", 32] } }
          ]
        }
      },
      {
        name: "TransferStatus",
        type: {
          kind: "enum",
          variants: [
            { name: "Pending" },
            { name: "Completed" },
            { name: "Failed" },
            { name: "Skipped" }
          ]
        }
      },
      {
        name: "OperationType",
        type: {
          kind: "enum",
          variants: [
            { name: "Withdraw" },
            { name: "Transfer" }
          ]
        }
      }
    ]
  };
}
export {
  BATCH_PROOF_SEED2 as BATCH_PROOF_SEED,
  DEPOSIT_HISTORY_SEED2 as DEPOSIT_HISTORY_SEED,
  INTERVAL_SECONDS,
  KAMINO_CUSDC_MINT,
  KAMINO_LENDING_PROGRAM_ID2 as KAMINO_LENDING_PROGRAM_ID,
  KAMINO_MAIN_MARKET2 as KAMINO_MAIN_MARKET,
  KAMINO_USDC_RESERVE,
  KEY_DERIVATION_MESSAGE,
  KaminoError,
  KaminoIntegration,
  LocalStorageManager,
  NOTE_COMMITMENT_REGISTRY_SEED2 as NOTE_COMMITMENT_REGISTRY_SEED,
  NULLIFIER_SEED2 as NULLIFIER_SEED,
  OperationType,
  POOL_CTOKEN_ACCOUNT_SEED,
  POOL_TOKEN_ACCOUNT_SEED,
  PRIVACY_CASH_PROGRAM_ID,
  USDC_MINT as PRIVACY_CASH_USDC_MINT,
  PROGRAM_ID,
  PrivacyCashError,
  PrivacyCashIntegration,
  SCHEDULED_TRANSFER_SEED2 as SCHEDULED_TRANSFER_SEED,
  SHIELD_POOL_SEED2 as SHIELD_POOL_SEED,
  SublyVaultClient,
  TRANSFER_HISTORY_SEED2 as TRANSFER_HISTORY_SEED,
  TUKTUK_CRON_PROGRAM_ID,
  TUKTUK_PROGRAM_ID,
  TransferStatus,
  TukTukError,
  TukTukIntegration,
  USDC_DECIMALS,
  USDC_MINT_MAINNET,
  USER_SHARE_SEED2 as USER_SHARE_SEED,
  createKaminoIntegration,
  createPlaceholderEncryptedShare,
  createPrivacyCashIntegration,
  createSublyVaultClient,
  createTukTukIntegration,
  decryptShares,
  decryptTransferData,
  deriveEncryptionKey,
  encryptShares,
  encryptTransferData,
  generateCommitment,
  generateNullifier,
  generateSecret,
  getBatchProofPda,
  getDepositHistoryPda,
  getIdl,
  getNoteCommitmentRegistryPda,
  getNullifierPda,
  getScheduledTransferPda,
  getShieldPoolPda,
  getTransferHistoryPda,
  getUserSharePda,
  intervalToCronSchedule,
  readPlaceholderShares,
  retrieveSecret,
  storeSecret,
  verifyCommitment
};
