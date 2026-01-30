/**
 * Solana network configuration for Vault dashboard
 *
 * Note: Privacy Cash and Kamino only work on Mainnet
 */

// Mainnet RPC URL - use a paid RPC for production
export const SOLANA_NETWORK = "mainnet-beta";
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export const WALLET_ADAPTER_CONFIG = {
  wallets: [],
  autoConnect: true,
};
