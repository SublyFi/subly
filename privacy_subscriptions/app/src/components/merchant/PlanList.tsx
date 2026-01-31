"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionPlan } from "@/types";
import { PlanCard } from "./PlanCard";
import { usePlans } from "@/hooks/usePlans";
import Link from "next/link";

interface PlanListProps {
  plans: SubscriptionPlan[];
  isLoading: boolean;
}

export function PlanList({ plans, isLoading }: PlanListProps) {
  const router = useRouter();
  const { togglePlan } = usePlans();
  const [togglingPlan, setTogglingPlan] = useState<string | null>(null);

  const handleToggle = async (plan: SubscriptionPlan) => {
    setTogglingPlan(plan.publicKey.toBase58());
    try {
      await togglePlan(plan.publicKey, !plan.isActive);
    } catch (error) {
      console.error("Failed to toggle plan:", error);
    } finally {
      setTogglingPlan(null);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    router.push(`/merchant/plans/${plan.publicKey.toBase58()}/edit`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse"
          >
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-6"></div>
            <div className="h-10 bg-gray-700 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-700 rounded flex-1"></div>
              <div className="h-10 bg-gray-700 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
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
        <h3 className="text-xl font-semibold text-white mb-2">
          No subscription plans yet
        </h3>
        <p className="text-gray-400 mb-6">
          Create your first subscription plan to start accepting payments
        </p>
        <Link
          href="/merchant/plans/create"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200"
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
          Create Your First Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.publicKey.toBase58()}
          plan={plan}
          onEdit={() => handleEdit(plan)}
          onToggle={() => handleToggle(plan)}
          isToggling={togglingPlan === plan.publicKey.toBase58()}
        />
      ))}
    </div>
  );
}
