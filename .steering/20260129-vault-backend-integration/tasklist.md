# タスクリスト: Vault Backend Integration（本番実装）

## 重要: タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## 前提条件

- Node.js 24+ がインストールされていること
- Privacy Cash SDK (`privacycash` v1.1.11) がインストール済み
- **Solana Mainnet** RPC URLが利用可能であること
- **本番環境での動作を前提とする（開発モード/モックなし）**

---

## フェーズ1: 基盤構築

### 1.1 設定管理

- [x] `lib/config.ts` 作成
  - [x] 環境変数の読み込み（SOLANA_RPC_URL必須）
  - [x] SESSION_TTL_SECONDS設定
  - [x] バリデーション（必須変数チェック）

### 1.2 セッションマネージャー

- [x] `lib/session-manager.ts` 作成
  - [x] `SessionManager` クラス実装
  - [x] `initializeSession()`: Privacy Cash SDK初期化
  - [x] `getClient()`: 初期化済みクライアント取得
  - [x] `destroySession()`: セッション破棄
  - [x] メモリ内暗号化キー保持

### 1.3 Privacy Cash Service

- [x] `lib/privacy-cash-service.ts` 作成
  - [x] Privacy Cash SDKインポート
  - [x] `getBalance()`: 実際の残高取得
  - [x] `deposit()`: 入金実行
  - [x] `withdraw()`: 出金実行（リレーヤー経由）

---

## フェーズ2: API Routes本番実装

### 2.1 Init API

- [x] `/api/privacy-cash/init/route.ts` 本番実装
  - [x] 署名検証
  - [x] Privacy Cash SDK初期化
  - [x] セッション保存

### 2.2 Balance API

- [x] `/api/privacy-cash/balance/route.ts` 本番実装
  - [x] セッションからクライアント取得
  - [x] `getPrivateBalanceUSDC()` 呼び出し
  - [x] 実際の残高返却

### 2.3 Deposit API

- [x] `/api/privacy-cash/deposit/route.ts` 本番実装
  - [x] セッションからクライアント取得
  - [x] SDK経由で入金実行
  - [x] 結果返却

### 2.4 Withdraw API

- [x] `/api/privacy-cash/withdraw/route.ts` 本番実装
  - [x] 出金実行（リレーヤー経由）
  - [x] 結果返却

---

## フェーズ3: ビルド・検証

### 3.1 ビルド確認

- [x] TypeScriptコンパイル成功
- [x] Next.js build成功

### 3.2 環境設定

- [x] `.env.example` 作成
- [x] `next.config.ts` WASM/Turbopack対応設定

---

## 実装上の注意事項

### Privacy Cash SDK初期化

署名（64バイト）をownerパラメータとして渡すことで、
ユーザーのウォレット+署名メッセージに紐づいた
決定論的なPrivacy Cashアカウントが作成されます。

```typescript
const { PrivacyCash } = await import('privacycash');
const client = new PrivacyCash({
  RPC_url: config.solanaRpcUrl,
  owner: Array.from(signature), // 64バイトの署名
  enableDebug: config.privacyCashDebug,
});
```

### 必要な環境変数

```bash
# .env.local
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## 参考資料

- [Privacy Cash SDK Documentation](https://privacycash.mintlify.app/sdk/overview)
- [vault-sdk privacy-cash.ts](../../subly-mainnet/packages/vault-sdk/src/integrations/privacy-cash.ts)
