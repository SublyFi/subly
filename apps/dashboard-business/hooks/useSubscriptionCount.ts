"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMembership } from "@/providers/MembershipProvider";

export interface UseSubscriptionCountResult {
  count: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get subscription count for a plan
 * Counts active subscriptions by fetching subscription accounts
 */
export function useSubscriptionCount(
  planPubkey: PublicKey | null
): UseSubscriptionCountResult {
  const { client } = useMembership();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!client || !planPubkey) {
      setCount(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const subscriptions = await client.getSubscriptions(planPubkey, {
        isActive: true,
      });
      setCount(subscriptions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch count");
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [client, planPubkey]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    error,
    refetch: fetchCount,
  };
}

/**
 * Hook to get subscription counts for multiple plans
 */
export function useSubscriptionCounts(
  planPubkeys: PublicKey[]
): Map<string, UseSubscriptionCountResult> {
  const { client } = useMembership();
  const [results, setResults] = useState<Map<string, UseSubscriptionCountResult>>(
    new Map()
  );

  const fetchCounts = useCallback(async () => {
    if (!client || planPubkeys.length === 0) {
      return;
    }

    const newResults = new Map<string, UseSubscriptionCountResult>();

    // Initialize all with loading state
    for (const pubkey of planPubkeys) {
      newResults.set(pubkey.toBase58(), {
        count: null,
        loading: true,
        error: null,
        refetch: async () => {},
      });
    }
    setResults(new Map(newResults));

    // Fetch counts in parallel
    const promises = planPubkeys.map(async (pubkey) => {
      const key = pubkey.toBase58();
      try {
        const subscriptions = await client.getSubscriptions(pubkey, {
          isActive: true,
        });
        return { key, count: subscriptions.length, error: null };
      } catch (err) {
        return {
          key,
          count: null,
          error: err instanceof Error ? err.message : "Failed to fetch",
        };
      }
    });

    const fetchResults = await Promise.all(promises);

    const finalResults = new Map<string, UseSubscriptionCountResult>();
    for (const result of fetchResults) {
      finalResults.set(result.key, {
        count: result.count,
        loading: false,
        error: result.error,
        refetch: async () => {},
      });
    }
    setResults(finalResults);
  }, [client, planPubkeys]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return results;
}
