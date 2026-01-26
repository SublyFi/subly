'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Transaction } from '@/types/history';
import { formatUSDC, formatDate, shortenAddress } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  TrendingUp,
  UserPlus,
  UserMinus,
  ExternalLink,
} from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const getTypeConfig = (type: Transaction['type']) => {
    const configs = {
      deposit: {
        icon: ArrowDownLeft,
        label: 'Deposit',
        colorClass: 'text-success',
        bgClass: 'bg-success/10',
        isPositive: true,
      },
      withdraw: {
        icon: ArrowUpRight,
        label: 'Withdrawal',
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        isPositive: false,
      },
      subscription_payment: {
        icon: CreditCard,
        label: 'Subscription Payment',
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        isPositive: false,
      },
      yield_earned: {
        icon: TrendingUp,
        label: 'Yield Earned',
        colorClass: 'text-success',
        bgClass: 'bg-success/10',
        isPositive: true,
      },
      subscribe: {
        icon: UserPlus,
        label: 'Subscribed',
        colorClass: 'text-primary',
        bgClass: 'bg-primary/10',
        isPositive: false,
      },
      unsubscribe: {
        icon: UserMinus,
        label: 'Unsubscribed',
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted',
        isPositive: false,
      },
    };
    return configs[type];
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const badges = {
      pending: 'bg-warning/10 text-warning',
      confirmed: 'bg-success/10 text-success',
      failed: 'bg-destructive/10 text-destructive',
    };
    return badges[status];
  };

  const config = getTypeConfig(transaction.type);
  const Icon = config.icon;

  const explorerUrl = `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-full p-2 ${config.bgClass}`}>
          <Icon className={`h-5 w-5 ${config.colorClass}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{config.label}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadge(transaction.status)}`}>
              {transaction.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDate(transaction.timestamp)}</span>
            {transaction.metadata?.planName && (
              <>
                <span>•</span>
                <span>{transaction.metadata.planName}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className={`font-semibold ${config.isPositive ? 'text-success' : ''}`}>
            {config.isPositive ? '+' : '-'}
            {formatUSDC(transaction.amount)}
          </p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            {shortenAddress(transaction.signature)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
