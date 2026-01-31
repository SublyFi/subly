import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { SubscriptionPlan } from '../types/plan';
import { ArciumClientWrapper } from '../encryption/arcium';
/**
 * Parameters for building a subscribe instruction
 */
export interface BuildSubscribeParams {
    /** User wallet public key */
    user: PublicKey;
    /** Subscription plan to subscribe to */
    plan: SubscriptionPlan;
    /** User's subscription index (incrementing counter for this user) */
    subscriptionIndex: BN | number;
    /** Computation offset for Arcium */
    computationOffset: BN;
    /** Arcium client wrapper */
    arciumClient: ArciumClientWrapper;
    /** Program ID (optional) */
    programId?: PublicKey;
}
/**
 * Build the subscribe instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Creates a UserSubscription PDA
 * 2. Queues an Arcium computation to:
 *    - Deduct price from user's encrypted balance
 *    - Add price to merchant's encrypted balance
 *    - Set subscription status to active
 */
export declare function buildSubscribeInstruction(params: BuildSubscribeParams): Promise<TransactionInstruction>;
//# sourceMappingURL=subscribe.d.ts.map