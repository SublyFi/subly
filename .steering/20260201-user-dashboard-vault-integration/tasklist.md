# タスクリスト

## タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

---

## フェーズ1: 基盤構築

- [ ] pnpm-workspace.yamlの更新
  - [ ] `subly-mainnet/packages/vault-sdk`をworkspaceに追加
- [ ] package.jsonへのvault-sdk追加
  - [ ] `@subly/vault-sdk`を依存関係に追加
  - [ ] `pnpm install`で依存解決
- [ ] VaultProvider実装
  - [ ] `providers/VaultProvider.tsx`を作成
  - [ ] SublyVaultClientの初期化ロジック実装
  - [ ] ウォレット接続との連携実装
  - [ ] コンテキスト型定義（VaultContextType）
- [ ] useVaultフック実装
  - [ ] `hooks/useVault.ts`を作成
  - [ ] コンテキストからの値取得
- [ ] Providersへの統合
  - [ ] `providers/index.tsx`にVaultProviderを追加
- [ ] エラー定義の追加
  - [ ] `lib/errors.ts`を作成
  - [ ] VaultError, VaultErrorCodeを定義
- [ ] フォーマットユーティリティの追加
  - [ ] `lib/format.ts`を作成
  - [ ] formatUsdc, formatApy関数を実装

## フェーズ2: Vault概要画面

- [ ] useVaultBalanceフック実装
  - [ ] `hooks/useVaultBalance.ts`を作成
  - [ ] 残高取得ロジック実装
  - [ ] APY・運用益取得ロジック実装
  - [ ] ローディング・エラー状態管理
- [ ] BalanceCardコンポーネント実装
  - [ ] `components/vault/BalanceCard.tsx`を作成
  - [ ] 残高表示UI
  - [ ] ローディングスケルトン
- [ ] YieldCardコンポーネント実装
  - [ ] `components/vault/YieldCard.tsx`を作成
  - [ ] APY表示
  - [ ] 累計利回り表示
- [ ] vaultコンポーネントのバレルエクスポート
  - [ ] `components/vault/index.ts`を作成
- [ ] Vault概要ページ実装
  - [ ] `app/vault/page.tsx`を作成
  - [ ] BalanceCard, YieldCard配置
  - [ ] 入金・出金ボタン配置
  - [ ] 定期送金・履歴へのリンク

## フェーズ3: 入金・出金機能

- [ ] DepositFormコンポーネント実装
  - [ ] `components/vault/DepositForm.tsx`を作成
  - [ ] 金額入力フィールド
  - [ ] バリデーション（正の数、最小額）
  - [ ] 入金ボタン・ローディング状態
  - [ ] 成功・エラーメッセージ表示
- [ ] 入金ページ実装
  - [ ] `app/vault/deposit/page.tsx`を作成
  - [ ] DepositForm配置
  - [ ] 戻るナビゲーション
- [ ] WithdrawFormコンポーネント実装
  - [ ] `components/vault/WithdrawForm.tsx`を作成
  - [ ] 金額入力フィールド
  - [ ] 残高上限バリデーション
  - [ ] 出金ボタン・ローディング状態
  - [ ] 成功・エラーメッセージ表示
- [ ] 出金ページ実装
  - [ ] `app/vault/withdraw/page.tsx`を作成
  - [ ] WithdrawForm配置
  - [ ] 戻るナビゲーション

## フェーズ4: 定期送金機能

- [ ] useScheduledTransfersフック実装
  - [ ] `hooks/useScheduledTransfers.ts`を作成
  - [ ] 定期送金一覧取得ロジック
  - [ ] 設定・キャンセルロジック
- [ ] TransferCardコンポーネント実装
  - [ ] `components/vault/TransferCard.tsx`を作成
  - [ ] 送金先（マスク表示）、金額、周期表示
  - [ ] 次回実行日時表示
  - [ ] キャンセルボタン
- [ ] TransferSetupFormコンポーネント実装
  - [ ] `components/vault/TransferSetupForm.tsx`を作成
  - [ ] 事業者アドレス入力
  - [ ] 金額入力
  - [ ] 周期選択（hourly/daily/weekly/monthly）
  - [ ] 確認・送信ボタン
- [ ] 定期送金ページ実装
  - [ ] `app/vault/transfers/page.tsx`を作成
  - [ ] TransferCard一覧
  - [ ] TransferSetupForm（モーダルまたはインライン）
  - [ ] 空状態表示

## フェーズ5: 履歴機能

- [ ] useTransferHistoryフック実装
  - [ ] `hooks/useTransferHistory.ts`を作成
  - [ ] 履歴取得ロジック
  - [ ] ページネーションロジック
- [ ] HistoryItemコンポーネント実装
  - [ ] `components/vault/HistoryItem.tsx`を作成
  - [ ] 種類別アイコン（入金/出金/送金）
  - [ ] 日時、金額、ステータス表示
- [ ] 履歴ページ実装
  - [ ] `app/vault/history/page.tsx`を作成
  - [ ] HistoryItem一覧
  - [ ] ページネーションまたはLoadMoreボタン
  - [ ] 空状態表示

## フェーズ6: ナビゲーション統合

- [ ] Headerコンポーネントの更新
  - [ ] `components/Header.tsx`にVaultリンク追加
  - [ ] アクティブ状態のスタイリング
- [ ] 全体ナビゲーション確認
  - [ ] 各ページ間の遷移テスト
  - [ ] 戻るボタンの動作確認

## フェーズ7: 品質チェックと修正

- [ ] 型エラーがないことを確認
  - [ ] `pnpm --filter dashboard-user typecheck`（または`tsc --noEmit`）
- [ ] リントエラーがないことを確認
  - [ ] `pnpm --filter dashboard-user lint`
- [ ] ビルドが成功することを確認
  - [ ] `pnpm --filter dashboard-user build`
- [ ] 開発サーバーでの動作確認
  - [ ] `pnpm --filter dashboard-user dev`
  - [ ] 各ページの表示確認
  - [ ] 基本操作の動作確認

## フェーズ8: ドキュメント更新

- [ ] 実装後の振り返り（このファイルの下部に記録）

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

**注意**: 「時間の都合」「難しい」などの理由でスキップしたタスクはここに記載しないこと。全タスク完了が原則。

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
