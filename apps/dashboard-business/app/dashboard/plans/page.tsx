'use client';

import Link from 'next/link';
import { usePlans } from '@/hooks/use-plans';
import { PlanList } from '@/components/plans/plan-list';
import { buttonVariants } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlansPage() {
  const { plans, isLoading } = usePlans();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">プラン管理</h1>
          <p className="text-gray-500">サブスクリプションプランの一覧</p>
        </div>
        <Link href="/dashboard/plans/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4 mr-2" />
          新規プラン作成
        </Link>
      </div>

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <PlanList plans={plans} />
      )}
    </div>
  );
}
