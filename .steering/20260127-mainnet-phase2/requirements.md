# 要求内容

## 概要

subly-vaultのMainnet Phase 2実装。initial-implementationで作成されたプレースホルダーを実際に動作するコードに更新し、Privacy Cash、Tuk Tuk（Clockwork代替）、Kamino Lendingとの統合を完成させる。

## 背景

initial-implementationでは、外部プロトコル連携のインターフェースのみが実装され、実際の統合は行われていない。Mainnetでデモを行うためには、以下の課題を解決する必要がある:

1. **Clockworkの停止**: 2023年10月31日にシャットダウン済み。代替としてTuk Tuk（Helium製）への移行が必要
2. **Privacy Cash統合**: プレースホルダーのプログラムIDとディスクリミネーターを実際の値に更新
3. **Kamino統合**: 実際のSDKを使用してDeFi運用を実装

## 実装対象の機能

### 1. Privacy Cash統合（SDK経由）

- Privacy Cash TypeScript SDK (`privacycash` npm package) を使用したUSDCのプライベート入出金
- `depositSPL()` - USDCをプライベートに入金
- `withdrawSPL()` - USDCをプライベートに出金
- `getPrivateBalanceSpl()` - プライベート残高の取得

### 2. Tuk Tuk統合（Clockwork代替）

- Helium Tuk Tukを使用した定期送金の自動実行
- Cronジョブの作成・管理・削除
- 手動実行フォールバックの実装

### 3. Kamino Lending統合

- Kamino SDK (`@kamino-finance/klend-sdk`) を使用したUSDC運用
- 預け入れ・引き出し機能
- 利回り（APY）情報の取得

### 4. vault-sdk更新

- 外部SDK統合モジュールの追加
- client.tsの統合更新
- Node.js要件を24以上に更新（Privacy Cash SDK要件）

## 受け入れ条件

### Privacy Cash統合
- [ ] `privacycash` npm パッケージを依存関係に追加
- [ ] Privacy Cash統合モジュール（`privacy-cash.ts`）を作成
- [ ] `depositPrivateUSDC(amount)` メソッドが動作する
- [ ] `withdrawPrivateUSDC(amount, recipient)` メソッドが動作する
- [ ] `getPrivateUSDCBalance()` メソッドが動作する
- [ ] RustプログラムのプログラムIDを実際の値に更新

### Tuk Tuk統合
- [ ] `@helium/cron-sdk`, `@helium/tuktuk-sdk` を依存関係に追加
- [ ] `clockwork.rs` を `tuktuk.rs` にリネーム・更新
- [ ] Tuk Tuk統合モジュール（`tuktuk.ts`）を作成
- [ ] `createCronJob()` でCronジョブを作成できる
- [ ] `closeCronJob()` でCronジョブを削除できる
- [ ] 手動実行フォールバック（`executePendingTransfer()`）が動作する

### Kamino Lending統合
- [ ] `@kamino-finance/klend-sdk` を依存関係に追加
- [ ] Kamino統合モジュール（`kamino.ts`）を作成
- [ ] `depositToKamino(amount)` メソッドが動作する
- [ ] `withdrawFromKamino(amount)` メソッドが動作する
- [ ] `getKaminoYieldInfo()` で実際のAPYを取得できる

### ビルド・テスト
- [ ] `anchor build` が成功する
- [ ] `pnpm --filter @subly/vault-sdk build` が成功する
- [ ] 型エラーがない

## 成功指標

- **デモシナリオ完走**: ユーザーがUSDCをプライベートに入金 → Kaminoで運用 → 定期送金実行 → プライベートに出金の一連の流れが動作する
- **プライバシー保護**: Solana Explorerで送金元・金額が秘匿されていることを確認できる

## スコープ外

以下はこのフェーズでは実装しません:

- Devnetテスト（Privacy CashがMainnet専用のため）
- 本番ECIES暗号化の完全実装（プレースホルダーのまま）
- ZKプルーフ検証ロジックの完全実装（SDK内部で処理）
- フロントエンドUI（SDK統合のみ）

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/architecture.md` - アーキテクチャ設計書
- `.steering/20260126-initial-implementation/tasklist.md` - 前回の実装タスクリスト
- [Privacy Cash SDK Docs](https://privacycash.mintlify.app/sdk/overview)
- [Tuk Tuk GitHub](https://github.com/helium/tuktuk)
- [Kamino SDK](https://github.com/Kamino-Finance/klend-sdk)
