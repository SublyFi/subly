# 設計書

## アーキテクチャ概要

User Dashboard と同じ Next.js 14 App Router ベースのアーキテクチャを採用し、`/merchant` ルートとして Merchant Dashboard を追加します。既存の `app/` ディレクトリ構造を拡張し、事業者向け機能を実装します。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Merchant Dashboard Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Next.js App (app/)                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    App Router (src/app/)                         │  │  │
│  │  │  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │  │  │
│  │  │  │  /merchant  │  │ /merchant/plans  │  │ /merchant/revenue  │  │  │  │
│  │  │  │  (Home)     │  │ (Plan管理)       │  │ (収益/Claim)       │  │  │  │
│  │  │  └─────────────┘  └──────────────────┘  └────────────────────┘  │  │  │
│  │  │                                                                   │  │  │
│  │  │  ┌─────────────────────────┐  ┌─────────────────────────────┐   │  │  │
│  │  │  │ /merchant/register      │  │ /merchant/sdk-guide        │   │  │  │
│  │  │  │ (事業者登録)            │  │ (SDKセットアップガイド)     │   │  │  │
│  │  │  └─────────────────────────┘  └─────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                   Merchant Client Components                     │  │  │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │  │  │
│  │  │  │ RevenueCard    │  │ PlanCard       │  │ ClaimForm        │  │  │  │
│  │  │  │ MerchantStats  │  │ PlanForm       │  │ SDKCodeBlock     │  │  │  │
│  │  │  │ RegistrationForm│ │ PlanList       │  │ ActiveSubsCount  │  │  │  │
│  │  │  └────────────────┘  └────────────────┘  └──────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Merchant Hooks Layer                          │  │  │
│  │  │  useMerchant | usePlans | useRevenue | useClaim | useActiveSubs │  │  │
│  │  └──────────────────────────────┬──────────────────────────────────┘  │  │
│  └─────────────────────────────────┼──────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼──────────────────────────────────────┐  │
│  │                      SDK/Lib Layer (src/lib/)                          │  │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │  │
│  │  │ merchant.ts      - Merchant関連トランザクション構築                 │ │  │
│  │  │ arcium.ts        - Arcium暗号化/復号ユーティリティ（既存）          │ │  │
│  │  │ anchor.ts        - Anchorプログラムクライアント（既存）             │ │  │
│  │  │ pda.ts           - PDA導出ユーティリティ（Merchant系追加）          │ │  │
│  │  │ solana.ts        - Connection, RPC（既存）                         │ │  │
│  │  │ constants.ts     - プログラムID、シード定数（既存）                 │ │  │
│  │  └───────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                          ┌─────────▼─────────┐                              │
│                          │  Solana Devnet    │                              │
│                          │  ┌─────────────┐  │                              │
│                          │  │   Subly     │  │                              │
│                          │  │  Program    │  │                              │
│                          │  └──────┬──────┘  │                              │
│                          │         │         │                              │
│                          │  ┌──────▼──────┐  │                              │
│                          │  │  Arcium MPC │  │                              │
│                          │  │  Network    │  │                              │
│                          │  └─────────────┘  │                              │
│                          └───────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. ページコンポーネント

#### /merchant (Merchant Dashboard Home)

**責務**:
- 事業者登録済みかの判定・リダイレクト
- 収益概要表示（累計収益、アクティブサブスクライバー数、今月の収益）
- クイックアクションリンク

**実装の要点**:
- `useMerchant` フックで Merchant PDA の存在確認
- 未登録の場合は `/merchant/register` へリダイレクト
- `useRevenue` フックで MerchantLedger から暗号化残高を取得・復号

#### /merchant/register (事業者登録)

**責務**:
- 事業者名入力フォーム
- `register_merchant` トランザクション送信
- 登録完了後のリダイレクト

**実装の要点**:
- 既に登録済みの場合は `/merchant` へリダイレクト
- トランザクション状態表示（loading/success/error）

#### /merchant/plans (プラン管理)

**責務**:
- プラン一覧表示
- プラン作成フォーム
- プラン編集・有効化/無効化

**実装の要点**:
- `usePlans` フックで `getProgramAccounts` からプラン取得
- `create_subscription_plan` / `update_subscription_plan` トランザクション

#### /merchant/revenue (収益・Claim)

