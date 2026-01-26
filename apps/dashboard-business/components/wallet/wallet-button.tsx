'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (connecting) {
    return (
      <Button variant="outline" disabled>
        接続中...
      </Button>
    );
  }

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {formatAddress(publicKey.toBase58())}
        </span>
        <Button variant="outline" size="sm" onClick={handleClick}>
          <LogOut className="h-4 w-4 mr-2" />
          切断
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleClick}>
      <Wallet className="h-4 w-4 mr-2" />
      ウォレット接続
    </Button>
  );
}
