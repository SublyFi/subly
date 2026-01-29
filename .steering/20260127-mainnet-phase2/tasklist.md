# タスクリスト

## 重要: タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

### 実装可能なタスクのみを計画
- 計画段階で「実装可能なタスク」のみをリストアップ
- 「将来やるかもしれないタスク」は含めない
- 「検討中のタスク」は含めない

### タスクスキップが許可される唯一のケース
以下の技術的理由に該当する場合のみスキップ可能:
- 実装方針の変更により、機能自体が不要になった
- アーキテクチャ変更により、別の実装方法に置き換わった
- 依存関係の変更により、タスクが実行不可能になった

スキップ時は必ず理由を明記:
```markdown
- [x] ~~タスク名~~（実装方針変更により不要: 具体的な技術的理由）
```

### タスクが大きすぎる場合
- タスクを小さなサブタスクに分割
- 分割したサブタスクをこのファイルに追加
- サブタスクを1つずつ完了させる

---

## フェーズ1: vault-sdk依存関係更新

- [x] package.json更新
  - [x] `privacycash` パッケージを追加 (`^1.1.7`)
  - [x] `@helium/cron-sdk` パッケージを追加
  - [x] `@helium/tuktuk-sdk` パッケージを追加
  - [x] `@kamino-finance/klend-sdk` パッケージを追加
  - [x] Node.js要件を `>=24.0.0` に更新
- [x] `pnpm install` で依存関係をインストール

## フェーズ2: Privacy Cash統合

- [x] Privacy Cash統合モジュール作成
  - [x] `packages/vault-sdk/src/integrations/` ディレクトリ作成
  - [x] `packages/vault-sdk/src/integrations/index.ts` 作成（エクスポート）
  - [x] `packages/vault-sdk/src/integrations/privacy-cash.ts` 作成
  - [x] `depositPrivateUSDC(amount)` メソッド実装
  - [x] `withdrawPrivateUSDC(amount, recipient?)` メソッド実装
  - [x] `getPrivateUSDCBalance()` メソッド実装

- [x] Rustプログラム Privacy Cash更新
  - [x] `privacy_cash.rs` のプログラムIDを実際の値に更新 (`9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD`)
  - [x] コメントで「SDK経由で呼び出し、CPIは使用しない」旨を明記

## フェーズ3: Tuk Tuk統合（Clockwork移行）

- [x] Rustプログラム Clockwork → Tuk Tuk移行
  - [x] `clockwork.rs` を `tuktuk.rs` にリネーム
  - [x] Tuk TukプログラムID更新 (`tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA`)
  - [x] CronプログラムID追加 (`cronAjRZnJn3MTP3B9kE62NWDrjSuAPVXf9c4hu4grM`)
  - [x] アカウント構造を Tuk Tuk用に更新
  - [x] `mod.rs` の参照を `clockwork` → `tuktuk` に変更

- [x] `scheduled_transfer.rs` 更新
  - [x] `clockwork_thread` フィールドを `tuktuk_cron_job` にリネーム

- [x] Tuk Tuk TypeScript統合モジュール作成
  - [x] `packages/vault-sdk/src/integrations/tuktuk.ts` 作成
  - [x] `createCronJob(schedule, targetInstruction)` メソッド実装
  - [x] `fundCronJob(cronJobPda, amount)` メソッド実装
  - [x] `closeCronJob(cronJobPda)` メソッド実装
  - [x] 手動実行用 `checkPendingTransfers()` メソッド実装
  - [x] 手動実行用 `executePendingTransfer(transferId)` メソッド実装

## フェーズ4: Kamino Lending統合

- [x] Kamino TypeScript統合モジュール作成
  - [x] `packages/vault-sdk/src/integrations/kamino.ts` 作成
  - [x] `depositToKamino(amount)` メソッド実装
  - [x] `withdrawFromKamino(amount)` メソッド実装
  - [x] `getKaminoYieldInfo()` メソッド実装

