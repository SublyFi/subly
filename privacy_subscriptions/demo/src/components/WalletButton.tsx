'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

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

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors"
    >
      {connecting ? (
        <>
          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          Connecting...
        </>
      ) : publicKey ? (
        <>
          <span className="h-2 w-2 bg-green-400 rounded-full" />
          {shortenAddress(publicKey.toBase58())}
        </>
      ) : (
        'Connect Wallet'
      )}
    </button>
  );
}
