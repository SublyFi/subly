"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVerifySubscriptionInstruction = buildVerifySubscriptionInstruction;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const anchor_1 = require("@coral-xyz/anchor");
const pda_1 = require("../accounts/pda");
const arcium_1 = require("../encryption/arcium");
const privacy_subscriptions_json_1 = __importDefault(require("../idl/privacy_subscriptions.json"));
/**
 * Build the verify subscription instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Queues an Arcium computation to verify subscription status
 * 2. The callback will emit a SubscriptionVerified event
 */
async function buildVerifySubscriptionInstruction(params) {
    const { payer, user, subscriptionIndex, computationOffset, clusterOffset = 0, programId = pda_1.PROGRAM_ID, } = params;
    const subscriptionIndexBN = bn_js_1.default.isBN(subscriptionIndex)
        ? subscriptionIndex
        : new bn_js_1.default(subscriptionIndex);
    // Derive all required PDAs
    const [userSubscriptionPDA] = (0, pda_1.deriveUserSubscriptionPDA)(user, subscriptionIndexBN, programId);
    const [signPDA] = (0, arcium_1.deriveSignPDA)(programId);
    const arciumAccounts = (0, arcium_1.getArciumAccounts)(programId, 'verify_subscription_v2', computationOffset, clusterOffset);
    const coder = new anchor_1.BorshCoder(privacy_subscriptions_json_1.default);
    const data = coder.instruction.encode('verify_subscription', {
        computationOffset,
    });
    // Build the instruction
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: userSubscriptionPDA, isSigner: false, isWritable: false },
        { pubkey: signPDA, isSigner: false, isWritable: true },
        { pubkey: arciumAccounts.mxeAccount, isSigner: false, isWritable: false },
        { pubkey: arciumAccounts.mempoolAccount, isSigner: false, isWritable: true },
        { pubkey: arciumAccounts.executingPool, isSigner: false, isWritable: true },
        { pubkey: arciumAccounts.computationAccount, isSigner: false, isWritable: true },
        { pubkey: arciumAccounts.compDefAccount, isSigner: false, isWritable: false },
        { pubkey: arciumAccounts.clusterAccount, isSigner: false, isWritable: true },
        { pubkey: arcium_1.ARCIUM_FEE_POOL_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: arcium_1.ARCIUM_CLOCK_ACCOUNT, isSigner: false, isWritable: true },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: arcium_1.ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
//# sourceMappingURL=verify.js.map