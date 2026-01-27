# 要求定義: 資金フロー実装

## 背景

プライバシーアーキテクチャ再設計（20260127-privacy-architecture-redesign）において、プライバシー保護のためのオンチェーン構造とSDKは実装完了した。しかし、**実際の資金移動（SPLトークン転送）とKamino統合がオンチェーンプログラムに未実装**であることが判明した。

現状は「帳簿上のシェア管理」のみで、実際のUSDCは移動していない。

## 要求事項

### 1. 入金時の資金フロー

ユーザーが入金した際に、以下が実現されること：

1. Privacy Cash → Shield Pool ATA への入金が検証される
2. Shield Pool ATA に入金されたUSDCがKaminoにDepositされる
3. `total_pool_value` と `total_shares` が正しく更新される

```
ユーザー → Privacy Cash → Shield Pool ATA → Kamino Deposit
                                ↓
                        シェア発行 + 状態更新
```

### 2. 引き出し時の資金フロー

ユーザーが引き出す際に、以下が実現されること：

1. ユーザーのシェアに応じた金額（元本 + Kamino収益）が計算される
2. 必要額がKaminoからWithdrawされる
3. Shield Pool ATAからPrivacy Cash経由でユーザーに送金される
4. `total_pool_value` と `total_shares` が正しく更新される

```
Kamino Withdraw → Shield Pool ATA → Privacy Cash → ユーザー
                        ↓
                シェア消却 + 状態更新
```

### 3. 定期送金時の資金フロー

定期送金が実行される際に、以下が実現されること：

1. ユーザーのシェアから送金額分が差し引かれる
2. 必要額がKaminoからWithdrawされる
3. Shield Pool ATAからPrivacy Cash経由で事業者に送金される
4. 送金先（事業者）のプライバシーは維持される

```
Kamino Withdraw → Shield Pool ATA → Privacy Cash → 事業者
                        ↓
                シェア消却 + 状態更新
```

### 4. Kamino収益の反映

- `total_pool_value` がKaminoの収益を反映して増加する
- ユーザーのシェア価値が自動的に増加する
- 定期的な `total_pool_value` の更新メカニズム

## 受け入れ条件

### 入金

- [ ] 入金額がShield Pool ATAに正しく入金される
- [ ] 入金額がKaminoにDepositされる
- [ ] シェアが正しく計算・発行される
- [ ] プライバシー（入金者アドレスの秘匿）が維持される

### 引き出し

- [ ] シェアに応じた正しい金額が引き出せる
- [ ] Kamino収益が含まれた金額が引き出せる
- [ ] プライバシーが維持される

### 定期送金

- [ ] 設定した金額が正しく送金される
- [ ] Kamino収益から送金される（元本を超えた送金も可能）
- [ ] 送金先のプライバシーが維持される

### Kamino統合

- [ ] 入金時に自動的にKaminoにDepositされる
- [ ] 引き出し/送金時に必要額がKaminoからWithdrawされる
- [ ] 収益が `total_pool_value` に反映される

## 制約事項

- Privacy Cashの制約（Mainnetのみ、手数料あり）
- Kamino SDKのAPIバージョン依存
- オンチェーンプログラムのサイズ制限（CPI呼び出しの複雑さ）
- トランザクションサイズ制限（1232バイト）

## 優先度

**高** - 現状では資金が実際に移動しないため、プロダクトとして機能しない
