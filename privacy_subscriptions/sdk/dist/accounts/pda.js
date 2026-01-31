"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_SUBSCRIPTION_SEED = exports.USER_LEDGER_SEED = exports.SUBSCRIPTION_PLAN_SEED = exports.MERCHANT_LEDGER_SEED = exports.MERCHANT_SEED = exports.PROTOCOL_POOL_SEED = exports.PROTOCOL_CONFIG_SEED = exports.PROGRAM_ID = void 0;
exports.deriveProtocolConfigPDA = deriveProtocolConfigPDA;
exports.deriveProtocolPoolPDA = deriveProtocolPoolPDA;
exports.deriveMerchantPDA = deriveMerchantPDA;
exports.deriveMerchantLedgerPDA = deriveMerchantLedgerPDA;
exports.deriveSubscriptionPlanPDA = deriveSubscriptionPlanPDA;
exports.deriveUserLedgerPDA = deriveUserLedgerPDA;
exports.deriveUserSubscriptionPDA = deriveUserSubscriptionPDA;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
/** Default program ID for Privacy Subscriptions */
exports.PROGRAM_ID = new web3_js_1.PublicKey('DYdc7w3bmh5KQmzznufNx72cbXf446LC5gTWi8DA8zC6');
/** PDA Seeds */
exports.PROTOCOL_CONFIG_SEED = Buffer.from('protocol_config');
exports.PROTOCOL_POOL_SEED = Buffer.from('protocol_pool');
exports.MERCHANT_SEED = Buffer.from('merchant');
exports.MERCHANT_LEDGER_SEED = Buffer.from('merchant_ledger');
exports.SUBSCRIPTION_PLAN_SEED = Buffer.from('subscription_plan');
exports.USER_LEDGER_SEED = Buffer.from('user_ledger');
exports.USER_SUBSCRIPTION_SEED = Buffer.from('user_subscription');
/**
 * Derives the Protocol Config PDA
 * Seeds: ["protocol_config"]
 */
function deriveProtocolConfigPDA(programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([exports.PROTOCOL_CONFIG_SEED], programId);
}
/**
 * Derives the Protocol Pool PDA for a specific mint
 * Seeds: ["protocol_pool", mint]
 */
function deriveProtocolPoolPDA(mint, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([exports.PROTOCOL_POOL_SEED, mint.toBuffer()], programId);
}
/**
 * Derives the Merchant PDA for a wallet
 * Seeds: ["merchant", wallet]
 */
function deriveMerchantPDA(wallet, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([exports.MERCHANT_SEED, wallet.toBuffer()], programId);
}
/**
 * Derives the Merchant Ledger PDA
 * Seeds: ["merchant_ledger", merchant, mint]
 */
function deriveMerchantLedgerPDA(merchant, mint, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([exports.MERCHANT_LEDGER_SEED, merchant.toBuffer(), mint.toBuffer()], programId);
}
/**
 * Derives the Subscription Plan PDA
 * Seeds: ["subscription_plan", merchant, plan_id.to_le_bytes()]
 */
function deriveSubscriptionPlanPDA(merchant, planId, programId = exports.PROGRAM_ID) {
    const planIdBN = bn_js_1.default.isBN(planId) ? planId : new bn_js_1.default(planId);
    const planIdBuffer = planIdBN.toArrayLike(Buffer, 'le', 8);
    return web3_js_1.PublicKey.findProgramAddressSync([exports.SUBSCRIPTION_PLAN_SEED, merchant.toBuffer(), planIdBuffer], programId);
}
/**
 * Derives the User Ledger PDA
 * Seeds: ["user_ledger", user, mint]
 */
function deriveUserLedgerPDA(user, mint, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([exports.USER_LEDGER_SEED, user.toBuffer(), mint.toBuffer()], programId);
}
/**
 * Derives the User Subscription PDA
 * Seeds: ["user_subscription", user, subscription_index.to_le_bytes()]
 */
function deriveUserSubscriptionPDA(user, subscriptionIndex, programId = exports.PROGRAM_ID) {
    const indexBN = bn_js_1.default.isBN(subscriptionIndex) ? subscriptionIndex : new bn_js_1.default(subscriptionIndex);
    const indexBuffer = indexBN.toArrayLike(Buffer, 'le', 8);
    return web3_js_1.PublicKey.findProgramAddressSync([exports.USER_SUBSCRIPTION_SEED, user.toBuffer(), indexBuffer], programId);
}
//# sourceMappingURL=pda.js.map