**責務**:
- 引き出し可能金額表示（復号済み）
- Claim 金額入力・送信
- トランザクション状態表示

**実装の要点**:
- `useClaim` フックで `claim_revenue` トランザクション構築
- Arcium MPC コールバック完了待機
- 残高自動リフレッシュ

#### /merchant/sdk-guide (SDK セットアップガイド)

**責務**:
- SDK インストールコマンド表示
- 初期化コードサンプル表示
- Merchant Wallet アドレスのコピー機能
- Program ID の表示

### 2. 機能コンポーネント

#### MerchantRegistrationForm (src/components/merchant/MerchantRegistrationForm.tsx)

**責務**:
- 事業者名入力
- 登録トランザクション送信
- バリデーション（1-64文字）

**Props**:
```typescript
interface MerchantRegistrationFormProps {
  onSuccess: () => void;
}
```

#### RevenueCard (src/components/merchant/RevenueCard.tsx)

**責務**:
- 累計収益の表示
- Arcium SDK で復号した金額表示
- ローディング・エラー状態表示

**Props**:
```typescript
interface RevenueCardProps {
  title: string;
  encrypted?: boolean; // true の場合は復号ボタン表示
}
```

#### MerchantStats (src/components/merchant/MerchantStats.tsx)

**責務**:
- ダッシュボードホームの統計カード3つを表示
- 累計収益、アクティブサブスクライバー数、今月の収益

#### PlanCard (src/components/merchant/PlanCard.tsx)

**責務**:
- 単一プランの表示
- 編集・Toggle ボタン

**Props**:
```typescript
interface PlanCardProps {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onToggle: () => void;
}
```

#### PlanForm (src/components/merchant/PlanForm.tsx)

**責務**:
- プラン作成/編集フォーム
- プラン名、価格、請求サイクル入力
- バリデーション

**Props**:
```typescript
interface PlanFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<SubscriptionPlan>;
  onSubmit: (data: PlanFormData) => Promise<void>;
  onCancel: () => void;
}
```

#### PlanList (src/components/merchant/PlanList.tsx)

**責務**:
- プラン一覧表示
- 空状態の表示
- 作成ボタン

#### ClaimForm (src/components/merchant/ClaimForm.tsx)

**責務**:
- 引き出し可能金額表示
- Claim 金額入力
- Claim トランザクション送信

**Props**:
```typescript
interface ClaimFormProps {
  availableBalance: number;
  onClaim: (amount: number) => Promise<void>;
}
```

#### ActiveSubsCount (src/components/merchant/ActiveSubsCount.tsx)

**責務**:
- アクティブサブスクライバー数の表示
- オンチェーンから集計

#### SDKCodeBlock (src/components/merchant/SDKCodeBlock.tsx)

**責務**:
- コードサンプルのシンタックスハイライト表示
- コピーボタン

### 3. フック（Hooks）

#### useMerchant (src/hooks/useMerchant.ts)

**責務**:
- Merchant PDA の存在確認
- Merchant アカウント情報の取得
- 登録状態の管理

```typescript
interface UseMerchantReturn {
  isRegistered: boolean;
  merchant: Merchant | null;
  isLoading: boolean;
  error: Error | null;
  register: (name: string) => Promise<string>;
  refresh: () => Promise<void>;
}
```

#### usePlans (src/hooks/usePlans.ts)

**責務**:
- 事業者のプラン一覧取得
- プラン作成・更新

```typescript
interface UsePlansReturn {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
  createPlan: (data: CreatePlanData) => Promise<string>;
  updatePlan: (planPda: PublicKey, data: UpdatePlanData) => Promise<string>;
  togglePlan: (planPda: PublicKey, isActive: boolean) => Promise<string>;
  refresh: () => Promise<void>;
}
```

#### useRevenue (src/hooks/useRevenue.ts)

**責務**:
- MerchantLedger から暗号化残高取得
- Arcium SDK で復号
- 今月の収益計算（将来的にはオンチェーンで集計）

