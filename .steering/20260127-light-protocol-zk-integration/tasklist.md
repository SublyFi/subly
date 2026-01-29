# タスクリスト: Light Protocol ZK証明統合

## タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## 前提条件

以下のタスクは完了済み（Arcium MXE統合）：

- [x] `encrypted_status`フィールドの追加
- [x] `set_subscription_active`回路の実装
- [x] `set_subscription_cancelled`回路の実装
- [x] コールバック関数の実装
- [x] Devnetへのデプロイ

---

## フェーズ1: Light Protocol依存関係の追加

### 1.1 Cargo.tomlの更新

- [ ] `programs/subly_devnet/Cargo.toml`の更新
  - [ ] `light-sdk`依存関係の追加
  - [ ] `light-compressed-token`依存関係の追加（オプション）
  - [ ] `light-system-program`依存関係の追加
- [ ] バージョン互換性の確認
- [ ] `cargo check`でビルド確認

### 1.2 Light Protocolの調査

- [ ] Light Protocol CPIインターフェースの確認
- [ ] Merkleツリー作成方法の確認
- [ ] Merkle証明取得方法の確認
- [ ] 参考実装の確認（light-protocol/examples）

## フェーズ2: ZK圧縮状態構造体の追加

### 2.1 状態構造体

- [ ] `src/state/compressed_subscription.rs`の作成
  - [ ] `CompressedSubscription`構造体の定義
  - [ ] `merkle_tree`フィールド
  - [ ] `leaf_index`フィールド
  - [ ] `root_hash`フィールド
  - [ ] Arcium暗号化フィールドとの統合
- [ ] `src/state/mod.rs`の更新

### 2.2 Merkleツリー管理

- [ ] `src/state/merkle_tree_config.rs`の作成
  - [ ] ツリー設定の定義
  - [ ] 深さ、葉の数などのパラメータ

## フェーズ3: 命令の実装

### 3.1 ZK圧縮サブスクリプション作成

- [ ] `src/instructions/subscribe_zk.rs`の作成
  - [ ] `SubscribeZk`構造体（Accounts）
  - [ ] `subscribe_zk`関数
  - [ ] Light Protocol CPIの実装
  - [ ] Merkleツリーへの葉の追加

### 3.2 メンバーシップ証明検証（オンチェーン）

- [ ] `src/instructions/verify_membership.rs`の作成
  - [ ] `VerifyMembership`構造体（Accounts）
  - [ ] `verify_membership`関数
  - [ ] Merkle証明の検証ロジック

### 3.3 サブスクリプション移行

- [ ] `src/instructions/migrate_to_zk.rs`の作成
  - [ ] `MigrateToZk`構造体（Accounts）
  - [ ] `migrate_subscription_to_zk`関数
  - [ ] 既存サブスクリプションのZK圧縮への移行

### 3.4 lib.rsの更新

- [ ] 新しい命令モジュールのインポート
- [ ] 命令関数の追加

## フェーズ4: イベントの追加

### 4.1 events.rsの更新

- [ ] `ZkSubscriptionCreatedEvent`の追加
- [ ] `MembershipVerifiedEvent`の追加
- [ ] `SubscriptionMigratedEvent`の追加

## フェーズ5: SDK更新

### 5.1 証明生成

- [ ] `src/proof/generator.ts`の作成
  - [ ] `generateMerkleProof()`関数
  - [ ] Light Protocol APIとの連携
  - [ ] 署名の生成

### 5.2 証明検証

- [ ] `src/proof/verifier.ts`の作成
  - [ ] `verifyMerkleProof()`関数
  - [ ] `verifySignature()`関数
  - [ ] `checkExpiry()`関数

### 5.3 型定義

- [ ] `src/types/proof.ts`の作成
  - [ ] `MembershipProof`インターフェース
  - [ ] `ProofVerificationResult`インターフェース

### 5.4 クライアント更新

- [ ] `src/client.ts`の更新
  - [ ] `subscribeWithZk()`メソッド
  - [ ] `generateMembershipProof()`メソッド
  - [ ] `verifyMembershipProof()`メソッド
  - [ ] `migrateSubscriptionToZk()`メソッド

### 5.5 ビルド確認

- [ ] `pnpm build`でビルド確認
- [ ] 型エラーの修正

## フェーズ6: テスト

### 6.1 ユニットテスト

- [ ] Merkle証明生成のテスト
- [ ] 証明検証のテスト
- [ ] 署名検証のテスト

### 6.2 統合テスト

- [ ] ZK圧縮サブスクリプション作成のテスト
- [ ] メンバーシップ証明のエンドツーエンドテスト
- [ ] Arcium MXEとの併用テスト

### 6.3 セキュリティテスト

- [ ] リプレイ攻撃テスト
- [ ] 偽造証明検出テスト
- [ ] 期限切れ証明テスト

## フェーズ7: デプロイとドキュメント

### 7.1 ビルドとデプロイ

- [ ] `cargo check`でコンパイル確認
- [ ] `arcium build`でビルド確認
- [ ] `arcium deploy`でDevnetにデプロイ

### 7.2 ドキュメント

- [ ] SDK READMEの更新
- [ ] API ドキュメントの更新
- [ ] 使用例の追加

---

## 進捗記録

### 開始日時
（実装開始時に記録）

### 完了タスク

（実装後に記録）

### ブロッカー

（発生時に記録）

---

## 参考リソース

### Light Protocol

- [Light Protocol Docs](https://www.lightprotocol.com/docs)
- [ZK Compression](https://www.zkcompression.com/)
- [GitHub: light-protocol](https://github.com/Lightprotocol/light-protocol)

### Arcium（完了済み統合）

- Program ID: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`
- Cluster Offset: `456`

### 関連ステアリング

- `.steering/20260127-arcium-mxe-integration/` - Arcium MXE統合（完了）
- `.steering/20260127-arcium-subscription-privacy/` - サブスクリプションプライバシー（完了）
