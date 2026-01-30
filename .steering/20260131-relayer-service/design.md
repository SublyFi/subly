# 設計書: Relayer Service

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ユーザー側                                 │
├─────────────────────────────────────────────────────────────────────┤
│  1. Privacy Cashに入金 (wallet署名)                                  │
│  2. Privacy CashからShield Pool ATAに送金 (Privacy Cash署名)          │
│  3. リレイヤーAPIにリクエスト送信                                     │
│     POST /api/relayer/register-deposit                              │
│     Body: { noteCommitment, userCommitment, encryptedShare, amount } │
│     ※ ユーザーウォレットアドレスは含まない                            │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                      Relayer Service (バックエンド)                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. リクエスト検証                                                   │
│     - noteCommitmentの形式チェック                                   │
│     - Shield Pool ATA残高確認                                        │
│     - 重複チェック（NoteCommitmentRegistry）                          │
│  2. registerDeposit トランザクション構築・署名・送信                   │
│     - registrar = リレイヤーウォレット                                │
│  3. 結果返却                                                         │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Solana Mainnet                               │
├─────────────────────────────────────────────────────────────────────┤
│  registerDeposit 実行                                                │
│  - registrar: リレイヤーアドレス（ユーザーアドレスではない）            │
│  - userCommitment: hash(secret || pool_id)                          │
│  - noteCommitment: Privacy Cash入金証明                              │
└─────────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. Relayer API (Next.js API Route)

`apps/dashboard-vault/app/api/relayer/register-deposit/route.ts`

```typescript
interface RegisterDepositRequest {
  noteCommitment: string;    // base64 encoded [u8; 32]
  userCommitment: string;    // base64 encoded [u8; 32]
  encryptedShare: string;    // base64 encoded [u8; 64]
  amount: number;            // USDC base units
}

interface RegisterDepositResponse {
  success: boolean;
  signature?: string;
  error?: string;
}
```

### 2. Relayer Wallet Manager

`apps/dashboard-vault/lib/relayer-wallet.ts`

- リレイヤーウォレットの秘密鍵管理
- 環境変数から読み込み
- トランザクション署名

### 3. Deposit Validator

`apps/dashboard-vault/lib/deposit-validator.ts`

- noteCommitment形式検証
- Shield Pool ATA残高チェック
- NoteCommitmentRegistryの重複チェック

### 4. Transaction Builder

`apps/dashboard-vault/lib/relayer-transaction.ts`

- registerDepositトランザクション構築
- 必要なアカウント（Kaminoアカウント含む）の取得
- 署名・送信・確認

## API設計

### POST /api/relayer/register-deposit

**Request:**
```json
{
  "noteCommitment": "base64...",
  "userCommitment": "base64...",
  "encryptedShare": "base64...",
  "amount": 1000000
}
```

**Response (Success):**
```json
{
  "success": true,
  "signature": "5wH...abc"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Insufficient pool balance"
}
```

## SDK変更

### client.ts の registerDeposit 修正

```typescript
// Before (現状)
.accounts({
  registrar: this.wallet.publicKey,  // ユーザー自身
  ...
})

// After (リレイヤー経由)
async registerDeposit(params: RegisterDepositParams): Promise<TransactionResult> {
  // リレイヤーAPIを呼び出し
  const response = await fetch('/api/relayer/register-deposit', {
    method: 'POST',
    body: JSON.stringify({
      noteCommitment: base64Encode(params.noteCommitment),
      userCommitment: base64Encode(this.userCommitment),
      encryptedShare: base64Encode(encryptedShare),
      amount: params.amount,
    }),
  });

  const result = await response.json();
  return { signature: result.signature, success: result.success };
}
```

## 環境変数

```bash
# .env.local
RELAYER_PRIVATE_KEY=base58_encoded_private_key
RELAYER_PUBLIC_KEY=relayer_wallet_address
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## セキュリティ考慮事項

### 1. 秘密鍵管理

- 環境変数で管理（Vercel Secrets等）
- 本番環境ではHSM/KMSの検討

### 2. レート制限

- IP単位でのレート制限
- 1リクエスト/秒程度

### 3. 入力検証

- 全パラメータの形式チェック
- amountの範囲チェック（MIN_DEPOSIT_AMOUNT〜MAX_DEPOSIT_AMOUNT）

### 4. ログ

- ユーザーIPアドレスはログに残さない
- トランザクション署名のみ記録

## 将来的な拡張

### 1. 複数リレイヤー対応

- 複数のリレイヤーアドレスをホワイトリスト化
- 負荷分散

### 2. 手数料モデル

- Privacy Cash経由でリレイヤーに手数料を支払う
- 入金額から一定割合を差し引く

### 3. 分散リレイヤー

- 複数のサードパーティがリレイヤーを運営
- 信頼の分散化