```typescript
interface UseRevenueReturn {
  totalRevenue: number | null; // 復号後の残高（lamports）
  isDecrypting: boolean;
  error: Error | null;
  decrypt: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

#### useClaim (src/hooks/useClaim.ts)

**責務**:
- `claim_revenue` トランザクション構築・送信
- Arcium MPC コールバック待機

```typescript
interface UseClaimReturn {
  claim: (amount: number) => Promise<string>;
  state: 'idle' | 'encrypting' | 'sending' | 'waiting_mpc' | 'success' | 'error';
  error: Error | null;
  txSignature: string | null;
}
```

#### useActiveSubscribers (src/hooks/useActiveSubscribers.ts)

**責務**:
- 事業者のプランに紐づく UserSubscription をカウント

```typescript
interface UseActiveSubscribersReturn {
  count: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

## データフロー

### 事業者登録フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Merchant Registration Flow                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User accesses /merchant                                                  │
│     └─> useMerchant: Check if Merchant PDA exists                           │
│         └─> connection.getAccountInfo(merchantPDA)                          │
│                                                                              │
│  2. If not registered                                                        │
│     └─> Redirect to /merchant/register                                      │
│                                                                              │
│  3. User enters merchant name                                                │
│     └─> MerchantRegistrationForm: name = "My Company"                       │
│                                                                              │
│  4. Build & Send Transaction                                                 │
│     └─> program.methods.registerMerchant(name)                              │
│         .accounts({                                                          │
│           wallet: wallet.publicKey,                                          │
│           mint: NATIVE_MINT,                                                 │
│           merchant: merchantPDA,                                             │
│           merchantLedger: merchantLedgerPDA,                                 │
│           systemProgram: SystemProgram.programId,                            │
│         })                                                                   │
│         .rpc()                                                               │
│                                                                              │
│  5. On-chain Execution                                                       │
│     └─> Subly Program                                                       │
│         ├─> Create Merchant PDA (name, is_active=true, registered_at)       │
│         └─> Create MerchantLedger PDA (encrypted_balance=0)                 │
│                                                                              │
│  6. Redirect to /merchant                                                    │
│     └─> Merchant Dashboard Home                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### プラン作成フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Plan Creation Flow                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User Input                                                               │
│     └─> PlanForm: name="Premium", price=1 SOL, billing_cycle=30 days        │
│                                                                              │
│  2. Generate Plan ID                                                         │
│     └─> planId = getMerchantPlanCount() + 1 (またはランダムu64)             │
│                                                                              │
│  3. Derive Plan PDA                                                          │
│     └─> getSubscriptionPlanPDA(merchantPDA, planId)                         │
│                                                                              │
│  4. Build & Send Transaction                                                 │
│     └─> program.methods.createSubscriptionPlan(planId, name, price, days)   │
│         .accounts({                                                          │
│           wallet: wallet.publicKey,                                          │
│           merchant: merchantPDA,                                             │
│           mint: NATIVE_MINT,                                                 │
│           subscriptionPlan: planPDA,                                         │
│           systemProgram: SystemProgram.programId,                            │
│         })                                                                   │
│         .rpc()                                                               │
│                                                                              │
│  5. On-chain Execution                                                       │
│     └─> Subly Program                                                       │
│         └─> Create SubscriptionPlan PDA                                     │
│             (merchant, name, mint, price, billing_cycle_days, is_active=true)│
│                                                                              │
│  6. Refresh Plan List                                                        │
│     └─> usePlans.refresh()                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Claim（収益引き出し）フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Claim Revenue Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Display Available Balance                                                │
│     └─> useRevenue: Fetch & decrypt MerchantLedger.encrypted_balance        │
│         └─> arciumContext.cipher.decrypt() → 10.5 SOL                       │
│                                                                              │
│  2. User Input                                                               │
│     └─> ClaimForm: amount = 5 SOL                                           │
│                                                                              │
│  3. Create Arcium Context                                                    │
│     └─> createArciumContext()                                               │
│         ├─> getMXEPublicKey() → MXE X25519 公開鍵                           │
│         ├─> x25519.randomSecretKey() → ユーザー秘密鍵                        │
│         ├─> x25519.getPublicKey() → ユーザー公開鍵                          │
│         └─> new RescueCipher() → 暗号化インスタンス                          │
│                                                                              │
│  4. Encrypt Claim Amount                                                     │
│     └─> cipher.encrypt([5_000_000_000n], nonce)                             │
│         └─> encrypted_amount: [u8; 32]                                      │
│                                                                              │
│  5. Build & Send Transaction                                                 │
│     └─> program.methods.claimRevenue(                                       │
│           computationOffset, encryptedAmount, pubkey, nonce                 │
│         )                                                                    │
│         .accounts({                                                          │
│           merchant: merchantPDA,                                             │
│           merchantLedger: merchantLedgerPDA,                                 │
│           wallet: wallet.publicKey,                                          │
│           protocolPool: protocolPoolPDA,                                     │
│           poolTokenAccount,                                                  │
│           merchantTokenAccount,                                              │
│           // Arcium accounts...                                              │
│         })                                                                   │
│         .rpc()                                                               │
│                                                                              │
│  6. On-chain: Queue Computation                                              │
│     └─> Subly Program                                                       │
│         └─> queue_computation(claim_revenue)                                │
│                                                                              │
│  7. Arcium MPC Computation                                                   │
│     └─> claim_revenue.arcis circuit                                         │
│         ├─> Check: encrypted_balance >= encrypted_amount                    │
│         ├─> new_balance = encrypted_balance - encrypted_amount              │
│         └─> actual_amount (平文で出力)                                       │
│                                                                              │
│  8. Callback Execution                                                       │
│     └─> claim_revenue_callback()                                            │
│         ├─> MerchantLedger.encrypted_balance = new_balance                  │
│         └─> Transfer actual_amount from Pool → Merchant Wallet              │
│                                                                              │
│  9. Client Finalization                                                      │
│     └─> awaitComputationFinalization()                                      │
│         └─> トランザクション完了                                              │
│                                                                              │
│  10. Refresh Balance                                                         │
│      └─> useRevenue.refresh()                                               │
│          └─> 新残高 5.5 SOL                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### アクティブサブスクライバー数取得フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Active Subscribers Count Flow                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Get Merchant's Plans                                                     │
│     └─> usePlans: getProgramAccounts for SubscriptionPlan                   │
│         └─> Filter: merchant === wallet.publicKey                           │
│         └─> Result: [Plan A, Plan B, ...]                                   │
│                                                                              │
│  2. For Each Plan, Count UserSubscriptions                                   │
│     └─> getProgramAccounts for UserSubscription                             │
│         ├─> Filter: encrypted_plan matches (復号して比較 or 別手段)        │
│         └─> Note: プライバシー保護のため、planは暗号化されている            │
│                                                                              │
│  3. Alternative Approach (推奨)                                              │
│     └─> MerchantLedger に subscription_count フィールドを追加               │
│         ├─> Subscribe 時にインクリメント                                     │
│         └─> Unsubscribe 時にデクリメント                                     │
│     ※ 現状のオンチェーンプログラムでは未実装のため、                         │
│       getProgramAccounts で status=Active をカウントする方式を採用          │
│                                                                              │
│  4. Display Count                                                            │
│     └─> MerchantStats: "123 active subscribers"                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## エラーハンドリング戦略

### エラー種別

| エラー種別 | 対応 |
|-----------|------|
| ウォレット未接続 | 接続を促すメッセージ表示、Connect ボタンへ誘導 |
| 未登録事業者 | `/merchant/register` へリダイレクト |
| プラン名重複 | エラーメッセージ表示（オンチェーンではplanIdで識別するため実際には発生しにくい） |
| Claim 残高不足 | エラーメッセージ表示、最大金額を入力欄に表示 |
| トランザクション失敗 | エラーメッセージ表示、リトライボタン |
| Arcium MPC タイムアウト | タイムアウトメッセージ、リトライ案内 |
| ネットワークエラー | 接続エラーメッセージ、自動リトライ |

### カスタムエラークラス

```typescript
// src/lib/errors.ts

export class MerchantNotRegisteredError extends Error {
  constructor() {
    super('Merchant not registered. Please register first.');
    this.name = 'MerchantNotRegisteredError';
  }
}

export class InsufficientRevenueError extends Error {
  constructor(available: number, requested: number) {
    super(`Insufficient revenue. Available: ${available}, Requested: ${requested}`);
    this.name = 'InsufficientRevenueError';
  }
}

export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`);
    this.name = 'PlanNotFoundError';
  }
}

