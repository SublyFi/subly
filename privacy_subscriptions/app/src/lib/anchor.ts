import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "./constants";

// Import IDL
import idl from "../idl/privacy_subscriptions.json";

// Type for the program (use generic Idl type)
export type PrivacySubscriptionsProgram = Program<Idl>;

/**
 * Create an Anchor Provider from wallet context
 */
export function createAnchorProvider(
  connection: Connection,
  wallet: WalletContextState
): AnchorProvider | null {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    return null;
  }

  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    },
    { commitment: "confirmed" }
  );
}

/**
 * Get the Privacy Subscriptions program client
 */
export function getProgram(
  provider: AnchorProvider
): PrivacySubscriptionsProgram {
  return new Program(idl as Idl, provider);
}

/**
 * Get program with connection (read-only, no wallet needed)
 */
export function getProgramReadOnly(connection: Connection): PrivacySubscriptionsProgram {
  // Create a dummy provider for read-only operations
  const dummyKeypair = {
    publicKey: PublicKey.default,
    signTransaction: async () => { throw new Error("Read-only"); },
    signAllTransactions: async () => { throw new Error("Read-only"); },
  };

  const provider = new AnchorProvider(
    connection,
    dummyKeypair as unknown as AnchorProvider["wallet"],
    { commitment: "confirmed" }
  );

  return new Program(idl as Idl, provider);
}

/**
 * Get the program ID
 */
export function getProgramId(): PublicKey {
  return PROGRAM_ID;
}

// Re-export the IDL for use elsewhere
export { idl };
