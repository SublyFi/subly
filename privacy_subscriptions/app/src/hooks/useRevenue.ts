"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchMerchantLedger } from "@/lib/merchant";
import { decryptBalance } from "@/lib/arcium";
import { useArcium } from "@/components/providers/ArciumProvider";

export interface UseRevenueReturn {
  // Total revenue (decrypted, in lamports)
  totalRevenue: bigint | null;
  // Encrypted balance data
  encryptedBalance: number[] | null;
  // Whether the balance is being decrypted
  isDecrypting: boolean;
  // Whether the balance has been decrypted
  isDecrypted: boolean;
  // Loading state
  isLoading: boolean;
  // Error state
  error: Error | null;
  // Decrypt the balance
  decrypt: () => Promise<void>;
  // Refresh revenue data
  refresh: () => Promise<void>;
}

/**
 * Hook for managing merchant revenue data
 */
export function useRevenue(): UseRevenueReturn {
  const wallet = useWallet();
  const { arciumContext, program, initialize, isInitializing } = useArcium();

  const [totalRevenue, setTotalRevenue] = useState<bigint | null>(null);
  const [encryptedBalance, setEncryptedBalance] = useState<number[] | null>(null);
  const [ledgerNonce, setLedgerNonce] = useState<bigint | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch merchant ledger data
   */
  const fetchRevenueData = useCallback(async () => {
    if (!wallet.publicKey) {
      setEncryptedBalance(null);
      setLedgerNonce(null);
      setTotalRevenue(null);
      setIsDecrypted(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!program && !isInitializing) {
        await initialize();
      }

      if (!program) {
        throw new Error("Program not initialized");
      }

      const ledgerData = await fetchMerchantLedger(program, wallet.publicKey);

      if (ledgerData) {
        setEncryptedBalance(ledgerData.encryptedBalance);
        setLedgerNonce(BigInt(ledgerData.nonce.toString()));
        // Reset decrypted state when new data is loaded
        setIsDecrypted(false);
        setTotalRevenue(null);
      } else {
        setEncryptedBalance(null);
        setLedgerNonce(null);
        setTotalRevenue(null);
        setIsDecrypted(false);
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch revenue"));
      setEncryptedBalance(null);
      setLedgerNonce(null);
      setTotalRevenue(null);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey, program, initialize, isInitializing]);

  /**
   * Decrypt the balance
   */
  const decrypt = useCallback(async () => {
    if (!wallet.publicKey || !encryptedBalance || ledgerNonce === null) {
      return;
    }

    setIsDecrypting(true);
    setError(null);

    try {
      if (!arciumContext && !isInitializing) {
        await initialize();
      }

      if (!arciumContext) {
        throw new Error("Arcium context not initialized");
      }

      // Convert nonce to Uint8Array (16 bytes, little-endian)
      const nonceBytes = new Uint8Array(16);
      let nonce = ledgerNonce;
      for (let i = 0; i < 16; i++) {
        nonceBytes[i] = Number(nonce & BigInt(0xff));
        nonce >>= BigInt(8);
      }

      // Decrypt the balance
      const decrypted = decryptBalance(
        arciumContext.cipher,
        encryptedBalance,
        nonceBytes
      );

      setTotalRevenue(decrypted);
      setIsDecrypted(true);
    } catch (err) {
      console.error("Error decrypting balance:", err);
      setError(err instanceof Error ? err : new Error("Failed to decrypt balance"));
    } finally {
      setIsDecrypting(false);
    }
  }, [wallet.publicKey, encryptedBalance, ledgerNonce, arciumContext, initialize, isInitializing]);

  /**
   * Refresh revenue data
   */
  const refresh = useCallback(async () => {
    await fetchRevenueData();
  }, [fetchRevenueData]);

  // Fetch revenue data on wallet change
  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  return {
    totalRevenue,
    encryptedBalance,
    isDecrypting,
    isDecrypted,
    isLoading,
    error,
    decrypt,
    refresh,
  };
}
