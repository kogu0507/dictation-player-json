# dictation-player-json 仕様書

Status: Draft v0.3
対象: 旋律聴音 Web アプリ v1

## 1. 目的

MEI から生成済みの JSON を読み込み、譜面表示と正確な音声再生を行う。

v1 では次の2用途を扱う。

- 練習モード: 移調、速度変更、小節範囲指定による再生
- 試験モード: JSON に定義された手順どおりに主和音、課題、休止、終了音を再生

アプリは静的ホスティングで動作し、サーバー側処理を前提にしない。

## 2. v1 の範囲

### 対象

- 単声の旋律聴音
- 1課題8小節を主な対象とするが、小節数はJSONから取得する
- 12調分のインラインSVG表示
- MIDIノート番号を使った音声再生
- URLパラメータ `id` による課題指定
- 同一オリジン上のJSON読み込み
- PC Chromium系ブラウザ
- Android Chrome
- iOS Safari 16.4以降

### 対象外

- 和声聴音、複数声部の個別操作
- 楽譜編集、採譜、回答入力、採点
- ユーザー登録、学習履歴保存
- オフライン対応
- 任意URLからのJSON読み込み
- MEIからJSONを生成する機能
- iOS Safari 16.3以前の完全な動作保証

### ブラウザ対応方針

- PC Chromium系とAndroid Chromeをv1の主要対応環境とする。
- iOS Safariは16.4以降を推奨・対応対象とする。
- iOS Safari 16.3以前はベストエフォートとし、画面表示や音声再生が正しく動作しない場合がある。
- 古いiOSで不具合が出ても直ちにSafari全体を対象外にはせず、標準的なHTML/CSSへの置換など低コストな互換修正を検討する。
- 個別端末固有の問題や、古いSafari専用の大規模なポリフィル導入はv1の必須要件にしない。
- 公開画面または利用案内に「iOS Safari 16.4以降推奨」を明記する。

## 3. 推奨技術構成

- Vanilla TypeScript
- Vite
- Web Audio API
- テスト: Vitest
- ブラウザ結合テストは必要箇所のみ

production buildのブラウザ対象はViteの `baseline-widely-available` とし、少なくともSafari 16.4を含む。`es2022` のようなECMAScript世代だけを対象として固定しない。

モード切替など主要操作のレイアウトには `display: contents` を使用せず、通常のGridまたはFlexコンテナを使う。

画面と状態遷移が小規模なため、v1ではUIフレームワークを導入しない。音声処理はUIから分離し、将来サンプラー音源へ差し替え可能なインターフェースにする。

v1の音源はWeb Audio APIの組み込みシンセとする。

- 既定音色: 三角波
- 選択可能音色: 三角波、サイン波
- 音源選択は練習モードと試験モードで共通
- 音源設定を変更しても、音高、音価、再生順序の計算結果は変えない

将来のピアノ音源は、組み込みシンセを削除せず追加音源として実装する。再生スケジューラは特定音源へ依存させず、シンセとサンプラーを同じ音源インターフェースから呼び出す。

## 4. 想定ディレクトリ

```text
/
├─ AGENTS.md
├─ spec.md
├─ codex_tasks.md
├─ package.json
├─ index.html
├─ src/
│  ├─ main.ts
│  ├─ config/
│  ├─ data/
│  ├─ domain/
│  ├─ audio/
│  ├─ exam/
│  ├─ ui/
│  └─ styles/
├─ testdata/
│  └─ melody/
│     └─ sample1.json
└─ tests/
```

責務は次のように分離する。

- `data`: URL構築、JSON取得、検証、アプリ内部形式への変換
- `domain`: 移調量、速度、小節範囲、再生イベントの純粋計算
- `audio`: 音源インターフェース、AudioContext、組み込みシンセ、スケジュール、停止
- `exam`: sequenceの実行とキャンセル
- `ui`: DOM描画、操作受付、状態表示

## 5. データ取得

### URL

画面URLの例:

```text
https://example.com/app/dictation-player-json/?id=M001
```

JSONの取得先:

- 開発時: `./testdata/melody/{id}.json`
- 公開時: `/data/dictation/melody/{id}.json`

データ基準URLは1か所の設定値として管理し、機能コード内へ直書きしない。

本番URL構造は `/data/dictation/melody/{id}.json` で確定とする。同一オリジンの絶対パスを使用し、画面の配置ディレクトリには依存させない。

### IDの制約

`id` は次の文字だけを許可する。

