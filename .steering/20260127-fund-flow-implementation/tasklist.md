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

- [x] Kamino SDK (`@kamino-finance/klend-sdk`) のAPIドキュメント確認
- [x] Kamino プログラムのアカウント構造を理解
- [x] CPI 呼び出しに必要なアカウント一覧を整理

---

## フェーズ1: Shield Pool Token Account の追加

### 1.1 オンチェーンプログラム変更

- [x] `state/shield_pool.rs` に新フィールド追加
  - [x] `token_account: Pubkey` (Shield Pool の USDC ATA)
  - [x] `kamino_ctoken_account: Pubkey` (Kamino cToken アカウント)
  - [x] `SPACE` 定数を更新

- [x] `instructions/initialize.rs` を更新
  - [x] Shield Pool ATA の作成ロジック追加
  - [x] Kamino cToken アカウントの作成ロジック追加
  - [x] 必要なアカウント（Token Program, Associated Token Program）を追加

- [x] `constants.rs` に追加
  - [x] `USDC_MINT` (Mainnet USDC mint address)
  - [x] `KAMINO_LENDING_PROGRAM_ID`
  - [x] `KAMINO_MAIN_MARKET`
  - [x] `KAMINO_USDC_RESERVE`
  - [x] `KAMINO_CUSDC_MINT`

### 1.2 テスト

- [ ] initialize 命令のテスト更新
- [ ] Token Account が正しく作成されることを確認

---

## フェーズ2: Kamino CPI モジュールの実装

### 2.1 CPI モジュール作成

- [x] `integrations/kamino.rs` を更新
  - [x] Kamino Lending プログラムの instruction discriminator 定義
  - [x] `cpi_deposit_reserve_liquidity()` CPI 関数
  - [x] `cpi_redeem_reserve_collateral()` CPI 関数
  - [x] 必要なアカウント構造体 (`KaminoDepositAccounts`, `KaminoRedeemAccounts`)

- [x] `integrations/mod.rs` にエクスポート確認済み

### 2.2 Kamino アカウント構造の定義

- [x] Kamino CPI用のアカウント構造体を `integrations/kamino.rs` に定義
  - [x] `KaminoDepositAccounts` 構造体
  - [x] `KaminoRedeemAccounts` 構造体

### 2.3 テスト

- [ ] Kamino CPI のユニットテスト
- [ ] Devnet/Mainnet-fork でのテスト

---

## フェーズ3: register_deposit への統合

### 3.1 オンチェーン変更

- [x] `instructions/register_deposit.rs` を更新
  - [x] アカウント構造に追加:
    - [x] `pool_token_account`
    - [x] `pool_ctoken_account`
    - [x] `kamino_lending_market`
    - [x] `kamino_lending_market_authority`
    - [x] `kamino_reserve`
    - [x] `kamino_reserve_liquidity_supply`
    - [x] `kamino_reserve_collateral_mint`
    - [x] `kamino_program`
    - [x] `token_program`
  - [x] 処理ロジック追加:
    - [x] Shield Pool ATA の残高確認
    - [x] Kamino deposit CPI 呼び出し (`deposit_to_kamino` メソッド)

- [x] `lib.rs` の `register_deposit` ハンドラ更新

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

- [x] `instructions/withdraw.rs` を更新
  - [x] アカウント構造に追加:
    - [x] `pool_token_account`
    - [x] `pool_ctoken_account`
    - [x] `kamino_lending_market`
    - [x] `kamino_lending_market_authority`
    - [x] `kamino_reserve`
    - [x] `kamino_reserve_liquidity_supply`
    - [x] `kamino_reserve_collateral_mint`
    - [x] `kamino_program`
    - [x] `token_program`
  - [x] 処理ロジック追加:
    - [x] Kamino redeem CPI 呼び出し (`redeem_from_kamino` メソッド)
    - [x] Shield Pool ATA への USDC 入金

- [x] `lib.rs` の `withdraw` ハンドラ更新

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

- [x] `instructions/execute_transfer.rs` を更新
  - [x] アカウント構造に Kamino 関連アカウント追加
  - [x] Kamino redeem CPI 呼び出し追加 (`redeem_from_kamino` メソッド)

- [x] `lib.rs` の `execute_transfer` ハンドラ更新

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

- [x] `instructions/update_pool_value.rs` を新規作成
  - [x] cToken残高からプール価値を計算
  - [x] `total_pool_value` を更新
  - [x] `last_yield_update` を更新

- [x] `instructions/mod.rs` にエクスポート追加
- [x] `lib.rs` に `update_pool_value` ハンドラ追加

### 6.2 SDK変更

- [ ] `client.ts` に `updatePoolValue()` メソッド追加
- [ ] `getActualPoolValue()` メソッド追加（リアルタイム計算）

### 6.3 自動更新（オプション）

- [ ] Tuk Tuk で定期的な pool value 更新をスケジュール

---

## フェーズ7: IDL更新・ビルド

- [x] `cargo build --release` が成功する
- [ ] `anchor build` で新しい IDL を生成（Cargoバージョンの問題あり）
- [ ] `packages/vault-sdk/src/idl/subly_vault.json` を更新
- [ ] 型定義の整合性を確認

---

## フェーズ8: 品質チェック

### 8.1 Rust プログラム

- [x] `cargo build --release` が成功する
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

### 完了済み (オンチェーンプログラム)
- **フェーズ1**: Shield Pool Token Account の追加 ✅
- **フェーズ2**: Kamino CPI モジュールの実装 ✅
- **フェーズ3**: register_deposit への統合 ✅ (オンチェーン部分)
- **フェーズ4**: withdraw への統合 ✅ (オンチェーン部分)
- **フェーズ5**: execute_transfer への統合 ✅ (オンチェーン部分)
- **フェーズ6**: update_pool_value 命令追加 ✅ (オンチェーン部分)

### 未完了 (SDK・テスト・ドキュメント)
- **フェーズ3-5**: SDK変更とテスト
- **フェーズ7**: IDL更新（Cargoバージョン問題要解決）
- **フェーズ8**: 品質チェック（clippy, fmt, テスト）
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

---

## 変更されたファイル一覧

### オンチェーンプログラム
- `programs/subly-vault/Cargo.toml` - anchor-spl 依存関係追加
- `programs/subly-vault/src/constants.rs` - USDC/Kamino定数追加
- `programs/subly-vault/src/state/shield_pool.rs` - 新フィールド追加
- `programs/subly-vault/src/instructions/initialize.rs` - トークンアカウント作成
- `programs/subly-vault/src/instructions/register_deposit.rs` - Kamino CPI追加
- `programs/subly-vault/src/instructions/withdraw.rs` - Kamino CPI追加
- `programs/subly-vault/src/instructions/execute_transfer.rs` - Kamino CPI追加
- `programs/subly-vault/src/instructions/update_pool_value.rs` - 新規作成
- `programs/subly-vault/src/instructions/mod.rs` - エクスポート追加
- `programs/subly-vault/src/integrations/kamino.rs` - CPI関数実装
- `programs/subly-vault/src/events.rs` - PoolValueUpdatedイベント更新
- `programs/subly-vault/src/lib.rs` - 全ハンドラ更新
