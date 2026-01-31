import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
/** Default program ID for Privacy Subscriptions */
export declare const PROGRAM_ID: PublicKey;
/** PDA Seeds */
export declare const PROTOCOL_CONFIG_SEED: Buffer<ArrayBuffer>;
export declare const PROTOCOL_POOL_SEED: Buffer<ArrayBuffer>;
export declare const MERCHANT_SEED: Buffer<ArrayBuffer>;
export declare const MERCHANT_LEDGER_SEED: Buffer<ArrayBuffer>;
export declare const SUBSCRIPTION_PLAN_SEED: Buffer<ArrayBuffer>;
export declare const USER_LEDGER_SEED: Buffer<ArrayBuffer>;
export declare const USER_SUBSCRIPTION_SEED: Buffer<ArrayBuffer>;
/**
 * Derives the Protocol Config PDA
 * Seeds: ["protocol_config"]
 */
export declare function deriveProtocolConfigPDA(programId?: PublicKey): [PublicKey, number];
/**
 * Derives the Protocol Pool PDA for a specific mint
 * Seeds: ["protocol_pool", mint]
 */
export declare function deriveProtocolPoolPDA(mint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derives the Merchant PDA for a wallet
 * Seeds: ["merchant", wallet]
 */
export declare function deriveMerchantPDA(wallet: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derives the Merchant Ledger PDA
 * Seeds: ["merchant_ledger", merchant, mint]
 */
export declare function deriveMerchantLedgerPDA(merchant: PublicKey, mint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derives the Subscription Plan PDA
 * Seeds: ["subscription_plan", merchant, plan_id.to_le_bytes()]
 */
export declare function deriveSubscriptionPlanPDA(merchant: PublicKey, planId: BN | number, programId?: PublicKey): [PublicKey, number];
/**
 * Derives the User Ledger PDA
 * Seeds: ["user_ledger", user, mint]
 */
export declare function deriveUserLedgerPDA(user: PublicKey, mint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derives the User Subscription PDA
 * Seeds: ["user_subscription", user, subscription_index.to_le_bytes()]
 */
export declare function deriveUserSubscriptionPDA(user: PublicKey, subscriptionIndex: BN | number, programId?: PublicKey): [PublicKey, number];
//# sourceMappingURL=pda.d.ts.map