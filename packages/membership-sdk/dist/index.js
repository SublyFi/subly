"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CONSTANTS: () => CONSTANTS,
  IDL: () => IDL,
  PROGRAM_ID: () => PROGRAM_ID,
  SublyMembershipClient: () => SublyMembershipClient,
  bigIntToBytes: () => bigIntToBytes,
  dateToTimestamp: () => dateToTimestamp,
  daysToSeconds: () => daysToSeconds,
  decryptPlanData: () => decryptPlanData,
  deriveBusinessPda: () => deriveBusinessPda,
  derivePlanPda: () => derivePlanPda,
  deriveSubscriptionPda: () => deriveSubscriptionPda,
  encryptPlanData: () => encryptPlanData,
  formatBillingCycle: () => formatBillingCycle,
  formatUsdc: () => formatUsdc,
  generateMembershipCommitment: () => generateMembershipCommitment,
  generateNonce: () => generateNonce,
  generateUserCommitment: () => generateUserCommitment,
  generateUserSecret: () => generateUserSecret,
  getBusinessPdaForAuthority: () => getBusinessPdaForAuthority,
  secondsToDays: () => secondsToDays,
  timestampToDate: () => timestampToDate,
  usdcFromOnChain: () => usdcFromOnChain,
  usdcToOnChain: () => usdcToOnChain
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_web32 = require("@solana/web3.js");
var import_anchor = require("@coral-xyz/anchor");

