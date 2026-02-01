# タスクリスト: Arcium暗号化・復号化の修正

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## Phase 1: 決定論的キー生成（完了）

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

---

## Phase 2: ArgBuilder引数順序の修正（新規）

### 3. 調査・分析

- [x] 3.1 各命令のArcis回路とArgBuilder引数順序を比較
  - [x] deposit: **順序が逆** → 修正必要
  - [x] withdraw: 順序は正しい
  - [x] subscribe: 確認必要（フィールド不足の可能性）
  - [x] process_payment: 順序は正しそう
  - [x] claim_revenue: 順序は正しい

### 4. 実装

- [x] 4.1 `programs/privacy_subscriptions/src/lib.rs` のdeposit命令を修正
  - [x] ArgBuilderの引数順序を `current_balance` → `deposit_amount` に変更
  - 修正前: `.encrypted_u64(encrypted_amount).encrypted_u64(user_ledger.encrypted_balance[0])`
  - 修正後: `.encrypted_u64(user_ledger.encrypted_balance[0]).encrypted_u64(encrypted_amount)`

- [x] 4.2 subscribe命令の整合性確認
  - [x] Arcis回路のSubscribeInputとArgBuilderの引数を詳細比較
  - [x] 回路を簡略化（subscription_count, plan_pubkey を削除）
  - [x] ArgBuilderのコメント追加

- [x] 4.3 withdraw命令の整合性確認
  - [x] Arcis回路のWithdrawInputとArgBuilderの引数を詳細比較
  - [x] 順序は正しい、コメント追加

- [x] 4.4 unsubscribe命令の整合性確認
  - [x] Arcis回路のUnsubscribeInputとArgBuilderの引数を詳細比較
  - [x] 順序は正しい、コメント追加

- [x] 4.5 process_payment命令の整合性確認
  - [x] Arcis回路のProcessPaymentInputとArgBuilderの引数を詳細比較
  - [x] 順序は正しい、コメント追加

- [x] 4.6 verify_subscription命令の整合性確認
  - [x] Arcis回路のVerifySubscriptionInputとArgBuilderの引数を詳細比較
  - [x] 順序は正しい、コメント追加
  - [x] **コールバックのreveal()出力取得を修正**: `is_valid: true`ハードコードを`o`（実際のbool値）に修正

- [x] 4.7 claim_revenue命令の整合性確認
  - [x] Arcis回路のClaimRevenueInputとArgBuilderの引数を詳細比較
  - [x] 順序は正しい、コメント追加

- [x] 4.8 ビルド確認
  - [x] `arcium build` が成功すること

### 5. デプロイ・テスト

- [ ] 5.1 Devnetへのプログラム再デプロイ
  - [ ] `arcium deploy --cluster-offset 456 ...`

- [ ] 5.2 動作検証
  - [ ] 新規Deposit → Balance表示の確認（正しい値が表示される）
  - [ ] ページリロード後のBalance表示確認
  - [ ] Withdraw操作の確認

### 6. ドキュメント更新

- [ ] 6.1 実装後の振り返り（このファイルの下部に記録）

## 実装メモ

### Phase 1 変更ファイル一覧（完了）

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

### Phase 2 変更ファイル一覧（予定）

1. `programs/privacy_subscriptions/src/lib.rs`
   - deposit命令のArgBuilder引数順序を修正（318-323行目付近）
   - 必要に応じてsubscribe命令も修正

### 重要な注意点

- **既存のDepositデータは復号化できなくなる可能性あり**
  - 以前のランダムキーで暗号化されたデータは、新しい決定論的キーでは復号化できない
  - ArgBuilder順序修正後、新規Depositから正常に動作する

- **プログラム再デプロイが必要**
  - Rust側の変更なので、Devnetへの再デプロイが必要
  - デプロイ後は新しいデポジットから正しく動作する

---

## 実装後の振り返り

### 実装完了日
{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:
- {計画時には想定していなかった技術的な変更点}
- {実装方針の変更とその理由}

**新たに必要になったタスク**:
- {実装中に追加したタスク}
- {なぜ追加が必要だったか}

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- {タスク名}
  - スキップ理由: {具体的な技術的理由}
  - 代替実装: {何に置き換わったか}

### 学んだこと

**技術的な学び**:
- {実装を通じて学んだ技術的な知見}
- {新しく使った技術やパターン}

**プロセス上の改善点**:
- {タスク管理で良かった点}
- {ステアリングファイルの活用方法}

### 次回への改善提案
- {次回の機能追加で気をつけること}
- {より効率的な実装方法}
- {タスク計画の改善点}
