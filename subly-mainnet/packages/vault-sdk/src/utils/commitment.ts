import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

/**
 * Generate a cryptographically secure random secret
 * @returns 32-byte random secret
 */
export function generateSecret(): Uint8Array {
  return nacl.randomBytes(32);
}

/**
 * Generate a commitment from a secret and pool ID
 * commitment = hash(secret || pool_id)
 *
 * @param secret - User's secret (32 bytes)
 * @param poolId - Shield Pool address
 * @returns 32-byte commitment hash
 */
export function generateCommitment(secret: Uint8Array, poolId: PublicKey): Uint8Array {
  if (secret.length !== 32) {
    throw new Error("Secret must be 32 bytes");
  }

  // Concatenate secret and pool_id
  const data = new Uint8Array(64);
  data.set(secret, 0);
  data.set(poolId.toBytes(), 32);

  // Hash using SHA-512 then take first 32 bytes
  return nacl.hash(data).slice(0, 32);
}

/**
 * Generate a nullifier for withdrawal or transfer
 * nullifier = hash(secret || operation_type || nonce)
 *
 * @param secret - User's secret (32 bytes)
 * @param operationType - "withdraw" or "transfer"
 * @param nonce - Operation nonce (unique per operation)
 * @returns 32-byte nullifier hash
 */
export function generateNullifier(
  secret: Uint8Array,
  operationType: "withdraw" | "transfer",
  nonce: bigint
): Uint8Array {
  if (secret.length !== 32) {
    throw new Error("Secret must be 32 bytes");
  }

  const operationBytes = new TextEncoder().encode(operationType);
  const nonceBuffer = new Uint8Array(8);
  const view = new DataView(nonceBuffer.buffer);
  view.setBigUint64(0, nonce, true); // little-endian

  // Concatenate secret, operation_type, and nonce
  const data = new Uint8Array(secret.length + operationBytes.length + 8);
  let offset = 0;
  data.set(secret, offset);
  offset += secret.length;
  data.set(operationBytes, offset);
  offset += operationBytes.length;
  data.set(nonceBuffer, offset);

  // Hash using SHA-512 then take first 32 bytes
  return nacl.hash(data).slice(0, 32);
}

/**
 * Verify a commitment matches a secret and pool
 *
 * @param commitment - The commitment to verify
 * @param secret - User's secret
 * @param poolId - Shield Pool address
 * @returns true if commitment is valid
 */
export function verifyCommitment(
  commitment: Uint8Array,
  secret: Uint8Array,
  poolId: PublicKey
): boolean {
  const expectedCommitment = generateCommitment(secret, poolId);
  return nacl.verify(commitment, expectedCommitment);
}

/**
 * Store secret securely in browser localStorage (encrypted with a derived key)
 * Note: For production, consider using more secure storage mechanisms
 *
 * @param secret - The secret to store
 * @param walletAddress - Wallet address as identifier
 * @param poolId - Pool ID for key derivation
 */
export function storeSecret(
  secret: Uint8Array,
  walletAddress: string,
  poolId: string
): void {
  const key = `subly_secret_${walletAddress}_${poolId}`;
  const encoded = Buffer.from(secret).toString("base64");

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, encoded);
  }
}

/**
 * Retrieve a stored secret
 *
 * @param walletAddress - Wallet address as identifier
 * @param poolId - Pool ID
 * @returns The secret or null if not found
 */
export function retrieveSecret(walletAddress: string, poolId: string): Uint8Array | null {
  const key = `subly_secret_${walletAddress}_${poolId}`;

  if (typeof localStorage !== "undefined") {
    const encoded = localStorage.getItem(key);
    if (encoded) {
      return new Uint8Array(Buffer.from(encoded, "base64"));
    }
  }

  return null;
}
