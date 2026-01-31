# 設計書

## アーキテクチャ概要

Subly SDKは事業者アプリに組み込むためのTypeScriptクライアントライブラリです。Anchor Program IDLを活用してトランザクションを構築し、Arciumクライアントと連携して暗号化処理を行います。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SDK Architecture                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   Merchant App   │     │   User Wallet    │     │   Subly SDK      │    │
│  │   (事業者アプリ)  │────>│   (Phantom等)    │<────│   (TypeScript)   │    │
│  └──────────────────┘     └────────┬─────────┘     └────────┬─────────┘    │
│                                    │                        │               │
│                                    │                        │               │
│  ┌─────────────────────────────────┼────────────────────────┼───────────┐  │
│  │                         Solana Blockchain                             │  │
│  │                                 │                        │            │  │
│  │  ┌──────────────────────────────▼────────────────────────▼─────────┐  │  │
│  │  │                    Subly Anchor Program                          │  │  │
│  │  │                 (privacy_subscriptions)                          │  │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐                       │  │  │
│  │  │  │ Non-Encrypted   │  │ Encrypted IXs   │                       │  │  │
│  │  │  │ (getPlans等)    │  │ (subscribe等)   │                       │  │  │
│  │  │  └─────────────────┘  └────────┬────────┘                       │  │  │
│  │  └────────────────────────────────┼────────────────────────────────┘  │  │
│  │                                   │                                    │  │
│  │  ┌────────────────────────────────▼────────────────────────────────┐  │  │
│  │  │                      Arcium Program                              │  │  │
│  │  │         (Queue Computation / Callback Handler)                   │  │  │
│  │  └────────────────────────────────┬────────────────────────────────┘  │  │
│  └───────────────────────────────────┼────────────────────────────────────┘  │
│                                      │                                       │
│                            ┌─────────▼─────────┐                            │
│                            │   Arcium MPC      │                            │
│                            │   Cluster         │                            │
│                            └───────────────────┘                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. SublySDK クラス（メインエントリポイント）

**責務**:
- SDK全体の初期化と設定管理
- 公開APIの提供（checkSubscription, subscribe, unsubscribe, getPlans, getPlan）
- 内部コンポーネントのオーケストレーション

**実装の要点**:
- シングルトンではなく、複数インスタンス化可能（異なる事業者で使用可能）
- Connection, Program, ArciumClientを内部で保持
- 非同期メソッドでPromiseを返却

```typescript
export class SublySDK {
  private connection: Connection;
  private program: Program<PrivacySubscriptions>;
  private arciumClient: ArciumClient;
  private merchantWallet: PublicKey;

  constructor(config: SublyConfig);

  // Subscription methods
  async checkSubscription(userWallet: PublicKey, planId: PublicKey): Promise<SubscriptionStatus>;
  async subscribe(planId: PublicKey, wallet: Wallet): Promise<TransactionSignature>;
  async unsubscribe(subscriptionIndex: number, wallet: Wallet): Promise<TransactionSignature>;

  // Plan methods
  async getPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>;
  async getPlan(planId: PublicKey): Promise<SubscriptionPlan | null>;
}
```

### 2. Instructions モジュール

**責務**:
- トランザクションインストラクションの構築
- PDAアドレスの導出
- Arcium暗号化パラメータの準備

**実装の要点**:
- AnchorのProgramインスタンスを使用してインストラクション構築
- PDA Seedsの正確な計算
- Arcium ArgBuilderを使用した暗号化引数の構築

```typescript
// instructions/subscribe.ts
export async function buildSubscribeInstruction(
  program: Program<PrivacySubscriptions>,
  arciumClient: ArciumClient,
  user: PublicKey,
  plan: SubscriptionPlan,
  subscriptionIndex: number,
): Promise<TransactionInstruction>;
```

### 3. Accounts モジュール

**責務**:
- PDAアドレスの導出関数
- アカウントデータのフェッチとデコード
- getProgramAccountsを使用したバッチフェッチ

**実装の要点**:
- AnchorのAccountClientを活用
- メモリ効率を考慮したストリーミングフェッチ
- 型安全なデコード

```typescript
// accounts/pda.ts
export function deriveSubscriptionPlanPDA(
  merchant: PublicKey,
  planId: BN,
  programId: PublicKey,
): [PublicKey, number];

export function deriveUserSubscriptionPDA(
  user: PublicKey,
  subscriptionIndex: BN,
  programId: PublicKey,
): [PublicKey, number];
```

### 4. Types モジュール

**責務**:
- 公開型定義（SubscriptionStatus, SubscriptionPlan等）
- 内部型定義
- Anchor IDLから生成された型の再エクスポート

**実装の要点**:
- 明確なexport（publicとinternalの分離）
- JSDoc/TSDocによる型ドキュメント
- BN型とnumber/bigint型の相互変換ヘルパー

```typescript
// types/index.ts
export enum SubscriptionStatus {
  NotSubscribed = "not_subscribed",
  Active = "active",
  Cancelled = "cancelled",
  Expired = "expired",
}

export interface SubscriptionPlan {
  publicKey: PublicKey;
  merchant: PublicKey;
  name: string;
  mint: PublicKey;
  price: BN;
  billingCycleDays: number;
  isActive: boolean;
}

export interface SublyConfig {
  rpcEndpoint: string;
  merchantWallet: string | PublicKey;
  programId?: string | PublicKey;
  arciumConfig?: ArciumConfig;
}
```

### 5. Encryption モジュール

**責務**:
- Arciumクライアントのラッパー
- 暗号化/復号化ヘルパー関数
- MXE共有秘密の管理

**実装の要点**:
- @arcium-hq/clientの薄いラッパー
- エラーハンドリングの統一
- 暗号化失敗時のリトライロジック（必要に応じて）

