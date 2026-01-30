/**
 * Privacy Cash Deposit API
 *
 * Executes a deposit to Privacy Cash.
 *
 * Note: The Privacy Cash SDK handles proof generation, transaction signing,
 * and submission internally. The SDK signs with the derived encryption key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { deposit } from '@/lib/privacy-cash-service';
import { hasValidSession } from '@/lib/session-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount } = body;

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

    // Execute deposit via Privacy Cash
    const result = await deposit(walletAddress, amount);

    return NextResponse.json({
      success: true,
      tx: result.tx,
      amount: result.amount,
    });
  } catch (error) {
    console.error('Deposit API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process deposit',
      },
      { status: 500 }
    );
  }
}
