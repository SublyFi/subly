/**
 * Tuk Tuk Integration Module
 *
 * Provides wrapper functions for Helium's Tuk Tuk automation engine
 * to enable scheduled/recurring transfer execution on Solana mainnet.
 *
 * Tuk Tuk is the replacement for the deprecated Clockwork protocol
 * (which shut down on October 31, 2023).
 *
 * Note: Tuk Tuk is currently under audit (as of Jan 2026).
 * Manual execution fallback is recommended for production use.
 *
 * Source: https://github.com/helium/tuktuk
 * Docs: https://www.tuktuk.fun/docs
 */

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

/**
 * Tuk Tuk program ID on mainnet
 */
export const TUKTUK_PROGRAM_ID = new PublicKey('tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA');

/**
 * Tuk Tuk Cron program ID on mainnet
 */
export const TUKTUK_CRON_PROGRAM_ID = new PublicKey('cronAjRZnJn3MTP3B9kE62NWDrjSuAPVXf9c4hu4grM');

/**
 * Cron job creation result
 */
export interface CronJobResult {
  cronJobPda: PublicKey;
  tx: string;
}

/**
 * Pending transfer information
 */
export interface PendingTransfer {
  transferId: string;
  transferPda: PublicKey;
  recipient: PublicKey;
  amount: number;
  nextExecution: Date;
  isOverdue: boolean;
}

/**
 * Tuk Tuk integration configuration
 */
export interface TukTukConfig {
  connection: Connection;
  payer: Keypair;
  authority: PublicKey;
}

/**
 * Tuk Tuk Integration Class
 *
 * Wraps the Tuk Tuk SDK to provide cron job management
 * for automated transfer execution.
 *
 * Note: The Tuk Tuk SDK API is still evolving. Cron job creation methods
 * are placeholder implementations. Manual execution is fully functional.
 */
export class TukTukIntegration {
  private connection: Connection;
  private payer: Keypair;
  private authority: PublicKey;
  private taskQueuePda: PublicKey | null = null;
  private cronProgram: any = null;

