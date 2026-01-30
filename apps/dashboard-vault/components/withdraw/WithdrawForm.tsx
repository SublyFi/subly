"use client";

import { FC, useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVault } from "@/hooks/useVault";
import { useBalance } from "@/hooks/useBalance";

interface WithdrawFormProps {
  onSuccess?: (tx: string, amount: number, fee: number) => void;
}

export const WithdrawForm: FC<WithdrawFormProps> = ({ onSuccess }) => {
  const { publicKey } = useWallet();
  const { client, isInitialized } = useVault();
  const { privateBalance, refresh: refreshBalance } = useBalance();

  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [useOwnAddress, setUseOwnAddress] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tx: string;
    amount: number;
    fee: number;
  } | null>(null);

  // Use Privacy Cash balance for withdrawals
  const maxWithdrawable = privateBalance;

  // Fee estimation
  const estimatedFees = useMemo(() => {
    const withdrawAmount = parseFloat(amount) || 0;
    const protocolFeePercent = 0.35;
    const protocolFee = withdrawAmount * (protocolFeePercent / 100);
    const networkFeeSol = 0.006;

    return {
      protocolFeePercent,
      protocolFee,
      networkFeeSol,
      netAmount: withdrawAmount - protocolFee,
    };
  }, [amount]);

  const presetPercentages = [25, 50, 75, 100];

  const handlePreset = (percentage: number) => {
    const presetAmount = (maxWithdrawable * percentage) / 100;
    setAmount(presetAmount.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client || !isInitialized) {
      setError("Vault not initialized");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (withdrawAmount > maxWithdrawable) {
      setError("Amount exceeds your Privacy Cash balance");
      return;
    }

    // Validate recipient if custom address is used
    const recipientAddress = useOwnAddress
      ? publicKey?.toBase58()
      : recipient.trim();

    if (!recipientAddress) {
      setError("Please enter a valid recipient address");
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    setResult(null);

    try {
      // Withdraw via Privacy Cash
      const withdrawResult = await client.withdrawPrivate(
        withdrawAmount,
        recipientAddress
      );

      setResult({
        tx: withdrawResult.tx,
        amount: withdrawResult.amountReceived,
        fee: withdrawResult.fee,
      });

      setAmount("");

      // Refresh balance
      await refreshBalance();

      if (onSuccess) {
        onSuccess(
          withdrawResult.tx,
          withdrawResult.amountReceived,
          withdrawResult.fee
        );
      }
    } catch (err) {
      console.error("Withdrawal failed:", err);
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Input */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Amount (USDC)
        </label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          max={maxWithdrawable}
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          disabled={isWithdrawing}
        />
        <p className="text-xs text-gray-500 mt-1">
          Privacy Cash Balance: {maxWithdrawable.toFixed(2)} USDC
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presetPercentages.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => handlePreset(pct)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isWithdrawing || maxWithdrawable <= 0}
          >
            {pct === 100 ? "Max" : `${pct}%`}
          </button>
        ))}
      </div>

      {/* Recipient Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipient Address
        </label>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={useOwnAddress}
              onChange={() => setUseOwnAddress(true)}
              className="text-blue-600 focus:ring-blue-500"
              disabled={isWithdrawing}
            />
            <span className="text-sm text-gray-700">
              My wallet ({publicKey?.toBase58().slice(0, 8)}...)
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!useOwnAddress}
              onChange={() => setUseOwnAddress(false)}
              className="text-blue-600 focus:ring-blue-500"
              disabled={isWithdrawing}
            />
            <span className="text-sm text-gray-700">Custom address</span>
          </label>

          {!useOwnAddress && (
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              disabled={isWithdrawing}
            />
          )}
        </div>
      </div>

      {/* Fee Estimation */}
      {parseFloat(amount) > 0 && (
        <div className="bg-gray-50 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Fee Estimate</p>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Protocol Fee ({estimatedFees.protocolFeePercent}%)</span>
              <span>{estimatedFees.protocolFee.toFixed(4)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Network Fee</span>
              <span>~{estimatedFees.networkFeeSol} SOL</span>
            </div>
            <div className="flex justify-between font-medium text-gray-900 pt-2 border-t border-gray-200">
              <span>You will receive</span>
              <span>{estimatedFees.netAmount.toFixed(4)} USDC</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800 font-medium">
            Withdrawal successful!
          </p>
          <p className="text-xs text-green-600 mt-1">
            Received: {result.amount.toFixed(4)} USDC (Fee: {result.fee.toFixed(4)}{" "}
            USDC)
          </p>
          <p className="text-xs text-green-600 mt-1 break-all">
            Transaction: {result.tx}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isWithdrawing || !amount || parseFloat(amount) <= 0}
      >
        {isWithdrawing ? "Processing..." : "Withdraw via Privacy Cash"}
      </button>
    </form>
  );
};
