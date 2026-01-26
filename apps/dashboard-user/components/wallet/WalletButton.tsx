'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/utils';
import { Wallet, LogOut } from 'lucide-react';

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{shortenAddress(publicKey.toBase58())}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => disconnect()} title="Disconnect">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => setVisible(true)} disabled={connecting}>
      <Wallet className="mr-2 h-4 w-4" />
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
