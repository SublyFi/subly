"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMerchant } from "@/hooks/useMerchant";
import { usePlans } from "@/hooks/usePlans";
import { PlanForm } from "@/components/merchant/PlanForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CreatePlanData } from "@/types";
import Link from "next/link";

export default function CreatePlanPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { isRegistered, isLoading: isMerchantLoading } = useMerchant();
  const { createPlan } = usePlans();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to registration if not registered
  useEffect(() => {
    if (!isMerchantLoading && wallet.connected && !isRegistered) {
      router.push("/merchant/register");
    }
  }, [isMerchantLoading, isRegistered, wallet.connected, router]);

  const handleSubmit = async (data: CreatePlanData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createPlan(data);
      router.push("/merchant/plans");
    } catch (err) {
      console.error("Failed to create plan:", err);
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/merchant/plans");
  };

  if (isMerchantLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!wallet.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-400">
            Please connect your wallet to create a subscription plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-6">
          <Link href="/merchant" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href="/merchant/plans"
            className="hover:text-white transition-colors"
          >
            Plans
          </Link>
          <span>/</span>
          <span className="text-white">Create</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Subscription Plan
          </h1>
          <p className="text-gray-400">
            Set up a new subscription plan for your customers
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-800 rounded-xl p-8">
          <PlanForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
