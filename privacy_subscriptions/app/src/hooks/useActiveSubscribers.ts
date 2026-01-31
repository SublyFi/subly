"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createAnchorProvider, getProgram } from "@/lib/anchor";
import { countActiveSubscribers } from "@/lib/merchant";

export interface UseActiveSubscribersReturn {
  // Number of active subscribers
  count: number;
  // Loading state
  isLoading: boolean;
  // Error state
  error: Error | null;
  // Refresh count
  refresh: () => Promise<void>;
}

/**
 * Hook for counting active subscribers for a merchant
 */
export function useActiveSubscribers(): UseActiveSubscribersReturn {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch active subscribers count
   */
  const fetchSubscribersCount = useCallback(async () => {
    if (!wallet.publicKey) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create provider");
      }

      const program = getProgram(provider);
      const subscriberCount = await countActiveSubscribers(
        program,
        wallet.publicKey
      );

      setCount(subscriberCount);
    } catch (err) {
      console.error("Error counting subscribers:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to count subscribers")
      );
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [connection, wallet]);

  /**
   * Refresh count
   */
  const refresh = useCallback(async () => {
    await fetchSubscribersCount();
  }, [fetchSubscribersCount]);

  // Fetch count on wallet change
  useEffect(() => {
    fetchSubscribersCount();
  }, [fetchSubscribersCount]);

  return {
    count,
    isLoading,
    error,
    refresh,
  };
}
