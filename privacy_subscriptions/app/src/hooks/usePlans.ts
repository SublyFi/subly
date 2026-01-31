"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { createAnchorProvider, getProgram } from "@/lib/anchor";
import {
  fetchMerchantPlans,
  executeCreatePlan,
  executeUpdatePlan,
  getNextPlanId,
  nameToString,
} from "@/lib/merchant";
import { SubscriptionPlan, CreatePlanData, UpdatePlanData } from "@/types";

export interface UsePlansReturn {
  // List of subscription plans
  plans: SubscriptionPlan[];
  // Loading state
  isLoading: boolean;
  // Error state
  error: Error | null;
  // Create a new plan
  createPlan: (data: CreatePlanData) => Promise<string>;
  // Update an existing plan
  updatePlan: (planPda: PublicKey, data: UpdatePlanData) => Promise<string>;
  // Toggle plan active status
  togglePlan: (planPda: PublicKey, isActive: boolean) => Promise<string>;
  // Refresh plans list
  refresh: () => Promise<void>;
}

/**
 * Hook for managing subscription plans
 */
export function usePlans(): UsePlansReturn {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch plans data
   */
  const fetchPlansData = useCallback(async () => {
    if (!wallet.publicKey) {
      setPlans([]);
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
      const plansData = await fetchMerchantPlans(program, wallet.publicKey);

      const mappedPlans: SubscriptionPlan[] = plansData.map((p) => ({
        publicKey: p.publicKey,
        merchant: p.account.merchant,
        planId: BigInt(p.account.planId.toString()),
        name: nameToString(p.account.name),
        mint: p.account.mint,
        price: BigInt(p.account.price.toString()),
        billingCycleDays: p.account.billingCycleDays,
        isActive: p.account.isActive,
        createdAt: p.account.createdAt.toNumber(),
      }));

      setPlans(mappedPlans);
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch plans"));
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [connection, wallet]);

  /**
   * Create a new plan
   */
  const createPlan = useCallback(
    async (data: CreatePlanData): Promise<string> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create provider");
      }

      const program = getProgram(provider);

      // Get next plan ID
      const planId = await getNextPlanId(program, wallet.publicKey);

      const signature = await executeCreatePlan(
        program,
        wallet.publicKey,
        planId,
        data.name,
        data.price,
        data.billingCycleDays
      );

      // Refresh plans after creation
      await fetchPlansData();

      return signature;
    },
    [connection, wallet, fetchPlansData]
  );

  /**
   * Update an existing plan
   */
  const updatePlan = useCallback(
    async (planPda: PublicKey, data: UpdatePlanData): Promise<string> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create provider");
      }

      const program = getProgram(provider);
      const signature = await executeUpdatePlan(
        program,
        wallet.publicKey,
        planPda,
        data
      );

      // Refresh plans after update
      await fetchPlansData();

      return signature;
    },
    [connection, wallet, fetchPlansData]
  );

  /**
   * Toggle plan active status
   */
  const togglePlan = useCallback(
    async (planPda: PublicKey, isActive: boolean): Promise<string> => {
      return updatePlan(planPda, { isActive });
    },
    [updatePlan]
  );

  /**
   * Refresh plans
   */
  const refresh = useCallback(async () => {
    await fetchPlansData();
  }, [fetchPlansData]);

  // Fetch plans on wallet change
  useEffect(() => {
    fetchPlansData();
  }, [fetchPlansData]);

  return {
    plans,
    isLoading,
    error,
    createPlan,
    updatePlan,
    togglePlan,
    refresh,
  };
}
