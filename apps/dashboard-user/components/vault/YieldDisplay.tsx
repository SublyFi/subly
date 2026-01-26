'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUSDC, formatPercentage } from '@/lib/utils';
import { useMockData } from '@/providers/MockDataProvider';
import { TrendingUp, Sparkles } from 'lucide-react';

export function YieldDisplay() {
  const { yieldInfo } = useMockData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Yield Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Current APY</p>
            <p className="text-2xl font-bold text-primary">
              {formatPercentage(yieldInfo.currentApy)}
            </p>
          </div>
          <Sparkles className="h-8 w-8 text-primary" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-lg font-semibold text-success">
              +{formatUSDC(yieldInfo.totalEarned)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Daily Earnings</p>
            <p className="text-lg font-semibold text-success">
              +{formatUSDC(yieldInfo.dailyEarnings)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your funds are automatically deposited into Kamino Lending to generate yield. You pay
          subscription fees from your earnings, preserving your principal.
        </p>
      </CardContent>
    </Card>
  );
}
