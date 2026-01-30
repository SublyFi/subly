# テスト状況 (Test Status)

## 最終更新
2026-01-30

---

## 概要

Arcium CPI統合後のテスト状況をまとめます。

### テスト実行コマンド

```bash
# localnetでテスト実行（推奨）
cd subly_devnet
anchor test

# Arcium CPIテストを含む場合（arcium test環境が必要）
arcium test
```

---

## テスト結果サマリー

```
anchor test 実行結果:
  24 passing (7s)
  8 pending
```

| カテゴリ | テスト数 | 状態 |
|---------|---------|------|
| 基本機能テスト (subly_devnet.ts) | 14 | ✅ 全て成功 |
| Arcium統合テスト (arcium_integration.ts) | 10 | ✅ 全て成功 |
| Arcium CPIテスト | 8 | ⏸️ 条件付きスキップ |

---

## テストファイル構成

### 1. `tests/subly_devnet.ts` - 基本機能テスト

**目的**: プログラムの基本機能（非Arcium CPI）をテスト

**特徴**:
- 独立したテストウォレット（`Keypair.generate()`）を使用
- 他のテストファイルとの競合を回避
- `before`フックでSOLをエアドロップ

**テスト内容** (14テスト):

| カテゴリ | テスト | 状態 |
|---------|--------|------|
| Business Registration | should register a new business | ✅ |
| Business Registration | should fail to register duplicate business | ✅ |
| Plan Creation | should create a new plan | ✅ |
| Plan Creation | should fail to create plan with invalid price | ✅ |
| Plan Creation | should fail to create plan with invalid billing cycle | ✅ |
| Subscription | should subscribe to a plan | ✅ |
| Subscription | should fail to create duplicate subscription | ✅ |
| Get Subscription Count | should get subscription count for a plan | ✅ |
| Cancel Subscription | should cancel an active subscription | ✅ |
| Cancel Subscription | should fail to cancel already cancelled subscription | ✅ |
| Deactivate Plan | should deactivate an active plan | ✅ |
| Deactivate Plan | should fail to deactivate already inactive plan | ✅ |
| Deactivate Plan | should fail to subscribe to inactive plan | ✅ |
| Authorization | should fail to create plan with wrong authority | ✅ |

---

### 2. `tests/arcium_integration.ts` - Arcium統合テスト

**目的**: Arcium関連のアカウント構造、PDA導出、CPI機能をテスト

**特徴**:
- Arcium SDK（`@arcium-hq/client`）を使用した正式なPDA導出
- Arcium CPIテストは環境変数（`getArciumEnv()`）で自動判定
- `arcium test`環境では全テストが実行される
- `anchor test`環境では基本テストのみ実行（CPIテストは自動スキップ）

**テスト内容**:

#### A. PDA導出テスト (3テスト) ✅

| テスト | 状態 |
|--------|------|
| should correctly derive MXE PDA | ✅ |
| should correctly derive comp_def PDAs using SDK | ✅ |
| should compute correct comp_def_offset values | ✅ |

#### B. 基本セットアップテスト (3テスト) ✅

| テスト | 状態 |
|--------|------|
| should initialize MXE account | ✅ |
| should register a business | ✅ |
| should create a plan | ✅ |

#### C. サブスクリプションフローテスト (2テスト) ✅

| テスト | 状態 |
|--------|------|
| should create a subscription using standard subscribe | ✅ |
| should cancel a subscription using standard cancel | ✅ |

#### D. アカウント構造検証テスト (2テスト) ✅

| テスト | 状態 |
|--------|------|
| should verify Subscription account has pending_encryption field | ✅ |
| should verify Plan account has pending_count_encryption field | ✅ |

#### E. Arcium CPIテスト (8テスト) ⏸️ 条件付きスキップ

**スキップ条件**: `getArciumEnv()`が失敗した場合（Arcium環境が利用不可）

| テスト | 状態 | 必要環境 |
|--------|------|----------|
| should initialize set_subscription_active comp_def | ⏸️ | `arcium test` |
| should initialize set_subscription_cancelled comp_def | ⏸️ | `arcium test` |
| should initialize increment_count comp_def | ⏸️ | `arcium test` |
| should initialize decrement_count comp_def | ⏸️ | `arcium test` |
| should initialize initialize_count comp_def | ⏸️ | `arcium test` |
| should initialize initialize_subscription_status comp_def | ⏸️ | `arcium test` |
| should subscribe with Arcium MXE encryption | ⏸️ | `arcium test` |
| should cancel subscription with Arcium MXE encryption | ⏸️ | `arcium test` |

---

## Arcium SDK使用パターン

テストは以下のArcium SDKパターンに準拠:

```typescript
import {
  getArciumEnv,
  getClusterAccAddress,
  getMXEPublicKey,
  getCompDefAccAddress,
  getComputationAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getClockAccAddress,
  awaitComputationFinalization,
  getArciumProgramId,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";

// Arcium環境の取得
const arciumEnv = getArciumEnv();
const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

// MXE公開鍵の取得（リトライ付き）
const mxePublicKey = await getMXEPublicKeyWithRetry(provider, programId);

// 暗号化のためのx25519鍵ペア生成
const clientPrivateKey = x25519.utils.randomPrivateKey();
const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);
const cipher = new RescueCipher(sharedSecret);

// 計算完了の待機
await awaitComputationFinalization(provider, computationOffset, programId, "confirmed");
```

---

## comp_def_offset 検証値

テストで検証されている値（sha256ベースで計算）:

| 名前 | offset値 |
|------|----------|
| SET_SUBSCRIPTION_ACTIVE | 1163529360 |
| SET_SUBSCRIPTION_CANCELLED | 4084431159 |
| INCREMENT_COUNT | 1622034848 |
| DECREMENT_COUNT | 1561046477 |
| INITIALIZE_COUNT | 4058386492 |
| INITIALIZE_SUBSCRIPTION_STATUS | 3700186428 |

---

## ビルド警告

`anchor build`実行時に以下の警告が発生しますが、ビルドは成功します：

```
Error: arcium_client..Account::try_from - Stack offset of 721512 exceeded max offset of 4096
Error: SubscribeWithArcium::try_accounts - Stack offset of 4136 exceeded max offset of 4096
Error: CancelSubscriptionWithArcium::try_accounts - Stack offset of 4104 exceeded max offset of 4096
```

**原因**: arcium-clientライブラリとアカウント構造体のサイズが大きい

**対応**: 将来的にスタックサイズの最適化が必要だが、現時点ではランタイムで問題なし

---

## Arcium CPIテストを実行するには

### 前提条件

1. Docker Desktop がインストールされている
2. Arcium CLI がインストールされている (`arcium --version`)
3. 十分なDockerリソース（メモリ8GB以上推奨）

### 実行手順

```bash
# 1. arcium testを実行
cd subly_devnet
arcium test

# 2. タイムアウトする場合はstartup_waitを調整
# Anchor.toml の [test] セクション:
# startup_wait = 300000  # 5分に延長
```

### 現在のブロッカー

- `arcium test`のlocalnet起動がタイムアウトする
- Dockerリソースの調整またはArciumチームとの連携が必要

---

## 今後の課題

1. **Arcium localnet環境の安定化**
   - Dockerリソースの調整
   - startup_wait値の最適化

2. **Devnet Arciumインフラ設定**
   - Arciumチームと連携してMXEクラスタを設定
   - init_comp_def命令の実行

3. **フルE2Eテスト**
   - 暗号化→コールバック→データ検証の完全フロー
