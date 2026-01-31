"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TransactionState, DepositParams, UseMutationResult } from "@/types";
import { solToLamports } from "@/lib/format";
import { useArcium } from "@/components/providers/ArciumProvider";
import { executeDeposit } from "@/lib/transactions";

export const useDeposit = (): UseMutationResult<DepositParams> => {
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
    async (params: DepositParams) => {
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
        // Convert SOL to lamports
        const lamports = solToLamports(params.amount);
        const amount = BigInt(lamports);

        // Execute the deposit transaction
        const sig = await executeDeposit(
          program,
          publicKey,
          amount,
          arciumContext
        );

        setSignature(sig);
        setState("success");
      } catch (err) {
        console.error("Deposit failed:", err);
        const message = err instanceof Error ? err.message : "Deposit failed";

        // Provide user-friendly error messages
        if (message.includes("InsufficientBalance") || message.includes("insufficient")) {
          setError("Insufficient balance in wallet");
        } else if (message.includes("User rejected")) {
          setError("Transaction was rejected");
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
