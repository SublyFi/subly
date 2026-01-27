# 設計書: プライバシーアーキテクチャ再設計

## アーキテクチャ概要

Privacy Cashを核としたプライバシー保護アーキテクチャを採用。オンチェーンにユーザー識別情報を保存せず、全ての入出金をPrivacy Cash経由で行う。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ユーザーアプリ                                   │
│   - ローカルにシークレット、送金先情報を暗号化保持                         │
│   - オフチェーンでシェア計算                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        vault-sdk (TypeScript)                            │
│   - Privacy Cash SDK を必須でラップ                                      │
│   - 直接入金オプションを削除                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                  ▼
┌──────────────────────────────┐    ┌──────────────────────────────────────┐
│       Privacy Cash           │    │         Subly Vault Program          │
│  - depositSPL / withdrawSPL  │    │  - シェア管理（コミットメントのみ）    │
│  - プライベート残高管理       │    │  - 送金先情報を保存しない             │
│  - ZKプルーフ生成            │    │  - depositorアドレス不要              │
└──────────────────────────────┘    └──────────────────────────────────────┘
```

## 新しいデータフロー

### プライベート入金フロー

```
【Before: 問題のあるフロー】
1. ユーザー (署名者) → deposit() → Shield Pool
2. オンチェーン: depositor アドレス + 金額 + commitment が公開

【After: プライベートフロー】
1. ユーザー → Privacy Cash depositSPL() → ユーザーのプライベート残高
2. ユーザー → Privacy Cash withdrawSPL(Shield Pool ATA) → Shield Pool受領
3. リレーヤー → Vault registerDeposit(noteCommitment, encryptedShare) → シェア登録
4. オンチェーン: noteCommitmentのみ記録、入金元不明
```

**ポイント:**
- ユーザーはShield Poolに直接署名しない
- リレーヤー（またはプール管理者）が`registerDeposit`を呼び出す
- noteCommitmentでユニーク性を保証（二重登録防止）

### プライベート送金フロー

```
【Before: 問題のあるフロー】
1. setupTransfer(recipient, amount, interval) → ScheduledTransfer PDA
2. オンチェーン: recipient（事業者）アドレスが公開
3. executeTransfer() → 送金先が公開

【After: プライベートフロー】
1. setupTransfer(encryptedRecipient, amount, interval) → ScheduledTransfer PDA
2. オンチェーン: 暗号化されたrecipientのみ保存（または送金先なし）
3. 実行時: クライアントがPrivacy Cash withdrawSPL(recipient)を直接呼び出し
4. オンチェーン: 残高減少のみ記録、送金先不明
```

**ポイント:**
- オンチェーンには送金先を保存しない
- 送金先情報はユーザーのローカルで暗号化保持
- 実行はクライアント側でPrivacy Cash SDKを使用

## コンポーネント設計

### 1. オンチェーンプログラム変更

#### ShieldPool (変更なし)
```rust
pub struct ShieldPool {
    pub pool_id: Pubkey,
    pub authority: Pubkey,        // プール管理者
    pub total_pool_value: u64,
    pub total_shares: u64,
    pub kamino_obligation: Pubkey,
    pub last_yield_update: i64,
    pub nonce: u64,
    pub bump: u8,
    pub is_active: bool,
}
```

#### UserShare (変更)
```rust
pub struct UserShare {
    pub share_id: Pubkey,
    pub pool: Pubkey,
    pub user_commitment: [u8; 32],       // コミットメント（アドレスではない）
    pub encrypted_share_amount: [u8; 64], // 暗号化されたシェア量
    pub last_update: i64,
    pub bump: u8,
    // 削除: depositor アドレス関連フィールド
}
```

#### ScheduledTransfer (大幅変更)
```rust
pub struct ScheduledTransfer {
    pub transfer_id: Pubkey,
    pub user_commitment: [u8; 32],
    // 削除: pub recipient: Pubkey,  // ← これを削除
    pub encrypted_transfer_data: [u8; 128], // 新規: 暗号化された送金情報
    pub amount: u64,
    pub interval_seconds: u32,
    pub next_execution: i64,
    pub is_active: bool,
    pub execution_count: u32,
    // ...
}
```

#### 新命令: register_deposit
```rust
/// Privacy Cash経由の入金を登録
/// リレーヤーまたはプール管理者が呼び出す
pub fn register_deposit(
    ctx: Context<RegisterDeposit>,
    note_commitment: [u8; 32],    // Privacy Cashのnote commitment
    user_commitment: [u8; 32],     // ユーザーのコミットメント
    encrypted_share: [u8; 64],     // 暗号化されたシェア量
    amount: u64,                   // 入金額（検証用）
) -> Result<()>
```

**アカウント検証:**
- `note_commitment` がShield PoolのATAに入金されたことを検証
- 二重登録防止のためのnullifier管理

### 2. SDK変更

#### client.ts の deposit() 変更
```typescript
/**
 * プライベートに入金（Privacy Cash必須）
 */
