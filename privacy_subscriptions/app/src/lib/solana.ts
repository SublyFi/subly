import { Connection, clusterApiUrl } from "@solana/web3.js";

// Get RPC URL from environment or use devnet default
const getRpcUrl = (): string => {
  return process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");
};

// Get network name
export const getNetwork = (): "mainnet-beta" | "devnet" | "localnet" => {
  const network = process.env.NEXT_PUBLIC_NETWORK;
  if (network === "mainnet-beta" || network === "devnet" || network === "localnet") {
    return network;
  }
  return "devnet";
};

// Create a singleton connection instance
let connectionInstance: Connection | null = null;

export const getConnection = (): Connection => {
  if (!connectionInstance) {
    connectionInstance = new Connection(getRpcUrl(), "confirmed");
  }
  return connectionInstance;
};

// Get explorer URL for transaction
export const getExplorerUrl = (signature: string): string => {
  const network = getNetwork();
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
};

// Get Solscan URL for transaction
export const getSolscanUrl = (signature: string): string => {
  const network = getNetwork();
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://solscan.io/tx/${signature}${cluster}`;
};
