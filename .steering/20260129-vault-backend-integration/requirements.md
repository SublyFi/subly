# 要求定義: Vault Backend Integration

## 概要

Vault Frontend Dashboardで作成したAPI Routes（`/api/privacy-cash/*`）に実際のPrivacy Cash SDK統合を実装し、本番環境で動作するバックエンドを構築する。

## 背景

### 現状
- フロントエンドUIは完成（`apps/dashboard-vault`）
- API Routesの骨格は作成済み
- 現在は開発モード（`NODE_ENV !== 'production'`）でモックデータを返している
- ウォレット署名フローは実装済み

### 課題
1. Privacy Cash SDKはNode.js 24+専用（ブラウザ非対応）
2. SDKはUTXO管理、ZKプルーフ生成をローカルで行う
3. ユーザーセッション管理（暗号化キー保存）が未実装
4. Shield Pool（vault-sdk）統合も未実装

## 機能要件

### FR-1: Privacy Cash SDK統合

#### FR-1.1: セッション管理
- ユーザーの署名から暗号化キーを導出（`deriveEncryptionKeyFromSignature`）
- セッション情報の安全な保存（Redis/Database）
- セッションの有効期限管理

#### FR-1.2: 残高照会
- Privacy Cash SDKを使用した実際の残高取得
- `getPrivateBalanceUSDC()` API呼び出し

#### FR-1.3: 入金処理
- 未署名トランザクションの構築
- UTXO生成とZKプルーフ生成
- フロントエンドへの未署名トランザクション返却

#### FR-1.4: 出金処理
- ZKプルーフ生成
- Privacy Cashリレーヤーへの送信
- 出金結果の返却

### FR-2: Shield Pool統合（vault-sdk）

#### FR-2.1: プール情報取得
- Shield Poolの総資産価値取得
- APY計算

#### FR-2.2: シェア残高取得
- ユーザーのシェア数取得
- USDC換算額計算

### FR-3: セキュリティ

#### FR-3.1: 認証・認可
- ウォレットアドレスとセッションの紐付け
- リクエスト認証

#### FR-3.2: データ保護
- 暗号化キーのメモリ内管理
- センシティブデータのログ除外

## 非機能要件

### NFR-1: パフォーマンス
- API応答時間: 残高照会 < 2秒、入金トランザクション構築 < 5秒

### NFR-2: 可用性
- セッション切れ時の適切なエラーハンドリング

### NFR-3: 運用性
- 環境変数による設定管理
- ヘルスチェックエンドポイント

## 受け入れ条件

1. `NODE_ENV=production`でAPI Routesが実際のSDKを使用する
2. ウォレット接続→署名→入金の一連のフローが動作する
3. 出金がPrivacy Cashリレーヤー経由で処理される
4. エラー時に適切なエラーメッセージが返される

## 対象外

- フロントエンドUIの変更（完成済み）
- 定期送金のオンチェーン実装（別フェーズ）
- Kamino yield戦略の実装（vault-sdk側で対応済み）
