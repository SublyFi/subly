'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SubscriptionList } from '@/components/subscriptions/SubscriptionList';

export default function SubscriptionsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your privacy-protected subscription memberships.
          </p>
        </div>

        <SubscriptionList />
      </div>
    </DashboardLayout>
  );
}
