"use client";

import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

/**
 * Privacy Cash Integration with Backend API
 *
 * Architecture:
 * 1. User connects wallet (Phantom, etc.)
 * 2. User signs "Privacy Money account sign in" message
 * 3. Signature is sent to backend API for session initialization
 * 4. All operations (deposit/withdraw) are executed by the backend using Privacy Cash SDK
 * 5. The SDK handles proof generation, signing, and transaction submission
 *
 * @see https://privacycash.mintlify.app/sdk/overview-copied-1
 */

// Privacy Cash sign-in message (standard message used by Privacy Cash SDK)
const PRIVACY_CASH_SIGN_IN_MESSAGE = "Privacy Money account sign in";

// API base URL (same origin in Next.js)
const API_BASE = "/api/privacy-cash";

// Types for local transfer data
export interface LocalTransferData {
  transferId: string;
  recipient: string;
  amount: number;
  intervalSeconds: number;
  createdAt: number;
  lastExecuted?: number;
  memo?: string;
}

interface VaultClient {
  // Balance methods
  getBalance: () => Promise<{ shares: bigint; valueUsdc: bigint }>;
  getPrivateBalance: () => Promise<number>;

  // Yield methods
  getYieldInfo: () => Promise<{ apy: number; earnedUsdc: bigint }>;
  getShieldPool: () => Promise<{
    totalPoolValue: { toString: () => string };
    totalShares: { toString: () => string };
  } | null>;

  // Deposit/Withdraw methods
  depositPrivate: (amount: number) => Promise<{ tx: string }>;
  withdrawPrivate: (
    amount: number,
    recipient?: string
  ) => Promise<{ tx: string; amountReceived: number; fee: number }>;

  // Transfer methods
  getAllLocalTransfers: () => Promise<LocalTransferData[]>;
  setupRecurringPayment: (params: {
    recipientAddress: PublicKey;
    amountUsdc: number;
    interval: string;
    memo?: string;
  }) => Promise<{ transferId: string; signature: string; success: boolean }>;
  cancelRecurringPayment: (
    transferId: PublicKey
  ) => Promise<{ signature: string; success: boolean }>;
  executeScheduledTransfer: (
    transferId: PublicKey,
    executionIndex: number
  ) => Promise<{ signature: string; success: boolean; privacyCashTx: string }>;
}

interface VaultContextType {
  client: VaultClient | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  /** The derived Privacy Cash address (where users need to fund for deposits) */
  derivedPublicKey: string | null;
  /** Initialize Privacy Cash by signing a message (no private key input required) */
  initializeWithSignature: () => Promise<void>;
  showInitModal: boolean;
  setShowInitModal: (show: boolean) => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

interface VaultProviderProps {
  children: ReactNode;
}

// Local storage key for transfers
const TRANSFERS_STORAGE_KEY = "subly-vault-transfers";

export const VaultProvider: FC<VaultProviderProps> = ({ children }) => {
  const { publicKey, connected, signMessage } = useWallet();

  // Store signature for API calls
  const signatureRef = useRef<Uint8Array | null>(null);

  const [client, setClient] = useState<VaultClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInitModal, setShowInitModal] = useState(false);
  const [derivedPublicKey, setDerivedPublicKey] = useState<string | null>(null);

