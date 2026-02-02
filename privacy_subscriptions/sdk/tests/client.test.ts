import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicKey, Connection } from '@solana/web3.js';
import { SublySDK } from '../src/client';
import { SublyError, SublyErrorCode } from '../src/errors';
import { SublyConfig } from '../src/types/config';

// Mock Connection
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getAccountInfo: vi.fn().mockResolvedValue(null),
      getProgramAccounts: vi.fn().mockResolvedValue([]),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 100,
      }),
      sendRawTransaction: vi.fn().mockResolvedValue('test-signature'),
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    })),
  };
});

describe('SublySDK', () => {
  const validConfig: SublyConfig = {
    rpcEndpoint: 'https://api.devnet.solana.com',
    merchantWallet: '11111111111111111111111111111112',
  };

  describe('constructor', () => {
    it('should create SDK instance with valid config', () => {
      const sdk = new SublySDK(validConfig);

      expect(sdk).toBeInstanceOf(SublySDK);
      expect(sdk.merchant.toBase58()).toBe(validConfig.merchantWallet);
    });

    it('should accept PublicKey for merchant wallet', () => {
      const config: SublyConfig = {
        ...validConfig,
        merchantWallet: new PublicKey('11111111111111111111111111111112'),
      };
      const sdk = new SublySDK(config);

      expect(sdk.merchant.toBase58()).toBe('11111111111111111111111111111112');
    });

    it('should use default program ID', () => {
      const sdk = new SublySDK(validConfig);

      expect(sdk.program.toBase58()).toBe('Hwmvq4rJ1P6bxHD5G6KvzteuXdMtMzpwZTT7AJb3wSa9');
    });

    it('should use custom program ID if provided', () => {
      const customProgramId = 'DYdc7w3bmh5KQmzznufNx72cbXf446LC5gTWi8DA8zC7';
      const config: SublyConfig = {
        ...validConfig,
        programId: customProgramId,
      };
      const sdk = new SublySDK(config);

      expect(sdk.program.toBase58()).toBe(customProgramId);
    });

    it('should throw error for missing RPC endpoint', () => {
      const config: SublyConfig = {
        rpcEndpoint: '',
        merchantWallet: validConfig.merchantWallet,
      };

      expect(() => new SublySDK(config)).toThrow(SublyError);
    });

    it('should throw error for missing merchant wallet', () => {
      const config = {
        rpcEndpoint: validConfig.rpcEndpoint,
        merchantWallet: '',
      } as SublyConfig;

      expect(() => new SublySDK(config)).toThrow(SublyError);
    });

    it('should throw error for invalid merchant wallet', () => {
      const config: SublyConfig = {
        rpcEndpoint: validConfig.rpcEndpoint,
        merchantWallet: 'invalid-public-key',
      };

      expect(() => new SublySDK(config)).toThrow(SublyError);
    });
  });

  describe('getPlans', () => {
    it('should return empty array when no plans exist', async () => {
      const sdk = new SublySDK(validConfig);
      const plans = await sdk.getPlans();

      expect(plans).toEqual([]);
    });

    it('should filter active plans when activeOnly is true', async () => {
      const sdk = new SublySDK(validConfig);
      const plans = await sdk.getPlans(true);

      expect(plans).toEqual([]);
    });
  });

  describe('getPlan', () => {
    it('should return null when plan does not exist', async () => {
      const sdk = new SublySDK(validConfig);
      const planPDA = new PublicKey('11111111111111111111111111111112');
      const plan = await sdk.getPlan(planPDA);

      expect(plan).toBeNull();
    });

    it('should accept string public key', async () => {
      const sdk = new SublySDK(validConfig);
      const plan = await sdk.getPlan('11111111111111111111111111111112');

      expect(plan).toBeNull();
    });
  });

  describe('checkSubscription', () => {
    it('should return NotSubscribed when no subscription exists', async () => {
      const sdk = new SublySDK(validConfig);
      const userWallet = new PublicKey('5oNDL3swdJJF1g9DzJiZ4ynHXgszjAEpUkxVYejchzrY');
      const planPDA = new PublicKey('7kqZcJZTNthPPF93SoK9Hj1r5uyXMvkEKXhqJVqjVqKP');

      const status = await sdk.checkSubscription(userWallet, planPDA);

      expect(status).toBe('not_subscribed');
    });

    it('should accept string public keys', async () => {
      const sdk = new SublySDK(validConfig);

      const status = await sdk.checkSubscription(
        '5oNDL3swdJJF1g9DzJiZ4ynHXgszjAEpUkxVYejchzrY',
        '7kqZcJZTNthPPF93SoK9Hj1r5uyXMvkEKXhqJVqjVqKP'
      );

      expect(status).toBe('not_subscribed');
    });
  });

  describe('getConnection', () => {
    it('should return Connection instance', () => {
      const sdk = new SublySDK(validConfig);
      const connection = sdk.getConnection();

      expect(connection).toBeDefined();
    });
  });
});
