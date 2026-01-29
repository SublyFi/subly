"use client";

import { FC, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMembership } from "@/providers/MembershipProvider";
import { useSubscriptions, StoredSubscription } from "@/hooks/useSubscriptions";

interface Plan {
  publicKey: PublicKey;
  business: PublicKey;
  name?: string;
  description?: string;
  priceUsdc: number;
  billingCycleDays: number;
  createdAt: Date;
  isActive: boolean;
}

interface PlanCardProps {
  plan: Plan;
  onSubscribed?: () => void;
}

export const PlanCard: FC<PlanCardProps> = ({ plan, onSubscribed }) => {
  const { client, isReady } = useMembership();
  const { saveSubscription } = useSubscriptions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!client || !isReady) {
      setError("Please connect your wallet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate a random secret for the user
      const userSecret = crypto.getRandomValues(new Uint8Array(32));

      const result = await client.subscribe({
        plan: plan.publicKey,
        userSecret,
      });

      if (result.success && result.membershipCommitment) {
        // Derive subscription PDA to save
        const { deriveSubscriptionPda } = await import("@subly/membership-sdk");
        const [subscriptionPda] = deriveSubscriptionPda(
          plan.publicKey,
          result.membershipCommitment,
          client.getProgramId()
        );

        // Save subscription info to localStorage
        const storedSub: StoredSubscription = {
          planPubkey: plan.publicKey.toBase58(),
          subscriptionPubkey: subscriptionPda.toBase58(),
          membershipCommitment: Buffer.from(result.membershipCommitment).toString("base64"),
          userSecret: Buffer.from(userSecret).toString("base64"),
          subscribedAt: Date.now(),
        };

        saveSubscription(storedSub);
        onSubscribed?.();
      } else {
        setError(result.error || "Failed to subscribe");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name || "Unnamed Plan"}</h3>
        {plan.description && (
          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold text-gray-900">
            ${plan.priceUsdc.toFixed(2)}
          </span>
          <span className="text-gray-500 ml-2">
            / {plan.billingCycleDays} days
          </span>
        </div>
      </div>

      <div className="mb-4 text-xs text-gray-400">
        Business: {plan.business.toBase58().slice(0, 8)}...
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading || !plan.isActive}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          loading || !plan.isActive
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {loading ? "Subscribing..." : plan.isActive ? "Subscribe" : "Plan Inactive"}
      </button>
    </div>
  );
};
