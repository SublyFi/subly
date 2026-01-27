# プライバシー実装状況 (Privacy Implementation Status)

## 概要

本ドキュメントはSubly Membership Protocol (Protocol A) のプライバシー機能実装状況を追跡します。

## 実装ロードマップ

```
Phase 1: Arcium MXE統合（完了）
    ├── 契約数の暗号化
    └── サブスクリプションステータスの暗号化

Phase 2: Light Protocol ZK証明統合（未着手）
    ├── メンバーシップ証明の生成
    └── オフチェーン検証

Phase 3: 平文フィールドの廃止（将来）
    └── 完全なプライバシー保護
```

---

## Phase 1: Arcium MXE統合 ✅ 完了

### 実装日
2026-01-27

### デプロイ情報
- **Program ID**: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`
- **IDL Account**: `ATeW527XKpzBJLucBy8qrYjHCqEFCjC6PpBufybCCPqm`
- **Cluster Offset**: `456`
- **Network**: Solana Devnet

### 実装内容

#### 1. 契約数の暗号化

| 項目 | 内容 |
|------|------|
| フィールド | `Plan.encrypted_subscription_count` |
| 暗号化方式 | Arcium MXE (X25519 + RescueCipher) |
| サイズ | 32バイト |

**Arcis回路**:
- `increment_count` - 契約数をインクリメント (207M ACUs)
- `decrement_count` - 契約数をデクリメント (223M ACUs)
- `initialize_count` - 契約数を0で初期化 (151M ACUs)

**コールバック**:
- `increment_count_callback` - インクリメント結果を受信
- `decrement_count_callback` - デクリメント結果を受信

#### 2. サブスクリプションステータスの暗号化

| 項目 | 内容 |
|------|------|
| フィールド | `Subscription.encrypted_status` |
| 暗号化方式 | Arcium MXE |
| サイズ | 64バイト + 16バイト(ナンス) |

**暗号化される情報**:
- `is_active` (u8) - アクティブフラグ
- `subscribed_at` (i64) - 契約タイムスタンプ
- `cancelled_at` (i64) - 解約タイムスタンプ

**Arcis回路**:
- `set_subscription_active` - ステータスをアクティブに設定 (208M ACUs)
- `set_subscription_cancelled` - ステータスを解約に設定 (213M ACUs)
- `initialize_subscription_status` - 初期ステータスを生成 (152M ACUs)

**コールバック**:
- `subscribe_status_callback` - サブスクリプション開始の結果を受信
- `cancel_status_callback` - 解約の結果を受信

### 現在のデータ構造

```rust
pub struct Subscription {
    // 基本情報
    pub subscription_id: Pubkey,
    pub plan: Pubkey,
    pub encrypted_user_commitment: [u8; 32],  // Arcium暗号化
    pub membership_commitment: [u8; 32],       // ZK証明用

    // 平文（後方互換性 - 将来削除予定）
    pub subscribed_at: i64,       // ⚠️ 平文
    pub cancelled_at: i64,        // ⚠️ 平文
    pub is_active: bool,          // ⚠️ 平文

    // 暗号化済み
    pub encrypted_status: [u8; 64],  // ✅ Arcium暗号化
    pub status_nonce: [u8; 16],      // ✅ ナンス

    pub nonce: u128,
    pub bump: u8,
}
```

### SDK対応

- `initializeMxe()` - MXEアカウントの初期化
- `isMxeInitialized()` - MXE初期化状態の確認
- `getMxePda()` - MXE PDAの取得
- `deriveMxePda()` - MXE PDAの導出

### ステアリングドキュメント

- `.steering/20260127-arcium-mxe-integration/` - Arcium MXE統合
- `.steering/20260127-arcium-subscription-privacy/` - サブスクリプションプライバシー

---

## Phase 2: Light Protocol ZK証明統合 ⏳ 未着手

### 目的

1. **メンバーシップ証明**: 契約詳細を公開せずに「特定のプランに契約している」ことを証明
2. **オフチェーン検証**: サービス提供者がオンチェーンデータにアクセスせずに契約を検証
3. **完全なプライバシー**: 平文フィールドの段階的廃止

### 計画タスク

#### プログラム側
- [ ] Light Protocol依存関係の追加
- [ ] `CompressedSubscription`構造体の追加
- [ ] `subscribe_zk`命令の実装
- [ ] `verify_membership`命令の実装
- [ ] `migrate_to_zk`命令の実装

#### SDK側
- [ ] `generateMembershipProof()`メソッドの追加
- [ ] `verifyMembershipProof()`メソッドの追加
- [ ] `subscribeWithZk()`メソッドの追加

### ステアリングドキュメント

- `.steering/20260127-light-protocol-zk-integration/` - Light Protocol統合計画

---

## Phase 3: 平文フィールドの廃止 📋 将来

### 目的

平文フィールド（`is_active`、`subscribed_at`、`cancelled_at`）を完全に削除し、暗号化フィールドのみを使用する。

### 前提条件

- Phase 2（Light Protocol統合）の完了
- 既存サブスクリプションのZK圧縮への移行完了
- SDK/ダッシュボードの更新完了

### 計画タスク

- [ ] 既存サブスクリプションの移行スクリプト作成
- [ ] マイグレーション実行
- [ ] 平文フィールドの削除
- [ ] SDK/ダッシュボードの更新

---

## プライバシーレベル比較

| フィールド | Phase 1後 | Phase 2後 | Phase 3後 |
|-----------|----------|----------|----------|
| 契約数 | ✅ 暗号化 | ✅ 暗号化 | ✅ 暗号化 |
| is_active | ⚠️ 平文+暗号化 | ⚠️ 平文+暗号化 | ✅ 暗号化のみ |
| subscribed_at | ⚠️ 平文+暗号化 | ⚠️ 平文+暗号化 | ✅ 暗号化のみ |
| cancelled_at | ⚠️ 平文+暗号化 | ⚠️ 平文+暗号化 | ✅ 暗号化のみ |
| メンバーシップ証明 | ❌ なし | ✅ ZK証明 | ✅ ZK証明 |
| オフチェーン検証 | ❌ 不可 | ✅ 可能 | ✅ 可能 |

---

## 技術的ブロッカー（解決済み・未解決）

### 解決済み

| 問題 | 解決策 | 日付 |
|------|--------|------|
| `#[arcium_program]`と`#[program]`の競合 | `#[program]`のみを使用、Arciumマクロは延期 | 2026-01-27 |
| `queue_computation` APIの理解不足 | コールバック関数のみ実装、CPI統合は延期 | 2026-01-27 |
| デプロイ時の権限エラー | 正しいkeypair (id.json)を使用 | 2026-01-27 |

### 未解決（Phase 2で対応予定）

| 問題 | 対応予定 |
|------|----------|
| `queue_computation` CPI統合 | Light Protocol統合と並行して調査 |
| `#[arcium_callback]`マクロ統合 | `.arcis`ファイル生成後に再評価 |

---

## 参考リンク

- [Arcium Documentation](https://docs.arcium.com/)
- [Light Protocol / ZK Compression](https://www.zkcompression.com/)
- [Architecture Document](./architecture.md)
