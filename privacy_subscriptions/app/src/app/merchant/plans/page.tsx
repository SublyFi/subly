"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMerchant } from "@/hooks/useMerchant";
import { usePlans } from "@/hooks/usePlans";
import { PlanList } from "@/components/merchant/PlanList";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import Link from "next/link";

export default function MerchantPlansPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { isRegistered, isLoading: isMerchantLoading } = useMerchant();
  const { plans, isLoading: isPlansLoading, refresh } = usePlans();

  // Redirect to registration if not registered
  useEffect(() => {
    if (!isMerchantLoading && wallet.connected && !isRegistered) {
      router.push("/merchant/register");
    }
  }, [isMerchantLoading, isRegistered, wallet.connected, router]);

  // Show loading while checking registration status
  if (isMerchantLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show connect wallet message if not connected
  if (!wallet.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-400">
            Please connect your wallet to manage your subscription plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Subscription Plans
            </h1>
            <p className="text-gray-400">
              Manage your subscription plans and pricing
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <Link
              href="/merchant/plans/create"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Plan
            </Link>
          </div>
        </div>

        {/* Plans List */}
        <PlanList plans={plans} isLoading={isPlansLoading} />
      </div>
    </div>
  );
}
