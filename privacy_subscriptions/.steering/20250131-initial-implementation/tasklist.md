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

## フェーズ1: 基盤インストラクション（非暗号化処理）

### 1.1 アカウント構造体の定義

- [ ] ProtocolConfig構造体を定義
  - [ ] authority, fee_rate_bps, is_paused, bump フィールド
  - [ ] PDA Seeds: `["protocol_config"]`

- [ ] ProtocolPool構造体を定義
  - [ ] mint, token_account, bump フィールド
  - [ ] PDA Seeds: `["protocol_pool", mint]`

- [ ] Merchant構造体を定義
  - [ ] wallet, name, is_active, registered_at, bump フィールド
  - [ ] PDA Seeds: `["merchant", wallet]`

- [ ] MerchantLedger構造体を定義
  - [ ] merchant, mint, encrypted_balance, encrypted_total_claimed, bump フィールド
  - [ ] PDA Seeds: `["merchant_ledger", merchant, mint]`

- [ ] SubscriptionPlan構造体を定義
  - [ ] merchant, plan_id, name, mint, price, billing_cycle_days, is_active, created_at, bump フィールド
  - [ ] PDA Seeds: `["subscription_plan", merchant, plan_id]`

- [ ] UserLedger構造体を定義
  - [ ] user, mint, encrypted_balance, encrypted_subscription_count, last_updated, bump フィールド
  - [ ] PDA Seeds: `["user_ledger", user, mint]`

- [ ] UserSubscription構造体を定義
  - [ ] user, subscription_index, encrypted_plan, encrypted_status, encrypted_next_payment_date, encrypted_start_date, bump フィールド
  - [ ] PDA Seeds: `["user_subscription", user, subscription_index]`

### 1.2 エラーコードの定義

- [ ] SublyError enumを定義
  - [ ] AbortedComputation
  - [ ] ClusterNotSet
  - [ ] Unauthorized
  - [ ] ProtocolPaused
  - [ ] InvalidFeeRate
  - [ ] InvalidPrice
  - [ ] InvalidBillingCycle
  - [ ] NameTooLong
  - [ ] MerchantNotActive
  - [ ] PlanNotActive
  - [ ] InsufficientBalance
  - [ ] SubscriptionNotActive

### 1.3 非暗号化インストラクションの実装

- [ ] initialize_protocol インストラクション
  - [ ] InitializeProtocol Context構造体
  - [ ] ProtocolConfig PDAの初期化ロジック
  - [ ] fee_rate_bps のバリデーション（0-10000）

- [ ] initialize_pool インストラクション
  - [ ] InitializePool Context構造体
  - [ ] ProtocolPool PDAの初期化ロジック
  - [ ] プールトークンアカウントの作成

- [ ] register_merchant インストラクション
  - [ ] RegisterMerchant Context構造体
  - [ ] Merchant PDAの初期化ロジック
  - [ ] MerchantLedger PDAの初期化ロジック（暗号化初期残高0）

- [ ] create_subscription_plan インストラクション
  - [ ] CreateSubscriptionPlan Context構造体
  - [ ] SubscriptionPlan PDAの初期化ロジック
  - [ ] price, billing_cycle_days のバリデーション

- [ ] update_subscription_plan インストラクション
  - [ ] UpdateSubscriptionPlan Context構造体
  - [ ] プラン情報の更新ロジック
  - [ ] 事業者署名の検証

### 1.4 フェーズ1の統合テスト

- [ ] プロトコル初期化テスト
  - [ ] initialize_protocol が正常に動作することを確認
  - [ ] initialize_pool が正常に動作することを確認
  - [ ] 不正なfee_rateでエラーになることを確認

- [ ] 事業者登録テスト
  - [ ] register_merchant が正常に動作することを確認
  - [ ] MerchantLedger が作成されることを確認

- [ ] プラン管理テスト
  - [ ] create_subscription_plan が正常に動作することを確認
  - [ ] update_subscription_plan が正常に動作することを確認
  - [ ] 不正なパラメータでエラーになることを確認

