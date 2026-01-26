'use client';

import Link from 'next/link';
import { useBusiness } from '@/hooks/use-business';
import { usePlans } from '@/hooks/use-plans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CreditCard, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { business } = useBusiness();
  const { plans } = usePlans();

  const activePlans = plans.filter((p) => p.isActive);
  const totalSubscriptions = plans.reduce((sum, p) => sum + p.subscriptionCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          ようこそ、{business?.name}さん
        </h1>
        <p className="text-gray-500">ダッシュボードの概要</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>アクティブなプラン</CardDescription>
            <CardTitle className="text-3xl">{activePlans.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              全{plans.length}件中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総契約数</CardDescription>
            <CardTitle className="text-3xl">{totalSubscriptions}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              プライバシー保護により個人は特定できません
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ネットワーク</CardDescription>
            <CardTitle className="text-3xl">Devnet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              テスト環境で動作中
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              プラン管理
            </CardTitle>
            <CardDescription>
              サブスクリプションプランの作成・編集
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/dashboard/plans/new" className={cn(buttonVariants())}>
              <Plus className="h-4 w-4 mr-2" />
              新規プラン作成
            </Link>
            <Link
              href="/dashboard/plans"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              プラン一覧
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              設定
            </CardTitle>
            <CardDescription>
              SDK統合情報・事業者プロフィール
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/settings"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              設定を開く
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
