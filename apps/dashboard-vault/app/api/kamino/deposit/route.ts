/**
 * Kamino Deposit API
 *
 * Handles deposits to Kamino via Shield Pool for privacy-preserving yield.
 *
 * Flow:
 * 1. Withdraw USDC from Privacy Cash to Shield Pool token account
 * 2. Call Shield Pool program's register_deposit instruction
 * 3. Shield Pool deposits USDC to Kamino via CPI
 * 4. User's encrypted share is updated
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasValidSession, getClient, getVaultSecret } from '@/lib/session-manager';
import { getVaultClient, getPoolTokenAccountAddress } from '@/lib/vault-client-service';
import { BN } from '@coral-xyz/anchor';
import { randomBytes } from 'crypto';

// Minimum deposit amount (0.01 USDC)
const MIN_DEPOSIT_AMOUNT = 0.01;

// Maximum deposit amount (1,000,000 USDC)
const MAX_DEPOSIT_AMOUNT = 1_000_000;

// USDC decimals
const USDC_DECIMALS = 6;

/**
 * Generate a note commitment (placeholder - in production this comes from Privacy Cash)
 */
function generateNoteCommitment(): Uint8Array {
  return randomBytes(32);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount } = body;

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid walletAddress' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (amount < MIN_DEPOSIT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum deposit amount is ${MIN_DEPOSIT_AMOUNT} USDC` },
        { status: 400 }
      );
    }

    if (amount > MAX_DEPOSIT_AMOUNT) {
      return NextResponse.json(
        { error: `Maximum deposit amount is ${MAX_DEPOSIT_AMOUNT} USDC` },
        { status: 400 }
      );
    }

    // Check session
    if (!hasValidSession(walletAddress)) {
      return NextResponse.json(
        { error: 'Session not found or expired. Please sign in again.' },
        { status: 401 }
      );
    }

    // Get Privacy Cash client
    const privacyCashClient = getClient(walletAddress);
    if (!privacyCashClient) {
      return NextResponse.json(
        { error: 'Privacy Cash client not initialized' },
        { status: 500 }
      );
    }

    console.log(`[Kamino Deposit] Initiating deposit of ${amount} USDC for ${walletAddress}`);

    // Convert amount to base units
    const amountBaseUnits = Math.floor(amount * Math.pow(10, USDC_DECIMALS));

    // Step 1: Withdraw from Privacy Cash to Shield Pool's token account
    const poolTokenAccount = getPoolTokenAccountAddress();
    console.log(`[Kamino Deposit] Pool token account: ${poolTokenAccount.toBase58()}`);

    let privacyCashTx: string;
    try {
      // Withdraw to Shield Pool's token account
      const withdrawResult = await privacyCashClient.withdrawUSDC({
        base_units: amountBaseUnits,
        recipientAddress: poolTokenAccount.toBase58(),
      });
      privacyCashTx = withdrawResult.tx;
      console.log(`[Kamino Deposit] Privacy Cash withdraw tx: ${privacyCashTx}`);
    } catch (error) {
      console.error('[Kamino Deposit] Privacy Cash withdraw failed:', error);
      return NextResponse.json(
        { error: `Privacy Cash withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 2: Register the deposit on-chain (triggers Kamino deposit via CPI)
    try {
      // Initialize Vault client
      const vaultClient = await getVaultClient(walletAddress);

      // Get user secret from session (deterministically derived from wallet signature)
      // This ensures the same user always gets the same commitment
      const userSecret = getVaultSecret(walletAddress);
      if (!userSecret) {
        return NextResponse.json(
          { error: 'Vault secret not found in session. Please sign in again.' },
          { status: 401 }
        );
      }

      // Generate note commitment (placeholder - in production from Privacy Cash)
      const noteCommitment = generateNoteCommitment();

      // Initialize user in vault client with the session-derived secret
      // This ensures consistent user_commitment across all operations
      vaultClient.initializeUser(userSecret);

      // Register the deposit
      const registerResult = await vaultClient.registerDeposit({
        noteCommitment,
        amount: new BN(amountBaseUnits),
      });

      console.log(`[Kamino Deposit] Register deposit tx: ${registerResult.signature}`);

      return NextResponse.json({
        success: true,
        tx: registerResult.signature,
        privacyCashTx,
        amount,
        message: 'Deposit to Kamino via Shield Pool completed',
      });
    } catch (error) {
      console.error('[Kamino Deposit] Register deposit failed:', error);

      // Even if on-chain registration fails, Privacy Cash withdraw succeeded
      // In production, this would need proper error handling/rollback
      return NextResponse.json(
        {
          error: `Shield Pool registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          privacyCashTx, // Include the successful Privacy Cash tx for debugging
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Kamino Deposit API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process Kamino deposit',
      },
      { status: 500 }
    );
  }
}

/**
 * Get deposit information
 */
export async function GET() {
  return NextResponse.json({
    minDeposit: MIN_DEPOSIT_AMOUNT,
    maxDeposit: MAX_DEPOSIT_AMOUNT,
    description: 'Deposit USDC to Kamino via Shield Pool for privacy-preserving yield',
  });
}
