# 実装チャット・Git引き継ぎ計画

Status: Ready for implementation handoff

## 1. チャットの役割

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
設計の正本はdictation-player-json側の
content_data_contract.md、spec.md、codex_tasks.mdです。

今回はT-002を実装し、sample1をschema_version 1で再生成できるところまで進めてください。
生成物を手修正せず、課題設定ファイルとMEIから再現可能にしてください。
完了時は変更内容、検証結果、生成したsample1.jsonの要約を報告してください。
```

### 実装チャットB: dictation-player-json

開始タイミング:

1. `T-002` が完了
2. 新しい `sample1.json` が生成済み
3. `T-003` のデータ検証が完了

対象:

- `T-101` 以降のWebアプリ実装

実装チャットへ渡す依頼文:

```text
dictation-player-jsonの実装を行います。
spec.md、content_data_contract.md、AGENTS.md、codex_tasks.mdを正本として、
T-101から順番に実装してください。

まず「JSON読込→譜面表示→三角波で全曲再生→停止」の最小縦断を完成させ、
各タスクの完了条件を確認しながら進めてください。
仕様変更が必要な場合は実装を進めず、設計チャットへ戻す論点を整理してください。
```

## 2. Gitのタイミング

### 現在の状態

2026-06-21時点で、`dictation-player-json` ディレクトリはGitリポジトリではない。

アプリ実装を始める前に、次のどちらかを確定する必要がある。

1. `dictation-player-json` を独立Gitリポジトリにする
2. 既存の上位リポジトリへ含める

推奨は独立リポジトリである。生成ツールとWebアプリはリリース単位、依存関係、作業履歴が異なるため、それぞれ別Gitリポジトリにする。

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

- `dictation-content` のプロジェクトディレクトリを指定する
- `dictation-player-json` を独立Gitリポジトリにするか決める
- 必要ならGitHub上のリモートリポジトリを作成する
- 実装チャットAを開始する

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