```text
A-Z a-z 0-9 _ -
```

不正なID、未指定、HTTPエラー、JSON不正、必須項目不足は、画面上へ日本語でエラー表示する。任意URLをパラメータとして受け取らない。

## 6. JSONデータ契約 v1

現行 `sample1.json` を基礎とし、アプリ側の推測をなくすために次の項目を追加する。

制作側の入力形式、項目ごとの責務、生成規則は `content_data_contract.md` を正本とする。

```json
{
  "schema_version": 1,
  "id": "sample1",
  "type": "melody",
  "title": "サンプル1",
  "base_key": "G",
  "mode": "major",
  "time_signature": "4/4",
  "measures": 8,
  "measure_map": [
    { "measure": 1, "start_qstamp": 0.0, "end_qstamp": 4.0 },
    { "measure": 2, "start_qstamp": 4.0, "end_qstamp": 8.0 }
  ],
  "play": {
    "bpm": 80,
    "voices": {
      "soprano": [
        {
          "pitch": 67,
          "qstamp": 0.0,
          "duration": 1.0,
          "measure": 1,
          "velocity": 90
        }
      ]
    }
  },
  "keys": {
    "C": {
      "semitones": 5,
      "svg": "<svg ...>...</svg>"
    },
    "G": {
      "semitones": 0,
      "svg": "<svg ...>...</svg>"
    }
  },
  "sequence": [
    {
      "step": 1,
      "type": "chord",
      "pitches": [55, 59, 62, 67],
      "duration_sec": 2,
      "velocity": 80,
      "label": "主和音演奏"
    },
    {
      "step": 2,
      "type": "rest",
      "duration_sec": 4
    },
    {
      "step": 3,
      "type": "play",
      "start_measure": 1,
      "end_measure": 8
    },
    {
      "step": 4,
      "type": "signal",
      "content": "end_bell"
    }
  ]
}
```

### 必須判断

- `schema_version` を必須にする。未対応バージョンは再生しない。
- `keys.*.semitones` を必須にする。キー名から移調方向を推測しない。
  - 例: GからCは `+5` と `-7` の両方があり得るため、生成側が譜面と一致する値を決める。
- `measure_map` を必須にする。拍子から小節境界を推測しない。
- `chord.pitches` は原調のMIDIノート番号とし、選択調の `semitones` を同じように加算する。
- `chord.velocity` は0〜127の整数とする。
- `start_measure` と `end_measure` は両端を含む。
- `step` はログと確認用であり、実行順は配列順とする。
- `label` は任意であり、再生ロジックに使用しない。

### データ検証

読み込み時に少なくとも次を検証する。

- `schema_version === 1`
- `id` と要求IDが一致
- `type === "melody"`
- `bpm > 0`
- `measure_map` が1から連続し、前後で重複・逆転しない
- `qstamp >= 0`、`duration > 0`
- `pitch` と `velocity` が0〜127
- すべての音符の `measure` が定義済み
- `keys` に選択可能な調、`svg`、整数の `semitones` が存在
- 移調後の全pitchが0〜127
- sequenceの小節範囲が課題内

## 7. 再生仕様

### 時間計算

JSONの `qstamp` と `duration` は四分音符単位のまま保持し、速度変更時もデータを書き換えない。

```text
secondsPerQuarter = 60 / (bpm × playbackRate)
startSec = (qstamp - rangeStartQstamp) × secondsPerQuarter
durationSec = duration × secondsPerQuarter
```

- `playbackRate = 1.0`: 基準速度
- `playbackRate > 1.0`: 速くなる
- `playbackRate < 1.0`: 遅くなる

試験sequence内の `rest.duration_sec` と `chord.duration_sec` は実時間であり、速度倍率の影響を受けない。`play` ステップだけが速度倍率の影響を受ける。

### 小節範囲

小節範囲は `measure_map` からqstamp範囲へ変換する。対象条件は次とする。

```text
noteStart < rangeEnd && noteEnd > rangeStart
```

境界をまたぐ音は範囲内へ切り詰め、選択範囲の先頭を再生時刻0として再配置する。

### 移調

```text
playedPitch = sourcePitch + keys[selectedKey].semitones
```

譜面表示も同じ `selectedKey` のSVGを使う。DOM内のID衝突を避けるため、選択中のSVGだけをDOMへ挿入する。

### スケジューリング

