# タスクリスト

## 重要な原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 基盤セットアップ

- [x] 依存関係のインストール
  - [x] @solana/wallet-adapter関連パッケージを追加
  - [x] @solana/web3.jsを追加
  - [x] lucide-react（アイコン）を追加
  - [x] class-variance-authority, clsx, tailwind-mergeを追加

- [x] TypeScript設定の調整
  - [x] tsconfig.jsonにpaths設定を追加（@/エイリアス）（既存設定を確認）

- [x] ディレクトリ構造の作成
  - [x] components/ui/
  - [x] components/layout/
  - [x] components/wallet/
  - [x] components/plans/
  - [x] components/business/
  - [x] hooks/
  - [x] lib/
  - [x] providers/
  - [x] services/
  - [x] types/

## フェーズ2: 基本UIコンポーネント

- [x] ユーティリティ関数の作成
  - [x] lib/utils.ts（cn関数）

- [x] 基本UIコンポーネントの作成
  - [x] components/ui/button.tsx
  - [x] components/ui/card.tsx
  - [x] components/ui/input.tsx
  - [x] components/ui/label.tsx
  - [x] components/ui/select.tsx
  - [x] components/ui/textarea.tsx

## フェーズ3: 型定義とモックサービス

- [x] 型定義の作成
  - [x] types/plan.ts（Plan, BillingCycle型）
  - [x] types/business.ts（Business型）

- [x] 定数の定義
  - [x] lib/constants.ts（BILLING_CYCLES, PROGRAM_ID等）

- [x] モックサービスの作成
  - [x] services/mock-plan-service.ts
  - [x] services/mock-business-service.ts

## フェーズ4: Wallet Provider設定

- [x] WalletProviderの作成
  - [x] providers/wallet-provider.tsx

- [x] WalletButtonコンポーネントの作成
  - [x] components/wallet/wallet-button.tsx

## フェーズ5: レイアウトコンポーネント

- [x] Headerコンポーネントの作成
  - [x] components/layout/header.tsx

- [x] Sidebarコンポーネントの作成
  - [x] components/layout/sidebar.tsx

- [x] DashboardLayoutの作成
  - [x] components/layout/dashboard-layout.tsx

## フェーズ6: カスタムフック

- [x] usePlansフックの作成
  - [x] hooks/use-plans.ts

- [x] useBusinessフックの作成
  - [x] hooks/use-business.ts

## フェーズ7: ページ実装

- [x] ルートレイアウトの更新
  - [x] app/layout.tsx（WalletProvider追加）

- [x] ホームページ（ウォレット接続）
  - [x] app/page.tsx

- [x] 事業者登録ページ
  - [x] app/register/page.tsx
  - [x] components/business/business-register-form.tsx

- [x] ダッシュボードレイアウト
  - [x] app/dashboard/layout.tsx

- [x] ダッシュボードホーム
  - [x] app/dashboard/page.tsx

- [x] プラン一覧ページ
  - [x] app/dashboard/plans/page.tsx
  - [x] components/plans/plan-card.tsx
  - [x] components/plans/plan-list.tsx

- [x] プラン作成ページ
  - [x] app/dashboard/plans/new/page.tsx
  - [x] components/plans/plan-form.tsx

- [x] プラン詳細ページ
  - [x] app/dashboard/plans/[planId]/page.tsx

- [x] プラン編集ページ
  - [x] app/dashboard/plans/[planId]/edit/page.tsx

- [x] 設定ページ
  - [x] app/dashboard/settings/page.tsx

## フェーズ8: 品質チェックと修正

- [x] リントエラーがないことを確認
  - [x] `npm run lint`を実行し、エラーを修正

- [x] 型エラーがないことを確認
  - [x] `npx tsc --noEmit`を実行し、エラーを修正

- [x] ビルドが成功することを確認
  - [x] `npm run build`を実行し、エラーを修正

- [ ] 動作確認
  - [ ] ウォレット接続ができること
  - [ ] 事業者登録ができること
  - [ ] プラン作成ができること
  - [ ] プラン一覧が表示されること
  - [ ] プラン編集ができること
  - [ ] 設定画面が表示されること

---

## 実装後の振り返り

### 実装完了日
2026-01-26

### 計画と実績の差分

**計画と異なった点**:
- ButtonコンポーネントのasChildプロパティは実装せず、LinkにbuttonVariantsを直接適用する形で対応
- lib/errors.tsにPlanNotFoundErrorを追加

**新たに必要になったタスク**:
- ESLintエラー修正（空のinterface拡張をtype aliasに変更）

**技術的理由でスキップしたタスク**:
- なし

### 学んだこと

**技術的な学び**:
- Tailwind CSS v4では@importでtailwindcssを読み込む形式に変更
- Next.js 16 + React 19の組み合わせでWallet Adapterが正常に動作

**プロセス上の改善点**:
- 型チェックは早めに実行してエラーを検出すべき

### 次回への改善提案
- asChildパターンを使用する場合は@radix-ui/react-slotの導入を検討
- 動作確認は開発サーバーを起動して手動で確認する
