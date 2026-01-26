/**
 * Generate a random nonce for encryption
 * @returns A random 128-bit nonce as bigint
 */
export function generateNonce(): bigint {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBigInt(bytes);
}

/**
 * Generate a user commitment from a secret and identifier
 * Uses SHA-256 hash
 * @param secret - User's secret bytes
 * @param identifier - Plan or business identifier
 * @returns 32-byte commitment hash
 */
export async function generateUserCommitment(
  secret: Uint8Array,
  identifier: Uint8Array
): Promise<Uint8Array> {
  const combined = new Uint8Array(secret.length + identifier.length);
  combined.set(secret, 0);
  combined.set(identifier, secret.length);

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate a membership commitment from user commitment and plan
 * @param userCommitment - User's commitment
 * @param planPubkey - Plan public key bytes
 * @returns 32-byte membership commitment hash
 */
export async function generateMembershipCommitment(
  userCommitment: Uint8Array,
  planPubkey: Uint8Array
): Promise<Uint8Array> {
  const combined = new Uint8Array(userCommitment.length + planPubkey.length);
  combined.set(userCommitment, 0);
  combined.set(planPubkey, userCommitment.length);

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate a random user secret
 * @returns 32 random bytes
 */
export function generateUserSecret(): Uint8Array {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return secret;
}

/**
 * Simple encryption placeholder for plan name/description
 * In production, this should use Arcium MPC encryption
 * @param data - String data to encrypt
 * @param maxLength - Maximum output length
 * @returns Encrypted bytes (padded to maxLength)
 */
export function encryptPlanData(data: string, maxLength: number): Uint8Array {
  // Placeholder: In production, use Arcium MPC encryption
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const result = new Uint8Array(maxLength);

  // Copy data (truncate if too long)
  const copyLength = Math.min(encoded.length, maxLength);
  result.set(encoded.slice(0, copyLength), 0);

  return result;
}

/**
 * Simple decryption placeholder for plan name/description
 * In production, this should use Arcium MPC decryption
 * @param data - Encrypted bytes
 * @returns Decrypted string
 */
export function decryptPlanData(data: Uint8Array): string {
  // Placeholder: In production, use Arcium MPC decryption
  const decoder = new TextDecoder();
  // Find null terminator or end
  let endIndex = data.indexOf(0);
  if (endIndex === -1) endIndex = data.length;

  return decoder.decode(data.slice(0, endIndex));
}

/**
 * Convert bytes to bigint (little-endian)
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert bigint to bytes (little-endian)
 */
export function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let remaining = value;
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(remaining & BigInt(0xff));
    remaining = remaining >> BigInt(8);
  }
  return bytes;
}
