/**
 * Session Manager for Privacy Cash Client
 *
 * Manages user sessions with initialized Privacy Cash clients.
 * Uses in-memory storage (for production, consider Redis).
 *
 * Flow:
 * 1. User signs message with wallet
 * 2. initializeSession() creates Privacy Cash client with derived encryption key
 * 3. getClient() retrieves the initialized client for subsequent operations
 */

import { getConfig } from './config';
import { Keypair } from '@solana/web3.js';

// Privacy Cash SDK types
interface PrivacyCashClient {
  getPrivateBalanceUSDC(): Promise<{ base_units: number; amount: number }>;
  depositUSDC(params: { base_units: number }): Promise<{ tx: string }>;
  withdrawUSDC(params: {
    base_units: number;
    recipientAddress?: string;
  }): Promise<{
    isPartial: boolean;
    tx: string;
    recipient: string;
    base_units: number;
    fee_base_units: number;
  }>;
}

interface Session {
  client: PrivacyCashClient;
  walletAddress: string;
  derivedPublicKey: string; // The derived keypair's public key (for funding)
  createdAt: number;
  expiresAt: number;
}

// In-memory session store
// Note: For production with multiple server instances, use Redis or similar
const sessions = new Map<string, Session>();

// Cleanup interval (runs every 5 minutes)
let cleanupIntervalId: NodeJS.Timeout | null = null;

function startCleanupInterval(): void {
  if (cleanupIntervalId) return;

  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [walletAddress, session] of sessions.entries()) {
      if (session.expiresAt < now) {
        sessions.delete(walletAddress);
        console.log(`Session expired for wallet: ${walletAddress.slice(0, 8)}...`);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Initialize a Privacy Cash session for a user
 *
 * The Privacy Cash SDK accepts owner as:
 * - string (base58 encoded private key)
 * - number[] (byte array of private key - 64 bytes)
 * - Uint8Array (byte array of private key)
 * Note: Keypair objects must be converted to number[] via Array.from(keypair.secretKey)
 *
 * For browser integration, we derive a deterministic key from the user's signature.
 * The signature serves as entropy to create a Privacy Cash identity.
 *
 * @param walletAddress - User's wallet address
 * @param signature - Signature of "Privacy Money account sign in" message (64 bytes)
 * @returns Session info
 */
export async function initializeSession(
  walletAddress: string,
  signature: Uint8Array
): Promise<{ success: boolean; expiresAt: number; derivedPublicKey: string }> {
  const config = getConfig();

  try {
    // Dynamic import of Privacy Cash SDK (Node.js only)
    const { PrivacyCash } = await import('privacycash');
    const crypto = await import('crypto');

    // Use the signature as the basis for the Privacy Cash identity
    // The 64-byte signature is hashed to create a 32-byte seed for Keypair.fromSeed()
    // This creates a deterministic Privacy Cash account tied to this wallet+message combo
    const seed = crypto.createHash('sha256').update(signature).digest();
    const keypair = Keypair.fromSeed(seed);

    // Convert keypair to format expected by Privacy Cash SDK
    // The SDK accepts: string (base58), number[], or Uint8Array
    // Converting secretKey to number[] for compatibility
    const ownerKey = Array.from(keypair.secretKey);

    // Initialize Privacy Cash client
    const client = new PrivacyCash({
      RPC_url: config.solanaRpcUrl,
      owner: ownerKey,
      enableDebug: config.privacyCashDebug,
    });

    const now = Date.now();
    const expiresAt = now + config.sessionTtlSeconds * 1000;

    // Get the derived public key (this is the address users need to fund for deposits)
    const derivedPublicKey = keypair.publicKey.toBase58();

    // Store session
    sessions.set(walletAddress, {
      client,
      walletAddress,
      derivedPublicKey,
      createdAt: now,
      expiresAt,
    });

    // Start cleanup interval if not running
    startCleanupInterval();

    console.log(`Session initialized for wallet: ${walletAddress.slice(0, 8)}...`);
    console.log(`Derived Privacy Cash address: ${derivedPublicKey}`);

    return { success: true, expiresAt, derivedPublicKey };
  } catch (error) {
    console.error('Failed to initialize Privacy Cash session:', error);
    throw new Error(
      `Failed to initialize Privacy Cash: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the Privacy Cash client for a user
 *
 * @param walletAddress - User's wallet address
 * @returns Privacy Cash client or null if session not found/expired
 */
export function getClient(walletAddress: string): PrivacyCashClient | null {
  const session = sessions.get(walletAddress);

  if (!session) {
    return null;
  }

  // Check if session expired
  if (session.expiresAt < Date.now()) {
    sessions.delete(walletAddress);
    return null;
  }

  return session.client;
}

/**
 * Check if a session exists and is valid
 *
 * @param walletAddress - User's wallet address
 * @returns true if session is valid
 */
export function hasValidSession(walletAddress: string): boolean {
  const session = sessions.get(walletAddress);

  if (!session) {
    return false;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(walletAddress);
    return false;
  }

  return true;
}

/**
 * Destroy a user's session
 *
 * @param walletAddress - User's wallet address
 */
export function destroySession(walletAddress: string): void {
  sessions.delete(walletAddress);
  console.log(`Session destroyed for wallet: ${walletAddress.slice(0, 8)}...`);
}

/**
 * Get the derived public key for a user's session
 * This is the address where users need to send USDC for deposits
 *
 * @param walletAddress - User's wallet address
 * @returns Derived public key or null if session not found
 */
export function getDerivedPublicKey(walletAddress: string): string | null {
  const session = sessions.get(walletAddress);

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(walletAddress);
    return null;
  }

  return session.derivedPublicKey;
}

/**
 * Get session info (for debugging/monitoring)
 */
export function getSessionInfo(walletAddress: string): {
  exists: boolean;
  expiresAt?: number;
  remainingMs?: number;
} | null {
  const session = sessions.get(walletAddress);

  if (!session) {
    return { exists: false };
  }

  const now = Date.now();
  return {
    exists: true,
    expiresAt: session.expiresAt,
    remainingMs: Math.max(0, session.expiresAt - now),
  };
}
