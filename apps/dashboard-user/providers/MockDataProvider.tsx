'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { VaultBalance, YieldInfo, ScheduledTransfer } from '@/types/vault';
import type { Plan, Subscription } from '@/types/subscription';
import type { Transaction, TransactionType } from '@/types/history';
import {
  mockVaultBalance,
  mockYieldInfo,
  mockScheduledTransfers,
  mockPlans,
  mockSubscriptions,
  mockTransactions,
} from '@/lib/mock-data';

interface MockDataContextValue {
  // Vault
  vaultBalance: VaultBalance;
  yieldInfo: YieldInfo;
  scheduledTransfers: ScheduledTransfer[];
  deposit: (amount: number) => Promise<string>;
  withdraw: (amount: number) => Promise<string>;
  addScheduledTransfer: (transfer: Omit<ScheduledTransfer, 'id' | 'createdAt'>) => Promise<string>;
  removeScheduledTransfer: (id: string) => Promise<void>;

  // Subscriptions
  plans: Plan[];
  availablePlans: Plan[];
  subscriptions: Subscription[];
  subscribe: (planId: string) => Promise<string>;
  unsubscribe: (subscriptionId: string) => Promise<void>;

  // History
  transactions: Transaction[];

  // Loading state
  isLoading: boolean;
}

const MockDataContext = createContext<MockDataContextValue | undefined>(undefined);

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
}

interface MockDataProviderProps {
  children: ReactNode;
}

export function MockDataProvider({ children }: MockDataProviderProps) {
  const [vaultBalance, setVaultBalance] = useState<VaultBalance>(mockVaultBalance);
  const [yieldInfo] = useState<YieldInfo>(mockYieldInfo);
  const [scheduledTransfers, setScheduledTransfers] =
    useState<ScheduledTransfer[]>(mockScheduledTransfers);
  const [plans] = useState<Plan[]>(mockPlans);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [isLoading] = useState<boolean>(false);

  const generateTxId = () => `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const generateSignature = () =>
    `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  const addTransaction = useCallback(
    (type: TransactionType, amount: number, metadata?: Transaction['metadata']) => {
      const tx: Transaction = {
        id: generateTxId(),
        type,
        amount,
        signature: generateSignature(),
        timestamp: new Date(),
        status: 'confirmed',
        metadata,
      };
      setTransactions((prev) => [tx, ...prev]);
      return tx.signature;
    },
    []
  );

  const deposit = useCallback(
    async (amount: number): Promise<string> => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setVaultBalance((prev) => ({
        ...prev,
        totalBalance: prev.totalBalance + amount,
        availableBalance: prev.availableBalance + amount,
      }));

      return addTransaction('deposit', amount);
    },
    [addTransaction]
  );

  const withdraw = useCallback(
    async (amount: number): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (amount > vaultBalance.availableBalance) {
        throw new Error('Insufficient balance');
      }

      setVaultBalance((prev) => ({
        ...prev,
        totalBalance: prev.totalBalance - amount,
        availableBalance: prev.availableBalance - amount,
      }));

      return addTransaction('withdraw', amount);
    },
    [vaultBalance.availableBalance, addTransaction]
  );

  const addScheduledTransfer = useCallback(
    async (transfer: Omit<ScheduledTransfer, 'id' | 'createdAt'>): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newTransfer: ScheduledTransfer = {
        ...transfer,
        id: `st-${Date.now()}`,
        createdAt: new Date(),
      };

      setScheduledTransfers((prev) => [...prev, newTransfer]);

      // Lock the amount for scheduled transfer
      setVaultBalance((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance - transfer.amount,
        lockedBalance: prev.lockedBalance + transfer.amount,
      }));

      return newTransfer.id;
    },
    []
  );

  const removeScheduledTransfer = useCallback(async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const transfer = scheduledTransfers.find((t) => t.id === id);
    if (transfer) {
      setScheduledTransfers((prev) => prev.filter((t) => t.id !== id));

      // Unlock the amount
      setVaultBalance((prev) => ({
        ...prev,
        availableBalance: prev.availableBalance + transfer.amount,
        lockedBalance: prev.lockedBalance - transfer.amount,
      }));
    }
  }, [scheduledTransfers]);

  const subscribe = useCallback(
    async (planId: string): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const plan = plans.find((p) => p.id === planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const existingSub = subscriptions.find((s) => s.planId === planId && s.isActive);
      if (existingSub) {
        throw new Error('Already subscribed to this plan');
      }

      const newSubscription: Subscription = {
        id: `sub-${Date.now()}`,
        planId,
        plan,
        subscribedAt: new Date(),
        nextBillingAt: new Date(Date.now() + plan.billingCycleSeconds * 1000),
        isActive: true,
      };

      setSubscriptions((prev) => [...prev, newSubscription]);

      return addTransaction('subscribe', 0, { planId, planName: plan.name });
    },
    [plans, subscriptions, addTransaction]
  );

  const unsubscribe = useCallback(
    async (subscriptionId: string): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const subscription = subscriptions.find((s) => s.id === subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscriptionId ? { ...s, isActive: false } : s))
      );

      addTransaction('unsubscribe', 0, {
        planId: subscription.planId,
        planName: subscription.plan.name,
      });
    },
    [subscriptions, addTransaction]
  );

  // Filter out plans that the user is already subscribed to
  const subscribedPlanIds = subscriptions.filter((s) => s.isActive).map((s) => s.planId);
  const availablePlans = plans.filter((p) => !subscribedPlanIds.includes(p.id));

  const value: MockDataContextValue = {
    vaultBalance,
    yieldInfo,
    scheduledTransfers,
    deposit,
    withdraw,
    addScheduledTransfer,
    removeScheduledTransfer,
    plans,
    availablePlans,
    subscriptions,
    subscribe,
    unsubscribe,
    transactions,
    isLoading,
  };

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}
