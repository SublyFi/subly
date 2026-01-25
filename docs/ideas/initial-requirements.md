# Subly - 初期要求仕様

## 基本情報

- **プロダクト名**: Subly
- **One Liner**: Privacy-first PayFi protocol for subscriptions on Solana

## 解決したい課題

1. **プライバシーの欠如**: 現在のオンチェーンサブスクリプションでは、誰がどのサービスに契約しているかが公開されてしまう
2. **資金効率の悪さ**: サブスクリプション料金を単純に保持しておくのは資金効率が悪い
3. **オンオフランプの複雑さ**: 法定通貨とのブリッジが複雑で参入障壁が高い
4. **事業者側の導入障壁**: Web3サービスに決済機能を導入するハードルが高い

## ターゲットユーザー

### エンドユーザー（サブスクリプション購入者）
- Web3サービスを利用するユーザー
- USDCを保有しており、運用しながらサブスクリプション料金を支払いたい
- プライバシーを重視する

### 事業者（サブスクリプション提供者）
- NFT、DeFi、GameFiなどのWeb3プロジェクト
- サブスクリプション型の課金モデルを導入したい
- 簡単に決済機能を自社アプリに組み込みたい

## 主要機能

### 1. ユーザー向け機能
- USDCの入金
- 資金の自動運用（DeFi - Kamino Lending）
- 運用益（Yield）でのサブスクリプション決済
- Yield不足時は元本から補填
- 契約サブスクリプションの管理

### 2. 事業者向け機能
- Sublyダッシュボード
  - サブスクリプションプランの作成・管理
  - 課金頻度の自由設定（日・週・月・年など）
  - 収益の確認
- SDK（Node.js）
  - 自社アプリへの簡単な組み込み
  - サブスクリプション契約フローの実装

### 3. プライバシー機能
- ゼロ知識証明による会員証明（事業者はどのユーザーが契約しているか分からない）
- 暗号化されたデータ管理
- プライベートな送金

### 4. コンプライアンス機能
- 制裁対象アドレスのチェック（Range Risk API）
- ユーザー情報は事業者に渡さない

## 技術スタック（検討中）

### コア技術
- **Arcium Arcis Framework**: MPC（Multi-Party Computation）による暗号化計算
  - データは暗号化
  - 計算処理はMPCで実行
  - 現在Devnetのみ対応

### プライバシー技術
- **Light Protocol**: ゼロ知識証明、ZK Compression
  - 会員証明に使用
- **プライベート送金**（検討中）:
  - Privacy Cash（Mainnetのみ対応）
  - Confidential Transfer（専用RPC必要、Devnet/Mainnet利用不可）

### DeFi統合
- **Kamino Finance**: Lending機能でUSDCを運用
  - プライバシーを保った状態での運用が必要
  - ユーザーとレンディングポジションの紐付けを防ぐ

### コンプライアンス
- **Range Risk API**: 制裁対象アドレスのチェック
- **Switchboard Oracle**: オンチェーンでのリスク検証

## MVPの範囲

### Phase 1（MVP）
1. ユーザーのUSDC入金機能
2. 基本的なサブスクリプション契約フロー
3. 事業者ダッシュボード（基本機能）
4. SDK（Node.js）基本版
5. プライバシー機能（Arcium + Light Protocol）

### Phase 2
1. DeFi運用機能（Kamino Lending統合）
2. プライベート送金機能
3. 制裁チェック機能

### Phase 3
1. オンオフランプ統合
2. 高度な分析機能
3. マルチチェーン対応

## 制約事項

1. Arciumは現在Devnetのみ対応
2. プライベート送金の実現方法が未確定
3. DeFiプロトコルはMainnetのみのため、Devnetでのデモには別実装が必要
4. 投資家向けにはDeFi部分とプライバシー部分を別々にデモする想定

## 参考リンク

- Arcium Arcis: https://docs.arcium.com/developers/arcis
- Light Protocol: https://www.zkcompression.com/
- Range Risk API: https://docs.range.org/risk-api/risk-introduction
- Kamino Finance: https://docs.kamino.finance/
- Privacy Cash: https://privacycash.mintlify.app/
- Confidential Transfer: https://github.com/gitteri/confidential-balances-exploration
