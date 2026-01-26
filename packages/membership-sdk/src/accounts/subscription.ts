import type { PublicKey } from "@solana/web3.js";
import type { SubscriptionAccount } from "../types/subscription";

/**
 * Decode raw subscription account data
 * @param data - Raw account data buffer
 * @returns Decoded subscription account
 */
export function decodeSubscriptionAccount(
  _data: Buffer,
  _publicKey: PublicKey
): SubscriptionAccount {
  // Placeholder: In production, manually decode the buffer
  // This is used when we can't use Anchor's automatic decoding
  throw new Error("Not implemented - use Anchor client instead");
}