export class MPCComputationError extends Error {
  constructor(message: string) {
    super(`MPC computation failed: ${message}`);
    this.name = 'MPCComputationError';
  }
}

export class MPCTimeoutError extends Error {
  constructor() {
    super('MPC computation timed out. Please try again.');
    this.name = 'MPCTimeoutError';
  }
}
```

### エラーハンドリングパターン

```typescript
// hooks/useClaim.ts
const useClaim = () => {
  const [state, setState] = useState<ClaimState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const claim = async (amount: number) => {
    try {
      setState('encrypting');
      setError(null);

      // 金額の暗号化
      const { encryptedAmount, nonce, pubkey } = await encryptClaimAmount(amount);

      setState('sending');
      // トランザクション送信
      const signature = await sendClaimTransaction(encryptedAmount, nonce, pubkey);

      setState('waiting_mpc');
      // MPC完了待機（タイムアウト付き）
      await awaitComputationFinalization(signature, { timeout: 60000 });

      setState('success');
      return signature;
    } catch (e) {
      setState('error');
      if (e instanceof InsufficientRevenueError) {
        setError(e);
      } else if (e.message?.includes('timeout')) {
        setError(new MPCTimeoutError());
      } else {
        setError(new Error('Claim failed. Please try again.'));
      }
      throw e;
    }
  };

  return { claim, state, error };
};
```

## テスト戦略

### コンポーネントテスト

- MerchantRegistrationForm: バリデーション、送信状態
- PlanForm: バリデーション、作成/編集モード切り替え
- ClaimForm: 金額バリデーション、最大金額制限
- RevenueCard: 復号状態、ローディング表示

### フックテスト

- useMerchant: 登録状態判定、登録トランザクション
- usePlans: プラン一覧取得、作成、更新
- useClaim: 暗号化、トランザクション送信、MPC待機

### E2E テスト（将来）

- ウォレット接続 → 事業者登録 → ダッシュボード表示
- プラン作成 → プラン一覧確認 → プラン編集
- 収益確認 → Claim → 残高更新確認

## 依存ライブラリ

既存の User Dashboard と共通のため、追加の依存ライブラリはありません。

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@solana/web3.js": "^1.95.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@coral-xyz/anchor": "^0.30.1",
    "@arcium-hq/client": "^0.1.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.300.0"
  }
}
```

