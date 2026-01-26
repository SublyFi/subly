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

## フェーズ1: プログラム基盤整備

- [ ] プログラム名をsubly-mainnetからsubly-vaultに変更
  - [ ] `programs/subly-mainnet/` ディレクトリを `programs/subly-vault/` にリネーム
  - [ ] `Cargo.toml` の `name` と `lib.crate-type` を更新
  - [ ] `Anchor.toml` のプログラム名を更新
  - [ ] `lib.rs` のモジュール名を `subly_vault` に変更

- [ ] ディレクトリ構造の作成
  - [ ] `programs/subly-vault/src/instructions/` ディレクトリ作成
  - [ ] `programs/subly-vault/src/state/` ディレクトリ作成
  - [ ] `programs/subly-vault/src/integrations/` ディレクトリ作成（空で可）

- [ ] 基本ファイルの作成
  - [ ] `src/errors.rs` - カスタムエラー定義
  - [ ] `src/events.rs` - イベント定義
  - [ ] `src/constants.rs` - 定数定義
  - [ ] `src/instructions/mod.rs` - 命令モジュール
  - [ ] `src/state/mod.rs` - 状態モジュール
  - [ ] `lib.rs` にモジュール宣言を追加

## フェーズ2: Shield Pool基本機能

- [ ] ShieldPool PDAの実装
  - [ ] `src/state/shield_pool.rs` にShieldPool構造体を定義
  - [ ] PDA導出ロジック実装（seeds = [b"shield_pool"]）
  - [ ] アカウントサイズ計算（SPACE定数）

- [ ] UserShare PDAの実装
  - [ ] `src/state/user_share.rs` にUserShare構造体を定義
  - [ ] PDA導出ロジック実装（seeds = [b"share", pool, commitment]）
  - [ ] アカウントサイズ計算（SPACE定数）

- [ ] initialize命令の実装
  - [ ] `src/instructions/initialize.rs` 作成
  - [ ] ShieldPool PDA初期化ロジック
  - [ ] アカウントコンテキスト定義
  - [ ] lib.rsに命令をエクスポート

## フェーズ3: 外部プロトコル連携基盤

- [ ] Privacy Cash連携の実装
  - [ ] `src/integrations/privacy_cash.rs` 作成
  - [ ] Privacy Cash CPI用の構造体定義
  - [ ] depositSPL呼び出しラッパー
  - [ ] withdrawSPL呼び出しラッパー
  - [ ] Cargo.tomlにprivacy-cash-sdk依存追加

- [ ] Kamino Lending連携の実装
  - [ ] `src/integrations/kamino.rs` 作成
  - [ ] Kamino CPI用の構造体定義
  - [ ] deposit（預け入れ）呼び出しラッパー
  - [ ] withdraw（引き出し）呼び出しラッパー
  - [ ] Cargo.tomlにkamino依存追加

- [ ] integrations/mod.rsの作成
  - [ ] privacy_cashモジュールをエクスポート
  - [ ] kaminoモジュールをエクスポート

## フェーズ4: 入金機能

- [ ] deposit命令の実装
  - [ ] `src/instructions/deposit.rs` 作成
  - [ ] Privacy Cash depositSPL CPI呼び出し
  - [ ] シェア計算ロジック（new_shares = deposit * total_shares / pool_value）
  - [ ] UserShare PDA作成/更新ロジック（ECIES暗号化シェア保存）
  - [ ] ShieldPool更新ロジック（total_shares, total_pool_value）
  - [ ] Kamino deposit CPI呼び出し（プール全体として預け入れ）
  - [ ] Deposited イベント発行
  - [ ] lib.rsに命令をエクスポート

- [ ] 入金用定数・エラーの追加
  - [ ] errors.rsにInvalidCommitment, InsufficientDeposit, PrivacyCashError追加
  - [ ] events.rsにDepositedイベント追加

## フェーズ5: 出金機能

- [ ] Nullifier PDAの実装
  - [ ] `src/state/nullifier.rs` 作成
  - [ ] Nullifier構造体定義
  - [ ] PDA導出ロジック

- [ ] withdraw命令の実装
  - [ ] `src/instructions/withdraw.rs` 作成
  - [ ] Nullifier検証・登録ロジック（二重出金防止）
  - [ ] シェア評価額計算（value = shares * pool_value / total_shares）
  - [ ] 残高検証（評価額 >= 出金額）
  - [ ] Kamino withdraw CPI呼び出し（必要額をプールから引き出し）
  - [ ] Privacy Cash withdrawSPL CPI呼び出し（プライベート送金）
  - [ ] UserShare更新（シェア減算、暗号化シェア更新）
  - [ ] ShieldPool更新（total_shares, total_pool_value）
  - [ ] Withdrawn イベント発行
  - [ ] lib.rsに命令をエクスポート

- [ ] 出金用定数・エラーの追加
  - [ ] errors.rsにInsufficientBalance, NullifierAlreadyUsed, KaminoError追加
  - [ ] events.rsにWithdrawnイベント追加

## フェーズ6: 定期送金機能

- [ ] ScheduledTransfer PDAの実装
  - [ ] `src/state/scheduled_transfer.rs` 作成
  - [ ] ScheduledTransfer構造体定義
  - [ ] PDA導出ロジック
  - [ ] TransferHistory構造体定義（送金履歴）

- [ ] Clockwork連携の実装
  - [ ] `src/integrations/clockwork.rs` 作成
  - [ ] Clockwork Thread作成ヘルパー
  - [ ] 自動実行トリガー設定
  - [ ] Cargo.tomlにclockwork-sdk依存追加

