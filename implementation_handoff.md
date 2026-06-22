# 実装チャット・Git引き継ぎ計画

Status: Ready for implementation handoff

## 1. チャットの役割

### 実際のプロジェクト配置

```text
生成ツール:
C:\Users\kogu0\OneDrive\ドキュメント\dictation-content

Webアプリ:
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\app\dictation-player-json
```

両方とも独立したGitリポジトリとして扱う。生成物を受け渡す場合も、片方のCodexがもう片方のソースコードを同時に変更しない。

### リポジトリ間の受け渡し手順

1. `dictation-content` 側で生成と検証を完了し、同リポジトリへコミットする。
2. 制作側の完了報告に、コミットハッシュ、検証結果、生成した `sample1.json` の絶対パスを含める。
3. `dictation-player-json` 側で報告内容を確認し、生成物を `testdata/melody/sample1.json` へコピーする。
4. アプリ側のスキーマ検証とテストを実行し、差分を確認してからアプリ側リポジトリへコミットする。

制作側はアプリ側のファイルを直接変更せず、アプリ側も制作側の生成物やソースコードを直接修正しない。受け渡したJSONに問題がある場合は、制作側で修正・再生成・再コミットする。

### このチャット

設計の正本として継続する。

- 仕様判断
- データ契約変更
- タスク分割
- 実装結果を受けた設計の見直し

原則としてアプリや生成ツールのコードは実装しない。

### 実装チャットA: dictation-content

開始タイミング: 現在

対象:

- `codex_tasks.md` の `T-002`
- `codex_tasks.md` の `T-003` のうち、JSON生成まで
- `content_data_contract.md` の制作側実装

実装開始前に必要なもの:

- `dictation-content` プロジェクトの実際のディレクトリ
- そのプロジェクトのGit管理方針
- このリポジトリにある `content_data_contract.md` の参照またはコピー

実装チャットへ渡す依頼文:

```text
dictation-contentの実装を行います。
Webアプリのディレクトリは次です。
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\app\dictation-player-json

アプリ側で確定したデータ契約は、上記ディレクトリの
content_data_contract.md、spec.md、codex_tasks.mdにあります。
最初にこれらを読み、dictation-content側のspec.md、AGENTS.md、
codex_tasks.mdをschema_version 1の方針へ整合させてください。

現在のStep 8「Webアプリへの結合」を先に実行せず、
アプリ側codex_tasks.mdのT-002を先に実装してください。

追加対象は次です。
- 課題設定ファイル src/config/melody/{id}.json
- schema_version
- mode
- MEI／Verovio由来のmeasure_map
- SVG生成と同じ実移調量を示すkeys.*.semitones
- 課題設定由来のsequence
- 対応する検証とpytest

sample1をschema_version 1で再生成できるところまで進めてください。
生成物を手修正せず、課題設定ファイルとMEIから再現可能にしてください。
第4小節は12.0〜16.0であることを確認してください。

完了時は変更内容、検証結果、生成したsample1.jsonの要約を報告してください。
完了後にコミットしてください。Webアプリ側へのコピーはまだ行わず、
生成物の絶対パスを報告してください。
```

### 実装チャットB: dictation-player-json

開始タイミング:

1. [x] `T-002` が完了
2. [x] 新しい `sample1.json` が生成済み
3. [x] `T-003` のデータ契約検証が完了

開始可能日: 2026-06-21

確定した生成物:

```text
C:\Users\kogu0\OneDrive\ドキュメント\dictation-content\dist\melody\sample1.json
```

- dictation-content commit: `5651ca0`
- size: 375,686 bytes
- pytest: 24 passed

対象:

- 最初に `T-003` のアプリ側配置を完了
- 続いて `T-101` 以降のWebアプリ実装

実装チャットへ渡す依頼文:

```text
dictation-player-jsonの実装を行います。
spec.md、content_data_contract.md、AGENTS.md、codex_tasks.mdを正本として、
最初にT-003の残作業を行い、その後T-101から順番に実装してください。

schema v1の生成済みsample1は次です。
C:\Users\kogu0\OneDrive\ドキュメント\dictation-content\dist\melody\sample1.json

これをこのリポジトリの
testdata/melody/sample1.json
へコピーし、コピー前後のSHA-256が一致することを確認してください。
JSONの内容は手修正しないでください。

T-003の配置完了を独立コミットにしてください。
推奨コミットメッセージ:
data: update sample1 to schema v1

まず「JSON読込→譜面表示→三角波で全曲再生→停止」の最小縦断を完成させ、
各タスクの完了条件を確認しながら進めてください。
仕様変更が必要な場合は実装を進めず、設計チャットへ戻す論点を整理してください。
```

