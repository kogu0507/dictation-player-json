# dictation-player-json

JSON駆動の旋律・和声聴音プレイヤーです。

## 関連リポジトリ

- [dictation-content](https://github.com/kogu0507/dictation-content): MEIと課題設定から公開用JSONを生成する。
- [dictation-player-json](https://github.com/kogu0507/dictation-player-json): このプレイヤー本体。

## 公開パッケージ

通常の melody+harmony パッケージは `npm run release:ftp`、単旋律だけを安全に公開するパッケージは `npm run release:ftp:melody-only` で生成する。詳しいFTP手順、アップロード対象、確認方法は [DEPLOYMENT.md](DEPLOYMENT.md) を参照する。

## 調名の表示

JSONのキー値と移調計算は英字調名のまま保持する。UIだけが表示用フォーマッターを使い、`ト長調（G）` のように表示する。flat/sharpの綴りは異名同音へ置換せず、それぞれ `変` / `嬰` として表示する。
