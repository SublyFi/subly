# タスクリスト: プライベート定期送金 & プライベートKamino Deposit

## Phase 1: Kamino SDK統合（基盤）

### 1.1 依存パッケージのインストール
- [x] `@kamino-finance/klend-sdk` をインストール
- [x] `decimal.js` をインストール（SDKの依存関係）
- [x] 型定義の確認と必要に応じて調整

```bash
cd apps/dashboard-vault
npm install @kamino-finance/klend-sdk decimal.js
```

### 1.2 Kamino Service 実装
- [x] `lib/kamino-service.ts` を新規作成
  - [x] `KaminoService` クラス実装
  - [x] `initialize()` - KaminoMarket.load() でマーケット初期化
  - [x] `getSupplyAPY()` - USDC reserve の APY 取得
  - [x] `getReserveStats()` - totalSupply, utilizationRate 取得
  - [x] `buildDepositTransaction()` - KaminoAction.buildDepositTxns() 使用
  - [x] `buildWithdrawTransaction()` - KaminoAction.buildWithdrawTxns() 使用

### 1.3 useKamino Hook 実装
- [x] `hooks/useKamino.ts` を新規作成
  - [x] KaminoService の初期化
  - [x] APY・統計情報の自動更新（60秒間隔）
  - [x] `deposit()` - デポジット実行
  - [x] `withdraw()` - 引き出し実行
  - [x] エラーハンドリング

### 1.4 YieldCard 更新
- [x] `useKamino` hook を使用するよう変更
- [x] 実際の Kamino APY を表示
- [x] ローディング・エラー状態のハンドリング

---

## Phase 2: プライベートKamino Deposit

### 2.1 KaminoDepositForm コンポーネント
- [x] `components/kamino/KaminoDepositForm.tsx` を新規作成
  - [x] 金額入力フィールド
  - [x] Deposit / Withdraw ボタン
  - [x] 現在のAPY表示
  - [x] トランザクション状態表示

### 2.2 Privacy Cash → Kamino 統合
- [x] API エンドポイント実装（`/api/kamino/deposit`）
- [x] `useKamino` hook に `deposit()` 関数追加
- [x] Shield Pool 経由の Deposit フロー実装（オンチェーン）
  - [x] Privacy Cash から Shield Pool への withdraw
  - [x] Shield Pool から Kamino への CPI deposit（`register_deposit`インストラクション）
  - [x] ユーザーシェアの更新
- [x] Vault SDK 統合（`@subly/vault-sdk`）
  - [x] `lib/vault-client-service.ts` - Vault クライアント管理サービス
  - [x] API から `SublyVaultClient.registerDeposit()` を呼び出し

### 2.3 Kamino → Privacy Cash 統合
- [x] API エンドポイント実装（`/api/kamino/withdraw`）
- [x] `useKamino` hook に `withdraw()` 関数追加
- [x] Shield Pool 経由の Withdraw フロー実装（オンチェーン）
  - [x] Kamino から Shield Pool への CPI redeem（`withdraw`インストラクション）
  - [x] Shield Pool から Privacy Cash への deposit
  - [x] ユーザーシェアの更新
- [x] Vault SDK 統合
  - [x] API から `SublyVaultClient.withdraw()` を呼び出し

### 2.4 UI統合
- [x] ダッシュボードに KaminoDepositForm を配置
- [x] YieldCard との連携

---

## Phase 3: プライベート定期送金

### 3.1 オンチェーン状態同期
- [ ] `useTransfers` hook 更新
  - [ ] ローカルストレージ → オンチェーン状態の読み込み
  - [ ] オンチェーン状態 → ローカルストレージの同期
  - [ ] 暗号化されたリシピエント情報の復号化

### 3.2 定期送金実行ロジック
- [x] 送金実行 API エンドポイント（`/api/transfers/execute`）
- [x] VaultProvider の `executeScheduledTransfer()` API呼び出し対応
- [ ] バッチ証明生成ロジック（ZK）
- [ ] Privacy Cash SDK を使用した送金実行（本番実装）
- [ ] 実行履歴の記録

