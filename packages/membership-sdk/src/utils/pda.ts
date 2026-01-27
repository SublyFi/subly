import { PublicKey } from "@solana/web3.js";
import { CONSTANTS } from "../types/common";

/**
 * Derive the business account PDA
 * @param authority - The authority (owner) of the business
 * @param programId - The program ID
 * @returns The business PDA and bump
 */
export function deriveBusinessPda(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONSTANTS.SEEDS.BUSINESS), authority.toBuffer()],
    programId
  );
}

/**
 * Derive the plan account PDA
 * @param business - The business account public key
 * @param planNonce - The sequential plan number
 * @param programId - The program ID
 * @returns The plan PDA and bump
 */
export function derivePlanPda(
  business: PublicKey,
  planNonce: bigint | number,
  programId: PublicKey
): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(planNonce));

  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONSTANTS.SEEDS.PLAN), business.toBuffer(), nonceBuffer],
    programId
  );
}

/**
 * Derive the subscription account PDA
 * @param plan - The plan account public key
 * @param membershipCommitment - The membership commitment hash
 * @param programId - The program ID
 * @returns The subscription PDA and bump
 */
export function deriveSubscriptionPda(
  plan: PublicKey,
  membershipCommitment: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONSTANTS.SEEDS.SUBSCRIPTION),
      plan.toBuffer(),
      Buffer.from(membershipCommitment),
    ],
    programId
  );
}

/**
 * Check if a PDA exists for a given business authority
 * @param authority - The authority to check
 * @param programId - The program ID
 * @returns The business PDA
 */
export function getBusinessPdaForAuthority(
  authority: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = deriveBusinessPda(authority, programId);
  return pda;
}

/**
 * Derive the MXE account PDA
 * Used for Arcium MXE integration
 * @param programId - The program ID
 * @returns The MXE PDA and bump
 */
export function deriveMxePda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONSTANTS.SEEDS.MXE)],
    programId
  );
}
