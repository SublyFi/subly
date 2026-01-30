"use client";

import { FC, useState } from "react";
import { truncateAddress } from "@/lib/constants";
import type { LocalTransferData } from "@/providers/VaultProvider";

interface TransferCardProps {
  transfer: LocalTransferData;
  onExecute: (transferId: string) => Promise<void>;
  onCancel: (transferId: string) => Promise<void>;
}

export const TransferCard: FC<TransferCardProps> = ({
  transfer,
  onExecute,
  onCancel,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get interval label
  const getIntervalLabel = (seconds: number): string => {
    if (seconds === 3600) return "Hourly";
    if (seconds === 86400) return "Daily";
    if (seconds === 604800) return "Weekly";
    if (seconds === 2592000) return "Monthly";
    return `${seconds}s`;
  };

  // Calculate next execution time
  const getNextExecution = (): string => {
    const lastExec = transfer.lastExecuted ?? transfer.createdAt;
    const nextTime = lastExec + transfer.intervalSeconds * 1000;

    if (Date.now() >= nextTime) {
      return "Due now";
    }

    const diff = nextTime - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `In ${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `In ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return "Soon";
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      await onExecute(transfer.transferId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this recurring transfer?")) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      await onCancel(transfer.transferId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Recipient */}
          <p className="font-medium text-gray-900">
            To: {truncateAddress(transfer.recipient, 6)}
          </p>

          {/* Amount and Interval */}
          <p className="text-sm text-gray-600 mt-1">
            {transfer.amount} USDC / {getIntervalLabel(transfer.intervalSeconds)}
          </p>

          {/* Memo */}
          {transfer.memo && (
            <p className="text-xs text-gray-500 mt-1">"{transfer.memo}"</p>
          )}

          {/* Next Execution */}
          <p className="text-xs text-gray-400 mt-2">
            Next: {getNextExecution()}
          </p>

          {/* Last Executed */}
          {transfer.lastExecuted && (
            <p className="text-xs text-gray-400">
              Last: {new Date(transfer.lastExecuted).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={handleExecute}
            disabled={isExecuting || isCancelling}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isExecuting ? "..." : "Execute"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isExecuting || isCancelling}
            className="px-3 py-1 border border-gray-300 text-gray-600 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isCancelling ? "..." : "Cancel"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};
