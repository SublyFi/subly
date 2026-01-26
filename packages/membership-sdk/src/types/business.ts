import type { PublicKey } from "@solana/web3.js";

/**
 * On-chain BusinessAccount structure
 */
export type BusinessAccount = {
  /** Authority (owner) of the business */
  authority: PublicKey;
  /** Business name */
  name: string;
  /** Metadata URI (IPFS, Arweave, etc.) */
  metadataUri: string;
  /** Unix timestamp when created */
  createdAt: bigint;
  /** Whether the business is active */
  isActive: boolean;
  /** Number of plans created by this business */
  planCount: bigint;
  /** PDA bump seed */
  bump: number;
};

/**
 * Input for registering a new business
 */
export type RegisterBusinessInput = {
  /** Business name (max 32 characters) */
  name: string;
  /** Metadata URI (max 128 characters) */
  metadataUri: string;
};

/**
 * Business account with additional metadata
 */
export type Business = BusinessAccount & {
  /** Public key of the business account PDA */
  publicKey: PublicKey;
};
