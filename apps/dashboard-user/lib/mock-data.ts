import type { VaultBalance, YieldInfo, ScheduledTransfer } from '@/types/vault';
import type { Plan, Subscription } from '@/types/subscription';
import type { Transaction } from '@/types/history';

// Mock Vault Data
export const mockVaultBalance: VaultBalance = {
  totalBalance: 250_000_000, // 250 USDC
  availableBalance: 235_000_000, // 235 USDC
  lockedBalance: 15_000_000, // 15 USDC (for scheduled transfers)
};

export const mockYieldInfo: YieldInfo = {
  currentApy: 0.072, // 7.2%
  totalEarned: 12_340_000, // 12.34 USDC
  dailyEarnings: 49_000, // 0.049 USDC
};

export const mockScheduledTransfers: ScheduledTransfer[] = [
  {
    id: 'st-1',
    recipientAddress: '7yM3SprL4tnzN3XjH8K9iW2LbQFM4tNZvGKqe8M5hjFC',
    recipientName: 'Premium Service',
    amount: 9_990_000, // 9.99 USDC
    interval: 'monthly',
    nextExecutionAt: new Date('2025-02-01'),
    isActive: true,
    createdAt: new Date('2024-12-01'),
  },
  {
    id: 'st-2',
    recipientAddress: '3KzV8RdmtSL9aVNpbQJGE2K4iW7LbQfM4tNZvGKqe8M5',
    recipientName: 'Analytics Tool',
    amount: 4_990_000, // 4.99 USDC
    interval: 'monthly',
    nextExecutionAt: new Date('2025-02-15'),
    isActive: true,
    createdAt: new Date('2024-12-15'),
  },
];

// Mock Plans Data
export const mockPlans: Plan[] = [
  {
    id: 'plan-1',
    businessId: 'biz-1',
    businessName: 'Premium Service Inc.',
    name: 'Premium Plan',
    description: 'Access to all premium features including advanced analytics and priority support.',
    priceUsdc: 9_990_000, // 9.99 USDC
    billingCycleSeconds: 2592000, // 30 days
    billingCycle: 'monthly',
    isActive: true,
    subscriberCount: 1250,
    createdAt: new Date('2024-06-01'),
  },
  {
    id: 'plan-2',
    businessId: 'biz-2',
    businessName: 'Analytics Corp',
    name: 'Pro Analytics',
    description: 'Real-time analytics dashboard with custom reports and API access.',
    priceUsdc: 4_990_000, // 4.99 USDC
    billingCycleSeconds: 2592000, // 30 days
    billingCycle: 'monthly',
    isActive: true,
    subscriberCount: 820,
    createdAt: new Date('2024-07-15'),
  },
  {
    id: 'plan-3',
    businessId: 'biz-3',
    businessName: 'Dev Tools LLC',
    name: 'Developer Suite',
    description: 'Full access to developer tools, SDKs, and technical documentation.',
    priceUsdc: 19_990_000, // 19.99 USDC
    billingCycleSeconds: 2592000, // 30 days
    billingCycle: 'monthly',
    isActive: true,
    subscriberCount: 450,
    createdAt: new Date('2024-08-01'),
  },
  {
    id: 'plan-4',
    businessId: 'biz-4',
    businessName: 'Cloud Storage Co',
    name: 'Storage Plus',
    description: '100GB encrypted cloud storage with privacy-first approach.',
    priceUsdc: 2_990_000, // 2.99 USDC
    billingCycleSeconds: 2592000, // 30 days
    billingCycle: 'monthly',
    isActive: true,
    subscriberCount: 2100,
    createdAt: new Date('2024-05-01'),
  },
];

// Mock Subscriptions Data
export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-1',
    planId: 'plan-1',
    plan: mockPlans[0],
    subscribedAt: new Date('2024-12-01'),
    nextBillingAt: new Date('2025-02-01'),
    isActive: true,
  },
  {
    id: 'sub-2',
    planId: 'plan-2',
    plan: mockPlans[1],
    subscribedAt: new Date('2024-12-15'),
    nextBillingAt: new Date('2025-02-15'),
    isActive: true,
  },
];

// Mock Transactions Data
export const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'deposit',
    amount: 100_000_000, // 100 USDC
    signature: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
    timestamp: new Date('2024-12-01T10:30:00'),
    status: 'confirmed',
  },
  {
    id: 'tx-2',
    type: 'subscribe',
    amount: 0,
    signature: '4xC7kYsQjL6sFv8P8NJdTREpY1vzqKqZKvdpKuc147dw',
    timestamp: new Date('2024-12-01T11:00:00'),
    status: 'confirmed',
    metadata: {
      planId: 'plan-1',
      planName: 'Premium Plan',
    },
  },
  {
    id: 'tx-3',
    type: 'subscription_payment',
    amount: 9_990_000, // 9.99 USDC
    signature: '3mN8hYsQjL6sFv8P8NJdTREpY1vzqKqZKvdpKuc147dw',
    timestamp: new Date('2025-01-01T00:00:00'),
    status: 'confirmed',
    metadata: {
      planId: 'plan-1',
      planName: 'Premium Plan',
      recipientAddress: '7yM3SprL4tnzN3XjH8K9iW2LbQFM4tNZvGKqe8M5hjFC',
    },
  },
  {
    id: 'tx-4',
    type: 'yield_earned',
    amount: 1_230_000, // 1.23 USDC
    signature: '2pK7gYsQjL6sFv8P8NJdTREpY1vzqKqZKvdpKuc147dw',
    timestamp: new Date('2025-01-15T12:00:00'),
    status: 'confirmed',
  },
  {
    id: 'tx-5',
    type: 'deposit',
    amount: 150_000_000, // 150 USDC
    signature: '1oJ6fYsQjL6sFv8P8NJdTREpY1vzqKqZKvdpKuc147dw',
    timestamp: new Date('2025-01-20T15:30:00'),
    status: 'confirmed',
  },
  {
    id: 'tx-6',
    type: 'subscribe',
    amount: 0,
    signature: '6rL9iYsQjL6sFv8P8NJdTREpY1vzqKqZKvdpKuc147dw',
    timestamp: new Date('2024-12-15T09:00:00'),
    status: 'confirmed',
    metadata: {
      planId: 'plan-2',
      planName: 'Pro Analytics',
    },
  },
];

// Helper function to get subscribed plans
export function getSubscribedPlanIds(): string[] {
  return mockSubscriptions.filter((s) => s.isActive).map((s) => s.planId);
}

// Helper function to get available (not subscribed) plans
export function getAvailablePlans(): Plan[] {
  const subscribedPlanIds = getSubscribedPlanIds();
  return mockPlans.filter((p) => !subscribedPlanIds.includes(p.id) && p.isActive);
}
