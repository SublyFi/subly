# 設計書: Arcium暗号化・復号化の修正

## 概要

Arcium暗号化コンテキストの秘密鍵をランダム生成から決定論的導出に変更し（Phase 1: 完了）、ArgBuilder引数順序をArcis回路と整合させ（Phase 2: 新規）、Deposit後のBalance復号化とWithdraw操作を正常化する。

## 問題分析

### 現在の実装フロー

```
[Deposit時]
createArciumContext() → ランダム秘密鍵A生成 → 公開鍵A
↓
amount を 秘密鍵A + MXE公開鍵 で暗号化
↓
MPC計算 → 結果を 公開鍵A で暗号化 → オンチェーン保存

[Balance復号化時]
createArciumContext() → ランダム秘密鍵B生成 (A ≠ B)
↓
オンチェーンの暗号化残高を 秘密鍵B で復号化試行
↓
失敗: ゴミデータ (3.0980511596030494e+70 のような異常値)
```

### 根本原因

`app/src/lib/arcium.ts:57` で毎回ランダムな秘密鍵を生成：

```typescript
const privateKey = x25519.utils.randomSecretKey();
```

## 解決策

### 設計方針

Arciumドキュメント推奨の「決定論的キー導出」パターンを採用：

```
[同じウォレット] → [固定メッセージに署名] → [SHA-256ハッシュ] → [X25519秘密鍵]
```

これにより：
- 同じウォレット = 常に同じ秘密鍵
- ページリロード後も同じ鍵で復号化可能
- セキュリティ維持（署名なしでは秘密鍵を導出できない）

### アルゴリズム

```typescript
// 1. 固定メッセージを定義
const SIGNING_MESSAGE = "Subly Privacy Subscriptions - Encryption Key Derivation v1";

// 2. ウォレットで署名
const signature = await wallet.signMessage(
  new TextEncoder().encode(SIGNING_MESSAGE)
);

// 3. SHA-256ハッシュで32バイトの秘密鍵を導出
const privateKey = sha256(signature);

// 4. X25519公開鍵を導出
const publicKey = x25519.getPublicKey(privateKey);

// 5. MXE公開鍵との共有秘密を計算
const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

// 6. Cipherを作成
const cipher = new RescueCipher(sharedSecret);
```

### セキュリティ考慮事項

1. **メッセージの一意性**: アプリケーション固有のメッセージを使用（他アプリとの衝突を防ぐ）
2. **バージョニング**: メッセージにバージョン番号を含める（将来の鍵ローテーション対応）
3. **署名の安全性**: 署名はブラウザに保存しない（sessionStorageも使わない）
4. **再署名の要求**: ページリロード時に再署名が必要（これはセキュリティとUXのトレードオフ）

## 実装詳細

### 変更ファイル

#### 1. `app/src/lib/arcium.ts`

新規追加：
- `ENCRYPTION_SIGNING_MESSAGE` 定数
- `deriveEncryptionKeyFromSignature(signature: Uint8Array)` 関数
- `createArciumContextFromSignature(connection, signature)` 関数

既存関数は削除（ランダム生成は使用しない）。

#### 2. `app/src/components/providers/ArciumProvider.tsx`

変更：
- `initialize` 関数でウォレット署名を要求
- 署名から決定論的にArciumコンテキストを生成
- 署名拒否時のエラーハンドリング追加

新規状態：
- `needsSignature: boolean` - 署名が必要かどうか
- `signAndInitialize: () => Promise<void>` - 署名して初期化

#### 3. `app/src/hooks/useBalance.ts`

変更不要 - コンテキストが正しく初期化されれば動作する。

#### 4. `app/src/hooks/useDeposit.ts`, `useWithdraw.ts`

変更不要 - コンテキストが正しく初期化されれば動作する。

### UIフロー

```
[ユーザーがダッシュボードにアクセス]
        ↓
[ウォレット接続]
        ↓
[「暗号化キーを生成するために署名してください」ダイアログ表示]
        ↓
[ユーザーが署名] → [決定論的キー導出] → [Arciumコンテキスト初期化]
        ↓
[Balance取得・復号化可能]
        ↓
[Deposit/Withdraw操作可能]
```

### エラーハンドリング

| シナリオ | 対応 |
|---------|------|
| 署名拒否 | エラーメッセージ表示、再試行ボタン |
| MXE公開鍵取得失敗 | リトライ（最大10回） |
| 復号化失敗 | 「残高を表示できません」メッセージ |

## 影響範囲

### 破壊的変更

**既存のDepositデータは復号化できなくなる可能性あり**

理由：以前のランダムキーで暗号化されたデータは、新しい決定論的キーでは復号化できない。

### 対応策

1. ユーザーへの告知
2. 残高が0でない場合は旧キーでの復号化を試行（実装困難）
3. または、暗号化残高のリセット（管理者操作）

## テスト計画

1. **新規ユーザー**: Deposit → Balance表示 → ページリロード → Balance表示 → Withdraw
2. **署名拒否**: エラーメッセージが表示されること
3. **ウォレット切り替え**: 異なるウォレットでは異なるキーが生成されること
4. **複数タブ**: 同じウォレットなら同じキーが生成されること

