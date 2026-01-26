import type { PublicKey } from "@solana/web3.js";
import type { PlanAccount } from "../types/plan";

/**
 * Decode raw plan account data
 * @param data - Raw account data buffer
 * @returns Decoded plan account
 */
export function decodePlanAccount(
  _data: Buffer,
  _publicKey: PublicKey
): PlanAccount {
  // Placeholder: In production, manually decode the buffer
  // This is used when we can't use Anchor's automatic decoding
  throw new Error("Not implemented - use Anchor client instead");
}
