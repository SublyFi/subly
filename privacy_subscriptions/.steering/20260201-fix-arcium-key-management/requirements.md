# 要求仕様書: Arcium暗号化・復号化の修正

## 概要

ユーザーダッシュボードのBalance表示とWithdraw機能が正常に動作しない問題を修正する。

## 背景・問題

### 現象

1. **Balance表示の異常**: Deposit後のBalance表示が「4785860292196.9971 USDC」のような異常な値になる
2. **Withdraw失敗**: Withdraw操作がMPC計算エラーで失敗する

### 根本原因 (Phase 1: 完了)

Arcium暗号化コンテキストの秘密鍵管理に問題がある。

- `createArciumContext`関数が毎回**ランダムな秘密鍵**を生成している
- Deposit時: 秘密鍵Aで暗号化、公開鍵AをMPCに送信、MPCが結果を暗号化してオンチェーン保存
- Balance復号化時: **新しい秘密鍵B**が生成され、秘密鍵A ≠ 秘密鍵Bのため復号化不可
- 結果として不正な復号化によりゴミデータが返される

**→ Phase 1で決定論的キー生成を実装済み**

### 根本原因 (Phase 2: 新規発見)

**ArgBuilderの引数順序がArcis回路の期待と不一致**

#### 問題の詳細

**Arcis回路 (encrypted-ixs/src/lib.rs)**:
```rust
pub struct DepositInput {
    pub current_balance: u64,  // フィールド1
    pub deposit_amount: u64,   // フィールド2
}

#[instruction]
pub fn deposit(input: Enc<Shared, DepositInput>) -> Enc<Shared, u64> {
    let inp = input.to_arcis();
    let new_balance = inp.current_balance + inp.deposit_amount;
    input.owner.from_arcis(new_balance)
}
```

**Anchorプログラム (lib.rs:318-323)**:
```rust
let args = ArgBuilder::new()
    .x25519_pubkey(pubkey)
    .plaintext_u128(nonce)
    .encrypted_u64(encrypted_amount)          // ← deposit_amount (順序が逆！)
    .encrypted_u64(user_ledger.encrypted_balance[0])  // ← current_balance
    .build();
```

ArgBuilderは `deposit_amount` → `current_balance` の順で渡しているが、
回路は `current_balance` → `deposit_amount` の順を期待している。

**結果**: MPC計算結果が不正な値になり、復号化しても正しい残高が表示されない。

### 関連トランザクション（参考）

- Deposit Transfer: `2cUd2FW5eG8R6N5uCEe8D6mbSnSAsFRbHnJFaaZY8EtkzWUPknvq4ydGSVUuYPbmgndXdWtRADak3s3UcjLvpbCv`
- Deposit Success: `3z3aa662iAXX1665WUPWXbknRqhmCUFc6Bi6uQHDiy2CTKUZHhhTeBscPwxK97788uPS92UmiLVTquboWwvuQ81S`

## 機能要件

### FR-1: 決定論的キー生成 (Phase 1 - 完了)

- ウォレットアドレスから決定論的にArcium秘密鍵を導出する
- 同じウォレットなら常に同じ秘密鍵が生成されること
- ウォレット署名を使用して安全にキーを導出する

### FR-2: ArgBuilder引数順序の修正 (Phase 2 - 新規)

以下の命令のArgBuilder引数順序をArcis回路と整合させる：

- **deposit**: `current_balance` → `deposit_amount` の順に修正
- **withdraw**: `current_balance` → `withdraw_amount` の順を確認・修正
- **subscribe**: 引数順序を確認・修正
- **process_payment**: 引数順序を確認・修正
- **claim_revenue**: 引数順序を確認・修正

### FR-3: Balance復号化の正常化

- Deposit後のBalanceが正しく復号化・表示されること
- ページリロード後も正しいBalanceが表示されること

### FR-4: Withdraw機能の正常化

- Withdraw操作が正常に完了すること
- 暗号化残高が正しく処理されること

## 非機能要件

### NFR-1: セキュリティ

- 秘密鍵がブラウザのLocalStorageに平文で保存されないこと
- ウォレット署名なしでは秘密鍵を導出できないこと

### NFR-2: ユーザビリティ

- 初回接続時に1回の署名要求のみ（可能であれば）
- 署名要求のメッセージが明確であること

## 影響範囲

### Phase 1 変更対象ファイル (完了)

- `app/src/lib/arcium.ts` - `createArciumContext`関数の修正
- `app/src/components/providers/ArciumProvider.tsx` - コンテキスト初期化の修正

### Phase 2 変更対象ファイル (新規)

- `programs/privacy_subscriptions/src/lib.rs` - ArgBuilder引数順序の修正

### 影響を受けるコンポーネント

- `app/src/hooks/useBalance.ts`
- `app/src/hooks/useDeposit.ts`
- `app/src/hooks/useWithdraw.ts`
- `app/src/components/user/BalanceCard.tsx`
- `app/src/components/user/DepositForm.tsx`
- `app/src/components/user/WithdrawForm.tsx`

## 受け入れ条件

### Phase 1 (完了)
1. [x] 決定論的キー生成が実装されている
2. [x] ページリロード後も同じキーで復号化される

### Phase 2 (新規)
1. [ ] deposit命令のArgBuilder順序が回路と一致している
2. [ ] withdraw命令のArgBuilder順序が回路と一致している
3. [ ] subscribe命令のArgBuilder順序が回路と一致している
4. [ ] process_payment命令のArgBuilder順序が回路と一致している
5. [ ] claim_revenue命令のArgBuilder順序が回路と一致している
6. [ ] `anchor build` が成功する
7. [ ] Depositした金額がBalanceに正しく表示される
8. [ ] Withdraw操作が正常に完了する

## 参考資料

- [Encryption | Arcium Docs](https://docs.arcium.com/developers/encryption)
- [Sealing aka re-encryption | Arcium Docs](https://docs.arcium.com/developers/encryption/sealing)
- `.claude/skills/arcium-dev-skills/argbuilder-patterns.md` - ArgBuilderパターン
- `encrypted-ixs/src/lib.rs` - Arcis回路定義
