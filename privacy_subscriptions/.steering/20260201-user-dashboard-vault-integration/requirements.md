# 要求内容

## 概要

Subly プライバシー保護型サブスクリプション基盤のユーザー向け Web ダッシュボードを実装します。ユーザーが資金管理（Deposit/Withdraw）、残高確認、サブスクリプション一覧・管理を行うための Next.js アプリケーションです。

## 背景

オンチェーンプログラム（Anchor + Arcium MPC）の実装が完了しました。ユーザーがプライバシー保護された状態でサブスクリプションサービスを利用するためには、直感的な Web インターフェースが必要です。本ダッシュボードにより、ユーザーは以下の操作を暗号化された状態で安全に行えます。

## 実装対象の機能

### 1. ウォレット接続
- Phantom, Solflare などの主要ウォレットとの接続
- 接続状態の管理とセッション維持
- 接続解除機能

### 2. Deposit（資金デポジット）
- 共通 Pool へのトークンデポジット
- デポジット金額の入力と確認
- トランザクション状態の表示（pending/success/error）

### 3. Withdraw（資金引き出し）
- 帳簿残高の範囲内での引き出し
- 引き出し金額の入力と確認
- 残高不足時のエラー表示

### 4. 残高表示
- 暗号化された帳簿残高の復号表示
- 対応トークン（SOL / SPL トークン）の切り替え
- リアルタイム更新

### 5. サブスクリプション一覧
- アクティブなサブスクリプションの一覧表示
- 各サブスクリプションの詳細情報（プラン名、次回支払日、ステータス）
- Unsubscribe（解約）機能

## 受け入れ条件

### ウォレット接続
- [ ] Phantom ウォレットで接続できる
- [ ] Solflare ウォレットで接続できる
- [ ] 接続後、ユーザーのウォレットアドレスが表示される
- [ ] 接続解除ボタンでセッションを終了できる

### Deposit
- [ ] トークン種別（SOL）を選択できる
- [ ] デポジット金額を入力できる
- [ ] 確認ボタンでトランザクションが送信される
- [ ] トランザクション成功後、残高が更新される
- [ ] エラー時に適切なメッセージが表示される

### Withdraw
- [ ] 引き出し金額を入力できる
- [ ] 残高以上の金額を入力した場合、エラーが表示される
- [ ] 確認ボタンでトランザクションが送信される
- [ ] トランザクション成功後、残高が更新される

### 残高表示
- [ ] 接続後、暗号化残高が復号されて表示される
- [ ] 本人のみが残高を確認できる（他者には表示されない）

### サブスクリプション一覧
- [ ] アクティブなサブスクリプションが一覧表示される
- [ ] 各サブスクリプションのステータス（Active/Cancelled）が表示される
- [ ] 次回支払日が表示される
- [ ] Unsubscribe ボタンで解約できる

## 成功指標

- ユーザーが 3 クリック以内で Deposit を完了できる
- ページロード時間が 3 秒以内
- トランザクション状態が明確に表示される
- モバイル・デスクトップの両方で操作可能（レスポンシブ）

## スコープ外

以下はこのフェーズでは実装しません:

- 事業者向けダッシュボード（Merchant Dashboard）
- SDK パッケージのビルド・公開
- 本番環境（Mainnet）デプロイ
- Clockwork Cron 統合（自動支払いトリガー）
- 複数 SPL トークン対応（MVP では SOL のみ）

## 技術スタック

- Next.js 14.x（App Router）
- React 18.x
- TypeScript 5.x
- Tailwind CSS
- @solana/wallet-adapter-react（ウォレット接続）
- @arcium-hq/client（暗号化・復号）

## オンチェーン連携要件（モック実装からの移行）

### 背景

現在のダッシュボード実装は**モック実装**となっており、実際のオンチェーンプログラムとの連携が行われていません。オンチェーンプログラム（Anchor + Arcium MPC）は既に実装済みのため、フロントエンドのフックとサービス層をオンチェーン連携に移行する必要があります。

### 対象となるモック実装

以下のフックが現在モック実装になっています:

1. **useDeposit.ts** - `setTimeout`でトランザクションをシミュレート
2. **useWithdraw.ts** - `setTimeout`でトランザクションをシミュレート
3. **useBalance.ts** - 固定のモック残高（2.5 SOL）を返却
4. **useSubscriptions.ts** - 固定のモックサブスクリプションデータを返却
5. **useUnsubscribe.ts** - `setTimeout`でトランザクションをシミュレート