### 3.3 自動実行統合（Tuk Tuk）
- [ ] Tuk Tuk スレッド作成ロジック
- [ ] 定期実行のスケジューリング
- [ ] 実行結果のコールバック処理

---

## Phase 4: テスト & 検証

### 4.0 ビルド検証
- [x] TypeScript 型チェック
- [x] Next.js ビルド成功
- [x] Kamino SDK の WASM 対応（`serverExternalPackages` 設定）

### 4.1 単体テスト
- [ ] KaminoService のテスト
- [ ] useKamino hook のテスト
- [ ] Privacy Cash 統合のテスト

### 4.2 統合テスト
- [ ] Deposit → Kamino → Withdraw フロー
- [ ] 定期送金の設定 → 実行 → キャンセル

### 4.3 Devnet 検証
- [ ] Devnet での動作確認
- [ ] エッジケースの検証

---

## 現在の進捗

| Phase | Status | 備考 |
|-------|--------|------|
| Phase 1 | ✅ 完了 | Kamino SDK 統合 |
| Phase 2 | ✅ 完了 | API + オンチェーン統合（Vault SDK経由） |
| Phase 3 | ⚡ フロントエンド完了 | 送金実行API実装完了、ZK証明・本番SDK統合は未実装 |
| Phase 4 | ⚡ ビルド検証完了 | 型チェック・ビルド成功、単体・統合テストは未着手 |
| 5.1 | ✅ 完了 | ユーザーシークレット管理（セッション永続化） |
| 5.3 | ✅ 完了 | Shield Pool初期化スクリプト |

---

## 完了した作業

1. **API エンドポイント作成**
   - `/api/kamino/stats` - Kamino統計情報取得（サーバーサイドSDK呼び出し）
   - `/api/kamino/deposit` - Kaminoデポジット（Vault SDK経由でオンチェーン呼び出し）
   - `/api/kamino/withdraw` - Kamino引き出し（Vault SDK経由でオンチェーン呼び出し）
   - `/api/transfers/execute` - 定期送金実行

2. **フック更新**
   - `useKamino` - API経由でのデータ取得・deposit/withdraw関数追加
   - `VaultProvider` - executeScheduledTransfer API対応

3. **ビルド対応**
   - Kamino SDK の WASM 依存を `serverExternalPackages` で対応
   - `YieldCard` 型修正（Decimal → string/number）

4. **オンチェーン統合（2026-01-31追加）**
   - `@subly/vault-sdk` をローカル依存として追加
   - `lib/vault-client-service.ts` - Vaultクライアント管理サービス
   - `/api/kamino/deposit` - Privacy Cash withdraw → `SublyVaultClient.registerDeposit()` → Kamino CPI
   - `/api/kamino/withdraw` - `SublyVaultClient.withdraw()` → Kamino CPI → Privacy Cash deposit
   - TypeScript型チェック・Next.jsビルド成功

---

## 次のアクション（詳細タスク）

### 5.1 ユーザーシークレット管理（優先度: 高） ✅ 完了
現在の実装では`randomBytes(32)`で毎回新しいシークレットを生成しているが、
本番では同一ユーザーが同じシークレットを使い続ける必要がある。

- [x] セッション管理でユーザーシークレットを永続化
  - [x] `session-manager.ts` にシークレット保存機能追加
  - [x] シークレットの暗号化保存（ウォレット署名から派生したキーで暗号化）
  - [x] セッション復元時のシークレット取得
- [x] Kamino API でセッションからシークレットを取得
  - [x] `/api/kamino/deposit` - セッションからシークレット取得
  - [x] `/api/kamino/withdraw` - セッションからシークレット取得
- [x] ユーザーコミットメントの一貫性確保
  - [x] 同一ユーザーは常に同じ `user_commitment` を使用

