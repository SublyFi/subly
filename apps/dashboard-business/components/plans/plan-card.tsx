'use client';

import Link from 'next/link';
import type { Plan } from '@/types/plan';
import { BILLING_CYCLE_LABELS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Edit, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  return (
    <Card className={cn(!plan.isActive && 'opacity-60')}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <CardDescription className="mt-1">
              {plan.description || '説明なし'}
            </CardDescription>
          </div>
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              plan.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {plan.isActive ? '有効' : '無効'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">${plan.priceUsdc}</span>
          <span className="text-gray-500">
            USDC / {BILLING_CYCLE_LABELS[plan.billingCycle]}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{plan.subscriptionCount}件の契約</span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/plans/${plan.id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            詳細
          </Link>
          {plan.isActive && (
            <Link
              href={`/dashboard/plans/${plan.id}/edit`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Edit className="h-4 w-4 mr-1" />
              編集
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
