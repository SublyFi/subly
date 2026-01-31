"use client";

import { FC } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { UserSubscription } from "@/types";
import { SubscriptionCard } from "./SubscriptionCard";
import { LoadingOverlay } from "@/components/common/LoadingSpinner";

interface SubscriptionListProps {
  subscriptions: UserSubscription[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const SubscriptionList: FC<SubscriptionListProps> = ({
  subscriptions,
  isLoading,
  error,
  onRefresh,
}) => {
  if (isLoading) {
    return <LoadingOverlay message="Loading subscriptions..." />;
  }

  if (error) {
    return (
      <div className="bg-error-50 dark:bg-error-500/10 rounded-xl p-6 text-center">
        <p className="text-error-600 dark:text-error-400 mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-12 text-center">
        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Subscriptions Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You haven&apos;t subscribed to any services yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.publicKey.toBase58()}
          subscription={subscription}
          onUnsubscribed={onRefresh}
        />
      ))}
    </div>
  );
};
