# タスクリスト

## 🚨 タスク完全完了の原則

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

## フェーズ1: 基盤整備

- [x] PDA ユーティリティの拡張
  - [x] `src/lib/pda.ts` に `getMerchantPDA()` を追加（既存実装済み）
  - [x] `src/lib/pda.ts` に `getMerchantLedgerPDA()` を追加（既存実装済み）
  - [x] PDA シード定数がオンチェーンプログラムと一致していることを確認（確認済み）

- [x] Merchant 関連の型定義追加
  - [x] `src/types/merchant.ts` を作成
  - [x] `Merchant` 型を定義
  - [x] `MerchantLedger` 型を定義
  - [x] `SubscriptionPlan` 型を定義（既存の場合は確認）
  - [x] `CreatePlanData`, `UpdatePlanData` 型を定義
  - [x] `src/types/index.ts` からエクスポート

- [x] カスタムエラークラスの作成
  - [x] `src/lib/errors.ts` を作成（または既存に追加）
  - [x] `MerchantNotRegisteredError` を定義
  - [x] `InsufficientRevenueError` を定義
  - [x] `PlanNotFoundError` を定義
  - [x] `MPCComputationError` を定義
  - [x] `MPCTimeoutError` を定義

- [x] Merchant トランザクション構築ヘルパー
  - [x] `src/lib/merchant.ts` を作成
  - [x] `executeRegisterMerchant()` を実装
  - [x] `executeCreatePlan()` を実装
  - [x] `executeUpdatePlan()` を実装
  - [x] `executeClaimRevenue()` を実装

## フェーズ2: 事業者登録機能

- [x] `useMerchant` フック実装
  - [x] `src/hooks/useMerchant.ts` を作成
  - [x] Merchant PDA 存在確認ロジック実装
  - [x] Merchant アカウント取得ロジック実装
  - [x] `register()` 関数実装（`executeRegisterMerchant` を呼び出し）
  - [x] ローディング・エラー状態管理

- [x] MerchantRegistrationForm コンポーネント実装
  - [x] `src/components/merchant/MerchantRegistrationForm.tsx` を作成
  - [x] 事業者名入力フォーム UI
  - [x] バリデーション（1-64文字）
  - [x] トランザクション送信ロジック
  - [x] 状態表示（loading/success/error）

- [x] `/merchant/register` ページ実装
  - [x] `src/app/merchant/register/page.tsx` を作成
  - [x] MerchantRegistrationForm の配置
  - [x] 既登録時のリダイレクト処理

- [x] `/merchant` ページの登録判定・リダイレクト
  - [x] `src/app/merchant/page.tsx` を作成
  - [x] `useMerchant` で登録状態確認
  - [x] 未登録時は `/merchant/register` へリダイレクト
  - [x] 登録済み時はダッシュボード表示（統計カードは後フェーズ）

## フェーズ3: プラン管理機能

- [x] `usePlans` フック実装
  - [x] `src/hooks/usePlans.ts` を作成
  - [x] `getProgramAccounts` でプラン一覧取得
  - [x] merchant でフィルタリング
  - [x] `createPlan()` 関数実装
  - [x] `updatePlan()` 関数実装
  - [x] `togglePlan()` 関数実装（is_active 切り替え）
  - [x] ローディング・エラー状態管理

- [x] PlanCard コンポーネント実装
  - [x] `src/components/merchant/PlanCard.tsx` を作成
  - [x] プラン名、価格、請求サイクル表示
  - [x] Active/Inactive バッジ
  - [x] Edit ボタン
  - [x] Toggle ボタン（有効/無効切り替え）

- [x] PlanForm コンポーネント実装
  - [x] `src/components/merchant/PlanForm.tsx` を作成
  - [x] プラン名入力
  - [x] 価格入力（SOL）
  - [x] 請求サイクル選択（7日/14日/30日/カスタム）
  - [x] バリデーション
  - [x] 作成/編集モード対応

- [x] PlanList コンポーネント実装
  - [x] `src/components/merchant/PlanList.tsx` を作成
  - [x] プラン一覧表示
  - [x] 空状態の表示
  - [x] 作成ボタン

- [x] `/merchant/plans` ページ実装
  - [x] `src/app/merchant/plans/page.tsx` を作成
  - [x] PlanList の配置
  - [x] 作成ボタンから `/merchant/plans/create` へのリンク

- [x] `/merchant/plans/create` ページ実装
  - [x] `src/app/merchant/plans/create/page.tsx` を作成
  - [x] PlanForm（作成モード）の配置
  - [x] 作成成功後のリダイレクト

- [x] `/merchant/plans/[planId]/edit` ページ実装
  - [x] `src/app/merchant/plans/[planId]/edit/page.tsx` を作成
  - [x] プラン情報の取得
  - [x] PlanForm（編集モード）の配置
  - [x] 更新成功後のリダイレクト

## フェーズ4: 収益ダッシュボード

- [x] `useRevenue` フック実装
  - [x] `src/hooks/useRevenue.ts` を作成
  - [x] MerchantLedger アカウント取得
  - [x] 暗号化残高の復号ロジック（Arcium SDK）
  - [x] 復号状態管理（isDecrypting）
  - [x] `decrypt()` 関数実装
  - [x] `refresh()` 関数実装

- [x] `useActiveSubscribers` フック実装
  - [x] `src/hooks/useActiveSubscribers.ts` を作成
  - [x] 事業者のプランに紐づく UserSubscription をカウント
  - [x] `getProgramAccounts` でフィルタリング
  - [x] ローディング・エラー状態管理

- [x] RevenueCard コンポーネント実装
  - [x] `src/components/merchant/RevenueCard.tsx` を作成
  - [x] タイトル、金額表示
  - [x] 暗号化状態（マスク表示）
  - [x] 復号ボタン（encrypted=true の場合）
  - [x] ローディング状態

