/**
 * Privacy Cash Balance API
 *
 * Returns the user's private USDC balance from Privacy Cash.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBalance } from '@/lib/privacy-cash-service';
import { hasValidSession } from '@/lib/session-manager';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing walletAddress' },
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

    // Get balance from Privacy Cash
    const result = await getBalance(walletAddress);

    return NextResponse.json({
      balance: result.balance,
      baseUnits: result.baseUnits,
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
      },
      { status: 500 }
    );
  }
}
