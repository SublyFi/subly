/**
 * Privacy Cash Service
 *
 * Provides high-level methods for Privacy Cash operations.
 * Works with the session manager to get initialized clients.
 */

import { getClient } from './session-manager';

// USDC decimals (1 USDC = 1,000,000 base units)
const USDC_DECIMALS = 6;
const USDC_BASE_UNIT = Math.pow(10, USDC_DECIMALS);

export interface BalanceResult {
  balance: number; // Human-readable USDC
  baseUnits: number;
}

export interface DepositResult {
  tx: string;
  amount: number;
}

export interface WithdrawResult {
  tx: string;
  recipient: string;
  amount: number;
  fee: number;
  isPartial: boolean;
}

/**
 * Get private USDC balance for a user
 */
export async function getBalance(walletAddress: string): Promise<BalanceResult> {
  const client = getClient(walletAddress);

  if (!client) {
    throw new Error('Session not found or expired. Please sign in again.');
  }

  try {
    const result = await client.getPrivateBalanceUSDC();

    return {
      balance: result.amount ?? result.base_units / USDC_BASE_UNIT,
      baseUnits: result.base_units,
    };
  } catch (error) {
    console.error('Failed to get balance:', error);
    throw new Error(
      `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deposit USDC to Privacy Cash
 *
 * Note: The Privacy Cash SDK handles proof generation and transaction signing internally.
 * For browser-based signing, we need the SDK to return an unsigned transaction.
 *
 * Current implementation: SDK signs and sends the transaction.
 * TODO: Investigate if SDK provides unsigned transaction building for frontend signing.
 *
 * @param walletAddress - User's wallet address
 * @param amount - Amount in USDC (human-readable)
 */
export async function deposit(
  walletAddress: string,
  amount: number
): Promise<DepositResult> {
  const client = getClient(walletAddress);

  if (!client) {
    throw new Error('Session not found or expired. Please sign in again.');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const baseUnits = Math.floor(amount * USDC_BASE_UNIT);

  try {
    // The SDK handles proof generation, signing, and sending
    const result = await client.depositUSDC({ base_units: baseUnits });

    return {
      tx: result.tx,
      amount,
    };
  } catch (error) {
    console.error('Deposit failed:', error);
    throw new Error(
      `Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Withdraw USDC from Privacy Cash
 *
 * Withdrawals are processed by the Privacy Cash relayer.
 * The user doesn't need to sign the withdrawal transaction.
 *
 * @param walletAddress - User's wallet address
 * @param amount - Amount in USDC (human-readable)
 * @param recipient - Optional recipient address (defaults to self)
 */
export async function withdraw(
  walletAddress: string,
  amount: number,
  recipient?: string
): Promise<WithdrawResult> {
  const client = getClient(walletAddress);

  if (!client) {
    throw new Error('Session not found or expired. Please sign in again.');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const baseUnits = Math.floor(amount * USDC_BASE_UNIT);

  try {
    const result = await client.withdrawUSDC({
      base_units: baseUnits,
      recipientAddress: recipient,
    });

    return {
      tx: result.tx,
      recipient: result.recipient,
      amount: result.base_units / USDC_BASE_UNIT,
      fee: result.fee_base_units / USDC_BASE_UNIT,
      isPartial: result.isPartial,
    };
  } catch (error) {
    console.error('Withdrawal failed:', error);
    throw new Error(
      `Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get estimated withdrawal fees
 *
 * @param amount - Amount in USDC
 */
export function getEstimatedWithdrawalFees(amount: number): {
  protocolFeePercent: number;
  protocolFee: number;
  networkFeeSol: number;
} {
  const protocolFeePercent = 0.35; // 0.35%
  const networkFeeSol = 0.006; // ~0.006 SOL per recipient

  return {
    protocolFeePercent,
    protocolFee: amount * (protocolFeePercent / 100),
    networkFeeSol,
  };
}
