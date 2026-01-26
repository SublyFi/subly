export type BillingCycle = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceUsdc: number;
  billingCycle: BillingCycle;
  isActive: boolean;
  subscriptionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  name: string;
  description: string;
  priceUsdc: number;
  billingCycle: BillingCycle;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  priceUsdc?: number;
  billingCycle?: BillingCycle;
  isActive?: boolean;
}
