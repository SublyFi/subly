# 設計書

## アーキテクチャ概要

Next.js App Router + React Server Componentsを採用し、将来のSDK統合を見据えた構造を構築する。

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Next.js App Router (app/)                                 │  │
│  │  - layout.tsx (共通レイアウト)                              │  │
│  │  - page.tsx (各ページ)                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Component Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  UI (base)  │  │  Features   │  │   Layout Components    │  │
│  │  shadcn/ui  │  │  Vault      │  │   Header, Sidebar      │  │
│  │             │  │  Subs       │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       Hooks Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  useWallet, useVault, useSubscriptions, useMock             ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                     Providers Layer                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  WalletProvider, MockDataProvider                           ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                        Lib Layer                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  solana.ts, mock-data.ts, utils.ts                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. Layout Components

**Header**

責務:
- ロゴ表示
- ナビゲーションリンク
- ウォレット接続ボタン

実装の要点:
- `'use client'` ディレクティブが必要（ウォレット状態のため）
- ウォレット接続状態に応じた表示切り替え

**Sidebar / TabNavigation**

責務:
- Vault、Subscriptions、Historyへのナビゲーション
- 現在のページのハイライト

実装の要点:
- `usePathname()`でアクティブ状態を判定
- モバイル時はボトムナビゲーションに切り替え

### 2. Vault Components

**BalanceCard**

責務:
- プライベート残高の表示
- 運用状況（APY、累計利回り）の表示

実装の要点:
- モックデータから残高を取得
- 将来的にvault-sdkに置き換え

**DepositForm / WithdrawForm**

責務:
- 金額入力
- クイック選択ボタン（10, 50, 100, MAX）
- 確認ダイアログ

実装の要点:
- フォームバリデーション（zodを使用）
- トースト通知でフィードバック

**ScheduledTransferList**

責務:
- 定期送金設定の一覧表示
- 設定の編集・削除

### 3. Subscription Components

**SubscriptionCard**

責務:
- 契約中のサブスクリプション表示
- 次回請求日、金額の表示

**PlanBrowser**

責務:
- 利用可能なプランの検索・表示
- 契約フローの開始

**SubscribeDialog / UnsubscribeDialog**

責務:
- 契約確認
- 解約確認

### 4. History Components

**TransactionList**

責務:
- 取引履歴の表示
- フィルタリング（タイプ、日付）

## データフロー

### ウォレット接続

```
1. ユーザーが「Connect Wallet」クリック
2. WalletProviderがウォレットモーダルを表示
3. ユーザーがPhantomを選択
4. 接続完了 → 状態がグローバルに反映
5. ヘッダーにウォレットアドレス表示
```

### Vault残高表示（モック）

```
1. ページロード時にMockDataProviderから残高取得
2. BalanceCardに表示
3. 将来はvault-sdkからリアルデータ取得に変更
```

### サブスクリプション契約（モック）

```
1. PlanBrowserでプラン選択
2. SubscribeDialogで確認
3. モックデータ更新
4. SubscriptionListに反映
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
// lib/errors.ts
export class WalletNotConnectedError extends Error {
  constructor() {
    super('Wallet not connected');
    this.name = 'WalletNotConnectedError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient balance: required ${required}, available ${available}`);
    this.name = 'InsufficientBalanceError';
  }
}
```

### エラーハンドリングパターン

- フォーム送信エラー: トースト通知で表示
- ウォレット未接続: 接続を促すメッセージ表示
- ネットワークエラー: リトライボタン付きエラー表示

## テスト戦略

### ユニットテスト（初回実装ではスコープ外）

- コンポーネントのレンダリングテスト
- フック関数のテスト

### 統合テスト（初回実装ではスコープ外）

- ウォレット接続フロー
- 入金・出金フロー

## 依存ライブラリ

```json
{
  "dependencies": {
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@solana/web3.js": "^1.95.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.0",
    "zustand": "^4.5.0",
    "sonner": "^1.5.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

## ディレクトリ構造

```
apps/dashboard-user/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # ホーム（リダイレクト）
│   ├── vault/
│   │   ├── page.tsx            # Vault概要
│   │   ├── deposit/
│   │   │   └── page.tsx        # 入金
│   │   └── withdraw/
│   │       └── page.tsx        # 出金
│   ├── subscriptions/
│   │   ├── page.tsx            # サブスクリプション一覧
│   │   ├── browse/
│   │   │   └── page.tsx        # プラン検索
│   │   └── [id]/
│   │       └── page.tsx        # 契約詳細
│   └── history/
│       └── page.tsx            # 履歴
├── components/
│   ├── ui/                     # shadcn/uiコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   ├── vault/
│   │   ├── BalanceCard.tsx
│   │   ├── YieldDisplay.tsx
│   │   ├── DepositForm.tsx
│   │   ├── WithdrawForm.tsx
│   │   └── ScheduledTransferList.tsx
│   ├── subscriptions/
│   │   ├── SubscriptionCard.tsx
│   │   ├── SubscriptionList.tsx
│   │   ├── PlanBrowser.tsx
│   │   ├── PlanCard.tsx
│   │   ├── SubscribeDialog.tsx
│   │   └── UnsubscribeDialog.tsx
│   ├── history/
│   │   ├── TransactionList.tsx
│   │   └── TransactionCard.tsx
│   └── wallet/
│       └── WalletButton.tsx
├── hooks/
│   ├── useVault.ts             # Vault状態管理
│   ├── useSubscriptions.ts     # サブスクリプション状態
│   ├── useHistory.ts           # 履歴取得
│   └── useMockData.ts          # モックデータ管理
├── providers/
│   ├── WalletProvider.tsx      # ウォレット接続
│   └── MockDataProvider.tsx    # モックデータ提供
├── lib/
│   ├── solana.ts               # Solana設定
│   ├── mock-data.ts            # モックデータ定義
│   ├── utils.ts                # ユーティリティ
│   └── errors.ts               # カスタムエラー
├── types/
│   ├── vault.ts                # Vault関連の型
│   ├── subscription.ts         # サブスクリプション関連の型
│   └── history.ts              # 履歴関連の型
├── styles/
│   └── globals.css             # グローバルスタイル
└── public/
    └── ...                     # 静的アセット
```

## 実装の順序

1. プロジェクト基盤セットアップ（依存関係、TailwindCSS、shadcn/ui）
2. 型定義と モックデータの作成
3. Providers実装（WalletProvider、MockDataProvider）
4. 共通レイアウト実装（Header、Sidebar、Navigation）
5. Vault画面実装
6. Subscriptions画面実装
7. History画面実装
8. 品質チェック（ビルド、Lint）

## セキュリティ考慮事項

- ウォレット秘密鍵はクライアント側で管理（Phantom等のウォレット内）
- 入力値のバリデーション（XSS対策）
- 環境変数での機密情報管理（RPC URL等）

## パフォーマンス考慮事項

- React Server Componentsの活用（初期ロード最適化）
- 画像の最適化（next/image）
- コンポーネントの遅延読み込み（必要に応じて）

## 将来の拡張性

- SDK統合時はhooksレイヤーを差し替えるだけで対応可能
- モックデータをリアルデータに置き換える際のインターフェース設計
- Mainnet/Devnet切り替えの考慮