**実装詳細 (2026-01-31):**
- `session-manager.ts` に `vaultSecret` と `userCommitment` フィールドを追加
- シグネチャから決定論的にVaultシークレットを導出（異なるソルト使用）
- `getVaultSecret()` と `getUserCommitment()` 関数を追加
- Kamino API が毎回 `randomBytes()` ではなくセッションからシークレットを取得

### 5.2 ZK証明統合（優先度: 中）
定期送金実行時のバッチ証明生成ロジック。

- [ ] ZK証明ライブラリの選定・導入
  - [ ] `snarkjs` または `noir` の評価
  - [ ] 依存パッケージのインストール
- [ ] バッチ証明回路の実装
  - [ ] 入力: ユーザーシークレット、金額、nullifier
  - [ ] 出力: 証明、公開入力
- [ ] `BatchProofStorage` の事前生成ロジック
  - [ ] Vault SDK に `generateBatchProof()` 追加
  - [ ] API `/api/transfers/generate-proof` 作成
- [ ] `execute_transfer` との統合
  - [ ] 証明検証ロジックの有効化（現在スキップ）

### 5.3 Shield Pool 初期化（優先度: 高） ✅ 完了
Devnetでのテスト前に、Shield Poolの初期化が必要。

- [x] Shield Pool 初期化スクリプト作成
  - [x] `scripts/initialize-pool.ts`
  - [x] Pool Token Account (USDC) 作成
  - [x] Pool cToken Account (cUSDC) 作成
  - [x] `initialize` インストラクション実行
- [x] Kamino Market との連携確認
  - [x] Reserve liquidity supply アドレスの取得
  - [x] Lending market authority の導出

**実装詳細 (2026-01-31):**
- `scripts/initialize-pool.ts` を新規作成
- PDA導出ロジック（shield_pool, pool_token, pool_ctoken）
- Kamino Lending Market Authority PDA導出
- `--dry-run` オプションでテスト実行可能
- `npm run init-pool` / `npm run init-pool:dry-run` コマンド追加

**使用方法:**
```bash
# 環境変数を設定
export AUTHORITY_KEYPAIR_PATH=~/.config/solana/id.json

# ドライラン（トランザクションなし）
npm run init-pool:dry-run

# 本番実行
npm run init-pool
```

### 5.4 Devnet 検証（優先度: 高）
エンドツーエンドの動作確認。

- [ ] Devnet 環境設定
  - [ ] `.env.local` に Devnet RPC 設定
  - [ ] Devnet USDC Faucet の確認
- [ ] デポジットフローテスト
  - [ ] Privacy Cash にデポジット
  - [ ] Kamino デポジット実行
  - [ ] Pool cToken 残高確認
  - [ ] ユーザーシェア確認
- [ ] 引き出しフローテスト
  - [ ] Kamino 引き出し実行
  - [ ] Privacy Cash 残高確認
  - [ ] Nullifier 使用済み確認
- [ ] エラーケーステスト
  - [ ] 残高不足時のエラー
  - [ ] 二重支払い（Nullifier重複）のエラー

### 5.5 テスト作成（優先度: 中）

- [ ] 単体テスト
  - [ ] `lib/vault-client-service.ts` のモックテスト
  - [ ] `lib/kamino-service.ts` のモックテスト
  - [ ] PDA導出ロジックのテスト
- [ ] 統合テスト
  - [ ] API エンドポイントの E2E テスト
  - [ ] Vault SDK との統合テスト

### 5.6 本番環境準備（優先度: 低）

- [ ] 環境変数の整理
  - [ ] `PRIVACY_CASH_PRIVATE_KEY` の本番設定
  - [ ] Relayer Keypair の管理方針決定
- [ ] エラーハンドリングの強化
  - [ ] トランザクション失敗時のリトライロジック
  - [ ] 部分的成功時のロールバック処理
- [ ] モニタリング
  - [ ] トランザクションログの構造化
  - [ ] Sentry 等のエラー追跡導入検討
