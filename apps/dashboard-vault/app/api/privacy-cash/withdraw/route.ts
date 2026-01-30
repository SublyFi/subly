/**
 * Privacy Cash Withdraw API
 *
 * Handles private withdrawals from Privacy Cash.
 * Withdrawals are processed by the Privacy Cash relayer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withdraw, getEstimatedWithdrawalFees } from '@/lib/privacy-cash-service';
import { hasValidSession } from '@/lib/session-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount, recipientAddress } = body;

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

    // Check if session exists
    if (!hasValidSession(walletAddress)) {
      return NextResponse.json(
        { error: 'Session not found or expired. Please sign in again.' },
        { status: 401 }
      );
    }

    // Use wallet address as recipient if not specified
    const recipient = recipientAddress || walletAddress;

    // Execute withdrawal via Privacy Cash
    const result = await withdraw(walletAddress, amount, recipient);

    return NextResponse.json({
      success: true,
      tx: result.tx,
      recipient: result.recipient,
      amount: result.amount,
      feeUsdc: result.fee,
      isPartial: result.isPartial,
    });
  } catch (error) {
    console.error('Withdraw API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process withdrawal',
      },
      { status: 500 }
    );
  }
}

/**
 * Get estimated withdrawal fees
 */
export async function GET(request: NextRequest) {
  const amountStr = request.nextUrl.searchParams.get('amount');

  if (!amountStr) {
    return NextResponse.json(
      { error: 'Missing amount parameter' },
      { status: 400 }
    );
  }

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Invalid amount' },
      { status: 400 }
    );
  }

  const fees = getEstimatedWithdrawalFees(amount);

  return NextResponse.json(fees);
}
