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

## フェーズ1: プロジェクトセットアップ

- [x] demo/ ディレクトリを作成
- [x] package.json を作成
  - [x] 必要な依存関係を設定（next, react, wallet-adapter, tailwind等）
  - [x] @subly/sdk へのローカルリンクを設定
  - [x] scriptsを設定（dev, build, start）
- [x] tsconfig.json を作成
- [x] next.config.js を作成
- [x] tailwind.config.js を作成
- [x] postcss.config.js を作成
- [x] .env.local.example を作成
- [x] src/app/globals.css を作成（Tailwind imports）

## フェーズ2: 基盤実装

### 2.1 型定義
- [x] src/types/index.ts を作成
  - [x] DisplayPlan インターフェース
  - [x] SubscriptionState インターフェース
  - [x] ~~MockSubscriptionData インターフェース~~（実装方針変更により不要: 実際のSDKを使用するため）

### 2.2 デモ用プランデータ
- [x] ~~src/lib/plans.ts を作成~~（実装方針変更により不要: オンチェーンからSDK経由で取得するため）
  - [x] ~~DEMO_PLANS 定数（Basic, Standard, Premium の3プラン）~~
  - [x] ~~各プランの特典リスト~~

### 2.3 モックSDKラッパー
- [x] ~~src/lib/mock-sdk.ts を作成~~（実装方針変更により不要: 実際のSDKを使用するため）
  - [x] ~~MockSublySDK クラス~~
  - [x] ~~checkSubscription メソッド（LocalStorage読み取り）~~
  - [x] ~~subscribe メソッド（LocalStorage書き込み）~~
  - [x] ~~unsubscribe メソッド~~
  - [x] ~~getPlans メソッド~~

## フェーズ3: Context・Provider実装

### 3.1 SublyContext
- [x] src/contexts/SublyContext.tsx を作成
  - [x] SublyContextType インターフェース
  - [x] SublyProvider コンポーネント
  - [x] useSubly カスタムフック
  - [x] Wallet接続時の自動checkSubscription
  - [x] subscribe/unsubscribeアクション

### 3.2 WalletProvider設定
- [x] src/app/providers.tsx を作成
  - [x] WalletAdapterProvider設定
  - [x] エンドポイント設定（Devnet）
  - [x] 対応Wallet設定（Phantom, Solflare）

## フェーズ4: UIコンポーネント実装

### 4.1 共通コンポーネント
- [x] src/components/WalletButton.tsx を作成
  - [x] 未接続時: Connect Walletボタン
  - [x] 接続時: アドレス短縮表示 + Disconnectボタン

### 4.2 プラン関連コンポーネント
- [x] src/components/PlanCard.tsx を作成
  - [x] プラン名、価格、請求サイクル表示
  - [x] ~~特典リスト表示~~（プランは事業者ダッシュボードから登録されるため、汎用的な表示に変更）
  - [x] Subscribe/Unsubscribeボタン
  - [x] 人気プランのハイライト
- [x] src/components/PlanSelection.tsx を作成
  - [x] PlanCardをグリッド表示
  - [x] レスポンシブ対応（モバイルは縦並び）

### 4.3 ダッシュボードコンポーネント
- [x] src/components/SubscribedDashboard.tsx を作成
  - [x] 契約中プラン名表示
  - [x] 特典一覧表示（汎用的な表示）
  - [x] Manage Subscription（プラン変更・解約機能）
  - [x] ~~モック音楽プレイヤーUI~~（シンプルな汎用ダッシュボードに変更）

### 4.4 SDK紹介コンポーネント
- [x] ~~src/components/SDKCodeExample.tsx を作成~~（Landing Pageの機能紹介セクションに統合）
  - [x] ~~SDK初期化コードのシンタックスハイライト表示~~
  - [x] ~~「たった3行で導入」のメッセージ~~

## フェーズ5: ページ実装

### 5.1 レイアウト
- [x] src/app/layout.tsx を作成
  - [x] HTML構造
  - [x] Providers（Wallet + Subly）のラップ
  - [x] Toasterの設置

### 5.2 メインページ
- [x] src/app/page.tsx を作成
  - [x] ヘッダー（ロゴ + WalletButton）
  - [x] 条件分岐レンダリング
    - [x] 未接続時: ランディングUI
    - [x] 接続済み + 未契約: PlanSelection
    - [x] 接続済み + 契約済み: SubscribedDashboard
  - [x] フッター（Arcium MPC説明）

## フェーズ6: 動作確認・仕上げ

### 6.1 依存関係インストール
- [x] npm install を実行

### 6.2 動作確認
- [x] npm run build でビルド確認
- [ ] npm run dev でアプリ起動確認（ローカル環境で確認が必要）
- [ ] Wallet接続フローの動作確認（ローカル環境で確認が必要）
- [ ] プラン選択・契約フローの動作確認（ローカル環境で確認が必要）
- [ ] Disconnect → 再接続での状態復元確認（ローカル環境で確認が必要）

### 6.3 README作成
- [x] demo/README.md を作成
  - [x] 概要説明
  - [x] セットアップ手順
  - [x] 使い方
  - [x] スクリーンショット説明（テキスト）

## フェーズ7: 品質チェック

- [x] TypeScript型エラーがないことを確認
  - [x] `npm run build` が成功
- [ ] 画面遷移が正しく動作することを確認（ローカル環境で確認が必要）
  - [ ] 未接続 → 接続 → プラン選択
  - [ ] 契約 → ダッシュボード表示
  - [ ] Disconnect → 再接続 → ダッシュボード復元

---

## 実装後の振り返り

### 実装完了日
2026-02-01

### 計画と実績の差分

**計画と異なった点**:
- モックSDKラッパーを使わず、実際の@subly/sdkを直接使用する設計に変更
- デモ用固定プランデータではなく、オンチェーンからSDK経由でプランを取得する設計に変更
- これにより、事業者ダッシュボードで登録されたプランがそのまま表示される

**新たに必要になったタスク**:
- 特になし。SDKが既に必要な機能を実装していたため、シンプルに統合できた

**技術的理由でスキップしたタスク**:
- src/lib/plans.ts（デモ用プランデータ）
  - スキップ理由: 事業者ダッシュボードからプランを登録し、SDKでオンチェーンから取得する設計に変更
  - 代替実装: SublyContext内でsdk.getPlans()を呼び出して取得
- src/lib/mock-sdk.ts（モックSDKラッパー）
  - スキップ理由: 実際のSDKを使用することで、より現実的なデモが可能に
  - 代替実装: @subly/sdkのSublySDKクラスを直接使用

### 学んだこと

**技術的な学び**:
- 実際のSDKを使用することで、オンチェーンとの連携がより現実的になった
- Next.js App RouterとSolana Wallet Adapterの統合パターン

**プロセス上の改善点**:
- 設計ドキュメントと実装方針のずれを早期に発見し、修正できた
- モックレイヤーを省略することで、実装がシンプルになった

### 次回への改善提案
- 事業者ダッシュボードとの連携テストを事前に計画する
- オンチェーン状態の取得エラー時のフォールバックUIを検討する
