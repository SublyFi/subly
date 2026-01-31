"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMerchant } from "@/hooks/useMerchant";
import { usePlans } from "@/hooks/usePlans";
import { PlanForm } from "@/components/merchant/PlanForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CreatePlanData, SubscriptionPlan } from "@/types";
import Link from "next/link";

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;

  const wallet = useWallet();
  const { isRegistered, isLoading: isMerchantLoading } = useMerchant();
  const { plans, isLoading: isPlansLoading, updatePlan } = usePlans();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the plan
  useEffect(() => {
    if (!isPlansLoading && plans.length > 0) {
      const foundPlan = plans.find((p) => p.publicKey.toBase58() === planId);
      setPlan(foundPlan ?? null);
    }
  }, [plans, planId, isPlansLoading]);

  // Redirect to registration if not registered
  useEffect(() => {
    if (!isMerchantLoading && wallet.connected && !isRegistered) {
      router.push("/merchant/register");
    }
  }, [isMerchantLoading, isRegistered, wallet.connected, router]);

  const handleSubmit = async (data: CreatePlanData) => {
    if (!plan) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updatePlan(plan.publicKey, {
        name: data.name,
        price: data.price,
        billingCycleDays: data.billingCycleDays,
      });
      router.push("/merchant/plans");
    } catch (err) {
      console.error("Failed to update plan:", err);
      setError(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/merchant/plans");
  };

  if (isMerchantLoading || isPlansLoading) {
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
            Please connect your wallet to edit this plan.
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Plan Not Found</h1>
          <p className="text-gray-400 mb-6">
            The subscription plan you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/merchant/plans"
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Plans
          </Link>
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
          <span className="text-white">Edit</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Edit Subscription Plan
          </h1>
          <p className="text-gray-400">Update your subscription plan details</p>
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
            mode="edit"
            initialData={plan}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
