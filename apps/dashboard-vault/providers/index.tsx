"use client";

import { FC, ReactNode } from "react";
import { WalletProvider } from "./WalletProvider";
import { VaultProvider } from "./VaultProvider";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <WalletProvider>
      <VaultProvider>{children}</VaultProvider>
    </WalletProvider>
  );
};
