/**
 * Privacy Cash Initialization API
 *
 * Initializes a Privacy Cash session using the user's wallet signature.
 * The signature is used to derive an encryption key for UTXO management.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeSession,
  hasValidSession,
  getDerivedPublicKey,
} from '@/lib/session-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature } = body;

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid walletAddress' },
        { status: 400 }
      );
    }

    if (!signature || !Array.isArray(signature)) {
      return NextResponse.json(
        { error: 'Missing or invalid signature' },
        { status: 400 }
      );
    }

    // Validate signature length (ed25519 signatures are 64 bytes)
    if (signature.length !== 64) {
      return NextResponse.json(
        { error: 'Invalid signature length' },
        { status: 400 }
      );
    }

    // Convert signature array to Uint8Array
    const signatureBytes = new Uint8Array(signature);

    // Initialize Privacy Cash session
    const result = await initializeSession(walletAddress, signatureBytes);

    return NextResponse.json({
      success: result.success,
      expiresAt: result.expiresAt,
      derivedPublicKey: result.derivedPublicKey,
      message: 'Privacy Cash session initialized successfully',
    });
  } catch (error) {
    console.error('Privacy Cash init error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initialize Privacy Cash',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Missing walletAddress' },
      { status: 400 }
    );
  }

  const initialized = hasValidSession(walletAddress);
  const derivedPublicKey = initialized ? getDerivedPublicKey(walletAddress) : null;

  return NextResponse.json({ initialized, derivedPublicKey });
}
