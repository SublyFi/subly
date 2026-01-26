'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionCard } from './SubscriptionCard';
import { useMockData } from '@/providers/MockDataProvider';
import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function SubscriptionList() {
  const { subscriptions } = useMockData();

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Active Subscriptions</CardTitle>
          </div>
          <Link href="/subscriptions/browse">
            <Button variant="outline" size="sm">
              Browse Plans
            </Button>
          </Link>
        </div>
        <CardDescription>
          Your current subscription memberships. Payments are made privately from your vault.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeSubscriptions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No active subscriptions.</p>
            <Link href="/subscriptions/browse">
              <Button variant="link">Browse available plans</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSubscriptions.map((subscription) => (
              <SubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