async deposit(params: DepositParams): Promise<TransactionResult> {
  // Step 1: Privacy Cashにデポジット
  const privacyDeposit = await this.privacyCash.depositPrivateUSDC(params.amountUsdc);

  // Step 2: Privacy CashからShield Pool ATAに送金
  const privacyWithdraw = await this.privacyCash.withdrawPrivateUSDC(
    params.amountUsdc,
    this.getShieldPoolTokenAccount().toBase58()
  );

  // Step 3: 入金登録（リレーヤー経由またはプール管理者署名）
  const registerResult = await this.registerDeposit({
    noteCommitment: privacyWithdraw.noteCommitment,
    userCommitment: this.userCommitment,
    encryptedShare: this.calculateAndEncryptShare(params.amountUsdc),
    amount: params.amountUsdc,
  });

  return registerResult;
}
```

#### client.ts の setupRecurringPayment() 変更
```typescript
/**
 * 定期送金を設定（送金先はローカル保存）
 */
async setupRecurringPayment(
  params: SetupRecurringPaymentParams
): Promise<TransactionResult> {
  // 送金先情報を暗号化
  const encryptedTransferData = this.encryptTransferData({
    recipient: params.recipientAddress,
    memo: params.memo,
  });

  // オンチェーンには暗号化データのみ保存
  const result = await this.program.methods
    .setupTransfer(
      Array.from(encryptedTransferData),
      new BN(params.amountUsdc * 1e6),
      INTERVAL_SECONDS[params.interval],
      transferNonce
    )
    .accounts({...})
    .rpc();

  // ローカルストレージに送金先を保存
  await this.saveTransferDetails(result.transferId, {
    recipient: params.recipientAddress,
    amount: params.amountUsdc,
    interval: params.interval,
  });

  return result;
}
```

#### client.ts の executeTransfer() 変更
```typescript
/**
 * 定期送金を実行（Privacy Cash経由）
 */
async executeTransfer(transferId: PublicKey): Promise<TransactionResult> {
  // ローカルから送金先を取得
  const transferDetails = await this.loadTransferDetails(transferId.toBase58());

  // Privacy Cashで直接送金
  const privacyResult = await this.privacyCash.withdrawPrivateUSDC(
    transferDetails.amount,
    transferDetails.recipient
  );

  // オンチェーンで残高減少を記録
  const onchainResult = await this.program.methods
    .recordTransferExecution(executionIndex)
    .accounts({...})
    .rpc();

  return {
    signature: onchainResult.signature,
    privacyCashTx: privacyResult.tx,
    success: true,
  };
}
```

### 3. ローカルストレージ設計

```typescript
interface LocalTransferData {
  transferId: string;
  recipient: string;       // 事業者アドレス
  amount: number;
  interval: PaymentInterval;
  createdAt: number;
  lastExecuted?: number;
}

