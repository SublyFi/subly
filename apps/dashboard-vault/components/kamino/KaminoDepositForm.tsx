"use client";

import { FC, useState, useCallback } from "react";
import { useKamino } from "@/hooks/useKamino";
import { formatUsdc, parseUsdc, USDC_DECIMALS } from "@/lib/constants";

type TabType = "deposit" | "withdraw";

interface TransactionState {
  status: "idle" | "pending" | "success" | "error";
  message: string;
  signature?: string;
}

export const KaminoDepositForm: FC = () => {
  const {
    apy,
    userDeposited,
    loading,
    error,
    isInitialized,
    isPending,
    refresh,
    deposit,
    withdraw,
  } = useKamino();

  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [txState, setTxState] = useState<TransactionState>({
    status: "idle",
    message: "",
  });

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow only valid decimal numbers
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setAmount(value);
      }
    },
    []
  );

  const handleMaxClick = useCallback(() => {
    if (activeTab === "withdraw" && userDeposited > 0) {
      setAmount(userDeposited.toFixed(USDC_DECIMALS));
    }
  }, [activeTab, userDeposited]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setTxState({
          status: "error",
          message: "Please enter a valid amount",
        });
        return;
      }

      if (activeTab === "withdraw" && numAmount > userDeposited) {
        setTxState({
          status: "error",
          message: "Insufficient deposited balance",
        });
        return;
      }

      setTxState({
        status: "pending",
        message:
          activeTab === "deposit"
            ? "Processing deposit via Shield Pool..."
            : "Processing withdrawal via Shield Pool...",
      });

      try {
        let signature: string;

        if (activeTab === "deposit") {
          // Execute deposit via Shield Pool → Kamino
          signature = await deposit(numAmount);
        } else {
          // Execute withdrawal via Kamino → Shield Pool
          signature = await withdraw(numAmount);
        }

        setTxState({
          status: "success",
          message:
            activeTab === "deposit"
              ? `Successfully deposited ${numAmount} USDC to Kamino`
              : `Successfully withdrew ${numAmount} USDC from Kamino`,
          signature,
        });

        // Clear form
        setAmount("");
      } catch (err) {
        console.error("Transaction failed:", err);
        setTxState({
          status: "error",
          message: err instanceof Error ? err.message : "Transaction failed",
        });
      }
    },
    [amount, activeTab, userDeposited, deposit, withdraw]
  );

  const resetTxState = useCallback(() => {
    setTxState({ status: "idle", message: "" });
  }, []);

  if (!isInitialized && loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading Kamino...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Kamino Deposit
      </h2>

      {/* APY Display */}
      <div className="mb-4 p-3 bg-green-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current APY</span>
          <span className="text-lg font-bold text-green-600">
            {apy.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => {
            setActiveTab("deposit");
            resetTxState();
          }}
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "deposit"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => {
            setActiveTab("withdraw");
            resetTxState();
          }}
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "withdraw"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Deposited Balance */}
      {userDeposited > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Your Deposited</span>
            <span className="text-sm font-medium text-gray-900">
              {formatUsdc(BigInt(Math.floor(userDeposited * 1_000_000)))} USDC
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Amount Input */}
        <div className="mb-4">
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount (USDC)
          </label>
          <div className="relative">
            <input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={txState.status === "pending"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
            {activeTab === "withdraw" && userDeposited > 0 && (
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700"
              >
                MAX
              </button>
            )}
          </div>
        </div>

        {/* Transaction Status */}
        {txState.status !== "idle" && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              txState.status === "pending"
                ? "bg-blue-50 text-blue-700"
                : txState.status === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <p className="text-sm">{txState.message}</p>
            {txState.signature && (
              <a
                href={`https://solscan.io/tx/${txState.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-1 block"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            txState.status === "pending" ||
            isPending ||
            !isInitialized
          }
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            activeTab === "deposit"
              ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
              : "bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300"
          } disabled:cursor-not-allowed`}
        >
          {txState.status === "pending" ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Processing...
            </span>
          ) : activeTab === "deposit" ? (
            "Deposit to Kamino"
          ) : (
            "Withdraw from Kamino"
          )}
        </button>
      </form>

      {/* Info Text */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        {activeTab === "deposit"
          ? "Your USDC will be deposited to Kamino via Shield Pool for privacy-preserving yield."
          : "Withdraw your USDC from Kamino via Shield Pool back to your Privacy Cash balance."}
      </p>
    </div>
  );
};
