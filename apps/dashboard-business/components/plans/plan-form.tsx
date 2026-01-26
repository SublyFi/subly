'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Plan, CreatePlanInput, BillingCycle } from '@/types/plan';
import { BILLING_CYCLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlanFormProps {
  plan?: Plan;
  onSubmit: (data: CreatePlanInput) => Promise<void>;
  isEdit?: boolean;
}

export function PlanForm({ plan, onSubmit, isEdit = false }: PlanFormProps) {
  const router = useRouter();
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [priceUsdc, setPriceUsdc] = useState(plan?.priceUsdc?.toString() || '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    plan?.billingCycle || 'monthly'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('プラン名を入力してください');
      return;
    }

    const price = parseFloat(priceUsdc);
    if (isNaN(price) || price <= 0) {
      setError('有効な価格を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        priceUsdc: price,
        billingCycle,
      });
      router.push('/dashboard/plans');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'プラン編集' : '新規プラン作成'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">プラン名 *</Label>
            <Input
              id="name"
              type="text"
              placeholder="例: ベーシックプラン"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              placeholder="プランの説明を入力"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">価格 (USDC) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="例: 9.99"
                value={priceUsdc}
                onChange={(e) => setPriceUsdc(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycle">課金周期 *</Label>
              <Select
                id="billingCycle"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                disabled={isSubmitting}
              >
                {BILLING_CYCLES.map((cycle) => (
                  <option key={cycle.value} value={cycle.value}>
                    {cycle.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : isEdit ? '更新する' : '作成する'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
