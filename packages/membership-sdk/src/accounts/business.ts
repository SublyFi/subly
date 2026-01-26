import type { PublicKey } from "@solana/web3.js";
import type { BusinessAccount } from "../types/business";

/**
 * Decode raw business account data
 * @param data - Raw account data buffer
 * @returns Decoded business account
 */
export function decodeBusinessAccount(
  _data: Buffer,
  _publicKey: PublicKey
): BusinessAccount {
  // Placeholder: In production, manually decode the buffer
  // This is used when we can't use Anchor's automatic decoding
  throw new Error("Not implemented - use Anchor client instead");
}
