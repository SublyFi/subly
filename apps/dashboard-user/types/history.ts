export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'subscription_payment'
  | 'yield_earned'
  | 'subscribe'
  | 'unsubscribe';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // USDC (6 decimals)
  signature: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: {
    planId?: string;
    planName?: string;
    recipientAddress?: string;
    recipientName?: string;
  };
}

export interface HistoryFilter {
  types?: TransactionType[];
  startDate?: Date;
  endDate?: Date;
}

export interface HistoryState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  filter: HistoryFilter;
}
