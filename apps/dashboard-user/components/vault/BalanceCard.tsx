'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUSDC } from '@/lib/utils';
import { useMockData } from '@/providers/MockDataProvider';
import { Lock, Wallet } from 'lucide-react';

export function BalanceCard() {
  const { vaultBalance } = useMockData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Private Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-3xl font-bold">{formatUSDC(vaultBalance.totalBalance)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-lg font-semibold text-success">
              {formatUSDC(vaultBalance.availableBalance)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Reserved</p>
            </div>
            <p className="text-lg font-semibold">{formatUSDC(vaultBalance.lockedBalance)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your balance is encrypted and only visible to you. Third parties cannot see your balance
          or transaction history.
        </p>
      </CardContent>
    </Card>
  );
}