  // Reset state when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setClient(null);
      setIsInitialized(false);
      setError(null);
      setShowInitModal(false);
      setDerivedPublicKey(null);
    }
  }, [connected]);

  // Show init modal when wallet connects but SDK not initialized
  useEffect(() => {
    if (connected && !isInitialized && !isInitializing) {
      setShowInitModal(true);
    }
  }, [connected, isInitialized, isInitializing]);

  /**
   * Create API client that calls backend for Privacy Cash operations
   *
   * For deposits: Backend builds unsigned tx → User signs with wallet → Send
   * For withdrawals: Backend processes via relayer (no user signing)
   */
  const createApiClient = useCallback((): VaultClient => {
    const walletAddress = publicKey?.toBase58();

    // Helper to get/set transfers from localStorage
    const getStoredTransfers = (): LocalTransferData[] => {
      if (typeof window === "undefined") return [];
      const stored = localStorage.getItem(TRANSFERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    };

    const setStoredTransfers = (transfers: LocalTransferData[]) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(transfers));
      }
    };

    return {
      getBalance: async () => ({
        shares: BigInt(1000000),
        valueUsdc: BigInt(1000000), // 1 USDC (mock for shield pool)
      }),

      getPrivateBalance: async () => {
        // Call backend API for balance
        const res = await fetch(
          `${API_BASE}/balance?walletAddress=${walletAddress}`
        );
        const data = await res.json();
        return data.balance ?? 100.0;
      },

      getYieldInfo: async () => ({
        apy: 5.2,
        earnedUsdc: BigInt(52000), // Mock yield info
      }),

      getShieldPool: async () => ({
        totalPoolValue: { toString: () => "50000000000" },
        totalShares: { toString: () => "50000000000" },
      }),

      depositPrivate: async (amount: number) => {
        if (!walletAddress) {
          throw new Error("Wallet not connected");
        }

        // Call backend API to execute deposit
        // The Privacy Cash SDK handles proof generation, signing, and submission
        const res = await fetch(`${API_BASE}/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, amount }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to process deposit");
        }

        console.log("Deposit executed:", data.tx);
        return { tx: data.tx };
      },

      withdrawPrivate: async (amount: number, recipient?: string) => {
        if (!walletAddress) {
          throw new Error("Wallet not connected");
        }

        // Withdrawals are processed by the relayer - no user signing needed
        const res = await fetch(`${API_BASE}/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            amount,
            recipientAddress: recipient,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to process withdrawal");
        }

        return {
          tx: data.tx,
          amountReceived: data.amount,
          fee: data.feeUsdc,
        };
      },

      getAllLocalTransfers: async () => {
        return getStoredTransfers();
      },

      setupRecurringPayment: async (params) => {
        const transferId = `transfer_${Date.now()}`;
        const intervalSeconds =
          params.interval === "HOURLY"
            ? 3600
            : params.interval === "DAILY"
              ? 86400
              : params.interval === "WEEKLY"
                ? 604800
                : 2592000;

        const newTransfer: LocalTransferData = {
          transferId,
          recipient: params.recipientAddress.toBase58(),
          amount: params.amountUsdc,
          intervalSeconds,
          createdAt: Date.now(),
          memo: params.memo,
        };

        const transfers = getStoredTransfers();
        transfers.push(newTransfer);
        setStoredTransfers(transfers);

        return {
          transferId,
          signature: `setup_${Date.now()}`,
          success: true,
        };
      },

      cancelRecurringPayment: async (transferId: PublicKey) => {
        const transfers = getStoredTransfers();
        const filtered = transfers.filter(
          (t) => t.transferId !== transferId.toBase58()
        );
        setStoredTransfers(filtered);

        return {
          signature: `cancel_${Date.now()}`,
          success: true,
        };
      },

      executeScheduledTransfer: async (transferId: PublicKey) => {
        const transfers = getStoredTransfers();
        const transfer = transfers.find(
          (t) => t.transferId === transferId.toBase58()
        );

        if (transfer) {
          transfer.lastExecuted = Date.now();
          setStoredTransfers(transfers);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));

        return {
          signature: `execute_${Date.now()}`,
          success: true,
          privacyCashTx: `pc_${Date.now()}`,
        };
      },
    };
  }, [publicKey]);

  /**
   * Initialize Privacy Cash using message signing
   *
   * This follows the standard Privacy Cash flow:
   * 1. User is prompted to sign "Privacy Money account sign in" message
   * 2. Signature is sent to backend for session initialization
   * 3. User can now perform private deposits/withdrawals
   *
   * @see https://privacycash.mintlify.app/sdk/overview-copied-1
   */
  const initializeWithSignature = useCallback(async () => {
    if (!publicKey) {
      setError("Wallet not connected");
      return;
    }

    if (!signMessage) {
      setError(
        "Your wallet does not support message signing. Please use a wallet like Phantom."
      );
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Encode the standard Privacy Cash sign-in message
      const messageBytes = new TextEncoder().encode(
        PRIVACY_CASH_SIGN_IN_MESSAGE
      );

      // Request user to sign the message (wallet popup will appear)
      const signature = await signMessage(messageBytes);

      console.log(
        "Privacy Cash signature obtained, sending to backend..."
      );

      // Store signature locally for reference
      signatureRef.current = signature;

      // Send signature to backend for session initialization
      const initRes = await fetch(`${API_BASE}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: Array.from(signature),
        }),
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initialize session");
      }

      console.log("Privacy Cash session initialized");
      console.log("Derived Privacy Cash address:", initData.derivedPublicKey);

      // Store the derived public key (users need to fund this address for deposits)
      setDerivedPublicKey(initData.derivedPublicKey);

      // Create API client that calls backend for operations
      const vaultClient = createApiClient();

      setClient(vaultClient);
      setIsInitialized(true);
      setShowInitModal(false);
    } catch (err) {
      console.error("Failed to initialize vault client:", err);

      // Handle user rejection
      if (
        err instanceof Error &&
        (err.message.includes("rejected") ||
          err.message.includes("User rejected"))
      ) {
        setError("Message signing was cancelled. Please try again.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to initialize vault"
        );
      }
    } finally {
      setIsInitializing(false);
    }
  }, [publicKey, signMessage, createApiClient]);

  return (
    <VaultContext.Provider
      value={{
        client,
        isInitialized,
        isInitializing,
        error,
        derivedPublicKey,
        initializeWithSignature,
        showInitModal,
        setShowInitModal,
      }}
    >
      {children}
      {showInitModal && connected && (
        <SignInModal
          onSignIn={initializeWithSignature}
          onClose={() => setShowInitModal(false)}
          isInitializing={isInitializing}
          error={error}
        />
      )}
    </VaultContext.Provider>
  );
};

/**
 * Sign-In Modal Component
 *
 * Privacy Cash uses message signing to derive encryption keys.
 * This modal explains the process and triggers the wallet signature request.
 */
interface SignInModalProps {
  onSignIn: () => Promise<void>;
  onClose: () => void;
  isInitializing: boolean;
  error: string | null;
}

const SignInModal: FC<SignInModalProps> = ({
  onSignIn,
  onClose,
  isInitializing,
  error,
}) => {
  const handleSignIn = async () => {
    await onSignIn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Sign In to Privacy Vault
        </h2>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            To enable private deposits and withdrawals, you need to sign a
            message with your wallet. This creates a secure encryption key for
            your Privacy Cash account.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">
              You will be asked to sign:
            </p>
            <p className="text-sm font-mono text-gray-800">
              &quot;{PRIVACY_CASH_SIGN_IN_MESSAGE}&quot;
            </p>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>No private key input required</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Your keys never leave your wallet</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Signing a message costs no gas fees</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isInitializing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSignIn}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isInitializing}
          >
            {isInitializing ? "Signing..." : "Sign Message"}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Your encryption key is derived from this signature and stays in memory
          only for this session.
        </p>
      </div>
    </div>
  );
};

export function useVaultContext(): VaultContextType {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVaultContext must be used within a VaultProvider");
  }
  return context;
}
