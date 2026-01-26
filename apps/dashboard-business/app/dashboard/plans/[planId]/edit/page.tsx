'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlans } from '@/hooks/use-plans';
import { PlanForm } from '@/components/plans/plan-form';
import type { Plan, CreatePlanInput } from '@/types/plan';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { getPlanById, updatePlan } = usePlans();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planId = params.planId as string;

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const data = await getPlanById(planId);
        if (!data.isActive) {
          router.push(`/dashboard/plans/${planId}`);
          return;
        }
        setPlan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'プランの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [planId, getPlanById, router]);

  const handleSubmit = async (data: CreatePlanInput) => {
    await updatePlan(planId, data);
  };

  if (isLoading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error || 'プランが見つかりません'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PlanForm plan={plan} onSubmit={handleSubmit} isEdit />
    </div>
  );
}
