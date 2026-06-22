# dictation-player-json 公開手順

Status: v1 release candidate

## 0. 対象環境

```text
ホスティング: CORESERVER
ドメイン: seegmund-music-labo.com
アップロード: FTP
Webサーバー応答: LiteSpeed
```

2026-06-22時点で `https://seegmund-music-labo.com/` がHTTP 200で応答することを確認済み。

## 1. 公開URL

```text
アプリ:
https://<domain>/app/dictation-player-json/?id=sample1

課題データ:
https://<domain>/data/dictation/melody/sample1.json
```

今回の確定URL:

```text
https://seegmund-music-labo.com/app/dictation-player-json/?id=sample1
https://seegmund-music-labo.com/data/dictation/melody/sample1.json
```

production環境はHTTPSを必須とする。Screen Wake Lock APIを使う試験モードでは、HTTP配信を正式対応しない。

## 2. サーバー上の配置

```text
public_html/
├─ app/
│  └─ dictation-player-json/
│     ├─ index.html
│     └─ assets/
│        ├─ index-<hash>.js
│        └─ index-<hash>.css
└─ data/
   └─ dictation/
      └─ melody/
         └─ sample1.json
```

アプリディレクトリへ配置するのは `npm run build` で生成された `dist/` の中身だけとする。

次は公開しない。

- `src/`
- `tests/`
- `testdata/`
- `node_modules/`
- `package.json`
- 設計資料
- Git管理情報

課題JSONの正本は `dictation-content/dist/melody/` の生成物とする。アプリ側の `testdata/` を公開データの正本にしない。

FTPでは、`seegmund-music-labo.com` のドキュメントルートを基準に上記構成を作る。FTP接続直後の絶対パス名は契約・サーバー設定により異なるため、既存サイトの `index` がある場所をドキュメントルートとして確認する。

## 3. 公開前ビルド

```powershell
npm ci
npm test
npm run build
```

成功後、次を確認する。

- `dist/index.html`
- `dist/assets/index-<hash>.js`
- `dist/assets/index-<hash>.css`

`base: "./"` のため、アプリを `/app/dictation-player-json/` へ配置しても、JSとCSSは同じディレクトリを基準に読み込まれる。

最終公開では `npm run release:ftp` で作る次の構成を使用する。

```text
release/
└─ ftp-root/
   ├─ app/
   │  └─ dictation-player-json/
   ├─ data/
   │  └─ dictation/
   │     └─ melody/
   │        └─ sample1.json
   └─ RELEASE_MANIFEST.txt
```

FTPソフトでは `ftp-root/` 自体を1つのフォルダとしてアップロードするのではなく、その中の `app/` と `data/` をサーバーの既存ドキュメントルートへ統合する。

## 4. データ配置

`dictation-content` で生成する。

```text
C:\Users\kogu0\OneDrive\ドキュメント\dictation-content\dist\melody\sample1.json
```

生成物を次へ配置する。

```text
/data/dictation/melody/sample1.json
```

生成済みJSONをサーバー上で手作業修正しない。

## 5. 推奨HTTPヘッダー

### index.html

```text
Cache-Control: no-cache
Content-Type: text/html; charset=utf-8
```

### assets内のハッシュ付きJS・CSS

```text
Cache-Control: public, max-age=31536000, immutable
```

### 課題JSON

```text
Cache-Control: no-cache
Content-Type: application/json; charset=utf-8
```

JSONは同じURLで内容を更新するため、ブラウザへ長期固定キャッシュさせない。サーバーが毎回再検証する `no-cache` を推奨する。

無料ホスティング等でヘッダーを設定できない場合も、まず既定設定で公開し、実際のレスポンスヘッダーを確認してから対処する。

## 6. 圧縮

サーバー側でBrotliまたはgzipを有効にする。

2026-06-22のsample1測定値:

| 対象 | サイズ |
|---|---:|
| 非圧縮 | 375,686 bytes |
| gzip level 9 | 21,048 bytes |
| Brotli quality 11 | 12,083 bytes |

JSONの約92.3%は12調分のSVG文字列だが、圧縮効率が高い。v1ではSVG分離や独自ミニファイを行わない。

## 7. Apache設定例

利用中のサーバーが `.htaccess`、`mod_headers`、`mod_deflate` に対応する場合の例。サーバー仕様を確認してから使用する。

```apache
<IfModule mod_headers.c>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>

  <FilesMatch "\.json$">
    Header set Cache-Control "no-cache"
  </FilesMatch>

  <FilesMatch "\.(?:js|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>
```

この設定をそのまま設置することは必須ではない。ホスティング側でBrotli、gzip、キャッシュ制御が自動設定されている場合は重複させない。

CORESERVERの現在の応答はLiteSpeedである。まず設定ファイルを追加せずに公開し、実レスポンスの `Content-Encoding` と `Cache-Control` を確認する。不足が確認された場合だけ、CORESERVERで利用可能な `.htaccess` 設定を追加する。

## 8. 公開後確認

ブラウザの開発者ツールまたはHTTPヘッダー確認ツールで次を確認する。

- アプリURLがHTTPSで200
- JSとCSSが200
- JSONが200
- JSONの `Content-Type` が `application/json`
- JSONへgzipまたはBrotliが適用されている
- アプリが `/data/dictation/melody/sample1.json` を取得している
- JSとCSSのファイル名にハッシュがある
- HTMLとJSONが長期固定キャッシュされていない
- iOS Safari 16.4以降でWake Lockを利用できる
- プレイヤーHTMLに `noindex` がある

公開後の確認対象URL:

```text
https://seegmund-music-labo.com/app/dictation-player-json/?id=sample1
https://seegmund-music-labo.com/data/dictation/melody/sample1.json
```

## 9. 更新手順

アプリ更新:

1. テスト
2. production build
3. `dist/` の中身をアプリ公開先へ置換
4. アプリURLを再確認

課題データ更新:

1. `dictation-content` で再生成
2. JSON検証
3. `/data/dictation/melody/{id}.json` を置換
4. 本番URLから取得して内容を確認

課題JSON更新後に古い内容が残るサーバーでは、キャッシュヘッダーを修正する。場当たり的な手動キャッシュ削除だけを運用にしない。
