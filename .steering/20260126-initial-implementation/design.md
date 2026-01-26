# 設計書

## アーキテクチャ概要

Next.js App Routerを採用し、レイヤードアーキテクチャで構築する。初回実装ではモックデータを使用し、後続フェーズでオンチェーン連携を追加する。

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  Next.js App Router + React Components + TailwindCSS        │
├─────────────────────────────────────────────────────────────┤
│                     Hooks Layer                              │
│  Custom Hooks (useWallet, usePlans, useBusiness)            │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
│  Mock Services (初回) → SDK Services (後続)                  │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                               │
│  LocalStorage (初回) → Solana Devnet (後続)                  │
└─────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. Layout Components

**責務**:
- 全体のレイアウト構造
- ナビゲーション
- 認証状態の表示

**実装の要点**:
- `RootLayout`: 全ページ共通のプロバイダー設定
- `DashboardLayout`: 認証後のダッシュボードレイアウト
- `Header`: ロゴ、ナビゲーション、ウォレット接続ボタン
- `Sidebar`: ダッシュボードメニュー

### 2. Wallet Components

**責務**:
- ウォレット接続/切断
- 接続状態の表示
- ネットワーク表示

**実装の要点**:
- `WalletProvider`: Solana Wallet Adapter設定
- `WalletButton`: 接続/切断ボタン
- Phantom Walletを優先表示

### 3. Plan Components

**責務**:
- プラン一覧表示
- プラン作成/編集フォーム
- プラン詳細表示

**実装の要点**:
- `PlanCard`: プランの概要表示
- `PlanList`: プラン一覧
- `PlanForm`: 作成/編集フォーム
- `BillingCycleSelect`: 課金周期選択

### 4. Business Components

**責務**:
- 事業者登録フォーム
- 事業者情報表示

**実装の要点**:
- `BusinessRegisterForm`: 初回登録
- `BusinessProfile`: プロフィール表示

## データフロー

### ウォレット接続フロー
```
1. ユーザーが「Connect Wallet」をクリック
2. Wallet Adapterがウォレット選択モーダルを表示
3. ユーザーがPhantomを選択
4. Phantomが接続承認を要求
5. 承認後、publicKeyがContextに保存
6. ローカルストレージから事業者データを取得
7. 未登録の場合は登録画面へ、登録済みの場合はダッシュボードへ
```

### プラン作成フロー
```
1. ユーザーが「新規プラン作成」をクリック
2. フォームに入力（名前、説明、価格、課金周期）
3. バリデーション実行
4. モックサービスに保存（LocalStorage）
5. 成功通知を表示
6. プラン一覧に遷移
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
// lib/errors.ts
export class SublyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SublyError';
  }
}

export class WalletNotConnectedError extends SublyError {
  constructor() {
    super('ウォレットが接続されていません', 'WALLET_NOT_CONNECTED');
  }
}

export class BusinessNotFoundError extends SublyError {
  constructor() {
    super('事業者情報が見つかりません', 'BUSINESS_NOT_FOUND');
  }
}

export class PlanValidationError extends SublyError {
  constructor(message: string) {
    super(message, 'PLAN_VALIDATION_ERROR');
  }
}
```

### エラーハンドリングパターン

- フォームバリデーションエラー: インラインで表示
- API/サービスエラー: Toast通知で表示
- 認証エラー: ログイン画面にリダイレクト

## テスト戦略

### ユニットテスト
- `services/mockPlanService.ts`: プランCRUD操作
- `lib/validation.ts`: バリデーションロジック
- `lib/formatters.ts`: フォーマット関数

### 統合テスト
- プラン作成→一覧表示フロー
- ウォレット接続→事業者登録フロー

## 依存ライブラリ

```json
{
  "dependencies": {
    "next": "16.1.4",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@solana/web3.js": "^1.98.0",
    "lucide-react": "^0.469.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## ディレクトリ構造

```
apps/dashboard-business/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # ホーム（ウォレット接続）
│   ├── register/
│   │   └── page.tsx              # 事業者登録
│   ├── dashboard/
│   │   ├── layout.tsx            # ダッシュボードレイアウト
│   │   ├── page.tsx              # ダッシュボードホーム
│   │   ├── plans/
│   │   │   ├── page.tsx          # プラン一覧
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # プラン作成
│   │   │   └── [planId]/
│   │   │       ├── page.tsx      # プラン詳細
│   │   │       └── edit/
│   │   │           └── page.tsx  # プラン編集
│   │   └── settings/
│   │       └── page.tsx          # 設定
│   └── globals.css
├── components/
│   ├── ui/                       # 基本UIコンポーネント
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   └── textarea.tsx
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── dashboard-layout.tsx
│   ├── wallet/
│   │   └── wallet-button.tsx
│   ├── plans/
│   │   ├── plan-card.tsx
│   │   ├── plan-list.tsx
│   │   └── plan-form.tsx
│   └── business/
│       └── business-register-form.tsx
├── hooks/
│   ├── use-plans.ts
│   ├── use-business.ts
│   └── use-toast.ts
├── lib/
│   ├── constants.ts              # 定数定義
│   ├── errors.ts                 # エラークラス
│   ├── utils.ts                  # ユーティリティ
│   └── validation.ts             # バリデーション
├── providers/
│   ├── wallet-provider.tsx       # Wallet Adapter Provider
│   └── toast-provider.tsx        # Toast Provider
├── services/
│   └── mock-plan-service.ts      # モックプランサービス
├── types/
│   ├── plan.ts                   # プラン型定義
│   └── business.ts               # 事業者型定義
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 実装の順序

1. 基盤セットアップ（依存関係、設定ファイル）
2. 基本UIコンポーネント作成
3. Wallet Provider設定
4. レイアウトコンポーネント作成
5. 型定義とモックサービス作成
6. 各ページ実装
7. 品質チェックと修正

## セキュリティ考慮事項

- ウォレット秘密鍵はブラウザ拡張機能で管理（アプリは触れない）
- LocalStorageに保存するデータは公開可能な情報のみ
- XSS対策: Reactの自動エスケープを活用
- CSRF対策: 現時点ではサーバーサイドAPIがないため不要

## パフォーマンス考慮事項

- 初期ロードを軽量に保つ（不要なSDKは後続で追加）
- 画像は最適化して配信
- コード分割（Next.js App Router自動対応）

## 将来の拡張性

- モックサービスを実サービスに差し替えやすい設計
- SDKクライアントは`lib/`に集約
- 型定義は`types/`で一元管理
