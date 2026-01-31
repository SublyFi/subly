# 要求定義書: Arcium CPI統合（技術負債解消）

## 概要

Arcium MXE統合において未実装となっている`queue_computation` CPI呼び出しを実装し、暗号化処理を実際に動作させる。

## 背景

### 現状の問題

1. **Arcis回路は実装済み**だが、プログラムからArciumネットワークに計算をリクエストする`queue_computation` CPIが未実装
2. **コールバック関数は実装済み**だが、計算がキューされないため呼び出されない
3. **暗号化フィールドは常にゼロ**で、実際の暗号化処理が行われていない

### 現在の動作（問題あり）

```
subscribe()
    ↓
encrypted_status = [0u8; 64]  ← ゼロ埋めのまま
status_nonce = [0u8; 16]      ← ゼロ埋めのまま
    ↓
（Arciumへのリクエストなし）
    ↓
コールバック呼び出しなし
```

### 期待する動作

```
subscribe()
    ↓
queue_computation(set_subscription_active)  ← CPIでArciumに計算リクエスト
    ↓
Arciumネットワークで暗号化計算実行
    ↓
subscribe_status_callback()  ← Arciumからコールバック
    ↓
encrypted_status = [暗号化データ]  ← 実際の暗号化結果
```

## 要求事項

### 機能要件

#### R1: queue_computation CPI実装

- [ ] `subscribe`命令から`set_subscription_active`回路への計算リクエスト
- [ ] `cancel_subscription`命令から`set_subscription_cancelled`回路への計算リクエスト
- [ ] プラン作成時の`initialize_count`回路への計算リクエスト
- [ ] 新規契約時の`increment_count`回路への計算リクエスト
- [ ] 解約時の`decrement_count`回路への計算リクエスト

#### R2: アカウント構造の整備

- [ ] `QueueCompAccs`トレイトを実装したアカウント構造体の作成
- [ ] Arciumプログラムとの連携に必要なアカウント（cluster, computation等）の定義
- [ ] 既存の命令構造体への追加アカウント統合

#### R3: マクロ互換性の解決

- [ ] `#[arcium_program]`と`#[program]`の競合問題の解決
- [ ] または、`#[program]`を維持したままCPI呼び出しを行う方法の確立

### 非機能要件

#### NR1: 後方互換性

- 既存のSDKメソッド（`subscribe()`, `cancelSubscription()`等）の署名は維持
- 追加のアカウントが必要な場合はSDK内部で自動取得

#### NR2: テスト可能性

- ローカル環境（`arcium test`）でのテスト実行が可能
- Devnetでのエンドツーエンドテストが可能

## 受け入れ条件

1. `subscribe`命令実行後、`encrypted_status`フィールドに実際の暗号化データが格納される
2. `cancel_subscription`命令実行後、暗号化されたキャンセルステータスに更新される
3. `create_plan`命令実行後、`encrypted_subscription_count`がゼロの暗号化値で初期化される
4. 事業者が契約数を取得する際、暗号化された値を復号できる（許可された場合のみ）

## スコープ外

- `#[arcium_callback]`マクロの完全統合（手動コールバック実装で代替可能）
- 新しいArcis回路の追加（既存回路のみを使用）
- SDK UIの変更

## 技術的制約

1. Arcium Devnetのみで動作（Mainnet未対応）
2. Arciumクラスタオフセット: `456`
3. 現在のProgram ID: `2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA`

## 参考資料

- [Arcium Documentation](https://docs.arcium.com/)
- [Arcium Examples Repository](https://github.com/arcium-hq/examples)
- 既存タスクリスト: `.steering/20260127-arcium-mxe-integration/tasklist.md`
