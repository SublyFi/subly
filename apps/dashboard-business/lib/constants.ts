import type { BillingCycle } from '@/types/plan';

export const PROGRAM_ID = 'SubLyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'hourly', label: '時間単位' },
  { value: 'daily', label: '日次' },
  { value: 'weekly', label: '週次' },
  { value: 'monthly', label: '月次' },
  { value: 'yearly', label: '年次' },
];

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  hourly: '時間',
  daily: '日',
  weekly: '週',
  monthly: '月',
  yearly: '年',
};

export const STORAGE_KEYS = {
  BUSINESSES: 'subly_businesses',
  PLANS: 'subly_plans',
} as const;

export const SOLANA_NETWORK = 'devnet';
export const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';
