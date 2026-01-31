"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { YIELD_REFRESH_INTERVAL } from "@/lib/constants";

interface KaminoState {
  /** Supply APY as percentage (e.g., 5.25 for 5.25%) */
  apy: number;
  /** Total supply in USDC */
  totalSupply: string | null;
  /** Utilization rate as decimal (e.g., 0.75 for 75%) */
  utilizationRate: number | null;
  /** Borrow APY as percentage */
  borrowAPY: number;
  /** User's deposited amount in USDC */
  userDeposited: number;
  /** Whether the service is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the service is initialized */
  isInitialized: boolean;
  /** Whether a transaction is pending */
  isPending: boolean;
  /** Refresh stats manually */
  refresh: () => Promise<void>;
  /** Deposit USDC to Kamino via Shield Pool */
  deposit: (amountUsdc: number) => Promise<string>;
  /** Withdraw USDC from Kamino via Shield Pool */
  withdraw: (amountUsdc: number) => Promise<string>;
}

/**
 * Hook to interact with Kamino Finance lending protocol
 * Fetches data from server-side API to avoid bundling Kamino SDK in browser
 */
export function useKamino(): KaminoState {
  const { publicKey } = useWallet();

  const [apy, setApy] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [utilizationRate, setUtilizationRate] = useState<number | null>(null);
  const [borrowAPY, setBorrowAPY] = useState<number>(0);
  const [userDeposited, setUserDeposited] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initializingRef = useRef(false);

  // Refresh stats from API
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const walletParam = publicKey ? `?walletAddress=${publicKey.toBase58()}` : "";
      const response = await fetch(`/api/kamino/stats${walletParam}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch Kamino stats");
      }

      if (data.success && data.stats) {
        setApy(data.stats.supplyAPY);
        setBorrowAPY(data.stats.borrowAPY);
        setTotalSupply(data.stats.totalSupply);
        setUtilizationRate(data.stats.utilizationRate);
        setUserDeposited(data.userDeposited || 0);
        setIsInitialized(true);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch Kamino stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    // Prevent multiple initializations
    if (initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    // Initial fetch
    refresh().finally(() => {
      initializingRef.current = false;
    });

    // Set up auto-refresh interval
    const interval = setInterval(refresh, YIELD_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refresh]);

  // Refresh when wallet changes
  useEffect(() => {
    if (isInitialized) {
      refresh();
    }
  }, [publicKey, isInitialized, refresh]);

  /**
   * Deposit USDC to Kamino via Shield Pool
   * Uses backend API for privacy-preserving deposits
   * @param amountUsdc - Amount in USDC (human readable, e.g., 100 for 100 USDC)
   * @returns Transaction signature
   */
  const deposit = useCallback(
    async (amountUsdc: number): Promise<string> => {
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }
      if (amountUsdc <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      setIsPending(true);
      setError(null);

      try {
        // Call backend API for Shield Pool deposit
        // This triggers: Privacy Cash withdraw → Shield Pool → Kamino deposit
        const response = await fetch("/api/kamino/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            amount: amountUsdc,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Deposit failed");
        }

        console.log("Kamino deposit transaction:", data.tx);

        // Refresh stats after deposit
        await refresh();

        return data.tx;
      } catch (err) {
        console.error("Deposit failed:", err);
        const message = err instanceof Error ? err.message : "Deposit failed";
        setError(message);
        throw new Error(message);
      } finally {
        setIsPending(false);
      }
    },
    [publicKey, refresh]
  );

  /**
   * Withdraw USDC from Kamino via Shield Pool
   * Uses backend API for privacy-preserving withdrawals
   * @param amountUsdc - Amount in USDC (human readable, e.g., 100 for 100 USDC)
   * @returns Transaction signature
   */
  const withdraw = useCallback(
    async (amountUsdc: number): Promise<string> => {
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }
      if (amountUsdc <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      setIsPending(true);
      setError(null);

      try {
        // Call backend API for Shield Pool withdrawal
        // This triggers: Kamino redeem → Shield Pool → Privacy Cash deposit
        const response = await fetch("/api/kamino/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            amount: amountUsdc,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Withdrawal failed");
        }

        console.log("Kamino withdrawal transaction:", data.tx);

        // Refresh stats after withdrawal
        await refresh();

        return data.tx;
      } catch (err) {
        console.error("Withdrawal failed:", err);
        const message = err instanceof Error ? err.message : "Withdrawal failed";
        setError(message);
        throw new Error(message);
      } finally {
        setIsPending(false);
      }
    },
    [publicKey, refresh]
  );

  return {
    apy,
    totalSupply,
    utilizationRate,
    borrowAPY,
    userDeposited,
    loading,
    error,
    isInitialized,
    isPending,
    refresh,
    deposit,
    withdraw,
  };
}
