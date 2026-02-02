import {
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getArciumAccountBaseSeed,
  getCompDefAccOffset,
  getArciumProgramId,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { ARCIUM_CLUSTER_OFFSET, PROGRAM_ID } from "./constants";

/**
 * Message used for deriving deterministic encryption keys.
 * IMPORTANT: Do not change this message as it would break existing encrypted data.
 */
export const ENCRYPTION_SIGNING_MESSAGE =
  "Subly Privacy Subscriptions - Encryption Key Derivation v1";

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
 * Derive deterministic X25519 encryption key from a wallet signature.
 *
 * This ensures the same wallet always produces the same encryption key,
 * allowing decryption of previously encrypted data across sessions.
 *
 * @param signature - The signature from wallet.signMessage()
 * @returns X25519 keypair (privateKey and publicKey)
 */
export async function deriveEncryptionKeyFromSignature(
  signature: Uint8Array
): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
  // Use SHA-256 to derive a 32-byte private key from the signature
  // Create a fresh ArrayBuffer to satisfy TypeScript's stricter type checking
  const signatureArray = new Uint8Array(signature);
  const hashBuffer = await crypto.subtle.digest("SHA-256", signatureArray);
  const privateKey = new Uint8Array(hashBuffer);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Create Arcium encryption context from a wallet signature (deterministic).
 *
 * This is the recommended way to create an Arcium context for client applications.
 * The same wallet signature will always produce the same encryption keys.
 *
 * @param connection - Solana connection
 * @param signature - The signature from wallet.signMessage(ENCRYPTION_SIGNING_MESSAGE)
 * @param programId - Program ID (defaults to PROGRAM_ID)
 * @returns ArciumContext with deterministically derived keys
 */
export async function createArciumContextFromSignature(
  connection: Connection,
  signature: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): Promise<ArciumContext> {
  const mxePubkey = await getMXEPublicKeyWithRetry(connection, programId);

  // Derive deterministic keys from signature
  const { privateKey, publicKey } = await deriveEncryptionKeyFromSignature(signature);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePubkey);
  const cipher = new RescueCipher(sharedSecret);

  return { privateKey, publicKey, sharedSecret, cipher };
}

/**
 * Create Arcium encryption context with random keys (legacy).
 *
 * WARNING: This function generates random keys each time it's called.
 * Use createArciumContextFromSignature for production applications.
 *
 * @deprecated Use createArciumContextFromSignature for deterministic key derivation
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
 * Decrypt one or more values using the Arcium cipher
 */
export function decryptValues(
  cipher: RescueCipher,
  encryptedValues: Array<number[] | Uint8Array>,
  nonce: Uint8Array
): bigint[] {
  const ciphertexts = encryptedValues.map((value) =>
    Array.isArray(value) ? value : Array.from(value)
  );
  return cipher.decrypt(ciphertexts, nonce);
}

/**
 * Decrypt a single value using the Arcium cipher
 */
export function decryptValue(
  cipher: RescueCipher,
  encryptedValue: number[] | Uint8Array,
  nonce: Uint8Array
): bigint {
  return decryptValues(cipher, [encryptedValue], nonce)[0];
}

/**
 * Decrypt a balance (alias for decryptValue)
 */
export function decryptBalance(
  cipher: RescueCipher,
  encryptedBalance: number[] | Uint8Array,
  nonce: Uint8Array
): bigint {
  return decryptValue(cipher, encryptedBalance, nonce);
}

/**
 * Split a PublicKey into two u128 values (little-endian)
 */
export function pubkeyToU128s(pubkey: PublicKey): [bigint, bigint] {
  const bytes = pubkey.toBytes();
  const toU128 = (slice: Uint8Array): bigint => {
    let out = BigInt(0);
    for (let i = 0; i < slice.length; i++) {
      out |= BigInt(slice[i]) << BigInt(8 * i);
    }
    return out;
  };
  const first = toU128(bytes.slice(0, 16));
  const second = toU128(bytes.slice(16, 32));
  return [first, second];
}

/**
 * Combine two u128 values into a PublicKey (little-endian)
 */
export function u128sToPubkey(parts: [bigint, bigint]): PublicKey {
  const toBytes = (value: bigint): Uint8Array => {
    const out = new Uint8Array(16);
    let v = value;
    for (let i = 0; i < 16; i++) {
      out[i] = Number(v & BigInt(0xff));
      v >>= BigInt(8);
    }
    return out;
  };
  const first = toBytes(parts[0]);
  const second = toBytes(parts[1]);
  const bytes = new Uint8Array(32);
  bytes.set(first, 0);
  bytes.set(second, 16);
  return new PublicKey(bytes);
}

/**
 * Mapping from numeric offset to computation definition name
 */
const COMP_DEF_NAMES: Record<number, string> = {
  1894255896: "deposit_v2",
  2549376853: "withdraw_v2",
  524592853: "subscribe_v2",
  3264881130: "unsubscribe_v2",
  930732409: "process_payment_v2",
  1451574225: "verify_subscription_v2",
  2315398764: "claim_revenue_v2",
};

/**
 * Get CompDef PDA using name-based method (matches initialize script)
 */
function getCompDefPDA(programId: PublicKey, compDefName: string): PublicKey {
  const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
  const offset = getCompDefAccOffset(compDefName);
  const [pda] = PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), offset],
    getArciumProgramId()
  );
  return pda;
}

/**
 * Get Arcium account addresses for transaction construction
 */
export function getArciumAccounts(
  programId: PublicKey = PROGRAM_ID,
  compDefOffset: number,
  computationOffset: BN
) {
  const clusterOffset = ARCIUM_CLUSTER_OFFSET.toNumber();

  const mxeAccount = getMXEAccAddress(programId);
  const mempoolAccount = getMempoolAccAddress(clusterOffset);
  const executingPool = getExecutingPoolAccAddress(clusterOffset);
  const computationAccount = getComputationAccAddress(
    clusterOffset,
    computationOffset
  );

  // Use name-based CompDef PDA calculation (matches initialize script)
  const compDefName = COMP_DEF_NAMES[compDefOffset];
  if (!compDefName) {
    throw new Error(`Unknown compDefOffset: ${compDefOffset}`);
  }
  const compDefAccount = getCompDefPDA(programId, compDefName);

  const clusterAccount = getClusterAccAddress(clusterOffset);

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
