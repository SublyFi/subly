"use client";

import { FC } from "react";
import { RefreshCw, Eye, EyeOff, Lock } from "lucide-react";
import { formatSOL } from "@/lib/format";
import { UseBalanceResult } from "@/hooks/useBalance";

interface BalanceCardProps {
  balanceResult: UseBalanceResult;
}

export const BalanceCard: FC<BalanceCardProps> = ({ balanceResult }) => {
  const { balance, refresh, decrypt } = balanceResult;
  const { isLoading, isDecrypted, decryptedLamports, error } = balance;

  const handleRefresh = async () => {
    await refresh();
  };

  const handleDecrypt = async () => {
    await decrypt();
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Your Balance
        </h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Lock className="w-3 h-3" />
            Encrypted
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Refresh balance"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-error-500 text-sm mb-2">{error}</div>
      ) : null}

      <div className="mb-4">
        {isDecrypted && decryptedLamports !== null ? (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {formatSOL(decryptedLamports)}
            </span>
            <span className="text-xl text-gray-500 dark:text-gray-400">SOL</span>
          </div>
        ) : (
          <div className="text-4xl font-bold text-gray-400 dark:text-gray-600">
            ****
          </div>
        )}
      </div>

      {!isDecrypted ? (
        <button
          onClick={handleDecrypt}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors disabled:opacity-50"
        >
          <Eye className="w-4 h-4" />
          {isLoading ? "Decrypting..." : "Decrypt to view balance"}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-success-600">
          <EyeOff className="w-4 h-4" />
          Balance decrypted (only you can see this)
        </div>
      )}
    </div>
  );
};
