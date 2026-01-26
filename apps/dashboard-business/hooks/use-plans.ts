'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Plan, CreatePlanInput, UpdatePlanInput } from '@/types/plan';
import { mockPlanService } from '@/services/mock-plan-service';

export function usePlans() {
  const { publicKey } = useWallet();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() || '';

  const fetchPlans = useCallback(async () => {
    if (!walletAddress) {
      setPlans([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await mockPlanService.getPlans(walletAddress);
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プランの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (input: CreatePlanInput): Promise<Plan> => {
    if (!walletAddress) {
      throw new Error('ウォレットが接続されていません');
    }

    const newPlan = await mockPlanService.createPlan(walletAddress, input);
    setPlans((prev) => [...prev, newPlan]);
    return newPlan;
  };

  const updatePlan = async (
    planId: string,
    input: UpdatePlanInput
  ): Promise<Plan> => {
    if (!walletAddress) {
      throw new Error('ウォレットが接続されていません');
    }

    const updatedPlan = await mockPlanService.updatePlan(
      walletAddress,
      planId,
      input
    );
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? updatedPlan : p))
    );
    return updatedPlan;
  };

  const deactivatePlan = async (planId: string): Promise<Plan> => {
    if (!walletAddress) {
      throw new Error('ウォレットが接続されていません');
    }

    const deactivatedPlan = await mockPlanService.deactivatePlan(
      walletAddress,
      planId
    );
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? deactivatedPlan : p))
    );
    return deactivatedPlan;
  };

  const getPlanById = async (planId: string): Promise<Plan> => {
    if (!walletAddress) {
      throw new Error('ウォレットが接続されていません');
    }
    return mockPlanService.getPlanById(walletAddress, planId);
  };

  return {
    plans,
    isLoading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deactivatePlan,
    getPlanById,
  };
}
