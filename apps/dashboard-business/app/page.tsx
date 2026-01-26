'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/header';
import { useBusiness } from '@/hooks/use-business';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { business, isLoading } = useBusiness();

  useEffect(() => {
    if (connected && !isLoading) {
      if (business) {
        router.push('/dashboard');
      } else if (publicKey) {
        router.push('/register');
      }
    }
  }, [connected, isLoading, business, publicKey, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Subly Business</CardTitle>
            <CardDescription>
              サブスクリプションプランの作成・管理
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-center text-gray-600">
              ウォレットを接続して、サブスクリプションプランの作成・管理を始めましょう。
            </p>
            {isLoading && (
              <p className="text-sm text-gray-500">読み込み中...</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
