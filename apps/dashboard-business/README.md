# Subly Business Dashboard

Business dashboard for managing subscription plans on the Subly Membership Protocol.

## Features

- Wallet connection (Phantom, Solflare, etc.)
- Business registration
- Subscription plan creation and management
- Subscriber count display (privacy-preserving)

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
apps/dashboard-business/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home (dashboard)
│   └── plans/
│       └── new/
│           └── page.tsx    # Create plan page
├── components/
│   ├── Header.tsx          # Header with wallet connection
│   └── plans/
│       └── PlanCard.tsx    # Plan card with subscriber count
├── hooks/
│   └── useSubscriptionCount.ts  # Subscription count hook
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
2. **Register Business**: Enter your business name and optional metadata URI
3. **Create Plans**: Click "Create Plan" and fill in plan details
4. **View Subscribers**: Each plan card shows the number of active subscribers

## Network

- **Network**: Solana Devnet
- **Program ID**: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`

## License

MIT
