# 要求内容

## 概要

Subly プラットフォームの事業者向けダッシュボード（Merchant Dashboard）を実装します。事業者がウォレット接続後、プラン管理・収益確認・Claim を行えるようにします。**全ての機能はオンチェーンプログラムと連携して実装します。**

## 背景

User Dashboard の実装が完了し、ユーザーは Deposit/Withdraw/サブスクリプション管理が可能になりました。次のステップとして、事業者側の機能を提供する必要があります。

**オンチェーンプログラムは既に実装済み:**

- `register_merchant` - 事業者登録
- `create_subscription_plan` - プラン作成
- `update_subscription_plan` - プラン更新
- `claim_revenue` + callback - 収益引き出し（Arcium MPC 統合済み）

事業者が Subly を利用してサブスクリプションサービスを提供するためには、以下の機能が必要です：

- サブスクリプションプランの作成・管理
- 収益の確認
- 収益の引き出し（Claim）
- SDK 導入のためのガイド

## 実装対象の機能

### 1. 事業者登録（Merchant Registration）

- ウォレット接続後、事業者として登録
- 事業者名の入力
- **オンチェーン**: `register_merchant` インストラクションを呼び出し、Merchant + MerchantLedger PDA を作成

### 2. プラン管理（Plan Management）

- サブスクリプションプランの作成
  - プラン名、価格、請求サイクルの設定
  - **オンチェーン**: `create_subscription_plan` インストラクションを呼び出し
- プラン一覧の表示
  - **オンチェーン**: `getProgramAccounts` で SubscriptionPlan アカウントを取得
- プランの有効化/無効化（Toggle）
  - **オンチェーン**: `update_subscription_plan` インストラクションで `is_active` を変更
- プランの編集
  - **オンチェーン**: `update_subscription_plan` インストラクションを呼び出し

### 3. 収益ダッシュボード（Revenue Overview）

- 累計収益の表示
  - **オンチェーン**: MerchantLedger の `encrypted_balance` を取得
  - **Arcium SDK**: 本人のウォレット署名で復号リクエストを送信し、実際の金額を表示
- アクティブサブスクライバー数の表示
  - **オンチェーン**: UserSubscription アカウントをフィルタして集計
- 今月の収益表示
  - Arcium SDK で復号した値から計算（または別途オンチェーンで集計）

### 4. Claim 機能（Revenue Claim）

- 引き出し可能金額の表示
  - **Arcium SDK**: MerchantLedger の残高を復号して表示
- 金額を指定して Claim
  - **オンチェーン**: `claim_revenue` インストラクションを呼び出し
  - **Arcium MPC**: 暗号化された金額を処理し、callback でトークン転送
- トランザクション状態の表示

### 5. SDK セットアップガイド

- SDK 導入手順の表示
- コードサンプルの表示
- Program ID、Merchant Wallet の表示

## 受け入れ条件

### 事業者登録

- [ ] ウォレット接続後、Merchant PDA が存在しない場合は登録フォームが表示される
- [ ] 事業者名を入力して `register_merchant` トランザクションを送信できる
- [ ] トランザクション成功後、Merchant Dashboard Home に遷移する

### プラン管理

- [ ] プラン作成フォームでプラン名、価格、請求サイクルを入力できる
- [ ] `create_subscription_plan` トランザクションを送信してプランを作成できる
- [ ] オンチェーンから取得したプランが一覧に表示される
- [ ] `update_subscription_plan` でプランの有効/無効を切り替えられる
- [ ] `update_subscription_plan` でプランの編集ができる

### 収益ダッシュボード

- [ ] MerchantLedger から暗号化残高を取得し、Arcium SDK で復号して累計収益が表示される
- [ ] UserSubscription をフィルタしてアクティブサブスクライバー数が表示される
- [ ] 今月の収益が表示される

### Claim 機能

- [ ] Arcium SDK で復号した引き出し可能金額が表示される
- [ ] 金額を入力して `claim_revenue` トランザクションを送信できる
- [ ] トランザクション状態（loading/success/error）が表示される
- [ ] Claim 成功後、残高が更新される

### SDK セットアップガイド

- [ ] SDK のインストールコマンドが表示される
- [ ] 初期化コードサンプルが表示される
- [ ] Merchant Wallet アドレスがコピーできる

## 成功指標

- 事業者がウォレット接続から 5 分以内にプラン登録できる
- 全ての画面遷移がスムーズに動作する
- オンチェーントランザクションが正常に送信・確認される
- Arcium SDK での復号が正常に動作する
- TypeScript 型エラーなし、Lint エラーなし、ビルド成功

## スコープ外

以下はこのフェーズでは実装しません:

- 収益の詳細な期間別レポート
- マルチトークン対応（SOL のみ）
- サブスクライバーの個別情報表示
- Clockwork 自動支払い処理の設定 UI

## 技術的な実装方針

### オンチェーン連携

```typescript
// 事業者登録
const registerMerchantTx = await program.methods
  .registerMerchant(name)
  .accounts({
    wallet: wallet.publicKey,
    mint: NATIVE_MINT,
    merchant: merchantPda,
    merchantLedger: merchantLedgerPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// プラン作成
const createPlanTx = await program.methods
  .createSubscriptionPlan(planId, name, price, billingCycleDays)
  .accounts({
    wallet: wallet.publicKey,
    merchant: merchantPda,
    mint: NATIVE_MINT,
    subscriptionPlan: planPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Claim（Arcium 統合）
const claimRevenueTx = await program.methods
  .claimRevenue(computationOffset, encryptedAmount, pubkey, nonce)
  .accounts({
    // ... Arcium 関連アカウント含む
  })
  .rpc();
```

### Arcium SDK 統合

```typescript
// MerchantLedger の残高を復号
const merchantLedger =
  await program.account.merchantLedger.fetch(merchantLedgerPda);
const decryptedBalance = await arciumClient.decrypt(
  merchantLedger.encryptedBalance,
  wallet, // 署名で本人確認
);
```

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書（7.3 Merchant Dashboard ワイヤフレーム）
- `docs/architecture.md` - アーキテクチャ設計書
- `programs/privacy_subscriptions/src/lib.rs` - オンチェーンプログラム
- `encrypted-ixs/src/lib.rs` - Arcis 回路
- `.steering/20260201-user-dashboard-vault-integration/` - User Dashboard 実装
