"use client";

import { FC, useState } from "react";
import { Calendar, Clock, AlertTriangle, X } from "lucide-react";
import { UserSubscription } from "@/types";
import { formatUSDC, formatDate } from "@/lib/format";
import { useUnsubscribe } from "@/hooks/useUnsubscribe";
import { TransactionStatus } from "@/components/common/TransactionStatus";

interface SubscriptionCardProps {
  subscription: UserSubscription;
  onUnsubscribed?: () => void;
}

export const SubscriptionCard: FC<SubscriptionCardProps> = ({
  subscription,
  onUnsubscribed,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { mutate, state, error, signature, reset } = useUnsubscribe();

  const handleUnsubscribe = async () => {
    await mutate({
      subscriptionPubkey: subscription.publicKey,
      subscriptionIndex: subscription.subscriptionIndex,
    });
    if (state === "success" && onUnsubscribed) {
      onUnsubscribed();
    }
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    reset();
  };

  const statusColor =
    subscription.status === "active"
      ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {subscription.planName || "Encrypted Plan"}
              </h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColor}`}
              >
                {subscription.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Next payment: {formatDate(subscription.nextPaymentAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {formatUSDC(subscription.paymentAmount)} USDC / month
                </span>
              </div>
            </div>
          </div>

          {subscription.status === "active" && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="text-sm text-error-500 hover:text-error-600 font-medium transition-colors"
            >
              Unsubscribe
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-50 dark:bg-warning-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Unsubscription
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {state === "success" ? (
              <div className="space-y-4">
                <TransactionStatus
                  state={state}
                  signature={signature}
                  error={error}
                />
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Are you sure you want to unsubscribe from{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {subscription.planName || "this plan"}
                    </span>
                    ?
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">
                      <strong>What happens when you unsubscribe:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>No further payments will be processed</li>
                      <li>
                        You can continue using the service until the end of
                        your billing period
                      </li>
                      <li>You can resubscribe at any time</li>
                    </ul>
                  </div>
                </div>

                {error && (
                  <div className="mb-4">
                    <TransactionStatus state={state} error={error} />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    disabled={state === "loading"}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnsubscribe}
                    disabled={state === "loading"}
                    className="flex-1 bg-error-500 hover:bg-error-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {state === "loading" ? "Processing..." : "Unsubscribe"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
