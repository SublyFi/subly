'use client';

import { ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { SublyProvider } from '@/contexts/SublyContext';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Use environment variable or fallback to devnet
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('devnet'),
    []
  );

  // Configure supported wallets
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SublyProvider>{children}</SublyProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