// src/idl/subly_devnet.json
var subly_devnet_default = {
  address: "2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA",
  metadata: {
    name: "subly_devnet",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Arcium & Anchor"
  },
  instructions: [
    {
      name: "cancel_subscription",
      docs: [
        "Cancel a subscription"
      ],
      discriminator: [
        60,
        139,
        189,
        242,
        191,
        208,
        143,
        18
      ],
      accounts: [
        {
          name: "user_account",
          docs: [
            "The user who owns the subscription"
          ],
          writable: true,
          signer: true
        },
        {
          name: "subscription_account",
          docs: [
            "The subscription to cancel"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
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
                ]
              },
              {
                kind: "account",
                path: "subscription_account.plan",
                account: "Subscription"
              },
              {
                kind: "account",
                path: "subscription_account.membership_commitment",
                account: "Subscription"
              }
            ]
          }
        }
      ],
      args: []
    },
    {
      name: "create_plan",
      docs: [
        "Create a new subscription plan"
      ],
      discriminator: [
        77,
        43,
        141,
        254,
        212,
        118,
        41,
        186
      ],
      accounts: [
        {
          name: "authority_account",
          docs: [
            "The authority (owner) of the business"
          ],
          writable: true,
          signer: true
        },
        {
          name: "business_account",
          docs: [
            "The business account that owns this plan"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                kind: "account",
                path: "authority_account"
              }
            ]
          }
        },
        {
          name: "plan_account",
          docs: [
            "The plan account PDA to create"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  108,
                  97,
                  110
                ]
              },
              {
                kind: "account",
                path: "business_account"
              },
              {
                kind: "account",
                path: "business_account.plan_count",
                account: "BusinessAccount"
              }
            ]
          }
        },
        {
          name: "system_program",
          docs: [
            "System program for account creation"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "encrypted_name",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_description",
          type: {
            array: [
              "u8",
              64
            ]
          }
        },
        {
          name: "price_usdc",
          type: "u64"
        },
        {
          name: "billing_cycle_seconds",
          type: "u32"
        },
        {
          name: "nonce",
          type: "u128"
        }
      ]
    },
    {
      name: "deactivate_plan",
      docs: [
        "Deactivate a plan (business owner only)"
      ],
      discriminator: [
        91,
        38,
        214,
        232,
        172,
        21,
        30,
        93
      ],
      accounts: [
        {
          name: "authority_account",
          docs: [
            "The authority (owner) of the business"
          ],
          writable: true,
          signer: true
        },
        {
          name: "business_account",
          docs: [
            "The business account that owns this plan"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                kind: "account",
                path: "authority_account"
              }
            ]
          }
        },
        {
          name: "plan_account",
          docs: [
            "The plan to deactivate"
          ],
          writable: true
        }
      ],
      args: []
    },
    {
      name: "get_subscription_count",
      docs: [
        "Get the encrypted subscription count for a plan",
        "Returns the encrypted count that can be decrypted by authorized parties"
      ],
      discriminator: [
        12,
        149,
        103,
        233,
        78,
        193,
        31,
        116
      ],
      accounts: [
        {
          name: "plan_account",
          docs: [
            "The plan to get subscription count for"
          ]
        }
      ],
      args: [],
      returns: {
        array: [
          "u8",
          32
        ]
      }
    },
    {
      name: "register_business",
      docs: [
        "Register a new business account"
      ],
      discriminator: [
        73,
        228,
        5,
        59,
        229,
        67,
        133,
        82
      ],
      accounts: [
        {
          name: "authority_account",
          docs: [
            "The authority (owner) of the business"
          ],
          writable: true,
          signer: true
        },
        {
          name: "business_account",
          docs: [
            "The business account PDA to create"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                kind: "account",
                path: "authority_account"
              }
            ]
          }
        },
        {
          name: "system_program",
          docs: [
            "System program for account creation"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "name",
          type: "string"
        },
        {
          name: "metadata_uri",
          type: "string"
        }
      ]
    },
    {
      name: "subscribe",
      docs: [
        "Subscribe to a plan"
      ],
      discriminator: [
        254,
        28,
        191,
        138,
        156,
        179,
        183,
        53
      ],
      accounts: [
        {
          name: "user_account",
          docs: [
            "The user subscribing to the plan"
          ],
          writable: true,
          signer: true
        },
        {
          name: "plan_account",
          docs: [
            "The plan being subscribed to"
          ],
          writable: true
        },
        {
          name: "subscription_account",
          docs: [
            "The subscription account PDA to create"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
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
                ]
              },
              {
                kind: "account",
                path: "plan_account"
              },
              {
                kind: "arg",
                path: "membership_commitment"
              }
            ]
          }
        },
        {
          name: "system_program",
          docs: [
            "System program for account creation"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "encrypted_user_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "membership_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nonce",
          type: "u128"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "BusinessAccount",
      discriminator: [
        100,
        69,
        101,
        155,
        14,
        22,
        236,
        75
      ]
    },
    {
      name: "Plan",
      discriminator: [
        161,
        231,
        251,
        119,
        2,
        12,
        162,
        2
      ]
    },
    {
      name: "Subscription",
      discriminator: [
        64,
        7,
        26,
        135,
        102,
        132,
        98,
        33
      ]
    }
  ],
  events: [
    {
      name: "BusinessRegisteredEvent",
      discriminator: [
        36,
        176,
        169,
        7,
        22,
        245,
        251,
        56
      ]
    },
    {
      name: "PlanCreatedEvent",
      discriminator: [
        90,
        228,
        165,
        118,
        177,
        85,
        51,
        192
      ]
    },
    {
      name: "SubscriptionCountUpdatedEvent",
      discriminator: [
        33,
        158,
        149,
        107,
        205,
        143,
        223,
        139
      ]
    },
    {
      name: "SubscriptionCreatedEvent",
      discriminator: [
        247,
        246,
        115,
        176,
        253,
        84,
        244,
        155
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "BusinessAlreadyExists",
      msg: "Business account already exists"
    },
    {
      code: 6001,
      name: "PlanNotFound",
      msg: "Plan not found"
    },
    {
      code: 6002,
      name: "PlanNotActive",
      msg: "Plan is not active"
    },
    {
      code: 6003,
      name: "SubscriptionAlreadyExists",
      msg: "Subscription already exists"
    },
    {
      code: 6004,
      name: "SubscriptionNotActive",
      msg: "Subscription is not active"
    },
    {
      code: 6005,
      name: "Unauthorized",
      msg: "Unauthorized access"
    },
    {
      code: 6006,
      name: "MxeComputationFailed",
      msg: "MXE computation failed"
    },
    {
      code: 6007,
      name: "InvalidComputationOutput",
      msg: "Invalid computation output"
    },
    {
      code: 6008,
      name: "ClusterNotSet",
      msg: "Cluster not set"
    },
    {
      code: 6009,
      name: "AbortedComputation",
      msg: "The computation was aborted"
    },
    {
      code: 6010,
      name: "InvalidNameLength",
      msg: "Invalid name length"
    },
    {
      code: 6011,
      name: "InvalidMetadataUriLength",
      msg: "Invalid metadata URI length"
    },
    {
      code: 6012,
      name: "InvalidPrice",
      msg: "Invalid price"
    },
    {
      code: 6013,
      name: "InvalidBillingCycle",
      msg: "Invalid billing cycle"
    }
  ],
  types: [
    {
      name: "BusinessAccount",
      docs: [
        "Business Account - stores business information",
        'PDA seeds: ["business", authority]'
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            docs: [
              "Business owner's wallet address"
            ],
            type: "pubkey"
          },
          {
            name: "name",
            docs: [
              "Business name (max 32 characters)"
            ],
            type: "string"
          },
          {
            name: "metadata_uri",
            docs: [
              "Metadata URI (max 128 characters)"
            ],
            type: "string"
          },
          {
            name: "created_at",
            docs: [
              "Account creation timestamp"
            ],
            type: "i64"
          },
          {
            name: "is_active",
            docs: [
              "Whether the business is active"
            ],
            type: "bool"
          },
          {
            name: "plan_count",
            docs: [
              "Number of plans created by this business"
            ],
            type: "u64"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "BusinessRegisteredEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "business",
            type: "pubkey"
          },
          {
            name: "authority",
            type: "pubkey"
          },
          {
            name: "name",
            type: "string"
          },
          {
            name: "timestamp",
            type: "i64"
          }
        ]
      }
    },
    {
      name: "Plan",
      docs: [
        "Plan - stores subscription plan information",
        'PDA seeds: ["plan", business, plan_nonce]'
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "plan_id",
            docs: [
              "Plan's own address (for reference)"
            ],
            type: "pubkey"
          },
          {
            name: "business",
            docs: [
              "Reference to business account"
            ],
            type: "pubkey"
          },
          {
            name: "encrypted_name",
            docs: [
              "Encrypted plan name (Arcium encrypted)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "encrypted_description",
            docs: [
              "Encrypted plan description (Arcium encrypted)"
            ],
            type: {
              array: [
                "u8",
                64
              ]
            }
          },
          {
            name: "price_usdc",
            docs: [
              "Price in USDC (6 decimals, e.g., 10_000_000 = 10 USDC)"
            ],
            type: "u64"
          },
          {
            name: "billing_cycle_seconds",
            docs: [
              "Billing cycle in seconds"
            ],
            type: "u32"
          },
          {
            name: "created_at",
            docs: [
              "Plan creation timestamp"
            ],
            type: "i64"
          },
          {
            name: "is_active",
            docs: [
              "Whether the plan is active"
            ],
            type: "bool"
          },
          {
            name: "encrypted_subscription_count",
            docs: [
              "Encrypted subscription count (Arcium encrypted, only count is known)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "nonce",
            docs: [
              "Nonce for encryption"
            ],
            type: "u128"
          },
          {
            name: "plan_nonce",
            docs: [
              "Plan nonce (sequential number for this business)"
            ],
            type: "u64"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "PlanCreatedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "plan",
            type: "pubkey"
          },
          {
            name: "business",
            type: "pubkey"
          },
          {
            name: "price_usdc",
            type: "u64"
          },
          {
            name: "billing_cycle_seconds",
            type: "u32"
          },
          {
            name: "timestamp",
            type: "i64"
          }
        ]
      }
    },
    {
      name: "Subscription",
      docs: [
        "Subscription - stores subscription contract information",
        'PDA seeds: ["subscription", plan, user_commitment]'
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "subscription_id",
            docs: [
              "Subscription's own address (for reference)"
            ],
            type: "pubkey"
          },
          {
            name: "plan",
            docs: [
              "Reference to plan account"
            ],
            type: "pubkey"
          },
          {
            name: "encrypted_user_commitment",
            docs: [
              "Encrypted user commitment (Arcium encrypted)",
              "user_commitment = hash(secret || plan_id)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "membership_commitment",
            docs: [
              "Membership commitment for Light Protocol ZK proofs"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "subscribed_at",
            docs: [
              "Subscription creation timestamp"
            ],
            type: "i64"
          },
          {
            name: "cancelled_at",
            docs: [
              "Cancellation timestamp (0 if not cancelled)"
            ],
            type: "i64"
          },
          {
            name: "is_active",
            docs: [
              "Whether the subscription is active"
            ],
            type: "bool"
          },
          {
            name: "nonce",
            docs: [
              "Nonce for encryption"
            ],
            type: "u128"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "SubscriptionCountUpdatedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "plan",
            type: "pubkey"
          },
          {
            name: "encrypted_count",
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "nonce",
            type: {
              array: [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      name: "SubscriptionCreatedEvent",
      type: {
        kind: "struct",
        fields: [
          {
            name: "subscription",
            type: "pubkey"
          },
          {
            name: "plan",
            type: "pubkey"
          },
          {
            name: "membership_commitment",
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "timestamp",
            type: "i64"
          }
        ]
      }
    }
  ]
};

// src/idl/subly_devnet.ts
var PROGRAM_ID = "2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA";
var IDL = subly_devnet_default;

// src/types/common.ts
var CONSTANTS = {
  /** Maximum name length in bytes */
  MAX_NAME_LENGTH: 32,
  /** Maximum metadata URI length in bytes */
  MAX_METADATA_URI_LENGTH: 128,
  /** USDC decimals */
  USDC_DECIMALS: 6,
  /** Minimum billing cycle in seconds (1 hour) */
  MIN_BILLING_CYCLE_SECONDS: 3600,
  /** Maximum billing cycle in seconds (365 days) */
  MAX_BILLING_CYCLE_SECONDS: 31536e3,
  /** PDA seeds */
  SEEDS: {
    BUSINESS: "business",
    PLAN: "plan",
    SUBSCRIPTION: "subscription"
  }
};

// src/utils/pda.ts
var import_web3 = require("@solana/web3.js");
function deriveBusinessPda(authority, programId) {
  return import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONSTANTS.SEEDS.BUSINESS), authority.toBuffer()],
    programId
  );
}
function derivePlanPda(business, planNonce, programId) {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(planNonce));
  return import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONSTANTS.SEEDS.PLAN), business.toBuffer(), nonceBuffer],
    programId
  );
}
function deriveSubscriptionPda(plan, membershipCommitment, programId) {
  return import_web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONSTANTS.SEEDS.SUBSCRIPTION),
      plan.toBuffer(),
      Buffer.from(membershipCommitment)
    ],
    programId
  );
}
function getBusinessPdaForAuthority(authority, programId) {
  const [pda] = deriveBusinessPda(authority, programId);
  return pda;
}

