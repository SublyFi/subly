"use client";

import { useState } from "react";
import { useClaim } from "@/hooks/useClaim";
import { formatUSDCWithSymbol, usdcToUnits, unitsToUsdc } from "@/lib/format";
import { ClaimState } from "@/types";

interface ClaimFormProps {
  availableBalance: bigint | null;
  onSuccess?: () => void;
}

const CLAIM_STATE_MESSAGES: Record<ClaimState, string> = {
  idle: "",
  encrypting: "Encrypting transaction data...",
  sending: "Sending transaction...",
  waiting_mpc: "Waiting for MPC computation...",
  success: "Claim successful!",
  error: "Claim failed",
};

export function ClaimForm({ availableBalance, onSuccess }: ClaimFormProps) {
  const { claim, state, error, txSignature, reset } = useClaim();
  const [amountUSDC, setAmountUSDC] = useState("");

  const parsedAmount = parseFloat(amountUSDC);
  const amountUnits = !isNaN(parsedAmount) ? BigInt(usdcToUnits(parsedAmount)) : BigInt(0);

  const isValidAmount =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    availableBalance !== null &&
    amountUnits <= availableBalance;

  const isProcessing =
    state === "encrypting" || state === "sending" || state === "waiting_mpc";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAmount) return;

    try {
      await claim(amountUnits);
      onSuccess?.();
      setAmountUSDC("");
    } catch {
      // Error is handled by the hook
    }
  };

  const handleMaxClick = () => {
    if (availableBalance !== null) {
      setAmountUSDC(unitsToUsdc(availableBalance).toString());
    }
  };

  const handleReset = () => {
    reset();
    setAmountUSDC("");
  };

  // Success state
  if (state === "success") {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Claim Successful!
          </h3>
          <p className="text-gray-400 mb-4">
            Your revenue has been transferred to your wallet.
          </p>
          {txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              View Transaction
            </a>
          )}
          <button
            onClick={handleReset}
            className="mt-4 w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Make Another Claim
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Claim Failed
          </h3>
          <p className="text-gray-400 mb-4">
            {error?.message ?? "An error occurred. Please try again."}
          </p>
          <button
            onClick={handleReset}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Claim Revenue</h3>

      {/* Available Balance */}
      <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-400 mb-1">Available Balance</p>
        <p className="text-xl font-bold text-white">
          {availableBalance !== null
            ? formatUSDCWithSymbol(availableBalance)
            : "Not decrypted"}
        </p>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label
          htmlFor="claimAmount"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Amount to Claim
        </label>
        <div className="relative">
          <input
            type="number"
            id="claimAmount"
            value={amountUSDC}
            onChange={(e) => setAmountUSDC(e.target.value)}
            placeholder="0.00"
            step="0.001"
            min="0"
            disabled={isProcessing || availableBalance === null}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors pr-24 disabled:opacity-50"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isProcessing || availableBalance === null}
              className="px-2 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 rounded transition-colors disabled:opacity-50"
            >
              MAX
            </button>
            <span className="text-gray-400">USDC</span>
          </div>
        </div>
        {!isValidAmount && amountUSDC && (
          <p className="mt-1 text-sm text-red-400">
            {availableBalance !== null && amountUnits > availableBalance
              ? "Amount exceeds available balance"
              : "Enter a valid amount greater than 0"}
          </p>
        )}
      </div>

      {/* Submit Button / Processing State */}
      {isProcessing ? (
        <div className="w-full py-4 px-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center space-x-3">
            <svg
              className="animate-spin h-5 w-5 text-purple-500"
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
            <span className="text-gray-300">{CLAIM_STATE_MESSAGES[state]}</span>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!isValidAmount || availableBalance === null}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
        >
          Claim Revenue
        </button>
      )}

      {availableBalance === null && (
        <p className="mt-3 text-sm text-gray-400 text-center">
          Please decrypt your balance first to claim revenue
        </p>
      )}
    </form>
  );
}
