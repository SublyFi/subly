"use client";

import { formatSOLWithSymbol } from "@/lib/format";

interface RevenueCardProps {
  title: string;
  // Amount in lamports (null if not yet loaded/decrypted)
  amount: bigint | null;
  // Whether the data is encrypted
  encrypted?: boolean;
  // Whether currently decrypting
  isDecrypting?: boolean;
  // Callback to decrypt
  onDecrypt?: () => void;
  // Whether data is loading
  isLoading?: boolean;
}

export function RevenueCard({
  title,
  amount,
  encrypted = false,
  isDecrypting = false,
  onDecrypt,
  isLoading = false,
}: RevenueCardProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  // Encrypted state - show masked value with decrypt button
  if (encrypted && amount === null) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <p className="text-sm text-gray-400 mb-2">{title}</p>
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-gray-500">***.** SOL</p>
          <button
            onClick={onDecrypt}
            disabled={isDecrypting}
            className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isDecrypting ? (
              <span className="flex items-center">
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
                Decrypting...
              </span>
            ) : (
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Reveal
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Decrypted/Plain state - show actual value
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <p className="text-sm text-gray-400 mb-2">{title}</p>
      <p className="text-2xl font-bold text-white">
        {amount !== null ? formatSOLWithSymbol(amount) : "0.0000 SOL"}
      </p>
    </div>
  );
}
