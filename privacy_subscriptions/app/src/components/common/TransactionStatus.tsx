"use client";

import { FC } from "react";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { TransactionState } from "@/types";
import { getSolscanUrl } from "@/lib/solana";

interface TransactionStatusProps {
  state: TransactionState;
  signature?: string | null;
  error?: string | null;
  onReset?: () => void;
}

export const TransactionStatus: FC<TransactionStatusProps> = ({
  state,
  signature,
  error,
  onReset,
}) => {
  if (state === "idle") {
    return null;
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        <div>
          <p className="font-medium text-primary-700 dark:text-primary-300">
            Processing Transaction
          </p>
          <p className="text-sm text-primary-600 dark:text-primary-400">
            Please wait while your transaction is being processed...
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex items-start gap-3 p-4 bg-success-50 dark:bg-success-500/10 rounded-lg">
        <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-success-700 dark:text-success-300">
            Transaction Successful
          </p>
          {signature && (
            <a
              href={getSolscanUrl(signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-success-600 dark:text-success-400 hover:underline mt-1"
            >
              View on Solscan
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="mt-2 text-sm text-success-600 dark:text-success-400 hover:underline"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-start gap-3 p-4 bg-error-50 dark:bg-error-500/10 rounded-lg">
        <XCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-error-700 dark:text-error-300">
            Transaction Failed
          </p>
          {error && (
            <p className="text-sm text-error-600 dark:text-error-400 mt-1">
              {error}
            </p>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="mt-2 text-sm text-error-600 dark:text-error-400 hover:underline"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
