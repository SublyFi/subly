"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMerchant } from "@/hooks/useMerchant";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { WalletButton } from "@/components/common/WalletButton";
import { MerchantStats } from "@/components/merchant/MerchantStats";
import Link from "next/link";

export default function MerchantDashboardPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { isRegistered, merchant, isLoading } = useMerchant();

  // Redirect to registration if not registered
  useEffect(() => {
    if (!isLoading && wallet.connected && !isRegistered) {
      router.push("/merchant/register");
    }
  }, [isLoading, isRegistered, wallet.connected, router]);

  // Show loading while checking registration status
  if (isLoading) {
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
            Merchant Dashboard
          </h1>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access the merchant dashboard.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // Show loading if merchant data is not yet loaded
  if (!merchant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Render merchant dashboard
  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome, {merchant.name}
          </h1>
          <p className="text-gray-400">
            Manage your subscription plans and revenue
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <MerchantStats />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/merchant/plans"
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Manage Plans</p>
                <p className="text-sm text-gray-400">
                  Create and edit subscription plans
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/merchant/plans/create"
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-500"
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
              </div>
              <div>
                <p className="text-white font-medium">Create Plan</p>
                <p className="text-sm text-gray-400">Add a new subscription plan</p>
              </div>
            </div>
          </Link>

          <Link
            href="/merchant/revenue"
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-600/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Revenue & Claim</p>
                <p className="text-sm text-gray-400">View and claim your earnings</p>
              </div>
            </div>
          </Link>

          <Link
            href="/merchant/sdk-guide"
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">SDK Guide</p>
                <p className="text-sm text-gray-400">Integration documentation</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
