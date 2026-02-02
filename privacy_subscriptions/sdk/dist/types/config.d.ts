import { PublicKey } from '@solana/web3.js';
/**
 * Arcium MPC configuration
 */
export interface ArciumConfig {
    /** Arcium MXE account public key */
    mxeAccount: PublicKey | string;
    /** Arcium cluster public key */
    clusterAccount: PublicKey | string;
}
/**
 * Subly SDK configuration
 */
export interface SublyConfig {
    /** Solana RPC endpoint URL */
    rpcEndpoint: string;
    /** Merchant wallet public key */
    merchantWallet: PublicKey | string;
    /** Program ID (optional, defaults to deployed address) */
    programId?: PublicKey | string;
    /** Arcium cluster offset (required for mempool/computation PDAs) */
    arciumClusterOffset?: number;
    /** Arcium configuration (optional, defaults to devnet settings) */
    arciumConfig?: ArciumConfig;
    /** Commitment level for transactions */
    commitment?: 'processed' | 'confirmed' | 'finalized';
}
//# sourceMappingURL=config.d.ts.map