# dictation 公開データ

このディレクトリには、聴音Webアプリから読み込む公開用の完成データを配置する。

## 公開構成

v1では、1課題につき1つのJSONを公開する。JSONには再生データと12調分のインラインSVGを含む。

```text
/data/dictation/
├─ README.md
└─ melody/
   ├─ sample1.json
   ├─ M001.json
   └─ M002.json
```

公開URL:

```text
/data/dictation/melody/{id}.json
```

例:

```text
/data/dictation/melody/sample1.json
```

## データ生成

公開JSONは `dictation-content` でMEIと課題設定ファイルから生成する。

```text
MEI + 課題設定
↓
dictation-content
↓
dist/melody/{id}.json
↓
/data/dictation/melody/{id}.json
```

生成済みJSONを手作業で修正しない。

## JSONの主な内容

- `schema_version`
- 課題ID、タイトル、原調、モード、拍子、小節数
- `measure_map`
- 原調のMIDIノートとqstamp
- 12調分のSVGと半音移調量
- 試験再生用sequence

詳細契約はアプリプロジェクトの `content_data_contract.md` を参照する。

## キャッシュ

課題JSONは同じURLで更新するため、`Cache-Control: no-cache` を推奨する。Brotliまたはgzip圧縮を有効にする。

## 公開しないもの

- MEI原稿
- 課題設定の編集用ファイル
- Pythonスクリプト
- 仮想環境
- テストファイル
- 一時ファイル
- 非公開課題
