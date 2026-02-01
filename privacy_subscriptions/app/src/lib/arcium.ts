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
 * Mapping from numeric offset to computation definition name
 */
const COMP_DEF_NAMES: Record<number, string> = {
  0: "deposit",
  1: "withdraw",
  2: "subscribe",
  3: "unsubscribe",
  4: "process_payment",
  5: "verify_subscription",
  6: "claim_revenue",
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
