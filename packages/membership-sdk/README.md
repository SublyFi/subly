# @subly/membership-sdk

TypeScript SDK for Subly Membership Protocol - a privacy-preserving subscription management system built on Solana with Arcium MPC.

## Installation

```bash
pnpm add @subly/membership-sdk
# or
npm install @subly/membership-sdk
```

## Quick Start

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { SublyMembershipClient } from "@subly/membership-sdk";

// Initialize connection
const connection = new Connection("https://api.devnet.solana.com");

// Create client (wallet must support signTransaction)
const client = new SublyMembershipClient({
  connection,
  wallet: yourWalletAdapter,
});

// Register a business
const result = await client.registerBusiness({
  name: "My Business",
  metadataUri: "https://example.com/metadata.json",
});

// Create a subscription plan
const planResult = await client.createPlan({
  name: "Premium",
  description: "Premium membership plan",
  priceUsdc: 9.99,
  billingCycleDays: 30,
});

// Get all plans for the business
const plans = await client.getPlans();

// Subscribe to a plan (as a user)
const subscription = await client.subscribe({
  plan: planPublicKey,
  userSecret: generateUserSecret(),
});
```

## API Reference

### SublyMembershipClient

Main client class for interacting with the Subly Membership Protocol.

#### Constructor

```typescript
new SublyMembershipClient({
  connection: Connection,
  wallet: WalletAdapter,
  programId?: string, // Optional custom program ID
});
```

#### Business Operations

| Method | Description |
|--------|-------------|
| `registerBusiness(input)` | Register a new business |
| `getBusiness()` | Get business for connected wallet |
| `getBusinessByAuthority(authority)` | Get business by authority public key |

#### Plan Operations

| Method | Description |
|--------|-------------|
| `createPlan(input)` | Create a new subscription plan |
| `getPlans(filter?)` | Get plans for a business |
| `getPlan(planPubkey)` | Get a specific plan |
| `deactivatePlan(planPubkey)` | Deactivate a plan |

#### Subscription Operations

| Method | Description |
|--------|-------------|
| `subscribe(input)` | Subscribe to a plan |
| `getSubscriptions(planPubkey, filter?)` | Get subscriptions for a plan |
| `cancelSubscription(subscriptionPubkey)` | Cancel a subscription |
| `getSubscriptionCount(planPubkey)` | Get encrypted subscription count |

### Utility Functions

#### PDA Derivation

```typescript
import {
  deriveBusinessPda,
  derivePlanPda,
  deriveSubscriptionPda,
} from "@subly/membership-sdk";

const [businessPda, bump] = deriveBusinessPda(authority, programId);
const [planPda, bump] = derivePlanPda(businessPda, planNonce, programId);
const [subPda, bump] = deriveSubscriptionPda(planPda, commitment, programId);
```

#### Encryption Helpers

```typescript
import {
  generateNonce,
  generateUserSecret,
  generateUserCommitment,
  generateMembershipCommitment,
} from "@subly/membership-sdk";

const secret = generateUserSecret();
const userCommitment = await generateUserCommitment(secret, planPubkey);
const membershipCommitment = await generateMembershipCommitment(userCommitment, planPubkey);
```

#### Format Helpers

```typescript
import {
  usdcToOnChain,
  usdcFromOnChain,
  daysToSeconds,
  secondsToDays,
  formatUsdc,
  formatBillingCycle,
} from "@subly/membership-sdk";

// USDC conversion (6 decimals)
const onChain = usdcToOnChain(9.99); // 9990000n
const human = usdcFromOnChain(9990000n); // 9.99

// Time conversion
const seconds = daysToSeconds(30); // 2592000
const days = secondsToDays(2592000); // 30

// Formatting
formatUsdc(9990000n); // "$9.99"
formatBillingCycle(2592000); // "1 month"
```

## Types

```typescript
interface Business {
  publicKey: PublicKey;
  authority: PublicKey;
  name: string;
  metadataUri: string;
  createdAt: bigint;
  isActive: boolean;
  planCount: bigint;
  bump: number;
}

interface Plan {
  publicKey: PublicKey;
  business: PublicKey;
  name: string;
  description: string;
  priceUsdc: number;
  billingCycleDays: number;
  createdAt: Date;
  isActive: boolean;
}

interface Subscription {
  publicKey: PublicKey;
  plan: PublicKey;
  membershipCommitment: Uint8Array;
  subscribedAt: Date;
  cancelledAt: Date | null;
  isActive: boolean;
}
```

## Constants

```typescript
import { CONSTANTS } from "@subly/membership-sdk";

CONSTANTS.MAX_NAME_LENGTH; // 32
CONSTANTS.MAX_METADATA_URI_LENGTH; // 128
CONSTANTS.USDC_DECIMALS; // 6
CONSTANTS.MIN_BILLING_CYCLE_SECONDS; // 3600 (1 hour)
CONSTANTS.MAX_BILLING_CYCLE_SECONDS; // 31536000 (365 days)
```

## Program Information

- **Network**: Solana Devnet
- **Program ID**: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`
- **IDL Account**: `ATeW527XKpzBJLucBy8qrYjHCqEFCjC6PpBufybCCPqm`

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## License

MIT
