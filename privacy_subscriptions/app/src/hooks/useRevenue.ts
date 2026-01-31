"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createAnchorProvider, getProgram } from "@/lib/anchor";
import { fetchMerchantLedger } from "@/lib/merchant";
import { createArciumContext, decryptBalance, generateNonce } from "@/lib/arcium";

export interface UseRevenueReturn {
  // Total revenue (decrypted, in lamports)
  totalRevenue: bigint | null;
  // Encrypted balance data
  encryptedBalance: number[][] | null;
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
  const { connection } = useConnection();
  const wallet = useWallet();

  const [totalRevenue, setTotalRevenue] = useState<bigint | null>(null);
  const [encryptedBalance, setEncryptedBalance] = useState<number[][] | null>(null);
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
      setTotalRevenue(null);
      setIsDecrypted(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create provider");
      }

      const program = getProgram(provider);
      const ledgerData = await fetchMerchantLedger(program, wallet.publicKey);

      if (ledgerData) {
        setEncryptedBalance(ledgerData.encryptedBalance);
        // Reset decrypted state when new data is loaded
        setIsDecrypted(false);
        setTotalRevenue(null);
      } else {
        setEncryptedBalance(null);
        setTotalRevenue(null);
        setIsDecrypted(false);
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch revenue"));
      setEncryptedBalance(null);
      setTotalRevenue(null);
    } finally {
      setIsLoading(false);
    }
  }, [connection, wallet]);

  /**
   * Decrypt the balance
   */
  const decrypt = useCallback(async () => {
    if (!wallet.publicKey || !encryptedBalance) {
      return;
    }

    setIsDecrypting(true);
    setError(null);

    try {
      // Create Arcium context for decryption
      const arciumContext = await createArciumContext(connection);

      // Generate a nonce for decryption (in real implementation, nonce should come from the account)
      const nonce = generateNonce();

      // Decrypt the balance
      // Note: In a real implementation, the nonce should be retrieved from the MerchantLedger account
      const decrypted = decryptBalance(
        arciumContext.cipher,
        encryptedBalance[0],
        nonce
      );

      setTotalRevenue(decrypted);
      setIsDecrypted(true);
    } catch (err) {
      console.error("Error decrypting balance:", err);
      setError(err instanceof Error ? err : new Error("Failed to decrypt balance"));
    } finally {
      setIsDecrypting(false);
    }
  }, [connection, wallet.publicKey, encryptedBalance]);

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
