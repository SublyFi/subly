"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useVault } from "./useVault";
import { BALANCE_REFRESH_INTERVAL } from "@/lib/constants";

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

interface BalanceState {
  shares: bigint;
  valueUsdc: bigint;
  privateBalance: number;
  walletUsdcBalance: number; // User's wallet USDC balance
  derivedAddressBalance: number; // USDC balance of the derived Privacy Cash address
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage user balance
 * Automatically refreshes every 30 seconds
 */
export function useBalance(): BalanceState {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { client, isInitialized, derivedPublicKey } = useVault();
  const [shares, setShares] = useState<bigint>(0n);
  const [valueUsdc, setValueUsdc] = useState<bigint>(0n);
  const [privateBalance, setPrivateBalance] = useState<number>(0);
  const [walletUsdcBalance, setWalletUsdcBalance] = useState<number>(0);
  const [derivedAddressBalance, setDerivedAddressBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet USDC balance (independent of Privacy Cash initialization)
  const refreshWalletBalance = useCallback(async () => {
    if (!publicKey || !connection) {
      return;
    }

    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: USDC_MINT }
      );
      if (tokenAccounts.value.length > 0) {
        const usdcAccount = tokenAccounts.value[0];
        const amount =
          usdcAccount.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
        setWalletUsdcBalance(amount);
      } else {
        setWalletUsdcBalance(0);
      }
    } catch (err) {
      console.warn("Failed to fetch wallet USDC balance:", err);
    }
  }, [publicKey, connection]);

  // Fetch derived address USDC balance (requires initialization)
  const refreshDerivedAddressBalance = useCallback(async () => {
    if (!derivedPublicKey || !connection) {
      return;
    }

    try {
      const derivedPubkey = new PublicKey(derivedPublicKey);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        derivedPubkey,
        { mint: USDC_MINT }
      );
      if (tokenAccounts.value.length > 0) {
        const usdcAccount = tokenAccounts.value[0];
        const amount =
          usdcAccount.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
        setDerivedAddressBalance(amount);
      } else {
        setDerivedAddressBalance(0);
      }
    } catch (err) {
      console.warn("Failed to fetch derived address USDC balance:", err);
    }
  }, [derivedPublicKey, connection]);

  // Fetch Privacy Cash and vault balances (requires initialization)
  const refreshPrivacyCashBalance = useCallback(async () => {
    if (!client || !isInitialized) {
      return;
    }

    try {
      // Fetch vault balance (shares)
      const balance = await client.getBalance();
      setShares(balance.shares);
      setValueUsdc(balance.valueUsdc);

      // Fetch Privacy Cash balance
      try {
        const privBalance = await client.getPrivateBalance();
        setPrivateBalance(privBalance);
      } catch (err) {
        console.warn("Failed to fetch private balance:", err);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    }
  }, [client, isInitialized]);

  // Combined refresh function
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        refreshWalletBalance(),
        refreshDerivedAddressBalance(),
        refreshPrivacyCashBalance(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [refreshWalletBalance, refreshDerivedAddressBalance, refreshPrivacyCashBalance]);

  // Fetch wallet balance immediately when wallet connects
  useEffect(() => {
    if (publicKey) {
      refreshWalletBalance();
    }
  }, [publicKey, refreshWalletBalance]);

  // Fetch all balances when Privacy Cash is initialized and auto-refresh
  useEffect(() => {
    if (!isInitialized) return;

    // Initial fetch
    refresh();

    // Set up auto-refresh interval
    const interval = setInterval(refresh, BALANCE_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isInitialized, refresh]);

  return {
    shares,
    valueUsdc,
    privateBalance,
    walletUsdcBalance,
    derivedAddressBalance,
    loading,
    error,
    refresh,
  };
}
