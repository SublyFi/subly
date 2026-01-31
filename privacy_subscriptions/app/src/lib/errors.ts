/**
 * Custom error classes for Merchant Dashboard
 */

/**
 * Error thrown when merchant is not registered
 */
export class MerchantNotRegisteredError extends Error {
  constructor() {
    super("Merchant not registered. Please register first.");
    this.name = "MerchantNotRegisteredError";
  }
}

/**
 * Error thrown when merchant has insufficient revenue to claim
 */
export class InsufficientRevenueError extends Error {
  available: number;
  requested: number;

  constructor(available: number, requested: number) {
    super(
      `Insufficient revenue. Available: ${available}, Requested: ${requested}`
    );
    this.name = "InsufficientRevenueError";
    this.available = available;
    this.requested = requested;
  }
}

/**
 * Error thrown when a subscription plan is not found
 */
export class PlanNotFoundError extends Error {
  planId: string;

  constructor(planId: string) {
    super(`Plan not found: ${planId}`);
    this.name = "PlanNotFoundError";
    this.planId = planId;
  }
}

/**
 * Error thrown when MPC computation fails
 */
export class MPCComputationError extends Error {
  constructor(message: string) {
    super(`MPC computation failed: ${message}`);
    this.name = "MPCComputationError";
  }
}

/**
 * Error thrown when MPC computation times out
 */
export class MPCTimeoutError extends Error {
  constructor() {
    super("MPC computation timed out. Please try again.");
    this.name = "MPCTimeoutError";
  }
}

/**
 * Error thrown when wallet is not connected
 */
export class WalletNotConnectedError extends Error {
  constructor() {
    super("Wallet not connected. Please connect your wallet first.");
    this.name = "WalletNotConnectedError";
  }
}

/**
 * Error thrown when transaction fails
 */
export class TransactionFailedError extends Error {
  signature?: string;

  constructor(message: string, signature?: string) {
    super(message);
    this.name = "TransactionFailedError";
    this.signature = signature;
  }
}

/**
 * Parse error from transaction or program error
 */
export function parseError(error: unknown): Error {
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes("timeout")) {
      return new MPCTimeoutError();
    }
    if (error.message.includes("insufficient")) {
      return new InsufficientRevenueError(0, 0);
    }
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("An unknown error occurred");
}