  constructor(config: TukTukConfig) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.authority = config.authority;
  }

  /**
   * Initialize the Tuk Tuk cron program client
   */
  async initialize(): Promise<void> {
    try {
      const { init } = await import('@helium/cron-sdk');
      const provider = new AnchorProvider(
        this.connection,
        { publicKey: this.payer.publicKey, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
        { commitment: 'confirmed' }
      );
      this.cronProgram = await init(provider, TUKTUK_CRON_PROGRAM_ID);
    } catch (error) {
      console.warn('Failed to initialize Tuk Tuk cron program:', error);
      // Continue without cron program - manual execution will still work
    }
  }

  /**
   * Initialize or get the task queue PDA
   */
  async getOrCreateTaskQueue(): Promise<PublicKey> {
    if (this.taskQueuePda) {
      return this.taskQueuePda;
    }

    // Import PDA helper
    const { userCronJobsKey } = await import('@helium/cron-sdk');
    const [taskQueuePda] = userCronJobsKey(this.authority, TUKTUK_CRON_PROGRAM_ID);

    this.taskQueuePda = taskQueuePda;
    return taskQueuePda;
  }

  /**
   * Create a cron job for automated transfer execution
   *
   * Note: This is a placeholder implementation. The Tuk Tuk SDK API
   * is evolving and cron job creation requires direct program interaction.
   * For production use, recommend manual execution mode.
   *
   * @param schedule Cron schedule string (e.g., "0 0 * * *" for daily)
   * @param targetInstruction The instruction to execute on schedule
   * @param jobName Unique name for the cron job
   * @returns Cron job creation result
   */
  async createCronJob(
    schedule: string,
    targetInstruction: TransactionInstruction,
    jobName: string
  ): Promise<CronJobResult> {
    if (!this.cronProgram) {
      await this.initialize();
    }

    try {
      const { cronJobKey, cronJobNameMappingKey } = await import('@helium/cron-sdk');

      // Get user's cron jobs account
      const userCronJobs = await this.getOrCreateTaskQueue();

      // Derive cron job PDA using the SDK helper
      // Note: cronJobKey requires authority and an ID (index)
      // For simplicity, we'll use a deterministic ID based on job name hash
      const jobId = this.hashJobName(jobName);
      const [cronJobPda] = cronJobKey(this.authority, jobId, TUKTUK_CRON_PROGRAM_ID);

      // Check if job name mapping exists
      const [nameMappingPda] = cronJobNameMappingKey(this.authority, jobName, TUKTUK_CRON_PROGRAM_ID);

      if (this.cronProgram) {
        // Use the program's methods to create cron job
        // Note: The exact method names depend on the Tuk Tuk IDL
        try {
          const tx = await this.cronProgram.methods
            .createCronJob({
              name: jobName,
              schedule,
              instruction: targetInstruction.data,
              accounts: targetInstruction.keys,
              programId: targetInstruction.programId,
            })
            .accounts({
              authority: this.authority,
              payer: this.payer.publicKey,
              cronJob: cronJobPda,
              userCronJobs,
              nameMappingPda,
            })
            .signers([this.payer])
            .rpc();

          return { cronJobPda, tx };
        } catch (err) {
          console.warn('Cron job creation via program failed:', err);
        }
      }

      // Fallback: Return placeholder result
      // Manual execution will be required
      console.warn('Cron job creation not available. Manual execution required.');
      return {
        cronJobPda,
        tx: '',
      };
    } catch (error) {
      throw new TukTukError(
        `Failed to create cron job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_CRON_JOB_FAILED'
      );
    }
  }

  /**
   * Fund a cron job with SOL for execution fees
   *
   * @param cronJobPda The cron job PDA
   * @param amount Amount in SOL to fund
   * @returns Transaction signature
   */
  async fundCronJob(cronJobPda: PublicKey, amount: number): Promise<{ tx: string }> {
    if (!this.cronProgram) {
      await this.initialize();
    }

    try {
      if (this.cronProgram) {
        // Try to use program method
        try {
          const tx = await this.cronProgram.methods
            .fundCronJob(amount * 1e9) // Convert SOL to lamports
            .accounts({
              payer: this.payer.publicKey,
              cronJob: cronJobPda,
            })
            .signers([this.payer])
            .rpc();

          return { tx };
        } catch (err) {
          console.warn('Cron job funding via program failed:', err);
        }
      }

      // Fallback: Direct SOL transfer to cron job account
      const { SystemProgram } = await import('@solana/web3.js');
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.payer.publicKey,
          toPubkey: cronJobPda,
          lamports: Math.floor(amount * 1e9),
        })
      );

      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      return { tx: signature };
    } catch (error) {
      throw new TukTukError(
        `Failed to fund cron job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUND_CRON_JOB_FAILED'
      );
    }
  }

  /**
   * Close a cron job and recover remaining funds
   *
   * @param cronJobPda The cron job PDA
   * @returns Transaction signature
   */
  async closeCronJob(cronJobPda: PublicKey): Promise<{ tx: string }> {
    if (!this.cronProgram) {
      await this.initialize();
    }

    try {
      if (this.cronProgram) {
        // Try to use program method
        try {
          const tx = await this.cronProgram.methods
            .closeCronJob()
            .accounts({
              authority: this.authority,
              cronJob: cronJobPda,
              refundTo: this.payer.publicKey,
            })
            .signers([this.payer])
            .rpc();

          return { tx };
        } catch (err) {
          console.warn('Cron job closure via program failed:', err);
        }
      }

      // Fallback: Return empty result
      console.warn('Cron job closure not available via SDK.');
      return { tx: '' };
    } catch (error) {
      throw new TukTukError(
        `Failed to close cron job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLOSE_CRON_JOB_FAILED'
      );
    }
  }

  /**
   * Check for pending transfers that are due for execution
   * This is the manual execution fallback when Tuk Tuk automation is not used
   *
   * @param scheduledTransferPdas List of scheduled transfer PDAs to check
   * @returns List of pending transfers that are due
   */
  async checkPendingTransfers(scheduledTransferPdas: PublicKey[]): Promise<PendingTransfer[]> {
    const pendingTransfers: PendingTransfer[] = [];
    const currentTime = Date.now();

    for (const pda of scheduledTransferPdas) {
      try {
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) continue;

        // Parse the scheduled transfer account data
        // Skip discriminator (8 bytes)
        const data = accountInfo.data;
        const dataView = new DataView(data.buffer, data.byteOffset);

        // Parse fields (based on ScheduledTransfer struct layout)
        // transfer_id: 32 bytes (offset 8)
        // user_commitment: 32 bytes (offset 40)
        // recipient: 32 bytes (offset 72)
        const recipientBytes = data.slice(72, 104);
        const recipient = new PublicKey(recipientBytes);

        // amount: u64 (offset 104)
        const amount = Number(dataView.getBigUint64(104, true));

        // interval_seconds: u32 (offset 112)
        // next_execution: i64 (offset 116)
        const nextExecution = Number(dataView.getBigInt64(116, true)) * 1000; // Convert to ms

        // is_active: bool (offset 124)
        const isActive = data[124] === 1;

        if (!isActive) continue;

        const isOverdue = currentTime >= nextExecution;

        pendingTransfers.push({
          transferId: pda.toBase58(),
          transferPda: pda,
          recipient,
          amount: amount / 1e6, // Convert from base units to USDC
          nextExecution: new Date(nextExecution),
          isOverdue,
        });
      } catch (error) {
        console.warn(`Failed to check transfer ${pda.toBase58()}:`, error);
      }
    }

    // Sort by next execution time
    pendingTransfers.sort((a, b) => a.nextExecution.getTime() - b.nextExecution.getTime());

    return pendingTransfers;
  }

  /**
   * Manually execute a pending transfer
   * This is the fallback when Tuk Tuk automation is not active
   *
   * @param transferId Transfer ID (PDA address as string)
   * @param executeTransferIx The execute_transfer instruction to call
   * @returns Transaction signature
   */
  async executePendingTransfer(
    transferId: string,
    executeTransferIx: TransactionInstruction
  ): Promise<{ tx: string }> {
    try {
      const tx = new Transaction().add(executeTransferIx);
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);

      return { tx: signature };
    } catch (error) {
      throw new TukTukError(
        `Failed to execute transfer ${transferId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXECUTE_TRANSFER_FAILED'
      );
    }
  }

  /**
   * Hash a job name to a deterministic ID
   */
  private hashJobName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 65536; // Keep in u16 range
  }
}

