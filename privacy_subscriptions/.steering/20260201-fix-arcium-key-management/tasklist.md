# タスクリスト: Arcium秘密鍵管理の修正

## ステータス凡例

- [ ] 未着手
- [x] 完了
- [~] 進行中

## タスク

### 1. 設計・調査

- [x] 1.1 Arciumドキュメントで推奨されるキー管理パターンを確認
  - `client.md` の「Deterministic Encryption Keys」セクションに記載あり
  - ウォレット署名 → SHA-256ハッシュ → X25519秘密鍵
- [x] 1.2 ウォレット署名からの決定論的キー導出方法を設計
- [x] 1.3 design.md に設計内容を記載

### 2. 実装

- [x] 2.1 `app/src/lib/arcium.ts` に決定論的キー生成関数を追加
  - [x] `ENCRYPTION_SIGNING_MESSAGE` 定数追加
  - [x] `deriveEncryptionKeyFromSignature(signature)` 関数追加
  - [x] `createArciumContextFromSignature(connection, signature)` 関数追加

- [x] 2.2 `app/src/components/providers/ArciumProvider.tsx` の修正
  - [x] ウォレット接続時に署名を要求
  - [x] 導出した秘密鍵でArciumContextを初期化
  - [x] `needsSignature` 状態を追加
  - [x] 署名拒否時のエラーハンドリング

- [x] 2.3 `app/src/hooks/useBalance.ts` の修正
  - [x] `needsSignature` を返すように変更
  - [x] Arciumエラーを `balance.error` に含める

- [x] 2.4 型チェック・ビルド確認
  - [x] `npm run build` が成功

### 3. テスト・検証

- [ ] 3.1 Devnetでの動作確認
  - [ ] 新規Deposit → Balance表示の確認
  - [ ] ページリロード後のBalance表示確認
  - [ ] Withdraw操作の確認

- [ ] 3.2 エッジケースの確認
  - [ ] ウォレット切り替え時の動作
  - [ ] 署名拒否時のエラーハンドリング

### 4. ドキュメント更新

- [x] 4.1 コード内コメントの追加（実装時に完了）
- [ ] 4.2 必要に応じて docs/ の更新

## 実装メモ

### 変更ファイル一覧

1. `app/src/lib/arcium.ts`
   - `ENCRYPTION_SIGNING_MESSAGE` 追加
   - `deriveEncryptionKeyFromSignature()` 追加
   - `createArciumContextFromSignature()` 追加
   - `createArciumContext()` に @deprecated 追加

2. `app/src/components/providers/ArciumProvider.tsx`
   - `createArciumContextFromSignature` を使用するように変更
   - `needsSignature` 状態追加
   - `wallet.signMessage()` で署名を要求

3. `app/src/hooks/useBalance.ts`
   - `needsSignature` を返すように変更
   - `arciumError` をbalance.errorに含める

4. `app/src/components/merchant/ClaimForm.tsx`
   - `setAmountSOL` → `setAmountUSDC` のタイプミス修正

### 重要な注意点

- **既存のDepositデータは復号化できなくなる可能性あり**
  - 以前のランダムキーで暗号化されたデータは、新しい決定論的キーでは復号化できない
  - 新規ユーザーまたは新規Depositからは正常に動作する
