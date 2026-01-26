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

## フェーズ1: プロジェクト基盤セットアップ

- [x] 依存関係のインストール
  - [x] Solana Wallet Adapter関連パッケージ
  - [x] shadcn/ui必須パッケージ（clsx, tailwind-merge, class-variance-authority）
  - [x] UIユーティリティ（lucide-react, sonner）
  - [x] 状態管理（zustand）
  - [x] バリデーション（zod）

- [x] TailwindCSS設定の確認・調整
  - [x] tailwind.config.ts（テーマ拡張、カラーパレット）

- [x] shadcn/uiコンポーネントのセットアップ
  - [x] components.jsonの作成
  - [x] cn()ユーティリティ関数の作成（lib/utils.ts）
  - [x] 基本UIコンポーネントの追加（button, card, dialog, input, tabs）

- [x] プロジェクト構造の作成
  - [x] ディレクトリ作成（components/, hooks/, providers/, lib/, types/）
  - [x] 型定義ファイルの作成（types/vault.ts, types/subscription.ts, types/history.ts）

## フェーズ2: 基盤実装

- [x] ユーティリティ・設定の実装
  - [x] lib/solana.ts（Solana接続設定）
  - [x] lib/mock-data.ts（モックデータ定義）
  - [x] lib/errors.ts（カスタムエラークラス）

- [x] Providersの実装
  - [x] providers/WalletProvider.tsx
  - [x] providers/MockDataProvider.tsx
  - [x] app/layout.tsxでProvidersを適用

- [x] 共通レイアウトの実装
  - [x] components/layout/Header.tsx
  - [x] components/layout/Navigation.tsx（タブナビゲーション）
  - [x] components/wallet/WalletButton.tsx
  - [x] app/layout.tsxにレイアウト適用

## フェーズ3: Vault画面実装

- [x] Vaultコンポーネントの実装
  - [x] components/vault/BalanceCard.tsx
  - [x] components/vault/YieldDisplay.tsx
  - [x] components/vault/DepositForm.tsx
  - [x] components/vault/WithdrawForm.tsx
  - [x] components/vault/ScheduledTransferList.tsx

- [x] Vaultページの実装
  - [x] app/vault/page.tsx（概要）
  - [x] app/vault/deposit/page.tsx（入金）
  - [x] app/vault/withdraw/page.tsx（出金）

- [x] Vault用フックの実装
  - [x] hooks/useVault.ts

## フェーズ4: Subscriptions画面実装

- [x] Subscriptionsコンポーネントの実装
  - [x] components/subscriptions/SubscriptionCard.tsx
  - [x] components/subscriptions/SubscriptionList.tsx
  - [x] components/subscriptions/PlanCard.tsx
  - [x] components/subscriptions/PlanBrowser.tsx
  - [x] components/subscriptions/SubscribeDialog.tsx
  - [x] components/subscriptions/UnsubscribeDialog.tsx

- [x] Subscriptionsページの実装
  - [x] app/subscriptions/page.tsx（一覧）
  - [x] app/subscriptions/browse/page.tsx（プラン検索）
  - [x] app/subscriptions/[id]/page.tsx（詳細）

- [x] Subscriptions用フックの実装
  - [x] hooks/useSubscriptions.ts

## フェーズ5: History画面実装

- [x] Historyコンポーネントの実装
  - [x] components/history/TransactionCard.tsx
  - [x] components/history/TransactionList.tsx

- [x] Historyページの実装
  - [x] app/history/page.tsx

- [x] History用フックの実装
  - [x] hooks/useHistory.ts

## フェーズ6: 仕上げ

- [x] ホームページのリダイレクト設定
  - [x] app/page.tsx（/vaultへリダイレクト）

- [x] グローバルスタイルの調整
  - [x] app/globals.cssの整理

## フェーズ7: 品質チェックと修正

- [x] リントエラーがないことを確認
  - [x] `npm run lint`

- [x] ビルドが成功することを確認
  - [x] `npm run build`

- [x] 動作確認
  - [x] `npm run dev`で起動確認
  - [x] 全ページの表示確認
  - [x] ナビゲーションの動作確認

---

## 実装後の振り返り

### 実装完了日

2026-01-26

### 計画と実績の差分

**計画と異なった点**:

- shadcn/uiのコンポーネントはnpx shadcn@latestでのインストールではなく、手動実装を採用した。理由: TailwindCSS 4の`@theme inline`構文との互換性確保のため
- MockDataProviderに`isLoading`と`availablePlans`プロパティを追加。理由: History画面とSubscriptions画面でのローディング状態管理に必要だったため

**新たに必要になったタスク**:

- リントエラーの修正（4箇所）: TypeScript/ESLintの厳格なチェックにより、空のinterface、未使用変数などの修正が必要だった
- MockDataProviderの型定義拡張: コンポーネントで使用する`isLoading`と`availablePlans`がインターフェースに不足していた

**技術的理由でスキップしたタスク**:

- なし（全タスク完了）

### 学んだこと

**技術的な学び**:

- TailwindCSS 4の`@theme inline`構文を使用したテーマ定義の実装方法
- Next.js 16 (App Router)でのクライアントコンポーネント設計パターン
- Solana Wallet Adapterの統合方法（React 19との互換性警告があるがnpm warningsのみで実行に支障なし）
- MockDataProviderパターンによるSDK未実装時のUI開発手法

**プロセス上の改善点**:

- tasklist.mdでのリアルタイム進捗管理が効果的だった
- 各フェーズごとにコンポーネント、ページ、フックを順番に実装することで依存関係を明確に保てた
- ビルド・リントチェックを最終フェーズにまとめることで、まとめて修正できた

### 次回への改善提案

- SDK統合時は、MockDataProviderの各メソッドを実際のSDK呼び出しに置き換えるだけで済む設計になっている
- 型定義（types/*.ts）を先に確定させておいたことで、モックデータとSDK呼び出しの両方で同じ型を使用できる
- コンポーネントのProps設計時に、将来のローディング・エラー状態を考慮しておくとよい
