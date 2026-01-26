'use client';

import type { Plan } from '@/types/plan';
import { PlanCard } from './plan-card';

interface PlanListProps {
  plans: Plan[];
}

export function PlanList({ plans }: PlanListProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">プランがありません</p>
        <p className="text-sm text-gray-400 mt-1">
          「新規プラン作成」からプランを作成してください
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