- 音符の開始はWeb Audio APIのオーディオ時刻で予約する。
- DOMタイマーだけで各音符を逐次発音しない。
- 停止時は予約済みノードをすべて停止し、古い再生処理が後から状態を更新しないよう実行IDで無効化する。
- AudioContextの開始・再開は、ユーザーのクリック操作を起点に行う。

### 試験中の画面消灯とバックグラウンド

試験モードは、ブラウザが表示中であることを前提とする。画面消灯後のバックグラウンド再生は保証しない。

- 試験開始ボタンのユーザー操作中にScreen Wake Lock APIを要求する。
- Wake Lockは試験終了、中止、エラー、練習モードへの切替時に解放する。
- 試験中にdocumentが非表示になった場合は、sequenceを継続せず安全に中止する。
- 再表示時にAudioContextや試験を自動再開しない。ユーザーが改めて試験開始を押す。
- Wake Lockが自動解放された場合は試験を中止し、自動再取得・試験再開・AudioContext再開を行わない。
- Wake Lock非対応または取得失敗時は、試験開始前に「画面の自動ロックを一時的に無効化し、画面を表示したまま使用する」旨を表示する。
- Wake Lock失敗だけを理由に練習モードを禁止しない。
- production環境はHTTPSを必須とする。Screen Wake Lock APIは非HTTPSのLAN URLでは利用できない。

### 音源

v1ではOscillatorNodeを使う組み込みシンセを実装する。

- `triangle`: 既定値。基音を判別しやすく、サイン波より輪郭がある
- `sine`: 倍音の少ない確認用音色
- 音量の急変によるクリックノイズを避けるため、GainNodeで短いattackとreleaseを付ける
- 音源は再生イベントの `pitch`、開始時刻、音価、velocityを受け取り、音源固有の方法で発音する
- 音源切替は停止中だけ許可する
- 将来の `piano` 追加後も `triangle` と `sine` を残す

再生イベントの計算と音源出力を分離し、音源変更によって移調、速度、小節範囲、試験sequenceのロジックを変更しない。

### v1の操作

練習モード:

- 調の選択
- 速度倍率の選択: `0.75 / 1.0 / 1.25 / 1.5`
- 音色の選択: `triangle / sine`
- 開始小節、終了小節の選択
- 再生
- 停止

試験モード:

- 試験開始
- 試験中止
- 現在ステップまたは状態の表示
- JSON指定のBPMを使用し、速度倍率は常に `1.0`
- 開始前から譜面を隠し、終了または中止後に表示
- 実行中は調、速度、音色、小節範囲を変更不可

一時停止・途中再開はv1対象外とする。

## 8. 試験sequence

対応するstep type:

- `chord`: 指定MIDIノートを同時発音
- `rest`: 指定秒数待機
- `play`: 指定小節範囲を再生
- `signal`: `end_bell` を再生

実行規則:

1. 配列順に1ステップずつ実行する。
2. 各ステップ完了後に次へ進む。
3. 中止時は再生中の音と待機処理をキャンセルする。
4. 不明なtypeやcontentは開始前の検証でエラーにする。
5. 試験中にタブが非表示になっても、オーディオ時刻を基準に可能な限り進行を維持する。

譜面表示は次の状態とする。

- 練習モード: 表示
- 試験モード開始前: 非表示
- 試験実行中: 非表示
- 試験終了後: 表示
- 試験中止後: 表示

## 9. 表示とエラー

- 初期表示中は読み込み状態を示す。
- 再生開始後は再生中、待機中、終了を区別して示す。
- データエラー時は再生ボタンを無効化する。
- SVGは同一オリジンで生成・管理された信頼済みデータだけを対象とする。
- SVGを手作業で加工せず、生成元を修正して再生成する。
- 画面文言とエラーメッセージは日本語にする。

## 10. 現行sample1.jsonの確認結果

2026-06-21時点:

- JSONとして読み込み可能
- `schema_version`: 1
- `id`: `sample1`
- 原調: G、モード: major
- 4/4、8小節、BPM 80
- soprano 30音
- 8小節分の `measure_map` あり
- 12調分のSVGと `semitones` あり
- 17ステップの `sequence` あり
- ファイルサイズ: 375,686 bytes
- SHA-256: `1D89B41AB178A517B16361922CFF64BD953A8D421145B6FEB842C24C2427B817`

データ生成ツール側の当初目安「120〜150KB」より大きいが、gzip約21KB、Brotli約12KBまで圧縮できることを確認済みである。

## 11. v1受け入れ基準

