"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMP_DEF_OFFSETS = exports.INSTRUCTIONS_SYSVAR_ID = exports.ARCIUM_CLOCK_ACCOUNT_ADDRESS = exports.ARCIUM_FEE_POOL_ACCOUNT_ADDRESS = exports.ARCIUM_CLUSTER_OFFSET = exports.ARCIUM_PROGRAM_ID = void 0;
exports.computeCompDefOffset = computeCompDefOffset;
exports.deriveMxePda = deriveMxePda;
exports.deriveMempoolPda = deriveMempoolPda;
exports.deriveExecPoolPda = deriveExecPoolPda;
exports.deriveComputationPda = deriveComputationPda;
exports.deriveCompDefPda = deriveCompDefPda;
exports.deriveClusterPda = deriveClusterPda;
exports.deriveSignPda = deriveSignPda;
exports.getArciumAccounts = getArciumAccounts;
exports.generateComputationOffset = generateComputationOffset;
exports.getArciumCallbackAccounts = getArciumCallbackAccounts;
exports.getInitCompDefAccounts = getInitCompDefAccounts;
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = require("crypto");
// Arcium Program ID (Devnet)
exports.ARCIUM_PROGRAM_ID = new web3_js_1.PublicKey("arc1uuMMTZwHitCq5nNDH7KHFTz3xAiPwWsqpHzEDJy");
// Arcium Devnet Constants
exports.ARCIUM_CLUSTER_OFFSET = 456;
exports.ARCIUM_FEE_POOL_ACCOUNT_ADDRESS = new web3_js_1.PublicKey("DeVKcN6Nb9Y8KjLWZbTWmLj7z8eCBRnU4n5r4GvhzLhK");
exports.ARCIUM_CLOCK_ACCOUNT_ADDRESS = new web3_js_1.PublicKey("SysvarC1ock11111111111111111111111111111111");
exports.INSTRUCTIONS_SYSVAR_ID = new web3_js_1.PublicKey("Sysvar1nstructions1111111111111111111111111");
/**
 * Compute comp_def_offset from instruction name
 * This matches arcium_anchor::comp_def_offset() which computes:
 * sha256(name).slice(0,4) as little-endian u32
 */
function computeCompDefOffset(name) {
    const hash = (0, crypto_1.createHash)("sha256").update(name).digest();
    return hash.readUInt32LE(0);
}
// Computation Definition Offsets
// These are computed using sha256(name).slice(0,4) as little-endian u32
// to match the Rust constants in arcium/constants.rs
exports.COMP_DEF_OFFSETS = {
    INCREMENT_COUNT: computeCompDefOffset("increment_count"),
    DECREMENT_COUNT: computeCompDefOffset("decrement_count"),
    INITIALIZE_COUNT: computeCompDefOffset("initialize_count"),
    SET_SUBSCRIPTION_ACTIVE: computeCompDefOffset("set_subscription_active"),
    SET_SUBSCRIPTION_CANCELLED: computeCompDefOffset("set_subscription_cancelled"),
    INITIALIZE_SUBSCRIPTION_STATUS: computeCompDefOffset("initialize_subscription_status"),
};
/**
 * Derive MXE PDA
 */
function deriveMxePda(programId) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("mxe")], programId);
    return pda;
}
/**
 * Derive Mempool PDA from MXE account
 */
function deriveMempoolPda(mxeAccount) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("mempool"), mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
    return pda;
}
/**
 * Derive Executing Pool PDA from MXE account
 */
function deriveExecPoolPda(mxeAccount) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("execpool"), mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
    return pda;
}
/**
 * Derive Computation PDA from offset and MXE account
 */
function deriveComputationPda(computationOffset, mxeAccount) {
    const offsetBuffer = Buffer.alloc(8);
    offsetBuffer.writeBigUInt64LE(computationOffset);
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("computation"), offsetBuffer, mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
    return pda;
}
/**
 * Derive Computation Definition PDA from offset
 */
function deriveCompDefPda(compDefOffset, programId) {
    const offsetBuffer = Buffer.alloc(4);
    offsetBuffer.writeUInt32LE(compDefOffset);
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("comp_def"), offsetBuffer], programId);
    return pda;
}
/**
 * Derive Cluster PDA from MXE account
 */
function deriveClusterPda(mxeAccount) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("cluster"), mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
    return pda;
}
/**
 * Derive Sign PDA for CPI signing
 */
function deriveSignPda(programId) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("SignerAccount")], programId);
    return pda;
}
/**
 * Get all Arcium accounts needed for a queue_computation CPI
 */
function getArciumAccounts(payer, programId, computationOffset, compDefOffset) {
    const mxeAccount = deriveMxePda(programId);
    return {
        payer,
        mxeAccount,
        mempoolAccount: deriveMempoolPda(mxeAccount),
        executingPool: deriveExecPoolPda(mxeAccount),
        computationAccount: deriveComputationPda(computationOffset, mxeAccount),
        compDefAccount: deriveCompDefPda(compDefOffset, programId),
        clusterAccount: deriveClusterPda(mxeAccount),
        poolAccount: exports.ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
        clockAccount: exports.ARCIUM_CLOCK_ACCOUNT_ADDRESS,
        signPdaAccount: deriveSignPda(programId),
        systemProgram: web3_js_1.PublicKey.default,
        arciumProgram: exports.ARCIUM_PROGRAM_ID,
    };
}
/**
 * Generate a random computation offset (u64)
 */
function generateComputationOffset() {
    const buffer = new Uint8Array(8);
    crypto.getRandomValues(buffer);
    return new DataView(buffer.buffer).getBigUint64(0, true);
}
/**
 * Get standard Arcium callback accounts
 */
function getArciumCallbackAccounts(programId, compDefOffset, computationOffset) {
    const mxeAccount = deriveMxePda(programId);
    return {
        arciumProgram: exports.ARCIUM_PROGRAM_ID,
        compDefAccount: deriveCompDefPda(compDefOffset, programId),
        mxeAccount,
        computationAccount: deriveComputationPda(computationOffset, mxeAccount),
        clusterAccount: deriveClusterPda(mxeAccount),
        instructionsSysvar: exports.INSTRUCTIONS_SYSVAR_ID,
    };
}
/**
 * Get accounts for init_comp_def instruction
 */
function getInitCompDefAccounts(payer, programId, compDefOffset) {
    const mxeAccount = deriveMxePda(programId);
    return {
        payer,
        mxeAccount,
        compDefAccount: deriveCompDefPda(compDefOffset, programId),
        clusterAccount: deriveClusterPda(mxeAccount),
        systemProgram: web3_js_1.PublicKey.default,
        arciumProgram: exports.ARCIUM_PROGRAM_ID,
    };
}
//# sourceMappingURL=arcium.js.map