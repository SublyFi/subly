import {
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getCompDefAccAddress,
  getClusterAccAddress,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { ARCIUM_CLUSTER_OFFSET, PROGRAM_ID } from "./constants";

/**
 * Context for Arcium encryption/decryption
 */
export interface ArciumContext {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  sharedSecret: Uint8Array;
  cipher: RescueCipher;
}

/**
 * Get MXE public key with retry logic
 */
export async function getMXEPublicKeyWithRetry(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID,
  maxRetries: number = 10
): Promise<Uint8Array> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mxePubkey = await getMXEPublicKey({ connection } as any, programId);
      if (mxePubkey) return mxePubkey;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Failed to fetch MXE public key after retries");
}

/**
 * Create Arcium encryption context
 */
export async function createArciumContext(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<ArciumContext> {
  const mxePubkey = await getMXEPublicKeyWithRetry(connection, programId);

  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePubkey);
  const cipher = new RescueCipher(sharedSecret);

  return { privateKey, publicKey, sharedSecret, cipher };
}

/**
 * Generate random nonce for encryption
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Deserialize little-endian bytes to bigint
 */
export function deserializeLE(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Encrypt an amount using the Arcium cipher
 */
export function encryptAmount(
  cipher: RescueCipher,
  amount: bigint,
  nonce: Uint8Array
): Uint8Array {
  const [ciphertext] = cipher.encrypt([amount], nonce);
  return new Uint8Array(ciphertext);
}

/**
 * Decrypt a balance using the Arcium cipher
 */
export function decryptBalance(
  cipher: RescueCipher,
  encryptedBalance: number[] | Uint8Array,
  nonce: Uint8Array
): bigint {
  const encryptedArray = Array.isArray(encryptedBalance)
    ? encryptedBalance
    : Array.from(encryptedBalance);
  const [decrypted] = cipher.decrypt([encryptedArray], nonce);
  return decrypted;
}

/**
 * Get Arcium account addresses for transaction construction
 */
export function getArciumAccounts(
  programId: PublicKey = PROGRAM_ID,
  compDefOffset: number,
  computationOffset: BN
) {
  const mxeAccount = getMXEAccAddress(programId);
  const mempoolAccount = getMempoolAccAddress(ARCIUM_CLUSTER_OFFSET);
  const executingPool = getExecutingPoolAccAddress(ARCIUM_CLUSTER_OFFSET);
  const computationAccount = getComputationAccAddress(
    ARCIUM_CLUSTER_OFFSET,
    computationOffset
  );
  const compDefAccount = getCompDefAccAddress(programId, compDefOffset);
  const clusterAccount = getClusterAccAddress(ARCIUM_CLUSTER_OFFSET);

  return {
    mxeAccount,
    mempoolAccount,
    executingPool,
    computationAccount,
    compDefAccount,
    clusterAccount,
  };
}

/**
 * Generate a random computation offset
 */
export function generateComputationOffset(): BN {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return new BN(Array.from(bytes));
}
