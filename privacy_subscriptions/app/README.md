# Subly User Dashboard

Privacy-preserving subscription management dashboard built with Next.js 14, Solana, and Arcium MPC.

## Features

### User Dashboard
- **Wallet Connection**: Connect with Phantom, Solflare, and other Solana wallets
- **Balance Management**: View encrypted balance and decrypt with your wallet
- **Deposit/Withdraw**: Add and remove funds from your private balance
- **Subscription Management**: View and manage your subscriptions

### Merchant Dashboard
- **Merchant Registration**: Register as a merchant to accept subscriptions
- **Plan Management**: Create, edit, and toggle subscription plans
- **Revenue Tracking**: View encrypted revenue with MPC decryption
- **Revenue Claims**: Claim accumulated revenue from subscriptions
- **SDK Integration Guide**: Documentation for integrating subscriptions into your app

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS
- @solana/wallet-adapter-react
- @solana/web3.js

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

```bash
cd app
npm install
```

2. Copy environment variables:

```bash
cp .env.local.example .env.local
```

3. Edit `.env.local` with your configuration:

```env
# Solana Network Configuration
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet

# Program IDs (replace with deployed program IDs)
NEXT_PUBLIC_PROGRAM_ID=your_program_id_here
NEXT_PUBLIC_ARCIUM_PROGRAM_ID=your_arcium_program_id_here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_RPC_URL` | Solana RPC endpoint URL | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_NETWORK` | Network name (devnet/mainnet-beta) | `devnet` |
| `NEXT_PUBLIC_PROGRAM_ID` | Subly program ID | - |
| `NEXT_PUBLIC_ARCIUM_PROGRAM_ID` | Arcium program ID | - |

## Project Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   ├── wallet/             # Wallet page (Deposit/Withdraw)
│   │   ├── subscriptions/      # Subscriptions page
│   │   └── merchant/           # Merchant Dashboard
│   │       ├── layout.tsx      # Merchant layout with sidebar
│   │       ├── page.tsx        # Dashboard home
│   │       ├── register/       # Merchant registration
│   │       ├── plans/          # Plan management
│   │       ├── revenue/        # Revenue & claim
│   │       └── sdk-guide/      # SDK integration guide
│   ├── components/
│   │   ├── common/             # Shared components
│   │   ├── layout/             # Layout components
│   │   ├── providers/          # React context providers
│   │   ├── user/               # User-specific components
│   │   └── merchant/           # Merchant-specific components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and helpers
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── tailwind.config.ts          # Tailwind CSS configuration
├── next.config.mjs             # Next.js configuration
└── tsconfig.json               # TypeScript configuration
```

## Accessing Dashboards

- **User Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Merchant Dashboard**: [http://localhost:3000/merchant](http://localhost:3000/merchant)

## Current Status

This is an MVP implementation with:
- Balance display (encrypted/decrypted)
- Deposit/Withdraw transactions
- Subscription list
- Merchant registration and plan management
- Revenue tracking with Arcium MPC decryption
- Revenue claiming functionality

The UI connects to the deployed Solana program with Arcium MPC for privacy-preserving operations on Devnet.

## License

Proprietary - All rights reserved
