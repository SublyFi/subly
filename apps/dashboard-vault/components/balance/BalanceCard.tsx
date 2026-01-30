"use client";

import { FC } from "react";
import Link from "next/link";
import { useBalance } from "@/hooks/useBalance";
import { formatUsdc } from "@/lib/constants";

export const BalanceCard: FC = () => {
  const { shares, valueUsdc, privateBalance, loading, error, refresh } =
    useBalance();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Balance</h2>
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
          {/* Vault Balance */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Vault Balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatUsdc(valueUsdc)} USDC
            </p>
            <p className="text-sm text-gray-500">
              {shares.toLocaleString()} shares
            </p>
          </div>

          {/* Privacy Cash Balance */}
          <div className="mb-6 pb-4 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Privacy Cash Balance</p>
            <p className="text-xl font-semibold text-gray-700">
              {privateBalance.toFixed(2)} USDC
            </p>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link
          href="/deposit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium text-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Deposit
        </Link>
        <Link
          href="/withdraw"
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Withdraw
        </Link>
      </div>
    </div>
  );
};
