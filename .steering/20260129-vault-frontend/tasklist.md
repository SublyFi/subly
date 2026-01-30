# タスクリスト: Vault Frontend Dashboard

## 重要: タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ0: Privacy Cash SDK修正

### 0.1 API修正

- [x] `privacy-cash.ts` の `getPrivateUSDCBalance()` 修正
  - [x] `getPrivateBalanceSpl({ mintAddress })` → `getPrivateBalanceUSDC()` に変更
  - [x] フォールバックとして `getPrivateBalanceSpl(USDC_MINT)` を使用（引数直接渡し）

- [x] `privacy-cash.ts` の `withdrawPrivateUSDC()` 修正
  - [x] 戻り値マッピング修正: `amount_in_lamports` → `base_units`
  - [x] 戻り値マッピング修正: `fee_in_lamports` → `fee_base_units`

- [x] `privacy-cash.ts` の `depositPrivateUSDC()` 修正
  - [x] `depositUSDC({ base_units })` を優先使用
  - [x] 引数を human-readable から base_units に変換（× 1e6）

- [x] `WithdrawResult` インターフェース更新
  - [x] フィールド名を実際のSDK仕様に合わせる

### 0.2 型安全性向上

- [x] SDK実際の戻り値型を定義
- [x] コメントにSDKバージョン・API仕様を明記

---

## フェーズ1: プロジェクト基盤構築

### 1.1 プロジェクト作成

- [x] `apps/dashboard-vault/` ディレクトリ作成
- [x] `package.json` 作成
  - [x] 依存関係: next, react, @solana/wallet-adapter-react, bs58, tailwindcss
- [x] `next.config.ts` 作成
- [x] `tsconfig.json` 作成
- [x] `postcss.config.mjs` 作成（Tailwind v4）
- [x] `pnpm install` で依存関係インストール

### 1.2 基本レイアウト

- [x] `app/layout.tsx` 作成（RootLayout）
- [x] `app/globals.css` 作成
- [x] `components/Header.tsx` 作成
  - [x] ナビゲーション（Dashboard, Deposit, Withdraw, Transfers）
  - [x] ウォレット接続ボタン

### 1.3 Providers

- [x] `providers/WalletProvider.tsx` 作成
  - [x] Solana Wallet Adapter設定
  - [x] Mainnet RPC設定
- [x] `providers/VaultProvider.tsx` 作成
  - [x] モッククライアント実装（開発用）
  - [x] Privacy Cash秘密鍵入力モーダル
  - [x] 初期化状態管理
- [x] `providers/index.tsx` 作成（Provider統合）

### 1.4 共通ユーティリティ

- [x] `lib/solana.ts` 作成（RPC設定、定数）
- [x] `lib/constants.ts` 作成（UIで使用する定数）

---

## フェーズ2: ダッシュボード（残高・運用状況）

### 2.1 Hooks

- [x] `hooks/useVault.ts` 作成
  - [x] VaultProviderからclient取得
  - [x] 初期化状態チェック
- [x] `hooks/useBalance.ts` 作成
  - [x] `client.getBalance()` 呼び出し
  - [x] 自動リフレッシュ（30秒）
  - [x] ローディング・エラー状態管理
- [x] `hooks/useYield.ts` 作成
  - [x] `client.getYieldInfo()` 呼び出し
  - [x] `client.getShieldPool()` でプール情報取得

### 2.2 コンポーネント

- [x] `components/balance/BalanceCard.tsx` 作成
  - [x] シェア数表示
  - [x] USDC換算額表示
  - [x] Deposit/Withdrawボタン
- [x] `components/balance/YieldCard.tsx` 作成
  - [x] APY表示
  - [x] 獲得運用益表示
  - [x] プール全体情報表示

### 2.3 ページ

- [x] `app/page.tsx` 作成（ダッシュボード）
  - [x] ウォレット未接続時の表示
  - [x] SDK未初期化時のモーダル表示
  - [x] BalanceCard, YieldCard配置
  - [x] アクティブな定期送金サマリー表示

---

## フェーズ3: 入金機能

### 3.1 コンポーネント

- [x] `components/deposit/DepositForm.tsx` 作成
  - [x] 金額入力フィールド
  - [x] プリセットボタン（25%, 50%, 75%, Max）
  - [x] Privacy Notice表示
  - [x] 入金ボタン
  - [x] ローディング状態
  - [x] エラー表示