## ディレクトリ構造

```
app/
└── src/
    ├── app/
    │   ├── merchant/
    │   │   ├── layout.tsx              # Merchant Dashboard レイアウト
    │   │   ├── page.tsx                # Merchant Home（/merchant）
    │   │   │
    │   │   ├── register/
    │   │   │   └── page.tsx            # 事業者登録
    │   │   │
    │   │   ├── plans/
    │   │   │   ├── page.tsx            # プラン一覧
    │   │   │   ├── create/
    │   │   │   │   └── page.tsx        # プラン作成
    │   │   │   └── [planId]/
    │   │   │       └── edit/
    │   │   │           └── page.tsx    # プラン編集
    │   │   │
    │   │   ├── revenue/
    │   │   │   └── page.tsx            # 収益・Claim
    │   │   │
    │   │   └── sdk-guide/
    │   │       └── page.tsx            # SDK セットアップガイド
    │   │
    │   └── ... (既存の User Dashboard ルート)
    │
    ├── components/
    │   ├── merchant/
    │   │   ├── MerchantRegistrationForm.tsx
    │   │   ├── RevenueCard.tsx
    │   │   ├── MerchantStats.tsx
    │   │   ├── PlanCard.tsx
    │   │   ├── PlanForm.tsx
    │   │   ├── PlanList.tsx
    │   │   ├── ClaimForm.tsx
    │   │   ├── ActiveSubsCount.tsx
    │   │   └── SDKCodeBlock.tsx
    │   │
    │   ├── layout/
    │   │   └── MerchantSidebar.tsx      # Merchant 用サイドバー
    │   │
    │   └── ... (既存コンポーネント)
    │
    ├── hooks/
    │   ├── useMerchant.ts
    │   ├── usePlans.ts
    │   ├── useRevenue.ts
    │   ├── useClaim.ts
    │   ├── useActiveSubscribers.ts
    │   └── ... (既存フック)
    │
    ├── lib/
    │   ├── merchant.ts                  # Merchant トランザクション構築
    │   ├── arcium.ts                    # (既存) 暗号化/復号
    │   ├── anchor.ts                    # (既存) Anchor クライアント
    │   ├── pda.ts                       # (既存 + Merchant PDA 追加)
    │   ├── constants.ts                 # (既存)
    │   ├── errors.ts                    # カスタムエラークラス追加
    │   └── ... (既存ライブラリ)
    │
    └── types/
        ├── merchant.ts                  # Merchant 関連型定義
        └── index.ts                     # (既存 + エクスポート追加)
```

