# AGENTS.md

このリポジトリは、JSON駆動の旋律・和声聴音プレイヤーを実装する。

ローカル配置は `projects/dictation-player-json/` とし、公開用の `public_html/app/dictation-player-json/` にはproduction build成果物だけを置く。

## 正本

優先順位は次のとおり。

1. ユーザーの最新指示
2. `spec.md`
3. `content_data_contract.md`
4. `codex_tasks.md`
5. `implementation_handoff.md`
6. 現行コードとテスト

仕様変更時は、コードだけでなく該当資料とテストも同じ変更内で更新する。

## GitHubでのChatGPT / Codex受け渡し

実装単位の受け渡しはGitHubを正とし、別の作業台帳を増やさない。

- **Issue = task contract**: 目的、根拠、正本、scope、acceptance criteria、machine verification、人間判断境界を置く。
- **専用branch = implementation workspace**: Issueと無関係な変更を混ぜない。
- **PR = implementation return package**: Issueをリンクし、変更内容、検証結果、逸脱、新規発見、production/publication影響を返す。
- **Issue / PR comment = triage / independent review / follow-up**: 実装詳細の会話はGitHubへ残す。
- **Google Drive = long-term project state**: プロジェクト横断の判断や現在地だけを反映し、Issue/PR本文を重複保存しない。

標準フロー:

`Observe/Audit → IssueでTriage/契約化 → Implement → Machine verify → PR → Independent review → 必要なら修正/再検証 → Issue close → HANDOFFへ長期状態だけ反映`

実装担当はIssue URLまたは番号だけで着手できる状態を前提とする。Issueに未解決の仕様・UX・教育・意味づけ・互換性判断が残る場合は推測で補完せず停止して報告する。

- 小さく局所的で仕様判断不要な変更は、ChatGPT実装 → Codex独立レビューを優先する。
- 複数ファイル横断、長い実装、リファクタリング、テスト拡充等は、ChatGPTがIssue/acceptance criteriaを整備 → Codex実装 → ChatGPT独立レビューを優先する。
- 監査で見つけた別問題は、現在Issueの意味を変えるなら別Issue候補として分離する。
- production/publication、FTP、本番環境変更、削除などはIssueがあっても人間承認なしに実行しない。
- 新規Issueには `.github/ISSUE_TEMPLATE/ai-implementation.md`、PRには `.github/pull_request_template.md` を利用する。

## melody v1の制約

- melody v1では単声旋律だけを扱う。
- Vanilla TypeScript、Vite、Web Audio APIを基本構成とする。
- UIフレームワークや音声ライブラリを無断で追加しない。
- v1音源はOscillatorNodeによる三角波とサイン波とし、既定値は三角波にする。
- ブラウザ対象はPC Chromium系、Android Chrome、iOS Safari 16.4以降とする。
- 古いiOS Safariはベストエフォートとし、専用の大規模ポリフィルを無断で追加しない。
- 一時停止、採点、履歴保存は追加しない。
- JSON生成ツールは別プロジェクトであり、このリポジトリへ実装しない。
- 画面文言は日本語にする。

## harmony v2の追加範囲

- `?type=harmony&id={id}` で schema v2 / `type: "harmony"` のJSONを読み込む。
- `play.voices.soprano/alto/tenor/bass` の4声を読み込み境界で検証し、同一の再生イベント列へflattenして再生する。
- melody v1と同じ12調SVG表示、`keys.*.semitones` による移調、小節範囲再生を扱う。
- `harmony.chord_sequence`、`key_regions`、`cadences` は現段階では読み込み時の配列検証のみとし、画面表示・採点・再生生成には使わない。
- harmony v2では `sequence: []` を許可する。harmonyの試験sequence実行は現行必須範囲外とする。
- ローマ数字入力、和声採点、カデンツ判定、声部ごとの個別操作は追加しない。

## 設計原則

- UI、データ取得、再生イベント計算、音声出力、試験sequence実行を分離する。
- qstampから秒への変換、移調、小節範囲抽出は副作用のない関数にする。
- Web Audio API依存は `src/audio/` に閉じ込める。
- 再生イベント計算と音源出力を分離し、音源は切替可能なインターフェースにする。
- 将来ピアノ音源を追加しても、三角波とサイン波を削除しない。
- DOMタイマーだけで音符を逐次発音しない。
- 再生と試験実行は必ず中止可能にする。
- URLパラメータから任意URLを読み込ませない。
- 本番JSONは `/data/dictation/{type}/{id}.json` から取得する。
- 公開するアプリ成果物はproduction buildの `dist/` の中身だけとし、ソースや依存パッケージを公開しない。
- 公開・キャッシュ・圧縮の判断は `DEPLOYMENT.md` に従う。
- プレイヤーURLはSEO対象にせず、production HTMLへ `noindex` を設定する。
- FTP公開パッケージはスクリプトで再現可能に作り、手作業で成果物を組み替えない。
- 選択中のSVGだけをDOMへ挿入する。
- インラインSVGは信頼済みの同一オリジンデータだけを扱う。
- モード切替に関係するコンテナへ `display: contents` を使用しない。
- Viteのproduction build targetは `baseline-widely-available` を基本とする。
- 試験中の画面消灯防止にはScreen Wake Lock APIを機能検出して使用する。
- 試験中にdocumentが非表示になった場合は再生を継続せず中止する。
- 非表示からの復帰時にAudioContextや試験sequenceを自動再開しない。
- Wake Lock非対応端末でも練習モードは利用可能にする。
- Wake Lock検証はHTTPS環境で行う。HTTPのLANプレビューだけで未対応と判断しない。

## JSONの扱い

- `spec.md` のデータ契約を読み込み境界で検証する。
- 制作側との項目責務は `content_data_contract.md` に従う。
- アプリ本体でキー名から半音数を推測しない。
- アプリ本体で拍子から小節境界を推測しない。
- 埋め込みSVGを手作業で編集しない。
- スキーマを変更する場合は `schema_version`、該当testdata、検証コード、テストを同時に扱う。

## 実装の進め方

- `codex_tasks.md` の順序を基本とし、1タスクごとに動作確認する。
- まず縦方向の最小動作として「読込→1音色→全曲再生→停止」を通す。
- 既定の三角波を通した後、同じ音源インターフェースへサイン波を追加する。
- その後、範囲、移調、速度、試験sequenceを追加する。
- 無関係なリファクタリングを同時に行わない。
- 依存追加前に、標準APIで十分でない理由を明示する。

## テスト

最低限、次を自動テストする。

- qstampとBPM、速度倍率から秒への変換
- 小節範囲から対象音符を抽出・切り詰めする処理
- 半音数の加算
- sequenceの検証と遷移
- 停止後に古い実行が状態を更新しないこと
- 不正JSONの拒否

ブラウザ実機確認では、PCに加えてAndroid ChromeとiOS Safari 16.4以降のAudioContext開始制約を確認する。古いiOSで問題が出た場合は、音声制限とUI/CSS互換性を切り分ける。

## 完了報告

実装タスクの完了時は次を簡潔に報告する。

- 変更した機能
- 実行した確認と結果
- 残っている仕様判断または既知の制約