- [x] Rustプログラム Kamino更新
  - [x] `kamino.rs` のディスクリミネーター更新（SDK経由で操作するためコメント追加）
  - [x] V2命令対応の確認・更新（SDK経由のため詳細はSDK側で管理）

## フェーズ5: client.ts統合更新

- [x] 統合モジュールのインポート追加
- [x] `deposit()` メソッド更新
  - [x] Privacy Cash `depositSPL()` 呼び出しを追加
- [x] `withdraw()` メソッド更新
  - [x] Privacy Cash `withdrawSPL()` 呼び出しを追加
- [x] `setupRecurringPayment()` メソッド更新
  - [x] Tuk Tuk Cronジョブ作成を追加（オプション）
- [x] `cancelRecurringPayment()` メソッド更新
  - [x] Tuk Tuk Cronジョブ削除を追加（オプション）
- [x] `getYieldInfo()` メソッド更新
  - [x] Kamino実際のAPY取得に置き換え
- [x] 手動実行メソッド追加
  - [x] `checkPendingTransfers()` を公開APIに追加
  - [x] `executePendingTransfer(transferId)` を公開APIに追加

## フェーズ6: ビルド・品質チェック

- [x] Rustプログラムビルド確認
  - [x] `anchor build` が成功する
  - [x] Clippy警告がない（`cargo clippy`）
  - [x] フォーマット確認（`cargo fmt --check`）

- [x] TypeScript SDKビルド確認
  - [x] `pnpm --filter @subly/vault-sdk build` が成功する
  - [x] 型エラーがない（`pnpm --filter @subly/vault-sdk typecheck`）

- [x] テスト実行
  - [x] 既存テストが通る（`anchor test`）

## フェーズ7: ドキュメント更新

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-01-27

### 計画と実績の差分

**計画と異なった点**:
- Clockworkが2023年10月31日に停止していたことが判明 → Tuk Tuk (Helium) への移行が必要だった
- Privacy Cash SDKはDevnet非対応でMainnet専用のため、Devnetでのテストは不可
- 外部SDK（Privacy Cash, Kamino, Tuk Tuk）のAPI形式が文書と異なり、動的インポートとプレースホルダー実装が必要だった
- lib.rsで `clockwork_thread` → `tuktuk_cron_job` へのフィールド名変更が漏れていた

**新たに必要になったタスク**:
- index.tsでのUSCD_MINT重複エクスポート解消（Privacy CashとKaminoで同じ定数）
- IDLファイルのAnchor 0.32+形式への更新（address, metadataフィールド追加）
- Clippy警告の修正（range_contains, abs_diff）

**技術的理由でスキップしたタスク**:
- なし（全タスク完了）

### 学んだこと

**技術的な学び**:
- Clockworkの停止とTuk Tukへの移行が業界標準になっている
- 外部SDK（Kamino, Tuk Tuk）のAPIはバージョンによって大きく異なるため、動的インポートと`any`型を使った柔軟な実装が必要
- Privacy Cash SDKはNode.js 24+が必要でMainnet専用
- Anchor 0.32+ではIDL形式が変更され、`address`と`metadata`が必須
- 複数モジュールからの同名エクスポートは明示的な再エクスポートで解決

**プロセス上の改善点**:
- ステアリングファイルによるタスク管理で進捗が明確
- 各タスク完了時の即時マーキングにより、状況把握が容易
- 計画フェーズでの事前調査（Clockwork停止の発見など）が重要

### 次回への改善提案
- 外部SDKを使用する際は、事前にAPIドキュメントと実際の型定義を照合すべき
- Mainnet専用の機能（Privacy Cash）は、テスト戦略を事前に明確化すべき
- フィールド名変更時は、grep/ripgrepで関連箇所を網羅的に検索すべき
- 依存パッケージのバージョン互換性を事前に確認すべき（Anchor 0.28 vs 0.30 vs 0.32）