### 3.2 ページ

- [x] `app/deposit/page.tsx` 作成
  - [x] 現在残高表示
  - [x] DepositForm配置
  - [x] 成功時のトランザクション表示
  - [x] ダッシュボードへの戻りリンク

---

## フェーズ4: 出金機能

### 4.1 コンポーネント

- [x] `components/withdraw/WithdrawForm.tsx` 作成
  - [x] 金額入力フィールド
  - [x] 出金先アドレス入力（デフォルト: 自分）
  - [x] 出金可能額表示
  - [x] 手数料見積もり表示
  - [x] 出金ボタン
  - [x] ローディング状態
  - [x] エラー表示

### 4.2 ページ

- [x] `app/withdraw/page.tsx` 作成
  - [x] 現在残高表示
  - [x] WithdrawForm配置
  - [x] 成功時のトランザクション表示

---

## フェーズ5: 定期送金機能

### 5.1 Hooks

- [x] `hooks/useTransfers.ts` 作成
  - [x] `client.getAllLocalTransfers()` 呼び出し
  - [x] setupTransfer, cancelTransfer, executeTransfer関数

### 5.2 コンポーネント

- [x] `components/transfers/TransferCard.tsx` 作成
  - [x] 送金先（短縮表示）
  - [x] 金額・間隔表示
  - [x] 次回実行日表示
  - [x] 手動実行ボタン
  - [x] キャンセルボタン
- [x] `components/transfers/TransferForm.tsx` 作成
  - [x] 送金先アドレス入力
  - [x] 金額入力
  - [x] 間隔選択（Hourly, Daily, Weekly, Monthly）
  - [x] メモ入力（オプション）
  - [x] 作成ボタン

### 5.3 ページ

- [x] `app/transfers/page.tsx` 作成（定期送金一覧）
  - [x] TransferCard一覧表示
  - [x] 新規作成ボタン
  - [x] 空状態の表示
- [x] `app/transfers/new/page.tsx` 作成（定期送金設定）
  - [x] TransferForm配置
  - [x] 成功時の一覧へのリダイレクト

---

## フェーズ6: 統合・品質チェック

### 6.1 ビルド確認

- [x] `pnpm --filter @subly/dashboard-vault build` 成功
- [x] 型エラーなし（TypeScriptコンパイル成功）

### 6.2 動作確認（UIのみ - モックデータ使用）

- [x] ウォレット接続フロー
- [x] Privacy Cash初期化モーダル
- [x] ダッシュボード表示
- [x] 入金フロー（UIのみ）
- [x] 出金フロー（UIのみ）
- [x] 定期送金設定フロー

### 6.3 pnpm-workspace更新

- [x] `pnpm-workspace.yaml` に `subly-mainnet/packages/*` 追加

---

## 実装順序サマリー

1. **フェーズ0**: Privacy Cash SDK修正（先に修正しておく）
2. **フェーズ1**: プロジェクト基盤（プロジェクト作成、Provider、レイアウト）
3. **フェーズ2**: ダッシュボード（残高・運用状況表示）
4. **フェーズ3**: 入金機能
5. **フェーズ4**: 出金機能
6. **フェーズ5**: 定期送金機能
7. **フェーズ6**: 統合・品質チェック

---

## 実装上の注意事項

### vault-sdk のブラウザ互換性について

`@subly/vault-sdk` は以下の理由でブラウザ環境では直接使用できません:

1. **Node.js 専用モジュールの使用**:
   - `fs`, `path` などのNode.jsモジュールを使用
   - `@kamino-finance/klend-sdk` がNode.js専用のWASMモジュールを使用

2. **対応方針**:
   - フロントエンドは**モッククライアント**を使用（開発・UI確認用）
   - 本番環境では**バックエンドAPI経由**で vault-sdk を呼び出す構成を推奨
   - バックエンドは Node.js 24+ で動作し、vault-sdk を直接使用可能

3. **モック実装の場所**:
   - `providers/VaultProvider.tsx` 内の `createMockClient()` 関数

---

## 参考資料

- [Privacy Cash SDK API](../../subly-mainnet/packages/vault-sdk/node_modules/privacycash/dist/index.d.ts)
- [vault-sdk client.ts](../../subly-mainnet/packages/vault-sdk/src/client.ts)
- [dashboard-user実装](../../apps/dashboard-user)
- [design.md](./design.md)
