# 要求内容

## 概要

事業者アプリに組み込むためのSubly SDK（TypeScriptクライアントライブラリ）を実装します。SDKを通じて、事業者はユーザーのサブスクリプション状態確認、サブスク登録/解除、プラン一覧取得などの機能を提供できます。

## 背景

フェーズ1（初回実装）でオンチェーンプログラム（Anchor + Arcium）の実装が完了しました。次のステップとして、事業者が自社アプリにSublyを組み込むためのTypeScript SDKが必要です。SDKにより、事業者は以下を実現できます：

- ユーザーがアプリ内からサブスク登録できる
- WalletConnect時にサブスク状態を判定してプレミアム機能を解放
- プラン一覧を表示してユーザーに選択させる

## 実装対象の機能

### 1. SDK初期化

- SublySDKクラスのインスタンス化
- RPC接続設定（endpoint指定）
- 事業者ウォレット設定
- Arciumクライアント設定

### 2. サブスクリプション状態確認 (`checkSubscription`)

- ユーザーウォレットとプランIDを受け取り、サブスク状態を返却
- ステータス: NotSubscribed, Active, Cancelled, Expired
- Arcium MPC経由でのverify_subscriptionインストラクション呼び出し

### 3. サブスク登録 (`subscribe`)

- プランIDを受け取り、サブスク登録トランザクションを構築
- 3フェーズパターン: subscribe → Arcium MPC → subscribe_callback
- UserSubscription PDAの作成と初回支払い処理

### 4. サブスク解除 (`unsubscribe`)

- サブスクリプションインデックスを受け取り、解除トランザクションを構築
- 3フェーズパターン: unsubscribe → Arcium MPC → unsubscribe_callback
- UserSubscriptionステータスをCancelledに更新

### 5. プラン一覧取得 (`getPlans`)

- 事業者の全プランを取得
- SubscriptionPlan PDAをフェッチしてデコード
- アクティブなプランのみフィルタリングオプション

### 6. 単一プラン取得 (`getPlan`)

- プランIDを受け取り、プラン詳細を返却
- SubscriptionPlan PDAをフェッチしてデコード

## 受け入れ条件

### SDK初期化

- [ ] SublySDKクラスをnewしてインスタンス化できる
- [ ] RPC endpointを設定できる
- [ ] 事業者ウォレットを設定できる
- [ ] Arcium設定を行える

### checkSubscription

- [ ] ユーザーウォレットとプランIDを渡してサブスク状態を取得できる
- [ ] Active, NotSubscribed, Cancelled, Expiredの4状態を判定できる
- [ ] verify_subscriptionインストラクションが正しく呼び出される

### subscribe

- [ ] プランIDを渡してsubscribeトランザクションを構築できる
- [ ] トランザクション署名を返却する
- [ ] UserSubscription PDAが作成される
- [ ] 初回支払いが実行される（UserLedger減算 + MerchantLedger加算）

### unsubscribe

- [ ] サブスクリプションインデックスを渡してunsubscribeトランザクションを構築できる
- [ ] トランザクション署名を返却する
- [ ] UserSubscriptionステータスがCancelledになる

### getPlans

- [ ] 事業者の全プランを配列で取得できる
- [ ] 各プランの詳細（name, price, billingCycleDays, isActive）が含まれる
- [ ] isActive=trueのみにフィルタリングできる

### getPlan

- [ ] プランIDを渡して単一プランの詳細を取得できる
- [ ] プランが存在しない場合はnullを返却する

## 成功指標

- SDKがnpmパッケージとして公開可能な状態
- 統合テストが全てパスする
- TypeScript型定義が完備している
- 事業者が5行以内でサブスク状態確認を実装できる

## スコープ外

以下はこのフェーズでは実装しません:

- **Deposit/Withdraw機能** - User Dashboard側で実装
- **getBalance機能** - User Dashboard側で実装
- **User Dashboard** - 別フェーズで実装
- **Merchant Dashboard** - 別フェーズで実装
- **Clockwork Cron統合** - 別フェーズで実装
- **npmへの公開** - 別フェーズで実施

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書（セクション6: SDK設計）
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/repository-structure.md` - リポジトリ構造定義書
