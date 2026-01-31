# 要求内容

## 概要

サブスクリプション決済のための定期実行フローを実装する。Tuk Tuk（Helium）を使用してScheduledTransferを自動実行し、Privacy Cash経由でプライベートな定期送金を実現する。

## 背景

Protocol B (subly-vault) には定期送金の設定（ScheduledTransfer）と実行（ExecuteTransfer）の基本構造が実装されているが、以下の要素が未完成または未実装：

1. **Tuk Tuk Cron統合**: オンチェーンのCPIはプレースホルダー状態
2. **SDK側のCron管理**: @helium/cron-sdk を使用したCron Job作成機能
3. **ExecuteTransferの完全実装**: Privacy Cash連携とシェア更新ロジック
4. **バッチ証明生成**: 事前にZK証明を生成してオンチェーンに保存するフロー
5. **クランカー報酬**: 自動実行者への報酬設定

## 実装対象の機能

### 1. Tuk Tuk Cron Job 管理（SDK）

- TypeScript SDKで @helium/cron-sdk を使用してCron Jobを作成
- SetupTransfer実行時に連動してCron Jobを作成
- CancelTransfer実行時に連動してCron Jobを削除
- Cron式またはinterval_secondsに基づくスケジュール設定

### 2. ExecuteTransfer の完全実装（プログラム）

- 事前生成されたバッチ証明の検証
- UserShareの暗号化シェア量の更新
- Nullifierの登録（二重実行防止）
- TransferHistoryへの記録
- next_executionの更新
- ※Privacy Cash連携は今回スコープ外（将来統合）

### 3. バッチ証明生成フロー（SDK）

- ユーザーがローカルで複数回分のZK証明を事前生成
- 証明をBatchProofStorage PDAに保存
- 証明のバリデーション（プール価値の変動許容範囲チェック）

### 4. クランカー報酬設定

- ExecuteTransferを実行するクランカー（自動実行者）への報酬
- Tuk Tuk Task Queueへの報酬入金

## 受け入れ条件

### Tuk Tuk Cron Job 管理
- [ ] SDK経由でCron Jobを作成できる
- [ ] SDK経由でCron Jobを削除できる
- [ ] SetupTransfer時にtuktuk_cron_jobフィールドが設定される
- [ ] Cron Jobが指定した間隔で ExecuteTransfer をトリガーできる

### ExecuteTransfer の完全実装
- [ ] バッチ証明を検証して送金を実行できる
- [ ] UserShareの暗号化シェア量が正しく更新される
- [ ] Nullifierが登録され、同じ証明での再実行がブロックされる
- [ ] TransferHistoryに実行記録が保存される
- [ ] scheduled_transfer.next_execution が次回実行時刻に更新される
- [ ] scheduled_transfer.execution_count がインクリメントされる

### バッチ証明生成フロー
- [ ] SDKでバッチ証明を生成できる
- [ ] 生成した証明をオンチェーンに保存できる
- [ ] 証明の有効性を検証できる（プール価値変動チェック）

### クランカー報酬設定
- [ ] Task Queueに報酬用のSOLを入金できる
- [ ] クランカーが報酬を受け取れる

## 成功指標

- 1時間周期のデモ設定で自動実行が成功する
- 10回分のバッチ証明を事前生成して連続実行できる
- クランカーによる自動実行が24時間安定稼働する

## スコープ外

以下はこのフェーズでは実装しません：

- **Privacy Cash連携**: 実際のプライベート送金はMainnet統合時に実装
- **Kamino Lending連携**: 運用益からの支払い優先ロジック
- **Protocol A連携**: 会員契約と定期送金の自動紐付け
- **残高不足時の通知**: スキップ時のユーザー通知機能
- **UIダッシュボード**: 定期送金設定の画面（別タスク）

## 参照ドキュメント

- `docs/product-requirements.md` - B3: プライベート定期送金機能
- `docs/functional-design.md` - Shield Pool / 定期送金設計
- `docs/architecture.md` - Tuk Tuk連携、プライバシーアーキテクチャ
- `subly-mainnet/programs/subly-vault/src/integrations/tuktuk.rs` - Tuk Tuk統合コード
- `subly-mainnet/programs/subly-vault/src/state/scheduled_transfer.rs` - 定期送金PDA
