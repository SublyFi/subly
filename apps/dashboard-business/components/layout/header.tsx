'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/wallet/wallet-button';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-600">Subly</span>
          <span className="text-sm text-gray-500">Business</span>
        </Link>
        <WalletButton />
      </div>
    </header>
  );
}
