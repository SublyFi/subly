# タスクリスト: 資金フロー実装

## 重要: タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## 前提条件

- [ ] Kamino SDK (`@kamino-finance/klend-sdk`) のAPIドキュメント確認
- [ ] Kamino プログラムのアカウント構造を理解
- [ ] CPI 呼び出しに必要なアカウント一覧を整理

---

## フェーズ1: Shield Pool Token Account の追加

### 1.1 オンチェーンプログラム変更

- [ ] `state/shield_pool.rs` に新フィールド追加
  - [ ] `token_account: Pubkey` (Shield Pool の USDC ATA)
  - [ ] `kamino_ctoken_account: Pubkey` (Kamino cToken アカウント)
  - [ ] `SPACE` 定数を更新

- [ ] `instructions/initialize.rs` を更新
  - [ ] Shield Pool ATA の作成ロジック追加
  - [ ] Kamino cToken アカウントの作成ロジック追加
  - [ ] 必要なアカウント（Token Program, Associated Token Program）を追加

- [ ] `constants.rs` に追加
  - [ ] `USDC_MINT` (Mainnet USDC mint address)
  - [ ] `KAMINO_LENDING_PROGRAM_ID`
  - [ ] `KAMINO_MAIN_MARKET`

### 1.2 テスト

- [ ] initialize 命令のテスト更新
- [ ] Token Account が正しく作成されることを確認

---

## フェーズ2: Kamino CPI モジュールの実装

### 2.1 CPI モジュール作成

- [ ] `integrations/kamino_cpi.rs` を新規作成
  - [ ] Kamino Lending プログラムの instruction 構造体定義
  - [ ] `kamino_deposit()` CPI 関数
  - [ ] `kamino_withdraw()` CPI 関数
  - [ ] 必要なアカウント構造体

- [ ] `integrations/mod.rs` にエクスポート追加

### 2.2 Kamino アカウント構造の定義

- [ ] `state/kamino_accounts.rs` を新規作成（必要に応じて）
  - [ ] KaminoMarket 構造体
  - [ ] KaminoReserve 構造体
  - [ ] KaminoObligation 構造体

### 2.3 テスト

- [ ] Kamino CPI のユニットテスト
- [ ] Devnet/Mainnet-fork でのテスト

---

## フェーズ3: register_deposit への統合

### 3.1 オンチェーン変更

- [ ] `instructions/register_deposit.rs` を更新
  - [ ] アカウント構造に追加:
    - [ ] `shield_pool_token_account`
    - [ ] `kamino_market`
    - [ ] `kamino_reserve`
    - [ ] `kamino_ctoken_account`
    - [ ] `token_program`
    - [ ] `kamino_program`
  - [ ] 処理ロジック追加:
    - [ ] Shield Pool ATA の残高確認
    - [ ] Kamino deposit CPI 呼び出し

- [ ] `lib.rs` の `register_deposit` ハンドラ更新

### 3.2 SDK変更

- [ ] `client.ts` の `registerDeposit()` 更新
  - [ ] 新しいアカウントをトランザクションに含める
  - [ ] Kamino 関連アカウントの取得ロジック

### 3.3 テスト

- [ ] register_deposit の統合テスト
- [ ] 入金額が正しく Kamino に deposit されることを確認
- [ ] シェア計算が正しいことを確認

---

## フェーズ4: withdraw への統合

### 4.1 オンチェーン変更

- [ ] `instructions/withdraw.rs` を更新
  - [ ] アカウント構造に追加:
    - [ ] `shield_pool_token_account`
    - [ ] `kamino_market`
    - [ ] `kamino_reserve`
    - [ ] `kamino_ctoken_account`
    - [ ] `token_program`
    - [ ] `kamino_program`
  - [ ] 処理ロジック追加:
    - [ ] Kamino withdraw CPI 呼び出し
    - [ ] Shield Pool ATA への USDC 入金確認

- [ ] `lib.rs` の `withdraw` ハンドラ更新

### 4.2 SDK変更

- [ ] `client.ts` の `withdraw()` 更新
  - [ ] 新しいアカウントをトランザクションに含める
  - [ ] Privacy Cash 経由の送金フロー確認

