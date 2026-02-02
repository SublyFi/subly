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
} from '@arcium-hq/client';
import { randomBytes } from 'crypto';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { PROGRAM_ID } from '../accounts/pda';

/** Arcium Program ID */
export const ARCIUM_PROGRAM_ID = new PublicKey('Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ');

/** Arcium Fee Pool Account */
export const ARCIUM_FEE_POOL_ACCOUNT = new PublicKey('G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC');

/** Arcium Clock Account */
export const ARCIUM_CLOCK_ACCOUNT = new PublicKey('7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot');

/** Sign PDA Seed */
export const SIGN_PDA_SEED = Buffer.from('ArciumSignerAccount');

/** Computation definition offsets (matching the Rust program) */
export const COMP_DEF_OFFSETS = {
  deposit_v2: 1894255896,
  withdraw_v2: 2549376853,
  subscribe_v2: 524592853,
  unsubscribe_v2: 3264881130,
  process_payment_v2: 930732409,
  verify_subscription_v2: 1451574225,
  claim_revenue_v2: 2315398764,
} as const;

export type ComputationType = keyof typeof COMP_DEF_OFFSETS;

/**
 * Message used for deriving deterministic encryption keys.
 * IMPORTANT: Do not change this message as it would break existing encrypted data.
 */
export const ENCRYPTION_SIGNING_MESSAGE =
  'Subly Privacy Subscriptions - Encryption Key Derivation v1';

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
 * Wallet interface for signMessage-based encryption
 */
export interface SignMessageWallet {
  publicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  if (globalThis.crypto?.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }
  const { createHash } = await import('crypto');
  const hash = createHash('sha256').update(Buffer.from(data)).digest();
  return new Uint8Array(hash);
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
      const mxePubkey = await getMXEPublicKey({ connection } as never, programId);
      if (mxePubkey) return mxePubkey;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Failed to fetch MXE public key after retries');
}

/**
 * Derive deterministic X25519 encryption key from a wallet signature.
 */
export async function deriveEncryptionKeyFromSignature(
  signature: Uint8Array
): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
  const signatureArray = new Uint8Array(signature);
  const privateKey = await sha256(signatureArray);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Create Arcium encryption context from a wallet signature (deterministic).
 */
export async function createArciumContextFromSignature(
  connection: Connection,
  signature: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): Promise<ArciumContext> {
  const mxePubkey = await getMXEPublicKeyWithRetry(connection, programId);
  const { privateKey, publicKey } = await deriveEncryptionKeyFromSignature(signature);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePubkey);
  const cipher = new RescueCipher(sharedSecret);

  return { privateKey, publicKey, sharedSecret, cipher };
}

/**
 * Create Arcium encryption context using wallet.signMessage().
 */
export async function createArciumContextFromWallet(
  connection: Connection,
  wallet: SignMessageWallet,
  programId: PublicKey = PROGRAM_ID
): Promise<ArciumContext> {
  const message = new TextEncoder().encode(ENCRYPTION_SIGNING_MESSAGE);
  const signature = await wallet.signMessage(message);
  return createArciumContextFromSignature(connection, signature, programId);
}

/**
 * Convert a u128 nonce to 16 bytes (little-endian)
 */
export function nonceToBytes(nonce: BN | bigint): Uint8Array {
  const out = new Uint8Array(16);
  let value = typeof nonce === 'bigint' ? nonce : BigInt(nonce.toString());
  for (let i = 0; i < 16; i++) {
    out[i] = Number(value & BigInt(0xff));
    value >>= BigInt(8);
  }
  return out;
}

/**
 * Convert 16-byte little-endian nonce into a bigint
 */
export function bytesToU128(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Generate a random 16-byte nonce for encryption
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(nonce);
    return nonce;
  }
  return new Uint8Array(randomBytes(16));
}

/**
 * Encrypt one or more values with the Arcium cipher
 */
export function encryptValues(
  cipher: RescueCipher,
  values: bigint[],
  nonce: Uint8Array
): Uint8Array[] {
  const ciphertexts = cipher.encrypt(values, nonce);
  return ciphertexts.map((value) => new Uint8Array(value));
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
 * Derive the Sign PDA for this program
 */
export function deriveSignPDA(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SIGN_PDA_SEED],
    programId
  );
}

/**
 * Derive the computation definition PDA for a specific computation type
 */
export function deriveComputationDefinitionPDA(
  computationType: ComputationType,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const baseSeed = getArciumAccountBaseSeed('ComputationDefinitionAccount');
  const offset = getCompDefAccOffset(computationType);
  return PublicKey.findProgramAddressSync(
    [baseSeed, programId.toBuffer(), offset],
    getArciumProgramId()
  );
}

/**
 * Get Arcium account addresses for transaction construction
 */
export function getArciumAccounts(
  programId: PublicKey,
  computationType: ComputationType,
  computationOffset: BN,
  clusterOffset: number
) {
  const mxeAccount = getMXEAccAddress(programId);
  const mempoolAccount = getMempoolAccAddress(clusterOffset);
  const executingPool = getExecutingPoolAccAddress(clusterOffset);
  const computationAccount = getComputationAccAddress(clusterOffset, computationOffset);
  const clusterAccount = getClusterAccAddress(clusterOffset);
  const [compDefAccount] = deriveComputationDefinitionPDA(computationType, programId);

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
 * Get computation offset (for compute account PDA derivation)
 */
export async function getNextComputationOffset(): Promise<BN> {
  return generateComputationOffset();
}

/**
 * Generate a random computation offset
 */
export function generateComputationOffset(): BN {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    const { randomBytes } = require('crypto') as typeof import('crypto');
    bytes.set(randomBytes(8));
  }
  return new BN(Array.from(bytes));
}
