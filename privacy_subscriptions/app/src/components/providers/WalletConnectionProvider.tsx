"use client";

import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  UnsafeBurnerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletConnectionProviderProps {
  children: ReactNode;
}

export const WalletConnectionProvider: FC<WalletConnectionProviderProps> = ({
  children,
}) => {
  // Use environment variable or fallback to devnet
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet"),
    []
  );

  const isLocalnet =
    process.env.NEXT_PUBLIC_NETWORK === "localnet" ||
    process.env.NEXT_PUBLIC_RPC_URL?.includes("localhost") ||
    process.env.NEXT_PUBLIC_RPC_URL?.includes("127.0.0.1");

  // Configure supported wallets
  const wallets = useMemo(
    () =>
      isLocalnet
        ? [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new UnsafeBurnerWalletAdapter(),
          ]
        : [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [isLocalnet]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
