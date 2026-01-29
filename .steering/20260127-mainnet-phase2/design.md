# 設計書

## アーキテクチャ概要

SDK経由での外部プロトコル統合アーキテクチャを採用。オンチェーンプログラム（Rust）はシェア管理に特化し、Privacy Cash/Kamino/Tuk Tukとの連携はTypeScript SDKレイヤーで実行。

```
┌─────────────────────────────────────────────────────────────┐
│                      ユーザーアプリ                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    vault-sdk (TypeScript)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ privacy-cash│  │   kamino    │  │   tuktuk    │          │
│  │    .ts      │  │    .ts      │  │    .ts      │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │ privacycash │  │ klend-sdk   │  │ cron-sdk    │          │
│  │  npm pkg    │  │  npm pkg    │  │  npm pkg    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Solana Programs                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Privacy Cash│  │   Kamino    │  │   Tuk Tuk   │          │
│  │  Program    │  │  Lending    │  │   Cron      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │              Subly Vault Program                 │        │
│  │         (シェア管理・コミットメント)             │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 1. Privacy Cash統合モジュール (`privacy-cash.ts`)

**責務**:
- Privacy Cash SDKのラッパー
- USDCのプライベート入出金
- プライベート残高の取得

**実装の要点**:
- Privacy Cash SDKはNode.js 24以上が必要
- MainnetのみサポートDevnetなし）
- オフチェーンメッセージ署名が必要（キー導出用）
- 手数料: 出金時 0.35% + 0.006 SOL

```typescript
interface PrivacyCashIntegration {
  depositPrivateUSDC(amount: number): Promise<{ tx: string }>;
  withdrawPrivateUSDC(amount: number, recipient?: string): Promise<WithdrawResult>;
  getPrivateUSDCBalance(): Promise<number>;
}
```

### 2. Tuk Tuk統合モジュール (`tuktuk.ts`)

**責務**:
- Cronジョブの作成・管理・削除
- 定期送金の自動トリガー
- 手動実行フォールバック

**実装の要点**:
- Tuk Tukは監査中（2026年1月時点）
- 手動実行モードをデフォルトに
- Cronジョブへの資金追加が必要

```typescript
interface TukTukIntegration {
  createCronJob(schedule: string, targetInstruction: TransactionInstruction): Promise<{ cronJobPda: PublicKey }>;
  fundCronJob(cronJobPda: PublicKey, amount: number): Promise<{ tx: string }>;
  closeCronJob(cronJobPda: PublicKey): Promise<{ tx: string }>;
  checkPendingTransfers(): Promise<PendingTransfer[]>;
  executePendingTransfer(transferId: string): Promise<{ tx: string }>;
}
```

### 3. Kamino統合モジュール (`kamino.ts`)

**責務**:
- Kamino LendingへのUSDC預け入れ・引き出し
- 利回り情報の取得

**実装の要点**:
- `KaminoAction` または `KaminoManager` を使用
- V2命令を優先
- Obligationアカウントの管理

```typescript
interface KaminoIntegration {
  depositToKamino(amount: number): Promise<{ tx: string }>;
  withdrawFromKamino(amount: number): Promise<{ tx: string }>;
  getKaminoYieldInfo(): Promise<{ apy: number; earnedYield: number }>;
}
```

### 4. client.ts更新

**責務**:
- 外部統合モジュールの統合
- 既存メソッドとの連携

**変更点**:
- `deposit()` で Privacy Cash `depositSPL()` を呼び出し
- `withdraw()` で Privacy Cash `withdrawSPL()` を呼び出し
- `setupRecurringPayment()` で Tuk Tuk Cronジョブを作成
- `getYieldInfo()` で Kamino APYを取得

## データフロー

### プライベート入金フロー
```
1. ユーザーがdepositPrivateUSDC(amount)を呼び出し
2. Privacy Cash SDKがオフチェーン署名を要求
3. Privacy Cash depositSPL()が実行
4. ZKプルーフが生成され、コミットメントが作成
5. Subly Vaultでシェアが計算・記録
6. トランザクション完了
```

### 定期送金フロー（手動実行モード）
```
1. ユーザーがsetupRecurringPayment()を呼び出し
2. ScheduledTransfer PDAが作成
3. （オプション）Tuk Tuk Cronジョブが作成
4. 支払い期日が来たら checkPendingTransfers() で確認
5. executePendingTransfer() を手動で呼び出し
6. Kamino withdraw → Privacy Cash withdrawSPL → 送金完了
```

### 定期送金フロー（自動実行モード）
```
1. ユーザーがsetupRecurringPayment()を呼び出し
2. ScheduledTransfer PDAが作成
3. Tuk Tuk Cronジョブが作成
4. Cronスケジュールに従ってTuk Tukがトリガー
5. execute_transfer命令が自動実行
6. Kamino withdraw → Privacy Cash withdrawSPL → 送金完了
```

## エラーハンドリング戦略

### カスタムエラークラス

```typescript
class PrivacyCashError extends Error {
  constructor(message: string, public code: string) {
    super(`Privacy Cash Error: ${message}`);
  }
}

