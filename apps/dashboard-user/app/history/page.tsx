'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TransactionList } from '@/components/history/TransactionList';

export default function HistoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            View all your vault deposits, withdrawals, and subscription payments.
          </p>
        </div>

        <TransactionList />
      </div>
    </DashboardLayout>
  );
}
