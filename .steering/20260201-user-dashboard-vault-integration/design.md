# 設計書

## アーキテクチャ概要

既存のユーザーダッシュボード（Next.js 16 + React 19）に、Vault SDK（`@subly/vault-sdk`）を統合する。新しいページとコンポーネントを追加し、VaultProviderでSDKインスタンスを管理する。

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Dashboard (Next.js)                     │
├─────────────────────────────────────────────────────────────────┤
│  pages:                                                         │
│    /            → サブスクリプション一覧（既存）                   │
│    /browse      → プラン一覧（既存）                              │
│    /vault       → Vault概要【新規】                              │
│    /vault/deposit   → 入金【新規】                               │
│    /vault/withdraw  → 出金【新規】                               │
│    /vault/transfers → 定期送金一覧【新規】                        │
│    /vault/history   → 決済履歴【新規】                           │
├─────────────────────────────────────────────────────────────────┤
│  providers:                                                      │
│    WalletProvider (既存)                                         │
│    MembershipProvider (既存)                                     │
│    VaultProvider 【新規】                                        │
├─────────────────────────────────────────────────────────────────┤
│  hooks:                                                          │
│    useVault 【新規】                                             │
│    useVaultBalance 【新規】                                      │
│    useScheduledTransfers 【新規】                                │
│    useTransferHistory 【新規】                                   │
├─────────────────────────────────────────────────────────────────┤
│  SDK Integration:                                                │
│    @subly/vault-sdk (workspace reference)                        │
└─────────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. VaultProvider

**責務**:
- SublyVaultClientの初期化と管理
- ウォレット接続状態との連携
- ユーザーの秘密値（secret）とコミットメントの管理

**実装の要点**:
- ウォレット接続時にSDKを初期化
- 秘密値はローカルストレージに暗号化保存（vault-sdkのLocalStorageManagerを使用）
- コンテキストでSDKインスタンスとメソッドを提供

### 2. VaultOverviewPage（/vault）

**責務**:
- 残高表示
- APYと運用益表示
- 入金・出金へのナビゲーション

**実装の要点**:
- `useVaultBalance`フックで残高取得
- 数値フォーマット（USDC 6桁精度）
- ローディング状態とエラーハンドリング

### 3. DepositPage（/vault/deposit）

**責務**:
- 入金額入力フォーム
- 入金トランザクション実行
- 結果表示

**実装の要点**:
- バリデーション（正の数、最小額）
- トランザクション署名確認
- Privacy Cash統合（モック対応可）

### 4. WithdrawPage（/vault/withdraw）

**責務**:
- 出金額入力フォーム
- 残高チェック
- 出金トランザクション実行

**実装の要点**:
- 残高を超えないバリデーション
- 出金後の残高更新
- Privacy Cash統合（モック対応可）

### 5. ScheduledTransfersPage（/vault/transfers）

**責務**:
- 定期送金一覧表示
- 新規設定フォーム
- キャンセル機能

**実装の要点**:
- ローカルストレージから送金先情報を取得
- 周期オプション（時間、日、週、月）
- 確認ダイアログ

### 6. HistoryPage（/vault/history）

**責務**:
- 履歴一覧表示
- フィルタリング
- ページネーション

**実装の要点**:
- 種類別のアイコン・ラベル
- 日付フォーマット
- 無限スクロールまたはページネーション

## データフロー

### 入金フロー
```
1. ユーザーが金額を入力
2. DepositPage → useVault.deposit(amount)
3. VaultProvider → vaultClient.deposit(params)
4. vault-sdk → Privacy Cash depositPrivateUSDC()
5. vault-sdk → registerDeposit() on-chain
6. 完了 → 残高表示更新
```

### 出金フロー
```
1. ユーザーが金額を入力
2. WithdrawPage → useVault.withdraw(amount)
3. VaultProvider → vaultClient.withdraw(params)
4. vault-sdk → withdraw() on-chain
5. vault-sdk → Privacy Cash withdrawPrivateUSDC()
6. 完了 → 残高表示更新
```

### 定期送金設定フロー
```
1. ユーザーが設定を入力（事業者アドレス、金額、周期）
2. ScheduledTransfersPage → useVault.setupRecurringPayment(params)
3. VaultProvider → vaultClient.setupRecurringPayment(params)
4. vault-sdk → setupTransfer() on-chain
5. vault-sdk → ローカルストレージに送金先保存
6. 完了 → 一覧更新
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
// lib/errors.ts
export class VaultError extends Error {
  constructor(
    message: string,
    public code: VaultErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

export enum VaultErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  PRIVACY_CASH_ERROR = 'PRIVACY_CASH_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
```

