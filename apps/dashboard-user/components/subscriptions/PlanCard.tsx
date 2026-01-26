'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatUSDC } from '@/lib/utils';
import type { Plan } from '@/types/subscription';
import { Users, Check } from 'lucide-react';

interface PlanCardProps {
  plan: Plan;
  isSubscribed?: boolean;
  onSubscribe?: (planId: string) => void;
}

export function PlanCard({ plan, isSubscribed = false, onSubscribe }: PlanCardProps) {
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
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{plan.businessName}</p>
          </div>
          {isSubscribed && (
            <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs text-success">
              <Check className="h-3 w-3" />
              Subscribed
            </div>
          )}
        </div>
        <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{formatUSDC(plan.priceUsdc)}</span>
          <span className="text-sm text-muted-foreground">{getBillingLabel(plan.billingCycle)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{plan.subscriberCount.toLocaleString()} subscribers</span>
        </div>

        {!isSubscribed && onSubscribe && (
          <Button className="w-full" onClick={() => onSubscribe(plan.id)}>
            Subscribe
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
