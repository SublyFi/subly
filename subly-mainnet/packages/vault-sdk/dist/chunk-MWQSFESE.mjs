// src/integrations/tuktuk.ts
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
var TUKTUK_PROGRAM_ID = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");
var TUKTUK_CRON_PROGRAM_ID = new PublicKey("cronAjRZnJn3MTP3B9kE62NWDrjSuAPVXf9c4hu4grM");
var TukTukIntegration = class {
  connection;
  payer;
  authority;
  taskQueuePda = null;
  constructor(config) {
    this.connection = config.connection;
    this.payer = config.payer;
    this.authority = config.authority;
  }
  /**
   * Initialize or get the task queue PDA
   */
  async getOrCreateTaskQueue() {
    if (this.taskQueuePda) {
      return this.taskQueuePda;
    }
    const [taskQueuePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("task_queue"), this.authority.toBuffer(), Buffer.from("subly_vault")],
      TUKTUK_PROGRAM_ID
    );
    this.taskQueuePda = taskQueuePda;
    return taskQueuePda;
  }
  /**
   * Create a cron job for automated transfer execution
   *
   * @param schedule Cron schedule string (e.g., "0 0 * * *" for daily)
   * @param targetInstruction The instruction to execute on schedule
   * @param jobName Unique name for the cron job
   * @returns Cron job creation result
   */
  async createCronJob(schedule, targetInstruction, jobName) {
    try {
      const { createCronJob: createCronJobSdk, getCronJobForName } = await import("@helium/cron-sdk");
      const taskQueuePda = await this.getOrCreateTaskQueue();
      const [cronJobPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("cron_job"), taskQueuePda.toBuffer(), Buffer.from(jobName)],
        TUKTUK_CRON_PROGRAM_ID
      );
      try {
        const existingJob = await getCronJobForName(this.connection, taskQueuePda, jobName);
        if (existingJob) {
          return {
            cronJobPda,
            tx: ""
            // Job already exists
          };
        }
      } catch {
      }
      const createIx = await createCronJobSdk({
        payer: this.payer.publicKey,
        authority: this.authority,
        taskQueue: taskQueuePda,
        name: jobName,
        schedule,
        targetInstruction
      });
      const tx = new Transaction().add(createIx);
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      return {
        cronJobPda,
        tx: signature
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
    try {
      const { fundCronJob: fundCronJobSdk } = await import("@helium/cron-sdk");
      const fundIx = await fundCronJobSdk({
        payer: this.payer.publicKey,
        cronJob: cronJobPda,
        amount: amount * 1e9
        // Convert SOL to lamports
      });
      const tx = new Transaction().add(fundIx);
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
    try {
      const { closeCronJob: closeCronJobSdk } = await import("@helium/cron-sdk");
      const closeIx = await closeCronJobSdk({
        authority: this.authority,
        cronJob: cronJobPda,
        refundTo: this.payer.publicKey
      });
      const tx = new Transaction().add(closeIx);
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.payer]);
      return { tx: signature };
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
   * Get the status of a cron job
   *
   * @param cronJobPda The cron job PDA
   * @returns Cron job status or null if not found
   */
  async getCronJobStatus(cronJobPda) {
    try {
      const accountInfo = await this.connection.getAccountInfo(cronJobPda);
      if (!accountInfo) return null;
      const balance = accountInfo.lamports / 1e9;
      return {
        isActive: accountInfo.data.length > 0,
        balance,
        lastExecution: null,
        // Would need IDL parsing
        nextExecution: null
        // Would need IDL parsing
      };
    } catch {
      return null;
    }
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
  return `0 0 */${days} * *`;
}

export {
  TUKTUK_PROGRAM_ID,
  TUKTUK_CRON_PROGRAM_ID,
  TukTukIntegration,
  TukTukError,
  createTukTukIntegration,
  intervalToCronSchedule
};
