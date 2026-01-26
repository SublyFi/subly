import { clusterApiUrl } from "@solana/web3.js";

export const SOLANA_NETWORK = "devnet";
export const SOLANA_RPC_URL = clusterApiUrl(SOLANA_NETWORK);

export const WALLET_ADAPTER_CONFIG = {
  wallets: [],
  autoConnect: true,
};
