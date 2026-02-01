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
import {
  ArciumContext,
  createArciumContextFromSignature,
  ENCRYPTION_SIGNING_MESSAGE,
} from "@/lib/arcium";
import { createAnchorProvider, getProgram } from "@/lib/anchor";

interface ArciumContextValue {
  arciumContext: ArciumContext | null;
  program: Program<Idl> | null;
  isInitializing: boolean;
  needsSignature: boolean;
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
  const [needsSignature, setNeedsSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (!wallet.publicKey) {
      setError("Wallet not connected");
      return;
    }

    if (!wallet.signMessage) {
      setError("Wallet does not support message signing");
      return;
    }

    setIsInitializing(true);
    setNeedsSignature(true);
    setError(null);

    try {
      // Create Anchor provider and program
      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create Anchor provider");
      }

      const prog = getProgram(provider);
      setProgram(prog);

      // Request signature from wallet to derive deterministic encryption keys
      // This ensures the same wallet always produces the same keys
      const messageBytes = new TextEncoder().encode(ENCRYPTION_SIGNING_MESSAGE);

      let signature: Uint8Array;
      try {
        signature = await wallet.signMessage(messageBytes);
      } catch (signError) {
        // User rejected the signature request
        const message = signError instanceof Error ? signError.message : "Signature rejected";
        if (message.includes("rejected") || message.includes("denied") || message.includes("cancelled")) {
          setError("Signature required to access encrypted data. Please sign the message to continue.");
        } else {
          setError(`Failed to sign message: ${message}`);
        }
        setNeedsSignature(true);
        return;
      }

      // Create Arcium context with deterministic keys derived from signature
      const ctx = await createArciumContextFromSignature(connection, signature);
      setArciumContext(ctx);
      setNeedsSignature(false);
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
    setNeedsSignature(false);
  }, []);

  const value = useMemo(
    () => ({
      arciumContext,
      program,
      isInitializing,
      needsSignature,
      error,
      initialize,
      reset,
    }),
    [arciumContext, program, isInitializing, needsSignature, error, initialize, reset]
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
