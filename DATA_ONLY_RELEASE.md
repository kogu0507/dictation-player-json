# 任意IDの旋律JSONをデータ単体で公開する

## 目的

既存アプリを再ビルドせず、`dictation-content` が生成した1件の旋律JSONだけをFTP追加公開する。

## 前提

対象JSONは `dictation-content` のビルド生成物であり、手作業で編集しない。

既定のローカル配置:

```text
../dictation-content/dist/melody/<id>.json
```

別配置を使う場合:

```powershell
$env:DICTATION_CONTENT_MELODY_DIR = "C:\path\to\dictation-content\dist\melody"
```

## パッケージ生成

```powershell
npm run release:data -- --id melody001
```

許可するID文字は半角英数字、ハイフン、アンダースコアだけとする。

生成物:

```text
release/
└─ ftp-root/
   ├─ data/
   │  └─ dictation/
   │     └─ melody/
   │        └─ melody001.json
   └─ RELEASE_MANIFEST.txt
```

スクリプトは生成元JSONと公開パッケージ内JSONのSHA-256一致を確認する。アプリ本体、他の教材JSON、ソース、テスト、依存パッケージは含めない。

## FTPアップロード

`ftp-root/` 自体を置換せず、その中の `data/` を既存ドキュメントルートへ統合する。

重要:

- `/data/` や `/data/dictation/melody/` 全体を削除しない。
- FTPソフトの「転送元にないファイルを削除する」「ミラー削除」等を無効にする。
- 指定した `<id>.json` だけを追加または更新する。
- `RELEASE_MANIFEST.txt` は照合用としてローカルに保持し、サーバーへアップロードしない。

## 公開後確認

例:

```text
https://seegmund-music-labo.com/data/dictation/melody/melody001.json
https://seegmund-music-labo.com/app/dictation-player-json/?id=melody001
```

確認項目:

1. JSON URLがHTTP 200で取得できる。
2. プレイヤーURLが対象IDを読み込める。
3. 原調・移調・速度変更・小節範囲再生が動作する。
4. 既存の `sample1` や他教材が削除されていない。
5. JSONを更新した場合、古いキャッシュが残っていない。

## 一般公開用の旋律聴音ID

```text
melody001
melody002
melody003
```