- `?id=sample1` で課題を読み込み、原調の譜面を表示できる
- 本番では `/data/dictation/melody/sample1.json` から読み込める
- 12調すべてで譜面と再生音が一致する
- 0.75、1.0、1.25、1.5倍で相対的な音価と休符が維持される
- 試験モードではJSON指定BPMから変更できない
- 1〜4小節、5〜8小節、1〜8小節を正しく再生できる
- 三角波とサイン波を切り替えて同じ再生イベントを再生できる
- 再生中の停止後に音が残らない
- sequenceを最後まで1回実行でき、中止もできる
- Screen Wake Lock対応端末では、試験中に画面が自動消灯しない
- 試験中にタブ移動、アプリ切替、画面ロックが発生した場合は試験を中止し、理由を表示する
- Wake Lock非対応端末では自動ロック設定に関する警告を表示する
- 試験開始前と実行中は譜面が非表示になり、終了または中止後に表示される
- 読み込み失敗とデータ不正を画面表示できる
- スマートフォンでユーザー操作後に音が出る
- iOS Safari 16.4以降で練習・試験モードを往復しても操作ボタンが表示される
- Android Chromeで練習・試験モードを実行できる
- 同じ操作から同じ再生イベント列を生成する単体テストがある
- 本番データ基準URLの切り替えが設定変更だけで行える

## 12. 確定済みプロダクト判断

1. v1音源はWeb Audio APIの組み込みシンセとする。
2. 既定音色は三角波とし、サイン波へ切り替え可能にする。
3. 将来ピアノ音源を追加しても、三角波とサイン波を残す。
4. 試験開始前と試験中は譜面を隠し、終了または中止後に表示する。
5. 練習モードの速度は `0.75 / 1.0 / 1.25 / 1.5` の固定候補とする。
6. 試験モードではJSON指定BPMを使用し、速度変更を許可しない。
7. 本番JSON URLは `/data/dictation/melody/{id}.json` とする。
8. PC Chromium系とAndroid Chromeを主要対応環境とする。
9. iOS Safariは16.4以降を推奨し、それ以前はベストエフォートとする。
10. 試験中はScreen Wake Lockを使用し、バックグラウンド再生はサポートしない。
11. production公開はHTTPSを前提とする。

## 13. 確定済みデータ責務

1. `semitones` は生成ツールがSVG生成に使った実移調量を出力する。
2. 標準移調は最短半音移動 `-5〜+6` とし、同距離の増4度は `+6` とする。
3. 課題ごとの音域調整が必要な場合は制作側設定で半音数を上書きする。
4. `measure_map` はMEI／Verovioの小節時間境界から生成する。
5. `measure_map` を音符配列や拍子だけから推測しない。
6. `sequence` と `chord.pitches` は課題制作者が課題設定ファイルへ記述する。
7. 生成ツールは課題設定を検証し、生成済みJSONへ統合する。
8. 詳細は `content_data_contract.md` を正本とする。

## 14. 公開・キャッシュ方針

- アプリ公開先は `/app/dictation-player-json/` とする。
- 公開するアプリファイルはproduction buildの `dist/` の中身だけとする。
- 課題JSONは `/data/dictation/melody/{id}.json` へ配置する。
- production環境はHTTPSを必須とする。
- HTMLと課題JSONは `Cache-Control: no-cache` を推奨する。
- ハッシュ付きJS・CSSは `Cache-Control: public, max-age=31536000, immutable` を推奨する。
- JSON、HTML、JS、CSSはBrotliまたはgzip配信を推奨する。
- sample1は非圧縮375,686 bytes、gzip約21KB、Brotli約12KBである。
- 圧縮後サイズが十分小さいため、v1ではSVG分離と独自ミニファイを行わない。
- 詳細な公開手順は `DEPLOYMENT.md` を正本とする。

## 15. 聴音ページとの役割分担

- `/app/dictation-player-json/?id={id}` は操作用プレイヤーとし、検索結果へ掲載しない。
- プレイヤーHTMLには `meta robots: noindex` を設定する。
- SEO、課題説明、練習方法、内部リンクは将来の聴音ページ側で扱う。
- 課題一覧ページは `/dictation/melody/` を想定する。
- 固有解説が必要な課題は `/dictation/melody/{id}/` を想定する。
- 親ページからiframeで表示する場合は `allow="screen-wake-lock"` を指定する。
- 同一ページに多数のiframeを常時読み込まず、選択中の課題だけを読み込む。
