# dictation-content → dictation-player-json データ契約

Status: Draft v0.1  
出力スキーマ: `schema_version: 1`

## 1. 目的

MEI変換ツール `dictation-content` とWebアプリ `dictation-player-json` の責務境界を定める。

基本原則:

- 制作者が決める教育的な内容は、課題設定ファイルへ明示する。
- MEIから正確に算出できる内容は、生成ツールが自動生成する。
- Webアプリは移調方向、小節境界、試験手順を推測しない。
- 生成済みJSONを手作業で修正しない。

## 2. 制作側の入力ファイル

1課題につき、MEIと課題設定ファイルを1つずつ持つ。

```text
src/
├─ mei/
│  └─ melody/
│     └─ M001.mei
└─ config/
   └─ melody/
      └─ M001.json
```

ファイル名のIDは一致させる。

### 課題設定ファイル

```json
{
  "authoring_version": 1,
  "id": "M001",
  "type": "melody",
  "title": "課題001",
  "bpm": 80,
  "transpose": {
    "strategy": "nearest",
    "semitone_overrides": {}
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
      "type": "rest",
      "duration_sec": 20
    },
    {
      "step": 5,
      "type": "play",
      "start_measure": 1,
      "end_measure": 4
    },
    {
      "step": 6,
      "type": "rest",
      "duration_sec": 20
    },
    {
      "step": 7,
      "type": "play",
      "start_measure": 1,
      "end_measure": 4
    },
    {
      "step": 8,
      "type": "rest",
      "duration_sec": 20
    },
    {
      "step": 9,
      "type": "play",
      "start_measure": 1,
      "end_measure": 8
    },
    {
      "step": 10,
      "type": "rest",
      "duration_sec": 20
    },
    {
      "step": 11,
      "type": "play",
      "start_measure": 5,
      "end_measure": 8
    },
    {
      "step": 12,
      "type": "rest",
      "duration_sec": 20
    },
    {
      "step": 13,
      "type": "play",
      "start_measure": 5,
      "end_measure": 8
    },
    {
      "step": 14,
      "type": "rest",
      "duration_sec": 20
    },
    {
      "step": 15,
      "type": "play",
      "start_measure": 1,
      "end_measure": 8
    },
    {
      "step": 16,
      "type": "rest",
      "duration_sec": 120
    },
    {
      "step": 17,
      "type": "signal",
      "content": "end_bell"
    }
  ]
}
```

課題設定ファイルは制作者が管理する。生成ツールは値を補完せず、検証して出力JSONへ統合する。

## 3. 項目ごとの責務

| 出力項目 | 正本 | 生成方法 |
|---|---|---|
| `schema_version` | 生成ツール | 対応スキーマの定数 |
| `id` | 課題設定 | MEI・設定・出力ファイル名の一致を検証 |
| `type` | 課題設定 | v1は `melody` のみ許可 |
| `title` | 課題設定 | そのまま出力 |
| `base_key` | MEI | 調号とモードから取得 |
| `mode` | MEI | v1では少なくとも `major` / `minor` |
| `time_signature` | MEI | 拍子情報から取得 |
| `measures` | MEI | 小節数を取得 |
| `measure_map` | MEI・Verovio | 各小節の実際の開始・終了qstampを取得 |
| `play.bpm` | 課題設定 | そのまま出力 |
| `play.voices` | MEI・Verovio | timemapとMIDI値から生成 |
| `keys.*.svg` | MEI・Verovio | 各調へ移調して生成 |
| `keys.*.semitones` | 生成ツール | SVG生成に実際に使った移調量を出力 |
| `sequence` | 課題設定 | 検証後、そのまま出力 |

同じ値をMEIと課題設定の両方へ重複して持たせない。例外的に検証用として重複させる場合は、不一致をエラーにする。

## 4. 移調量

### 標準戦略

`transpose.strategy: "nearest"` は、原調の主音から対象調の主音までを最短の半音数で表す。

標準範囲:

```text
-5, -4, -3, -2, -1, 0, +1, +2, +3, +4, +5, +6
```

増4度／減5度の同距離は `+6` とする。

概念上の計算:

```text
upward = (targetPitchClass - basePitchClass + 12) % 12
semitones = upward > 6 ? upward - 12 : upward
```

生成ツールはこの値で生成したSVGと再生音が同じ音域になることを検証し、実際に使用した値を `keys.{key}.semitones` へ出力する。

### 個別上書き

課題の音域上、標準戦略が不適切な場合だけ `semitone_overrides` を使用する。

```json
{
  "transpose": {
    "strategy": "nearest",
    "semitone_overrides": {
      "C": -7
    }
  }
}
```

