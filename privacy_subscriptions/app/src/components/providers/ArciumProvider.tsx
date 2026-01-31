"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, Idl } from "@coral-xyz/anchor";
import { ArciumContext, createArciumContext } from "@/lib/arcium";
import { createAnchorProvider, getProgram } from "@/lib/anchor";

interface ArciumContextValue {
  arciumContext: ArciumContext | null;
  program: Program<Idl> | null;
  isInitializing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  reset: () => void;
}

const ArciumCtx = createContext<ArciumContextValue | null>(null);

export function ArciumProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [arciumContext, setArciumContext] = useState<ArciumContext | null>(null);
  const [program, setProgram] = useState<Program<Idl> | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (!wallet.publicKey) {
      setError("Wallet not connected");
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Create Anchor provider and program
      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create Anchor provider");
      }

      const prog = getProgram(provider);
      setProgram(prog);

      // Create Arcium context for encryption/decryption
      const ctx = await createArciumContext(connection);
      setArciumContext(ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize Arcium context";
      setError(message);
      console.error("Arcium initialization error:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [connection, wallet]);

  const reset = useCallback(() => {
    setArciumContext(null);
    setProgram(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      arciumContext,
      program,
      isInitializing,
      error,
      initialize,
      reset,
    }),
    [arciumContext, program, isInitializing, error, initialize, reset]
  );

  return <ArciumCtx.Provider value={value}>{children}</ArciumCtx.Provider>;
}

export function useArcium(): ArciumContextValue {
  const context = useContext(ArciumCtx);
  if (!context) {
    throw new Error("useArcium must be used within an ArciumProvider");
  }
  return context;
}
