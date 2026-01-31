"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMP_DEF_OFFSETS = exports.SIGN_PDA_SEED = exports.ARCIUM_CLOCK_ACCOUNT = exports.ARCIUM_FEE_POOL_ACCOUNT = exports.ARCIUM_PROGRAM_ID = void 0;
exports.deriveMxePDA = deriveMxePDA;
exports.deriveSignPDA = deriveSignPDA;
exports.deriveComputationDefinitionPDA = deriveComputationDefinitionPDA;
exports.deriveMempoolPDA = deriveMempoolPDA;
exports.deriveExecPoolPDA = deriveExecPoolPDA;
exports.deriveComputationPDA = deriveComputationPDA;
exports.deriveClusterPDA = deriveClusterPDA;
exports.createSimpleEncryptor = createSimpleEncryptor;
exports.initArciumClient = initArciumClient;
exports.getNextComputationOffset = getNextComputationOffset;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const pda_1 = require("../accounts/pda");
/** Arcium Program ID */
exports.ARCIUM_PROGRAM_ID = new web3_js_1.PublicKey('Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ');
/** Arcium Fee Pool Account */
exports.ARCIUM_FEE_POOL_ACCOUNT = new web3_js_1.PublicKey('G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC');
/** Arcium Clock Account */
exports.ARCIUM_CLOCK_ACCOUNT = new web3_js_1.PublicKey('7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot');
/** Sign PDA Seed */
exports.SIGN_PDA_SEED = Buffer.from('ArciumSignerAccount');
/** Computation definition offsets (matching the Rust program) */
exports.COMP_DEF_OFFSETS = {
    deposit: 0,
    withdraw: 1,
    subscribe: 2,
    unsubscribe: 3,
    process_payment: 4,
    verify_subscription: 5,
    claim_revenue: 6,
};
/**
 * Derive the MXE PDA for this program
 */
function deriveMxePDA(programId = pda_1.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('mxe'), programId.toBuffer()], exports.ARCIUM_PROGRAM_ID);
}
/**
 * Derive the Sign PDA for this program
 */
function deriveSignPDA(programId = pda_1.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddressSync([exports.SIGN_PDA_SEED], programId);
}
/**
 * Derive the computation definition PDA for a specific computation type
 */
function deriveComputationDefinitionPDA(computationType, programId = pda_1.PROGRAM_ID) {
    const offset = exports.COMP_DEF_OFFSETS[computationType];
    const offsetBuffer = Buffer.alloc(4);
    offsetBuffer.writeUInt32LE(offset);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('comp_def'), programId.toBuffer(), offsetBuffer], exports.ARCIUM_PROGRAM_ID);
}
/**
 * Derive the mempool PDA from MXE account
 */
function deriveMempoolPDA(mxeAccount) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('mempool'), mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
}
/**
 * Derive the executing pool PDA from MXE account
 */
function deriveExecPoolPDA(mxeAccount) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('execpool'), mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
}
/**
 * Derive the computation PDA
 */
function deriveComputationPDA(computationOffset, mxeAccount) {
    const offsetBN = bn_js_1.default.isBN(computationOffset) ? computationOffset : new bn_js_1.default(computationOffset);
    const offsetBuffer = offsetBN.toArrayLike(Buffer, 'le', 8);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('computation'), mxeAccount.toBuffer(), offsetBuffer], exports.ARCIUM_PROGRAM_ID);
}
/**
 * Derive the cluster PDA from MXE account
 */
function deriveClusterPDA(mxeAccount) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('cluster'), mxeAccount.toBuffer()], exports.ARCIUM_PROGRAM_ID);
}
/**
 * Simple encryption wrapper for SDK use
 * Note: In production, this should use the actual @arcium-hq/client library
 */
function createSimpleEncryptor() {
    // Generate a random X25519-style public key (32 bytes)
    const pubkey = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(pubkey);
    }
    else {
        // Fallback for Node.js
        for (let i = 0; i < 32; i++) {
            pubkey[i] = Math.floor(Math.random() * 256);
        }
    }
    let nonceCounter = new bn_js_1.default(Date.now());
    return {
        encrypt: (value) => {
            const valueBN = bn_js_1.default.isBN(value) ? value : new bn_js_1.default(value);
            const nonce = nonceCounter;
            nonceCounter = nonceCounter.add(new bn_js_1.default(1));
            // Create a simple "encrypted" value (XOR with nonce for demo)
            // In production, this should use actual Arcium encryption
            const valueBuffer = valueBN.toArrayLike(Buffer, 'le', 8);
            const ciphertext = new Uint8Array(32);
            // Copy value to first 8 bytes
            for (let i = 0; i < 8; i++) {
                ciphertext[i] = valueBuffer[i];
            }
            // Fill rest with random padding
            for (let i = 8; i < 32; i++) {
                ciphertext[i] = Math.floor(Math.random() * 256);
            }
            return {
                ciphertext,
                nonce,
                pubkey,
            };
        },
        getNonce: () => {
            const nonce = nonceCounter;
            nonceCounter = nonceCounter.add(new bn_js_1.default(1));
            return nonce;
        },
        getPublicKey: () => pubkey,
    };
}
/**
 * Initialize Arcium client wrapper
 * Note: This is a simplified version. In production, use @arcium-hq/client
 */
async function initArciumClient(programId = pda_1.PROGRAM_ID) {
    const [mxeAccount] = deriveMxePDA(programId);
    const [clusterAccount] = deriveClusterPDA(mxeAccount);
    const encryptor = createSimpleEncryptor();
    return {
        mxeAccount,
        clusterAccount,
        encryptU64: async (value) => {
            return encryptor.encrypt(value);
        },
        getNonce: () => encryptor.getNonce(),
        getPublicKey: () => encryptor.getPublicKey(),
    };
}
/**
 * Get computation offset (for compute account PDA derivation)
 */
async function getNextComputationOffset() {
    // In production, this would query the MXE account to get the next available offset
    // For now, we use a timestamp-based offset
    return new bn_js_1.default(Date.now());
}
//# sourceMappingURL=arcium.js.map