"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMembership } from "@/providers/MembershipProvider";

export interface StoredSubscription {
  planPubkey: string;
  subscriptionPubkey: string;
  membershipCommitment: string;
  userSecret: string;
  subscribedAt: number;
}

export interface Subscription {
  publicKey: PublicKey;
  plan: PublicKey;
  membershipCommitment: Uint8Array;
  subscribedAt: Date;
  cancelledAt: Date | null;
  isActive: boolean;
}

interface UseSubscriptionsResult {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveSubscription: (subscription: StoredSubscription) => void;
}

const STORAGE_KEY = "subly_user_subscriptions";

function getStoredSubscriptions(walletPubkey: string): StoredSubscription[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${walletPubkey}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredSubscriptions(walletPubkey: string, subscriptions: StoredSubscription[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(`${STORAGE_KEY}_${walletPubkey}`, JSON.stringify(subscriptions));
}

export function useSubscriptions(): UseSubscriptionsResult {
  const { client, isReady } = useMembership();
  const { publicKey } = useWallet();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!client || !isReady || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      // Get stored subscription info from localStorage
      const storedSubs = getStoredSubscriptions(publicKey.toBase58());

      const fetchedSubscriptions: Subscription[] = [];

      for (const stored of storedSubs) {
        try {
          // Fetch the subscription account from chain
          const subPubkey = new PublicKey(stored.subscriptionPubkey);
          const planPubkey = new PublicKey(stored.planPubkey);

          // Fetch subscriptions for this plan
          const planSubs = await client.getSubscriptions(planPubkey);

          // Find this specific subscription
          const sub = planSubs.find(s => s.publicKey.equals(subPubkey));

          if (sub) {
            fetchedSubscriptions.push(sub);
          }
        } catch {
          // Skip if subscription doesn't exist
          continue;
        }
      }

      setSubscriptions(fetchedSubscriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  }, [client, isReady, publicKey]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const saveSubscription = useCallback((subscription: StoredSubscription) => {
    if (!publicKey) return;

    const stored = getStoredSubscriptions(publicKey.toBase58());

    // Check if already exists
    const exists = stored.some(s => s.subscriptionPubkey === subscription.subscriptionPubkey);
    if (!exists) {
      stored.push(subscription);
      setStoredSubscriptions(publicKey.toBase58(), stored);
    }
  }, [publicKey]);

  return {
    subscriptions,
    loading,
    error,
    refresh: fetchSubscriptions,
    saveSubscription,
  };
}
