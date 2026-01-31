# 要求内容

## 概要

Sublyプライバシー保護型サブスクリプション基盤のコアオンチェーン機能を実装します。Arcium MPCを活用した暗号化処理により、サブスクリプション状態・支払い情報・ユーザー関係性を秘匿します。

## 背景

現在のプログラムはArciumのサンプル（`add_together`）のみで、Sublyの実機能は未実装です。PRD（プロダクト要求定義書）と機能設計書に基づき、MVPに必要なコア機能を実装します。

## 実装対象の機能

### フェーズ1: 基盤インストラクション（非暗号化処理）

#### 1. プロトコル初期化 (`initialize_protocol`)
- ProtocolConfig PDAを作成
- 手数料率（fee_rate_bps）を設定
- プロトコル管理者（authority）を登録

#### 2. プロトコルプール作成 (`initialize_pool`)
- トークンミントごとのProtocolPool PDAを作成
- プールのトークンアカウントを初期化
- 実際のトークンを保管する共通プール

#### 3. 事業者登録 (`register_merchant`)
- Merchant PDAを作成
- MerchantLedger PDAを作成（暗号化残高管理用）
- 事業者名、ウォレットアドレスを登録

#### 4. サブスクリプションプラン作成 (`create_subscription_plan`)
- SubscriptionPlan PDAを作成
- プラン名、料金、請求サイクル（日数）を設定
- 有効フラグ（is_active）を設定

#### 5. サブスクリプションプラン更新 (`update_subscription_plan`)
- プラン情報の更新（名前、料金、請求サイクル）
- 有効化/無効化の切り替え

### フェーズ2: 暗号化インストラクション（Arcium 3フェーズパターン）

#### 1. Deposit（帳簿残高加算）
- `init_deposit_comp_def`: Deposit処理の定義（デプロイ時1回）
- `deposit`: 暗号化された金額を受け取り、MPCにキュー
- `deposit_callback`: UserLedgerに暗号化残高を加算・保存

#### 2. Withdraw（帳簿残高減算 + 実送金）
- `init_withdraw_comp_def`: Withdraw処理の定義（デプロイ時1回）
- `withdraw`: 引き出し額を検証し、MPCにキュー
- `withdraw_callback`: UserLedger減算 + Poolから実送金

#### 3. Subscribe（サブスク開始 + 初回支払い）
- `init_subscribe_comp_def`: Subscribe処理の定義（デプロイ時1回）
- `subscribe`: プラン情報を受け取り、MPCにキュー
- `subscribe_callback`: UserSubscription作成 + 初回帳簿更新

#### 4. Unsubscribe（サブスク解除）
- `init_unsubscribe_comp_def`: Unsubscribe処理の定義（デプロイ時1回）
- `unsubscribe`: 解除リクエストをMPCにキュー
- `unsubscribe_callback`: UserSubscriptionを解約状態に更新

#### 5. ProcessPayment（定期支払い処理）
- `init_process_payment_comp_def`: 支払い処理の定義（デプロイ時1回）
- `process_payment`: 対象サブスクをMPCにキュー（Cron呼出）
- `process_payment_callback`: UserLedger減算 + MerchantLedger加算

#### 6. VerifySubscription（サブスク有効性検証）
- `init_verify_subscription_comp_def`: 検証処理の定義（デプロイ時1回）
- `verify_subscription`: ユーザー・事業者情報をMPCにキュー
- `verify_subscription_callback`: 有効/無効の結果を返却

#### 7. ClaimRevenue（事業者収益引き出し）
- `init_claim_revenue_comp_def`: Claim処理の定義（デプロイ時1回）
- `claim_revenue`: 引き出し額を検証し、MPCにキュー
- `claim_revenue_callback`: MerchantLedger減算 + Poolから実送金

### フェーズ3: Arcis暗号化回路

#### 1. deposit_circuit
- 現在残高 + デポジット額 = 新残高

#### 2. withdraw_circuit
- 残高検証 + 残高減算

#### 3. subscribe_circuit
- プラン検証 + 残高検証 + 初回支払い + サブスク状態作成

#### 4. unsubscribe_circuit
- サブスク状態の解約更新

#### 5. process_payment_circuit
- 支払日到来チェック + 残高検証 + 帳簿更新 + 次回支払日更新

#### 6. verify_subscription_circuit
- サブスク有効性判定

#### 7. claim_revenue_circuit
- 事業者残高検証 + 残高減算

### フェーズ4: 統合テスト

#### 1. プロトコル初期化テスト
- プロトコル設定の作成と検証

#### 2. 事業者フローテスト
- 事業者登録 → プラン作成 → 収益Claim

#### 3. ユーザーフローテスト
- Deposit → Subscribe → ProcessPayment → Unsubscribe → Withdraw

#### 4. プライバシー検証テスト
- 第三者からのデータ解読不可を確認

## 受け入れ条件

### プロトコル初期化
- [ ] ProtocolConfig PDAが作成される
- [ ] 手数料率が正しく設定される
- [ ] 管理者のみが実行可能

### プロトコルプール
- [ ] トークンごとのProtocolPool PDAが作成される
- [ ] プールトークンアカウントが初期化される

### 事業者登録
- [ ] Merchant PDAが作成される
- [ ] MerchantLedger PDAが作成される
- [ ] 暗号化された初期残高が0で設定される

### サブスクリプションプラン
- [ ] SubscriptionPlan PDAが作成される
- [ ] プラン情報（名前、料金、サイクル）が正しく保存される
- [ ] プランの更新が正しく動作する

### Deposit
- [ ] ユーザーが実トークンをPoolにデポジットできる
- [ ] UserLedgerの暗号化残高が加算される

### Withdraw
- [ ] 残高検証が正しく行われる
- [ ] UserLedgerの暗号化残高が減算される
- [ ] Poolから実トークンが送金される

### Subscribe
- [ ] UserSubscription PDAが作成される
- [ ] 初回支払いが実行される
- [ ] UserLedger減算 + MerchantLedger加算が行われる

### Unsubscribe
- [ ] UserSubscriptionのステータスがCancelledに更新される
- [ ] 次回請求が発生しない

### ProcessPayment
- [ ] 支払日到来時に支払いが実行される
- [ ] 残高不足時にサブスクが自動解約される
- [ ] 次回支払日が更新される

### VerifySubscription
- [ ] 有効/無効/期限切れの状態が正しく判定される

### ClaimRevenue
- [ ] 事業者がMerchantLedgerの残高を引き出せる
- [ ] Poolから実トークンが送金される

## 成功指標

- すべての統合テストがパスする
- プログラムがDevnetにデプロイ可能
- 暗号化データが第三者から解読不可能

## スコープ外

以下はこのフェーズでは実装しません:

- SDK（TypeScriptクライアント）
- Dashboard（Webフロントエンド）
- Clockwork Cron統合（自動支払いトリガー）
- Mainnetデプロイ

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/repository-structure.md` - リポジトリ構造定義書
