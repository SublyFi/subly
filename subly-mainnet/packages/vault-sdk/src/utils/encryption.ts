import nacl from "tweetnacl";

/**
 * ECIES-like encryption utilities for share amounts
 *
 * The encrypted share format is:
 * [32 bytes nonce] + [32 bytes ciphertext]
 *
 * The encryption key is derived from a wallet signature to ensure
 * only the user can decrypt their share amount.
 */

/**
 * Derive an encryption key from a wallet signature
 * This is used to encrypt/decrypt share amounts
 *
 * @param signatureMessage - A message to sign with the wallet
 * @param signature - The wallet's signature of the message
 * @returns 32-byte symmetric encryption key
 */
export function deriveEncryptionKey(signature: Uint8Array): Uint8Array {
  // Hash the signature to get a 32-byte key
  return nacl.hash(signature).slice(0, 32);
}

/**
 * Encrypt a share amount
 *
 * @param shares - The share amount to encrypt (as a bigint)
 * @param encryptionKey - 32-byte encryption key
 * @returns 64-byte encrypted data [nonce (32) + ciphertext (32)]
 */
export function encryptShares(shares: bigint, encryptionKey: Uint8Array): Uint8Array {
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }

  // Convert shares to bytes (8 bytes for u64)
  const sharesBytes = new Uint8Array(8);
  const view = new DataView(sharesBytes.buffer);
  view.setBigUint64(0, shares, true); // little-endian

  // Generate a random nonce (24 bytes for secretbox, but we'll use 32 for padding)
  const nonce = nacl.randomBytes(24);

  // Encrypt using secretbox
  const ciphertext = nacl.secretbox(sharesBytes, nonce, encryptionKey);

  // Pack into 64 bytes: [32 bytes nonce (padded)] + [remaining bytes for ciphertext]
  const result = new Uint8Array(64);
  result.set(nonce, 0); // First 24 bytes
  // Pad nonce to 32 bytes with zeros (bytes 24-31)
  result.set(ciphertext.slice(0, 32), 32); // Ciphertext (may be truncated)

  return result;
}

/**
 * Decrypt a share amount
 *
 * @param encryptedData - 64-byte encrypted data
 * @param encryptionKey - 32-byte encryption key
 * @returns The decrypted share amount as a bigint
 */
export function decryptShares(encryptedData: Uint8Array, encryptionKey: Uint8Array): bigint {
  if (encryptedData.length !== 64) {
    throw new Error("Encrypted data must be 64 bytes");
  }
  if (encryptionKey.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }

  // Extract nonce (first 24 bytes)
  const nonce = encryptedData.slice(0, 24);

  // For this simplified implementation, we need to reconstruct the ciphertext
  // The actual ciphertext length for 8 bytes of data + 16 bytes MAC = 24 bytes
  const ciphertext = new Uint8Array(24); // secretbox overhead is 16 bytes
  ciphertext.set(encryptedData.slice(32, 56)); // Take 24 bytes from offset 32

  // Decrypt
  const decrypted = nacl.secretbox.open(ciphertext, nonce, encryptionKey);
  if (!decrypted) {
    throw new Error("Decryption failed");
  }

  // Convert bytes back to bigint
  const view = new DataView(decrypted.buffer, decrypted.byteOffset, 8);
  return view.getBigUint64(0, true); // little-endian
}

/**
 * Create a placeholder encrypted share (for testing/demo)
 * This creates a properly formatted 64-byte array
 *
 * @param shares - Share amount
 * @returns 64-byte array with shares encoded (not encrypted)
 */
export function createPlaceholderEncryptedShare(shares: bigint): Uint8Array {
  const result = new Uint8Array(64);

  // Put shares in the first 8 bytes for easy reading in tests
  const view = new DataView(result.buffer);
  view.setBigUint64(0, shares, true);

  return result;
}

/**
 * Read shares from a placeholder encrypted share
 *
 * @param data - 64-byte encrypted data
 * @returns Share amount
 */
export function readPlaceholderShares(data: Uint8Array): bigint {
  if (data.length !== 64) {
    throw new Error("Data must be 64 bytes");
  }

  const view = new DataView(data.buffer, data.byteOffset, 8);
  return view.getBigUint64(0, true);
}

/**
 * Message to sign for key derivation
 */
export const KEY_DERIVATION_MESSAGE =
  "Sign this message to derive your Subly Vault encryption key.\n\nThis signature will be used to encrypt and decrypt your private balance.\n\nIt will not trigger any blockchain transaction or cost any fees.";
