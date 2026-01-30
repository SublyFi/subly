"use client";

import { FC, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransfers } from "@/hooks/useTransfers";
import { TRANSFER_INTERVALS, INTERVAL_LABELS, type TransferInterval } from "@/lib/constants";

interface TransferFormProps {
  onSuccess?: (transferId: string) => void;
}

export const TransferForm: FC<TransferFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const { setupTransfer } = useTransfers();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<TransferInterval>("MONTHLY");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!recipient.trim()) {
      setError("Please enter a recipient address");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Basic Solana address validation (length check)
    if (recipient.trim().length < 32 || recipient.trim().length > 44) {
      setError("Please enter a valid Solana address");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await setupTransfer({
        recipientAddress: recipient.trim(),
        amountUsdc: amountNum,
        interval,
        memo: memo.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(result.transferId);
      }

      // Redirect to transfers list
      router.push("/transfers");
    } catch (err) {
      console.error("Failed to create transfer:", err);
      setError(err instanceof Error ? err.message : "Failed to create transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Recipient Address */}
      <div>
        <label
          htmlFor="recipient"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Recipient Address
        </label>
        <input
          id="recipient"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Enter Solana address..."
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          disabled={isSubmitting}
        />
      </div>

      {/* Amount */}
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
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          disabled={isSubmitting}
        />
      </div>

      {/* Interval */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interval
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(TRANSFER_INTERVALS) as TransferInterval[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => setInterval(key)}
                className={`px-4 py-2 rounded-md text-sm font-medium border ${
                  interval === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                disabled={isSubmitting}
              >
                {INTERVAL_LABELS[key]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Memo */}
      <div>
        <label
          htmlFor="memo"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Memo (optional)
        </label>
        <input
          id="memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="e.g., Netflix subscription"
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>Privacy Notice:</strong> The recipient address is encrypted and
          stored locally. It is never saved on-chain. Each transfer is executed
          through Privacy Cash for maximum privacy.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || !recipient || !amount}
      >
        {isSubmitting ? "Creating..." : "Create Recurring Payment"}
      </button>
    </form>
  );
};
