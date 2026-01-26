export interface VaultBalance {
  totalBalance: number; // in USDC (6 decimals)
  availableBalance: number;
  lockedBalance: number; // 定期送金用に確保
}

export interface YieldInfo {
  currentApy: number; // 0.05 = 5%
  totalEarned: number; // 累計利回り (USDC)
  dailyEarnings: number; // 日次利回り (USDC)
}

export interface ScheduledTransfer {
  id: string;
  recipientAddress: string;
  recipientName: string;
  amount: number; // USDC
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextExecutionAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface DepositResult {
  signature: string;
  amount: number;
  timestamp: Date;
}

export interface WithdrawResult {
  signature: string;
  amount: number;
  timestamp: Date;
}

export interface VaultState {
  balance: VaultBalance | null;
  yieldInfo: YieldInfo | null;
  scheduledTransfers: ScheduledTransfer[];
  isLoading: boolean;
  error: string | null;
}
