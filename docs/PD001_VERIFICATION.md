# PD-001 v0.7 非公開プレイヤー検証の再現手順

タスク契約と結果の正本は [Issue #19](https://github.com/kogu0507/dictation-player-json/issues/19)、対象コードは [Draft PR #18](https://github.com/kogu0507/dictation-player-json/pull/18)。source repo 内だけで行う。原曲・派生生成は dictation-content 側の担当。

## 入力の固定

[PD-001 CURRENT](https://docs.google.com/document/d/1d6NzTQM1CnOezHm3l1C6DvmvNlnv6T1EVPukp1QYE6A/edit) が指定する [非公開 v0.7 ZIP](https://drive.google.com/file/d/1ndFKSNb6EFK0hYPi49nrs3v4oRKAzaZw/view) を取得し、source repo の `.qc/issue-19/v0.7/` に展開する。パッケージ内のスクリプトやパッチは実行せず、生成済みJSONを検証入力として使う。

- ZIP SHA-256: `573a79cb2a020369826d878ecd26becf7a3a30cb0e0629521d3cb2dfd534d08b`
- `公開候補/pd001-rinaldo.json` SHA-256: `903d45c0c869a714ab42f87cb557bdfa59c7212282f1ee1b55ca6d59ff600641`
- JSONは未編集で使用する。候補・画像・ログは `.qc/` に置き、Gitと公開パッケージへ含めない。

## 自動回帰（PowerShell、source repoで実行）

```powershell
npm ci
npm test
$env:PD001_FIXTURE_PATH='.qc/issue-19/v0.7/公開候補/pd001-rinaldo.json'
npm test -- --reporter=json --outputFile=.qc/issue-19/vitest-candidate.json
Remove-Item Env:PD001_FIXTURE_PATH
npm run build
git diff --check
```

通常テストでは sample1 / sample_harmony1 と既存契約を検証する。候補なしでは `pd001Candidate.test.mjs` の4ケースを明示的にskipし、DOM統合テストにはsample1を使用する。環境変数指定時は同じDOM統合テストを実v0.7で実行し、候補のハッシュ・契約・全12調/4速度・第2小節末休符・主和音・17-stepの時間も検証する。fake AudioPlayer / fake timers はブラウザ音質の証明ではない。

## 非本番ブラウザ確認

```powershell
$env:VITE_DATA_BASE_URL='/.qc/issue-19/v0.7/公開候補'
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

同じPCで `http://127.0.0.1:5173/?id=pd001-rinaldo` を開く。別課題の確認時はサーバーを停止し、`Remove-Item Env:VITE_DATA_BASE_URL` 後に再起動する。候補のデータURLをproduction設定へ保存しない。

確認ポイント:

- 原調F、3/2、8小節、25音、5休符、12調、各4+4小節の2段。
- 既存「基準144 BPM」は四分音符基準。制作上の二分音符72と同じ速度。拍単位ラベルの変更は別判断。
- 第2小節単独: 発音終了1.666667秒、小節末2.5秒。開始余裕50msとUI余裕100msを加え、練習完了は約2.65秒。音符を休符へ延長しない。
- 試験は練習速度に関係なく1倍。主和音65/69/72を同時に4秒。全曲20秒、1〜4/5〜8小節は各10秒。
- 17ステップの理論待機秒数: `4.05, 4, 20.05, 20, 10.05, 20, 10.05, 20, 20.05, 20, 10.05, 20, 10.05, 20, 20.05, 120, 0.79`。計349.19秒。9回の音声バッチに各50msの開始余裕を含む。実時間にはブラウザのタイマー遅延が加わり得る。
- 試験前・実行中は譜面非表示。終了・中止後は表示し操作を戻す。末尾休符中・最後の120秒待機中も中止できる。
- 非表示／Wake Lock解放で中止し、復帰時に自動再開しない。
- PC1366×900と390×844で操作、12調切替、横はみ出し、譜面の可読性を確認する。幅変更は端末実機テストの代わりにはならない。

## Human Gate

- Android Chrome、iOS Safari 16.4以降の実機でユーザー操作によるAudioContext開始、両音色、音末5ms、短音・付点・連打・長音・休符を試聴する。イヤホン／スピーカーと音量差も確認する。
- 非本番HTTPSでWake Lock取得・解放、画面非表示・復帰、長い待機中の中止を確認する。ループバックでの確認を実機HTTPS確認の代用にしない。
- 先生が原典・答え譜・音高／リズム／主和音配置／終止感・全17手順を校閲し、教材採否と難度を判断する。独立WAVの承認は正式プレイヤーの聴感承認を代行しない。
- 公開ID・表題、原典画像等の権利、公開範囲、generator側レビュー、PR承認・マージ・公開GOを別途確認する。

## 公開境界

この検証では `release:*`、deploy mirror同期、FTP、本番反映、マージを実行しない。今回はアップロード元・先ともになし。将来別途公開承認された場合の配置規則は `DEPLOYMENT.md` に従い、アプリは source `dist/` の中身から mirror `C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\app\dictation-player-json\`、そこからサーバー `/app/dictation-player-json/` へ。課題JSONは制作側承認後の生成物から mirror `public_html/data/dictation/melody/`、そこから `/data/dictation/melody/` へ配置する。本検証結果をその操作の承認とみなさない。
