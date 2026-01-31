import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { SubscriptionStatus } from '../src/types/subscription';
import { SublyError, SublyErrorCode } from '../src/errors';

describe('Types', () => {
  describe('SubscriptionStatus', () => {
    it('should have correct enum values', () => {
      expect(SubscriptionStatus.NotSubscribed).toBe('not_subscribed');
      expect(SubscriptionStatus.Active).toBe('active');
      expect(SubscriptionStatus.Cancelled).toBe('cancelled');
      expect(SubscriptionStatus.Expired).toBe('expired');
    });
  });

  describe('SublyError', () => {
    it('should create error with message and code', () => {
      const error = new SublyError('Test error', SublyErrorCode.InvalidConfig);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(SublyErrorCode.InvalidConfig);
      expect(error.name).toBe('SublyError');
    });

    it('should preserve cause if provided', () => {
      const cause = new Error('Original error');
      const error = new SublyError('Wrapped error', SublyErrorCode.NetworkError, cause);

      expect(error.cause).toBe(cause);
    });

    it('should create from unknown error', () => {
      const originalError = new Error('Network failed');
      const sublyError = SublyError.fromError(originalError, SublyErrorCode.NetworkError);

      expect(sublyError).toBeInstanceOf(SublyError);
      expect(sublyError.message).toBe('Network failed');
      expect(sublyError.code).toBe(SublyErrorCode.NetworkError);
      expect(sublyError.cause).toBe(originalError);
    });

    it('should return same error if already SublyError', () => {
      const original = new SublyError('Already Subly', SublyErrorCode.PlanNotFound);
      const result = SublyError.fromError(original, SublyErrorCode.NetworkError);

      expect(result).toBe(original);
      expect(result.code).toBe(SublyErrorCode.PlanNotFound);
    });

    it('should handle string errors', () => {
      const error = SublyError.fromError('String error', SublyErrorCode.InvalidConfig);

      expect(error.message).toBe('String error');
      expect(error.code).toBe(SublyErrorCode.InvalidConfig);
    });
  });

  describe('SublyErrorCode', () => {
    it('should have all expected error codes', () => {
      expect(SublyErrorCode.NotInitialized).toBe('NOT_INITIALIZED');
      expect(SublyErrorCode.InvalidConfig).toBe('INVALID_CONFIG');
      expect(SublyErrorCode.PlanNotFound).toBe('PLAN_NOT_FOUND');
      expect(SublyErrorCode.SubscriptionNotFound).toBe('SUBSCRIPTION_NOT_FOUND');
      expect(SublyErrorCode.InsufficientBalance).toBe('INSUFFICIENT_BALANCE');
      expect(SublyErrorCode.TransactionFailed).toBe('TRANSACTION_FAILED');
      expect(SublyErrorCode.ArciumError).toBe('ARCIUM_ERROR');
      expect(SublyErrorCode.NetworkError).toBe('NETWORK_ERROR');
      expect(SublyErrorCode.InvalidPublicKey).toBe('INVALID_PUBLIC_KEY');
      expect(SublyErrorCode.AccountNotFound).toBe('ACCOUNT_NOT_FOUND');
      expect(SublyErrorCode.PlanNotActive).toBe('PLAN_NOT_ACTIVE');
      expect(SublyErrorCode.AlreadySubscribed).toBe('ALREADY_SUBSCRIBED');
    });
  });
});

describe('BN Compatibility', () => {
  it('should work with BN for plan IDs', () => {
    const planId = new BN(12345);
    expect(planId.toNumber()).toBe(12345);
    expect(planId.toString()).toBe('12345');
  });

  it('should convert BN to little-endian buffer', () => {
    const value = new BN(256);
    const buffer = value.toArrayLike(Buffer, 'le', 8);

    expect(buffer[0]).toBe(0);
    expect(buffer[1]).toBe(1);
    expect(buffer.length).toBe(8);
  });

  it('should handle large u64 values', () => {
    const maxU64 = new BN('18446744073709551615');
    const buffer = maxU64.toArrayLike(Buffer, 'le', 8);

    expect(buffer.length).toBe(8);
    expect(buffer.every(b => b === 255)).toBe(true);
  });
});

describe('PublicKey Compatibility', () => {
  it('should create PublicKey from base58 string', () => {
    const base58 = '11111111111111111111111111111112';
    const pubkey = new PublicKey(base58);

    expect(pubkey.toBase58()).toBe(base58);
  });

  it('should compare PublicKeys correctly', () => {
    const key1 = new PublicKey('11111111111111111111111111111112');
    const key2 = new PublicKey('11111111111111111111111111111112');
    const key3 = new PublicKey('5oNDL3swdJJF1g9DzJiZ4ynHXgszjAEpUkxVYejchzrY');

    expect(key1.equals(key2)).toBe(true);
    expect(key1.equals(key3)).toBe(false);
  });
});
