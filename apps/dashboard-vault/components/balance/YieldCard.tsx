"use client";

import { FC } from "react";
import { useKamino } from "@/hooks/useKamino";
import { formatUsdc } from "@/lib/constants";

export const YieldCard: FC = () => {
  const {
    apy,
    totalSupply,
    utilizationRate,
    borrowAPY,
    userDeposited,
    loading,
    error,
    isInitialized,
    refresh,
  } = useKamino();

  // Format large numbers for display (totalSupply comes as string from API)
  const formatTotalSupply = (supply: string | null): string => {
    if (supply === null) return "-";
    const num = parseFloat(supply);
    if (isNaN(num)) return "-";
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(2)}K`;
    }
    return num.toFixed(2);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Kamino Yield
        </h2>
        <button
          onClick={refresh}
          disabled={loading || !isInitialized}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!isInitialized && loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Connecting to Kamino...</span>
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-md">
          {error}
        </div>
      ) : (
        <>
          {/* Supply APY */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Supply APY</p>
            <p className="text-3xl font-bold text-green-600">
              {apy.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400">
              Powered by Kamino Lending (USDC)
            </p>
          </div>

          {/* User Deposited */}
          {userDeposited > 0 && (
            <div className="mb-6 pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Your Deposited</p>
              <p className="text-xl font-semibold text-gray-700">
                {formatUsdc(BigInt(Math.floor(userDeposited * 1_000_000)))} USDC
              </p>
            </div>
          )}

          {/* Pool Stats */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">
              Market Stats
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Supply</p>
                <p className="text-sm font-medium text-gray-700">
                  {formatTotalSupply(totalSupply)} USDC
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Utilization</p>
                <p className="text-sm font-medium text-gray-700">
                  {utilizationRate !== null
                    ? `${(utilizationRate * 100).toFixed(2)}%`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Borrow APY</p>
                <p className="text-sm font-medium text-gray-700">
                  {borrowAPY.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