interface LocalVaultData {
  userSecret: Uint8Array;          // 32バイト
  userCommitment: Uint8Array;      // 32バイト
  encryptionKey: Uint8Array;       // ウォレット署名から導出
  transfers: LocalTransferData[];
  shares: bigint;                  // 現在のシェア量
}
```

**暗号化:**
- ウォレット署名からAES-256-GCM鍵を導出
- 全ローカルデータを暗号化して保存
- ウォレット再接続時に復号可能

## データフロー図

### 入金フロー
```
                    ┌──────────────────┐
                    │   ユーザー       │
                    └────────┬─────────┘
                             │ 1. depositSPL(amount)
                             ▼
                    ┌──────────────────┐
                    │  Privacy Cash    │
                    │  (プライベート残高)│
                    └────────┬─────────┘
                             │ 2. withdrawSPL(Shield Pool ATA)
                             ▼
                    ┌──────────────────┐
                    │  Shield Pool ATA │ ← 匿名の入金
                    └────────┬─────────┘
                             │ 3. registerDeposit(noteCommitment)
                             ▼
                    ┌──────────────────┐
                    │  Vault Program   │
                    │  (シェア登録)    │
                    └──────────────────┘

オンチェーンに記録される情報:
- noteCommitment (Privacy Cashの証明)
- userCommitment (匿名識別子)
- 入金額
- ❌ 入金元アドレスは記録されない
```

### 送金フロー
```
                    ┌──────────────────┐
                    │   ユーザー       │
                    │ (ローカルに送金先)│
                    └────────┬─────────┘
                             │ 1. executeTransfer(transferId)
                             │    → ローカルから recipient 取得
                             ▼
                    ┌──────────────────┐
                    │  Privacy Cash    │
                    │  withdrawSPL()   │
                    └────────┬─────────┘
                             │ 2. プライベート送金
                             ▼
                    ┌──────────────────┐
                    │   事業者         │ ← 送金元不明
                    └──────────────────┘
                             │ 3. recordTransferExecution()
                             ▼
                    ┌──────────────────┐
                    │  Vault Program   │
                    │  (残高減少記録)  │
                    └──────────────────┘

オンチェーンに記録される情報:
- userCommitment
- 送金額
- 実行日時
- ❌ 送金先アドレスは記録されない
```

## セキュリティ考慮事項

### 1. 二重登録防止
- `note_commitment` をnullifierとして管理
- 同じnote_commitmentでの二重登録をブロック

### 2. 正当性検証
- Privacy Cashの送金証明を検証
- Shield Pool ATAへの入金を確認

### 3. ローカルデータ保護
- AES-256-GCM暗号化
- ウォレット署名から鍵導出（ハードウェアウォレット対応）

### 4. リレーヤー信頼モデル
- リレーヤーは入金登録のみ実行
- リレーヤーはユーザーのシェア量を改ざんできない（暗号化）
- 悪意のあるリレーヤーは登録を拒否できるが、資金は盗めない

## 移行戦略

### Phase 1: オンチェーン変更
1. `register_deposit` 命令を追加
2. `ScheduledTransfer` から `recipient` を削除
3. 既存の入金は引き続きサポート（deprecation notice）

### Phase 2: SDK変更
1. `deposit()` をPrivacy Cash必須に変更
2. `setupRecurringPayment()` をローカル保存方式に変更
3. `executeTransfer()` をPrivacy Cash経由に変更

### Phase 3: 既存データ移行
1. 既存のScheduledTransferは旧方式で継続
2. 新規作成分から新方式を適用
3. 段階的に旧データを非活性化

## 制限事項

### Privacy Cash制約
- Mainnetのみ（Devnetテスト不可）
- 手数料: 0.35% + 0.006 SOL/送金
- Node.js 24以上が必要

### アーキテクチャ制約
- リレーヤーまたはプール管理者の存在が必要
- ローカルデータ紛失時は送金先情報を失う
- 自動実行（Tuk Tuk）はリレーヤー経由で間接的にのみ可能

## 依存関係

```json
{
  "dependencies": {
    "privacycash": "^1.1.7",
    "@helium/cron-sdk": "latest",
    "@kamino-finance/klend-sdk": "latest"
  },
  "engines": {
    "node": ">=24.0.0"
  }
}
```
