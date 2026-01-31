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

- [ ] demo/ ディレクトリを作成
- [ ] package.json を作成
  - [ ] 必要な依存関係を設定（next, react, wallet-adapter, tailwind等）
  - [ ] @subly/sdk へのローカルリンクを設定
  - [ ] scriptsを設定（dev, build, start）
- [ ] tsconfig.json を作成
- [ ] next.config.js を作成
- [ ] tailwind.config.js を作成
- [ ] postcss.config.js を作成
- [ ] .env.local.example を作成
- [ ] src/app/globals.css を作成（Tailwind imports）

## フェーズ2: 基盤実装

### 2.1 型定義
- [ ] src/types/index.ts を作成
  - [ ] Plan インターフェース
  - [ ] SubscriptionState インターフェース
  - [ ] MockSubscriptionData インターフェース

### 2.2 デモ用プランデータ
- [ ] src/lib/plans.ts を作成
  - [ ] DEMO_PLANS 定数（Basic, Standard, Premium の3プラン）
  - [ ] 各プランの特典リスト

### 2.3 モックSDKラッパー
- [ ] src/lib/mock-sdk.ts を作成
  - [ ] MockSublySDK クラス
  - [ ] checkSubscription メソッド（LocalStorage読み取り）
  - [ ] subscribe メソッド（LocalStorage書き込み）
  - [ ] unsubscribe メソッド
  - [ ] getPlans メソッド

## フェーズ3: Context・Provider実装

### 3.1 SublyContext
- [ ] src/contexts/SublyContext.tsx を作成
  - [ ] SublyContextType インターフェース
  - [ ] SublyProvider コンポーネント
  - [ ] useSubly カスタムフック
  - [ ] Wallet接続時の自動checkSubscription
  - [ ] subscribe/unsubscribeアクション

### 3.2 WalletProvider設定
- [ ] src/app/providers.tsx を作成
  - [ ] WalletAdapterProvider設定
  - [ ] エンドポイント設定（Devnet）
  - [ ] 対応Wallet設定（Phantom, Solflare）

## フェーズ4: UIコンポーネント実装

### 4.1 共通コンポーネント
- [ ] src/components/WalletButton.tsx を作成
  - [ ] 未接続時: Connect Walletボタン
  - [ ] 接続時: アドレス短縮表示 + Disconnectボタン

### 4.2 プラン関連コンポーネント
- [ ] src/components/PlanCard.tsx を作成
  - [ ] プラン名、価格、請求サイクル表示
  - [ ] 特典リスト表示
  - [ ] Subscribe/Unsubscribeボタン
  - [ ] 人気プランのハイライト
- [ ] src/components/PlanSelection.tsx を作成
  - [ ] 3つのPlanCardを横並び表示
  - [ ] レスポンシブ対応（モバイルは縦並び）

### 4.3 ダッシュボードコンポーネント
- [ ] src/components/SubscribedDashboard.tsx を作成
  - [ ] 契約中プラン名表示
  - [ ] 特典一覧表示
  - [ ] Manage Subscriptionリンク
  - [ ] モック音楽プレイヤーUI

### 4.4 SDK紹介コンポーネント
- [ ] src/components/SDKCodeExample.tsx を作成
  - [ ] SDK初期化コードのシンタックスハイライト表示
  - [ ] 「たった3行で導入」のメッセージ

## フェーズ5: ページ実装

### 5.1 レイアウト
- [ ] src/app/layout.tsx を作成
  - [ ] HTML構造
  - [ ] Providers（Wallet + Subly）のラップ
  - [ ] Toasterの設置

### 5.2 メインページ
- [ ] src/app/page.tsx を作成
  - [ ] ヘッダー（ロゴ + WalletButton）
  - [ ] 条件分岐レンダリング
    - [ ] 未接続時: ランディングUI
    - [ ] 接続済み + 未契約: PlanSelection
    - [ ] 接続済み + 契約済み: SubscribedDashboard
  - [ ] フッター（Arcium MPC説明）

## フェーズ6: 動作確認・仕上げ

### 6.1 依存関係インストール
- [ ] npm install を実行

### 6.2 動作確認
- [ ] npm run dev でアプリ起動確認
- [ ] Wallet接続フローの動作確認
- [ ] プラン選択・契約フローの動作確認
- [ ] Disconnect → 再接続での状態復元確認

### 6.3 README作成
- [ ] demo/README.md を作成
  - [ ] 概要説明
  - [ ] セットアップ手順
  - [ ] 使い方
  - [ ] スクリーンショット説明（テキスト）

## フェーズ7: 品質チェック

- [ ] TypeScript型エラーがないことを確認
  - [ ] `npm run build` が成功
- [ ] 画面遷移が正しく動作することを確認
  - [ ] 未接続 → 接続 → プラン選択
  - [ ] 契約 → ダッシュボード表示
  - [ ] Disconnect → 再接続 → ダッシュボード復元

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
