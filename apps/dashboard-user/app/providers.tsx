'use client';

import { WalletProvider } from '@/providers/WalletProvider';
import { MockDataProvider } from '@/providers/MockDataProvider';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletProvider>
      <MockDataProvider>
        {children}
        <Toaster position="top-right" richColors />
      </MockDataProvider>
    </WalletProvider>
  );
}
