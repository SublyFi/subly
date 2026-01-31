"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TransactionState, UnsubscribeParams, UseMutationResult } from "@/types";
import { useArcium } from "@/components/providers/ArciumProvider";
import { executeUnsubscribe } from "@/lib/transactions";

export const useUnsubscribe = (): UseMutationResult<UnsubscribeParams> => {
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
    async (params: UnsubscribeParams) => {
      if (!publicKey || !connected) {
        setError("Wallet not connected");
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
        // Execute the unsubscribe transaction
        // The subscription index is passed from the params
        const subscriptionIndex = params.subscriptionIndex ?? BigInt(0);

        const sig = await executeUnsubscribe(
          program,
          publicKey,
          subscriptionIndex,
          arciumContext
        );

        setSignature(sig);
        setState("success");
      } catch (err) {
        console.error("Unsubscribe failed:", err);
        const message = err instanceof Error ? err.message : "Unsubscribe failed";

        // Provide user-friendly error messages
        if (message.includes("SubscriptionNotActive")) {
          setError("Subscription is not active");
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
