"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMembership } from "@/providers/MembershipProvider";

export interface Plan {
  publicKey: PublicKey;
  business: PublicKey;
  name?: string;
  description?: string;
  priceUsdc: number;
  billingCycleDays: number;
  createdAt: Date;
  isActive: boolean;
}

interface UsePlansResult {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlans(businessPubkey?: PublicKey): UsePlansResult {
  const { client, isReady } = useMembership();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!client || !isReady) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedPlans = await client.getPlans({
        business: businessPubkey,
        isActive: true,
      });
      setPlans(fetchedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  }, [client, isReady, businessPubkey]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    loading,
    error,
    refresh: fetchPlans,
  };
}
