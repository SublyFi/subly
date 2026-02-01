"use client";

import { FC, useState, FormEvent } from "react";
import { ArrowDownToLine } from "lucide-react";
import { useDeposit } from "@/hooks/useDeposit";
import { TransactionStatus } from "@/components/common/TransactionStatus";

interface DepositFormProps {
  onSuccess?: () => void;
}

export const DepositForm: FC<DepositFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState("");
  const { mutate, state, error, signature, reset } = useDeposit();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    await mutate({ amount: parsedAmount });

    if (state === "success" && onSuccess) {
      onSuccess();
    }
  };

  const handleReset = () => {
    reset();
    setAmount("");
  };

  const isValidAmount = amount !== "" && parseFloat(amount) > 0;

  if (state === "success") {
    return (
      <div className="space-y-4">
        <TransactionStatus state={state} signature={signature} error={error} />
        <button
          onClick={handleReset}
          className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Make Another Deposit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="deposit-amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Amount (USDC)
        </label>
        <input
          id="deposit-amount"
          type="number"
          step="0.001"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={state === "loading"}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {error && (
        <div className="p-3 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "loading" || !isValidAmount}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        <ArrowDownToLine className="w-5 h-5" />
        {state === "loading" ? "Processing..." : "Deposit"}
      </button>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Your deposit will be encrypted and added to your private balance.
      </p>
    </form>
  );
};
