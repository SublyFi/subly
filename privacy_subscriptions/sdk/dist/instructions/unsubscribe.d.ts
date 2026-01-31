import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { ArciumClientWrapper } from '../encryption/arcium';
/**
 * Parameters for building an unsubscribe instruction
 */
export interface BuildUnsubscribeParams {
    /** User wallet public key */
    user: PublicKey;
    /** User's subscription index */
    subscriptionIndex: BN | number;
    /** Computation offset for Arcium */
    computationOffset: BN;
    /** Arcium client wrapper */
    arciumClient: ArciumClientWrapper;
    /** Program ID (optional) */
    programId?: PublicKey;
}
/**
 * Build the unsubscribe instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Queues an Arcium computation to set subscription status to cancelled
 */
export declare function buildUnsubscribeInstruction(params: BuildUnsubscribeParams): Promise<TransactionInstruction>;
//# sourceMappingURL=unsubscribe.d.ts.map