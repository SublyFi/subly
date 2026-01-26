import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Devnet for Protocol A (Membership)
export const DEVNET_ENDPOINT = clusterApiUrl(WalletAdapterNetwork.Devnet);

// Mainnet for Protocol B (Vault)
export const MAINNET_ENDPOINT =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || clusterApiUrl(WalletAdapterNetwork.Mainnet);

// Default network for wallet connection
export const DEFAULT_NETWORK = WalletAdapterNetwork.Devnet;

// Connection config
export const CONNECTION_CONFIG = {
  commitment: 'confirmed' as const,
  confirmTransactionInitialTimeout: 60000,
};

// USDC Token addresses
export const USDC_MINT = {
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
};

// Program IDs (placeholder - will be replaced with actual program IDs)
export const PROGRAM_IDS = {
  membership: 'MEMBERSHIP_PROGRAM_ID_PLACEHOLDER',
  vault: 'VAULT_PROGRAM_ID_PLACEHOLDER',
};
