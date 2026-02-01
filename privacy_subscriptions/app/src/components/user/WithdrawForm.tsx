"use client";

import { FC, useState, FormEvent } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { useWithdraw } from "@/hooks/useWithdraw";
import { TransactionStatus } from "@/components/common/TransactionStatus";
import { unitsToUsdc } from "@/lib/format";

interface WithdrawFormProps {
  maxBalance?: bigint | null;
  onSuccess?: () => void;
}

export const WithdrawForm: FC<WithdrawFormProps> = ({
  maxBalance,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const { mutate, state, error, signature, reset } = useWithdraw();

  const maxBalanceUSDC = maxBalance ? unitsToUsdc(maxBalance) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    // Check if amount exceeds balance
    if (maxBalanceUSDC !== null && parsedAmount > maxBalanceUSDC) {
      return;
    }

    await mutate({ amount: parsedAmount });

    if (state === "success" && onSuccess) {
      onSuccess();
    }
  };

  const handleMax = () => {
    if (maxBalanceUSDC !== null) {
      setAmount(maxBalanceUSDC.toString());
    }
  };

  const handleReset = () => {
    reset();
    setAmount("");
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = amount !== "" && parsedAmount > 0;
  const exceedsBalance =
    maxBalanceUSDC !== null && parsedAmount > maxBalanceUSDC;

  if (state === "success") {
    return (
      <div className="space-y-4">
        <TransactionStatus state={state} signature={signature} error={error} />
        <button
          onClick={handleReset}
          className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Make Another Withdrawal
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="withdraw-amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Amount (USDC)
        </label>
        <div className="relative">
          <input
            id="withdraw-amount"
            type="number"
            step="0.001"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={state === "loading"}
            className={`w-full px-4 py-3 pr-16 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
              exceedsBalance
                ? "border-error-500 focus:ring-error-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {maxBalanceUSDC !== null && (
            <button
              type="button"
              onClick={handleMax}
              disabled={state === "loading"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              Max
            </button>
          )}
        </div>
        {exceedsBalance && (
          <p className="mt-1 text-sm text-error-500">
            Insufficient balance. Max: {maxBalanceUSDC?.toFixed(4)} USDC
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "loading" || !isValidAmount || exceedsBalance}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        <ArrowUpFromLine className="w-5 h-5" />
        {state === "loading" ? "Processing..." : "Withdraw"}
      </button>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Funds will be sent to your connected wallet.
      </p>
    </form>
  );
};
