import { PublicKey, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  verifyMembershipProof,
  isProofExpired,
  verifyProofSignature,
} from "./verifier";
import { MembershipProof } from "../types/proof";

describe("SecurityTests", () => {
  const mockPlanId = new PublicKey("11111111111111111111111111111111");
  const keypair = Keypair.generate();

  function createMockProof(
    keypairToUse: Keypair,
    planId: PublicKey,
    overrides: Partial<MembershipProof> = {}
  ): MembershipProof {
    const now = Math.floor(Date.now() / 1000);
    const nonce = nacl.randomBytes(32);
    const membershipCommitment = new Uint8Array(32).fill(1);
    const validUntil = now + 3600;

    const message = new Uint8Array(32 + 32 + 32 + 8);
    message.set(planId.toBytes(), 0);
    message.set(membershipCommitment, 32);
    message.set(nonce, 64);
    const timestampBytes = new ArrayBuffer(8);
    new DataView(timestampBytes).setBigInt64(0, BigInt(validUntil), true);
    message.set(new Uint8Array(timestampBytes), 96);

    const signature = nacl.sign.detached(message, keypairToUse.secretKey);

    return {
      planId,
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

  describe("Replay Attack Prevention", () => {
    it("should use unique nonces for each proof", () => {
      const proof1 = createMockProof(keypair, mockPlanId);
      const proof2 = createMockProof(keypair, mockPlanId);

      // Nonces should be different for each proof generation
      expect(proof1.nonce).not.toEqual(proof2.nonce);
    });

    it("should include nonce in signature verification", () => {
      const proof = createMockProof(keypair, mockPlanId);
      const originalNonce = new Uint8Array(proof.nonce);

      // Tampering with nonce should invalidate signature
      proof.nonce = nacl.randomBytes(32);

      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);

      // Restore original nonce - signature should be valid again
      proof.nonce = originalNonce;
      const isValidAgain = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValidAgain).toBe(true);
    });

    it("should detect replayed proof with modified timestamp", () => {
      const proof = createMockProof(keypair, mockPlanId);

      // Attacker tries to extend validity by changing validUntil
      const originalValidUntil = proof.validUntil;
      proof.validUntil = proof.validUntil + 86400; // Try to extend by 1 day

      // Signature should no longer be valid
      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);

      // Restore original - should be valid
      proof.validUntil = originalValidUntil;
      const isValidAgain = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValidAgain).toBe(true);
    });
  });

  describe("Forged Proof Detection", () => {
    it("should detect forged membership commitment", () => {
      const proof = createMockProof(keypair, mockPlanId);

      // Attacker forges a different membership commitment
      proof.membershipCommitment = new Uint8Array(32).fill(255);

      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });

    it("should detect forged plan ID", () => {
      const proof = createMockProof(keypair, mockPlanId);
      const attackerPlanId = Keypair.generate().publicKey;

      // Attacker tries to use proof for a different plan
      proof.planId = attackerPlanId;

      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });

    it("should detect signature from wrong signer", () => {
      const attackerKeypair = Keypair.generate();
      const proof = createMockProof(attackerKeypair, mockPlanId);

      // Verify with original keypair (not attacker's)
      const result = verifyMembershipProof(
        proof,
        mockPlanId,
        keypair.publicKey.toBytes()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid signature");
    });

    it("should detect completely random signature", () => {
      const proof = createMockProof(keypair, mockPlanId);

      // Replace with random signature
      proof.signature = nacl.randomBytes(64);

      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });
  });

  describe("Expired Proof Detection", () => {
    it("should detect recently expired proof", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof(keypair, mockPlanId, {
        validUntil: now - 1, // Expired 1 second ago
      });

      expect(isProofExpired(proof)).toBe(true);
    });

    it("should detect long-expired proof", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof(keypair, mockPlanId, {
        validUntil: now - 86400, // Expired 1 day ago
      });

      expect(isProofExpired(proof)).toBe(true);

      const result = verifyMembershipProof(
        proof,
        mockPlanId,
        keypair.publicKey.toBytes()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should handle proof with very far future expiry", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof(keypair, mockPlanId, {
        validUntil: now + 365 * 24 * 60 * 60, // 1 year from now
      });

      // Far future expiry is technically valid (though suspicious)
      expect(isProofExpired(proof)).toBe(false);
    });

    it("should handle proof with timestamp in the past", () => {
      const now = Math.floor(Date.now() / 1000);
      const proof = createMockProof(keypair, mockPlanId, {
        proofTimestamp: now - 7200, // 2 hours ago
        validUntil: now + 1800, // Still valid for 30 more minutes
      });

      // Old timestamp with valid expiry is still valid
      expect(isProofExpired(proof)).toBe(false);
    });
  });

  describe("Boundary Conditions", () => {
    it("should handle empty membership commitment", () => {
      const proof = createMockProof(keypair, mockPlanId);
      proof.membershipCommitment = new Uint8Array(32);

      // Empty commitment should be detected as tampered
      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });

    it("should handle zero-filled signature", () => {
      const proof = createMockProof(keypair, mockPlanId);
      proof.signature = new Uint8Array(64);

      const isValid = verifyProofSignature(proof, keypair.publicKey.toBytes());
      expect(isValid).toBe(false);
    });

    it("should handle zero validUntil", () => {
      const proof = createMockProof(keypair, mockPlanId, {
        validUntil: 0,
      });

      expect(isProofExpired(proof)).toBe(true);
    });

    it("should handle max integer validUntil", () => {
      const proof = createMockProof(keypair, mockPlanId, {
        validUntil: Number.MAX_SAFE_INTEGER,
      });

      expect(isProofExpired(proof)).toBe(false);
    });
  });
});