- [ ] setup_transfer命令の実装
  - [ ] `src/instructions/setup_transfer.rs` 作成
  - [ ] ScheduledTransfer PDA作成
  - [ ] Clockwork Thread作成（自動実行スケジュール）
  - [ ] 残高チェック（初回実行分の残高確認）
  - [ ] TransferScheduled イベント発行

- [ ] execute_transfer命令の実装
  - [ ] `src/instructions/execute_transfer.rs` 作成
  - [ ] Clockworkからの呼び出し検証
  - [ ] シェア評価額計算・残高検証
  - [ ] Kamino withdraw CPI呼び出し（送金額をプールから引き出し）
  - [ ] Privacy Cash withdrawSPL CPI呼び出し（事業者へプライベート送金）
  - [ ] UserShare更新（シェア減算）
  - [ ] ShieldPool更新
  - [ ] next_execution更新（次回実行日時）
  - [ ] TransferHistory PDA作成（履歴記録）
  - [ ] TransferExecuted イベント発行

- [ ] cancel_transfer命令の実装
  - [ ] `src/instructions/cancel_transfer.rs` 作成
  - [ ] 所有権検証（コミットメント検証）
  - [ ] Clockwork Thread削除
  - [ ] ScheduledTransfer無効化
  - [ ] TransferCancelled イベント発行

- [ ] 定期送金用定数・エラーの追加
  - [ ] errors.rsにTransferNotActive, InvalidInterval, ClockworkError追加
  - [ ] events.rsにTransferScheduled, TransferExecuted, TransferCancelled追加

## フェーズ7: プログラムビルド確認

- [ ] ビルド確認
  - [ ] `anchor build` が成功することを確認
  - [ ] IDLファイルが正しく生成されることを確認
  - [ ] 型エラーがないことを確認

## フェーズ8: vault-sdk基盤整備

- [ ] SDKディレクトリ構造の作成
  - [ ] `packages/vault-sdk/` ディレクトリ作成
  - [ ] `packages/vault-sdk/src/` ディレクトリ作成
  - [ ] `packages/vault-sdk/src/instructions/` ディレクトリ作成
  - [ ] `packages/vault-sdk/src/types/` ディレクトリ作成
  - [ ] `packages/vault-sdk/src/utils/` ディレクトリ作成

- [ ] SDK設定ファイルの作成
  - [ ] `packages/vault-sdk/package.json` 作成
  - [ ] `packages/vault-sdk/tsconfig.json` 作成

- [ ] 基本ファイルの作成
  - [ ] `src/index.ts` - エントリーポイント
  - [ ] `src/client.ts` - SublyVaultClientクラス（スケルトン）
  - [ ] `src/types/index.ts` - 型定義
  - [ ] `src/utils/pda.ts` - PDA計算
  - [ ] `src/utils/commitment.ts` - コミットメント生成
  - [ ] `src/utils/encryption.ts` - ECIES暗号化ユーティリティ（スケルトン）

## フェーズ9: SDKクライアント実装

- [ ] SublyVaultClient基本実装
  - [ ] コンストラクタ（connection, wallet）
  - [ ] プログラムID設定
  - [ ] ShieldPool PDA取得メソッド

- [ ] deposit メソッド実装
  - [ ] 入力パラメータ検証
  - [ ] コミットメント生成 commitment = hash(secret || pool_id)
  - [ ] シェア計算 new_shares = deposit * total_shares / pool_value
  - [ ] ECIES暗号化 encrypted_share = encrypt(shares, derive_key(wallet_sig))
  - [ ] Privacy Cash depositSPL呼び出し
  - [ ] トランザクション構築・送信

- [ ] withdraw メソッド実装
  - [ ] 入力パラメータ検証
  - [ ] 現在のシェア復号・評価額計算
  - [ ] 残高検証
  - [ ] Nullifier生成 nullifier = hash(secret || "withdraw" || nonce)
  - [ ] 新シェア計算・暗号化
  - [ ] トランザクション構築・送信

- [ ] getBalance メソッド実装
  - [ ] UserShare取得
  - [ ] シェア復号（シェア量をlocalに保持する簡易実装）
  - [ ] 評価額計算

- [ ] setupRecurringPayment メソッド実装
  - [ ] 入力パラメータ検証
  - [ ] トランザクション構築・送信

- [ ] cancelRecurringPayment メソッド実装
  - [ ] トランザクション構築・送信

## フェーズ10: 統合テスト

- [ ] テスト環境セットアップ
  - [ ] `tests/subly-vault.ts` の更新（既存から改名）
  - [ ] テスト用ウォレット設定
  - [ ] localnet設定確認

- [ ] Localnetテストの実装
  - [ ] initialize テスト
  - [ ] deposit テスト（Privacy Cashモック）
  - [ ] withdraw テスト（Privacy Cash/Kaminoモック）
  - [ ] setup_transfer テスト
  - [ ] execute_transfer テスト
  - [ ] cancel_transfer テスト
  - [ ] シェア計算・暗号化のユニットテスト

- [ ] Localnetテスト実行
  - [ ] `anchor test` が成功することを確認
  - [ ] 全テストがパスすることを確認

- [ ] Mainnet対応準備
  - [ ] Anchor.tomlにmainnet設定追加
  - [ ] 環境変数でRPCエンドポイント切り替え
  - [ ] Mainnetデプロイ用のキーペア準備手順をREADMEに記載

## フェーズ11: 品質チェックと修正

- [ ] コード品質チェック
  - [ ] Rust: `cargo clippy` でリントエラーがないことを確認
  - [ ] Rust: `cargo fmt --check` でフォーマットが正しいことを確認
  - [ ] TypeScript: `pnpm lint`（設定がある場合）

- [ ] ビルド最終確認
  - [ ] `anchor build` が成功
  - [ ] `anchor test` が成功

## フェーズ11: ドキュメント更新

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
