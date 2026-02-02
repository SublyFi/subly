"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCRYPTION_SIGNING_MESSAGE = exports.COMP_DEF_OFFSETS = exports.SIGN_PDA_SEED = exports.ARCIUM_CLOCK_ACCOUNT = exports.ARCIUM_FEE_POOL_ACCOUNT = exports.ARCIUM_PROGRAM_ID = void 0;
exports.getMXEPublicKeyWithRetry = getMXEPublicKeyWithRetry;
exports.deriveEncryptionKeyFromSignature = deriveEncryptionKeyFromSignature;
exports.createArciumContextFromSignature = createArciumContextFromSignature;
exports.createArciumContextFromWallet = createArciumContextFromWallet;
exports.nonceToBytes = nonceToBytes;
exports.bytesToU128 = bytesToU128;
exports.generateNonce = generateNonce;
exports.encryptValues = encryptValues;
exports.decryptValues = decryptValues;
exports.decryptValue = decryptValue;
exports.pubkeyToU128s = pubkeyToU128s;
exports.u128sToPubkey = u128sToPubkey;
exports.deriveSignPDA = deriveSignPDA;
exports.deriveComputationDefinitionPDA = deriveComputationDefinitionPDA;
exports.getArciumAccounts = getArciumAccounts;
exports.getNextComputationOffset = getNextComputationOffset;
exports.generateComputationOffset = generateComputationOffset;
const client_1 = require("@arcium-hq/client");
const crypto_1 = require("crypto");
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
    deposit_v2: 1894255896,
    withdraw_v2: 2549376853,
    subscribe_v2: 524592853,
    unsubscribe_v2: 3264881130,
    process_payment_v2: 930732409,
    verify_subscription_v2: 1451574225,
    claim_revenue_v2: 2315398764,
};
/**
 * Message used for deriving deterministic encryption keys.
 * IMPORTANT: Do not change this message as it would break existing encrypted data.
 */
exports.ENCRYPTION_SIGNING_MESSAGE = 'Subly Privacy Subscriptions - Encryption Key Derivation v1';
async function sha256(data) {
    if (globalThis.crypto?.subtle) {
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hashBuffer);
    }
    const { createHash } = await Promise.resolve().then(() => __importStar(require('crypto')));
    const hash = createHash('sha256').update(Buffer.from(data)).digest();
    return new Uint8Array(hash);
}
/**
 * Get MXE public key with retry logic
 */
async function getMXEPublicKeyWithRetry(connection, programId = pda_1.PROGRAM_ID, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const mxePubkey = await (0, client_1.getMXEPublicKey)({ connection }, programId);
            if (mxePubkey)
                return mxePubkey;
        }
        catch {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    throw new Error('Failed to fetch MXE public key after retries');
}
/**
 * Derive deterministic X25519 encryption key from a wallet signature.
 */
async function deriveEncryptionKeyFromSignature(signature) {
    const signatureArray = new Uint8Array(signature);
    const privateKey = await sha256(signatureArray);
    const publicKey = client_1.x25519.getPublicKey(privateKey);
    return { privateKey, publicKey };
}
/**
 * Create Arcium encryption context from a wallet signature (deterministic).
 */
async function createArciumContextFromSignature(connection, signature, programId = pda_1.PROGRAM_ID) {
    const mxePubkey = await getMXEPublicKeyWithRetry(connection, programId);
    const { privateKey, publicKey } = await deriveEncryptionKeyFromSignature(signature);
    const sharedSecret = client_1.x25519.getSharedSecret(privateKey, mxePubkey);
    const cipher = new client_1.RescueCipher(sharedSecret);
    return { privateKey, publicKey, sharedSecret, cipher };
}
/**
 * Create Arcium encryption context using wallet.signMessage().
 */
async function createArciumContextFromWallet(connection, wallet, programId = pda_1.PROGRAM_ID) {
    const message = new TextEncoder().encode(exports.ENCRYPTION_SIGNING_MESSAGE);
    const signature = await wallet.signMessage(message);
    return createArciumContextFromSignature(connection, signature, programId);
}
/**
 * Convert a u128 nonce to 16 bytes (little-endian)
 */
