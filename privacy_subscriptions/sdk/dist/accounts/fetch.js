"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSubscriptionPlan = fetchSubscriptionPlan;
exports.fetchSubscriptionPlanByMerchantAndId = fetchSubscriptionPlanByMerchantAndId;
exports.fetchAllPlansForMerchant = fetchAllPlansForMerchant;
exports.fetchUserSubscription = fetchUserSubscription;
exports.fetchUserSubscriptionByUserAndIndex = fetchUserSubscriptionByUserAndIndex;
exports.fetchUserLedger = fetchUserLedger;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const pda_1 = require("./pda");
/** Account discriminator size in Anchor */
const DISCRIMINATOR_SIZE = 8;
/** Max name length for plans */
const MAX_PLAN_NAME_LENGTH = 32;
/**
 * Parse subscription plan from raw account data
 */
function parseSubscriptionPlan(publicKey, data) {
    // Skip discriminator (8 bytes)
    let offset = DISCRIMINATOR_SIZE;
    // merchant: Pubkey (32 bytes)
    const merchant = new web3_js_1.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    // plan_id: u64 (8 bytes)
    const planId = new bn_js_1.default(data.subarray(offset, offset + 8), 'le');
    offset += 8;
    // name: [u8; 32] (32 bytes)
    const nameBytes = data.subarray(offset, offset + MAX_PLAN_NAME_LENGTH);
    const nullIndex = nameBytes.indexOf(0);
    const name = new TextDecoder().decode(nameBytes.subarray(0, nullIndex === -1 ? MAX_PLAN_NAME_LENGTH : nullIndex));
    offset += MAX_PLAN_NAME_LENGTH;
    // mint: Pubkey (32 bytes)
    const mint = new web3_js_1.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    // price: u64 (8 bytes)
    const price = new bn_js_1.default(data.subarray(offset, offset + 8), 'le');
    offset += 8;
    // billing_cycle_days: u32 (4 bytes)
    const billingCycleDays = data.readUInt32LE(offset);
    offset += 4;
    // is_active: bool (1 byte)
    const isActive = data[offset] === 1;
    return {
        publicKey,
        merchant,
        planId,
        name,
        mint,
        price,
        billingCycleDays,
        isActive,
    };
}
/**
 * Parse user subscription from raw account data
 */
function parseUserSubscription(publicKey, data) {
    // Skip discriminator (8 bytes)
    let offset = DISCRIMINATOR_SIZE;
    // user: Pubkey (32 bytes)
    const user = new web3_js_1.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    // subscription_index: u64 (8 bytes)
    const subscriptionIndex = new bn_js_1.default(data.subarray(offset, offset + 8), 'le');
    offset += 8;
    // encryption_pubkey: [u8; 32]
    const encryptionPubkey = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // encrypted_plan: [[u8; 32]; 2]
    const encryptedPlan0 = new Uint8Array(data.subarray(offset, offset + 32));
    const encryptedPlan1 = new Uint8Array(data.subarray(offset + 32, offset + 64));
    offset += 64;
    // encrypted_status: [u8; 32]
    const encryptedStatus = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // encrypted_next_payment_date: [u8; 32]
    const encryptedNextPaymentDate = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // encrypted_start_date: [u8; 32]
    const encryptedStartDate = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // nonce: u128 (16 bytes)
    const nonce = new bn_js_1.default(data.subarray(offset, offset + 16), 'le');
    offset += 16;
    return {
        publicKey,
        user,
        subscriptionIndex,
        encryptionPubkey,
        encryptedPlan: [encryptedPlan0, encryptedPlan1],
        encryptedStatus,
        encryptedNextPaymentDate,
        encryptedStartDate,
        nonce,
    };
}
/**
 * Parse user ledger from raw account data
 */
