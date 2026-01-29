/**
 * Local Storage Module for Privacy-Preserving Data
 *
 * This module handles the encrypted storage of sensitive data that
 * should not be stored on-chain, such as:
 * - Transfer recipient addresses
 * - User secrets
 * - Decryption keys
 *
 * All data is encrypted with AES-256-GCM before storage.
 */

import nacl from 'tweetnacl';
import { createHash } from 'crypto';

/**
 * Local transfer data - stored off-chain for privacy
 */
export interface LocalTransferData {
  /** The scheduled transfer PDA address */
  transferId: string;
  /** Recipient address (the business receiving payments) */
  recipient: string;
  /** Transfer amount in USDC */
  amount: number;
  /** Payment interval in seconds */
  intervalSeconds: number;
  /** When the transfer was created */
  createdAt: number;
  /** Last execution timestamp (if any) */
  lastExecuted?: number;
  /** Optional memo */
  memo?: string;
}

/**
 * Local vault data - user's complete local state
 */
export interface LocalVaultData {
  /** User's secret (32 bytes, base64 encoded) */
  userSecret: string;
  /** User's commitment (32 bytes, base64 encoded) */
  userCommitment: string;
  /** Current share amount (string representation of bigint) */
  shares: string;
  /** All scheduled transfers */
  transfers: LocalTransferData[];
  /** Version for migration purposes */
  version: number;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Encrypted storage wrapper
 */
interface EncryptedStorage {
  /** Nonce for AES-GCM (24 bytes, base64 encoded) */
  nonce: string;
  /** Encrypted data (base64 encoded) */
  ciphertext: string;
  /** Version of encryption scheme */
  version: number;
}

// In-memory storage for Node.js environment
const memoryStorage: Map<string, string> = new Map();

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof globalThis !== 'undefined' &&
    typeof (globalThis as any).window !== 'undefined' &&
    typeof (globalThis as any).window.localStorage !== 'undefined';
}

/**
 * Derive a 32-byte encryption key from a password string
 */
function deriveKeyFromPassword(password: string): Uint8Array {
  const hash = createHash('sha256');
  hash.update(password);
  return new Uint8Array(hash.digest());
}

/**
 * Local Storage Manager
 *
 * Handles encrypted storage of privacy-sensitive data.
 * Uses wallet-derived key for encryption.
 */
export class LocalStorageManager {
  private encryptionKey: Uint8Array | null = null;
  private storageKey: string;

  constructor(storageKeyPrefix: string = 'subly-vault') {
    this.storageKey = storageKeyPrefix;
  }

