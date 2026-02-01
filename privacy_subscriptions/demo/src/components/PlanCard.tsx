'use client';

import { useState } from 'react';
import { DisplayPlan } from '@/types';
import { useSubly } from '@/contexts/SublyContext';
import { toast } from 'sonner';

interface PlanCardProps {
  plan: DisplayPlan;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
}

export function PlanCard({ plan, isCurrentPlan = false, isPopular = false }: PlanCardProps) {
  const { subscribe, actionLoading } = useSubly();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const signature = await subscribe(plan.publicKey);
      toast.success('Subscription successful!', {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });
    } catch (error) {
      toast.error('Subscription failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
        isCurrentPlan
          ? 'border-green-500'
          : isPopular
          ? 'border-primary-500'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Popular badge */}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">
            Popular
          </span>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            Current Plan
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mb-4">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          {plan.priceDisplay}
        </span>
        <span className="text-gray-500 dark:text-gray-400 ml-1">
          USDC/{plan.cycleDisplay}
        </span>
      </div>

      {/* Billing info */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Billed every {plan.billingCycleDays} day{plan.billingCycleDays !== 1 ? 's' : ''}
      </p>

      {/* Subscribe button */}
      <button
        onClick={handleSubscribe}
        disabled={isCurrentPlan || isSubscribing || actionLoading === 'loading'}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isCurrentPlan
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : isSubscribing || actionLoading === 'loading'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {isCurrentPlan ? (
          'Subscribed'
        ) : isSubscribing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          'Subscribe'
        )}
      </button>
    </div>
  );
}
