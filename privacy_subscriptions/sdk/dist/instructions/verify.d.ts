import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
/**
 * Parameters for building a verify subscription instruction
 */
export interface BuildVerifySubscriptionParams {
    /** Payer for the transaction (can be anyone) */
    payer: PublicKey;
    /** User wallet whose subscription is being verified */
    user: PublicKey;
    /** User's subscription index */
    subscriptionIndex: BN | number;
    /** Computation offset for Arcium */
    computationOffset: BN;
    /** Arcium cluster offset */
    clusterOffset?: number;
    /** Program ID (optional) */
    programId?: PublicKey;
}
/**
 * Build the verify subscription instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Queues an Arcium computation to verify subscription status
 * 2. The callback will emit a SubscriptionVerified event
 */
export declare function buildVerifySubscriptionInstruction(params: BuildVerifySubscriptionParams): Promise<TransactionInstruction>;
//# sourceMappingURL=verify.d.ts.map