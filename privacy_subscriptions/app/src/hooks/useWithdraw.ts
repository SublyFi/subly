"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TransactionState, WithdrawParams, UseMutationResult } from "@/types";
import { usdcToUnits } from "@/lib/format";
import { useArcium } from "@/components/providers/ArciumProvider";
import { executeWithdraw } from "@/lib/transactions";

export const useWithdraw = (): UseMutationResult<WithdrawParams> => {
  const { publicKey, connected } = useWallet();
  const { arciumContext, program, initialize, isInitializing } = useArcium();

  const [state, setState] = useState<TransactionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setSignature(null);
  }, []);

  const mutate = useCallback(
    async (params: WithdrawParams) => {
      if (!publicKey || !connected) {
        setError("Wallet not connected");
        setState("error");
        return;
      }

      if (params.amount <= 0) {
        setError("Amount must be greater than 0");
        setState("error");
        return;
      }

      // Initialize Arcium context if not ready
      if (!arciumContext || !program) {
        if (!isInitializing) {
          await initialize();
        }
        // Wait a bit for initialization
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!arciumContext || !program) {
        setError("Arcium context not initialized");
        setState("error");
        return;
      }

      setState("loading");
      setError(null);
      setSignature(null);

      try {
        // Convert USDC to smallest units
        const units = usdcToUnits(params.amount);
        const amount = BigInt(units);

        // Execute the withdraw transaction
        // The MPC will verify that balance >= amount
        const sig = await executeWithdraw(
          program,
          publicKey,
          amount,
          arciumContext
        );

        setSignature(sig);
        setState("success");
      } catch (err) {
        console.error("Withdraw failed:", err);
        const message = err instanceof Error ? err.message : "Withdraw failed";

        // Provide user-friendly error messages
        if (message.includes("InsufficientBalance") || message.includes("insufficient")) {
          setError("Insufficient balance in ledger");
        } else if (message.includes("User rejected")) {
          setError("Transaction was rejected");
        } else if (message.includes("AbortedComputation")) {
          setError("MPC computation failed - insufficient balance");
        } else {
          setError(message);
        }
        setState("error");
      }
    },
    [publicKey, connected, arciumContext, program, initialize, isInitializing]
  );

  return {
    mutate,
    state,
    error,
    signature,
    reset,
  };
};