## 実装の順序

### フェーズ1: 基盤整備

1. PDA ユーティリティの拡張（Merchant, MerchantLedger PDA）
2. Merchant 関連の型定義追加
3. カスタムエラークラスの作成

### フェーズ2: 事業者登録機能

1. `useMerchant` フック実装
2. MerchantRegistrationForm コンポーネント実装
3. `/merchant/register` ページ実装
4. `/merchant` ページの登録判定・リダイレクトロジック

### フェーズ3: プラン管理機能

1. `usePlans` フック実装
2. PlanCard, PlanForm, PlanList コンポーネント実装
3. `/merchant/plans` ページ実装
4. `/merchant/plans/create` ページ実装
5. `/merchant/plans/[planId]/edit` ページ実装

### フェーズ4: 収益ダッシュボード

1. `useRevenue` フック実装（MerchantLedger 取得・復号）
2. `useActiveSubscribers` フック実装
3. RevenueCard, MerchantStats コンポーネント実装
4. `/merchant` ページの統計表示

### フェーズ5: Claim 機能

1. `useClaim` フック実装
2. ClaimForm コンポーネント実装
3. `/merchant/revenue` ページ実装

### フェーズ6: SDK セットアップガイド

1. SDKCodeBlock コンポーネント実装
2. `/merchant/sdk-guide` ページ実装

### フェーズ7: レイアウト・ナビゲーション

1. MerchantSidebar コンポーネント実装
2. `/merchant/layout.tsx` 実装
3. ナビゲーション統合

### フェーズ8: 品質チェック

1. TypeScript 型チェック
2. ESLint チェック
3. ビルド確認
4. 動作確認（Devnet）

## セキュリティ考慮事項

- **秘密鍵の扱い**: ウォレットアダプター経由で署名。アプリは秘密鍵にアクセスしない
- **X25519 秘密鍵**: メモリ内のみ、永続化しない
- **ノンスの一意性**: `randomBytes(16)` で毎回新しいノンスを生成
- **入力バリデーション**: クライアントサイドとオンチェーン両方でバリデーション
- **XSS 対策**: React の自動エスケープ、dangerouslySetInnerHTML 不使用
- **Claim 金額検証**: オンチェーンで残高チェック（MPCが実行）

## パフォーマンス考慮事項

- **コード分割**: Next.js の自動コード分割（/merchant ルートは遅延ロード）
- **Server Components**: 静的部分は Server Component で SSR
- **getProgramAccounts 最適化**: `dataSlice` と `filters` を活用して転送量削減
- **MPC 待機中の UX**: ローディング状態を明確に表示、タイムアウト処理
- **復号結果のキャッシュ**: セッション中は復号済み残高をメモリキャッシュ

## 将来の拡張性

- **マルチトークン対応**: 現在は SOL のみだが、将来的に SPL トークン対応
- **詳細レポート機能**: 期間別収益レポート、CSV エクスポート
- **Webhook 通知**: 新規サブスクライバー通知、支払い通知
- **多言語対応**: next-intl 導入可能な構造
- **ダークモード**: CSS 変数によるテーマ切り替え対応済み

---

## PDA 導出ユーティリティ（追加分）

```typescript
// src/lib/pda.ts への追加

/**
 * Merchant PDA を導出
 */
export function getMerchantPDA(
  wallet: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.MERCHANT, wallet.toBuffer()],
    programId
  );
}

/**
 * MerchantLedger PDA を導出
 */
export function getMerchantLedgerPDA(
  merchant: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.MERCHANT_LEDGER, merchant.toBuffer(), mint.toBuffer()],
    programId
  );
}
```

## トランザクション構築ヘルパー（Merchant 用）

