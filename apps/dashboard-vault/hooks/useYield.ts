"use client";

import { useState, useEffect, useCallback } from "react";
import { useVault } from "./useVault";
import { YIELD_REFRESH_INTERVAL } from "@/lib/constants";

interface YieldState {
  apy: number;
  earnedUsdc: bigint;
  poolValue: bigint;
  poolShares: bigint;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage yield information
 * Automatically refreshes every 60 seconds
 */
export function useYield(): YieldState {
  const { client, isInitialized } = useVault();
  const [apy, setApy] = useState<number>(0);
  const [earnedUsdc, setEarnedUsdc] = useState<bigint>(0n);
  const [poolValue, setPoolValue] = useState<bigint>(0n);
  const [poolShares, setPoolShares] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !isInitialized) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch yield info
      const yieldInfo = await client.getYieldInfo();
      setApy(yieldInfo.apy);
      setEarnedUsdc(yieldInfo.earnedUsdc);

      // Fetch pool info
      const pool = await client.getShieldPool();
      if (pool) {
        setPoolValue(BigInt(pool.totalPoolValue.toString()));
        setPoolShares(BigInt(pool.totalShares.toString()));
      }
    } catch (err) {
      console.error("Failed to fetch yield info:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch yield info"
      );
    } finally {
      setLoading(false);
    }
  }, [client, isInitialized]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (!isInitialized) return;

    // Initial fetch
    refresh();

    // Set up auto-refresh interval
    const interval = setInterval(refresh, YIELD_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isInitialized, refresh]);

  return {
    apy,
    earnedUsdc,
    poolValue,
    poolShares,
    loading,
    error,
    refresh,
  };
}