## 2. Gitのタイミング

### 現在の状態

2026-06-21時点で、`dictation-player-json` は独立Gitリポジトリとして初期化済みである。`dictation-content` とWebアプリはリリース単位、依存関係、作業履歴が異なるため、引き続き別々のGitリポジトリとして管理する。

### 推奨コミット地点

#### Player checkpoint 1: 設計ベースライン

タイミング: 今

対象:

- `spec.md`
- `content_data_contract.md`
- `AGENTS.md`
- `codex_tasks.md`
- `implementation_handoff.md`
- 現行 `testdata/melody/sample1.json`

推奨コミットメッセージ:

```text
docs: define dictation player v1 architecture and data contract
```

#### Content checkpoint 1: 制作側契約

タイミング: `T-002` 完了時

対象:

- 課題設定ファイル形式
- スキーマ検証
- `measure_map`
- `semitones`
- `sequence` 統合
- 自動テスト

推奨コミットメッセージ:

```text
feat: generate player schema v1 data
```

#### Content checkpoint 2: sample1

タイミング: `sample1.json` の再生成と検証完了時

推奨コミットメッセージ:

```text
data: add schema v1 sample melody
```

#### Player checkpoint 2: 最小縦断

タイミング: `T-101`〜`T-104` 完了時

推奨コミットメッセージ:

```text
feat: add initial score loading and synth playback
```

#### Player checkpoint 3: 練習機能

タイミング: `T-201`〜`T-204` 完了時

推奨コミットメッセージ:

```text
feat: add practice playback controls
```

#### Player checkpoint 4: 試験機能

タイミング: `T-301`〜`T-303` 完了時

推奨コミットメッセージ:

```text
feat: add exam sequence playback
```

#### Player checkpoint 5: 公開準備

タイミング: `T-401`〜`T-404` 完了時

推奨コミットメッセージ:

```text
chore: prepare dictation player release
```

## 3. ユーザー確認が必要になる地点

### 現在必要

- [x] `dictation-content` のプロジェクトディレクトリを指定する
- [x] `dictation-player-json` をGit初期化し、初回コミットする
- `dictation-content` のCodexへ本書の依頼文を渡す
- `dictation-content` のschema v1対応が終わるまで、アプリ実装は原則待機する

例外として、アプリ実装チャットは `T-101` のVite／TypeScript初期化だけ先行してよい。JSONローダー以降は新しいsample1が生成されてから進める。

### 後で必要

- ピアノ音源を追加する段階で、音源ライセンスと配布方法を決める
- iOS Safariなど実機で音を確認する
- 本番サーバーへ `/data/dictation/melody/` を配置する
- 公開前に実際のURLとキャッシュ設定を確認する

## 4. 設計チャットへ戻す条件

実装中に次が発生した場合は、コード側だけで決めずこの設計チャットへ戻す。

- Verovioの実移調が設計した半音数と一致しない
- MEI／timemapから小節終了時刻を取得できない
- `sequence` に新しいstep typeが必要
- JSONの必須項目を増減する必要がある
- 試験手順や画面挙動を変更する必要がある
- 外部ライブラリやサーバー処理が必要になる

## 5. 現在の追加実装依頼: iOS Safari互換性

```text
codex_tasks.mdのT-403Aを実装してください。

背景:
古いiOS Safariで、試験モードへ切り替えると試験開始・中止ボタンが消え、
練習モードへ戻しても練習UIが復帰しませんでした。
Android Chromeでは問題ありません。
音声開始前に起きるため、まずUI/CSS互換性として修正します。

必須対応:
- .mode-controlsのdisplay: contentsを廃止
- 通常のGridまたはFlexでレイアウトを維持
- 練習→試験→練習の往復表示を回帰テスト
- Vite build targetをbaseline-widely-availableへ変更
- VITE_DATA_BASE_URL等で検証用データURLを上書き可能にする
- production buildをLAN配信してsample1を確認できる手順を用意
- 「iOS Safari 16.4以降推奨」の案内を追加

既存のPC Chromium・Android Chrome・試験sequenceの動作を壊さないでください。
テストとproduction buildを実行し、独立コミットにしてください。
完了後はコミットID、テスト件数、production確認手順を報告してください。
```

