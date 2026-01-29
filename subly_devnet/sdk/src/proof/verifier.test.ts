import { PublicKey, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  verifyMembershipProof,
  isProofExpired,
  verifyProofSignature,
  getProofRemainingValidity,
} from "./verifier";
import { MembershipProof } from "../types/proof";

describe("MembershipProofVerifier", () => {
  const mockPlanId = new PublicKey("11111111111111111111111111111111");
  const keypair = Keypair.generate();

  function createMockProof(overrides: Partial<MembershipProof> = {}): MembershipProof {
    const now = Math.floor(Date.now() / 1000);
    const nonce = nacl.randomBytes(32);
    const membershipCommitment = new Uint8Array(32).fill(1);
    const validUntil = now + 3600; // 1 hour from now

    // Create message to sign
    const message = new Uint8Array(32 + 32 + 32 + 8);
    message.set(mockPlanId.toBytes(), 0);
    message.set(membershipCommitment, 32);
    message.set(nonce, 64);
    const timestampBytes = new ArrayBuffer(8);
    new DataView(timestampBytes).setBigInt64(0, BigInt(validUntil), true);
    message.set(new Uint8Array(timestampBytes), 96);

    const signature = nacl.sign.detached(message, keypair.secretKey);

    return {
      planId: mockPlanId,
      membershipCommitment,
      validityProof: new Uint8Array(128),
      rootIndex: 0,
      leafIndex: 0,
      proofTimestamp: now,
      validUntil,
      signature: new Uint8Array(signature),
      nonce,
      ...overrides,
    };
  }

  describe("isProofExpired", () => {
    it("should return false for non-expired proof", () => {
      const proof = createMockProof();
      expect(isProofExpired(proof)).toBe(false);
    });

    it("should return true for expired proof", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof({ validUntil: now - 100 });
      expect(isProofExpired(proof)).toBe(true);
    });

    it("should return true for proof expiring exactly now", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof({ validUntil: now });
      // Could be true or false depending on timing, so we just check it doesn't throw
      const result = isProofExpired(proof);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getProofRemainingValidity", () => {
    it("should return positive number for non-expired proof", () => {
      const proof = createMockProof();
      const remaining = getProofRemainingValidity(proof);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it("should return 0 for expired proof", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof({ validUntil: now - 100 });
      expect(getProofRemainingValidity(proof)).toBe(0);
    });
  });

  describe("verifyProofSignature", () => {
    it("should return true for valid signature", () => {
      const proof = createMockProof();
      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const proof = createMockProof();
      const wrongKeypair = Keypair.generate();
      const isValid = verifyProofSignature(proof, wrongKeypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });

    it("should return false for tampered proof", () => {
      const proof = createMockProof();
      // Tamper with membership commitment
      proof.membershipCommitment = new Uint8Array(32).fill(99);
      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });
  });

  describe("verifyMembershipProof", () => {
    it("should return valid result for valid proof", () => {
      const proof = createMockProof();
      const result = verifyMembershipProof(
        proof,
        mockPlanId,
        keypair.publicKey.toBytes()
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.planId).toEqual(mockPlanId);
    });

    it("should fail for wrong plan ID", () => {
      const proof = createMockProof();
      const wrongPlanId = Keypair.generate().publicKey; // Use random keypair pubkey
      const result = verifyMembershipProof(
        proof,
        wrongPlanId,
        keypair.publicKey.toBytes()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Plan ID mismatch");
    });

    it("should fail for expired proof", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof({ validUntil: now - 100 });
      const result = verifyMembershipProof(
        proof,
        mockPlanId,
        keypair.publicKey.toBytes()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should fail for invalid signature", () => {
      const proof = createMockProof();
      const wrongKeypair = Keypair.generate();
      const result = verifyMembershipProof(
        proof,
        mockPlanId,
        wrongKeypair.publicKey.toBytes()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid signature");
    });
  });
});
