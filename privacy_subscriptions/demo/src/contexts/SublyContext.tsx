'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SublySDK, SubscriptionPlan, SubscriptionStatus } from '@subly/sdk';
import BN from 'bn.js';
import {
  DisplayPlan,
  SubscriptionState,
  LoadingState,
  formatLamportsToSol,
  formatBillingCycle,
} from '@/types';

interface SublyContextType {
  // SDK instance
  sdk: SublySDK | null;

  // Plans
  plans: DisplayPlan[];
  plansLoading: LoadingState;
  refreshPlans: () => Promise<void>;

  // User subscription state
  subscriptionState: SubscriptionState;
  subscriptionLoading: LoadingState;
  checkUserSubscription: () => Promise<void>;

  // Actions
  subscribe: (planPDA: PublicKey) => Promise<string>;
  unsubscribe: () => Promise<string>;
  actionLoading: LoadingState;
  actionError: string | null;
}

const SublyContext = createContext<SublyContextType | null>(null);

export function useSubly(): SublyContextType {
  const context = useContext(SublyContext);
  if (!context) {
    throw new Error('useSubly must be used within SublyProvider');
  }
  return context;
}

interface SublyProviderProps {
  children: ReactNode;
}

export function SublyProvider({ children }: SublyProviderProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  // SDK instance
  const sdk = useMemo(() => {
    const merchantWallet = process.env.NEXT_PUBLIC_MERCHANT_WALLET;
    const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    const programId = process.env.NEXT_PUBLIC_PROGRAM_ID;

    if (!merchantWallet || !rpcEndpoint) {
      console.warn('Missing environment variables for SDK initialization');
      return null;
    }

    try {
      return new SublySDK({
        rpcEndpoint,
        merchantWallet,
        programId,
      });
    } catch (error) {
      console.error('Failed to initialize SublySDK:', error);
      return null;
    }
  }, []);

  // Plans state
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState<LoadingState>('idle');

  // Subscription state
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    isSubscribed: false,
    subscribedPlan: null,
    subscriptionIndex: null,
  });
  const [subscriptionLoading, setSubscriptionLoading] = useState<LoadingState>('idle');

  // Action state
  const [actionLoading, setActionLoading] = useState<LoadingState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  // Convert SDK plan to display plan
  const toDisplayPlan = useCallback((plan: SubscriptionPlan): DisplayPlan => {
    return {
      publicKey: plan.publicKey,
      planId: plan.planId,
      name: plan.name,
      price: plan.price,
      billingCycleDays: plan.billingCycleDays,
      isActive: plan.isActive,
      priceDisplay: formatLamportsToSol(plan.price),
      cycleDisplay: formatBillingCycle(plan.billingCycleDays),
    };
  }, []);

  // Fetch plans from on-chain
  const refreshPlans = useCallback(async () => {
    if (!sdk) return;

    setPlansLoading('loading');
    try {
      const fetchedPlans = await sdk.getPlans(true); // active only
      const displayPlans = fetchedPlans.map(toDisplayPlan);
      setPlans(displayPlans);
      setPlansLoading('success');
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlansLoading('error');
    }
  }, [sdk, toDisplayPlan]);

  // Check user subscription status
  const checkUserSubscription = useCallback(async () => {
    if (!sdk || !wallet.publicKey || plans.length === 0) {
      setSubscriptionState({
        isSubscribed: false,
        subscribedPlan: null,
        subscriptionIndex: null,
      });
      return;
    }

    setSubscriptionLoading('loading');
    try {
      // Check each plan for subscription
      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const status = await sdk.checkSubscription(wallet.publicKey, plan.publicKey);

        if (status === SubscriptionStatus.Active) {
          // Find the subscription index
          // This is a simplified approach - in production, you might want to track this differently
          setSubscriptionState({
            isSubscribed: true,
            subscribedPlan: plan,
            subscriptionIndex: i,
          });
          setSubscriptionLoading('success');
          return;
        }
      }

      // Not subscribed to any plan
      setSubscriptionState({
        isSubscribed: false,
        subscribedPlan: null,
        subscriptionIndex: null,
      });
      setSubscriptionLoading('success');
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setSubscriptionLoading('error');
    }
  }, [sdk, wallet.publicKey, plans]);

  // Subscribe to a plan
  const subscribe = useCallback(
    async (planPDA: PublicKey): Promise<string> => {
      if (!sdk || !wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
        throw new Error('Wallet not connected');
      }

      setActionLoading('loading');
      setActionError(null);

      try {
        const walletAdapter = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction.bind(wallet),
          signAllTransactions: wallet.signAllTransactions.bind(wallet),
        };

        const signature = await sdk.subscribe(planPDA, walletAdapter);
        setActionLoading('success');

        // Refresh subscription state after successful subscription
        await checkUserSubscription();

        return signature;
      } catch (error) {
        console.error('Failed to subscribe:', error);
        setActionLoading('error');
        setActionError(error instanceof Error ? error.message : 'Subscription failed');
        throw error;
      }
    },
    [sdk, wallet, checkUserSubscription]
  );

  // Unsubscribe from current plan
  const unsubscribe = useCallback(async (): Promise<string> => {
    if (!sdk || !wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      throw new Error('Wallet not connected');
    }

    if (subscriptionState.subscriptionIndex === null) {
      throw new Error('No active subscription');
    }

    setActionLoading('loading');
    setActionError(null);

    try {
      const walletAdapter = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions.bind(wallet),
      };

      const signature = await sdk.unsubscribe(
        new BN(subscriptionState.subscriptionIndex),
        walletAdapter
      );
      setActionLoading('success');

      // Refresh subscription state after successful unsubscription
      await checkUserSubscription();

      return signature;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      setActionLoading('error');
      setActionError(error instanceof Error ? error.message : 'Unsubscription failed');
      throw error;
    }
  }, [sdk, wallet, subscriptionState.subscriptionIndex, checkUserSubscription]);

  // Fetch plans on mount
  useEffect(() => {
    if (sdk) {
      refreshPlans();
    }
  }, [sdk, refreshPlans]);

  // Check subscription when wallet connects or plans change
  useEffect(() => {
    if (wallet.connected && plans.length > 0) {
      checkUserSubscription();
    } else if (!wallet.connected) {
      setSubscriptionState({
        isSubscribed: false,
        subscribedPlan: null,
        subscriptionIndex: null,
      });
    }
  }, [wallet.connected, plans, checkUserSubscription]);

  const value: SublyContextType = {
    sdk,
    plans,
    plansLoading,
    refreshPlans,
    subscriptionState,
    subscriptionLoading,
    checkUserSubscription,
    subscribe,
    unsubscribe,
    actionLoading,
    actionError,
  };

  return <SublyContext.Provider value={value}>{children}</SublyContext.Provider>;
}
