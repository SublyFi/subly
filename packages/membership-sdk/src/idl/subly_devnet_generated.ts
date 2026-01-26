/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/subly_devnet.json`.
 */
export type SublyDevnet = {
  "address": "2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA",
  "metadata": {
    "name": "sublyDevnet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Arcium & Anchor"
  },
  "instructions": [
    {
      "name": "cancelSubscription",
      "docs": [
        "Cancel a subscription"
      ],
      "discriminator": [
        60,
        139,
        189,
        242,
        191,
        208,
        143,
        18
      ],
      "accounts": [
        {
          "name": "userAccount",
          "docs": [
            "The user who owns the subscription"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "subscriptionAccount",
          "docs": [
            "The subscription to cancel"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
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
                ]
              },
              {
                "kind": "account",
                "path": "subscription_account.plan",
                "account": "subscription"
              },
              {
                "kind": "account",
                "path": "subscription_account.membership_commitment",
                "account": "subscription"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createPlan",
      "docs": [
        "Create a new subscription plan"
      ],
      "discriminator": [
        77,
        43,
        141,
        254,
        212,
        118,
        41,
        186
      ],
      "accounts": [
        {
          "name": "authorityAccount",
          "docs": [
            "The authority (owner) of the business"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "businessAccount",
          "docs": [
            "The business account that owns this plan"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
                "kind": "account",
                "path": "authorityAccount"
              }
            ]
          }
        },
        {
          "name": "planAccount",
          "docs": [
            "The plan account PDA to create"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "businessAccount"
              },
              {
                "kind": "account",
                "path": "business_account.plan_count",
                "account": "businessAccount"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "encryptedName",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "encryptedDescription",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "priceUsdc",
          "type": "u64"
        },
        {
          "name": "billingCycleSeconds",
          "type": "u32"
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "deactivatePlan",
      "docs": [
        "Deactivate a plan (business owner only)"
      ],
      "discriminator": [
        91,
        38,
        214,
        232,
        172,
        21,
        30,
        93
      ],
      "accounts": [
        {
          "name": "authorityAccount",
          "docs": [
            "The authority (owner) of the business"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "businessAccount",
          "docs": [
            "The business account that owns this plan"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
                "kind": "account",
                "path": "authorityAccount"
              }
            ]
          }
        },
        {
          "name": "planAccount",
          "docs": [
            "The plan to deactivate"
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "getSubscriptionCount",
      "docs": [
        "Get the encrypted subscription count for a plan",
        "Returns the encrypted count that can be decrypted by authorized parties"
      ],
      "discriminator": [
        12,
        149,
        103,
        233,
        78,
        193,
        31,
        116
      ],
      "accounts": [
        {
          "name": "planAccount",
          "docs": [
            "The plan to get subscription count for"
          ]
        }
      ],
      "args": [],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "registerBusiness",
      "docs": [
        "Register a new business account"
      ],
      "discriminator": [
        73,
        228,
        5,
        59,
        229,
        67,
        133,
        82
      ],
      "accounts": [
        {
          "name": "authorityAccount",
          "docs": [
            "The authority (owner) of the business"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "businessAccount",
          "docs": [
            "The business account PDA to create"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
                "kind": "account",
                "path": "authorityAccount"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "subscribe",
      "docs": [
        "Subscribe to a plan"
      ],
      "discriminator": [
        254,
        28,
        191,
        138,
        156,
        179,
        183,
        53
      ],
      "accounts": [
        {
          "name": "userAccount",
          "docs": [
            "The user subscribing to the plan"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "planAccount",
          "docs": [
            "The plan being subscribed to"
          ],
          "writable": true
        },
        {
          "name": "subscriptionAccount",
          "docs": [
            "The subscription account PDA to create"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
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
                ]
              },
              {
                "kind": "account",
                "path": "planAccount"
              },
              {
                "kind": "arg",
                "path": "membershipCommitment"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program for account creation"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "encryptedUserCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "membershipCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "businessAccount",
      "discriminator": [
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
      "name": "plan",
      "discriminator": [
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
      "name": "subscription",
      "discriminator": [
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
  "events": [
    {
      "name": "businessRegisteredEvent",
      "discriminator": [
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
      "name": "planCreatedEvent",
      "discriminator": [
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
      "name": "subscriptionCountUpdatedEvent",
      "discriminator": [
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
      "name": "subscriptionCreatedEvent",
      "discriminator": [
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
  "errors": [
    {
      "code": 6000,
      "name": "businessAlreadyExists",
      "msg": "Business account already exists"
    },
    {
      "code": 6001,
      "name": "planNotFound",
      "msg": "Plan not found"
    },
    {
      "code": 6002,
      "name": "planNotActive",
      "msg": "Plan is not active"
    },
    {
      "code": 6003,
      "name": "subscriptionAlreadyExists",
      "msg": "Subscription already exists"
    },
    {
      "code": 6004,
      "name": "subscriptionNotActive",
      "msg": "Subscription is not active"
    },
    {
      "code": 6005,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6006,
      "name": "mxeComputationFailed",
      "msg": "MXE computation failed"
    },
    {
      "code": 6007,
      "name": "invalidComputationOutput",
      "msg": "Invalid computation output"
    },
    {
      "code": 6008,
      "name": "clusterNotSet",
      "msg": "Cluster not set"
    },
    {
      "code": 6009,
      "name": "abortedComputation",
      "msg": "The computation was aborted"
    },
    {
      "code": 6010,
      "name": "invalidNameLength",
      "msg": "Invalid name length"
    },
    {
      "code": 6011,
      "name": "invalidMetadataUriLength",
      "msg": "Invalid metadata URI length"
    },
    {
      "code": 6012,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6013,
      "name": "invalidBillingCycle",
      "msg": "Invalid billing cycle"
    }
  ],
  "types": [
    {
      "name": "businessAccount",
      "docs": [
        "Business Account - stores business information",
        "PDA seeds: [\"business\", authority]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Business owner's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "Business name (max 32 characters)"
            ],
            "type": "string"
          },
          {
            "name": "metadataUri",
            "docs": [
              "Metadata URI (max 128 characters)"
            ],
            "type": "string"
          },
          {
            "name": "createdAt",
            "docs": [
              "Account creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the business is active"
            ],
            "type": "bool"
          },
          {
            "name": "planCount",
            "docs": [
              "Number of plans created by this business"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "businessRegisteredEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "plan",
      "docs": [
        "Plan - stores subscription plan information",
        "PDA seeds: [\"plan\", business, plan_nonce]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "planId",
            "docs": [
              "Plan's own address (for reference)"
            ],
            "type": "pubkey"
          },
          {
            "name": "business",
            "docs": [
              "Reference to business account"
            ],
            "type": "pubkey"
          },
          {
            "name": "encryptedName",
            "docs": [
              "Encrypted plan name (Arcium encrypted)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "encryptedDescription",
            "docs": [
              "Encrypted plan description (Arcium encrypted)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "priceUsdc",
            "docs": [
              "Price in USDC (6 decimals, e.g., 10_000_000 = 10 USDC)"
            ],
            "type": "u64"
          },
          {
            "name": "billingCycleSeconds",
            "docs": [
              "Billing cycle in seconds"
            ],
            "type": "u32"
          },
          {
            "name": "createdAt",
            "docs": [
              "Plan creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the plan is active"
            ],
            "type": "bool"
          },
          {
            "name": "encryptedSubscriptionCount",
            "docs": [
              "Encrypted subscription count (Arcium encrypted, only count is known)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce for encryption"
            ],
            "type": "u128"
          },
          {
            "name": "planNonce",
            "docs": [
              "Plan nonce (sequential number for this business)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "planCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "business",
            "type": "pubkey"
          },
          {
            "name": "priceUsdc",
            "type": "u64"
          },
          {
            "name": "billingCycleSeconds",
            "type": "u32"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "subscription",
      "docs": [
        "Subscription - stores subscription contract information",
        "PDA seeds: [\"subscription\", plan, user_commitment]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriptionId",
            "docs": [
              "Subscription's own address (for reference)"
            ],
            "type": "pubkey"
          },
          {
            "name": "plan",
            "docs": [
              "Reference to plan account"
            ],
            "type": "pubkey"
          },
          {
            "name": "encryptedUserCommitment",
            "docs": [
              "Encrypted user commitment (Arcium encrypted)",
              "user_commitment = hash(secret || plan_id)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "membershipCommitment",
            "docs": [
              "Membership commitment for Light Protocol ZK proofs"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "subscribedAt",
            "docs": [
              "Subscription creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "cancelledAt",
            "docs": [
              "Cancellation timestamp (0 if not cancelled)"
            ],
            "type": "i64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the subscription is active"
            ],
            "type": "bool"
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce for encryption"
            ],
            "type": "u128"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "subscriptionCountUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "encryptedCount",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "subscriptionCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscription",
            "type": "pubkey"
          },
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "membershipCommitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