/**
 * Tuk Tuk specific error class
 */
export class TukTukError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(`Tuk Tuk Error [${code}]: ${message}`);
    this.name = 'TukTukError';
  }
}

/**
 * Create a Tuk Tuk integration instance
 *
 * @param config Configuration options
 * @returns Tuk Tuk integration (not initialized - call initialize() for cron features)
 */
export function createTukTukIntegration(config: TukTukConfig): TukTukIntegration {
  return new TukTukIntegration(config);
}

/**
 * Convert payment interval to cron schedule string
 *
 * @param intervalSeconds Interval in seconds
 * @returns Cron schedule string
 */
export function intervalToCronSchedule(intervalSeconds: number): string {
  if (intervalSeconds < 60) {
    // Every N seconds (not standard cron, but Tuk Tuk may support it)
    return `*/${intervalSeconds} * * * * *`;
  }

  const minutes = Math.floor(intervalSeconds / 60);
  if (minutes < 60) {
    return `*/${minutes} * * * *`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `0 */${hours} * * *`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return '0 0 * * *'; // Daily at midnight
  }

  if (days === 7) {
    return '0 0 * * 0'; // Weekly on Sunday
  }

  if (days >= 28 && days <= 31) {
    return '0 0 1 * *'; // Monthly on the 1st
  }

  // Default to daily
  return '0 0 * * *';
}
