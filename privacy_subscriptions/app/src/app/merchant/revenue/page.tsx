"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMerchant } from "@/hooks/useMerchant";
import { useRevenue } from "@/hooks/useRevenue";
import { ClaimForm } from "@/components/merchant/ClaimForm";
import { RevenueCard } from "@/components/merchant/RevenueCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import Link from "next/link";

export default function MerchantRevenuePage() {
  const router = useRouter();
  const wallet = useWallet();
  const { isRegistered, isLoading: isMerchantLoading } = useMerchant();
  const {
    totalRevenue,
    encryptedBalance,
    isDecrypting,
    isDecrypted,
    isLoading: isRevenueLoading,
    decrypt,
    refresh,
  } = useRevenue();

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
            Please connect your wallet to view and claim your revenue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-6">
          <Link href="/merchant" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white">Revenue</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Revenue & Claim
            </h1>
            <p className="text-gray-400">
              View your earnings and withdraw to your wallet
            </p>
          </div>
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Summary */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Revenue Summary
              </h3>
              <RevenueCard
                title="Total Revenue"
                amount={totalRevenue}
                encrypted={encryptedBalance !== null && !isDecrypted}
                isDecrypting={isDecrypting}
                onDecrypt={decrypt}
                isLoading={isRevenueLoading}
              />
            </div>

            {/* Privacy Notice */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-purple-200">
                    Your revenue is encrypted using Arcium&apos;s MPC technology.
                    Only you can decrypt and view your actual balance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Claim Form */}
          <div>
            <ClaimForm
              availableBalance={totalRevenue}
              onSuccess={() => refresh()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
