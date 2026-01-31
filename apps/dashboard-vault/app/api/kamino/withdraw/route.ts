/**
 * Kamino Withdraw API
 *
 * Handles withdrawals from Kamino via Shield Pool for privacy-preserving yield.
 *
 * Flow:
 * 1. Call Shield Pool program's withdraw instruction
 * 2. Shield Pool redeems cTokens from Kamino via CPI
 * 3. USDC is deposited back to user's Privacy Cash account
 * 4. User's encrypted share is updated
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasValidSession, getClient, getVaultSecret } from '@/lib/session-manager';
import { getVaultClient, getPoolTokenAccountAddress } from '@/lib/vault-client-service';
import { BN } from '@coral-xyz/anchor';

// Minimum withdrawal amount (0.01 USDC)
const MIN_WITHDRAW_AMOUNT = 0.01;

// USDC decimals
const USDC_DECIMALS = 6;

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

    if (amount < MIN_WITHDRAW_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ${MIN_WITHDRAW_AMOUNT} USDC` },
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

    console.log(`[Kamino Withdraw] Initiating withdrawal of ${amount} USDC for ${walletAddress}`);

    // Convert amount to base units
    const amountBaseUnits = Math.floor(amount * Math.pow(10, USDC_DECIMALS));

    // Step 1: Withdraw from Shield Pool (which redeems from Kamino via CPI)
    let vaultWithdrawTx: string;
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

      // Initialize user in vault client with the session-derived secret
      // This ensures consistent user_commitment across all operations
      vaultClient.initializeUser(userSecret);

      // Perform withdrawal from Shield Pool
      // This triggers: Kamino redeem via CPI → USDC to Pool Token Account
      const withdrawResult = await vaultClient.withdraw({
        amount: new BN(amountBaseUnits),
        secret: userSecret,
      });

      vaultWithdrawTx = withdrawResult.signature;
      console.log(`[Kamino Withdraw] Vault withdraw tx: ${vaultWithdrawTx}`);
    } catch (error) {
      console.error('[Kamino Withdraw] Vault withdraw failed:', error);
      return NextResponse.json(
        { error: `Shield Pool withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 2: Deposit USDC from Pool Token Account to user's Privacy Cash
    let privacyCashTx: string;
    try {
      const poolTokenAccount = getPoolTokenAccountAddress();
      console.log(`[Kamino Withdraw] Pool token account: ${poolTokenAccount.toBase58()}`);

      // Deposit to user's Privacy Cash account
      // Note: In production, this would be a transfer from Pool Token Account
      // For now, we deposit directly to the user's Privacy Cash
      const depositResult = await privacyCashClient.depositUSDC({
        base_units: amountBaseUnits,
      });
      privacyCashTx = depositResult.tx;
      console.log(`[Kamino Withdraw] Privacy Cash deposit tx: ${privacyCashTx}`);
    } catch (error) {
      console.error('[Kamino Withdraw] Privacy Cash deposit failed:', error);

      // Shield Pool withdrawal succeeded but Privacy Cash deposit failed
      // In production, this would need proper error handling/recovery
      return NextResponse.json(
        {
          error: `Privacy Cash deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          vaultWithdrawTx, // Include the successful vault tx for debugging
        },
        { status: 500 }
      );
    }

    console.log(`[Kamino Withdraw] Withdrawal processed successfully`);

    return NextResponse.json({
      success: true,
      tx: vaultWithdrawTx,
      privacyCashTx,
      amount,
      message: 'Withdrawal from Kamino via Shield Pool completed',
    });
  } catch (error) {
    console.error('Kamino Withdraw API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process Kamino withdrawal',
      },
      { status: 500 }
    );
  }
}

/**
 * Get withdrawal information
 */
export async function GET() {
  return NextResponse.json({
    minWithdraw: MIN_WITHDRAW_AMOUNT,
    description: 'Withdraw USDC from Kamino via Shield Pool back to Privacy Cash',
  });
}
