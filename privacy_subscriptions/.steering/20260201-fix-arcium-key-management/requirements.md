# 要求仕様書: Arcium秘密鍵管理の修正

## 概要

ユーザーダッシュボードのBalance表示とWithdraw機能が正常に動作しない問題を修正する。

## 背景・問題

### 現象

1. **Balance表示の異常**: Deposit後のBalance表示が「3.0980511596030494e+70」のような異常な値になる
2. **Withdraw失敗**: Withdraw操作がMPC計算エラーで失敗する

### 根本原因

Arcium暗号化コンテキストの秘密鍵管理に問題がある。

- `createArciumContext`関数が毎回**ランダムな秘密鍵**を生成している
- Deposit時: 秘密鍵Aで暗号化、公開鍵AをMPCに送信、MPCが結果を暗号化してオンチェーン保存
- Balance復号化時: **新しい秘密鍵B**が生成され、秘密鍵A ≠ 秘密鍵Bのため復号化不可
- 結果として不正な復号化によりゴミデータが返される

### 関連トランザクション（参考）

- Deposit Transfer: `2cUd2FW5eG8R6N5uCEe8D6mbSnSAsFRbHnJFaaZY8EtkzWUPknvq4ydGSVUuYPbmgndXdWtRADak3s3UcjLvpbCv`
- Deposit Success: `3z3aa662iAXX1665WUPWXbknRqhmCUFc6Bi6uQHDiy2CTKUZHhhTeBscPwxK97788uPS92UmiLVTquboWwvuQ81S`

## 機能要件

### FR-1: 決定論的キー生成

- ウォレットアドレスから決定論的にArcium秘密鍵を導出する
- 同じウォレットなら常に同じ秘密鍵が生成されること
- ウォレット署名を使用して安全にキーを導出する

### FR-2: Balance復号化の正常化

- Deposit後のBalanceが正しく復号化・表示されること
- ページリロード後も正しいBalanceが表示されること

### FR-3: Withdraw機能の正常化

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

### 変更対象ファイル

- `app/src/lib/arcium.ts` - `createArciumContext`関数の修正
- `app/src/components/providers/ArciumProvider.tsx` - コンテキスト初期化の修正

### 影響を受けるコンポーネント

- `app/src/hooks/useBalance.ts`
- `app/src/hooks/useDeposit.ts`
- `app/src/hooks/useWithdraw.ts`
- `app/src/components/user/BalanceCard.tsx`
- `app/src/components/user/DepositForm.tsx`
- `app/src/components/user/WithdrawForm.tsx`

## 受け入れ条件

1. [ ] Depositした金額がBalanceに正しく表示される
2. [ ] ページリロード後もBalanceが正しく表示される
3. [ ] Withdraw操作が正常に完了する
4. [ ] 既存の機能（Subscribe等）に影響がない

## 参考資料

- [Encryption | Arcium Docs](https://docs.arcium.com/developers/encryption)
- [Sealing aka re-encryption | Arcium Docs](https://docs.arcium.com/developers/encryption/sealing)
