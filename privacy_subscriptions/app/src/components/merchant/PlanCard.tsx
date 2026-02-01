"use client";

import { SubscriptionPlan } from "@/types";
import { formatUSDCWithSymbol } from "@/lib/format";

interface PlanCardProps {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onToggle: () => void;
  isToggling?: boolean;
}

export function PlanCard({
  plan,
  onEdit,
  onToggle,
  isToggling = false,
}: PlanCardProps) {
  const getBillingCycleLabel = (days: number): string => {
    if (days === 7) return "Weekly";
    if (days === 14) return "Bi-weekly";
    if (days === 30) return "Monthly";
    if (days === 365) return "Yearly";
    return `Every ${days} days`;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
          <p className="text-sm text-gray-400">
            {getBillingCycleLabel(plan.billingCycleDays)}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            plan.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {plan.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mb-6">
        <p className="text-3xl font-bold text-white">
          {formatUSDCWithSymbol(plan.price)}
        </p>
        <p className="text-sm text-gray-400">
          per {getBillingCycleLabel(plan.billingCycleDays).toLowerCase()}
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onEdit}
          className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          disabled={isToggling}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            plan.isActive
              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
              : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
          }`}
        >
          {isToggling ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : plan.isActive ? (
            "Deactivate"
          ) : (
            "Activate"
          )}
        </button>
      </div>
    </div>
  );
}