## 6. 現在の追加実装依頼: 試験中の画面消灯防止

```text
codex_tasks.mdのT-403Bを実装してください。

背景:
iOS Safariで試験中に画面が自動消灯するとWeb Audioが停止し、
次のsequence stepで
「AudioContextが開始されていません」
というエラーになりました。

方針:
- バックグラウンド再生はサポートしない
- Screen Wake Lock APIで試験中の自動消灯を防止する
- documentが非表示になった場合は試験を安全に中止する
- 復帰時に試験やAudioContextを自動再開しない

必須対応:
- Wake Lock処理をUIや試験ランナーから分離したモジュールにする
- 試験開始時にrequest("screen")
- 終了、中止、エラー、モード切替時にrelease
- releaseイベントとvisibilitychangeを処理
- hidden時はsequenceと発音を中止し、中止理由を表示
- 非対応・取得失敗時は、自動ロックを無効化する案内を表示
- 練習モードはWake Lock非対応でも利用可能
- 対応する単体テスト

注意:
Screen Wake Lock APIはHTTPSのsecure contextが必要です。
現在のhttp://192.168...によるLAN確認ではAPI自体を検証できません。
コードとproduction buildを完成させ、HTTPS環境での実機確認を残してください。

テストとproduction buildを実行し、独立コミットにしてください。
完了後はコミットID、テスト件数、HTTPS実機確認に必要な手順を報告してください。
```

## 7. T-404公開準備

ローカルで完了済み:

- production build
- `/app/dictation-player-json/` サブパス検証
- `/data/dictation/melody/sample1.json` 取得検証
- JSON Content-Type確認
- gzip／Brotliサイズ測定
- 公開手順 `DEPLOYMENT.md`

ユーザー側の情報・操作が必要:

1. [x] 利用中のホスティング: CORESERVER
2. [x] 実際のドメイン: `seegmund-music-labo.com`
3. [x] サーバーへのアップロード方法: FTP
4. FTP上のドキュメントルートを確認
5. 公開先へアプリとsample1を配置
6. `.htaccess` またはレスポンスヘッダー設定の要否を公開後に判断

公開後に設計チャットで確認する項目:

- HTTPS
- JSONのContent-Type
- gzip／Brotli
- Cache-Control
- アプリからのJSON取得
- iOS Safari 16.4以降のScreen Wake Lock

サイト側の `/data/dictation/README.md` は旧スキーマのため、`PUBLIC_DATA_README_DRAFT.md` を基に別作業で更新する。

## 8. 現在の実装依頼: FTP公開パッケージ

```text
codex_tasks.mdのT-405を実装してください。

目的:
CORESERVERへFTPアップロードする最終公開パッケージを、
毎回同じ手順で安全に生成できるようにします。

必須対応:
- index.htmlへ meta name="robots" content="noindex" を追加
- npm run release:ftp を追加
- production buildを実行
- release/ftp-root/app/dictation-player-json/ にdistの中身を配置
- release/ftp-root/data/dictation/melody/sample1.json を配置
- dictation-content側生成物とのSHA-256一致確認
- RELEASE_MANIFEST.txtへファイル一覧とSHA-256を出力
- release/を.gitignoreへ追加
- 公開パッケージにsrc、tests、node_modules等が含まれないことを検証
- DEPLOYMENT.mdのFTP手順と整合させる
- 対応するテストを追加

生成元JSON:
C:\Users\kogu0\OneDrive\ドキュメント\dictation-content\dist\melody\sample1.json

注意:
- サーバーへのFTPアップロード自体は行わない
- .htaccessはまだ公開パッケージへ含めない
- 既存の/app/や/data/を削除する設計にしない

テスト、production build、release:ftpを実行し、独立コミットしてください。
完了後はコミットID、テスト件数、release/ftp-rootのファイル一覧、
manifestのJSON SHA-256を報告してください。
```
