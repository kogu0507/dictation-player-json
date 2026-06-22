# codex_tasks.md

Status: Implementation
仕様の正本: `spec.md`
実装チャットとGitの切替: `implementation_handoff.md`

## 進行ルール

- `[ ]` 未着手、`[-]` 作業中、`[x]` 完了
- 各タスクは完了条件を満たしてから次へ進む
- アプリ実装とデータ生成ツールの変更を同じタスクに混在させない

## Phase 0: 仕様とデータ契約

### T-001 プロダクト判断を確定する

- [x] v1音源: Web Audio API組み込みシンセ
- [x] 既定音色: 三角波、切替音色: サイン波
- [x] 試験開始前・試験中は譜面を隠す
- [x] 練習速度: `0.75 / 1.0 / 1.25 / 1.5`
- [x] 試験速度: JSON指定BPM固定
- [x] 本番データURL: `/data/dictation/melody/{id}.json`

完了条件:

- [x] `spec.md` 12章に確定値が記載されている

### T-002 dictation-contentへ制作側データ契約を実装する

担当範囲: 別プロジェクト `dictation-content`

- [x] `src/config/melody/{id}.json` の読込
- [x] `authoring_version` と必須項目の検証
- [x] MEIから `mode` と `measure_map` を生成
- [x] 最短移調戦略と個別上書き
- [x] 各調の `semitones` を出力
- [x] 課題設定の `sequence` を検証して統合
- [x] `schema_version: 1` を出力

完了条件:

- [x] `content_data_contract.md` の生成時検証を満たす
- [x] 不正な課題設定では出力ファイルを作らない
- [x] 同じ入力から同じJSONを再生成できる

完了記録:

- 完了日: 2026-06-21
- dictation-content commit: `5651ca0`
- pytest: 24 passed
- 2回生成のSHA-256一致
- 生成物: `C:\Users\kogu0\OneDrive\ドキュメント\dictation-content\dist\melody\sample1.json`
- 生成物サイズ: 375,686 bytes

### T-003 sample1を再生成してアプリへ配置する

担当範囲: `dictation-content` で生成後、このプロジェクトのテストデータへ反映

進捗:

- [x] dictation-contentでschema v1のsample1を再生成
- [x] 生成物の契約項目を設計チャットで確認
- [x] `testdata/melody/sample1.json` へコピー
- [x] コピー元とコピー先のSHA-256一致確認
- [x] アプリ側Gitへコミット

完了条件:

- [x] `schema_version`、`mode`、`measure_map`、`semitones`、`sequence` が存在
- [x] 12調すべてでSVGと移調後pitchが一致する
- [x] sample1の半音数が `content_data_contract.md` の期待値と一致する
- [x] 第4小節が `12.0〜16.0` である
- [x] sequenceの小節範囲が1〜8内に収まる
- [x] 再生成で同じ構造を作れる
- [x] アプリ側テストデータとして配置されている

完了記録:

- 完了日: 2026-06-21
- dictation-player-json commit: `5a5f682`
- SHA-256: `1D89B41AB178A517B16361922CFF64BD953A8D421145B6FEB842C24C2427B817`

## Phase 1: 最小縦断実装

### T-101 プロジェクトを初期化する

- [x] TypeScriptとVite
- [x] 開発、ビルド、テスト用コマンド
- [x] `src/` の責務別ディレクトリ
- [x] 本番配置パスを考慮したビルド設定

完了条件:

- 開発画面を表示できる
- production buildが成功する
- テストを1件実行できる

### T-102 JSONローダーと検証を作る

- [x] `id` の検証
- [x] 開発用データ基準URL
- [x] fetchエラー処理
- [x] v1必須項目の検証
- [x] 内部モデルへの変換

完了条件:

- `sample1` を読み込める
- ID不正、404、不正JSON、未対応schemaを区別して表示できる

### T-103 選択中の譜面を表示する

- [x] 初期調の決定
- [x] インラインSVGの挿入
- [x] レスポンシブ表示
- [x] 調変更時の差し替え

完了条件:

- 12調を切り替えられる
- DOMに複数調のSVGが同時に残らない

### T-104 最小音声エンジンを作る

- [x] AudioContextの生成とresume
- [x] 切替可能な音源インターフェース
- [x] 三角波シンセ
- [x] サイン波シンセ
- [x] 単音発音
- [x] 複数音の予約
- [x] attack/releaseエンベロープ
- [x] 全停止

完了条件:

- `sample1` 全曲をBPM 80で再生できる
- 三角波とサイン波で同じ再生イベントを再生できる
- 音色切替で再生イベント計算が変わらない
- 停止直後に発音が残らない
- UIを連打しても再生ノードが残留しない

## Phase 2: 練習機能

### T-201 再生イベント計算を実装する

- [x] qstampから秒への変換
- [x] velocityの反映
- [x] 選択範囲先頭への時刻再配置
- [x] 境界をまたぐ音の切り詰め

完了条件:

- 計算処理がWeb Audio APIなしで単体テスト可能

### T-202 小節範囲再生を実装する

- [x] 開始・終了小節UI
- [x] 不正範囲の防止
- [x] `measure_map` による抽出