```typescript
// src/lib/merchant.ts

import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { getMerchantPDA, getMerchantLedgerPDA, getSubscriptionPlanPDA } from "./pda";
import { ArciumContext, encryptAmount } from "./arcium";
import { randomBytes } from "crypto";
import {
  getCompDefAccAddress,
  getComputationAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getClusterAccAddress,
  getArciumEnv,
  awaitComputationFinalization,
  deserializeLE,
} from "@arcium-hq/client";

/**
 * 事業者登録トランザクションを実行
 */
export async function executeRegisterMerchant(
  program: Program,
  walletPubkey: PublicKey,
  name: string
): Promise<string> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [merchantLedgerPDA] = getMerchantLedgerPDA(merchantPDA, NATIVE_MINT);

  const signature = await program.methods
    .registerMerchant(name)
    .accounts({
      wallet: walletPubkey,
      mint: NATIVE_MINT,
      merchant: merchantPDA,
      merchantLedger: merchantLedgerPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });

  return signature;
}

/**
 * プラン作成トランザクションを実行
 */
export async function executeCreatePlan(
  program: Program,
  walletPubkey: PublicKey,
  planId: bigint,
  name: string,
  price: bigint,
  billingCycleDays: number
): Promise<string> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [planPDA] = getSubscriptionPlanPDA(merchantPDA, planId);

  const signature = await program.methods
    .createSubscriptionPlan(
      new BN(planId.toString()),
      name,
      new BN(price.toString()),
      billingCycleDays
    )
    .accounts({
      wallet: walletPubkey,
      merchant: merchantPDA,
      mint: NATIVE_MINT,
      subscriptionPlan: planPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });

  return signature;
}

/**
 * プラン更新トランザクションを実行
 */
export async function executeUpdatePlan(
  program: Program,
  walletPubkey: PublicKey,
  planPDA: PublicKey,
  updates: {
    name?: string;
    price?: bigint;
    billingCycleDays?: number;
    isActive?: boolean;
  }
): Promise<string> {
  const [merchantPDA] = getMerchantPDA(walletPubkey);

  const signature = await program.methods
    .updateSubscriptionPlan(
      updates.name ?? null,
      updates.price ? new BN(updates.price.toString()) : null,
      updates.billingCycleDays ?? null,
      updates.isActive ?? null
    )
    .accounts({
      wallet: walletPubkey,
      merchant: merchantPDA,
      subscriptionPlan: planPDA,
    })
    .rpc({ commitment: "confirmed" });

  return signature;
}

/**
 * Claim トランザクションを実行
 */
export async function executeClaimRevenue(
  program: Program,
  walletPubkey: PublicKey,
  amount: bigint,
  arciumContext: ArciumContext,
  merchantTokenAccount: PublicKey,
  poolTokenAccount: PublicKey
): Promise<string> {
  const arciumEnv = getArciumEnv();
  const computationOffset = new BN(randomBytes(8), "hex");

  // 金額を暗号化
  const nonce = randomBytes(16);
  const [encryptedAmount] = arciumContext.cipher.encrypt([amount], nonce);

  const [merchantPDA] = getMerchantPDA(walletPubkey);
  const [merchantLedgerPDA] = getMerchantLedgerPDA(merchantPDA, NATIVE_MINT);

  // Arcium 関連アカウント
  const mxeAccount = getMXEAccAddress(program.programId);
  const mempoolAccount = getMempoolAccAddress(arciumEnv.arciumClusterOffset);
  const executingPool = getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset);
  const computationAccount = getComputationAccAddress(
    arciumEnv.arciumClusterOffset,
    computationOffset
  );
  // comp_def_offset は claim_revenue 用の値を使用
  const compDefAccount = getCompDefAccAddress(program.programId, /* claim_revenue offset */);
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  const signature = await program.methods
    .claimRevenue(
      computationOffset,
      Array.from(encryptedAmount),
      Array.from(arciumContext.publicKey),
      new BN(deserializeLE(nonce).toString())
    )
    .accounts({
      wallet: walletPubkey,
      merchant: merchantPDA,
      merchantLedger: merchantLedgerPDA,
      mint: NATIVE_MINT,
      merchantTokenAccount,
      poolTokenAccount,
      mxeAccount,
      mempoolAccount,
      executingPool,
      computationAccount,
      compDefAccount,
      clusterAccount,
      // ... その他の Arcium アカウント
    })
    .rpc({ skipPreflight: true, commitment: "confirmed" });

  // Arcium MPC 計算完了を待機
  await awaitComputationFinalization(
    { connection: program.provider.connection } as any,
    computationOffset,
    program.programId,
    "confirmed"
  );

  return signature;
}
```
