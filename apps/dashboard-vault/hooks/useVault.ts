"use client";

import { useVaultContext } from "@/providers/VaultProvider";

/**
 * Hook to access the Vault client and initialization state
 *
 * Privacy Cash initialization uses message signing (not private key input):
 * - Call initializeWithSignature() to prompt user to sign a message
 * - The signature is used to derive the encryption key
 */
export function useVault() {
  const {
    client,
    isInitialized,
    isInitializing,
    error,
    derivedPublicKey,
    initializeWithSignature,
    showInitModal,
    setShowInitModal,
  } = useVaultContext();

  return {
    client,
    isInitialized,
    isInitializing,
    error,
    /** The derived Privacy Cash address (where users need to fund for deposits) */
    derivedPublicKey,
    /** Initialize Privacy Cash by signing a message (wallet popup) */
    initializeWithSignature,
    showInitModal,
    setShowInitModal,
  };
}