完了条件:

- 1〜4、5〜8、1〜8小節を再生できる

### T-203 速度変更を実装する

- [x] 0.75、1.0、1.25、1.5倍
- [x] 練習モードだけ変更可能
- [x] 試験モードはJSON指定BPM、倍率1.0に固定
- [x] 再生中の変更ルール
- [x] 表示値と内部値の同期

完了条件:

- 音程を変えずに速度だけが変わる
- 相対的な音価と休符が維持される

### T-204 移調を実装する

- [x] `keys.*.semitones` の適用
- [x] 対応SVGの表示
- [x] MIDI範囲外の防止

完了条件:

- 12調すべてで譜面と再生音が一致する
- キー名から半音数を再計算していない

## Phase 3: 試験機能

### T-301 sequence検証を実装する

- [x] chord
- [x] rest
- [x] play
- [x] signal/end_bell
- [x] 未知type、未知content、小節範囲外の拒否

完了条件:

- 再生開始前にsequence全体の不正を検出できる

### T-302 sequenceランナーを実装する

- [x] 配列順の逐次実行
- [x] ステップ状態表示
- [x] 中止
- [x] 多重開始防止
- [x] 古い非同期処理の無効化

完了条件:

- sample1の試験手順を最後まで実行できる
- chord、rest、play、signalの順序と回数がJSONどおり
- 120秒待機中でも中止できる

### T-303 練習・試験モードのUIを統合する

- [x] モード切替
- [x] 試験中の操作ロック
- [x] 試験開始前・試験中の譜面非表示
- [x] 終了・中止後の譜面再表示
- [x] 終了・中止後の復帰

完了条件:

- 試験実行中に設定が不整合にならない
- 練習モードへ戻って再生できる

## Phase 4: 品質確認と公開準備

### T-401 エラー表示と操作性を整える

- [x] 読み込み中、再生中、待機中、終了、エラー表示
- [x] ボタンのdisabled制御
- [x] キーボード操作とフォーカス
- [x] モバイル表示

完了記録:

- 完了日: 2026-06-22
- dictation-player-json commit: `c566145`
- Space開始、Escape停止・中止
- 状態・エラー表示、フォーカス復帰、操作ロックを確認

### T-402 自動テストを完成させる

- [x] 時間変換
- [x] 小節範囲
- [x] 移調
- [x] sequence
- [x] ローダー検証
- [x] キャンセル競合

完了条件:

- [x] 主要ドメイン処理に正常系と境界値テストがある
- [x] buildとtestが成功する

完了記録:

- 自動テスト: 92件成功
- production build: 成功

### T-403 実機確認を行う

- [x] Chromium系PC
- [ ] iOS Safari 16.4以降
- [x] Android Chrome
- [ ] バックグラウンド復帰
- [x] 低速・高速
- [ ] 長い試験sequenceの中止

確認記録:

- Android Chrome: 練習・試験とも問題なし
- 古いiOS Safari: 試験モードで開始・中止ボタンが消え、練習モードへ戻してもUIが復帰しない
- 上記iOS症状は音声開始前に発生するため、Web Audio制限ではなくUI/CSS互換性を先に疑う
- T-403A適用後、古いiOS Safariで練習・試験モードの往復表示は正常
- 古いiOS SafariではScreen Wake Lock非対応の警告が正しく表示された
- iOS Safari 16.4以降のWake Lock実機確認は、対応端末入手時まで保留

### T-403A iOS Safari互換性を改善する

- [x] `.mode-controls` の `display: contents` を廃止する
- [x] 通常のGridまたはFlexで既存レイアウトを維持する
- [x] 練習→試験→練習の往復で各操作ボタンが表示される
- [x] 試験開始前・実行中の譜面非表示ルールを維持する
- [x] Vite build targetを `baseline-widely-available` にする
- [x] `VITE_DATA_BASE_URL` などで検証用データURLを明示的に上書き可能にする
- [x] production buildへsample1を検証用に配置し、LAN上で確認できる手順を用意する
- [x] 画面または利用案内へ「iOS Safari 16.4以降推奨」を表示する
- [x] モード往復の回帰テストを追加する

完了条件:

- 自動テストとproduction buildが成功する
- Android Chromeの既存動作を壊していない
- production buildを使ってiOS Safariで再確認できる
- 古いiOSで未解決でも、iOS Safari 16.4以降を正式な推奨環境として案内できる

完了記録:

- 完了日: 2026-06-22
- dictation-player-json commit: `62173b3`
- 自動テスト: 97件成功
- production buildとLAN build: 成功
- 古いiOS Safariでモード往復表示: 改善確認済み

### T-403B 試験中の画面消灯を防止する

- [x] Screen Wake Lock APIを機能検出する
- [x] 試験開始のユーザー操作中にWake Lockを要求する
- [x] 試験終了、中止、エラー、モード切替でWake Lockを解放する
- [x] Wake Lockのreleaseイベントを監視する
- [x] 試験中にdocumentがhiddenになった場合はsequenceと発音を中止する
- [x] 再表示時に試験やAudioContextを自動再開しない
- [x] Wake Lock非対応・取得失敗時の警告を表示する
- [x] 「HTTPS環境が必要」であることを利用案内へ表示する
- [x] Wake Lockの取得、解放、非表示中止を単体テストする

