# 要件: Light Protocol ZK証明統合

## 背景

Arcium MXE統合により、サブスクリプションデータの暗号化が完了しました。しかし、暗号化だけではユーザーが「特定のプランに契約している」ことを第三者に証明する手段がありません。

Light Protocolを統合することで、ゼロ知識証明（ZKP）を使用した「メンバーシップ証明」が可能になります。

## 現在の状態（Arcium MXE統合後）

### 暗号化済みフィールド
- `encrypted_subscription_count` - プランの契約者数
- `encrypted_status` - サブスクリプションステータス（is_active, subscribed_at, cancelled_at）

### 平文フィールド（後方互換性のため保持）
- `is_active` - アクティブフラグ
- `subscribed_at` - 契約タイムスタンプ
- `cancelled_at` - 解約タイムスタンプ

## 目的

Light Protocolを使用して、以下を実現します：

1. **メンバーシップ証明**: 契約詳細を公開せずに「特定のプランに契約している」ことを証明
2. **オフチェーン検証**: サービス提供者がオンチェーンデータにアクセスせずに契約を検証
3. **完全なプライバシー**: 平文フィールドの段階的廃止

## 機能要件

### FR-1: ZK圧縮アカウント

- Light Protocolの圧縮アカウントを使用してサブスクリプションを管理
- Merkleツリーへのサブスクリプション状態の格納

### FR-2: メンバーシップ証明生成

- ユーザーがサブスクリプションのMerkle証明を生成
- 証明に含まれる情報：
  - プランへの契約状態（アクティブ/非アクティブ）
  - 契約の有効性（期限切れでないこと）

### FR-3: 証明検証

- サービス提供者がMerkle証明を検証
- オンチェーンおよびオフチェーンでの検証サポート

### FR-4: 平文フィールドの廃止

- `is_active`、`subscribed_at`、`cancelled_at`の平文フィールドを段階的に廃止
- 暗号化フィールドのみを使用するよう移行

## 非機能要件

### NFR-1: 証明サイズ

- Merkle証明のサイズを最適化（ガス効率）
- 証明生成時間の最小化

### NFR-2: 互換性

- Arcium MXE暗号化との併用
- 既存のサブスクリプション構造との後方互換性

### NFR-3: セキュリティ

- 証明の偽造防止
- リプレイ攻撃への対策

## 参考リソース

- [Light Protocol Documentation](https://www.lightprotocol.com/docs)
- [ZK Compression](https://www.zkcompression.com/)
- [Light Protocol GitHub](https://github.com/Lightprotocol/light-protocol)

## 受け入れ条件

- [ ] Light Protocolの依存関係が追加されている
- [ ] ZK圧縮アカウントでサブスクリプションを作成できる
- [ ] メンバーシップ証明を生成できる
- [ ] 証明をオンチェーン/オフチェーンで検証できる
- [ ] SDKに証明生成・検証メソッドが追加されている
- [ ] Devnetでエンドツーエンドの動作確認ができる
