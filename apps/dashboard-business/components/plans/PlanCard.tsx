"use client";

import { FC } from "react";
import type { Plan } from "@subly/membership-sdk";
import { useSubscriptionCount } from "@/hooks/useSubscriptionCount";

interface PlanCardProps {
  plan: Plan;
}

export const PlanCard: FC<PlanCardProps> = ({ plan }) => {
  const { count, loading } = useSubscriptionCount(plan.publicKey);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{plan.name || "Unnamed Plan"}</h3>
        <span
          className={`text-xs px-2 py-1 rounded ${
            plan.isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {plan.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {plan.description || "No description"}
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900">
          ${plan.priceUsdc.toFixed(2)} / {plan.billingCycleDays} days
        </span>
        <span className="text-gray-500">
          {loading ? (
            <span className="text-gray-400">...</span>
          ) : count !== null ? (
            `${count} subscriber${count !== 1 ? "s" : ""}`
          ) : (
            "-"
          )}
        </span>
      </div>
    </div>
  );
};
