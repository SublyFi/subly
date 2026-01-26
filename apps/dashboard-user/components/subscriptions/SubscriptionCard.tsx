'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatUSDC, formatDate } from '@/lib/utils';
import type { Subscription } from '@/types/subscription';
import { Calendar, ArrowRight } from 'lucide-react';

interface SubscriptionCardProps {
  subscription: Subscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const { plan } = subscription;

  const getBillingLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      hourly: '/hour',
      daily: '/day',
      weekly: '/week',
      monthly: '/month',
      yearly: '/year',
    };
    return labels[cycle] || `/${cycle}`;
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground">{plan.businessName}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {formatUSDC(plan.priceUsdc)}
              <span className="text-sm font-normal text-muted-foreground">
                {getBillingLabel(plan.billingCycle)}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Next billing: {formatDate(subscription.nextBillingAt)}</span>
          </div>
          <Link href={`/subscriptions/${subscription.id}`}>
            <Button variant="ghost" size="sm">
              Details
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
