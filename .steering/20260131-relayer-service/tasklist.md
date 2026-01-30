# タスクリスト: Relayer Service

## 重要: タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## 前提条件

- Node.js 24+ がインストールされていること
- Privacy Cash SDK (`privacycash` v1.1.11) がインストール済み
- Solana Mainnet RPC URLが利用可能であること
- リレイヤー用ウォレット（Keypair）が用意されていること

---

## フェーズ1: リレイヤー基盤

### 1.1 環境設定

- [ ] `.env.example` にリレイヤー関連の環境変数追加
  - [ ] `RELAYER_PRIVATE_KEY` - リレイヤーウォレットの秘密鍵（base58）
  - [ ] `RELAYER_PUBLIC_KEY` - リレイヤーウォレットのアドレス

### 1.2 リレイヤーウォレット管理

- [ ] `apps/dashboard-vault/lib/relayer-wallet.ts` 作成
  - [ ] 環境変数からKeypair読み込み
  - [ ] Keypairの検証（公開鍵と秘密鍵の整合性）
  - [ ] シングルトンパターンでインスタンス管理
  - [ ] エラーハンドリング（秘密鍵未設定時）

### 1.3 設定モジュール更新

- [ ] `apps/dashboard-vault/lib/config.ts` 更新
  - [ ] リレイヤー関連の設定追加
  - [ ] 必須環境変数のバリデーション

---

## フェーズ2: 入金検証ロジック

### 2.1 検証モジュール

- [ ] `apps/dashboard-vault/lib/deposit-validator.ts` 作成
  - [ ] `validateNoteCommitment()` - 形式チェック（32バイト）
  - [ ] `validateUserCommitment()` - 形式チェック（32バイト）
  - [ ] `validateEncryptedShare()` - 形式チェック（64バイト）
  - [ ] `validateAmount()` - 範囲チェック（MIN/MAX）

### 2.2 オンチェーン検証

- [ ] `apps/dashboard-vault/lib/onchain-validator.ts` 作成
  - [ ] `checkPoolBalance()` - Shield Pool ATA残高確認
  - [ ] `checkNoteCommitmentNotUsed()` - NoteCommitmentRegistry重複チェック
  - [ ] `getShieldPool()` - Shield Poolアカウント取得

---

## フェーズ3: トランザクション構築

### 3.1 アカウント取得ヘルパー

- [ ] `apps/dashboard-vault/lib/relayer-accounts.ts` 作成
  - [ ] `getRegisterDepositAccounts()` - 必要な全アカウント取得
    - [ ] Shield Pool PDA
    - [ ] NoteCommitmentRegistry PDA
    - [ ] UserShare PDA
    - [ ] Pool Token Account PDA
    - [ ] Pool cToken Account PDA
    - [ ] Kamino関連アカウント（6個）

### 3.2 トランザクションビルダー

- [ ] `apps/dashboard-vault/lib/relayer-transaction.ts` 作成
  - [ ] `buildRegisterDepositTx()` - トランザクション構築
  - [ ] `signAndSendTransaction()` - 署名・送信・確認
  - [ ] 優先手数料（Priority Fee）設定
  - [ ] Compute Unit設定

---

## フェーズ4: API実装

### 4.1 リレイヤーAPIエンドポイント

- [ ] `apps/dashboard-vault/app/api/relayer/register-deposit/route.ts` 作成
  - [ ] リクエストボディのパース・検証
  - [ ] 入金検証（フェーズ2のモジュール使用）
  - [ ] トランザクション構築・送信（フェーズ3のモジュール使用）
  - [ ] レスポンス返却
  - [ ] エラーハンドリング

### 4.2 レート制限

- [ ] レート制限ミドルウェア実装
  - [ ] IP単位でのレート制限（1リクエスト/秒）
  - [ ] 429 Too Many Requests レスポンス

### 4.3 ヘルスチェック

