# 要求内容

## 概要

Protocol A（subly-membership）の初回実装。Arcium MPCを使用したプライバシー保護付きサブスクリプション管理システムをDevnet上に構築する。

## 背景

Sublyは、プライバシーを最優先にしたWeb3ネイティブのサブスクリプション決済プロトコル。Protocol Aは会員管理とプライバシー保護を担当し、以下の技術課題を解決する：

- 事業者が顧客の個人情報（ウォレットアドレス）を知らずにサブスクリプションを管理できる
- ユーザーがゼロ知識証明で会員であることを証明できる
- オンチェーンで契約データを暗号化して保存できる

## 実装対象の機能

### 1. Arciumプログラム（subly-membership）

Devnet上で動作するSolana Anchorプログラム。Arcium MPCと連携してデータを暗号化処理する。

**実装する命令（Instructions）**:
- `initialize_mxe` - MXEアカウントの初期化
- `register_business` - 事業者アカウントの登録
- `create_plan` - サブスクリプションプランの作成
- `subscribe` - サブスクリプション契約の締結
- `get_subscription_count` - 契約数の取得（暗号化カウント）

**実装するPDAアカウント**:
- `BusinessAccount` - 事業者情報
- `Plan` - サブスクリプションプラン
- `Subscription` - 契約情報（暗号化）

### 2. TypeScript SDK（@subly/membership-sdk）

事業者とユーザーがプログラムと対話するためのSDK。

**提供するAPI**:
- `SublyMembershipClient` クラス
- `registerBusiness()` - 事業者登録
- `createPlan()` - プラン作成
- `getPlans()` - プラン一覧取得
- `subscribe()` - サブスクリプション契約
- `getSubscriptionCount()` - 契約数取得

### 3. 事業者ダッシュボード（dashboard-business）

事業者がプランを管理するためのNext.jsアプリケーション。

**実装する画面**:
- ホーム（概要表示）
- プラン一覧・作成・編集
- 契約数表示（個人は特定不可）
- ウォレット接続

### 4. ユーザーダッシュボード（dashboard-user）

ユーザーがサブスクリプションを管理するためのNext.jsアプリケーション。

**実装する画面**:
- ホーム（サブスクリプション一覧）
- プラン検索・契約
- ウォレット接続

## 受け入れ条件

### Arciumプログラム
- [ ] Devnetにプログラムがデプロイされている
- [ ] `arcium test`で全テストが通過する
- [ ] MXEアカウントが正常に初期化できる
- [ ] 事業者アカウントをPDAで作成できる
- [ ] プランを作成し、オンチェーンに保存できる
- [ ] ユーザーがサブスクリプション契約を結べる
- [ ] 契約数が暗号化されたままインクリメントされる

### SDK
- [ ] `pnpm build`でエラーなくビルドできる
- [ ] TypeScript型定義が含まれている
- [ ] 全APIがDevnetで動作する

### 事業者ダッシュボード
- [ ] ウォレット接続でログインできる
- [ ] プラン一覧が表示される
- [ ] プランを新規作成できる
- [ ] 契約数のみが表示される（個人は特定不可）

### ユーザーダッシュボード
- [ ] ウォレット接続でログインできる
- [ ] 利用可能なプランが一覧表示される
- [ ] プランに契約できる
- [ ] 契約中のサブスクリプションが表示される

## 成功指標

**デモシナリオ完走基準**:
1. 事業者がSDKでプランを作成できる
2. ユーザーがサブスクリプション契約を結べる
3. 事業者ダッシュボードで「契約数: N」のみ表示される（誰かは分からない）
4. Devnetで全フローが正常動作する

## スコープ外

以下はこのフェーズでは実装しません:

- **ZK証明による会員検証**（Light Protocol統合は次フェーズ）
- **解約機能**（unsubscribe）
- **制裁チェック機能**（Range Risk API統合は次フェーズ）
- **MagicBlock PER統合**（多層プライバシーは次フェーズ）
- **Protocol Bとの連携**（Mainnet Vaultは別リポジトリ）

## 技術的制約

### Arcium固有の制約
- Devnetのみ（Mainnetは未リリース）
- クライアントSDKは`@solana/web3.js`（レガシー版）を使用
- Arcis回路ではVec、HashMap、while、matchなどの動的構文使用不可
- アカウント変数名は`_account`サフィックス必須

### Solana/Anchor制約
- トランザクションサイズ: 1232バイト
- CU制限: 1,400,000 compute units/トランザクション

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/repository-structure.md` - リポジトリ構造定義書
- `docs/development-guidelines.md` - 開発ガイドライン