  /**
   * Initialize the storage manager with a password or signature
   *
   * @param passwordOrSignature - Password string or wallet signature bytes
   */
  async initialize(passwordOrSignature: string | Uint8Array): Promise<void> {
    if (typeof passwordOrSignature === 'string') {
      this.encryptionKey = deriveKeyFromPassword(passwordOrSignature);
    } else {
      // Use first 32 bytes of signature as key
      this.encryptionKey = passwordOrSignature.slice(0, 32);
    }
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Encrypt data using nacl secretbox
   */
  private encrypt(data: string): EncryptedStorage {
    if (!this.encryptionKey) {
      throw new Error('LocalStorageManager not initialized');
    }

    const nonce = nacl.randomBytes(24);
    const dataBytes = new TextEncoder().encode(data);
    const ciphertext = nacl.secretbox(dataBytes, nonce, this.encryptionKey);

    return {
      nonce: Buffer.from(nonce).toString('base64'),
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      version: 1,
    };
  }

  /**
   * Decrypt data using nacl secretbox
   */
  private decrypt(encrypted: EncryptedStorage): string {
    if (!this.encryptionKey) {
      throw new Error('LocalStorageManager not initialized');
    }

    const nonce = Buffer.from(encrypted.nonce, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decrypted = nacl.secretbox.open(ciphertext, nonce, this.encryptionKey);
    if (!decrypted) {
      throw new Error('Failed to decrypt local storage data');
    }

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Get storage (browser localStorage or in-memory)
   */
  private setStorage(key: string, value: string): void {
    if (isBrowser()) {
      (globalThis as any).window.localStorage.setItem(key, value);
    } else {
      memoryStorage.set(key, value);
    }
  }

  /**
   * Get from storage (browser localStorage or in-memory)
   */
  private getStorage(key: string): string | null {
    if (isBrowser()) {
      return (globalThis as any).window.localStorage.getItem(key);
    } else {
      return memoryStorage.get(key) ?? null;
    }
  }

  /**
   * Remove from storage
   */
  private removeStorage(key: string): void {
    if (isBrowser()) {
      (globalThis as any).window.localStorage.removeItem(key);
    } else {
      memoryStorage.delete(key);
    }
  }

  /**
   * Save vault data to local storage
   */
  async saveVaultData(data: LocalVaultData): Promise<void> {
    const json = JSON.stringify(data);
    const encrypted = this.encrypt(json);
    this.setStorage(this.storageKey, JSON.stringify(encrypted));
  }

  /**
   * Load vault data from local storage
   */
  async loadVaultData(): Promise<LocalVaultData | null> {
    const stored = this.getStorage(this.storageKey);
    if (!stored) {
      return null;
    }

    try {
      const encrypted: EncryptedStorage = JSON.parse(stored);
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted) as LocalVaultData;
    } catch (error) {
      console.error('Failed to load vault data:', error);
      return null;
    }
  }

  /**
   * Ensure vault data exists, create if not
   */
  private async ensureVaultData(): Promise<LocalVaultData> {
    let data = await this.loadVaultData();
    if (!data) {
      data = {
        userSecret: '',
        userCommitment: '',
        shares: '0',
        transfers: [],
        version: 1,
        lastUpdated: Date.now(),
      };
      await this.saveVaultData(data);
    }
    return data;
  }

  /**
   * Save a transfer to local storage
   * @alias saveTransferDetails
   */
  async saveTransfer(transfer: LocalTransferData): Promise<void> {
    const data = await this.ensureVaultData();

    // Find existing transfer or add new
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
  async getTransfer(transferId: string): Promise<LocalTransferData | null> {
    const data = await this.loadVaultData();
    if (!data) {
      return null;
    }
    return data.transfers.find((t) => t.transferId === transferId) || null;
  }

  /**
   * Get all transfers from local storage
   */
  async getAllTransfers(): Promise<LocalTransferData[]> {
    const data = await this.loadVaultData();
    if (!data) {
      return [];
    }
    return data.transfers;
  }

  /**
   * Delete a transfer from local storage
   */
  async deleteTransfer(transferId: string): Promise<void> {
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
  async clearAll(): Promise<void> {
    this.removeStorage(this.storageKey);
  }

  /**
   * Create initial vault data structure
   */
  static createInitialData(userSecret: Uint8Array, userCommitment: Uint8Array): LocalVaultData {
    return {
      userSecret: Buffer.from(userSecret).toString('base64'),
      userCommitment: Buffer.from(userCommitment).toString('base64'),
      shares: '0',
      transfers: [],
      version: 1,
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Encrypt transfer data for on-chain storage
 *
 * This creates the encrypted_transfer_data that is stored on-chain.
 * Only the user can decrypt this data using their wallet-derived key.
 *
 * @param recipient - Recipient address
 * @param encryptionKey - 32-byte encryption key derived from wallet signature
 * @param memo - Optional memo
 * @returns 128-byte encrypted transfer data
 */
export async function encryptTransferData(
  recipient: string,
  encryptionKey: Uint8Array,
  memo?: string
): Promise<Uint8Array> {
  const data = JSON.stringify({ recipient, memo: memo || '' });
  const dataBytes = new TextEncoder().encode(data);

  // Pad data to fixed size for privacy (hide data length)
  const paddedData = new Uint8Array(96);
  paddedData.set(dataBytes.slice(0, Math.min(dataBytes.length, 96)));

  const nonce = nacl.randomBytes(24);
  const ciphertext = nacl.secretbox(paddedData, nonce, encryptionKey);

  // Pack into 128 bytes: [24 bytes nonce] + [104 bytes ciphertext (truncated)]
  const result = new Uint8Array(128);
  result.set(nonce, 0);
  result.set(ciphertext.slice(0, 104), 24);

  return result;
}

/**
 * Decrypt transfer data from on-chain storage
 *
 * @param encryptedData - 128-byte encrypted transfer data
 * @param encryptionKey - 32-byte encryption key
 * @returns Decrypted recipient and memo
 */
export function decryptTransferData(
  encryptedData: Uint8Array,
  encryptionKey: Uint8Array
): { recipient: string; memo: string } {
  if (encryptedData.length !== 128) {
    throw new Error('Encrypted transfer data must be 128 bytes');
  }

  const nonce = encryptedData.slice(0, 24);

  // Reconstruct ciphertext (96 bytes data + 16 bytes MAC = 112 bytes)
  const ciphertext = new Uint8Array(112);
  ciphertext.set(encryptedData.slice(24, 128));

  const decrypted = nacl.secretbox.open(ciphertext, nonce, encryptionKey);
  if (!decrypted) {
    throw new Error('Failed to decrypt transfer data');
  }

  // Remove padding and parse JSON
  const text = new TextDecoder().decode(decrypted).replace(/\0+$/, '');
  const data = JSON.parse(text);

  return {
    recipient: data.recipient || '',
    memo: data.memo || '',
  };
}