### オンチェーン連携で実装すべき機能

#### 1. Arcium クライアント統合

- **@arcium-hq/client** SDK の導入
- MXE（Multi-party eXecution Environment）公開鍵の取得
- X25519 鍵ペア生成
- RescueCipher による暗号化・復号化
- 共有シークレットの導出

#### 2. Anchor プログラム連携

- **@coral-xyz/anchor** による IDL ベースのプログラム呼び出し
- PDA（Program Derived Address）の導出
  - UserLedger: `["user_ledger", user, mint]`
  - UserSubscription: `["user_subscription", user, subscription_index]`
  - ProtocolPool: `["protocol_pool", mint]`
- トランザクション構築・送信・確認

#### 3. Deposit 機能のオンチェーン連携

```typescript
// 必要な処理:
// 1. MXE公開鍵の取得
// 2. X25519鍵ペア生成
// 3. 共有シークレット導出
// 4. 金額の暗号化（RescueCipher）
// 5. deposit命令のトランザクション構築
// 6. ウォレットで署名・送信
// 7. コールバック完了を待機（awaitComputationFinalization）
```

#### 4. Withdraw 機能のオンチェーン連携

```typescript
// 必要な処理:
// 1. MXE公開鍵の取得
// 2. X25519鍵ペア生成
// 3. 共有シークレット導出
// 4. 金額の暗号化
// 5. withdraw命令のトランザクション構築
// 6. ウォレットで署名・送信
// 7. MPC計算でバランスチェック
// 8. コールバック完了を待機
```

#### 5. 残高取得・復号機能

```typescript
// 必要な処理:
// 1. UserLedger アカウントの取得
// 2. encrypted_balance フィールドの読み取り
// 3. ユーザーの秘密鍵とMXE公開鍵で共有シークレット導出
// 4. RescueCipherで残高を復号
// 5. lamports → SOL 変換して表示
```

#### 6. サブスクリプション一覧・解約機能

```typescript
// 必要な処理:
// 1. getProgramAccounts でユーザーの UserSubscription を取得
// 2. 関連する SubscriptionPlan の取得
// 3. 暗号化されたステータス・次回支払日の復号
// 4. unsubscribe 命令のトランザクション構築
// 5. コールバック完了を待機
```

### 受け入れ条件（オンチェーン連携）

#### 基盤整備
- [ ] @arcium-hq/client パッケージがインストールされている
- [ ] Arcium クライアントユーティリティ（暗号化・復号）が実装されている
- [ ] Anchor プログラムクライアントが設定されている
- [ ] PDA 導出ユーティリティが実装されている

#### Deposit
- [ ] 実際にトークンが Pool にトランスファーされる
- [ ] UserLedger の encrypted_balance が更新される
- [ ] Arcium MPC コールバックが正常に完了する
- [ ] トランザクション署名が Solscan で確認できる

#### Withdraw
- [ ] Arcium MPC で残高検証が行われる
- [ ] 残高不足の場合はオンチェーンでエラーになる
- [ ] Pool からユーザーウォレットにトークンが送金される
- [ ] UserLedger の encrypted_balance が更新される

#### 残高表示
- [ ] UserLedger アカウントから暗号化残高を取得する
- [ ] ユーザーの鍵で正しく復号できる
- [ ] リアルタイムで残高が更新される

#### サブスクリプション
- [ ] オンチェーンの UserSubscription アカウントを取得する
- [ ] 暗号化されたプラン情報を復号して表示する
- [ ] unsubscribe トランザクションでステータスが Cancelled になる

### 技術的制約

- **Devnet 専用**: 現時点では Solana Devnet のみ対応
- **SPL Token**: Native SOL ではなく Wrapped SOL (SPL Token) を使用
- **非同期コールバック**: Arcium MPC の計算完了を待つ必要がある（数秒〜数十秒）
- **ノンスの管理**: 暗号化に使用するノンスは一意である必要がある

### 依存ライブラリ（追加）

```json
{
  "dependencies": {
    "@arcium-hq/client": "^0.x.x",
    "@coral-xyz/anchor": "^0.30.1"
  }
}
```

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書（7.1 User Dashboard 画面遷移図、7.2 ワイヤフレーム）
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/repository-structure.md` - リポジトリ構造定義書（app/ ディレクトリ構造）
- `programs/privacy_subscriptions/src/lib.rs` - オンチェーンプログラム実装
- `tests/privacy_subscriptions.ts` - Arcium クライアント使用パターン参考
