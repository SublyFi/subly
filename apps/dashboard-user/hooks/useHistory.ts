'use client';

import { useMemo, useState } from 'react';
import { useMockData } from '@/providers/MockDataProvider';
import type { TransactionType, HistoryFilter } from '@/types/history';

export function useHistory() {
  const { transactions, isLoading } = useMockData();
  const [filter, setFilter] = useState<HistoryFilter>({});

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (filter.types && filter.types.length > 0) {
      result = result.filter((t) => filter.types!.includes(t.type));
    }

    if (filter.startDate) {
      result = result.filter((t) => new Date(t.timestamp) >= filter.startDate!);
    }

    if (filter.endDate) {
      result = result.filter((t) => new Date(t.timestamp) <= filter.endDate!);
    }

    return result.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [transactions, filter]);

  const setTypeFilter = (types: TransactionType[]) => {
    setFilter((prev) => ({ ...prev, types }));
  };

  const setDateRange = (startDate?: Date, endDate?: Date) => {
    setFilter((prev) => ({ ...prev, startDate, endDate }));
  };

  const clearFilters = () => {
    setFilter({});
  };

  const stats = useMemo(() => {
    const totalDeposits = transactions
      .filter((t) => t.type === 'deposit' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = transactions
      .filter((t) => t.type === 'withdraw' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalYieldEarned = transactions
      .filter((t) => t.type === 'yield_earned' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSubscriptionPayments = transactions
      .filter((t) => t.type === 'subscription_payment' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalDeposits,
      totalWithdrawals,
      totalYieldEarned,
      totalSubscriptionPayments,
      netFlow: totalDeposits - totalWithdrawals - totalSubscriptionPayments + totalYieldEarned,
    };
  }, [transactions]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    isLoading,
    filter,
    setTypeFilter,
    setDateRange,
    clearFilters,
    stats,
  };
}
