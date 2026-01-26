'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/types/plan';
import { BILLING_CYCLE_LABELS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ArrowLeft, Edit, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getPlanById, deactivatePlan } = usePlans();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planId = params.planId as string;

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const data = await getPlanById(planId);
        setPlan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'プランの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [planId, getPlanById]);

  const handleDeactivate = async () => {
    if (!confirm('このプランを無効化しますか？')) return;

    setIsDeactivating(true);
    try {
      const updated = await deactivatePlan(planId);
      setPlan(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無効化に失敗しました');
    } finally {
      setIsDeactivating(false);
    }
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          <p className="text-gray-500">プラン詳細</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">説明</p>
              <p>{plan.description || '説明なし'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">価格</p>
              <p className="text-xl font-semibold">
                ${plan.priceUsdc} USDC / {BILLING_CYCLE_LABELS[plan.billingCycle]}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ステータス</p>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  plan.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {plan.isActive ? '有効' : '無効'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>統計情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">契約数</p>
              <p className="text-xl font-semibold">{plan.subscriptionCount}件</p>
              <p className="text-xs text-gray-400 mt-1">
                プライバシー保護により個人は特定できません
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">作成日</p>
              <p>{new Date(plan.createdAt).toLocaleDateString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">最終更新</p>
              <p>{new Date(plan.updatedAt).toLocaleDateString('ja-JP')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>操作</CardTitle>
          <CardDescription>プランの編集・無効化</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {plan.isActive && (
            <>
              <Link
                href={`/dashboard/plans/${plan.id}/edit`}
                className={cn(buttonVariants())}
              >
                <Edit className="h-4 w-4 mr-2" />
                編集
              </Link>
              <Button
                variant="destructive"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                <Ban className="h-4 w-4 mr-2" />
                {isDeactivating ? '処理中...' : '無効化'}
              </Button>
            </>
          )}
          {!plan.isActive && (
            <p className="text-gray-500">このプランは無効化されています</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