---

## Phase 2: ArgBuilder引数順序の修正

### 問題分析

ArgBuilderパターンドキュメントより:
> The order of arguments **must match** the circuit's `.idarc` descriptor exactly.

現在、AnchorプログラムのArgBuilder引数順序がArcis回路の期待と一致していない。

### 各命令の現状と修正内容

#### 1. deposit命令

**Arcis回路** (`encrypted-ixs/src/lib.rs:12-15`):
```rust
pub struct DepositInput {
    pub current_balance: u64,  // フィールド1
    pub deposit_amount: u64,   // フィールド2
}
```

**現在のArgBuilder** (`lib.rs:318-323`):
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(encrypted_amount)              // ❌ deposit_amount (フィールド2)
    .encrypted_u64(user_ledger.encrypted_balance[0])  // ❌ current_balance (フィールド1)
    .build();
```

**修正後**:
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(user_ledger.encrypted_balance[0])  // ✅ current_balance (フィールド1)
    .encrypted_u64(encrypted_amount)              // ✅ deposit_amount (フィールド2)
    .build();
```

#### 2. withdraw命令

**Arcis回路** (`encrypted-ixs/src/lib.rs:18-21`):
```rust
pub struct WithdrawInput {
    pub current_balance: u64,  // フィールド1
    pub withdraw_amount: u64,  // フィールド2
}
```

**現在のArgBuilder** (`lib.rs:358-363`):
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(user_ledger.encrypted_balance[0])  // ✅ current_balance
    .encrypted_u64(encrypted_amount)                  // ✅ withdraw_amount
    .build();
```

**→ 順序は正しい。変更不要。**

#### 3. subscribe命令

**Arcis回路** (`encrypted-ixs/src/lib.rs:24-32`):
```rust
pub struct SubscribeInput {
    pub user_balance: u64,          // フィールド1
    pub merchant_balance: u64,      // フィールド2
    pub subscription_count: u64,    // フィールド3 ← 存在するが使われていない？
    pub plan_pubkey: [u8; 32],      // フィールド4 ← 存在するが使われていない？
    pub price: u64,                 // フィールド5
    pub current_timestamp: i64,     // フィールド6 (plaintext)
    pub billing_cycle_days: u32,    // フィールド7 (plaintext)
}
```

**現在のArgBuilder** (`lib.rs:427-435`):
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(user_ledger.encrypted_balance[0])            // user_balance
    .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance[0])  // merchant_balance
    .encrypted_u64(encrypted_price)                              // price
    .plaintext_i64(current_timestamp)
    .plaintext_u32(billing_cycle_days)
    .build();
```

**→ subscription_count, plan_pubkey が不足している可能性あり。回路との整合性を詳細確認が必要。**

#### 4. process_payment命令

**Arcis回路** (`encrypted-ixs/src/lib.rs:40-48`):
```rust
pub struct ProcessPaymentInput {
    pub user_balance: u64,          // フィールド1
    pub merchant_balance: u64,      // フィールド2
    pub subscription_status: u8,    // フィールド3
    pub next_payment_date: i64,     // フィールド4
    pub current_timestamp: i64,     // フィールド5 (plaintext)
    pub plan_price: u64,            // フィールド6 (plaintext)
    pub billing_cycle_days: u32,    // フィールド7 (plaintext)
}
```

**現在のArgBuilder** (`lib.rs:515-525`):
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(ctx.accounts.user_ledger.encrypted_balance[0])     // user_balance
    .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance[0]) // merchant_balance
    .encrypted_u8(ctx.accounts.user_subscription.encrypted_status)    // subscription_status
    .encrypted_i64(ctx.accounts.user_subscription.encrypted_next_payment_date) // next_payment_date
    .plaintext_i64(current_timestamp)
    .plaintext_u64(plan_price)
    .plaintext_u32(billing_cycle_days)
    .build();
```

**→ 順序は正しそう。確認が必要。**

#### 5. claim_revenue命令

**Arcis回路** (`encrypted-ixs/src/lib.rs:58-61`):
```rust
pub struct ClaimRevenueInput {
    pub current_balance: u64,  // フィールド1
    pub claim_amount: u64,     // フィールド2
}
```

**現在のArgBuilder** (`lib.rs:604-609`):
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(ctx.accounts.merchant_ledger.encrypted_balance[0])  // current_balance
    .encrypted_u64(encrypted_amount)                                    // claim_amount
    .build();
```

**→ 順序は正しい。変更不要。**

### 実装方針

1. **deposit命令のArgBuilder順序を修正** - 最も優先度が高い
2. **他の命令の確認** - 実際にビルドして整合性を確認

### セキュリティ考慮事項

- ArgBuilder順序の変更はオンチェーンプログラムの変更であり、デプロイが必要
- 既存のユーザーデータには影響しない（暗号化済みデータの構造は変わらない）
- ただし、修正前にデポジットされたデータは引き続き復号化に失敗する可能性あり