## フェーズ2: Arcis暗号化回路

### 2.1 Arcis回路の実装

- [ ] deposit_circuit を実装
  - [ ] current_balance + deposit_amount の計算
  - [ ] Enc<Mxe, u64> での出力

- [ ] withdraw_circuit を実装
  - [ ] 残高検証ロジック
  - [ ] 条件付き減算ロジック
  - [ ] 引き出し額の平文出力

- [ ] subscribe_circuit を実装
  - [ ] 残高検証
  - [ ] UserLedger減算 + MerchantLedger加算
  - [ ] subscription_countインクリメント
  - [ ] サブスク状態の生成

- [ ] unsubscribe_circuit を実装
  - [ ] ステータスをCancelledに更新

- [ ] process_payment_circuit を実装
  - [ ] 支払日到来チェック
  - [ ] 残高検証
  - [ ] 帳簿更新ロジック
  - [ ] 自動解約ロジック
  - [ ] 次回支払日更新

- [ ] verify_subscription_circuit を実装
  - [ ] Active かつ 支払い期限内かを判定
  - [ ] bool での結果出力

- [ ] claim_revenue_circuit を実装
  - [ ] 残高検証
  - [ ] MerchantLedger減算
  - [ ] 引き出し額の平文出力

### 2.2 Arcis回路のビルド確認

- [ ] `arcium build` でエラーなくビルドできることを確認
- [ ] build/ ディレクトリに成果物が生成されることを確認

## フェーズ3: 暗号化インストラクション（Arcium 3フェーズ）

### 3.1 Deposit インストラクション

- [ ] init_deposit_comp_def インストラクション
  - [ ] InitDepositCompDef Context構造体
  - [ ] ComputationDefinitionの初期化

- [ ] deposit インストラクション（Queue Phase）
  - [ ] Deposit Context構造体
  - [ ] Pool へのトークン転送
  - [ ] Arciumへのqueue_computation

- [ ] deposit_callback インストラクション
  - [ ] DepositCallback Context構造体
  - [ ] verify_output() による検証
  - [ ] UserLedger の更新

### 3.2 Withdraw インストラクション

- [ ] init_withdraw_comp_def インストラクション
  - [ ] InitWithdrawCompDef Context構造体

- [ ] withdraw インストラクション（Queue Phase）
  - [ ] Withdraw Context構造体
  - [ ] Arciumへのqueue_computation

- [ ] withdraw_callback インストラクション
  - [ ] WithdrawCallback Context構造体
  - [ ] UserLedger の更新
  - [ ] Pool からユーザーへのトークン転送

### 3.3 Subscribe インストラクション

- [ ] init_subscribe_comp_def インストラクション
  - [ ] InitSubscribeCompDef Context構造体

- [ ] subscribe インストラクション（Queue Phase）
  - [ ] Subscribe Context構造体
  - [ ] Arciumへのqueue_computation

- [ ] subscribe_callback インストラクション
  - [ ] SubscribeCallback Context構造体
  - [ ] UserLedger の更新
  - [ ] MerchantLedger の更新
  - [ ] UserSubscription PDAの作成

### 3.4 Unsubscribe インストラクション

- [ ] init_unsubscribe_comp_def インストラクション
  - [ ] InitUnsubscribeCompDef Context構造体

- [ ] unsubscribe インストラクション（Queue Phase）
  - [ ] Unsubscribe Context構造体
  - [ ] Arciumへのqueue_computation

- [ ] unsubscribe_callback インストラクション
  - [ ] UnsubscribeCallback Context構造体
  - [ ] UserSubscription の更新

### 3.5 ProcessPayment インストラクション

- [ ] init_process_payment_comp_def インストラクション
  - [ ] InitProcessPaymentCompDef Context構造体

- [ ] process_payment インストラクション（Queue Phase）
  - [ ] ProcessPayment Context構造体
  - [ ] Arciumへのqueue_computation