### エラーハンドリングパターン

- try-catchでSDKエラーをキャッチ
- VaultErrorに変換してUIに伝播
- トーストまたはアラートでユーザーに通知
- リトライ可能なエラーは再試行ボタンを表示

## テスト戦略

### ユニットテスト
- VaultProviderのコンテキスト値
- カスタムフックのロジック
- ユーティリティ関数（フォーマット、バリデーション）

### 統合テスト
- 入金フロー（モックSDK）
- 出金フロー（モックSDK）
- 定期送金設定フロー（モックSDK）

## 依存ライブラリ

```json
{
  "dependencies": {
    "@subly/vault-sdk": "workspace:*"
  }
}
```

**注意**: vault-sdkはworkspace参照。pnpm-workspace.yamlへの追加が必要。

## ディレクトリ構造

```
apps/dashboard-user/
├── app/
│   ├── vault/
│   │   ├── page.tsx              # Vault概要
│   │   ├── deposit/
│   │   │   └── page.tsx          # 入金
│   │   ├── withdraw/
│   │   │   └── page.tsx          # 出金
│   │   ├── transfers/
│   │   │   └── page.tsx          # 定期送金一覧
│   │   └── history/
│   │       └── page.tsx          # 決済履歴
│   └── ...
├── components/
│   ├── vault/
│   │   ├── index.ts              # バレルエクスポート
│   │   ├── BalanceCard.tsx       # 残高カード
│   │   ├── YieldCard.tsx         # 利回りカード
│   │   ├── DepositForm.tsx       # 入金フォーム
│   │   ├── WithdrawForm.tsx      # 出金フォーム
│   │   ├── TransferCard.tsx      # 定期送金カード
│   │   ├── TransferSetupForm.tsx # 定期送金設定フォーム
│   │   └── HistoryItem.tsx       # 履歴アイテム
│   └── ...
├── hooks/
│   ├── useVault.ts               # Vaultコンテキストフック
│   ├── useVaultBalance.ts        # 残高取得フック
│   ├── useScheduledTransfers.ts  # 定期送金一覧フック
│   └── useTransferHistory.ts     # 履歴取得フック
├── providers/
│   ├── VaultProvider.tsx         # Vaultプロバイダー
│   └── ...
└── lib/
    ├── errors.ts                 # エラー定義
    └── format.ts                 # フォーマットユーティリティ
```

## 実装の順序

1. **フェーズ1: 基盤構築**
   - pnpm-workspace.yamlの更新
   - package.jsonへのvault-sdk追加
   - VaultProvider実装
   - useVaultフック実装

2. **フェーズ2: Vault概要画面**
   - useVaultBalanceフック実装
   - BalanceCard, YieldCardコンポーネント
   - /vaultページ実装

3. **フェーズ3: 入金・出金機能**
   - DepositForm, WithdrawFormコンポーネント
   - /vault/deposit, /vault/withdrawページ実装
   - エラーハンドリング

4. **フェーズ4: 定期送金機能**
   - useScheduledTransfersフック実装
   - TransferCard, TransferSetupFormコンポーネント
   - /vault/transfersページ実装

5. **フェーズ5: 履歴機能**
   - useTransferHistoryフック実装
   - HistoryItemコンポーネント
   - /vault/historyページ実装

6. **フェーズ6: ナビゲーション統合**
   - Headerにvaultリンク追加
   - 全体的なナビゲーション調整

## セキュリティ考慮事項

- 秘密値（secret）はローカルストレージに暗号化保存
- 送金先アドレスはオンチェーンに保存しない（ローカルのみ）
- Privacy Cash経由で送金元・金額を秘匿
- XSS対策（入力サニタイズ、dangerouslySetInnerHTML不使用）

## パフォーマンス考慮事項

- 残高取得はキャッシュ（5秒TTL）
- 履歴はページネーション（20件/ページ）
- SDKインスタンスはコンテキストでシングルトン管理
- 重い計算はWeb Worker検討（将来）

## 将来の拡張性

- Tuk Tuk完全統合（自動実行）
- Kamino Lending実統合
- バッチ証明補充フロー
- 多言語対応（i18n）
- ダークモード対応