function parseUserLedger(publicKey, data) {
    // Skip discriminator (8 bytes)
    let offset = DISCRIMINATOR_SIZE;
    // user: Pubkey (32 bytes)
    const user = new web3_js_1.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    // mint: Pubkey (32 bytes)
    const mint = new web3_js_1.PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    // encryption_pubkey: [u8; 32]
    const encryptionPubkey = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // encrypted_balance: [u8; 32]
    const encryptedBalance = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // encrypted_subscription_count: [u8; 32]
    const encryptedSubscriptionCount = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;
    // nonce: u128 (16 bytes)
    const nonce = new bn_js_1.default(data.subarray(offset, offset + 16), 'le');
    offset += 16;
    // last_updated: i64 (8 bytes)
    const lastUpdated = new bn_js_1.default(data.subarray(offset, offset + 8), 'le');
    return {
        publicKey,
        user,
        mint,
        encryptionPubkey,
        encryptedBalance,
        encryptedSubscriptionCount,
        nonce,
        lastUpdated,
    };
}
/**
 * Fetch a single subscription plan by its PDA
 */
async function fetchSubscriptionPlan(connection, planPDA) {
    const accountInfo = await connection.getAccountInfo(planPDA);
    if (!accountInfo) {
        return null;
    }
    return parseSubscriptionPlan(planPDA, accountInfo.data);
}
/**
 * Fetch a subscription plan by merchant and plan ID
 */
async function fetchSubscriptionPlanByMerchantAndId(connection, merchantWallet, planId, programId = pda_1.PROGRAM_ID) {
    const [merchantPDA] = (0, pda_1.deriveMerchantPDA)(merchantWallet, programId);
    const [planPDA] = (0, pda_1.deriveSubscriptionPlanPDA)(merchantPDA, planId, programId);
    return fetchSubscriptionPlan(connection, planPDA);
}
/**
 * Fetch all subscription plans for a merchant
 */
async function fetchAllPlansForMerchant(connection, merchantWallet, programId = pda_1.PROGRAM_ID, activeOnly = false) {
    const [merchantPDA] = (0, pda_1.deriveMerchantPDA)(merchantWallet, programId);
    // Filter by merchant public key (starts at offset 8 after discriminator)
    const filters = [
        {
            memcmp: {
                offset: DISCRIMINATOR_SIZE, // After discriminator
                bytes: merchantPDA.toBase58(),
            },
        },
    ];
    // We also need to filter by account type - subscription_plan
    // In Anchor, the discriminator is the first 8 bytes
    // For now, we'll fetch all and filter
    const accounts = await connection.getProgramAccounts(programId, {
        filters,
    });
    const plans = [];
    for (const { pubkey, account } of accounts) {
        try {
            const plan = parseSubscriptionPlan(pubkey, account.data);
            if (!activeOnly || plan.isActive) {
                plans.push(plan);
            }
        }
        catch {
            // Skip accounts that don't parse as subscription plans
        }
    }
    return plans;
}
/**
 * Fetch a user subscription by PDA
 */
async function fetchUserSubscription(connection, userSubscriptionPDA) {
    const accountInfo = await connection.getAccountInfo(userSubscriptionPDA);
    if (!accountInfo) {
        return null;
    }
    return parseUserSubscription(userSubscriptionPDA, accountInfo.data);
}
/**
 * Fetch a user subscription by user and index
 */
async function fetchUserSubscriptionByUserAndIndex(connection, user, subscriptionIndex, programId = pda_1.PROGRAM_ID) {
    const [subscriptionPDA] = (0, pda_1.deriveUserSubscriptionPDA)(user, subscriptionIndex, programId);
    return fetchUserSubscription(connection, subscriptionPDA);
}
/**
 * Fetch user ledger
 */
async function fetchUserLedger(connection, user, mint, programId = pda_1.PROGRAM_ID) {
    const [userLedgerPDA] = (0, pda_1.deriveUserLedgerPDA)(user, mint, programId);
    const accountInfo = await connection.getAccountInfo(userLedgerPDA);
    if (!accountInfo) {
        return null;
    }
    return parseUserLedger(userLedgerPDA, accountInfo.data);
}
//# sourceMappingURL=fetch.js.map