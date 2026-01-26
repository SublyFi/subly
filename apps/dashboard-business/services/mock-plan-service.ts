import type { Plan, CreatePlanInput, UpdatePlanInput } from '@/types/plan';
import { STORAGE_KEYS } from '@/lib/constants';
import { PlanNotFoundError, PlanValidationError } from '@/lib/errors';

function generateId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getPlansFromStorage(walletAddress: string): Plan[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.PLANS);
  if (!data) return [];
  const allPlans: Record<string, Plan[]> = JSON.parse(data);
  return allPlans[walletAddress] || [];
}

function savePlansToStorage(walletAddress: string, plans: Plan[]): void {
  if (typeof window === 'undefined') return;
  const data = localStorage.getItem(STORAGE_KEYS.PLANS);
  const allPlans: Record<string, Plan[]> = data ? JSON.parse(data) : {};
  allPlans[walletAddress] = plans;
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(allPlans));
}

export const mockPlanService = {
  async getPlans(walletAddress: string): Promise<Plan[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getPlansFromStorage(walletAddress);
  },

  async getPlanById(walletAddress: string, planId: string): Promise<Plan> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const plans = getPlansFromStorage(walletAddress);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      throw new PlanNotFoundError();
    }
    return plan;
  },

  async createPlan(walletAddress: string, input: CreatePlanInput): Promise<Plan> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!input.name.trim()) {
      throw new PlanValidationError('プラン名は必須です');
    }
    if (input.priceUsdc <= 0) {
      throw new PlanValidationError('価格は0より大きい値を設定してください');
    }

    const plans = getPlansFromStorage(walletAddress);
    const now = new Date().toISOString();
    const newPlan: Plan = {
      id: generateId(),
      name: input.name.trim(),
      description: input.description.trim(),
      priceUsdc: input.priceUsdc,
      billingCycle: input.billingCycle,
      isActive: true,
      subscriptionCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    plans.push(newPlan);
    savePlansToStorage(walletAddress, plans);
    return newPlan;
  },

  async updatePlan(
    walletAddress: string,
    planId: string,
    input: UpdatePlanInput
  ): Promise<Plan> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const plans = getPlansFromStorage(walletAddress);
    const planIndex = plans.findIndex((p) => p.id === planId);
    if (planIndex === -1) {
      throw new PlanNotFoundError();
    }

    if (input.name !== undefined && !input.name.trim()) {
      throw new PlanValidationError('プラン名は必須です');
    }
    if (input.priceUsdc !== undefined && input.priceUsdc <= 0) {
      throw new PlanValidationError('価格は0より大きい値を設定してください');
    }

    const updatedPlan: Plan = {
      ...plans[planIndex],
      ...input,
      name: input.name?.trim() ?? plans[planIndex].name,
      description: input.description?.trim() ?? plans[planIndex].description,
      updatedAt: new Date().toISOString(),
    };

    plans[planIndex] = updatedPlan;
    savePlansToStorage(walletAddress, plans);
    return updatedPlan;
  },

  async deactivatePlan(walletAddress: string, planId: string): Promise<Plan> {
    return this.updatePlan(walletAddress, planId, { isActive: false });
  },
};
