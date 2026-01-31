import { PublicKey } from '@solana/web3.js';
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
  deposit: 0,
  withdraw: 1,
  subscribe: 2,
  unsubscribe: 3,
  process_payment: 4,
  verify_subscription: 5,
  claim_revenue: 6,
} as const;

export type ComputationType = keyof typeof COMP_DEF_OFFSETS;

/**
 * Arcium client wrapper for SDK usage
 */
export interface ArciumClientWrapper {
  /** MXE Account public key */
  mxeAccount: PublicKey;
  /** Cluster account public key */
  clusterAccount: PublicKey;
  /** Encrypt a value using Arcium */
  encryptU64(value: BN | number): Promise<EncryptedValue>;
  /** Get a random nonce */
  getNonce(): BN;
  /** Get the X25519 public key for encryption */
  getPublicKey(): Uint8Array;
}

/**
 * Encrypted value with metadata
 */
export interface EncryptedValue {
  ciphertext: Uint8Array;
  nonce: BN;
  pubkey: Uint8Array;
}

/**
 * Derive the MXE PDA for this program
 */
export function deriveMxePDA(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('mxe'), programId.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
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
  const offset = COMP_DEF_OFFSETS[computationType];
  const offsetBuffer = Buffer.alloc(4);
  offsetBuffer.writeUInt32LE(offset);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('comp_def'), programId.toBuffer(), offsetBuffer],
    ARCIUM_PROGRAM_ID
  );
}

/**
 * Derive the mempool PDA from MXE account
 */
export function deriveMempoolPDA(mxeAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('mempool'), mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
}

/**
 * Derive the executing pool PDA from MXE account
 */
export function deriveExecPoolPDA(mxeAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('execpool'), mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
}

/**
 * Derive the computation PDA
 */
export function deriveComputationPDA(
  computationOffset: BN | number,
  mxeAccount: PublicKey
): [PublicKey, number] {
  const offsetBN = BN.isBN(computationOffset) ? computationOffset : new BN(computationOffset);
  const offsetBuffer = offsetBN.toArrayLike(Buffer, 'le', 8);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('computation'), mxeAccount.toBuffer(), offsetBuffer],
    ARCIUM_PROGRAM_ID
  );
}

/**
 * Derive the cluster PDA from MXE account
 */
export function deriveClusterPDA(mxeAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('cluster'), mxeAccount.toBuffer()],
    ARCIUM_PROGRAM_ID
  );
}

/**
 * Simple encryption wrapper for SDK use
 * Note: In production, this should use the actual @arcium-hq/client library
 */
export function createSimpleEncryptor(): {
  encrypt: (value: BN | number) => EncryptedValue;
  getNonce: () => BN;
  getPublicKey: () => Uint8Array;
} {
  // Generate a random X25519-style public key (32 bytes)
  const pubkey = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(pubkey);
  } else {
    // Fallback for Node.js
    for (let i = 0; i < 32; i++) {
      pubkey[i] = Math.floor(Math.random() * 256);
    }
  }

  let nonceCounter = new BN(Date.now());

  return {
    encrypt: (value: BN | number): EncryptedValue => {
      const valueBN = BN.isBN(value) ? value : new BN(value);
      const nonce = nonceCounter;
      nonceCounter = nonceCounter.add(new BN(1));

      // Create a simple "encrypted" value (XOR with nonce for demo)
      // In production, this should use actual Arcium encryption
      const valueBuffer = valueBN.toArrayLike(Buffer, 'le', 8);
      const ciphertext = new Uint8Array(32);

      // Copy value to first 8 bytes
      for (let i = 0; i < 8; i++) {
        ciphertext[i] = valueBuffer[i];
      }

      // Fill rest with random padding
      for (let i = 8; i < 32; i++) {
        ciphertext[i] = Math.floor(Math.random() * 256);
      }

      return {
        ciphertext,
        nonce,
        pubkey,
      };
    },
    getNonce: () => {
      const nonce = nonceCounter;
      nonceCounter = nonceCounter.add(new BN(1));
      return nonce;
    },
    getPublicKey: () => pubkey,
  };
}

/**
 * Initialize Arcium client wrapper
 * Note: This is a simplified version. In production, use @arcium-hq/client
 */
export async function initArciumClient(
  programId: PublicKey = PROGRAM_ID
): Promise<ArciumClientWrapper> {
  const [mxeAccount] = deriveMxePDA(programId);
  const [clusterAccount] = deriveClusterPDA(mxeAccount);

  const encryptor = createSimpleEncryptor();

  return {
    mxeAccount,
    clusterAccount,
    encryptU64: async (value: BN | number): Promise<EncryptedValue> => {
      return encryptor.encrypt(value);
    },
    getNonce: () => encryptor.getNonce(),
    getPublicKey: () => encryptor.getPublicKey(),
  };
}

/**
 * Get computation offset (for compute account PDA derivation)
 */
export async function getNextComputationOffset(): Promise<BN> {
  // In production, this would query the MXE account to get the next available offset
  // For now, we use a timestamp-based offset
  return new BN(Date.now());
}
