# @subly/sdk

Subly Privacy Subscriptions SDK - TypeScript client library for privacy-preserving subscription management on Solana.

## Overview

The Subly SDK enables merchants to integrate privacy-preserving subscription functionality into their applications. Users can subscribe to plans with encrypted balances, ensuring their financial information remains private while still allowing merchants to verify subscription status.

## Features

- Privacy-preserving subscription management via Arcium MPC
- Check user subscription status
- Subscribe/unsubscribe users to plans
- Fetch subscription plans
- TypeScript-first with full type definitions

## Installation

```bash
npm install @subly/sdk
# or
yarn add @subly/sdk
```

## Quick Start

```typescript
import { SublySDK, SubscriptionStatus } from '@subly/sdk';

// Initialize the SDK
const sdk = new SublySDK({
  rpcEndpoint: 'https://api.devnet.solana.com',
  merchantWallet: 'YOUR_MERCHANT_WALLET_PUBKEY',
});

// Get available subscription plans
const plans = await sdk.getPlans(true); // true = active only
console.log('Available plans:', plans);

// Check if a user is subscribed
const status = await sdk.checkSubscription(userWallet, planPDA);
if (status === SubscriptionStatus.Active) {
  console.log('User has an active subscription!');
}

// Subscribe a user to a plan
const signature = await sdk.subscribe(planPDA, wallet);
console.log('Subscription created:', signature);

// Unsubscribe
const unsubSignature = await sdk.unsubscribe(subscriptionIndex, wallet);
console.log('Unsubscribed:', unsubSignature);
```

## API Reference

### SublySDK

Main SDK class for interacting with the Subly protocol.

#### Constructor

```typescript
const sdk = new SublySDK(config: SublyConfig);
```

**SublyConfig Options:**
- `rpcEndpoint: string` - Solana RPC endpoint URL
- `merchantWallet: string | PublicKey` - Merchant's wallet public key
- `programId?: string | PublicKey` - Custom program ID (optional)
- `commitment?: Commitment` - Transaction commitment level (optional, default: 'confirmed')

#### Methods

##### `getPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>`

Get all subscription plans for the merchant.

```typescript
const allPlans = await sdk.getPlans();
const activePlans = await sdk.getPlans(true);
```

##### `getPlan(planPDA: PublicKey | string): Promise<SubscriptionPlan | null>`

Get a single plan by its account public key.

```typescript
const plan = await sdk.getPlan('PLAN_PDA');
```

##### `getPlanById(planId: BN | number): Promise<SubscriptionPlan | null>`

Get a plan by its numeric ID.

```typescript
const plan = await sdk.getPlanById(1);
```

##### `checkSubscription(userWallet: PublicKey | string, planPDA: PublicKey | string): Promise<SubscriptionStatus>`

Check a user's subscription status for a specific plan.

```typescript
const status = await sdk.checkSubscription(userWallet, planPDA);
// Returns: 'not_subscribed' | 'active' | 'cancelled' | 'expired'
```

##### `subscribe(planPDA: PublicKey | string, wallet: Wallet, options?: TransactionOptions): Promise<TransactionSignature>`

Subscribe a user to a plan.

```typescript
const signature = await sdk.subscribe(planPDA, wallet);
```

##### `unsubscribe(subscriptionIndex: BN | number, wallet: Wallet, options?: TransactionOptions): Promise<TransactionSignature>`

Unsubscribe a user from a plan.

```typescript
const signature = await sdk.unsubscribe(0, wallet);
```

### Types

#### SubscriptionStatus

```typescript
enum SubscriptionStatus {
  NotSubscribed = 'not_subscribed',
  Active = 'active',
  Cancelled = 'cancelled',
  Expired = 'expired',
}
```

#### SubscriptionPlan

```typescript
interface SubscriptionPlan {
  publicKey: PublicKey;
  merchant: PublicKey;
  planId: BN;
  name: string;
  mint: PublicKey;
  price: BN;
  billingCycleDays: number;
  isActive: boolean;
}
```

#### Wallet Interface

The SDK accepts any wallet that implements:

```typescript
interface Wallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]>;
}
```

This is compatible with `@solana/wallet-adapter-base`.

### Error Handling

All SDK methods throw `SublyError` with specific error codes:

```typescript
import { SublyError, SublyErrorCode } from '@subly/sdk';

try {
  await sdk.subscribe(planPDA, wallet);
} catch (error) {
  if (error instanceof SublyError) {
    switch (error.code) {
      case SublyErrorCode.PlanNotFound:
        console.error('Plan does not exist');
        break;
      case SublyErrorCode.PlanNotActive:
        console.error('Plan is not active');
        break;
      case SublyErrorCode.AlreadySubscribed:
        console.error('User is already subscribed');
        break;
      case SublyErrorCode.InsufficientBalance:
        console.error('Insufficient balance');
        break;
      default:
        console.error('Error:', error.message);
    }
  }
}
```

## PDA Utilities

The SDK exports PDA derivation functions for advanced use cases:

```typescript
import {
  deriveMerchantPDA,
  deriveSubscriptionPlanPDA,
  deriveUserSubscriptionPDA,
  deriveUserLedgerPDA,
} from '@subly/sdk';

const [merchantPDA, bump] = deriveMerchantPDA(walletPublicKey);
const [planPDA] = deriveSubscriptionPlanPDA(merchantPDA, planId);
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## License

MIT
