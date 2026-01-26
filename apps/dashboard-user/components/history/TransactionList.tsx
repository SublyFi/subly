'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionCard } from './TransactionCard';
import { useMockData } from '@/providers/MockDataProvider';
import type { TransactionType } from '@/types/history';
import { History, Filter } from 'lucide-react';

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Deposits',
  withdraw: 'Withdrawals',
  subscription_payment: 'Payments',
  yield_earned: 'Yield',
  subscribe: 'Subscribed',
  unsubscribe: 'Unsubscribed',
};

export function TransactionList() {
  const { transactions, isLoading } = useMockData();
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);

  const toggleType = (type: TransactionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const filteredTransactions = selectedTypes.length > 0
    ? transactions.filter((t) => selectedTypes.includes(t.type))
    : transactions;

  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter by Type
          </CardTitle>
          <CardDescription>Select transaction types to filter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((type) => (
              <Button
                key={type}
                variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleType(type)}
              >
                {TRANSACTION_TYPE_LABELS[type]}
              </Button>
            ))}
            {selectedTypes.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedTypes([])}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {sortedTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              {selectedTypes.length > 0
                ? 'No transactions match the selected filters.'
                : 'No transactions yet. Start by depositing funds to your vault.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedTransactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}
    </div>
  );
}