class TukTukError extends Error {
  constructor(message: string, public code: string) {
    super(`Tuk Tuk Error: ${message}`);
  }
}

class KaminoError extends Error {
  constructor(message: string, public code: string) {
    super(`Kamino Error: ${message}`);
  }
}
```

### エラーハンドリングパターン

- SDK呼び出し時はtry-catchでラップ
- リトライロジックを実装（最大3回）
- 詳細なエラーログを出力

## テスト戦略

### ユニットテスト
- シェア計算ロジック
- PDA導出
- コミットメント生成

### 統合テスト（Mainnetのみ）
- Privacy Cash deposit/withdraw（少額: 0.01 USDC）
- Kamino deposit/withdraw（少額）
- 手動executeTransfer

## 依存ライブラリ

```json
{
  "dependencies": {
    "privacycash": "^1.1.7",
    "@helium/cron-sdk": "latest",
    "@helium/tuktuk-sdk": "latest",
    "@kamino-finance/klend-sdk": "latest"
  },
  "engines": {
    "node": ">=24.0.0"
  }
}
```

## ディレクトリ構造

```
packages/vault-sdk/src/
├── index.ts
├── client.ts                    # 更新
├── types/
│   └── index.ts
├── utils/
│   ├── pda.ts
│   ├── commitment.ts
│   ├── encryption.ts
│   └── index.ts
├── integrations/                # 新規ディレクトリ
│   ├── index.ts                 # 新規
│   ├── privacy-cash.ts          # 新規
│   ├── kamino.ts                # 新規
│   └── tuktuk.ts                # 新規
└── idl/
    └── subly_vault.ts

programs/subly-vault/src/integrations/
├── mod.rs                       # 更新（clockwork → tuktuk）
├── privacy_cash.rs              # 更新（プログラムID）
├── kamino.rs                    # 更新（ディスクリミネーター）
└── tuktuk.rs                    # 新規（clockwork.rsから移行）
```

## 実装の順序

1. **vault-sdk依存関係更新** - package.json更新
2. **Privacy Cash統合モジュール作成** - privacy-cash.ts
3. **Tuk Tuk統合モジュール作成** - tuktuk.rs（Rust）、tuktuk.ts（TS）
4. **Kamino統合モジュール作成** - kamino.ts
5. **client.ts統合更新** - 各モジュールの統合
6. **Rustプログラム更新** - プログラムID、ディスクリミネーター
7. **ビルド・テスト**

## セキュリティ考慮事項

- Privacy Cashの秘密鍵はユーザーのウォレットで管理
- SDKでは秘密鍵を一時的にしか保持しない
- Tuk Tukは監査中のため、手動実行モードをデフォルトに

## パフォーマンス考慮事項

- Privacy Cash SDKはUTXOをローカルキャッシュ
- Kamino APIはレート制限あり
- 複数トランザクションは並列実行可能

## 将来の拡張性

- 複数トークン対応（USDT等）
- 複数DeFiプロトコル対応
- Tuk Tuk監査完了後の完全自動化