- [ ] `apps/dashboard-vault/app/api/relayer/health/route.ts` 作成
  - [ ] リレイヤーウォレットのSOL残高確認
  - [ ] RPC接続確認

---

## フェーズ5: SDK更新

### 5.1 リレイヤークライアント

- [ ] `packages/vault-sdk/src/relayer-client.ts` 新規作成
  - [ ] `RelayerClient` クラス
  - [ ] `registerDepositViaRelayer()` メソッド
  - [ ] リレイヤーURLの設定

### 5.2 既存SDKの更新

- [ ] `packages/vault-sdk/src/client.ts` 更新
  - [ ] `registerDeposit()` をリレイヤー経由に変更
  - [ ] フォールバック：リレイヤー不可時は従来方式（オプション）
  - [ ] `VaultSdkConfig` にリレイヤーURL追加

### 5.3 型定義更新

- [ ] `packages/vault-sdk/src/types.ts` 更新
  - [ ] `RelayerConfig` インターフェース追加
  - [ ] `RegisterDepositViaRelayerParams` 追加

---

## フェーズ6: フロントエンド更新

### 6.1 VaultProvider更新

- [ ] `apps/dashboard-vault/providers/VaultProvider.tsx` 更新
  - [ ] リレイヤー経由のdeposit処理に変更
  - [ ] エラーハンドリング更新

### 6.2 Deposit画面更新

- [ ] `apps/dashboard-vault/app/deposit/page.tsx` 更新
  - [ ] リレイヤーステータス表示（オプション）
  - [ ] エラーメッセージ更新

---

## フェーズ7: ビルド・テスト

### 7.1 ビルド確認

- [ ] `pnpm --filter @subly/dashboard-vault build` 成功
- [ ] `pnpm --filter @subly/vault-sdk build` 成功
- [ ] TypeScriptコンパイルエラーなし

### 7.2 動作確認

- [ ] リレイヤーAPIの単体テスト
  - [ ] 正常系：有効なリクエストで成功
  - [ ] 異常系：不正なnoteCommitmentで失敗
  - [ ] 異常系：残高不足で失敗
  - [ ] 異常系：重複noteCommitmentで失敗
- [ ] E2Eテスト（Mainnet-fork）
  - [ ] Privacy Cash入金 → リレイヤー経由登録 → シェア確認

### 7.3 セキュリティチェック

- [ ] リレイヤー秘密鍵がログに出力されないことを確認
- [ ] ユーザーIPアドレスがログに残らないことを確認
- [ ] レート制限が機能することを確認

---

## フェーズ8: ドキュメント更新

- [ ] `docs/architecture.md` 更新
  - [ ] リレイヤーアーキテクチャの図を追加
  - [ ] リレイヤーの役割を説明
- [ ] `README.md` 更新
  - [ ] リレイヤー環境変数の説明追加
  - [ ] リレイヤー起動方法の説明

---

## 実装上の注意事項

### リレイヤーウォレットの資金管理

- リレイヤーウォレットにはSOLが必要（トランザクション手数料）
- 残高監視と自動アラートの設定を推奨
- 最低残高: 0.1 SOL 以上を維持

### エラーハンドリング

```typescript
// リレイヤーAPI側
try {
  // トランザクション実行
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    return { success: false, error: 'Relayer has insufficient SOL' };
  }
  // その他のエラー
}
```

### プライバシー保護の徹底

- リクエストボディにユーザーウォレットアドレスを含めない
- ログにユーザー特定情報を出力しない
- IPアドレスは匿名化または記録しない

---

## 参考資料

- [Privacy Cash SDK Documentation](https://privacycash.mintlify.app/sdk/overview)
- [vault-sdk client.ts](../../subly-mainnet/packages/vault-sdk/src/client.ts)
- [register_deposit.rs](../../subly-mainnet/programs/subly-vault/src/instructions/register_deposit.rs)
- [design.md](./design.md)