// src/utils/encryption.ts
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBigInt(bytes);
}
async function generateUserCommitment(secret, identifier) {
  const combined = new Uint8Array(secret.length + identifier.length);
  combined.set(secret, 0);
  combined.set(identifier, secret.length);
  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(hashBuffer);
}
async function generateMembershipCommitment(userCommitment, planPubkey) {
  const combined = new Uint8Array(userCommitment.length + planPubkey.length);
  combined.set(userCommitment, 0);
  combined.set(planPubkey, userCommitment.length);
  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(hashBuffer);
}
function generateUserSecret() {
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return secret;
}
function encryptPlanData(data, maxLength) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const result = new Uint8Array(maxLength);
  const copyLength = Math.min(encoded.length, maxLength);
  result.set(encoded.slice(0, copyLength), 0);
  return result;
}
function decryptPlanData(data) {
  const decoder = new TextDecoder();
  let endIndex = data.indexOf(0);
  if (endIndex === -1) endIndex = data.length;
  return decoder.decode(data.slice(0, endIndex));
}
function bytesToBigInt(bytes) {
  let result = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = result << BigInt(8) | BigInt(bytes[i]);
  }
  return result;
}
function bigIntToBytes(value, length) {
  const bytes = new Uint8Array(length);
  let remaining = value;
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(remaining & BigInt(255));
    remaining = remaining >> BigInt(8);
  }
  return bytes;
}

