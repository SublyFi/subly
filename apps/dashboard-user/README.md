# Subly User Dashboard

User dashboard for browsing and managing subscriptions on the Subly Membership Protocol.

## Features

- Wallet connection (Phantom, Solflare, etc.)
- Browse available subscription plans
- Subscribe to plans with privacy-preserving commitments
- View active and cancelled subscriptions
- Local storage for subscription data privacy

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TailwindCSS
- @solana/wallet-adapter-react
- @subly/membership-sdk

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Solana wallet (Phantom recommended)
- SOL for transaction fees (Devnet)

### Installation

```bash
# From the monorepo root
pnpm install

# Or from this directory
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser (port 3001 to avoid conflict with business dashboard).

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm tsc --noEmit
```

## Project Structure

```
apps/dashboard-user/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (subscription overview)
│   └── browse/
│       └── page.tsx        # Browse available plans
├── components/
│   ├── Header.tsx          # Header with wallet connection
│   └── subscriptions/
│       ├── PlanCard.tsx    # Plan card for browsing
│       ├── SubscriptionCard.tsx  # Active subscription card
│       └── index.ts        # Exports
├── hooks/
│   ├── usePlans.ts         # Plans fetching hook
│   └── useSubscriptions.ts # Subscriptions management hook
├── lib/
│   └── solana.ts           # Solana connection config
└── providers/
    ├── WalletProvider.tsx  # Wallet adapter provider
    ├── MembershipProvider.tsx  # SDK client provider
    └── index.tsx           # Combined providers
```

## Environment Variables

No environment variables required for Devnet. The app connects to Solana Devnet by default.

For custom RPC endpoints, you can modify `lib/solana.ts`.

## Usage

1. **Connect Wallet**: Click "Select Wallet" and connect your Solana wallet
2. **Browse Plans**: Navigate to "Browse Plans" to see available subscriptions
3. **Subscribe**: Click "Subscribe" on a plan card to create a subscription
4. **View Subscriptions**: Your active subscriptions appear on the home page
5. **Cancel**: Click "Cancel" on any active subscription to cancel it

## Privacy Features

- Subscription data is stored locally in the browser
- On-chain subscriptions use membership commitments (hashed identifiers)
- Businesses cannot see which specific wallets are subscribed
- Only the total subscriber count is visible to businesses

## Network

- **Network**: Solana Devnet
- **Program ID**: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`

## License

MIT
