'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BalanceCard } from '@/components/vault/BalanceCard';
import { YieldDisplay } from '@/components/vault/YieldDisplay';
import { DepositForm } from '@/components/vault/DepositForm';
import { WithdrawForm } from '@/components/vault/WithdrawForm';
import { ScheduledTransferList } from '@/components/vault/ScheduledTransferList';

export default function VaultPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Vault</h1>
          <p className="text-muted-foreground">
            Manage your private funds and earn yield through DeFi.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <BalanceCard />
          <YieldDisplay />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <DepositForm />
          <WithdrawForm />
        </div>

        <ScheduledTransferList />
      </div>
    </DashboardLayout>
  );
}