function nonceToBytes(nonce) {
    const out = new Uint8Array(16);
    let value = typeof nonce === 'bigint' ? nonce : BigInt(nonce.toString());
    for (let i = 0; i < 16; i++) {
        out[i] = Number(value & BigInt(0xff));
        value >>= BigInt(8);
    }
    return out;
}
/**
 * Convert 16-byte little-endian nonce into a bigint
 */
function bytesToU128(bytes) {
    let result = BigInt(0);
    for (let i = bytes.length - 1; i >= 0; i--) {
        result = (result << BigInt(8)) + BigInt(bytes[i]);
    }
    return result;
}
/**
 * Generate a random 16-byte nonce for encryption
 */
function generateNonce() {
    const nonce = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(nonce);
        return nonce;
    }
    return new Uint8Array((0, crypto_1.randomBytes)(16));
}
/**
 * Encrypt one or more values with the Arcium cipher
 */
function encryptValues(cipher, values, nonce) {
    const ciphertexts = cipher.encrypt(values, nonce);
    return ciphertexts.map((value) => new Uint8Array(value));
}
/**
 * Decrypt one or more values using the Arcium cipher
 */
function decryptValues(cipher, encryptedValues, nonce) {
    const ciphertexts = encryptedValues.map((value) => Array.isArray(value) ? value : Array.from(value));
    return cipher.decrypt(ciphertexts, nonce);
}
/**
 * Decrypt a single value using the Arcium cipher
 */
function decryptValue(cipher, encryptedValue, nonce) {
    return decryptValues(cipher, [encryptedValue], nonce)[0];
}
/**
 * Split a PublicKey into two u128 values (little-endian)
 */
function pubkeyToU128s(pubkey) {
    const bytes = pubkey.toBytes();
    const toU128 = (slice) => {
        let out = BigInt(0);
        for (let i = 0; i < slice.length; i++) {
            out |= BigInt(slice[i]) << BigInt(8 * i);
        }
        return out;
    };
    const first = toU128(bytes.slice(0, 16));
    const second = toU128(bytes.slice(16, 32));
    return [first, second];
}
/**
 * Combine two u128 values into a PublicKey (little-endian)
 */
function u128sToPubkey(parts) {
    const toBytes = (value) => {
        const out = new Uint8Array(16);
        let v = value;
        for (let i = 0; i < 16; i++) {
            out[i] = Number(v & BigInt(0xff));
            v >>= BigInt(8);
        }
        return out;
    };
    const first = toBytes(parts[0]);
    const second = toBytes(parts[1]);
    const bytes = new Uint8Array(32);
    bytes.set(first, 0);
    bytes.set(second, 16);
    return new web3_js_1.PublicKey(bytes);
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
    const baseSeed = (0, client_1.getArciumAccountBaseSeed)('ComputationDefinitionAccount');
    const offset = (0, client_1.getCompDefAccOffset)(computationType);
    return web3_js_1.PublicKey.findProgramAddressSync([baseSeed, programId.toBuffer(), offset], (0, client_1.getArciumProgramId)());
}
/**
 * Get Arcium account addresses for transaction construction
 */
function getArciumAccounts(programId, computationType, computationOffset, clusterOffset) {
    const mxeAccount = (0, client_1.getMXEAccAddress)(programId);
    const mempoolAccount = (0, client_1.getMempoolAccAddress)(clusterOffset);
    const executingPool = (0, client_1.getExecutingPoolAccAddress)(clusterOffset);
    const computationAccount = (0, client_1.getComputationAccAddress)(clusterOffset, computationOffset);
    const clusterAccount = (0, client_1.getClusterAccAddress)(clusterOffset);
    const [compDefAccount] = deriveComputationDefinitionPDA(computationType, programId);
    return {
        mxeAccount,
        mempoolAccount,
        executingPool,
        computationAccount,
        compDefAccount,
        clusterAccount,
    };
}
/**
 * Get computation offset (for compute account PDA derivation)
 */
async function getNextComputationOffset() {
    return generateComputationOffset();
}
/**
 * Generate a random computation offset
 */
function generateComputationOffset() {
    const bytes = new Uint8Array(8);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(bytes);
    }
    else {
        const { randomBytes } = require('crypto');
        bytes.set(randomBytes(8));
    }
    return new bn_js_1.default(Array.from(bytes));
}
//# sourceMappingURL=arcium.js.map