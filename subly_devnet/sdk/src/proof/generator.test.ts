import { PublicKey, Keypair } from "@solana/web3.js";
import { generateMembershipCommitment, generateEncryptedUserCommitment } from "./generator";

describe("MembershipCommitment", () => {
  const mockPlanId = new PublicKey("11111111111111111111111111111111");

  describe("generateMembershipCommitment", () => {
    it("should generate a 32-byte commitment", () => {
      const userSecret = new Uint8Array(32).fill(1);
      const commitment = generateMembershipCommitment(userSecret, mockPlanId);

      expect(commitment).toBeInstanceOf(Uint8Array);
      expect(commitment.length).toBe(32);
    });

    it("should generate different commitments for different secrets", () => {
      const secret1 = new Uint8Array(32).fill(1);
      const secret2 = new Uint8Array(32).fill(2);

      const commitment1 = generateMembershipCommitment(secret1, mockPlanId);
      const commitment2 = generateMembershipCommitment(secret2, mockPlanId);

      expect(commitment1).not.toEqual(commitment2);
    });

    it("should generate different commitments for different plans", () => {
      const userSecret = new Uint8Array(32).fill(1);
      // Use different valid Solana program addresses
      const plan1 = new PublicKey("11111111111111111111111111111111"); // System Program
      const plan2 = Keypair.generate().publicKey; // Random keypair

      const commitment1 = generateMembershipCommitment(userSecret, plan1);
      const commitment2 = generateMembershipCommitment(userSecret, plan2);

      expect(commitment1).not.toEqual(commitment2);
    });

    it("should be deterministic", () => {
      const userSecret = new Uint8Array(32).fill(42);

      const commitment1 = generateMembershipCommitment(userSecret, mockPlanId);
      const commitment2 = generateMembershipCommitment(userSecret, mockPlanId);

      expect(commitment1).toEqual(commitment2);
    });
  });

  describe("generateEncryptedUserCommitment", () => {
    it("should return a commitment (placeholder implementation)", () => {
      const userCommitment = new Uint8Array(32).fill(5);
      const encryptionKey = new Uint8Array(32).fill(10);

      const encrypted = generateEncryptedUserCommitment(userCommitment, encryptionKey);

      expect(encrypted).toBeInstanceOf(Uint8Array);
      // Current placeholder just returns the input
      expect(encrypted).toEqual(userCommitment);
    });
  });
});
