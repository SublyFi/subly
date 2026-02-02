"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createAnchorProvider, getProgram } from "@/lib/anchor";
import { useArcium } from "@/components/providers/ArciumProvider";
import {
  fetchMerchant,
  executeRegisterMerchant,
  nameToString,
} from "@/lib/merchant";
import { Merchant } from "@/types";

export interface UseMerchantReturn {
  // Whether the merchant is registered
  isRegistered: boolean;
  // Merchant data (null if not registered)
  merchant: Merchant | null;
  // Loading state
  isLoading: boolean;
  // Error state
  error: Error | null;
  // Register as a merchant
  register: (name: string) => Promise<string>;
  // Refresh merchant data
  refresh: () => Promise<void>;
}

/**
 * Hook for managing merchant registration and data
 */
export function useMerchant(): UseMerchantReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { arciumContext, initialize, isInitializing } = useArcium();

  const [isRegistered, setIsRegistered] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch merchant data
   */
  const fetchMerchantData = useCallback(async () => {
    if (!wallet.publicKey) {
      setIsRegistered(false);
      setMerchant(null);
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
      const merchantData = await fetchMerchant(program, wallet.publicKey);

      if (merchantData) {
        setIsRegistered(true);
        setMerchant({
          publicKey: merchantData.publicKey,
          wallet: merchantData.wallet,
          name: nameToString(merchantData.name),
          isActive: merchantData.isActive,
          registeredAt: merchantData.registeredAt.toNumber(),
        });
      } else {
        setIsRegistered(false);
        setMerchant(null);
      }
    } catch (err) {
      console.error("Error fetching merchant:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch merchant"));
      setIsRegistered(false);
      setMerchant(null);
    } finally {
      setIsLoading(false);
    }
  }, [connection, wallet]);

  /**
   * Register as a merchant
   */
  const register = useCallback(
    async (name: string): Promise<string> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      if (!arciumContext && !isInitializing) {
        await initialize();
      }

      if (!arciumContext) {
        throw new Error("Encryption context not initialized");
      }

      const provider = createAnchorProvider(connection, wallet);
      if (!provider) {
        throw new Error("Failed to create provider");
      }

      const program = getProgram(provider);
      const signature = await executeRegisterMerchant(
        program,
        wallet.publicKey,
        name,
        arciumContext.publicKey
      );

      // Refresh merchant data after registration
      await fetchMerchantData();

      return signature;
    },
    [connection, wallet, fetchMerchantData, arciumContext, initialize, isInitializing]
  );

  /**
   * Refresh merchant data
   */
  const refresh = useCallback(async () => {
    await fetchMerchantData();
  }, [fetchMerchantData]);

  // Fetch merchant data on wallet change
  useEffect(() => {
    fetchMerchantData();
  }, [fetchMerchantData]);

  return {
    isRegistered,
    merchant,
    isLoading,
    error,
    register,
    refresh,
  };
}
