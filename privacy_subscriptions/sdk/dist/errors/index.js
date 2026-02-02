"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SublyError = exports.SublyErrorCode = void 0;
/**
 * Subly SDK error codes
 */
var SublyErrorCode;
(function (SublyErrorCode) {
    /** SDK not properly initialized */
    SublyErrorCode["NotInitialized"] = "NOT_INITIALIZED";
    /** Invalid configuration provided */
    SublyErrorCode["InvalidConfig"] = "INVALID_CONFIG";
    /** Subscription plan not found */
    SublyErrorCode["PlanNotFound"] = "PLAN_NOT_FOUND";
    /** User subscription not found */
    SublyErrorCode["SubscriptionNotFound"] = "SUBSCRIPTION_NOT_FOUND";
    /** Insufficient balance for operation */
    SublyErrorCode["InsufficientBalance"] = "INSUFFICIENT_BALANCE";
    /** Transaction failed to execute */
    SublyErrorCode["TransactionFailed"] = "TRANSACTION_FAILED";
    /** Arcium encryption/decryption error */
    SublyErrorCode["ArciumError"] = "ARCIUM_ERROR";
    /** Network connection error */
    SublyErrorCode["NetworkError"] = "NETWORK_ERROR";
    /** Invalid public key format */
    SublyErrorCode["InvalidPublicKey"] = "INVALID_PUBLIC_KEY";
    /** Account not found on chain */
    SublyErrorCode["AccountNotFound"] = "ACCOUNT_NOT_FOUND";
    /** Plan is not active */
    SublyErrorCode["PlanNotActive"] = "PLAN_NOT_ACTIVE";
    /** User already subscribed to this plan */
    SublyErrorCode["AlreadySubscribed"] = "ALREADY_SUBSCRIBED";
    /** Wallet does not support signMessage */
    SublyErrorCode["WalletNotSupported"] = "WALLET_NOT_SUPPORTED";
})(SublyErrorCode || (exports.SublyErrorCode = SublyErrorCode = {}));
/**
 * Custom error class for Subly SDK
 */
class SublyError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.name = 'SublyError';
        this.code = code;
        this.cause = cause;
        Object.setPrototypeOf(this, SublyError.prototype);
    }
    /**
     * Create a SublyError from an unknown error
     */
    static fromError(error, code) {
        if (error instanceof SublyError) {
            return error;
        }
        if (error instanceof Error) {
            return new SublyError(error.message, code, error);
        }
        return new SublyError(String(error), code);
    }
}
exports.SublyError = SublyError;
//# sourceMappingURL=index.js.map