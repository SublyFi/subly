"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Balance } from "@/types";
import { useArcium } from "@/components/providers/ArciumProvider";
import { fetchUserLedger } from "@/lib/transactions";
import { decryptBalance } from "@/lib/arcium";

export interface UseBalanceResult {
  balance: Balance;
  refresh: () => Promise<void>;
  decrypt: () => Promise<void>;
}

export const useBalance = (): UseBalanceResult => {
  const { publicKey, connected } = useWallet();
  const { arciumContext, program, initialize, isInitializing } = useArcium();

  const [balance, setBalance] = useState<Balance>({
    lamports: BigInt(0),
    decryptedLamports: null,
    isDecrypted: false,
    isLoading: false,
    error: null,
  });

  // Store encrypted balance and nonce for later decryption
  const [encryptedData, setEncryptedData] = useState<{
    encryptedBalance: number[][] | null;
    nonce: bigint | null;
  }>({ encryptedBalance: null, nonce: null });

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance({
        lamports: BigInt(0),
        decryptedLamports: null,
        isDecrypted: false,
        isLoading: false,
        error: null,
      });
      setEncryptedData({ encryptedBalance: null, nonce: null });
      return;
    }

    // Initialize Arcium context if not already done
    if (!program && !isInitializing) {
      await initialize();
    }

    if (!program) {
      setBalance((prev) => ({
        ...prev,
        isLoading: false,
        error: "Program not initialized",
      }));
      return;
    }

    setBalance((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch UserLedger account from on-chain
      const userLedger = await fetchUserLedger(program, publicKey);

      if (!userLedger) {
        // User has no ledger yet (hasn't deposited)
        setBalance({
          lamports: BigInt(0),
          decryptedLamports: BigInt(0),
          isDecrypted: true,
          isLoading: false,
          error: null,
        });
        setEncryptedData({ encryptedBalance: null, nonce: null });
        return;
      }

      // Store encrypted data for decryption
      const nonce = BigInt(userLedger.nonce.toString());
      setEncryptedData({
        encryptedBalance: userLedger.encryptedBalance,
        nonce,
      });

      // Show that we have encrypted balance (placeholder value until decrypted)
      setBalance({
        lamports: BigInt(1), // Non-zero to indicate balance exists
        decryptedLamports: null,
        isDecrypted: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch balance",
      }));
    }
  }, [publicKey, connected, program, initialize, isInitializing]);

  const decrypt = useCallback(async () => {
    if (!connected || !arciumContext) {
      if (!arciumContext && !isInitializing) {
        await initialize();
      }
      return;
    }

    if (!encryptedData.encryptedBalance || encryptedData.nonce === null) {
      // No encrypted data to decrypt
      return;
    }

    setBalance((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Convert nonce to Uint8Array (16 bytes, little-endian)
      const nonceBytes = new Uint8Array(16);
      let nonce = encryptedData.nonce;
      for (let i = 0; i < 16; i++) {
        nonceBytes[i] = Number(nonce & BigInt(0xff));
        nonce >>= BigInt(8);
      }

      // Decrypt the balance using Arcium cipher
      // The encrypted balance is a 2D array: [[u8; 32]; 2]
      // We decrypt the first element which contains the balance
      const decrypted = decryptBalance(
        arciumContext.cipher,
        encryptedData.encryptedBalance[0],
        nonceBytes
      );

      setBalance((prev) => ({
        ...prev,
        lamports: decrypted,
        decryptedLamports: decrypted,
        isDecrypted: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to decrypt balance:", error);
      setBalance((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to decrypt balance",
      }));
    }
  }, [connected, arciumContext, encryptedData, initialize, isInitializing]);

  const refresh = useCallback(async () => {
    await fetchBalance();
    // If we have arcium context, try to decrypt
    if (arciumContext && encryptedData.encryptedBalance) {
      await decrypt();
    }
  }, [fetchBalance, arciumContext, encryptedData.encryptedBalance, decrypt]);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    }
  }, [connected, publicKey, fetchBalance]);

  // Auto-decrypt when context becomes available and we have encrypted data
  useEffect(() => {
    if (
      arciumContext &&
      encryptedData.encryptedBalance &&
      !balance.isDecrypted &&
      !balance.isLoading
    ) {
      decrypt();
    }
  }, [arciumContext, encryptedData.encryptedBalance, balance.isDecrypted, balance.isLoading, decrypt]);

  return {
    balance,
    refresh,
    decrypt,
  };
};
