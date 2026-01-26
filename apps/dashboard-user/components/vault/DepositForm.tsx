'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMockData } from '@/providers/MockDataProvider';
import { formatUSDC } from '@/lib/utils';
import { ArrowDownToLine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const QUICK_AMOUNTS = [10, 50, 100, 250];

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { deposit } = useMockData();

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleDeposit = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const amountUsdc = Math.floor(amountNum * 1_000_000);
      const signature = await deposit(amountUsdc);
      toast.success(`Successfully deposited ${formatUSDC(amountUsdc)}`, {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });
      setAmount('');
    } catch (error) {
      toast.error('Deposit failed', {
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
          <ArrowDownToLine className="h-5 w-5" />
          Deposit USDC
        </CardTitle>
        <CardDescription>
          Deposit USDC privately. Your funds will be automatically invested in Kamino Lending.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="deposit-amount" className="text-sm font-medium">
            Amount (USDC)
          </label>
          <Input
            id="deposit-amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(value)}
            >
              ${value}
            </Button>
          ))}
        </div>

        <Button className="w-full" onClick={handleDeposit} disabled={isLoading || !amount}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Deposit'
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Deposits are processed through Privacy Cash, ensuring your transaction is private.
        </p>
      </CardContent>
    </Card>
  );
}
