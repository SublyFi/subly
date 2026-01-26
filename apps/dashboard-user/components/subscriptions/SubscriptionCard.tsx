"use client";

import { FC, useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMembership } from "@/providers/MembershipProvider";

interface Subscription {
  publicKey: PublicKey;
  plan: PublicKey;
  membershipCommitment: Uint8Array;
  subscribedAt: Date;
  cancelledAt: Date | null;
  isActive: boolean;
}

interface PlanInfo {
  name: string;
  description: string;
  priceUsdc: number;
  billingCycleDays: number;
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancelled?: () => void;
}

export const SubscriptionCard: FC<SubscriptionCardProps> = ({
  subscription,
  onCancelled,
}) => {
  const { client, isReady } = useMembership();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlanInfo = async () => {
      if (!client || !isReady) return;

      setLoading(true);
      try {
        const plan = await client.getPlan(subscription.plan);
        if (plan) {
          setPlanInfo({
            name: plan.name || "Unnamed Plan",
            description: plan.description || "",
            priceUsdc: plan.priceUsdc,
            billingCycleDays: plan.billingCycleDays,
          });
        }
      } catch {
        // Failed to fetch plan info
      } finally {
        setLoading(false);
      }
    };

    fetchPlanInfo();
  }, [client, isReady, subscription.plan]);

  const handleCancel = async () => {
    if (!client || !isReady) return;

    setCancelling(true);
    setError(null);

    try {
      const result = await client.cancelSubscription(subscription.publicKey);

      if (result.success) {
        onCancelled?.();
      } else {
        setError(result.error || "Failed to cancel subscription");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          {loading ? (
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <h3 className="text-lg font-semibold text-gray-900">
              {planInfo?.name || "Unknown Plan"}
            </h3>
          )}
          {planInfo && (
            <p className="text-sm text-gray-500 mt-1">{planInfo.description}</p>
          )}
        </div>

        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscription.isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {subscription.isActive ? "Active" : "Cancelled"}
        </span>
      </div>

      {planInfo && (
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Price</span>
            <div className="font-medium">${planInfo.priceUsdc.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-500">Billing Cycle</span>
            <div className="font-medium">{planInfo.billingCycleDays} days</div>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 mb-4">
        <div>Subscribed: {subscription.subscribedAt.toLocaleDateString()}</div>
        {subscription.cancelledAt && (
          <div>Cancelled: {subscription.cancelledAt.toLocaleDateString()}</div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      {subscription.isActive && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            cancelling
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          {cancelling ? "Cancelling..." : "Cancel Subscription"}
        </button>
      )}
    </div>
  );
};
