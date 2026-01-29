import { describe, it, expect, beforeAll } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  deriveBusinessPda,
  derivePlanPda,
  deriveSubscriptionPda,
  getBusinessPdaForAuthority,
} from "../src/utils/pda";
import {
  generateNonce,
  generateUserCommitment,
  generateMembershipCommitment,
  generateUserSecret,
  encryptPlanData,
  decryptPlanData,
  bigIntToBytes,
} from "../src/utils/encryption";
import {
  usdcToOnChain,
  usdcFromOnChain,
  daysToSeconds,
  secondsToDays,
  formatUsdc,
  formatBillingCycle,
  timestampToDate,
  dateToTimestamp,
} from "../src/utils/format";
import { CONSTANTS } from "../src/types/common";

// Test program ID (matches deployed program)
const PROGRAM_ID = new PublicKey("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");

describe("PDA Derivation", () => {
  let authority: Keypair;
  let businessPda: PublicKey;

  beforeAll(() => {
    authority = Keypair.generate();
    [businessPda] = deriveBusinessPda(authority.publicKey, PROGRAM_ID);
  });

  it("should derive business PDA deterministically", () => {
    const [pda1, bump1] = deriveBusinessPda(authority.publicKey, PROGRAM_ID);
    const [pda2, bump2] = deriveBusinessPda(authority.publicKey, PROGRAM_ID);

    expect(pda1.toBase58()).toBe(pda2.toBase58());
    expect(bump1).toBe(bump2);
  });

  it("should derive different business PDAs for different authorities", () => {
    const authority2 = Keypair.generate();
    const [pda1] = deriveBusinessPda(authority.publicKey, PROGRAM_ID);
    const [pda2] = deriveBusinessPda(authority2.publicKey, PROGRAM_ID);

    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("should derive plan PDA deterministically", () => {
    const [pda1, bump1] = derivePlanPda(businessPda, BigInt(0), PROGRAM_ID);
    const [pda2, bump2] = derivePlanPda(businessPda, BigInt(0), PROGRAM_ID);

    expect(pda1.toBase58()).toBe(pda2.toBase58());
    expect(bump1).toBe(bump2);
  });

  it("should derive different plan PDAs for different nonces", () => {
    const [pda1] = derivePlanPda(businessPda, BigInt(0), PROGRAM_ID);
    const [pda2] = derivePlanPda(businessPda, BigInt(1), PROGRAM_ID);

    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("should derive plan PDA with number or bigint nonce", () => {
    const [pda1] = derivePlanPda(businessPda, 5, PROGRAM_ID);
    const [pda2] = derivePlanPda(businessPda, BigInt(5), PROGRAM_ID);

    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("should derive subscription PDA deterministically", () => {
    const membershipCommitment = new Uint8Array(32).fill(1);
    const planPda = Keypair.generate().publicKey;

    const [pda1, bump1] = deriveSubscriptionPda(planPda, membershipCommitment, PROGRAM_ID);
    const [pda2, bump2] = deriveSubscriptionPda(planPda, membershipCommitment, PROGRAM_ID);

    expect(pda1.toBase58()).toBe(pda2.toBase58());
    expect(bump1).toBe(bump2);
  });

  it("should derive different subscription PDAs for different commitments", () => {
    const commitment1 = new Uint8Array(32).fill(1);
    const commitment2 = new Uint8Array(32).fill(2);
    const planPda = Keypair.generate().publicKey;

    const [pda1] = deriveSubscriptionPda(planPda, commitment1, PROGRAM_ID);
    const [pda2] = deriveSubscriptionPda(planPda, commitment2, PROGRAM_ID);

    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("should get business PDA for authority", () => {
    const pda = getBusinessPdaForAuthority(authority.publicKey, PROGRAM_ID);
    const [expectedPda] = deriveBusinessPda(authority.publicKey, PROGRAM_ID);

    expect(pda.toBase58()).toBe(expectedPda.toBase58());
  });
});

describe("Encryption Utilities", () => {
  describe("generateNonce", () => {
    it("should generate a valid nonce", () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe("bigint");
      expect(nonce).toBeGreaterThan(0n);
    });

    it("should generate different nonces each time", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe("generateUserSecret", () => {
    it("should generate 32-byte secret", () => {
      const secret = generateUserSecret();
      expect(secret.length).toBe(32);
    });

    it("should generate different secrets each time", () => {
      const secret1 = generateUserSecret();
      const secret2 = generateUserSecret();
      expect(Buffer.from(secret1).toString("hex")).not.toBe(
        Buffer.from(secret2).toString("hex")
      );
    });
  });

  describe("generateUserCommitment", () => {
    it("should generate 32-byte commitment", async () => {
      const secret = new Uint8Array(32).fill(1);
      const identifier = new Uint8Array(32).fill(2);

      const commitment = await generateUserCommitment(secret, identifier);

      expect(commitment.length).toBe(32);
    });

    it("should generate deterministic commitment for same inputs", async () => {
      const secret = new Uint8Array(32).fill(1);
      const identifier = new Uint8Array(32).fill(2);

      const commitment1 = await generateUserCommitment(secret, identifier);
      const commitment2 = await generateUserCommitment(secret, identifier);

      expect(Buffer.from(commitment1).toString("hex")).toBe(
        Buffer.from(commitment2).toString("hex")
      );
    });

    it("should generate different commitments for different secrets", async () => {
      const secret1 = new Uint8Array(32).fill(1);
      const secret2 = new Uint8Array(32).fill(3);
      const identifier = new Uint8Array(32).fill(2);

      const commitment1 = await generateUserCommitment(secret1, identifier);
      const commitment2 = await generateUserCommitment(secret2, identifier);

      expect(Buffer.from(commitment1).toString("hex")).not.toBe(
        Buffer.from(commitment2).toString("hex")
      );
    });
  });

  describe("generateMembershipCommitment", () => {
    it("should generate 32-byte membership commitment", async () => {
      const userCommitment = new Uint8Array(32).fill(1);
      const planPubkey = new Uint8Array(32).fill(2);

      const membership = await generateMembershipCommitment(userCommitment, planPubkey);

      expect(membership.length).toBe(32);
    });

    it("should be deterministic", async () => {
      const userCommitment = new Uint8Array(32).fill(1);
      const planPubkey = new Uint8Array(32).fill(2);

      const membership1 = await generateMembershipCommitment(userCommitment, planPubkey);
      const membership2 = await generateMembershipCommitment(userCommitment, planPubkey);

      expect(Buffer.from(membership1).toString("hex")).toBe(
        Buffer.from(membership2).toString("hex")
      );
    });
  });

  describe("encryptPlanData / decryptPlanData", () => {
    it("should encrypt and decrypt plan data", () => {
      const original = "Premium Plan";
      const encrypted = encryptPlanData(original, 32);
      const decrypted = decryptPlanData(encrypted);

      expect(decrypted).toBe(original);
    });

    it("should pad encrypted data to max length", () => {
      const original = "Test";
      const encrypted = encryptPlanData(original, 32);

      expect(encrypted.length).toBe(32);
    });

    it("should truncate data exceeding max length", () => {
      const original = "This is a very long string that exceeds the max length";
      const encrypted = encryptPlanData(original, 16);

      expect(encrypted.length).toBe(16);
    });

    it("should handle empty string", () => {
      const encrypted = encryptPlanData("", 32);
      const decrypted = decryptPlanData(encrypted);

      expect(decrypted).toBe("");
    });

    it("should handle unicode characters", () => {
      const original = "Premium";
      const encrypted = encryptPlanData(original, 64);
      const decrypted = decryptPlanData(encrypted);

      expect(decrypted).toBe(original);
    });
  });

  describe("bigIntToBytes", () => {
    it("should convert bigint to bytes (little-endian)", () => {
      const bytes = bigIntToBytes(BigInt(0x0102), 8);

      expect(bytes[0]).toBe(0x02);
      expect(bytes[1]).toBe(0x01);
    });

    it("should pad to specified length", () => {
      const bytes = bigIntToBytes(BigInt(1), 8);

      expect(bytes.length).toBe(8);
      expect(bytes[0]).toBe(1);
      expect(bytes[7]).toBe(0);
    });
  });
});

describe("Format Utilities", () => {
  describe("usdcToOnChain / usdcFromOnChain", () => {
    it("should convert USDC to on-chain format", () => {
      expect(usdcToOnChain(1)).toBe(BigInt(1_000_000));
      expect(usdcToOnChain(9.99)).toBe(BigInt(9_990_000));
      expect(usdcToOnChain(0.01)).toBe(BigInt(10_000));
    });

    it("should convert on-chain format to USDC", () => {
      expect(usdcFromOnChain(1_000_000)).toBe(1);
      expect(usdcFromOnChain(BigInt(9_990_000))).toBe(9.99);
      expect(usdcFromOnChain(10_000)).toBe(0.01);
    });

    it("should round-trip correctly", () => {
      const original = 19.99;
      const onChain = usdcToOnChain(original);
      const result = usdcFromOnChain(onChain);

      expect(result).toBe(original);
    });
  });

  describe("daysToSeconds / secondsToDays", () => {
    it("should convert days to seconds", () => {
      expect(daysToSeconds(1)).toBe(86400);
      expect(daysToSeconds(30)).toBe(2592000);
      expect(daysToSeconds(365)).toBe(31536000);
    });

    it("should convert seconds to days", () => {
      expect(secondsToDays(86400)).toBe(1);
      expect(secondsToDays(2592000)).toBe(30);
      expect(secondsToDays(31536000)).toBe(365);
    });

    it("should round-trip correctly", () => {
      const original = 30;
      const seconds = daysToSeconds(original);
      const result = secondsToDays(seconds);

      expect(result).toBe(original);
    });
  });

  describe("formatUsdc", () => {
    it("should format USDC amount", () => {
      expect(formatUsdc(1_000_000)).toBe("$1.00");
      expect(formatUsdc(BigInt(9_990_000))).toBe("$9.99");
      expect(formatUsdc(10_000)).toBe("$0.01");
    });
  });

  describe("formatBillingCycle", () => {
    it("should format days", () => {
      expect(formatBillingCycle(86400)).toBe("1 day");
      expect(formatBillingCycle(86400 * 5)).toBe("5 days");
    });

    it("should format weeks", () => {
      expect(formatBillingCycle(86400 * 7)).toBe("1 week");
      expect(formatBillingCycle(86400 * 14)).toBe("2 weeks");
    });

    it("should format months", () => {
      expect(formatBillingCycle(86400 * 30)).toBe("1 month");
      expect(formatBillingCycle(86400 * 60)).toBe("2 months");
    });

    it("should format years", () => {
      expect(formatBillingCycle(86400 * 365)).toBe("1 year");
      expect(formatBillingCycle(86400 * 730)).toBe("2 years");
    });
  });

  describe("timestampToDate / dateToTimestamp", () => {
    it("should convert timestamp to date", () => {
      const timestamp = BigInt(1704067200); // 2024-01-01 00:00:00 UTC
      const date = timestampToDate(timestamp);

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
    });

    it("should convert date to timestamp", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const timestamp = dateToTimestamp(date);

      expect(timestamp).toBe(BigInt(1704067200));
    });

    it("should round-trip correctly", () => {
      const original = new Date("2024-06-15T12:30:00Z");
      const timestamp = dateToTimestamp(original);
      const result = timestampToDate(timestamp);

      expect(result.getTime()).toBe(original.getTime());
    });
  });
});

describe("Constants", () => {
  it("should have correct max name length", () => {
    expect(CONSTANTS.MAX_NAME_LENGTH).toBe(32);
  });

  it("should have correct max metadata URI length", () => {
    expect(CONSTANTS.MAX_METADATA_URI_LENGTH).toBe(128);
  });

  it("should have correct USDC decimals", () => {
    expect(CONSTANTS.USDC_DECIMALS).toBe(6);
  });

  it("should have correct billing cycle bounds", () => {
    expect(CONSTANTS.MIN_BILLING_CYCLE_SECONDS).toBe(3600); // 1 hour
    expect(CONSTANTS.MAX_BILLING_CYCLE_SECONDS).toBe(31536000); // 365 days
  });

  it("should have PDA seeds defined", () => {
    expect(CONSTANTS.SEEDS.BUSINESS).toBe("business");
    expect(CONSTANTS.SEEDS.PLAN).toBe("plan");
    expect(CONSTANTS.SEEDS.SUBSCRIPTION).toBe("subscription");
  });
});