### 4.3 テスト

- [ ] withdraw の統合テスト
- [ ] Kamino 収益を含む正しい金額が引き出せることを確認
- [ ] シェア消却が正しいことを確認

---

## フェーズ5: execute_transfer への統合

### 5.1 オンチェーン変更

- [ ] `instructions/execute_transfer.rs` を更新
  - [ ] アカウント構造に Kamino 関連アカウント追加
  - [ ] Kamino withdraw CPI 呼び出し追加

- [ ] `lib.rs` の `execute_transfer` ハンドラ更新

### 5.2 SDK変更

- [ ] `client.ts` の `executeScheduledTransfer()` 更新
  - [ ] オンチェーン実行 + Privacy Cash 送金の連携
  - [ ] エラーハンドリング強化

### 5.3 テスト

- [ ] execute_transfer の統合テスト
- [ ] 定期送金が正しく実行されることを確認
- [ ] 送金先のプライバシーが維持されることを確認

---

## フェーズ6: total_pool_value 更新メカニズム

### 6.1 オンチェーン変更

- [ ] `instructions/update_pool_value.rs` を新規作成
  - [ ] Kamino ポジションの現在価値を取得
  - [ ] `total_pool_value` を更新
  - [ ] `last_yield_update` を更新

- [ ] `instructions/mod.rs` にエクスポート追加
- [ ] `lib.rs` にハンドラ追加

### 6.2 SDK変更

- [ ] `client.ts` に `updatePoolValue()` メソッド追加
- [ ] `getActualPoolValue()` メソッド追加（リアルタイム計算）

### 6.3 自動更新（オプション）

- [ ] Tuk Tuk で定期的な pool value 更新をスケジュール

---

## フェーズ7: IDL更新・ビルド

- [ ] `anchor build` で新しい IDL を生成
- [ ] `packages/vault-sdk/src/idl/subly_vault.json` を更新
- [ ] 型定義の整合性を確認

---

## フェーズ8: 品質チェック

### 8.1 Rust プログラム

- [ ] `anchor build` が成功する
- [ ] `cargo clippy` で警告がない
- [ ] `cargo fmt --check` でフォーマットが正しい

### 8.2 TypeScript SDK

- [ ] `pnpm tsc --noEmit` が成功する
- [ ] 型エラーがない

### 8.3 テスト

- [ ] `anchor test` が成功する
- [ ] 全ての資金フローテストがパスする

---

## フェーズ9: ドキュメント更新

- [ ] `docs/architecture.md` の資金フローセクションを更新
- [ ] SDK の JSDoc コメント更新
- [ ] README に資金フローの説明追加

---

## 実装状況サマリー

### 完了済み
（なし - 未着手）

### 未完了
- **フェーズ1**: Shield Pool Token Account の追加
- **フェーズ2**: Kamino CPI モジュールの実装
- **フェーズ3**: register_deposit への統合
- **フェーズ4**: withdraw への統合
- **フェーズ5**: execute_transfer への統合
- **フェーズ6**: total_pool_value 更新メカニズム
- **フェーズ7**: IDL更新・ビルド
- **フェーズ8**: 品質チェック
- **フェーズ9**: ドキュメント更新

---

## 参考リンク

- [Kamino Finance SDK](https://github.com/Kamino-Finance/klend-sdk)
- [Kamino Finance Docs](https://docs.kamino.finance/)
- [Anchor CPI Documentation](https://www.anchor-lang.com/docs/cross-program-invocations)
- [SPL Token Program](https://spl.solana.com/token)

---

## リスクと対策

### リスク1: Kamino API の変更

**対策**: SDK バージョンを固定、テスト環境での検証

### リスク2: トランザクションサイズ超過

**対策**: Lookup Table の使用、トランザクション分割

### リスク3: CPI の compute unit 超過

**対策**: `set_compute_unit_limit` の使用、処理の最適化

### リスク4: Privacy Cash との連携タイミング

**対策**: SDK レベルでの適切なエラーハンドリング、リトライロジック
