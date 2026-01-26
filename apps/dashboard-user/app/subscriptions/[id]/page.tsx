'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnsubscribeDialog } from '@/components/subscriptions/UnsubscribeDialog';
import { useMockData } from '@/providers/MockDataProvider';
import { formatUSDC, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Users, Shield, XCircle } from 'lucide-react';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const { subscriptions } = useMockData();
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);

  const subscription = subscriptions.find((s) => s.id === params.id);

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/subscriptions">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Subscription Not Found</h1>
            </div>
          </div>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                The subscription you are looking for does not exist.
              </p>
              <Link href="/subscriptions">
                <Button variant="link">Back to subscriptions</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { plan } = subscription;

  const getBillingLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      hourly: 'Hourly',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[cycle] || cycle;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/subscriptions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            <p className="text-muted-foreground">{plan.businessName}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">{formatUSDC(plan.priceUsdc)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span>{getBillingLabel(plan.billingCycle)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subscribed On</span>
                <span>{formatDate(subscription.subscribedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next Billing</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(subscription.nextBillingAt)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    subscription.isActive
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {subscription.isActive ? 'Active' : 'Cancelled'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Protection</CardTitle>
              <CardDescription>
                Your subscription is protected by zero-knowledge proofs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-4">
                <Shield className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Anonymous Membership</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.businessName} cannot identify you as a subscriber. Your wallet address
                    and personal information remain private.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  You are one of {plan.subscriberCount.toLocaleString()} anonymous subscribers
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {subscription.isActive && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Cancel your subscription to {plan.name}. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setShowUnsubscribeDialog(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <UnsubscribeDialog
        subscription={subscription}
        open={showUnsubscribeDialog}
        onOpenChange={setShowUnsubscribeDialog}
      />
    </DashboardLayout>
  );
}