完了条件:

- Wake Lock対応環境では試験中の自動消灯を防止できる
- Wake Lock非対応環境でも練習モードは利用できる
- 画面非表示後にsequenceが進行し続けない
- 復帰後に `AudioContextが開始されていません` ではなく、中止理由を表示する
- 自動テストとproduction buildが成功する
- HTTPSのiOS Safari実機で確認できる状態になる

完了記録:

- 完了日: 2026-06-22
- 自動テスト: 111件成功
- 通常production buildとLAN確認用production build: 成功
- LAN確認用sample1 SHA-256:
  `1D89B41AB178A517B16361922CFF64BD953A8D421145B6FEB842C24C2427B817`
- PC ChromiumのLAN production画面でHTTPS必須警告、試験開始・中止、
  練習モード復帰、390px幅の試験操作を確認
- HTTPSのiOS Safari実機確認手順を
  `HTTPS_WAKE_LOCK_VERIFICATION.md` に記載
- HTTPSのiOS Safari実機確認はT-403として継続
- Cloudflare一時HTTPS URLで古いiOS Safariの非対応警告表示を確認

### T-404 配信条件を確認する

- [x] 本番ドメインがHTTPSで公開されている
- [ ] 本番HTTPS環境でScreen Wake Lock APIを利用できる
- [x] `/data/dictation/melody/{id}.json` からの取得構成
- [x] JSONのContent-Typeを `application/json` として確認
- [x] キャッシュ方針を決定
- [x] gzipまたはBrotliの推奨設定を決定
- [x] sample1の圧縮サイズを測定
- [x] `/app/dictation-player-json/` のサブパス配置を検証
- [ ] 実際のホスティングでレスポンスヘッダーを確認
- [ ] サイト側 `/data/dictation/README.md` を現行スキーマへ更新

完了条件:

- 本番相当URLでsample1を読み込み、全機能を確認できる

確認記録:

- ホスティング: CORESERVER
- ドメイン: `seegmund-music-labo.com`
- アップロード: FTP
- 2026-06-22時点でドメインHTTPS応答200
- Webサーバー応答: LiteSpeed
- 本番相当ローカル構成でアプリ、ハッシュ付きJS、JSONがすべて200
- JSON Content-Type: `application/json`
- sample1: 375,686 bytes
- gzip level 9: 21,048 bytes
- Brotli quality 11: 12,083 bytes
- JSON文字数の約92.3%がSVG
- 圧縮効率が高いためv1ではSVG分離・ミニファイ不要
- 公開手順: `DEPLOYMENT.md`
- サイト側README更新案: `PUBLIC_DATA_README_DRAFT.md`

### T-405 FTP公開パッケージを作成する

- [x] プレイヤーHTMLへ `meta name="robots" content="noindex"` を追加する
- [x] `npm run release:ftp` を追加する
- [x] production buildを実行する
- [x] `release/ftp-root/app/dictation-player-json/` へアプリ成果物を配置する
- [x] `release/ftp-root/data/dictation/melody/sample1.json` を配置する
- [x] JSONは `dictation-content/dist/melody/sample1.json` と同一SHA-256であることを確認する
- [x] 公開ファイル一覧とSHA-256をmanifestへ出力する
- [x] `release/` をGit管理対象外にする
- [x] 同じ入力から同じ公開構成を再生成できる
- [x] FTPアップロード用チェックリストを更新する

完了条件:

- `release/ftp-root/` の `app/` と `data/` を既存ドキュメントルートへ
  統合すれば公開構成が完成する
- ソースコード、テスト、`node_modules` が公開パッケージに含まれない
- プレイヤーが検索インデックス対象外になっている
- 自動テストとproduction buildが成功する

完了記録:

- 完了日: 2026-06-22
- 自動テスト: 120件成功
- production buildと `npm run release:ftp`: 成功
- 公開パッケージ: アプリ成果物3ファイル、JSON 1ファイル、
  `RELEASE_MANIFEST.txt`
- sample1 SHA-256:
  `1D89B41AB178A517B16361922CFF64BD953A8D421145B6FEB842C24C2427B817`
- `src/`、`tests/`、`testdata/`、`node_modules/`、
  `.htaccess` が含まれないことを確認

FTPアップロード後:

- `release/ftp-root/app/` の中身を本番 `/app/` へ統合する
- `release/ftp-root/data/` の中身を本番 `/data/` へ統合する
- 本番既存ファイルを無関係に削除しない

## 将来候補

- ピアノサンプラー
- 和声聴音と複数声部
- 声部ごとの音量・ミュート
- SVGミニ版
- 回答入力と採点
- 課題一覧

## 将来候補2（ユーザー案）
- よくある小節範囲のプリセットボタン
- C調という表記→C majorなど
- 表記：旋律聴音 ハ長調/C-Dur/C major 4/4拍子 8小節の４表示
- 試験再生のプリセットとJSONによる上級者向けカスタマイズ
