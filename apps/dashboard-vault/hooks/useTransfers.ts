"use client";

import { useState, useEffect, useCallback } from "react";
import { useVault } from "./useVault";
import type { LocalTransferData } from "@/providers/VaultProvider";
import { PublicKey } from "@solana/web3.js";

interface TransfersState {
  transfers: LocalTransferData[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setupTransfer: (params: SetupTransferParams) => Promise<{ transferId: string }>;
  cancelTransfer: (transferId: string) => Promise<void>;
  executeTransfer: (transferId: string) => Promise<{ tx: string }>;
}

interface SetupTransferParams {
  recipientAddress: string;
  amountUsdc: number;
  interval: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
  memo?: string;
}

// Interval seconds mapping
const INTERVAL_SECONDS = {
  HOURLY: 3600,
  DAILY: 86400,
  WEEKLY: 604800,
  MONTHLY: 2592000,
} as const;

/**
 * Hook to manage recurring transfers
 */
export function useTransfers(): TransfersState {
  const { client, isInitialized } = useVault();
  const [transfers, setTransfers] = useState<LocalTransferData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !isInitialized) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allTransfers = await client.getAllLocalTransfers();
      setTransfers(allTransfers);
    } catch (err) {
      console.error("Failed to fetch transfers:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch transfers"
      );
    } finally {
      setLoading(false);
    }
  }, [client, isInitialized]);

  // Initial fetch
  useEffect(() => {
    if (!isInitialized) return;
    refresh();
  }, [isInitialized, refresh]);

  const setupTransfer = useCallback(
    async (params: SetupTransferParams): Promise<{ transferId: string }> => {
      if (!client || !isInitialized) {
        throw new Error("Vault client not initialized");
      }

      const result = await client.setupRecurringPayment({
        recipientAddress: new PublicKey(params.recipientAddress),
        amountUsdc: params.amountUsdc,
        interval: params.interval,
        memo: params.memo,
      });

      // Refresh transfers list
      await refresh();

      return { transferId: result.transferId };
    },
    [client, isInitialized, refresh]
  );

  const cancelTransfer = useCallback(
    async (transferId: string): Promise<void> => {
      if (!client || !isInitialized) {
        throw new Error("Vault client not initialized");
      }

      await client.cancelRecurringPayment(new PublicKey(transferId));

      // Refresh transfers list
      await refresh();
    },
    [client, isInitialized, refresh]
  );

  const executeTransfer = useCallback(
    async (transferId: string): Promise<{ tx: string }> => {
      if (!client || !isInitialized) {
        throw new Error("Vault client not initialized");
      }

      const result = await client.executeScheduledTransfer(
        new PublicKey(transferId),
        0 // execution index
      );

      // Refresh transfers list
      await refresh();

      return { tx: result.privacyCashTx };
    },
    [client, isInitialized, refresh]
  );

  return {
    transfers,
    loading,
    error,
    refresh,
    setupTransfer,
    cancelTransfer,
    executeTransfer,
  };
}
