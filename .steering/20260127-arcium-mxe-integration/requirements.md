# 要件定義書: Arcium MXE統合

## 概要

Subly MembershipプログラムにArcium MXEを統合し、暗号化された契約数のインクリメント/デクリメント機能を実装する。

## 背景

現在の実装では：
- `encrypted_subscription_count` フィールドは `[0u8; 32]` で初期化されたまま
- subscribe/cancel_subscription時に契約数が更新されていない
- Arcium MXE統合（queue_computation, arcium_callback）が未実装

## 機能要件

### FR-1: 暗号化された契約数のインクリメント

**ユーザーストーリー**: ユーザーがプランを契約した時、暗号化されたままの状態で契約数が1増加する

**受け入れ条件**:
- [ ] subscribe命令実行時にArcium MXEが呼び出される
- [ ] MXEノードが暗号化された契約数をインクリメントする
- [ ] 結果は暗号化されたままPlanアカウントに保存される
- [ ] 契約数の具体的な値は第三者には分からない

### FR-2: 暗号化された契約数のデクリメント

**ユーザーストーリー**: ユーザーがプランを解約した時、暗号化されたままの状態で契約数が1減少する

**受け入れ条件**:
- [ ] cancel_subscription命令実行時にArcium MXEが呼び出される
- [ ] MXEノードが暗号化された契約数をデクリメントする
- [ ] 結果は暗号化されたままPlanアカウントに保存される
- [ ] 契約数が0未満にならないよう保護される

### FR-3: 事業者による契約数の復号

**ユーザーストーリー**: 事業者は自分のプランの契約数を復号して確認できる

**受け入れ条件**:
- [ ] 事業者のウォレット署名で契約数を復号できる
- [ ] 復号結果はクライアント側でのみ表示される
- [ ] 第三者は契約数を復号できない

## 非機能要件

### NFR-1: パフォーマンス
- MXE計算完了までの目標時間: 20秒以内

### NFR-2: 互換性
- 既存のsubscribe/cancel_subscription APIとの後方互換性を維持
- Arcium v0.5.4との互換性

### NFR-3: セキュリティ
- 契約数は常に暗号化された状態で保存
- MXEノード以外は平文の契約数にアクセスできない

## 技術的制約

1. **Arcium Devnet**: 現時点ではDevnetのみサポート
2. **SBFツールチェーン**: Rust edition 2024未対応のため、依存関係のバージョンに制約あり
3. **Anchor 0.32.x**: #[derive(Accounts)]マクロの制約によりlib.rsに直接実装

## スコープ外

- Light ProtocolによるZK証明統合（別フェーズで実装）
- MagicBlock PERによるアクセス制御（別フェーズで実装）
- is_activeフラグの暗号化（設計検討が必要）

## 参考資料

- [Arcium Documentation](https://docs.arcium.com)
- [Solana Integration: Orchestration and Execution](https://docs.arcium.com/solana-integration-and-multichain-coordination/solana-integration-orchestration-and-execution)
