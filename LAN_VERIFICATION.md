# production buildのLAN確認

同一LAN上のiPhone、Android端末、PCからproduction buildを確認する手順。

## 1. LAN確認用build

```powershell
npm run build:lan
```

このコマンドはproduction buildを作成し、検証用の
`sample1.json` を次へコピーしてSHA-256一致を確認する。

```text
dist/data/dictation/melody/sample1.json
```

LAN buildでは `VITE_DATA_BASE_URL` を
`./data/dictation/melody` に設定する。別URLを使う場合は、
実行前に環境変数で上書きできる。

```powershell
$env:VITE_DATA_BASE_URL='http://192.168.1.20:9000/melody'
npm run build:lan
```

## 2. LANへ配信

```powershell
npm run preview:lan
```

Windowsの `ipconfig` でPCのIPv4アドレスを確認し、同じLANの端末で
次を開く。

```text
http://<PCのIPv4アドレス>:4173/?id=sample1
```

Windows Defender Firewallの確認が出た場合は、使用中の
プライベートネットワークだけ許可する。

## 3. 確認項目

- 練習→試験→練習で操作ボタンが毎回表示される
- 試験開始前と実行中だけ譜面が非表示になる
- 練習再生、停止、試験開始、試験中止が動作する
- 調、速度、小節範囲、音色を変更できる

iOSはSafari 16.4以降を推奨する。Safari 16.3以前は
ベストエフォートであり、完全な動作保証対象外とする。

## Screen Wake Lockの制約

`http://192.168...` のLAN URLはsecure contextではないため、
Screen Wake Lock API自体は確認できない。このURLでは、試験モードに
HTTPSが必要という案内が表示されることだけを確認する。

画面消灯防止と非表示時中止の実機確認は
`HTTPS_WAKE_LOCK_VERIFICATION.md` の手順で行う。
