'use client';

import { usePlans } from '@/hooks/use-plans';
import { PlanForm } from '@/components/plans/plan-form';
import type { CreatePlanInput } from '@/types/plan';

export default function NewPlanPage() {
  const { createPlan } = usePlans();

  const handleSubmit = async (data: CreatePlanInput) => {
    await createPlan(data);
  };

  return (
    <div className="max-w-2xl">
      <PlanForm onSubmit={handleSubmit} />
    </div>
  );
}