- [x] MerchantStats コンポーネント実装
  - [x] `src/components/merchant/MerchantStats.tsx` を作成
  - [x] 3カラムの統計カードレイアウト
  - [x] 累計収益（RevenueCard）
  - [x] アクティブサブスクライバー数
  - [x] 今月の収益（RevenueCard）

- [x] ActiveSubsCount コンポーネント実装
  - [x] `src/components/merchant/ActiveSubsCount.tsx` を作成
  - [x] サブスクライバー数表示
  - [x] ローディング状態

- [x] `/merchant` ページに統計表示を追加
  - [x] MerchantStats コンポーネントを配置
  - [x] クイックアクションリンク追加（Create Plan, Claim, SDK Guide）

## フェーズ5: Claim 機能

- [x] `useClaim` フック実装
  - [x] `src/hooks/useClaim.ts` を作成
  - [x] `executeClaimRevenue` を呼び出す `claim()` 関数実装
  - [x] 状態管理（idle/encrypting/sending/waiting_mpc/success/error）
  - [x] Arcium MPC コールバック待機ロジック
  - [x] エラーハンドリング

- [x] ClaimForm コンポーネント実装
  - [x] `src/components/merchant/ClaimForm.tsx` を作成
  - [x] 引き出し可能金額表示
  - [x] 金額入力フォーム
  - [x] Max ボタン
  - [x] バリデーション（0 < amount <= available）
  - [x] Claim ボタン
  - [x] トランザクション状態表示

- [x] `/merchant/revenue` ページ実装
  - [x] `src/app/merchant/revenue/page.tsx` を作成
  - [x] 収益サマリー表示
  - [x] ClaimForm の配置
  - [x] ~~トランザクション履歴~~（実装方針変更により不要: 現状のオンチェーンプログラムにトランザクション履歴保存機能がないため、将来のフェーズで実装）

## フェーズ6: SDK セットアップガイド

- [x] SDKCodeBlock コンポーネント実装
  - [x] `src/components/merchant/SDKCodeBlock.tsx` を作成
  - [x] コードブロック表示
  - [x] シンタックスハイライト（Tailwind の `prose` クラスまたはシンプルなスタイル）
  - [x] コピーボタン

- [x] `/merchant/sdk-guide` ページ実装
  - [x] `src/app/merchant/sdk-guide/page.tsx` を作成
  - [x] SDK インストールコマンド表示
  - [x] 初期化コードサンプル表示
  - [x] checkSubscription 使用例
  - [x] Merchant Wallet アドレス表示（コピー可能）
  - [x] Program ID 表示

## フェーズ7: レイアウト・ナビゲーション

- [x] MerchantSidebar コンポーネント実装
  - [x] `src/components/layout/MerchantSidebar.tsx` を作成
  - [x] ナビゲーションリンク（Home, Plans, Revenue, SDK Guide）
  - [x] 現在ページのハイライト
  - [x] Merchant 名表示

- [x] `/merchant/layout.tsx` 実装
  - [x] `src/app/merchant/layout.tsx` を作成
  - [x] MerchantSidebar の配置
  - [x] ヘッダー（ウォレットボタン含む）
  - [x] メインコンテンツエリア

- [x] ナビゲーション統合
  - [x] 各ページから MerchantSidebar が表示されることを確認
  - [x] ページ間遷移のテスト

## フェーズ8: 品質チェックと修正

- [x] TypeScript 型チェック
  - [x] `npm run typecheck` を実行
  - [x] 型エラーがあれば修正

- [x] ESLint チェック
  - [x] `npm run lint` を実行
  - [x] リントエラーがあれば修正

- [x] ビルド確認
  - [x] `npm run build` を実行
  - [x] ビルドエラーがあれば修正

- [x] 動作確認（Devnet）
  - [x] ウォレット接続が動作すること
  - [x] 事業者登録が実際にオンチェーンで実行されること
  - [x] プラン作成が実際にオンチェーンで実行されること
  - [x] プラン一覧がオンチェーンから取得されること
  - [x] プラン編集・Toggle が実際にオンチェーンで実行されること
  - [x] 収益が MerchantLedger から取得・復号されること
  - [x] Claim が実際にオンチェーンで実行されること
  - [x] SDK ガイドページが正しく表示されること

## フェーズ9: ドキュメント更新

- [x] README.md を更新（必要に応じて）
  - [x] Merchant Dashboard へのアクセス方法を追記
  - [x] 新しい環境変数があれば追記

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-02-01

### 計画と実績の差分

**計画と異なった点**:
- トランザクション履歴の表示は、オンチェーンプログラムに履歴保存機能がないため、将来のフェーズで実装することとした

**新たに必要になったタスク**:
- TransactionStatus コンポーネントに `onReset` prop を追加（リセットボタン用）
- 未使用の import 文の削除（ESLint対応）

**技術的理由でスキップしたタスク**（該当する場合のみ）:
- トランザクション履歴表示: 現状のオンチェーンプログラムにトランザクション履歴保存機能がないため、将来のフェーズで実装

### 学んだこと

**技術的な学び**:
- Next.js App Router の layout.tsx を使って、特定のルートにサイドバー付きレイアウトを適用できる
- Arcium MPC を使った暗号化残高の取得・復号パターン
- Anchor プログラムとの連携で PDA を使ったアカウント取得のパターン

**プロセス上の改善点**:
- フェーズ分けによるタスク管理が効果的だった
- コンポーネントを小さく分割することで、再利用性と保守性が向上した

### 次回への改善提案
- オンチェーンプログラムにトランザクション履歴保存機能を追加することで、ダッシュボードで履歴表示が可能になる
- E2Eテストの追加を検討する
