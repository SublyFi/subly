"use client";

import { FC, ReactNode } from "react";
import { WalletProvider } from "./WalletProvider";
import { MembershipProvider } from "./MembershipProvider";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <WalletProvider>
      <MembershipProvider>{children}</MembershipProvider>
    </WalletProvider>
  );
};
