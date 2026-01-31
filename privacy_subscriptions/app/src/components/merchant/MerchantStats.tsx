"use client";

import { RevenueCard } from "./RevenueCard";
import { ActiveSubsCount } from "./ActiveSubsCount";
import { useRevenue } from "@/hooks/useRevenue";
import { useActiveSubscribers } from "@/hooks/useActiveSubscribers";
import { usePlans } from "@/hooks/usePlans";

export function MerchantStats() {
  const {
    totalRevenue,
    encryptedBalance,
    isDecrypting,
    isDecrypted,
    isLoading: isRevenueLoading,
    decrypt,
  } = useRevenue();

  const { count: subscriberCount, isLoading: isSubscribersLoading } =
    useActiveSubscribers();

  const { plans, isLoading: isPlansLoading } = usePlans();

  const activePlansCount = plans.filter((p) => p.isActive).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <RevenueCard
        title="Total Revenue"
        amount={totalRevenue}
        encrypted={encryptedBalance !== null && !isDecrypted}
        isDecrypting={isDecrypting}
        onDecrypt={decrypt}
        isLoading={isRevenueLoading}
      />

      <ActiveSubsCount
        count={subscriberCount}
        isLoading={isSubscribersLoading}
      />

      <div className="bg-gray-800 rounded-xl p-6">
        <p className="text-sm text-gray-400 mb-2">Active Plans</p>
        {isPlansLoading ? (
          <div className="h-8 bg-gray-700 rounded w-1/3 animate-pulse"></div>
        ) : (
          <p className="text-2xl font-bold text-white">
            {activePlansCount}{" "}
            <span className="text-sm font-normal text-gray-400">
              / {plans.length} total
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
