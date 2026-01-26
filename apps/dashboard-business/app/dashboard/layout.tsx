'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useBusiness } from '@/hooks/use-business';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { connected } = useWallet();
  const { business, isLoading } = useBusiness();

  useEffect(() => {
    if (!connected) {
      router.push('/');
    } else if (!isLoading && !business) {
      router.push('/register');
    }
  }, [connected, isLoading, business, router]);

  if (!connected || isLoading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
