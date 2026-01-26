'use client';

import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PlanBrowser } from '@/components/subscriptions/PlanBrowser';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BrowsePlansPage() {
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
            <h1 className="text-2xl font-bold">Browse Plans</h1>
            <p className="text-muted-foreground">
              Find and subscribe to services with privacy protection.
            </p>
          </div>
        </div>

        <PlanBrowser />
      </div>
    </DashboardLayout>
  );
}
