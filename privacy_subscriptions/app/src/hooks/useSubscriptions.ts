"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { UserSubscription } from "@/types";
import { useArcium } from "@/components/providers/ArciumProvider";
import { fetchUserSubscriptions, fetchSubscriptionPlan } from "@/lib/transactions";
import { decryptValues, u128sToPubkey } from "@/lib/arcium";

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
          let planPubkey: PublicKey | null = null;
          let status: "active" | "cancelled" | "expired" | "unknown" = "unknown";
          let nextPaymentAt = 0;
          let startDate = 0;

          // Convert nonce to Uint8Array for decryption
          const nonceBytes = new Uint8Array(16);
          let nonce = BigInt(sub.account.nonce.toString());
          for (let i = 0; i < 16; i++) {
            nonceBytes[i] = Number(nonce & BigInt(0xff));
            nonce >>= BigInt(8);
          }

          if (arciumContext) {
            try {
              const [planPart1, planPart2, statusVal, nextPayVal, startVal] =
                decryptValues(
                  arciumContext.cipher,
                  [
                    sub.account.encryptedPlan[0],
                    sub.account.encryptedPlan[1],
                    sub.account.encryptedStatus,
                    sub.account.encryptedNextPaymentDate,
                    sub.account.encryptedStartDate,
                  ],
                  nonceBytes
                );

              planPubkey = u128sToPubkey([planPart1, planPart2]);

              const statusValue = Number(statusVal);
              if (statusValue === 0) {
                status = "active";
              } else if (statusValue === 1) {
                status = "cancelled";
              } else if (statusValue === 2) {
                status = "expired";
              }

              nextPaymentAt = Number(BigInt.asIntN(64, nextPayVal));
              startDate = Number(BigInt.asIntN(64, startVal));
            } catch (decryptErr) {
              console.error("Failed to decrypt subscription data:", decryptErr);
            }
          }

          const plan = planPubkey
            ? await fetchSubscriptionPlan(program, planPubkey)
            : null;

          const planName = plan ? decodePlanName(plan.name) : null;

          return {
            publicKey: sub.publicKey,
            subscriptionIndex: BigInt(sub.account.subscriptionIndex.toString()),
            merchant: plan?.merchant || PublicKey.default,
            plan: planPubkey,
            planName,
            status,
            nextPaymentAt,
            paymentAmount: plan ? BigInt(plan.price.toString()) : BigInt(0),
            createdAt: startDate,
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
