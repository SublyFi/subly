/**
 * Shield Pool Initialization Script
 *
 * This script initializes the Shield Pool for Mainnet deployment.
 * Run this ONCE before the application can accept deposits.
 *
 * Prerequisites:
 * - Vault program must be deployed to Mainnet
 * - Authority keypair with SOL for transaction fees
 * - Environment variables set in .env.local
 *
 * Usage:
 *   npx ts-node scripts/initialize-pool.ts [--dry-run]
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Program, AnchorProvider, Wallet, Idl } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Constants
// ============================================

// Program IDs
const VAULT_PROGRAM_ID = new PublicKey('BRU5ubQjz7DjF6wWzs16SmEzPgfHTe6u8iYNpoMuAVPL');

// Kamino Mainnet Constants
const KAMINO_LENDING_PROGRAM_ID = new PublicKey('KLend2g3cP87ber41VSz2cHu5M3mxzQS7pzLFz1UJwp');
const KAMINO_MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');
const KAMINO_USDC_RESERVE = new PublicKey('d4A2prbA2whSmMHHaHmRNKRpvqH8UgFfGzTqZGKfJxB');
const KAMINO_CUSDC_MINT = new PublicKey('BNBUwNTkDEYgYfFg8sVB6S9gqTfzfj2uYPBYfRAJYr7u');

// USDC Mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// PDA Seeds
const SHIELD_POOL_SEED = Buffer.from('shield_pool');
const POOL_TOKEN_SEED = Buffer.from('pool_token');
const POOL_CTOKEN_SEED = Buffer.from('pool_ctoken');

// ============================================
// PDA Derivation
// ============================================

function getShieldPoolPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SHIELD_POOL_SEED], VAULT_PROGRAM_ID);
}

function getPoolTokenAccountPda(shieldPool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_TOKEN_SEED, shieldPool.toBuffer()],
    VAULT_PROGRAM_ID
  );
}

function getPoolCtokenAccountPda(shieldPool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_CTOKEN_SEED, shieldPool.toBuffer()],
    VAULT_PROGRAM_ID
  );
}

function getKaminoLendingMarketAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lma'), KAMINO_MAIN_MARKET.toBuffer()],
    KAMINO_LENDING_PROGRAM_ID
  );
}

// ============================================
// IDL
// ============================================

function getIdl(): Idl {
  return {
    address: VAULT_PROGRAM_ID.toBase58(),
    metadata: {
      name: 'subly_vault',
      version: '0.1.0',
      spec: '0.1.0',
      description: 'Subly Vault - Privacy-first subscription payment protocol',
    },
    instructions: [
      {
        name: 'initialize',
        discriminator: [],
        accounts: [
          { name: 'authority', writable: true, signer: true },
          { name: 'shieldPool', writable: true },
          { name: 'poolTokenAccount', writable: true },
          { name: 'poolCtokenAccount', writable: true },
          { name: 'usdcMint' },
          { name: 'ctokenMint' },
          { name: 'tokenProgram' },
          { name: 'associatedTokenProgram' },
          { name: 'systemProgram' },
        ],
        args: [],
      },
    ],
    accounts: [],
    errors: [],
    types: [],
  };
}

// ============================================
// Main Script
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('========================================');
  console.log('  Shield Pool Initialization Script');
  console.log('========================================');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no transactions will be sent)' : 'LIVE'}`);
  console.log('');

  // Load environment
  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) {
    console.error('Error: SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URL environment variable not set');
    console.error('Please set the RPC URL in .env.local');
    process.exit(1);
  }

  // Load authority keypair
  const authorityKeyPath = process.env.AUTHORITY_KEYPAIR_PATH;
  if (!authorityKeyPath) {
    console.error('Error: AUTHORITY_KEYPAIR_PATH environment variable not set');
    console.error('Please set the path to the authority keypair JSON file');
    console.error('Example: AUTHORITY_KEYPAIR_PATH=~/.config/solana/id.json');
    process.exit(1);
  }

  let authority: Keypair;
  try {
    const keypairPath = authorityKeyPath.replace('~', process.env.HOME || '');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`Authority: ${authority.publicKey.toBase58()}`);
  } catch (error) {
    console.error(`Error loading authority keypair from ${authorityKeyPath}:`, error);
    process.exit(1);
  }

  // Connect to Solana
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`RPC: ${rpcUrl.slice(0, 50)}...`);

  // Check authority balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log(`Authority Balance: ${balance / 1e9} SOL`);
  if (balance < 0.1 * 1e9) {
    console.error('Warning: Authority balance is low. Need at least 0.1 SOL for initialization.');
    if (!isDryRun) {
      process.exit(1);
    }
  }

  // Derive PDAs
  console.log('');
  console.log('Deriving PDA addresses...');
  const [shieldPoolPda, shieldPoolBump] = getShieldPoolPda();
  const [poolTokenAccountPda, poolTokenBump] = getPoolTokenAccountPda(shieldPoolPda);
  const [poolCtokenAccountPda, poolCtokenBump] = getPoolCtokenAccountPda(shieldPoolPda);
  const [kaminoLendingAuthority] = getKaminoLendingMarketAuthorityPda();

  console.log(`Shield Pool PDA: ${shieldPoolPda.toBase58()} (bump: ${shieldPoolBump})`);
  console.log(`Pool Token Account: ${poolTokenAccountPda.toBase58()} (bump: ${poolTokenBump})`);
  console.log(`Pool cToken Account: ${poolCtokenAccountPda.toBase58()} (bump: ${poolCtokenBump})`);
  console.log(`Kamino Lending Authority: ${kaminoLendingAuthority.toBase58()}`);

  // Check if pool already exists
  console.log('');
  console.log('Checking if pool already exists...');
  const poolAccount = await connection.getAccountInfo(shieldPoolPda);
  if (poolAccount) {
    console.log('Shield Pool already exists!');
    console.log(`Owner: ${poolAccount.owner.toBase58()}`);
    console.log(`Data length: ${poolAccount.data.length} bytes`);
    console.log('');
    console.log('Skipping initialization. Pool is already set up.');
    return;
  }
  console.log('Pool does not exist. Proceeding with initialization...');

  if (isDryRun) {
    console.log('');
    console.log('DRY RUN: Would call initialize instruction with:');
    console.log('  authority:', authority.publicKey.toBase58());
    console.log('  shieldPool:', shieldPoolPda.toBase58());
    console.log('  poolTokenAccount:', poolTokenAccountPda.toBase58());
    console.log('  poolCtokenAccount:', poolCtokenAccountPda.toBase58());
    console.log('  usdcMint:', USDC_MINT.toBase58());
    console.log('  ctokenMint:', KAMINO_CUSDC_MINT.toBase58());
    console.log('');
    console.log('To execute for real, run without --dry-run flag');
    return;
  }

  // Create Anchor provider and program
  // Use a custom wallet class that properly implements the Wallet interface
  class NodeWallet implements Wallet {
    constructor(readonly payer: Keypair) {}

    get publicKey(): PublicKey {
      return this.payer.publicKey;
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      if (tx instanceof Transaction) {
        tx.partialSign(this.payer);
      } else {
        (tx as VersionedTransaction).sign([this.payer]);
      }
      return tx;
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      for (const tx of txs) {
        if (tx instanceof Transaction) {
          tx.partialSign(this.payer);
        } else {
          (tx as VersionedTransaction).sign([this.payer]);
        }
      }
      return txs;
    }
  }

  const wallet = new NodeWallet(authority);

  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    skipPreflight: false,
  });

  const idl = getIdl();
  const program = new Program(idl, provider);

  // Build and send initialize transaction
  console.log('');
  console.log('Sending initialize transaction...');

  try {
    const signature = await (program.methods as any)
      .initialize()
      .accounts({
        authority: authority.publicKey,
        shieldPool: shieldPoolPda,
        poolTokenAccount: poolTokenAccountPda,
        poolCtokenAccount: poolCtokenAccountPda,
        usdcMint: USDC_MINT,
        ctokenMint: KAMINO_CUSDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: PublicKey.default,
      })
      .signers([authority])
      .rpc();

    console.log(`Transaction signature: ${signature}`);
    console.log('');
    console.log('========================================');
    console.log('  Shield Pool Initialized Successfully!');
    console.log('========================================');
    console.log('');
    console.log('Pool Address:', shieldPoolPda.toBase58());
    console.log('');
    console.log('Next steps:');
    console.log('1. Update .env.local if needed');
    console.log('2. Deploy the dashboard application');
    console.log('3. Test with a small deposit');
  } catch (error) {
    console.error('');
    console.error('Failed to initialize Shield Pool:');
    console.error(error);
    process.exit(1);
  }
}

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
