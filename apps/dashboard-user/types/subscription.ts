export interface Plan {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  description: string;
  priceUsdc: number; // 6 decimals
  billingCycleSeconds: number;
  billingCycle: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  isActive: boolean;
  subscriberCount: number;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  planId: string;
  plan: Plan;
  subscribedAt: Date;
  nextBillingAt: Date;
  isActive: boolean;
}

export interface SubscriptionState {
  subscriptions: Subscription[];
  availablePlans: Plan[];
  isLoading: boolean;
  error: string | null;
}

export interface SubscribeResult {
  subscriptionId: string;
  signature: string;
  timestamp: Date;
}

export interface UnsubscribeResult {
  signature: string;
  timestamp: Date;
}
