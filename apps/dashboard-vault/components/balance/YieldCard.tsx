"use client";

import { FC } from "react";
import { useYield } from "@/hooks/useYield";
import { formatUsdc } from "@/lib/constants";

export const YieldCard: FC = () => {
  const { apy, earnedUsdc, poolValue, poolShares, loading, error, refresh } =
    useYield();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Yield Information
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      ) : (
        <>
          {/* APY */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Current APY</p>
            <p className="text-3xl font-bold text-green-600">{apy.toFixed(2)}%</p>
            <p className="text-xs text-gray-400">Powered by Kamino Lending</p>
          </div>

          {/* Earned */}
          <div className="mb-6 pb-4 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Earned Yield</p>
            <p className="text-xl font-semibold text-gray-700">
              {formatUsdc(earnedUsdc)} USDC
            </p>
          </div>

          {/* Pool Stats */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">Pool Stats</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Value</p>
                <p className="text-sm font-medium text-gray-700">
                  {formatUsdc(poolValue)} USDC
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Shares</p>
                <p className="text-sm font-medium text-gray-700">
                  {poolShares.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
