"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { UserSubscription } from "@/types";
import { useArcium } from "@/components/providers/ArciumProvider";
import { fetchUserSubscriptions, fetchSubscriptionPlan } from "@/lib/transactions";
import { decryptBalance } from "@/lib/arcium";

export interface UseSubscriptionsResult {
  subscriptions: UserSubscription[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Helper to decode plan name from bytes
function decodePlanName(nameBytes: number[]): string {
  // Filter out null bytes and convert to string
  const nonZeroBytes = nameBytes.filter((b) => b !== 0);
  return new TextDecoder().decode(new Uint8Array(nonZeroBytes));
}

export const useSubscriptions = (): UseSubscriptionsResult => {
  const { publicKey, connected } = useWallet();
  const { arciumContext, program, initialize, isInitializing } = useArcium();

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!publicKey || !connected) {
      setSubscriptions([]);
      return;
    }

    // Initialize if needed
    if (!program && !isInitializing) {
      await initialize();
    }

    if (!program) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all UserSubscription accounts for this user
      const userSubs = await fetchUserSubscriptions(program, publicKey);

      // Process each subscription
      const processedSubs: UserSubscription[] = await Promise.all(
        userSubs.map(async (sub) => {
          // Fetch the associated plan
          const plan = await fetchSubscriptionPlan(program, sub.account.plan);

          // Decode plan name
          const planName = plan ? decodePlanName(plan.name) : null;

          // Convert nonce to Uint8Array for decryption
          const nonceBytes = new Uint8Array(16);
          let nonce = BigInt(sub.account.nonce.toString());
          for (let i = 0; i < 16; i++) {
            nonceBytes[i] = Number(nonce & BigInt(0xff));
            nonce >>= BigInt(8);
          }

          // Decrypt status and next payment date if we have arcium context
          let status: "active" | "cancelled" | "expired" = "active";
          let nextPaymentAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Default to 30 days

          if (arciumContext) {
            try {
              // Decrypt status (0 = Active, 1 = Cancelled, 2 = Expired)
              const decryptedStatus = decryptBalance(
                arciumContext.cipher,
                sub.account.encryptedStatus,
                nonceBytes
              );
              const statusValue = Number(decryptedStatus);
              if (statusValue === 1) {
                status = "cancelled";
              } else if (statusValue === 2) {
                status = "expired";
              }

              // Decrypt next payment date
              const decryptedDate = decryptBalance(
                arciumContext.cipher,
                sub.account.encryptedNextPaymentDate,
                nonceBytes
              );
              nextPaymentAt = Number(decryptedDate);
            } catch (decryptErr) {
              console.error("Failed to decrypt subscription data:", decryptErr);
            }
          }

          return {
            publicKey: sub.publicKey,
            merchant: plan?.merchant || sub.account.plan,
            plan: sub.account.plan,
            planName,
            status,
            nextPaymentAt,
            paymentAmount: plan ? BigInt(plan.price.toString()) : BigInt(0),
            createdAt: Math.floor(Date.now() / 1000), // Not stored on-chain, use current
            updatedAt: Math.floor(Date.now() / 1000),
          };
        })
      );

      setSubscriptions(processedSubs);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch subscriptions"
      );
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected, program, arciumContext, initialize, isInitializing]);

  const refresh = useCallback(async () => {
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Fetch subscriptions when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchSubscriptions();
    }
  }, [connected, publicKey, fetchSubscriptions]);

  // Re-fetch when arcium context becomes available (to decrypt)
  useEffect(() => {
    if (arciumContext && subscriptions.length > 0) {
      fetchSubscriptions();
    }
  }, [arciumContext]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    subscriptions,
    isLoading,
    error,
    refresh,
  };
};
