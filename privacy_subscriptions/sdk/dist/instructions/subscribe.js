"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSubscribeInstruction = buildSubscribeInstruction;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const anchor_1 = require("@coral-xyz/anchor");
const pda_1 = require("../accounts/pda");
const arcium_1 = require("../encryption/arcium");
const privacy_subscriptions_json_1 = __importDefault(require("../idl/privacy_subscriptions.json"));
/**
 * Build the subscribe instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Creates a UserSubscription PDA
 * 2. Queues an Arcium computation to:
 *    - Deduct price from user's encrypted balance
 *    - Add price to merchant's encrypted balance
 *    - Set subscription status to active
 */
async function buildSubscribeInstruction(params) {
    const { user, plan, subscriptionIndex, encryptedPlan, encryptedPlanNonce, encryptedPrice, encryptedPriceNonce, encryptedBillingCycle, encryptedBillingCycleNonce, computationOffset, clusterOffset = 0, programId = pda_1.PROGRAM_ID, } = params;
    const subscriptionIndexBN = bn_js_1.default.isBN(subscriptionIndex)
        ? subscriptionIndex
        : new bn_js_1.default(subscriptionIndex);
    // Derive all required PDAs
    const [userLedgerPDA] = (0, pda_1.deriveUserLedgerPDA)(user, plan.mint, programId);
    const [merchantLedgerPDA] = (0, pda_1.deriveMerchantLedgerPDA)(plan.merchant, plan.mint, programId);
    const [userSubscriptionPDA] = (0, pda_1.deriveUserSubscriptionPDA)(user, subscriptionIndexBN, programId);
    const [signPDA] = (0, arcium_1.deriveSignPDA)(programId);
    const arciumAccounts = (0, arcium_1.getArciumAccounts)(programId, 'subscribe_v2', computationOffset, clusterOffset);
    const planCiphertexts = [
        Array.isArray(encryptedPlan[0])
            ? encryptedPlan[0]
            : Array.from(encryptedPlan[0]),
        Array.isArray(encryptedPlan[1])
            ? encryptedPlan[1]
            : Array.from(encryptedPlan[1]),
    ];
    const priceCiphertext = Array.isArray(encryptedPrice)
        ? encryptedPrice
        : Array.from(encryptedPrice);
    const billingCiphertext = Array.isArray(encryptedBillingCycle)
        ? encryptedBillingCycle
        : Array.from(encryptedBillingCycle);
    const planNonceBN = bn_js_1.default.isBN(encryptedPlanNonce)
        ? encryptedPlanNonce
        : new bn_js_1.default(encryptedPlanNonce.toString());
    const priceNonceBN = bn_js_1.default.isBN(encryptedPriceNonce)
        ? encryptedPriceNonce
        : new bn_js_1.default(encryptedPriceNonce.toString());
    const billingNonceBN = bn_js_1.default.isBN(encryptedBillingCycleNonce)
        ? encryptedBillingCycleNonce
        : new bn_js_1.default(encryptedBillingCycleNonce.toString());
    // Build instruction data using IDL coder
    const coder = new anchor_1.BorshCoder(privacy_subscriptions_json_1.default);
    const data = coder.instruction.encode('subscribe', {
        computationOffset,
        subscriptionIndex: subscriptionIndexBN,
        encryptedPlan: planCiphertexts,
        encryptedPlanNonce: planNonceBN,
        encryptedPrice: priceCiphertext,
        encryptedPriceNonce: priceNonceBN,
        encryptedBillingCycle: billingCiphertext,
        encryptedBillingCycleNonce: billingNonceBN,
    });
    // Build the instruction
    const keys = [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: plan.mint, isSigner: false, isWritable: false },
        { pubkey: plan.publicKey, isSigner: false, isWritable: false },
        { pubkey: userLedgerPDA, isSigner: false, isWritable: true },
        { pubkey: merchantLedgerPDA, isSigner: false, isWritable: true },
        { pubkey: userSubscriptionPDA, isSigner: false, isWritable: true },
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
//# sourceMappingURL=subscribe.js.map