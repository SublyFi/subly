"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { usePlans } from "@/hooks/usePlans";
import { PlanCard } from "@/components/subscriptions";

export default function BrowsePlansPage() {
  const { connected } = useWallet();
  const { plans, loading, error, refresh } = usePlans();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubscribed = () => {
    setSuccessMessage("Successfully subscribed! View your subscription on the home page.");
    setTimeout(() => setSuccessMessage(null), 5000);
    refresh();
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Browse Subscription Plans
        </h1>
        <p className="text-gray-600 mb-8 max-w-md">
          Connect your wallet to browse and subscribe to available plans.
        </p>
        <div className="text-sm text-gray-500">
          Click &quot;Select Wallet&quot; in the header to get started
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and subscribe to plans from various businesses
          </p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          &larr; Back to My Subscriptions
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            No subscription plans available at the moment.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Check back later for new plans from businesses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.publicKey.toBase58()}
              plan={plan}
              onSubscribed={handleSubscribed}
            />
          ))}
        </div>
      )}

      <div className="mt-12 bg-gray-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Privacy-First Subscriptions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Your Data is Protected</h3>
            <p className="text-gray-600">
              Your subscription data is encrypted using Arcium MPC. Businesses can see
              how many subscribers they have, but they cannot identify individual users.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Prove Membership Privately</h3>
            <p className="text-gray-600">
              Use zero-knowledge proofs to prove your membership without revealing
              your identity or wallet address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
