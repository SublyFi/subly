"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createAnchorProvider, getProgram } from "@/lib/anchor";
import { executeClaimRevenue } from "@/lib/merchant";
import { createArciumContext } from "@/lib/arcium";
import { ClaimState } from "@/types";
import { MPCTimeoutError } from "@/lib/errors";

export interface UseClaimReturn {
  // Execute claim transaction
  claim: (amount: bigint) => Promise<string>;
  // Current state
  state: ClaimState;
  // Error if any
  error: Error | null;
  // Transaction signature
  txSignature: string | null;
  // Reset to idle state
  reset: () => void;
}

/**
 * Hook for claiming merchant revenue
 */
export function useClaim(): UseClaimReturn {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [state, setState] = useState<ClaimState>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  /**
   * Execute claim transaction
   */
  const claim = useCallback(
    async (amount: bigint): Promise<string> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setState("encrypting");
      setError(null);
      setTxSignature(null);

      try {
        // Create Arcium context for encryption
        const arciumContext = await createArciumContext(connection);

        setState("sending");

        // Create provider and program
        const provider = createAnchorProvider(connection, wallet);
        if (!provider) {
          throw new Error("Failed to create provider");
        }

        const program = getProgram(provider);

        // Execute claim transaction
        const signature = await executeClaimRevenue(
          program,
          wallet.publicKey,
          amount,
          arciumContext
        );

        setState("waiting_mpc");

        // MPC computation is awaited inside executeClaimRevenue
        // so when we get here, MPC is complete

        setTxSignature(signature);
        setState("success");

        return signature;
      } catch (err) {
        console.error("Claim error:", err);

        // Handle specific error types
        if (
          err instanceof Error &&
          err.message.toLowerCase().includes("timeout")
        ) {
          setError(new MPCTimeoutError());
        } else {
          setError(
            err instanceof Error ? err : new Error("Claim failed. Please try again.")
          );
        }

        setState("error");
        throw err;
      }
    },
    [connection, wallet]
  );

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setTxSignature(null);
  }, []);

  return {
    claim,
    state,
    error,
    txSignature,
    reset,
  };
}
