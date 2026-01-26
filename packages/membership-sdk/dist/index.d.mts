import { PublicKey, Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * On-chain BusinessAccount structure
 */
type BusinessAccount = {
    /** Authority (owner) of the business */
    authority: PublicKey;
    /** Business name */
    name: string;
    /** Metadata URI (IPFS, Arweave, etc.) */
    metadataUri: string;
    /** Unix timestamp when created */
    createdAt: bigint;
    /** Whether the business is active */
    isActive: boolean;
    /** Number of plans created by this business */
    planCount: bigint;
    /** PDA bump seed */
    bump: number;
};
/**
 * Input for registering a new business
 */
type RegisterBusinessInput = {
    /** Business name (max 32 characters) */
    name: string;
    /** Metadata URI (max 128 characters) */
    metadataUri: string;
};
/**
 * Business account with additional metadata
 */
type Business = BusinessAccount & {
    /** Public key of the business account PDA */
    publicKey: PublicKey;
};

/**
 * On-chain Plan structure
 */
type PlanAccount = {
    /** Plan ID (same as PDA public key) */
    planId: PublicKey;
    /** Business that owns this plan */
    business: PublicKey;
    /** Encrypted plan name (32 bytes) */
    encryptedName: Uint8Array;
    /** Encrypted plan description (64 bytes) */
    encryptedDescription: Uint8Array;
    /** Price in USDC (6 decimals) */
    priceUsdc: bigint;
    /** Billing cycle in seconds */
    billingCycleSeconds: number;
    /** Unix timestamp when created */
    createdAt: bigint;
    /** Whether the plan is active */
    isActive: boolean;
    /** Encrypted subscription count */
    encryptedSubscriptionCount: Uint8Array;
    /** Encryption nonce */
    nonce: bigint;
    /** Sequential plan number for this business */
    planNonce: bigint;
    /** PDA bump seed */
    bump: number;
};
/**
 * Input for creating a new plan
 */
type CreatePlanInput = {
    /** Plan name (will be encrypted) */
    name: string;
    /** Plan description (will be encrypted) */
    description: string;
    /** Price in USDC (human readable, e.g. 9.99) */
    priceUsdc: number;
    /** Billing cycle in days */
    billingCycleDays: number;
};
/**
 * Plan with decrypted metadata
 */
type Plan = {
    /** Public key of the plan account PDA */
    publicKey: PublicKey;
    /** Business that owns this plan */
    business: PublicKey;
    /** Plan name (decrypted if authorized) */
    name?: string;
    /** Plan description (decrypted if authorized) */
    description?: string;
    /** Price in USDC (human readable) */
    priceUsdc: number;
    /** Billing cycle in days */
    billingCycleDays: number;
    /** Unix timestamp when created */
    createdAt: Date;
    /** Whether the plan is active */
    isActive: boolean;
    /** Subscription count (decrypted if authorized) */
    subscriptionCount?: number;
};
/**
 * Plan list filter options
 */
type PlanFilter = {
    /** Filter by business */
    business?: PublicKey;
    /** Filter by active status */
    isActive?: boolean;
    /** Maximum number of results */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
};

/**
 * On-chain Subscription structure
 */
type SubscriptionAccount = {
    /** Subscription ID (same as PDA public key) */
    subscriptionId: PublicKey;
    /** Plan this subscription belongs to */
    plan: PublicKey;
    /** Encrypted user commitment */
    encryptedUserCommitment: Uint8Array;
    /** Membership commitment hash */
    membershipCommitment: Uint8Array;
    /** Unix timestamp when subscribed */
    subscribedAt: bigint;
    /** Unix timestamp when cancelled (0 if active) */
    cancelledAt: bigint;
    /** Whether the subscription is active */
    isActive: boolean;
    /** Encryption nonce */
    nonce: bigint;
    /** PDA bump seed */
    bump: number;
};
/**
 * Input for subscribing to a plan
 */
type SubscribeInput = {
    /** Plan to subscribe to */
    plan: PublicKey;
    /** User's secret for commitment generation */
    userSecret: Uint8Array;
};
/**
 * Subscription with additional metadata
 */
type Subscription = {
    /** Public key of the subscription account PDA */
    publicKey: PublicKey;
    /** Plan this subscription belongs to */
    plan: PublicKey;
    /** Membership commitment (for verification) */
    membershipCommitment: Uint8Array;
    /** Unix timestamp when subscribed */
    subscribedAt: Date;
    /** Unix timestamp when cancelled (null if active) */
    cancelledAt: Date | null;
    /** Whether the subscription is active */
    isActive: boolean;
};
/**
 * Subscription list filter options
 */
type SubscriptionFilter = {
    /** Filter by plan */
    plan?: PublicKey;
    /** Filter by active status */
    isActive?: boolean;
    /** Maximum number of results */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
};
/**
 * Membership proof for verification
 */
type MembershipProof = {
    /** The subscription public key */
    subscription: PublicKey;
    /** The plan public key */
    plan: PublicKey;
    /** Membership commitment */
    commitment: Uint8Array;
    /** User's secret (never shared on-chain) */
    secret: Uint8Array;
};

/**
 * Network configuration for the SDK
 */
type NetworkConfig = {
    /** RPC endpoint URL */
    rpcUrl: string;
    /** Program ID */
    programId: PublicKey;
    /** Network name */
    network: "devnet" | "mainnet-beta" | "localnet";
};
/**
 * Transaction result with signature
 */
type TransactionResult = {
    /** Transaction signature */
    signature: string;
    /** Whether the transaction was successful */
    success: boolean;
    /** Error message if failed */
    error?: string;
};
/**
 * Encrypted data structure
 */
type EncryptedData = {
    /** Encrypted bytes */
    data: Uint8Array;
    /** Nonce used for encryption */
    nonce: bigint;
};
/**
 * Constants for the protocol
 */
declare const CONSTANTS: {
    /** Maximum name length in bytes */
    readonly MAX_NAME_LENGTH: 32;
    /** Maximum metadata URI length in bytes */
    readonly MAX_METADATA_URI_LENGTH: 128;
    /** USDC decimals */
    readonly USDC_DECIMALS: 6;
    /** Minimum billing cycle in seconds (1 hour) */
    readonly MIN_BILLING_CYCLE_SECONDS: 3600;
    /** Maximum billing cycle in seconds (365 days) */
    readonly MAX_BILLING_CYCLE_SECONDS: 31536000;
    /** PDA seeds */
    readonly SEEDS: {
        readonly BUSINESS: "business";
        readonly PLAN: "plan";
        readonly SUBSCRIPTION: "subscription";
    };
};

/**
 * Wallet adapter interface compatible with browser wallet extensions
 */
interface WalletAdapter {
    publicKey: PublicKey;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
}
/**
 * Configuration for SublyMembershipClient
 */
type SublyMembershipClientConfig = {
    /** Solana connection */
    connection: Connection;
    /** Wallet for signing transactions */
    wallet: WalletAdapter;
    /** Optional custom program ID */
    programId?: string;
};
/**
 * Main client for interacting with the Subly Membership Protocol
 */
declare class SublyMembershipClient {
    private connection;
    private wallet;
    private programId;
    private provider;
    private program;
    constructor(config: SublyMembershipClientConfig);
    /**
     * Register a new business
     * @param input - Business registration input
     * @returns Transaction result with signature
     */
    registerBusiness(input: RegisterBusinessInput): Promise<TransactionResult>;
    /**
     * Get business account for the connected wallet
     * @returns Business account or null if not found
     */
    getBusiness(): Promise<Business | null>;
    /**
     * Get business account by authority public key
     * @param authority - Authority public key
     * @returns Business account or null if not found
     */
    getBusinessByAuthority(authority: PublicKey): Promise<Business | null>;
    /**
     * Create a new subscription plan
     * @param input - Plan creation input
     * @returns Transaction result with signature
     */
    createPlan(input: CreatePlanInput): Promise<TransactionResult>;
    /**
     * Get plans for the connected wallet's business
     * @param filter - Optional filter options
     * @returns Array of plans
     */
    getPlans(filter?: PlanFilter): Promise<Plan[]>;
    /**
     * Get a specific plan by public key
     * @param planPubkey - Plan public key
     * @returns Plan or null if not found
     */
    getPlan(planPubkey: PublicKey): Promise<Plan | null>;
    /**
     * Deactivate a plan
     * @param planPubkey - Plan public key to deactivate
     * @returns Transaction result
     */
    deactivatePlan(planPubkey: PublicKey): Promise<TransactionResult>;
    /**
     * Subscribe to a plan
     * @param input - Subscription input
     * @returns Transaction result with signature and membership commitment
     */
    subscribe(input: SubscribeInput): Promise<TransactionResult & {
        membershipCommitment?: Uint8Array;
    }>;
    /**
     * Get subscriptions for a plan
     * @param planPubkey - Plan public key
     * @param filter - Optional filter options
     * @returns Array of subscriptions
     */
    getSubscriptions(planPubkey: PublicKey, filter?: SubscriptionFilter): Promise<Subscription[]>;
    /**
     * Cancel a subscription
     * @param subscriptionPubkey - Subscription public key
     * @returns Transaction result
     */
    cancelSubscription(subscriptionPubkey: PublicKey): Promise<TransactionResult>;
    /**
     * Get the encrypted subscription count for a plan
     * @param planPubkey - Plan public key
     * @returns Encrypted subscription count bytes
     */
    getSubscriptionCount(planPubkey: PublicKey): Promise<Uint8Array | null>;
    /**
     * Get the program ID
     */
    getProgramId(): PublicKey;
    /**
     * Get the connection
     */
    getConnection(): Connection;
    /**
     * Get the wallet public key
     */
    getWalletPublicKey(): PublicKey;
}

/**
 * Derive the business account PDA
 * @param authority - The authority (owner) of the business
 * @param programId - The program ID
 * @returns The business PDA and bump
 */
declare function deriveBusinessPda(authority: PublicKey, programId: PublicKey): [PublicKey, number];
/**
 * Derive the plan account PDA
 * @param business - The business account public key
 * @param planNonce - The sequential plan number
 * @param programId - The program ID
 * @returns The plan PDA and bump
 */
declare function derivePlanPda(business: PublicKey, planNonce: bigint | number, programId: PublicKey): [PublicKey, number];
/**
 * Derive the subscription account PDA
 * @param plan - The plan account public key
 * @param membershipCommitment - The membership commitment hash
 * @param programId - The program ID
 * @returns The subscription PDA and bump
 */
declare function deriveSubscriptionPda(plan: PublicKey, membershipCommitment: Uint8Array, programId: PublicKey): [PublicKey, number];
/**
 * Check if a PDA exists for a given business authority
 * @param authority - The authority to check
 * @param programId - The program ID
 * @returns The business PDA
 */
declare function getBusinessPdaForAuthority(authority: PublicKey, programId: PublicKey): PublicKey;

/**
 * Generate a random nonce for encryption
 * @returns A random 128-bit nonce as bigint
 */
declare function generateNonce(): bigint;
/**
 * Generate a user commitment from a secret and identifier
 * Uses SHA-256 hash
 * @param secret - User's secret bytes
 * @param identifier - Plan or business identifier
 * @returns 32-byte commitment hash
 */
declare function generateUserCommitment(secret: Uint8Array, identifier: Uint8Array): Promise<Uint8Array>;
/**
 * Generate a membership commitment from user commitment and plan
 * @param userCommitment - User's commitment
 * @param planPubkey - Plan public key bytes
 * @returns 32-byte membership commitment hash
 */
declare function generateMembershipCommitment(userCommitment: Uint8Array, planPubkey: Uint8Array): Promise<Uint8Array>;
/**
 * Generate a random user secret
 * @returns 32 random bytes
 */
declare function generateUserSecret(): Uint8Array;
/**
 * Simple encryption placeholder for plan name/description
 * In production, this should use Arcium MPC encryption
 * @param data - String data to encrypt
 * @param maxLength - Maximum output length
 * @returns Encrypted bytes (padded to maxLength)
 */
declare function encryptPlanData(data: string, maxLength: number): Uint8Array;
/**
 * Simple decryption placeholder for plan name/description
 * In production, this should use Arcium MPC decryption
 * @param data - Encrypted bytes
 * @returns Decrypted string
 */
declare function decryptPlanData(data: Uint8Array): string;
/**
 * Convert bigint to bytes (little-endian)
 */
declare function bigIntToBytes(value: bigint, length: number): Uint8Array;

/**
 * Convert USDC amount from human readable to on-chain format
 * @param amount - Human readable amount (e.g. 9.99)
 * @returns On-chain amount with 6 decimals
 */
declare function usdcToOnChain(amount: number): bigint;
/**
 * Convert USDC amount from on-chain to human readable format
 * @param amount - On-chain amount with 6 decimals
 * @returns Human readable amount
 */
declare function usdcFromOnChain(amount: bigint | number): number;
/**
 * Convert days to seconds
 * @param days - Number of days
 * @returns Number of seconds
 */
declare function daysToSeconds(days: number): number;
/**
 * Convert seconds to days
 * @param seconds - Number of seconds
 * @returns Number of days
 */
declare function secondsToDays(seconds: number): number;
/**
 * Format USDC amount for display
 * @param amount - Amount in on-chain format
 * @returns Formatted string (e.g. "$9.99")
 */
declare function formatUsdc(amount: bigint | number): string;
/**
 * Format billing cycle for display
 * @param seconds - Billing cycle in seconds
 * @returns Human readable string (e.g. "30 days", "1 year")
 */
declare function formatBillingCycle(seconds: number): string;
/**
 * Convert Unix timestamp to Date
 * @param timestamp - Unix timestamp (seconds)
 * @returns Date object
 */
declare function timestampToDate(timestamp: bigint | number): Date;
/**
 * Convert Date to Unix timestamp
 * @param date - Date object
 * @returns Unix timestamp (seconds)
 */
declare function dateToTimestamp(date: Date): bigint;

/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/subly_devnet.json`.
 */
type SublyDevnet = {
    "address": "2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA";
    "metadata": {
        "name": "sublyDevnet";
        "version": "0.1.0";
        "spec": "0.1.0";
        "description": "Created with Arcium & Anchor";
    };
    "instructions": [
        {
            "name": "cancelSubscription";
            "docs": [
                "Cancel a subscription"
            ];
            "discriminator": [
                60,
                139,
                189,
                242,
                191,
                208,
                143,
                18
            ];
            "accounts": [
                {
                    "name": "userAccount";
                    "docs": [
                        "The user who owns the subscription"
                    ];
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "subscriptionAccount";
                    "docs": [
                        "The subscription to cancel"
                    ];
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    115,
                                    117,
                                    98,
                                    115,
                                    99,
                                    114,
                                    105,
                                    112,
                                    116,
                                    105,
                                    111,
                                    110
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "subscription_account.plan";
                                "account": "subscription";
                            },
                            {
                                "kind": "account";
                                "path": "subscription_account.membership_commitment";
                                "account": "subscription";
                            }
                        ];
                    };
                }
            ];
            "args": [];
        },
        {
            "name": "createPlan";
            "docs": [
                "Create a new subscription plan"
            ];
            "discriminator": [
                77,
                43,
                141,
                254,
                212,
                118,
                41,
                186
            ];
            "accounts": [
                {
                    "name": "authorityAccount";
                    "docs": [
                        "The authority (owner) of the business"
                    ];
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "businessAccount";
                    "docs": [
                        "The business account that owns this plan"
                    ];
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    98,
                                    117,
                                    115,
                                    105,
                                    110,
                                    101,
                                    115,
                                    115
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "authorityAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "planAccount";
                    "docs": [
                        "The plan account PDA to create"
                    ];
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    112,
                                    108,
                                    97,
                                    110
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "businessAccount";
                            },
                            {
                                "kind": "account";
                                "path": "business_account.plan_count";
                                "account": "businessAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "docs": [
                        "System program for account creation"
                    ];
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "encryptedName";
                    "type": {
                        "array": [
                            "u8",
                            32
                        ];
                    };
                },
                {
                    "name": "encryptedDescription";
                    "type": {
                        "array": [
                            "u8",
                            64
                        ];
                    };
                },
                {
                    "name": "priceUsdc";
                    "type": "u64";
                },
                {
                    "name": "billingCycleSeconds";
                    "type": "u32";
                },
                {
                    "name": "nonce";
                    "type": "u128";
                }
            ];
        },
        {
            "name": "deactivatePlan";
            "docs": [
                "Deactivate a plan (business owner only)"
            ];
            "discriminator": [
                91,
                38,
                214,
                232,
                172,
                21,
                30,
                93
            ];
            "accounts": [
                {
                    "name": "authorityAccount";
                    "docs": [
                        "The authority (owner) of the business"
                    ];
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "businessAccount";
                    "docs": [
                        "The business account that owns this plan"
                    ];
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    98,
                                    117,
                                    115,
                                    105,
                                    110,
                                    101,
                                    115,
                                    115
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "authorityAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "planAccount";
                    "docs": [
                        "The plan to deactivate"
                    ];
                    "writable": true;
                }
            ];
            "args": [];
        },
        {
            "name": "getSubscriptionCount";
            "docs": [
                "Get the encrypted subscription count for a plan",
                "Returns the encrypted count that can be decrypted by authorized parties"
            ];
            "discriminator": [
                12,
                149,
                103,
                233,
                78,
                193,
                31,
                116
            ];
            "accounts": [
                {
                    "name": "planAccount";
                    "docs": [
                        "The plan to get subscription count for"
                    ];
                }
            ];
            "args": [];
            "returns": {
                "array": [
                    "u8",
                    32
                ];
            };
        },
        {
            "name": "registerBusiness";
            "docs": [
                "Register a new business account"
            ];
            "discriminator": [
                73,
                228,
                5,
                59,
                229,
                67,
                133,
                82
            ];
            "accounts": [
                {
                    "name": "authorityAccount";
                    "docs": [
                        "The authority (owner) of the business"
                    ];
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "businessAccount";
                    "docs": [
                        "The business account PDA to create"
                    ];
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    98,
                                    117,
                                    115,
                                    105,
                                    110,
                                    101,
                                    115,
                                    115
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "authorityAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "docs": [
                        "System program for account creation"
                    ];
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "name";
                    "type": "string";
                },
                {
                    "name": "metadataUri";
                    "type": "string";
                }
            ];
        },
        {
            "name": "subscribe";
            "docs": [
                "Subscribe to a plan"
            ];
            "discriminator": [
                254,
                28,
                191,
                138,
                156,
                179,
                183,
                53
            ];
            "accounts": [
                {
                    "name": "userAccount";
                    "docs": [
                        "The user subscribing to the plan"
                    ];
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "planAccount";
                    "docs": [
                        "The plan being subscribed to"
                    ];
                    "writable": true;
                },
                {
                    "name": "subscriptionAccount";
                    "docs": [
                        "The subscription account PDA to create"
                    ];
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    115,
                                    117,
                                    98,
                                    115,
                                    99,
                                    114,
                                    105,
                                    112,
                                    116,
                                    105,
                                    111,
                                    110
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "planAccount";
                            },
                            {
                                "kind": "arg";
                                "path": "membershipCommitment";
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "docs": [
                        "System program for account creation"
                    ];
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "encryptedUserCommitment";
                    "type": {
                        "array": [
                            "u8",
                            32
                        ];
                    };
                },
                {
                    "name": "membershipCommitment";
                    "type": {
                        "array": [
                            "u8",
                            32
                        ];
                    };
                },
                {
                    "name": "nonce";
                    "type": "u128";
                }
            ];
        }
    ];
    "accounts": [
        {
            "name": "businessAccount";
            "discriminator": [
                100,
                69,
                101,
                155,
                14,
                22,
                236,
                75
            ];
        },
        {
            "name": "plan";
            "discriminator": [
                161,
                231,
                251,
                119,
                2,
                12,
                162,
                2
            ];
        },
        {
            "name": "subscription";
            "discriminator": [
                64,
                7,
                26,
                135,
                102,
                132,
                98,
                33
            ];
        }
    ];
    "events": [
        {
            "name": "businessRegisteredEvent";
            "discriminator": [
                36,
                176,
                169,
                7,
                22,
                245,
                251,
                56
            ];
        },
        {
            "name": "planCreatedEvent";
            "discriminator": [
                90,
                228,
                165,
                118,
                177,
                85,
                51,
                192
            ];
        },
        {
            "name": "subscriptionCountUpdatedEvent";
            "discriminator": [
                33,
                158,
                149,
                107,
                205,
                143,
                223,
                139
            ];
        },
        {
            "name": "subscriptionCreatedEvent";
            "discriminator": [
                247,
                246,
                115,
                176,
                253,
                84,
                244,
                155
            ];
        }
    ];
    "errors": [
        {
            "code": 6000;
            "name": "businessAlreadyExists";
            "msg": "Business account already exists";
        },
        {
            "code": 6001;
            "name": "planNotFound";
            "msg": "Plan not found";
        },
        {
            "code": 6002;
            "name": "planNotActive";
            "msg": "Plan is not active";
        },
        {
            "code": 6003;
            "name": "subscriptionAlreadyExists";
            "msg": "Subscription already exists";
        },
        {
            "code": 6004;
            "name": "subscriptionNotActive";
            "msg": "Subscription is not active";
        },
        {
            "code": 6005;
            "name": "unauthorized";
            "msg": "Unauthorized access";
        },
        {
            "code": 6006;
            "name": "mxeComputationFailed";
            "msg": "MXE computation failed";
        },
        {
            "code": 6007;
            "name": "invalidComputationOutput";
            "msg": "Invalid computation output";
        },
        {
            "code": 6008;
            "name": "clusterNotSet";
            "msg": "Cluster not set";
        },
        {
            "code": 6009;
            "name": "abortedComputation";
            "msg": "The computation was aborted";
        },
        {
            "code": 6010;
            "name": "invalidNameLength";
            "msg": "Invalid name length";
        },
        {
            "code": 6011;
            "name": "invalidMetadataUriLength";
            "msg": "Invalid metadata URI length";
        },
        {
            "code": 6012;
            "name": "invalidPrice";
            "msg": "Invalid price";
        },
        {
            "code": 6013;
            "name": "invalidBillingCycle";
            "msg": "Invalid billing cycle";
        }
    ];
    "types": [
        {
            "name": "businessAccount";
            "docs": [
                "Business Account - stores business information",
                "PDA seeds: [\"business\", authority]"
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "authority";
                        "docs": [
                            "Business owner's wallet address"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "name";
                        "docs": [
                            "Business name (max 32 characters)"
                        ];
                        "type": "string";
                    },
                    {
                        "name": "metadataUri";
                        "docs": [
                            "Metadata URI (max 128 characters)"
                        ];
                        "type": "string";
                    },
                    {
                        "name": "createdAt";
                        "docs": [
                            "Account creation timestamp"
                        ];
                        "type": "i64";
                    },
                    {
                        "name": "isActive";
                        "docs": [
                            "Whether the business is active"
                        ];
                        "type": "bool";
                    },
                    {
                        "name": "planCount";
                        "docs": [
                            "Number of plans created by this business"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "bump";
                        "docs": [
                            "PDA bump"
                        ];
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "businessRegisteredEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "business";
                        "type": "pubkey";
                    },
                    {
                        "name": "authority";
                        "type": "pubkey";
                    },
                    {
                        "name": "name";
                        "type": "string";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "plan";
            "docs": [
                "Plan - stores subscription plan information",
                "PDA seeds: [\"plan\", business, plan_nonce]"
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "planId";
                        "docs": [
                            "Plan's own address (for reference)"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "business";
                        "docs": [
                            "Reference to business account"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "encryptedName";
                        "docs": [
                            "Encrypted plan name (Arcium encrypted)"
                        ];
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "encryptedDescription";
                        "docs": [
                            "Encrypted plan description (Arcium encrypted)"
                        ];
                        "type": {
                            "array": [
                                "u8",
                                64
                            ];
                        };
                    },
                    {
                        "name": "priceUsdc";
                        "docs": [
                            "Price in USDC (6 decimals, e.g., 10_000_000 = 10 USDC)"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "billingCycleSeconds";
                        "docs": [
                            "Billing cycle in seconds"
                        ];
                        "type": "u32";
                    },
                    {
                        "name": "createdAt";
                        "docs": [
                            "Plan creation timestamp"
                        ];
                        "type": "i64";
                    },
                    {
                        "name": "isActive";
                        "docs": [
                            "Whether the plan is active"
                        ];
                        "type": "bool";
                    },
                    {
                        "name": "encryptedSubscriptionCount";
                        "docs": [
                            "Encrypted subscription count (Arcium encrypted, only count is known)"
                        ];
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "nonce";
                        "docs": [
                            "Nonce for encryption"
                        ];
                        "type": "u128";
                    },
                    {
                        "name": "planNonce";
                        "docs": [
                            "Plan nonce (sequential number for this business)"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "bump";
                        "docs": [
                            "PDA bump"
                        ];
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "planCreatedEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "plan";
                        "type": "pubkey";
                    },
                    {
                        "name": "business";
                        "type": "pubkey";
                    },
                    {
                        "name": "priceUsdc";
                        "type": "u64";
                    },
                    {
                        "name": "billingCycleSeconds";
                        "type": "u32";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "subscription";
            "docs": [
                "Subscription - stores subscription contract information",
                "PDA seeds: [\"subscription\", plan, user_commitment]"
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "subscriptionId";
                        "docs": [
                            "Subscription's own address (for reference)"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "plan";
                        "docs": [
                            "Reference to plan account"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "encryptedUserCommitment";
                        "docs": [
                            "Encrypted user commitment (Arcium encrypted)",
                            "user_commitment = hash(secret || plan_id)"
                        ];
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "membershipCommitment";
                        "docs": [
                            "Membership commitment for Light Protocol ZK proofs"
                        ];
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "subscribedAt";
                        "docs": [
                            "Subscription creation timestamp"
                        ];
                        "type": "i64";
                    },
                    {
                        "name": "cancelledAt";
                        "docs": [
                            "Cancellation timestamp (0 if not cancelled)"
                        ];
                        "type": "i64";
                    },
                    {
                        "name": "isActive";
                        "docs": [
                            "Whether the subscription is active"
                        ];
                        "type": "bool";
                    },
                    {
                        "name": "nonce";
                        "docs": [
                            "Nonce for encryption"
                        ];
                        "type": "u128";
                    },
                    {
                        "name": "bump";
                        "docs": [
                            "PDA bump"
                        ];
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "subscriptionCountUpdatedEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "plan";
                        "type": "pubkey";
                    },
                    {
                        "name": "encryptedCount";
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "nonce";
                        "type": {
                            "array": [
                                "u8",
                                16
                            ];
                        };
                    }
                ];
            };
        },
        {
            "name": "subscriptionCreatedEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "subscription";
                        "type": "pubkey";
                    },
                    {
                        "name": "plan";
                        "type": "pubkey";
                    },
                    {
                        "name": "membershipCommitment";
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        }
    ];
};

/** Program ID for Subly Devnet */
declare const PROGRAM_ID = "2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA";

declare const IDL: any;

export { type Business, type BusinessAccount, CONSTANTS, type CreatePlanInput, type EncryptedData, IDL, type MembershipProof, type NetworkConfig, PROGRAM_ID, type Plan, type PlanAccount, type PlanFilter, type RegisterBusinessInput, type SublyDevnet, SublyMembershipClient, type SublyMembershipClientConfig, type SubscribeInput, type Subscription, type SubscriptionAccount, type SubscriptionFilter, type TransactionResult, bigIntToBytes, dateToTimestamp, daysToSeconds, decryptPlanData, deriveBusinessPda, derivePlanPda, deriveSubscriptionPda, encryptPlanData, formatBillingCycle, formatUsdc, generateMembershipCommitment, generateNonce, generateUserCommitment, generateUserSecret, getBusinessPdaForAuthority, secondsToDays, timestampToDate, usdcFromOnChain, usdcToOnChain };
