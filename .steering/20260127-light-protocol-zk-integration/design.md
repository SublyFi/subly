# 設計: Light Protocol ZK証明統合

## 概要

Light Protocolを使用して、サブスクリプションのゼロ知識証明（ZKP）機能を実装します。これにより、ユーザーは契約詳細を公開せずにメンバーシップを証明できます。

## アーキテクチャ

### 現在の状態

```
┌─────────────────────────────────────────────────────┐
│                   Subscription                       │
├─────────────────────────────────────────────────────┤
│ encrypted_user_commitment: [u8; 32]  (Arcium)       │
│ membership_commitment: [u8; 32]      (ZK用)         │
│ encrypted_status: [u8; 64]           (Arcium)       │
│ status_nonce: [u8; 16]               (Arcium)       │
│ is_active: bool                      (平文・非推奨) │
│ subscribed_at: i64                   (平文・非推奨) │
│ cancelled_at: i64                    (平文・非推奨) │
└─────────────────────────────────────────────────────┘
```

### 目標状態

```
┌─────────────────────────────────────────────────────┐
│              Compressed Subscription                 │
├─────────────────────────────────────────────────────┤
│ encrypted_user_commitment: [u8; 32]  (Arcium MXE)   │
│ encrypted_status: [u8; 64]           (Arcium MXE)   │
│ status_nonce: [u8; 16]               (Arcium MXE)   │
│ merkle_tree_pubkey: Pubkey           (Light)        │
│ leaf_index: u32                      (Light)        │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              Merkle Tree (Light Protocol)           │
├─────────────────────────────────────────────────────┤
│ leaf[0]: hash(subscription_0)                       │
│ leaf[1]: hash(subscription_1)                       │
│ leaf[2]: hash(subscription_2)                       │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

## データモデル

### MembershipProof（クライアント側）

```typescript
interface MembershipProof {
  // Merkle証明
  root: Uint8Array;
  leaf: Uint8Array;
  proof: Uint8Array[];
  leafIndex: number;

  // メタデータ
  planId: PublicKey;
  validUntil: number; // Unix timestamp

  // 署名（リプレイ攻撃対策）
  signature: Uint8Array;
  nonce: Uint8Array;
}
```

### CompressedSubscription（オンチェーン）

```rust
#[account]
pub struct CompressedSubscription {
    /// Merkle tree this subscription belongs to
    pub merkle_tree: Pubkey,
    /// Leaf index in the Merkle tree
    pub leaf_index: u32,
    /// Root hash at subscription creation
    pub root_hash: [u8; 32],
    /// Encrypted status (Arcium)
    pub encrypted_status: [u8; 64],
    pub status_nonce: [u8; 16],
}
```

## 処理フロー

### 1. サブスクリプション作成（ZK圧縮版）

```
User                    Program                 Light Protocol
  │                        │                         │
  │─── subscribe_zk() ────▶│                         │
  │                        │── create_leaf() ───────▶│
  │                        │◀── leaf_index ──────────│
  │                        │                         │
  │                        │── append_to_tree() ────▶│
  │                        │◀── new_root ────────────│
  │                        │                         │
  │◀── CompressedSub ──────│                         │
```

### 2. メンバーシップ証明生成

```
User                    SDK                     Light Protocol
  │                       │                          │
  │─ generateProof() ────▶│                          │
  │                       │── get_proof() ──────────▶│
  │                       │◀── merkle_proof ─────────│
  │                       │                          │
  │                       │── sign(proof, nonce) ───▶│
  │◀── MembershipProof ───│                          │
```

### 3. 証明検証（オフチェーン）

```
Service Provider         SDK
       │                   │
       │── verifyProof() ─▶│
       │                   │── verify_root()
       │                   │── verify_signature()
       │                   │── check_expiry()
       │◀── true/false ────│
```

## 実装コンポーネント

### プログラム側

1. **compressed_subscription.rs** - ZK圧縮サブスクリプション状態
2. **instructions/subscribe_zk.rs** - ZK圧縮サブスクリプション作成
3. **instructions/verify_membership.rs** - オンチェーン証明検証

### SDK側

1. **proof/generator.ts** - Merkle証明生成
2. **proof/verifier.ts** - 証明検証（オフチェーン）
3. **client.ts** - subscribeWithZk(), generateMembershipProof(), verifyMembershipProof()

## Light Protocol統合

### 依存関係

```toml
[dependencies]
light-sdk = "0.11"
light-compressed-token = "0.9"
light-system-program = "0.11"
```

### CPIs

- `create_state_tree()` - Merkleツリーの作成
- `append_leaves()` - サブスクリプションの追加
- `get_proof()` - Merkle証明の取得

## セキュリティ考慮事項

### リプレイ攻撃対策

- 証明にnonce（ランダム値）を含める
- 証明に有効期限（validUntil）を設定
- 使用済み証明のnullifier管理

### 証明の偽造防止

- Merkle rootの検証
- 署名の検証
- タイムスタンプの検証

## 移行計画

### Phase 1: ZK圧縮の追加（新規サブスクリプション）

- 新規サブスクリプションはZK圧縮で作成
- 既存サブスクリプションは変更なし

### Phase 2: 既存サブスクリプションの移行

- 既存サブスクリプションをZK圧縮に移行
- `migrate_subscription_to_zk`命令の追加

### Phase 3: 平文フィールドの廃止

- `is_active`、`subscribed_at`、`cancelled_at`を完全に削除
- 暗号化フィールドのみを使用

## テスト計画

1. **ユニットテスト**
   - Merkle証明の生成・検証
   - 署名の検証
   - 有効期限の検証

2. **統合テスト**
   - Light ProtocolとのCPI
   - Arcium MXEとの併用
   - エンドツーエンドフロー

3. **セキュリティテスト**
   - リプレイ攻撃のテスト
   - 偽造証明の検出
