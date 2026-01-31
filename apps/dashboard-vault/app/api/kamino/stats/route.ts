/**
 * Kamino Stats API
 *
 * Returns Kamino reserve statistics including APY, total supply, etc.
 * This runs on the server side where Kamino SDK can access Node.js APIs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { KaminoService, toKitAddress } from '@/lib/kamino-service';

// Singleton service instance (cached between requests)
let kaminoService: KaminoService | null = null;

async function getKaminoService(): Promise<KaminoService> {
  if (kaminoService && kaminoService.isInitialized()) {
    return kaminoService;
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC URL not configured');
  }

  kaminoService = new KaminoService(rpcUrl);
  await kaminoService.initialize();
  return kaminoService;
}

/**
 * GET /api/kamino/stats
 * Returns current Kamino reserve statistics
 */
export async function GET(request: NextRequest) {
  try {
    const service = await getKaminoService();
    const stats = await service.getReserveStats();

    // Get user's deposited amount if wallet address provided
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    let userDeposited = 0;

    if (walletAddress) {
      try {
        const kitAddress = toKitAddress(walletAddress);
        userDeposited = await service.getUserDepositedAmount(kitAddress);
      } catch (err) {
        // User might not have any deposits, which is fine
        console.debug('No user deposits found:', err);
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        // APY as percentage (e.g., 5.25 for 5.25%)
        supplyAPY: stats.supplyAPY.mul(100).toNumber(),
        borrowAPY: stats.borrowAPY.mul(100).toNumber(),
        // Total supply in USDC
        totalSupply: stats.totalSupply.toString(),
        // Utilization rate as decimal (e.g., 0.75 for 75%)
        utilizationRate: stats.utilizationRate.toNumber(),
      },
      userDeposited,
    });
  } catch (error) {
    console.error('Kamino Stats API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch Kamino stats',
      },
      { status: 500 }
    );
  }
}
