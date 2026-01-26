export class SublyError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'SublyError';
  }
}

export class WalletNotConnectedError extends SublyError {
  constructor() {
    super('Wallet not connected', 'WALLET_NOT_CONNECTED');
    this.name = 'WalletNotConnectedError';
  }
}

export class InsufficientBalanceError extends SublyError {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance: required ${required / 1_000_000} USDC, available ${available / 1_000_000} USDC`,
      'INSUFFICIENT_BALANCE'
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class TransactionFailedError extends SublyError {
  constructor(signature: string, reason?: string) {
    super(
      `Transaction failed: ${signature}${reason ? ` - ${reason}` : ''}`,
      'TRANSACTION_FAILED'
    );
    this.name = 'TransactionFailedError';
  }
}

export class PlanNotFoundError extends SublyError {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`, 'PLAN_NOT_FOUND');
    this.name = 'PlanNotFoundError';
  }
}

export class SubscriptionNotFoundError extends SublyError {
  constructor(subscriptionId: string) {
    super(`Subscription not found: ${subscriptionId}`, 'SUBSCRIPTION_NOT_FOUND');
    this.name = 'SubscriptionNotFoundError';
  }
}

export class AlreadySubscribedError extends SublyError {
  constructor(planId: string) {
    super(`Already subscribed to plan: ${planId}`, 'ALREADY_SUBSCRIBED');
    this.name = 'AlreadySubscribedError';
  }
}