```typescript
// encryption/arcium.ts
export async function encryptForComputation(
  arciumClient: ArciumClient,
  value: number | BN,
  computationType: string,
): Promise<Uint8Array>;
```

## データフロー

### checkSubscription フロー
```
1. SDK.checkSubscription(userWallet, planId) 呼び出し
2. UserSubscription PDAアドレスを導出
3. verify_subscription インストラクションを構築
4. トランザクションを送信
5. Arcium MPCが暗号化状態を検証
6. verify_subscription_callback で結果を受信
7. SubscriptionStatus を返却
```

### subscribe フロー
```
1. SDK.subscribe(planId, wallet) 呼び出し
2. SubscriptionPlan をフェッチしてprice/billingCycleDaysを取得
3. ユーザーのsubscription_countを取得（UserLedgerから）
4. 暗号化パラメータを構築（encrypted_plan, encrypted_price等）
5. subscribe インストラクションを構築
6. ユーザーに署名を要求
7. トランザクションを送信
8. Arcium MPCが残高検証と帳簿更新を実行
9. subscribe_callback でUserSubscriptionが作成される
10. トランザクション署名を返却
```

### getPlans フロー
```
1. SDK.getPlans(activeOnly?) 呼び出し
2. getProgramAccounts でSubscriptionPlan PDAを全取得
   - filters: [{ memcmp: { offset: 8, bytes: merchantWallet.toBase58() } }]
3. 各アカウントをデコード
4. activeOnly=true の場合、isActive=true のみフィルタ
5. SubscriptionPlan[] を返却
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
// errors/index.ts
export class SublyError extends Error {
  constructor(message: string, public code: SublyErrorCode) {
    super(message);
    this.name = 'SublyError';
  }
}

export enum SublyErrorCode {
  NotConnected = 'NOT_CONNECTED',
  InvalidConfig = 'INVALID_CONFIG',
  PlanNotFound = 'PLAN_NOT_FOUND',
  SubscriptionNotFound = 'SUBSCRIPTION_NOT_FOUND',
  InsufficientBalance = 'INSUFFICIENT_BALANCE',
  TransactionFailed = 'TRANSACTION_FAILED',
  ArciumError = 'ARCIUM_ERROR',
}
```

### エラーハンドリングパターン

- Anchor ProgramのカスタムエラーをSublyErrorに変換
- ネットワークエラーのリトライ（3回まで）
- ユーザーフレンドリーなエラーメッセージ

## テスト戦略

### ユニットテスト
- PDA導出関数のテスト
- 型変換関数のテスト
- エラーハンドリングのテスト

### 統合テスト（Devnet/Localnet）
- SDK初期化テスト
- getPlans/getPlanテスト
- subscribe/unsubscribeテスト（Arcium Devnet必要）
- checkSubscriptionテスト（Arcium Devnet必要）

**注意**: Arcium MPC処理を伴うテストはDevnet環境でのみ実行可能

## 依存ライブラリ

```json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@solana/web3.js": "^1.95.0",
    "@arcium-hq/client": "0.6.3",
    "bn.js": "^5.2.1"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/bn.js": "^5.1.0",
    "vitest": "^1.0.0"
  }
}
```

## ディレクトリ構造

```
sdk/
├── package.json             # npm設定
├── tsconfig.json            # TypeScript設定
├── vitest.config.ts         # Vitestテスト設定
├── README.md                # SDK使用ガイド
└── src/
    ├── index.ts             # エントリポイント（re-export）
    ├── client.ts            # SublySDKクラス
    ├── instructions/        # インストラクションビルダー
    │   ├── index.ts
    │   ├── subscribe.ts
    │   ├── unsubscribe.ts
    │   └── verify.ts
    ├── accounts/            # アカウント取得・デコード
    │   ├── index.ts
    │   ├── pda.ts           # PDA導出関数
    │   └── fetch.ts         # アカウントフェッチ
    ├── encryption/          # Arcium暗号化処理
    │   ├── index.ts
    │   └── arcium.ts
    ├── types/               # 型定義
    │   ├── index.ts
    │   ├── config.ts
    │   ├── subscription.ts
    │   └── plan.ts
    └── errors/              # エラークラス
        └── index.ts
```

## 実装の順序

1. プロジェクトセットアップ（package.json, tsconfig.json）
2. 型定義（types/）
3. エラークラス（errors/）
4. PDA導出関数（accounts/pda.ts）
5. アカウントフェッチ（accounts/fetch.ts）
6. Arcium暗号化ラッパー（encryption/）
7. インストラクションビルダー（instructions/）
8. SublySDKクラス（client.ts）
9. エントリポイント（index.ts）
10. テスト作成

## セキュリティ考慮事項

- **秘密鍵の扱い**: SDKは秘密鍵を保持しない。署名はWalletに委譲
- **RPC接続**: HTTPS必須、信頼できるRPCプロバイダーを推奨
- **入力バリデーション**: PublicKey, BN等の入力を厳密にバリデート
- **エラーメッセージ**: 機密情報を含まない安全なエラーメッセージ

## パフォーマンス考慮事項

- **接続プール**: Connectionインスタンスの再利用
- **バッチフェッチ**: getMultipleAccountsInfoの活用
- **キャッシュ**: 頻繁にアクセスするプラン情報のオプショナルキャッシュ
- **遅延ロード**: Arciumクライアントは必要時に初期化

## 将来の拡張性

- **User Dashboard SDK**: Deposit/Withdraw機能の追加（別パッケージとして）
- **Merchant SDK**: 事業者管理機能（プラン作成、収益Claim等）
- **React Hooks**: useSublySubscription, useSublyPlans等のReactフック
- **イベント監視**: WebSocketを使用したリアルタイム更新
