'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/header';
import { BusinessRegisterForm } from '@/components/business/business-register-form';
import { useBusiness } from '@/hooks/use-business';

export default function RegisterPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { business, isLoading } = useBusiness();

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!isLoading && business) {
      router.push('/dashboard');
    }
  }, [connected, isLoading, business, router]);

  if (!connected || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">読み込み中...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <BusinessRegisterForm />
      </main>
    </div>
  );
}
