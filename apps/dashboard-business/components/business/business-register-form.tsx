'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BusinessRegisterForm() {
  const router = useRouter();
  const { registerBusiness } = useBusiness();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('事業者名を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await registerBusiness(name);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>事業者登録</CardTitle>
        <CardDescription>
          サブスクリプションプランを作成するために、事業者情報を登録してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">事業者名</Label>
            <Input
              id="name"
              type="text"
              placeholder="例: 株式会社サンプル"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '登録中...' : '登録する'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
