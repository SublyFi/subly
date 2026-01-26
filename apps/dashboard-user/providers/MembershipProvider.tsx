"use client";

import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useMemo,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SublyMembershipClient } from "@subly/membership-sdk";

interface MembershipContextType {
  client: SublyMembershipClient | null;
  isReady: boolean;
}

const MembershipContext = createContext<MembershipContextType>({
  client: null,
  isReady: false,
});

export const useMembership = () => useContext(MembershipContext);

interface MembershipProviderProps {
  children: ReactNode;
}

export const MembershipProvider: FC<MembershipProviderProps> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const client = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }

    return new SublyMembershipClient({
      connection,
      wallet: {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
    });
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

  const value = useMemo(
    () => ({
      client,
      isReady: client !== null,
    }),
    [client]
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
};