- [ ] process_payment_callback インストラクション
  - [ ] ProcessPaymentCallback Context構造体
  - [ ] UserLedger の更新
  - [ ] MerchantLedger の更新
  - [ ] UserSubscription の更新

### 3.6 VerifySubscription インストラクション

- [ ] init_verify_subscription_comp_def インストラクション
  - [ ] InitVerifySubscriptionCompDef Context構造体

- [ ] verify_subscription インストラクション（Queue Phase）
  - [ ] VerifySubscription Context構造体
  - [ ] Arciumへのqueue_computation

- [ ] verify_subscription_callback インストラクション
  - [ ] VerifySubscriptionCallback Context構造体
  - [ ] is_valid (bool) の出力

### 3.7 ClaimRevenue インストラクション

- [ ] init_claim_revenue_comp_def インストラクション
  - [ ] InitClaimRevenueCompDef Context構造体

- [ ] claim_revenue インストラクション（Queue Phase）
  - [ ] ClaimRevenue Context構造体
  - [ ] Arciumへのqueue_computation

- [ ] claim_revenue_callback インストラクション
  - [ ] ClaimRevenueCallback Context構造体
  - [ ] MerchantLedger の更新
  - [ ] Pool から事業者へのトークン転送

## フェーズ4: 統合テスト

### 4.1 暗号化インストラクションのテスト

- [ ] Deposit テスト
  - [ ] init_deposit_comp_def の実行
  - [ ] deposit が正常に動作することを確認
  - [ ] UserLedger の残高が更新されることを確認

- [ ] Withdraw テスト
  - [ ] init_withdraw_comp_def の実行
  - [ ] withdraw が正常に動作することを確認
  - [ ] Pool からユーザーへトークンが転送されることを確認
  - [ ] 残高不足でエラーになることを確認

- [ ] Subscribe テスト
  - [ ] init_subscribe_comp_def の実行
  - [ ] subscribe が正常に動作することを確認
  - [ ] UserSubscription が作成されることを確認
  - [ ] 帳簿が正しく更新されることを確認

- [ ] Unsubscribe テスト
  - [ ] init_unsubscribe_comp_def の実行
  - [ ] unsubscribe が正常に動作することを確認
  - [ ] ステータスがCancelledになることを確認

- [ ] ProcessPayment テスト
  - [ ] init_process_payment_comp_def の実行
  - [ ] process_payment が正常に動作することを確認
  - [ ] 帳簿が正しく更新されることを確認
  - [ ] 残高不足で自動解約されることを確認

- [ ] VerifySubscription テスト
  - [ ] init_verify_subscription_comp_def の実行
  - [ ] verify_subscription が正常に動作することを確認
  - [ ] Active かつ有効期限内で true が返ることを確認
  - [ ] Cancelled で false が返ることを確認

- [ ] ClaimRevenue テスト
  - [ ] init_claim_revenue_comp_def の実行
  - [ ] claim_revenue が正常に動作することを確認
  - [ ] Pool から事業者へトークンが転送されることを確認

### 4.2 E2Eシナリオテスト

- [ ] 事業者フロー完全テスト
  - [ ] register_merchant → create_plan → (ユーザーがsubscribe) → claim_revenue

- [ ] ユーザーフロー完全テスト
  - [ ] deposit → subscribe → process_payment → unsubscribe → withdraw

## フェーズ5: 品質チェックと修正

- [ ] Anchor ビルドが成功することを確認
  - [ ] `anchor build`

- [ ] Arcium ビルドが成功することを確認
  - [ ] `arcium build`

- [ ] すべてのテストが通ることを確認
  - [ ] `anchor test`

- [ ] サンプルコード（add_together）の削除
  - [ ] lib.rs から add_together 関連のコードを削除
  - [ ] encrypted-ixs/src/lib.rs から add_together 回路を削除

## フェーズ6: ドキュメント更新

- [ ] README.md を更新（必要に応じて）
- [ ] 実装後の振り返り（このファイルの下部に記録）

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
- {タスク計画の改善点}
