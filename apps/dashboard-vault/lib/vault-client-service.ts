/**
 * Vault Client Service
 *
 * Manages initialization and access to SublyVaultClient for API usage.
 * Integrates with Shield Pool program for privacy-preserving Kamino operations.
 */

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import {
  SublyVaultClient,
  createSublyVaultClient,
  getIdl,
  PROGRAM_ID,
} from '@subly/vault-sdk';
import { getConfig } from './config';

// Singleton client instance
let vaultClientInstance: SublyVaultClient | null = null;
let vaultClientWallet: PublicKey | null = null;

/**
 * Wallet wrapper for Anchor (server-side)
 * Note: This wallet actually signs transactions using the payer keypair
 */
class NodeWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    } else {
      // VersionedTransaction
      tx.sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    for (const tx of txs) {
      if (tx instanceof Transaction) {
        tx.partialSign(this.payer);
      } else {
        tx.sign([this.payer]);
      }
    }
    return txs;
  }
}

/**
 * Configuration for vault client initialization
 */
export interface VaultClientConfig {
  rpcUrl?: string;
  privacyCashPrivateKey?: string | Uint8Array | Keypair;
  enableKamino?: boolean;
}

/**
 * Get or create a VaultClient instance for a specific wallet
 *
 * @param walletAddress - User's wallet address (for tracking)
 * @param config - Optional configuration
 * @returns Initialized SublyVaultClient
 */
export async function getVaultClient(
  walletAddress: string,
  config: VaultClientConfig = {}
): Promise<SublyVaultClient> {
  const walletPubkey = new PublicKey(walletAddress);

  // Check if we need to create a new client
  if (!vaultClientInstance || !vaultClientWallet?.equals(walletPubkey)) {
    const rpcUrl = config.rpcUrl ?? getConfig().solanaRpcUrl;
    const connection = new Connection(rpcUrl, 'confirmed');

    // Create a temporary wallet for server-side operations
    // In production, this would be a PDA-based authority or relayer
    const serverKeypair = Keypair.generate();
    const wallet = new NodeWallet(serverKeypair);

    vaultClientInstance = createSublyVaultClient(connection, wallet);
    vaultClientWallet = walletPubkey;

    // Get IDL and initialize
    const idl = getIdl();

    // For server-side API operations, we need a private key for Privacy Cash
    // This should be loaded from environment variables in production
    const privacyCashPrivateKey = config.privacyCashPrivateKey ??
      process.env.PRIVACY_CASH_PRIVATE_KEY ??
      Keypair.generate(); // Fallback for development

    await vaultClientInstance.initialize(idl, {
      privacyCashPrivateKey,
      rpcUrl,
      enableKamino: config.enableKamino ?? true,
    });

    console.log(`[VaultClient] Initialized for wallet: ${walletAddress}`);
  }

  return vaultClientInstance;
}

/**
 * Get the Shield Pool address
 */
export function getShieldPoolAddress(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('shield_pool')],
    new PublicKey(PROGRAM_ID)
  );
  return pda;
}

/**
 * Get Pool Token Account address (where USDC goes before Kamino)
 */
export function getPoolTokenAccountAddress(): PublicKey {
  const shieldPool = getShieldPoolAddress();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool_token_account'), shieldPool.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
  return pda;
}

/**
 * Get Pool cToken Account address (where Kamino cTokens are stored)
 */
export function getPoolCtokenAccountAddress(): PublicKey {
  const shieldPool = getShieldPoolAddress();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool_ctoken_account'), shieldPool.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
  return pda;
}

/**
 * Check if the vault client is initialized
 */
export function isVaultClientInitialized(): boolean {
  return vaultClientInstance !== null;
}

/**
 * Clear the vault client instance (for testing or cleanup)
 */
export function clearVaultClient(): void {
  vaultClientInstance = null;
  vaultClientWallet = null;
}
