'use client';

import { useState } from 'react';
import { useSubly } from '@/contexts/SublyContext';
import { toast } from 'sonner';

export function SubscribedDashboard() {
  const { subscriptionState, unsubscribe, actionLoading, plans } = useSubly();
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  const plan = subscriptionState.subscribedPlan;

  if (!plan) {
    return null;
  }

  const handleUnsubscribe = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setIsUnsubscribing(true);
    try {
      const signature = await unsubscribe();
      toast.success('Subscription cancelled', {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });
    } catch (error) {
      toast.error('Failed to cancel subscription', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Active subscription card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-8 text-white mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-medium text-green-100">Active Subscription</span>
            </div>
            <h2 className="text-3xl font-bold">{plan.name}</h2>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{plan.priceDisplay}</p>
            <p className="text-green-100">SOL / {plan.cycleDisplay}</p>
          </div>
        </div>

        {/* Subscription details */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-green-400/30">
          <div>
            <p className="text-green-100 text-sm">Billing Cycle</p>
            <p className="font-medium">Every {plan.billingCycleDays} days</p>
          </div>
          <div>
            <p className="text-green-100 text-sm">Status</p>
            <p className="font-medium">Active</p>
          </div>
        </div>
      </div>

      {/* Benefits card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Your Benefits
        </h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Full access to {plan.name} features
          </li>
          <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Privacy-preserved subscription verification
          </li>
          <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            On-chain payment processing via Arcium MPC
          </li>
        </ul>
      </div>

      {/* Manage subscription */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Manage Subscription
        </h3>

        <div className="space-y-3">
          {/* Change plan button */}
          <button
            onClick={() => setShowPlans(!showPlans)}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-between"
          >
            <span>Change Plan</span>
            <svg
              className={`w-5 h-5 transition-transform ${showPlans ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Plan options */}
          {showPlans && (
            <div className="pt-4 space-y-2">
              {plans
                .filter((p) => !p.publicKey.equals(plan.publicKey))
                .map((p) => (
                  <div
                    key={p.publicKey.toBase58()}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {p.priceDisplay} SOL / {p.cycleDisplay}
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors">
                      Switch
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Cancel subscription */}
          <button
            onClick={handleUnsubscribe}
            disabled={isUnsubscribing || actionLoading === 'loading'}
            className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUnsubscribing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                Cancelling...
              </span>
            ) : (
              'Cancel Subscription'
            )}
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Your subscription data is encrypted on-chain via Arcium MPC
        </p>
      </div>
    </div>
  );
}
