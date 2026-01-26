'use client';

import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepositForm } from '@/components/vault/DepositForm';
import { BalanceCard } from '@/components/vault/BalanceCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DepositPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/vault">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Deposit USDC</h1>
            <p className="text-muted-foreground">
              Add funds to your private vault.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <DepositForm />
          <BalanceCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
