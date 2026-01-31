"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSubscribeInstruction = buildSubscribeInstruction;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const pda_1 = require("../accounts/pda");
const arcium_1 = require("../encryption/arcium");
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
    const { user, plan, subscriptionIndex, computationOffset, arciumClient, programId = pda_1.PROGRAM_ID, } = params;
    const subscriptionIndexBN = bn_js_1.default.isBN(subscriptionIndex)
        ? subscriptionIndex
        : new bn_js_1.default(subscriptionIndex);
    // Derive all required PDAs
    const [userLedgerPDA] = (0, pda_1.deriveUserLedgerPDA)(user, plan.mint, programId);
    const [merchantLedgerPDA] = (0, pda_1.deriveMerchantLedgerPDA)(plan.merchant, plan.mint, programId);
    const [userSubscriptionPDA] = (0, pda_1.deriveUserSubscriptionPDA)(user, subscriptionIndexBN, programId);
    const [signPDA] = (0, arcium_1.deriveSignPDA)(programId);
    const [mxeAccount] = (0, arcium_1.deriveMxePDA)(programId);
    const [mempoolAccount] = (0, arcium_1.deriveMempoolPDA)(mxeAccount);
    const [execPoolAccount] = (0, arcium_1.deriveExecPoolPDA)(mxeAccount);
    const [computationAccount] = (0, arcium_1.deriveComputationPDA)(computationOffset, mxeAccount);
    const [compDefAccount] = (0, arcium_1.deriveComputationDefinitionPDA)('subscribe', programId);
    const [clusterAccount] = (0, arcium_1.deriveClusterPDA)(mxeAccount);
    // Encrypt the price for Arcium computation
    const encryptedPrice = await arciumClient.encryptU64(plan.price);
    // Build instruction data
    // Discriminator for 'subscribe' instruction
    const discriminator = Buffer.from([
        // subscribe discriminator from IDL
        // This should match the Anchor-generated discriminator
        0xf0, 0x9e, 0x65, 0x67, 0x89, 0x6c, 0x4b, 0xd3,
    ]);
    const data = Buffer.alloc(8 + // discriminator
        8 + // computation_offset (u64)
        8 + // subscription_index (u64)
        32 + // encrypted_price ([u8; 32])
        32 + // pubkey ([u8; 32])
        16 // nonce (u128)
    );
    let offset = 0;
    // Discriminator
    discriminator.copy(data, offset);
    offset += 8;
    // computation_offset (u64, little-endian)
    computationOffset.toArrayLike(Buffer, 'le', 8).copy(data, offset);
    offset += 8;
    // subscription_index (u64, little-endian)
    subscriptionIndexBN.toArrayLike(Buffer, 'le', 8).copy(data, offset);
    offset += 8;
    // encrypted_price ([u8; 32])
    Buffer.from(encryptedPrice.ciphertext).copy(data, offset);
    offset += 32;
    // pubkey ([u8; 32])
    Buffer.from(encryptedPrice.pubkey).copy(data, offset);
    offset += 32;
    // nonce (u128, little-endian)
    encryptedPrice.nonce.toArrayLike(Buffer, 'le', 16).copy(data, offset);
    // Build the instruction
    const keys = [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: plan.mint, isSigner: false, isWritable: false },
        { pubkey: plan.publicKey, isSigner: false, isWritable: false },
        { pubkey: userLedgerPDA, isSigner: false, isWritable: true },
        { pubkey: merchantLedgerPDA, isSigner: false, isWritable: true },
        { pubkey: userSubscriptionPDA, isSigner: false, isWritable: true },
        { pubkey: signPDA, isSigner: false, isWritable: true },
        { pubkey: mxeAccount, isSigner: false, isWritable: false },
        { pubkey: mempoolAccount, isSigner: false, isWritable: true },
        { pubkey: execPoolAccount, isSigner: false, isWritable: true },
        { pubkey: computationAccount, isSigner: false, isWritable: true },
        { pubkey: compDefAccount, isSigner: false, isWritable: false },
        { pubkey: clusterAccount, isSigner: false, isWritable: true },
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