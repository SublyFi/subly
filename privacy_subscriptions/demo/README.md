# Subly Demo - Privacy Subscriptions

デモ用のマーチャントアプリです。Subly SDKを使用して、オンチェーンからサブスクリプションプランを取得し、ユーザーが契約・解約できる機能を提供します。

## 概要

このデモアプリは、事業者が提供するサブスクリプションサービスのユーザー向けフロントエンドです。

### 主な機能

- **Wallet接続**: Phantom/Solflare等のSolana Walletとの接続
- **プラン表示**: 事業者ダッシュボードで登録されたプランをオンチェーンから取得して表示
- **サブスクリプション契約**: SDK経由でオンチェーントランザクションを実行
- **契約状態確認**: Wallet接続時に契約済みプランを自動検出
- **解約機能**: 契約中のサブスクリプションを解約

### 技術スタック

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Wallet**: @solana/wallet-adapter
- **SDK**: @subly/sdk
- **Notifications**: Sonner

## セットアップ

### 1. 依存関係のインストール

```bash
cd demo
npm install
```

### 2. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成します。

```bash
cp .env.local.example .env.local
```

以下の環境変数を設定してください：

```env
# Solana Network Configuration
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com

# Merchant Wallet (事業者のウォレットアドレス)
NEXT_PUBLIC_MERCHANT_WALLET=YOUR_MERCHANT_WALLET_ADDRESS

# Program ID (デプロイ済みのプログラムID)
NEXT_PUBLIC_PROGRAM_ID=8GVcKi58PTZYDjaBLaDnaaxDewrWwfaSQCST5v2tFnk2
```

### 3. SDKのビルド

SDKがビルドされていることを確認してください。

```bash
cd ../sdk
npm run build
```

### 4. アプリの起動

```bash
cd ../demo
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 使い方

### 未接続時

1. ランディングページが表示されます
2. 「Connect Wallet」ボタンをクリック
3. Wallet（Phantom/Solflare）を選択して接続

### 未契約時

1. Wallet接続後、利用可能なプラン一覧が表示されます
2. 希望のプランの「Subscribe」ボタンをクリック
3. Walletでトランザクションを承認
4. 契約完了後、ダッシュボードに遷移

### 契約済み時

1. Wallet接続後、契約中のプランがダッシュボードに表示されます
2. 「Change Plan」で他のプランに変更可能
3. 「Cancel Subscription」で解約可能

## 画面構成

### ランディングページ（未接続時）

```
┌─────────────────────────────────────────────────┐
│  Subly [Demo]                    [Connect Wallet] │
├─────────────────────────────────────────────────┤
│                                                  │
│           Privacy-First Subscriptions            │
│                                                  │
│    Subscribe to premium services with on-chain   │
│    privacy. Your subscription data is encrypted  │
│    using Arcium MPC.                             │
│                                                  │
│              [Connect Wallet]                    │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Encrypted│ │ On-Chain │ │ Instant  │        │
│  │ Payments │ │Verification│ │& Seamless│        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### プラン選択画面（接続済み・未契約時）

```
┌─────────────────────────────────────────────────┐
│  Subly [Demo]              [0x1234...5678]      │
├─────────────────────────────────────────────────┤
│                                                  │
│            Choose Your Plan                      │
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Basic  │ │Standard │ │ Premium │           │
│  │         │ │ Popular │ │         │           │
│  │ 0.1 SOL │ │ 0.5 SOL │ │ 1.0 SOL │           │
│  │  /month │ │  /month │ │  /month │           │
│  │         │ │         │ │         │           │
│  │[Subscribe]│ │[Subscribe]│ │[Subscribe]│           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                  │
│  🔒 Verified on-chain via Arcium MPC            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### ダッシュボード（契約済み時）

```
┌─────────────────────────────────────────────────┐
│  Subly [Demo]              [0x1234...5678]      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  ● Active Subscription: Premium          │    │
│  │                                          │    │
│  │  1.0 SOL / monthly                       │    │
│  │  Billing Cycle: Every 30 days            │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  ✓ Your Benefits                         │    │
│  │  • Full access to Premium features       │    │
│  │  • Privacy-preserved verification        │    │
│  │  • On-chain payment via Arcium MPC       │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  [Change Plan]                                   │
│  [Cancel Subscription]                           │
│                                                  │
│  🔒 Encrypted on-chain via Arcium MPC           │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 開発者向け情報

### ディレクトリ構造

```
demo/
├── src/
│   ├── app/
│   │   ├── globals.css      # グローバルスタイル
│   │   ├── layout.tsx       # ルートレイアウト
│   │   ├── page.tsx         # メインページ
│   │   └── providers.tsx    # Providers設定
│   ├── components/
│   │   ├── WalletButton.tsx       # Wallet接続ボタン
│   │   ├── PlanCard.tsx           # プランカード
│   │   ├── PlanSelection.tsx      # プラン選択画面
│   │   └── SubscribedDashboard.tsx # 契約済みダッシュボード
│   ├── contexts/
│   │   └── SublyContext.tsx  # SDK連携Context
│   └── types/
│       └── index.ts          # 型定義
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

### SDKの使い方

SublyContextを通じてSDKを使用します：

```tsx
import { useSubly } from '@/contexts/SublyContext';

function MyComponent() {
  const {
    plans,           // 利用可能なプラン一覧
    subscriptionState, // ユーザーの契約状態
    subscribe,       // 契約関数
    unsubscribe,     // 解約関数
  } = useSubly();

  // ...
}
```

## ライセンス

MIT