上書きは対象調ごとの整数半音数とし、Webアプリ側では再計算しない。

### sample1の期待値

原調Gの場合:

| 調 | semitones |
|---|---:|
| C | +5 |
| Db | +6 |
| D | -5 |
| Eb | -4 |
| E | -3 |
| F | -2 |
| Gb | -1 |
| G | 0 |
| Ab | +1 |
| A | +2 |
| Bb | +3 |
| B | +4 |

この対応は現行の12調SVGに見られる音域配置とも整合する。

## 5. measure_map

形式:

```json
[
  { "measure": 1, "start_qstamp": 0.0, "end_qstamp": 4.0 },
  { "measure": 2, "start_qstamp": 4.0, "end_qstamp": 8.0 }
]
```

生成規則:

- MEI／Verovioが持つ小節の時間境界から生成する。
- 音符の最小qstampと最大終了時刻から推測しない。
- 休符だけの小節、冒頭休符、末尾休符を含めて正しい境界を出力する。
- 小節番号は1から連続する整数とする。
- 前小節の `end_qstamp` と次小節の `start_qstamp` は一致させる。
- 最終小節の `end_qstamp` は課題全体の終了qstampと一致させる。

現行sample1では第4小節の最後の音がqstamp 15で終了するが、小節境界は16である。音符配列だけから生成すると末尾1拍の休符を失うため禁止する。

sample1の期待値:

```json
[
  { "measure": 1, "start_qstamp": 0.0, "end_qstamp": 4.0 },
  { "measure": 2, "start_qstamp": 4.0, "end_qstamp": 8.0 },
  { "measure": 3, "start_qstamp": 8.0, "end_qstamp": 12.0 },
  { "measure": 4, "start_qstamp": 12.0, "end_qstamp": 16.0 },
  { "measure": 5, "start_qstamp": 16.0, "end_qstamp": 20.0 },
  { "measure": 6, "start_qstamp": 20.0, "end_qstamp": 24.0 },
  { "measure": 7, "start_qstamp": 24.0, "end_qstamp": 28.0 },
  { "measure": 8, "start_qstamp": 28.0, "end_qstamp": 32.0 }
]
```

## 6. sequence

### 制作方針

- 試験手順は教育的要件なので、生成ツールが推測しない。
- 課題設定ファイルで配列順に記述する。
- `step` は1からの連番とし、表示・ログ・検証に使う。
- 実行順の正本は配列順とする。
- 時間は秒、小節範囲は両端を含む整数で指定する。

### step type

#### chord

```json
{
  "step": 1,
  "type": "chord",
  "pitches": [55, 59, 62, 67],
  "duration_sec": 2,
  "velocity": 80,
  "label": "主和音演奏"
}
```

- `pitches` は原調のMIDIノート番号。
- 選択調の `semitones` をWebアプリが全pitchへ加算する。
- 和音の配置と音域は制作者が決める。主和音だからという理由でアプリが生成しない。

#### rest

```json
{
  "step": 2,
  "type": "rest",
  "duration_sec": 4
}
```

#### play

```json
{
  "step": 3,
  "type": "play",
  "start_measure": 1,
  "end_measure": 8
}
```

#### signal

```json
{
  "step": 17,
  "type": "signal",
  "content": "end_bell"
}
```

v1で許可する `content` は `end_bell` だけとする。音響表現はWebアプリ側の固定仕様であり、課題ごとには変更しない。

## 7. 生成時の検証

エラーがあれば出力せず、課題IDと原因を表示する。

- MEI・課題設定・出力ファイル名のID一致
- `authoring_version === 1`
- v1では `type === "melody"`
- `bpm > 0`
- 12調すべてのSVGと半音数が存在
- 移調後の全pitchが0〜127
- `measure_map` が1から連続
- 小節境界が連続し、終了が開始より後
- 全音符が対応する小節の時間範囲内
- `sequence.step` が1から連続
- `play` の小節範囲が課題内で、開始が終了以下
- `chord.pitches` と `velocity` が0〜127
- `duration_sec > 0`
- 未対応のstep typeとsignal contentがない

## 8. Webアプリ側の扱い

Webアプリは生成済みJSONを信用しきらず、読み込み時にもスキーマ検証を行う。ただし、次の値を独自に再生成しない。

- `keys.*.semitones`
- `measure_map`
- `sequence`
- `chord.pitches`

制作側とアプリ側で同じ検証項目を持つ部分は、目的が異なる。

- 制作側: 不正データを公開しない
- アプリ側: 配信ミスや未対応バージョンで誤動作しない

