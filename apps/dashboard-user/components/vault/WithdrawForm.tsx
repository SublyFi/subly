'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMockData } from '@/providers/MockDataProvider';
import { formatUSDC } from '@/lib/utils';
import { ArrowUpFromLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { vaultBalance, withdraw } = useMockData();

  const handleMax = () => {
    setAmount((vaultBalance.availableBalance / 1_000_000).toFixed(2));
  };

  const handleWithdraw = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amountUsdc = Math.floor(amountNum * 1_000_000);
    if (amountUsdc > vaultBalance.availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      const signature = await withdraw(amountUsdc);
      toast.success(`Successfully withdrew ${formatUSDC(amountUsdc)}`, {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });
      setAmount('');
    } catch (error) {
      toast.error('Withdrawal failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5" />
          Withdraw USDC
        </CardTitle>
        <CardDescription>
          Withdraw USDC to your wallet privately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="withdraw-amount" className="text-sm font-medium">
              Amount (USDC)
            </label>
            <span className="text-xs text-muted-foreground">
              Available: {formatUSDC(vaultBalance.availableBalance)}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              max={vaultBalance.availableBalance / 1_000_000}
            />
            <Button variant="outline" onClick={handleMax}>
              MAX
            </Button>
          </div>
        </div>

        <Button
          className="w-full"
          variant="secondary"
          onClick={handleWithdraw}
          disabled={isLoading || !amount}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Withdraw'
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Withdrawals are processed through Privacy Cash, protecting your privacy.
        </p>
      </CardContent>
    </Card>
  );
}
