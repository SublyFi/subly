/**
 * Subly SDK error codes
 */
export enum SublyErrorCode {
  /** SDK not properly initialized */
  NotInitialized = 'NOT_INITIALIZED',
  /** Invalid configuration provided */
  InvalidConfig = 'INVALID_CONFIG',
  /** Subscription plan not found */
  PlanNotFound = 'PLAN_NOT_FOUND',
  /** User subscription not found */
  SubscriptionNotFound = 'SUBSCRIPTION_NOT_FOUND',
  /** Insufficient balance for operation */
  InsufficientBalance = 'INSUFFICIENT_BALANCE',
  /** Transaction failed to execute */
  TransactionFailed = 'TRANSACTION_FAILED',
  /** Arcium encryption/decryption error */
  ArciumError = 'ARCIUM_ERROR',
  /** Network connection error */
  NetworkError = 'NETWORK_ERROR',
  /** Invalid public key format */
  InvalidPublicKey = 'INVALID_PUBLIC_KEY',
  /** Account not found on chain */
  AccountNotFound = 'ACCOUNT_NOT_FOUND',
  /** Plan is not active */
  PlanNotActive = 'PLAN_NOT_ACTIVE',
  /** User already subscribed to this plan */
  AlreadySubscribed = 'ALREADY_SUBSCRIBED',
}

/**
 * Custom error class for Subly SDK
 */
export class SublyError extends Error {
  public readonly code: SublyErrorCode;
  public readonly cause?: Error;

  constructor(message: string, code: SublyErrorCode, cause?: Error) {
    super(message);
    this.name = 'SublyError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, SublyError.prototype);
  }

  /**
   * Create a SublyError from an unknown error
   */
  static fromError(error: unknown, code: SublyErrorCode): SublyError {
    if (error instanceof SublyError) {
      return error;
    }
    if (error instanceof Error) {
      return new SublyError(error.message, code, error);
    }
    return new SublyError(String(error), code);
  }
}
