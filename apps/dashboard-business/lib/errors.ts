export class SublyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SublyError';
  }
}

export class WalletNotConnectedError extends SublyError {
  constructor() {
    super('ウォレットが接続されていません', 'WALLET_NOT_CONNECTED');
  }
}

export class BusinessNotFoundError extends SublyError {
  constructor() {
    super('事業者情報が見つかりません', 'BUSINESS_NOT_FOUND');
  }
}

export class PlanNotFoundError extends SublyError {
  constructor() {
    super('プランが見つかりません', 'PLAN_NOT_FOUND');
  }
}

export class PlanValidationError extends SublyError {
  constructor(message: string) {
    super(message, 'PLAN_VALIDATION_ERROR');
  }
}
