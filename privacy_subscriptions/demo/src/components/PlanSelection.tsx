'use client';

import { useSubly } from '@/contexts/SublyContext';
import { PlanCard } from './PlanCard';

export function PlanSelection() {
  const { plans, plansLoading, subscriptionState, refreshPlans } = useSubly();

  if (plansLoading === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading plans...</p>
      </div>
    );
  }

  if (plansLoading === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">Failed to load plans</p>
        <button
          onClick={refreshPlans}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No subscription plans available
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          The merchant has not created any plans yet.
        </p>
      </div>
    );
  }

  // Determine which plan is popular (e.g., middle plan or most expensive)
  const popularIndex = Math.floor(plans.length / 2);

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Plan
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Select the plan that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.publicKey.toBase58()}
            plan={plan}
            isCurrentPlan={
              subscriptionState.subscribedPlan?.publicKey.equals(plan.publicKey) ?? false
            }
            isPopular={index === popularIndex}
          />
        ))}
      </div>

      {/* Privacy info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Your subscription is verified on-chain via Arcium MPC encryption
        </p>
      </div>
    </div>
  );
}