// src/utils/format.ts
function usdcToOnChain(amount) {
  return BigInt(Math.round(amount * 10 ** CONSTANTS.USDC_DECIMALS));
}
function usdcFromOnChain(amount) {
  return Number(amount) / 10 ** CONSTANTS.USDC_DECIMALS;
}
function daysToSeconds(days) {
  return Math.round(days * 24 * 60 * 60);
}
function secondsToDays(seconds) {
  return seconds / (24 * 60 * 60);
}
function formatUsdc(amount) {
  const value = usdcFromOnChain(amount);
  return `$${value.toFixed(2)}`;
}
function formatBillingCycle(seconds) {
  const days = secondsToDays(seconds);
  if (days >= 365) {
    const years = Math.round(days / 365);
    return years === 1 ? "1 year" : `${years} years`;
  } else if (days >= 30) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  } else if (days >= 7) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  } else {
    return days === 1 ? "1 day" : `${Math.round(days)} days`;
  }
}
function timestampToDate(timestamp) {
  return new Date(Number(timestamp) * 1e3);
}
function dateToTimestamp(date) {
  return BigInt(Math.floor(date.getTime() / 1e3));
}

// src/client.ts
var SublyMembershipClient = class {
  connection;
  wallet;
  programId;
  provider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program;
  constructor(config) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = new import_web32.PublicKey(config.programId ?? PROGRAM_ID);
    this.provider = new import_anchor.AnchorProvider(
      this.connection,
      this.wallet,
      import_anchor.AnchorProvider.defaultOptions()
    );
    this.program = new import_anchor.Program(IDL, this.provider);
  }
  // ============================================
  // Business Operations
  // ============================================
  /**
   * Register a new business
   * @param input - Business registration input
   * @returns Transaction result with signature
   */
  async registerBusiness(input) {
    try {
      if (input.name.length > CONSTANTS.MAX_NAME_LENGTH) {
        throw new Error(`Name exceeds maximum length of ${CONSTANTS.MAX_NAME_LENGTH}`);
      }
      if (input.metadataUri.length > CONSTANTS.MAX_METADATA_URI_LENGTH) {
        throw new Error(
          `Metadata URI exceeds maximum length of ${CONSTANTS.MAX_METADATA_URI_LENGTH}`
        );
      }
      const [businessPda] = deriveBusinessPda(
        this.wallet.publicKey,
        this.programId
      );
      const signature = await this.program.methods.registerBusiness(input.name, input.metadataUri).accounts({
        authorityAccount: this.wallet.publicKey,
        businessAccount: businessPda,
        systemProgram: import_web32.SystemProgram.programId
      }).rpc();
      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Get business account for the connected wallet
   * @returns Business account or null if not found
   */
  async getBusiness() {
    try {
      const [businessPda] = deriveBusinessPda(
        this.wallet.publicKey,
        this.programId
      );
      const account = await this.program.account.businessAccount.fetch(businessPda);
      return {
        publicKey: businessPda,
        authority: account.authority,
        name: account.name,
        metadataUri: account.metadataUri,
        createdAt: BigInt(account.createdAt.toString()),
        isActive: account.isActive,
        planCount: BigInt(account.planCount.toString()),
        bump: account.bump
      };
    } catch {
      return null;
    }
  }
  /**
   * Get business account by authority public key
   * @param authority - Authority public key
   * @returns Business account or null if not found
   */
  async getBusinessByAuthority(authority) {
    try {
      const [businessPda] = deriveBusinessPda(authority, this.programId);
      const account = await this.program.account.businessAccount.fetch(businessPda);
      return {
        publicKey: businessPda,
        authority: account.authority,
        name: account.name,
        metadataUri: account.metadataUri,
        createdAt: BigInt(account.createdAt.toString()),
        isActive: account.isActive,
        planCount: BigInt(account.planCount.toString()),
        bump: account.bump
      };
    } catch {
      return null;
    }
  }
  // ============================================
  // Plan Operations
  // ============================================
  /**
   * Create a new subscription plan
   * @param input - Plan creation input
   * @returns Transaction result with signature
   */
  async createPlan(input) {
    try {
      if (input.priceUsdc <= 0) {
        throw new Error("Price must be greater than 0");
      }
      const billingCycleSeconds = daysToSeconds(input.billingCycleDays);
      if (billingCycleSeconds < CONSTANTS.MIN_BILLING_CYCLE_SECONDS || billingCycleSeconds > CONSTANTS.MAX_BILLING_CYCLE_SECONDS) {
        throw new Error(
          `Billing cycle must be between ${secondsToDays(CONSTANTS.MIN_BILLING_CYCLE_SECONDS)} and ${secondsToDays(CONSTANTS.MAX_BILLING_CYCLE_SECONDS)} days`
        );
      }
      const business = await this.getBusiness();
      if (!business) {
        throw new Error("Business not registered");
      }
      const encryptedName = encryptPlanData(input.name, 32);
      const encryptedDescription = encryptPlanData(input.description, 64);
      const nonce = generateNonce();
      const [planPda] = derivePlanPda(
        business.publicKey,
        business.planCount,
        this.programId
      );
      const signature = await this.program.methods.createPlan(
        Array.from(encryptedName),
        Array.from(encryptedDescription),
        new import_anchor.BN(usdcToOnChain(input.priceUsdc).toString()),
        billingCycleSeconds,
        new import_anchor.BN(nonce.toString())
      ).accounts({
        authorityAccount: this.wallet.publicKey,
        businessAccount: business.publicKey,
        planAccount: planPda,
        systemProgram: import_web32.SystemProgram.programId
      }).rpc();
      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Get plans for the connected wallet's business
   * @param filter - Optional filter options
   * @returns Array of plans
   */
  async getPlans(filter) {
    try {
      const business = filter?.business ? await this.getBusinessByAuthority(filter.business) : await this.getBusiness();
      if (!business) {
        return [];
      }
      const plans = [];
      const limit = filter?.limit ?? 100;
      const offset = filter?.offset ?? 0;
      for (let i = offset; i < Number(business.planCount) && plans.length < limit; i++) {
        try {
          const [planPda] = derivePlanPda(business.publicKey, BigInt(i), this.programId);
          const account = await this.program.account.plan.fetch(planPda);
          if (filter?.isActive !== void 0 && account.isActive !== filter.isActive) {
            continue;
          }
          plans.push({
            publicKey: planPda,
            business: account.business,
            name: decryptPlanData(new Uint8Array(account.encryptedName)),
            description: decryptPlanData(new Uint8Array(account.encryptedDescription)),
            priceUsdc: usdcFromOnChain(BigInt(account.priceUsdc.toString())),
            billingCycleDays: secondsToDays(account.billingCycleSeconds),
            createdAt: timestampToDate(BigInt(account.createdAt.toString())),
            isActive: account.isActive
          });
        } catch {
          continue;
        }
      }
      return plans;
    } catch {
      return [];
    }
  }
  /**
   * Get a specific plan by public key
   * @param planPubkey - Plan public key
   * @returns Plan or null if not found
   */
  async getPlan(planPubkey) {
    try {
      const account = await this.program.account.plan.fetch(planPubkey);
      return {
        publicKey: planPubkey,
        business: account.business,
        name: decryptPlanData(new Uint8Array(account.encryptedName)),
        description: decryptPlanData(new Uint8Array(account.encryptedDescription)),
        priceUsdc: usdcFromOnChain(BigInt(account.priceUsdc.toString())),
        billingCycleDays: secondsToDays(account.billingCycleSeconds),
        createdAt: timestampToDate(BigInt(account.createdAt.toString())),
        isActive: account.isActive
      };
    } catch {
      return null;
    }
  }
  /**
   * Deactivate a plan
   * @param planPubkey - Plan public key to deactivate
   * @returns Transaction result
   */
  async deactivatePlan(planPubkey) {
    try {
      const business = await this.getBusiness();
      if (!business) {
        throw new Error("Business not registered");
      }
      const signature = await this.program.methods.deactivatePlan().accounts({
        authorityAccount: this.wallet.publicKey,
        businessAccount: business.publicKey,
        planAccount: planPubkey
      }).rpc();
      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  // ============================================
  // Subscription Operations
  // ============================================
  /**
   * Subscribe to a plan
   * @param input - Subscription input
   * @returns Transaction result with signature and membership commitment
   */
  async subscribe(input) {
    try {
      const userCommitment = await generateUserCommitment(
        input.userSecret,
        input.plan.toBytes()
      );
      const membershipCommitment = await generateMembershipCommitment(
        userCommitment,
        input.plan.toBytes()
      );
      const nonce = generateNonce();
      const [subscriptionPda] = deriveSubscriptionPda(
        input.plan,
        membershipCommitment,
        this.programId
      );
      const signature = await this.program.methods.subscribe(
        Array.from(userCommitment),
        Array.from(membershipCommitment),
        new import_anchor.BN(nonce.toString())
      ).accounts({
        userAccount: this.wallet.publicKey,
        planAccount: input.plan,
        subscriptionAccount: subscriptionPda,
        systemProgram: import_web32.SystemProgram.programId
      }).rpc();
      return { signature, success: true, membershipCommitment };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Get subscriptions for a plan
   * @param planPubkey - Plan public key
   * @param filter - Optional filter options
   * @returns Array of subscriptions
   */
  async getSubscriptions(planPubkey, filter) {
    try {
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          // Filter by account discriminator (first 8 bytes)
          // Note: In production, we'd use proper discriminator
          {
            memcmp: {
              offset: 8 + 32,
              // Skip discriminator and subscription_id
              bytes: planPubkey.toBase58()
            }
          }
        ]
      });
      const subscriptions = [];
      const limit = filter?.limit ?? 100;
      for (const { pubkey, account } of accounts) {
        if (subscriptions.length >= limit) break;
        try {
          const decoded = this.program.coder.accounts.decode(
            "subscription",
            account.data
          );
          if (filter?.isActive !== void 0 && decoded.isActive !== filter.isActive) {
            continue;
          }
          subscriptions.push({
            publicKey: pubkey,
            plan: decoded.plan,
            membershipCommitment: new Uint8Array(decoded.membershipCommitment),
            subscribedAt: timestampToDate(BigInt(decoded.subscribedAt.toString())),
            cancelledAt: decoded.cancelledAt.toString() === "0" ? null : timestampToDate(BigInt(decoded.cancelledAt.toString())),
            isActive: decoded.isActive
          });
        } catch {
          continue;
        }
      }
      return subscriptions;
    } catch {
      return [];
    }
  }
  /**
   * Cancel a subscription
   * @param subscriptionPubkey - Subscription public key
   * @returns Transaction result
   */
  async cancelSubscription(subscriptionPubkey) {
    try {
      const signature = await this.program.methods.cancelSubscription().accounts({
        userAccount: this.wallet.publicKey,
        subscriptionAccount: subscriptionPubkey
      }).rpc();
      return { signature, success: true };
    } catch (error) {
      return {
        signature: "",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Get the encrypted subscription count for a plan
   * @param planPubkey - Plan public key
   * @returns Encrypted subscription count bytes
   */
  async getSubscriptionCount(planPubkey) {
    try {
      const account = await this.program.account.plan.fetch(planPubkey);
      return new Uint8Array(account.encryptedSubscriptionCount);
    } catch {
      return null;
    }
  }
  // ============================================
  // Utility Methods
  // ============================================
  /**
   * Get the program ID
   */
  getProgramId() {
    return this.programId;
  }
  /**
   * Get the connection
   */
  getConnection() {
    return this.connection;
  }
  /**
   * Get the wallet public key
   */
  getWalletPublicKey() {
    return this.wallet.publicKey;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CONSTANTS,
  IDL,
  PROGRAM_ID,
  SublyMembershipClient,
  bigIntToBytes,
  dateToTimestamp,
  daysToSeconds,
  decryptPlanData,
  deriveBusinessPda,
  derivePlanPda,
  deriveSubscriptionPda,
  encryptPlanData,
  formatBillingCycle,
  formatUsdc,
  generateMembershipCommitment,
  generateNonce,
  generateUserCommitment,
  generateUserSecret,
  getBusinessPdaForAuthority,
  secondsToDays,
  timestampToDate,
  usdcFromOnChain,
  usdcToOnChain
});
