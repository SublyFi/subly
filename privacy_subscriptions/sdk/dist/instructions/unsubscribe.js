"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUnsubscribeInstruction = buildUnsubscribeInstruction;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const pda_1 = require("../accounts/pda");
const arcium_1 = require("../encryption/arcium");
/**
 * Build the unsubscribe instruction
 *
 * This creates a TransactionInstruction that:
 * 1. Queues an Arcium computation to set subscription status to cancelled
 */
async function buildUnsubscribeInstruction(params) {
    const { user, subscriptionIndex, computationOffset, arciumClient, programId = pda_1.PROGRAM_ID, } = params;
    const subscriptionIndexBN = bn_js_1.default.isBN(subscriptionIndex)
        ? subscriptionIndex
        : new bn_js_1.default(subscriptionIndex);
    // Derive all required PDAs
    const [userSubscriptionPDA] = (0, pda_1.deriveUserSubscriptionPDA)(user, subscriptionIndexBN, programId);
    const [signPDA] = (0, arcium_1.deriveSignPDA)(programId);
    const [mxeAccount] = (0, arcium_1.deriveMxePDA)(programId);
    const [mempoolAccount] = (0, arcium_1.deriveMempoolPDA)(mxeAccount);
    const [execPoolAccount] = (0, arcium_1.deriveExecPoolPDA)(mxeAccount);
    const [computationAccount] = (0, arcium_1.deriveComputationPDA)(computationOffset, mxeAccount);
    const [compDefAccount] = (0, arcium_1.deriveComputationDefinitionPDA)('unsubscribe', programId);
    const [clusterAccount] = (0, arcium_1.deriveClusterPDA)(mxeAccount);
    // Get encryption parameters
    const nonce = arciumClient.getNonce();
    const pubkey = arciumClient.getPublicKey();
    // Build instruction data
    // Discriminator for 'unsubscribe' instruction
    const discriminator = Buffer.from([
        // unsubscribe discriminator from IDL
        0x32, 0xf2, 0x9d, 0x85, 0x61, 0x05, 0x2d, 0x50,
    ]);
    const data = Buffer.alloc(8 + // discriminator
        8 + // computation_offset (u64)
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
    // pubkey ([u8; 32])
    Buffer.from(pubkey).copy(data, offset);
    offset += 32;
    // nonce (u128, little-endian)
    nonce.toArrayLike(Buffer, 'le', 16).copy(data, offset);
    // Build the instruction
    const keys = [
        { pubkey: user, isSigner: true, isWritable: true },
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
//# sourceMappingURL=unsubscribe.js.map