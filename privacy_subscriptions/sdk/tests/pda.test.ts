import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  PROGRAM_ID,
  deriveProtocolConfigPDA,
  deriveProtocolPoolPDA,
  deriveMerchantPDA,
  deriveMerchantLedgerPDA,
  deriveSubscriptionPlanPDA,
  deriveUserLedgerPDA,
  deriveUserSubscriptionPDA,
} from '../src/accounts/pda';

describe('PDA Derivation', () => {
  const testWallet = new PublicKey('11111111111111111111111111111112');
  const testMint = new PublicKey('So11111111111111111111111111111111111111112');

  describe('deriveProtocolConfigPDA', () => {
    it('should derive a valid PDA', () => {
      const [pda, bump] = deriveProtocolConfigPDA();

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    it('should return the same PDA for the same program', () => {
      const [pda1] = deriveProtocolConfigPDA();
      const [pda2] = deriveProtocolConfigPDA();

      expect(pda1.equals(pda2)).toBe(true);
    });

    it('should return different PDA for different program', () => {
      const customProgramId = new PublicKey('DYdc7w3bmh5KQmzznufNx72cbXf446LC5gTWi8DA8zC7');
      const [pda1] = deriveProtocolConfigPDA();
      const [pda2] = deriveProtocolConfigPDA(customProgramId);

      expect(pda1.equals(pda2)).toBe(false);
    });
  });

  describe('deriveProtocolPoolPDA', () => {
    it('should derive a valid PDA for a mint', () => {
      const [pda, bump] = deriveProtocolPoolPDA(testMint);

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    it('should return different PDAs for different mints', () => {
      const mint2 = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const [pda1] = deriveProtocolPoolPDA(testMint);
      const [pda2] = deriveProtocolPoolPDA(mint2);

      expect(pda1.equals(pda2)).toBe(false);
    });
  });

  describe('deriveMerchantPDA', () => {
    it('should derive a valid PDA for a wallet', () => {
      const [pda, bump] = deriveMerchantPDA(testWallet);

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    it('should return different PDAs for different wallets', () => {
      const wallet2 = new PublicKey('5oNDL3swdJJF1g9DzJiZ4ynHXgszjAEpUkxVYejchzrY');
      const [pda1] = deriveMerchantPDA(testWallet);
      const [pda2] = deriveMerchantPDA(wallet2);

      expect(pda1.equals(pda2)).toBe(false);
    });
  });

  describe('deriveMerchantLedgerPDA', () => {
    it('should derive a valid PDA for merchant and mint', () => {
      const [merchantPDA] = deriveMerchantPDA(testWallet);
      const [pda, bump] = deriveMerchantLedgerPDA(merchantPDA, testMint);

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });
  });

  describe('deriveSubscriptionPlanPDA', () => {
    it('should derive a valid PDA for merchant and plan ID', () => {
      const [merchantPDA] = deriveMerchantPDA(testWallet);
      const planId = new BN(1);
      const [pda, bump] = deriveSubscriptionPlanPDA(merchantPDA, planId);

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    it('should accept number as plan ID', () => {
      const [merchantPDA] = deriveMerchantPDA(testWallet);
      const [pda1] = deriveSubscriptionPlanPDA(merchantPDA, new BN(1));
      const [pda2] = deriveSubscriptionPlanPDA(merchantPDA, 1);

      expect(pda1.equals(pda2)).toBe(true);
    });

    it('should return different PDAs for different plan IDs', () => {
      const [merchantPDA] = deriveMerchantPDA(testWallet);
      const [pda1] = deriveSubscriptionPlanPDA(merchantPDA, 1);
      const [pda2] = deriveSubscriptionPlanPDA(merchantPDA, 2);

      expect(pda1.equals(pda2)).toBe(false);
    });
  });

  describe('deriveUserLedgerPDA', () => {
    it('should derive a valid PDA for user and mint', () => {
      const [pda, bump] = deriveUserLedgerPDA(testWallet, testMint);

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });
  });

  describe('deriveUserSubscriptionPDA', () => {
    it('should derive a valid PDA for user and index', () => {
      const [pda, bump] = deriveUserSubscriptionPDA(testWallet, 0);

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    it('should return different PDAs for different indices', () => {
      const [pda1] = deriveUserSubscriptionPDA(testWallet, 0);
      const [pda2] = deriveUserSubscriptionPDA(testWallet, 1);

      expect(pda1.equals(pda2)).toBe(false);
    });

    it('should accept BN as index', () => {
      const [pda1] = deriveUserSubscriptionPDA(testWallet, new BN(5));
      const [pda2] = deriveUserSubscriptionPDA(testWallet, 5);

      expect(pda1.equals(pda2)).toBe(true);
    });
  });
});
