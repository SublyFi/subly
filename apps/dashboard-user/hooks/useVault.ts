'use client';

import { useMockData } from '@/providers/MockDataProvider';
import type { VaultState } from '@/types/vault';

/**
 * Hook for managing vault state and operations.
 *
 * Currently uses mock data. When SDK is ready, this will be replaced
 * with actual vault-sdk calls.
 *
 * @example
 * ```tsx
 * const { balance, yieldInfo, deposit, withdraw } = useVault();
 *
 * // Deposit 100 USDC
 * await deposit(100_000_000);
 *
 * // Withdraw 50 USDC
 * await withdraw(50_000_000);
 * ```
 */
export function useVault(): VaultState & {
  deposit: (amount: number) => Promise<string>;
  withdraw: (amount: number) => Promise<string>;
} {
  const {
    vaultBalance,
    yieldInfo,
    scheduledTransfers,
    deposit,
    withdraw,
  } = useMockData();

  return {
    balance: vaultBalance,
    yieldInfo,
    scheduledTransfers,
    isLoading: false, // Mock data is always ready
    error: null,
    deposit,
    withdraw,
  };
}
