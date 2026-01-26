// src/integrations/tuktuk.ts
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
var TUKTUK_PROGRAM_ID = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");
var TUKTUK_CRON_PROGRAM_ID = new PublicKey("cronAjRZnJn3MTP3B9kE62NWDrjSuAPVXf9c4hu4grM");
var TukTukIntegration = class {
  connection;
  payer;
  authority;
  taskQueuePda = null;
  cronProgram = null;
  constructor(config) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.authority = config.authority;
  }
  /**
   * Initialize the Tuk Tuk cron program client
   */
  async initialize() {
    try {
      const { init } = await import("@helium/cron-sdk");
      const provider = new AnchorProvider(
        this.connection,
        { publicKey: this.payer.publicKey, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
        { commitment: "confirmed" }
      );
      this.cronProgram = await init(provider, TUKTUK_CRON_PROGRAM_ID);
    } catch (error) {
      console.warn("Failed to initialize Tuk Tuk cron program:", error);
    }
  }
  /**
   * Initialize or get the task queue PDA
   */
  async getOrCreateTaskQueue() {
    if (this.taskQueuePda) {
      return this.taskQueuePda;
    }
    const { userCronJobsKey } = await import("@helium/cron-sdk");
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
  async createCronJob(schedule, targetInstruction, jobName) {
    if (!this.cronProgram) {
      await this.initialize();
    }
    try {
      const { cronJobKey, cronJobNameMappingKey } = await import("@helium/cron-sdk");
      const userCronJobs = await this.getOrCreateTaskQueue();
      const jobId = this.hashJobName(jobName);
      const [cronJobPda] = cronJobKey(this.authority, jobId, TUKTUK_CRON_PROGRAM_ID);
      const [nameMappingPda] = cronJobNameMappingKey(this.authority, jobName, TUKTUK_CRON_PROGRAM_ID);
      if (this.cronProgram) {
        try {
          const tx = await this.cronProgram.methods.createCronJob({
            name: jobName,
            schedule,
            instruction: targetInstruction.data,
            accounts: targetInstruction.keys,
            programId: targetInstruction.programId
          }).accounts({
            authority: this.authority,
            payer: this.payer.publicKey,
            cronJob: cronJobPda,
            userCronJobs,
            nameMappingPda
          }).signers([this.payer]).rpc();
          return { cronJobPda, tx };
        } catch (err) {
          console.warn("Cron job creation via program failed:", err);
        }
      }
      console.warn("Cron job creation not available. Manual execution required.");
      return {
        cronJobPda,
        tx: ""
      };
    } catch (error) {
      throw new TukTukError(
        `Failed to create cron job: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CREATE_CRON_JOB_FAILED"
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
  async fundCronJob(cronJobPda, amount) {
    if (!this.cronProgram) {
      await this.initialize();
    }
    try {
      if (this.cronProgram) {
        try {
          const tx2 = await this.cronProgram.methods.fundCronJob(amount * 1e9).accounts({
            payer: this.payer.publicKey,
            cronJob: cronJobPda
          }).signers([this.payer]).rpc();
          return { tx: tx2 };
        } catch (err) {
          console.warn("Cron job funding via program failed:", err);
        }
      }
      const { SystemProgram } = await import("@solana/web3.js");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.payer.publicKey,
          toPubkey: cronJobPda,
          lamports: Math.floor(amount * 1e9)
        })
      );
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      return { tx: signature };
    } catch (error) {
      throw new TukTukError(
        `Failed to fund cron job: ${error instanceof Error ? error.message : "Unknown error"}`,
        "FUND_CRON_JOB_FAILED"
      );
    }
  }
  /**
   * Close a cron job and recover remaining funds
   *
   * @param cronJobPda The cron job PDA
   * @returns Transaction signature
   */
  async closeCronJob(cronJobPda) {
    if (!this.cronProgram) {
      await this.initialize();
    }
    try {
      if (this.cronProgram) {
        try {
          const tx = await this.cronProgram.methods.closeCronJob().accounts({
            authority: this.authority,
            cronJob: cronJobPda,
            refundTo: this.payer.publicKey
          }).signers([this.payer]).rpc();
          return { tx };
        } catch (err) {
          console.warn("Cron job closure via program failed:", err);
        }
      }
      console.warn("Cron job closure not available via SDK.");
      return { tx: "" };
    } catch (error) {
      throw new TukTukError(
        `Failed to close cron job: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CLOSE_CRON_JOB_FAILED"
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
  async checkPendingTransfers(scheduledTransferPdas) {
    const pendingTransfers = [];
    const currentTime = Date.now();
    for (const pda of scheduledTransferPdas) {
      try {
        const accountInfo = await this.connection.getAccountInfo(pda);
        if (!accountInfo) continue;
        const data = accountInfo.data;
        const dataView = new DataView(data.buffer, data.byteOffset);
        const recipientBytes = data.slice(72, 104);
        const recipient = new PublicKey(recipientBytes);
        const amount = Number(dataView.getBigUint64(104, true));
        const nextExecution = Number(dataView.getBigInt64(116, true)) * 1e3;
        const isActive = data[124] === 1;
        if (!isActive) continue;
        const isOverdue = currentTime >= nextExecution;
        pendingTransfers.push({
          transferId: pda.toBase58(),
          transferPda: pda,
          recipient,
          amount: amount / 1e6,
          // Convert from base units to USDC
          nextExecution: new Date(nextExecution),
          isOverdue
        });
      } catch (error) {
        console.warn(`Failed to check transfer ${pda.toBase58()}:`, error);
      }
    }
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
  async executePendingTransfer(transferId, executeTransferIx) {
    try {
      const tx = new Transaction().add(executeTransferIx);
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      return { tx: signature };
    } catch (error) {
      throw new TukTukError(
        `Failed to execute transfer ${transferId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "EXECUTE_TRANSFER_FAILED"
      );
    }
  }
  /**
   * Hash a job name to a deterministic ID
   */
  hashJobName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 65536;
  }
};
var TukTukError = class extends Error {
  constructor(message, code) {
    super(`Tuk Tuk Error [${code}]: ${message}`);
    this.code = code;
    this.name = "TukTukError";
  }
};
function createTukTukIntegration(config) {
  return new TukTukIntegration(config);
}
function intervalToCronSchedule(intervalSeconds) {
  if (intervalSeconds < 60) {
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
    return "0 0 * * *";
  }
  if (days === 7) {
    return "0 0 * * 0";
  }
  if (days >= 28 && days <= 31) {
    return "0 0 1 * *";
  }
  return "0 0 * * *";
}

export {
  TUKTUK_PROGRAM_ID,
  TUKTUK_CRON_PROGRAM_ID,
  TukTukIntegration,
  TukTukError,
  createTukTukIntegration,
  intervalToCronSchedule
};
