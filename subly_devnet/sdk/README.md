# @subly/zk-sdk

Subly ZK Compression SDK for privacy-preserving subscriptions on Solana.

## Overview

This SDK provides tools for working with Subly's ZK-compressed subscriptions powered by Light Protocol. It enables:

- Creating compressed subscriptions with privacy-preserving membership commitments
- Generating and verifying membership proofs for off-chain verification
- Migrating existing PDA subscriptions to ZK compression

## Installation

```bash
npm install @subly/zk-sdk @solana/web3.js @lightprotocol/stateless.js
```

## Quick Start

```typescript
import { SublyZkClient } from "@subly/zk-sdk";
import { Keypair, PublicKey } from "@solana/web3.js";

// Initialize client
const client = new SublyZkClient("https://api.devnet.solana.com");

// Subscribe with ZK compression
const userKeypair = Keypair.generate();
const planAccount = new PublicKey("...");
const userSecret = new Uint8Array(32); // Your secret

const result = await client.subscribeWithZk(
  userKeypair,
  planAccount,
  userSecret
);

console.log("Subscription created:", result.signature);
console.log("Membership commitment:", result.membershipCommitment);
```

## Features

### ZK Compressed Subscriptions

Create subscriptions that are stored in Light Protocol's state tree instead of traditional Solana accounts. This provides:

- **Reduced costs**: ~100x cheaper than PDA accounts
- **Privacy**: Membership can be proven without revealing identity
- **Scalability**: State tree compression allows massive scale

### Membership Proofs

Generate proofs that demonstrate subscription membership without revealing who you are:

```typescript
import { generateMembershipCommitment } from "@subly/zk-sdk";

// Generate a deterministic commitment from your secret
const commitment = generateMembershipCommitment(userSecret, planId);

// This commitment can be verified on-chain or off-chain
// without revealing your identity
```

### Off-chain Verification

Verify membership proofs without touching the blockchain:

```typescript
import { verifyMembershipProof, isProofExpired } from "@subly/zk-sdk";

// Verify a membership proof
const result = verifyMembershipProof(proof, expectedPlanId, verifierPublicKey);

if (result.isValid) {
  console.log("Valid membership!");
} else {
  console.log("Invalid:", result.error);
}

// Check if proof has expired
if (isProofExpired(proof)) {
  console.log("Proof needs renewal");
}
```

## API Reference

### SublyZkClient

Main client for interacting with Subly's ZK compression features.

#### Constructor

```typescript
new SublyZkClient(rpcUrl: string, programId?: PublicKey)
```

#### Methods

- `initializeZkTracker(authority, planAccount)` - Initialize ZK tracker for a plan
- `subscribeWithZk(user, planAccount, userSecret)` - Create a ZK compressed subscription
- `generateMembershipProof(subscription, treeInfo, signer)` - Generate a membership proof
- `verifyMembershipProof(proof, planId, verifierKey)` - Verify a membership proof
- `migrateSubscriptionToZk(user, planAccount, originalSubscription)` - Migrate existing subscription

### Proof Functions

#### `generateMembershipCommitment(userSecret, planId)`

Generates a deterministic membership commitment from a user secret and plan ID.

#### `verifyMembershipProof(proof, expectedPlanId, verifierPublicKey)`

Verifies a membership proof off-chain.

#### `isProofExpired(proof)`

Checks if a proof has expired.

#### `getProofRemainingValidity(proof)`

Returns seconds until proof expiration.

## Types

### MembershipProof

```typescript
interface MembershipProof {
  planId: PublicKey;
  membershipCommitment: Uint8Array;
  validityProof: Uint8Array;
  rootIndex: number;
  leafIndex: number;
  proofTimestamp: number;
  validUntil: number;
  signature: Uint8Array;
  nonce: Uint8Array;
}
```

### ProofVerificationResult

```typescript
interface ProofVerificationResult {
  isValid: boolean;
  error?: string;
  verifiedAt: number;
  planId: PublicKey;
}
```

## Security Considerations

### Replay Protection

- Each proof includes a unique nonce
- Proofs have expiration timestamps
- Signatures bind the proof to specific plan and commitment

### Secret Management

- User secrets should be stored securely
- Secrets are never transmitted on-chain
- Commitment derivation is one-way (cannot recover secret from commitment)

## Program Information

- **Program ID**: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`
- **Cluster**: Devnet
- **Arcium Cluster Offset**: 456

## License

MIT
