'use client';

import { useMockData } from '@/providers/MockDataProvider';

export function useSubscriptions() {
  const { subscriptions, availablePlans, subscribe, unsubscribe, isLoading } = useMockData();

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);
  const cancelledSubscriptions = subscriptions.filter((s) => !s.isActive);

  const isSubscribedToPlan = (planId: string) => {
    return subscriptions.some((s) => s.plan.id === planId && s.isActive);
  };

  const getSubscriptionByPlanId = (planId: string) => {
    return subscriptions.find((s) => s.plan.id === planId);
  };

  const totalMonthlySpend = activeSubscriptions.reduce((total, sub) => {
    const { plan } = sub;
    let monthlyAmount = plan.priceUsdc;

    switch (plan.billingCycle) {
      case 'hourly':
        monthlyAmount = plan.priceUsdc * 24 * 30;
        break;
      case 'daily':
        monthlyAmount = plan.priceUsdc * 30;
        break;
      case 'weekly':
        monthlyAmount = plan.priceUsdc * 4;
        break;
      case 'monthly':
        monthlyAmount = plan.priceUsdc;
        break;
      case 'yearly':
        monthlyAmount = plan.priceUsdc / 12;
        break;
    }

    return total + monthlyAmount;
  }, 0);

  return {
    subscriptions,
    activeSubscriptions,
    cancelledSubscriptions,
    availablePlans,
    subscribe,
    unsubscribe,
    isLoading,
    isSubscribedToPlan,
    getSubscriptionByPlanId,
    totalMonthlySpend,
  };
}
