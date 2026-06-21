import { OscillatorAudioPlayer } from "./audio/OscillatorAudioPlayer";
import type { SynthTimbre } from "./audio/types";
import { loadMelody, MelodyLoadError } from "./data/loadMelody";
import type { MelodyData } from "./data/types";
import { resolvePlaybackRate } from "./domain/playbackRate";
import {
  createMelodyPlaybackEvents,
  getPlaybackDuration,
} from "./domain/playbackEvents";
import { getMelodyKey } from "./domain/transposition";
import "./styles/main.css";
import { renderAppShell, requireElement } from "./ui/appView";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) {
  throw new Error("アプリの描画先が見つかりません。");
}

renderAppShell(root);

const title = requireElement<HTMLElement>(root, "#app-title");
const status = requireElement<HTMLElement>(root, "#status");
const keySelect = requireElement<HTMLSelectElement>(root, "#key-select");
const timbreSelect = requireElement<HTMLSelectElement>(
  root,
  "#timbre-select",
);
const playbackRateSelect = requireElement<HTMLSelectElement>(
  root,
  "#playback-rate-select",
);
const startMeasureSelect = requireElement<HTMLSelectElement>(
  root,
  "#start-measure-select",
);
const endMeasureSelect = requireElement<HTMLSelectElement>(
  root,
  "#end-measure-select",
);
const playButton = requireElement<HTMLButtonElement>(root, "#play-button");
const stopButton = requireElement<HTMLButtonElement>(root, "#stop-button");
const score = requireElement<HTMLElement>(root, "#score");
const scoreKey = requireElement<HTMLElement>(root, "#score-key");

const audioPlayer = new OscillatorAudioPlayer();
let melody: MelodyData | undefined;
let playbackRun = 0;
let completionTimer: number | undefined;

function setStatus(message: string, isError = false): void {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function setPlaying(isPlaying: boolean): void {
  playButton.disabled = isPlaying || melody === undefined;
  stopButton.disabled = !isPlaying;
  keySelect.disabled = isPlaying || melody === undefined;
  timbreSelect.disabled = isPlaying || melody === undefined;
  playbackRateSelect.disabled = isPlaying || melody === undefined;
  startMeasureSelect.disabled = isPlaying || melody === undefined;
  endMeasureSelect.disabled = isPlaying || melody === undefined;
}

function renderSelectedScore(): void {
  if (melody === undefined) {
    return;
  }
  const selectedKey = keySelect.value;
  const key = getMelodyKey(melody, selectedKey);

  score.replaceChildren();
  score.insertAdjacentHTML("afterbegin", key.svg);
  scoreKey.textContent = selectedKey;
}

function stopPlayback(message = "停止しました。"): void {
  playbackRun += 1;
  if (completionTimer !== undefined) {
    window.clearTimeout(completionTimer);
    completionTimer = undefined;
  }
  audioPlayer.stopAll();
  setPlaying(false);
  setStatus(message);
}

keySelect.addEventListener("change", () => {
  renderSelectedScore();
  updatePracticeSummary();
});

timbreSelect.addEventListener("change", () => {
  audioPlayer.setTimbre(timbreSelect.value as SynthTimbre);
});

playbackRateSelect.addEventListener("change", updatePracticeSummary);
startMeasureSelect.addEventListener("change", () => {
  updateMeasureRangeOptions();
  updatePracticeSummary();
});
endMeasureSelect.addEventListener("change", () => {
  updateMeasureRangeOptions();
  updatePracticeSummary();
});

playButton.addEventListener("click", async () => {
  if (melody === undefined) {
    return;
  }

  const currentRun = ++playbackRun;
  setPlaying(true);
  setStatus("再生を準備しています…");

  try {
    await audioPlayer.resume();
    if (currentRun !== playbackRun) {
      return;
    }

    const startMeasure = Number(startMeasureSelect.value);
    const endMeasure = Number(endMeasureSelect.value);
    const playbackRate = resolvePlaybackRate(
      "practice",
      Number(playbackRateSelect.value),
    );
    const events = createMelodyPlaybackEvents(melody, {
      selectedKey: keySelect.value,
      playbackRate,
      startMeasure,
      endMeasure,
    });
    const scheduledDuration = audioPlayer.play(events);
    const eventDuration = getPlaybackDuration(events);
    setStatus(
      `再生中（${startMeasure}〜${endMeasure}小節・${playbackRate}倍・約${Math.ceil(eventDuration)}秒）`,
    );

    completionTimer = window.setTimeout(() => {
      if (currentRun !== playbackRun) {
        return;
      }
      completionTimer = undefined;
      setPlaying(false);
      setStatus("再生が終了しました。");
    }, (scheduledDuration + 0.1) * 1000);
  } catch (error) {
    if (currentRun !== playbackRun) {
      return;
    }
    audioPlayer.stopAll();
    setPlaying(false);
    setStatus(
      error instanceof Error
        ? `再生できませんでした: ${error.message}`
        : "再生できませんでした。",
      true,
    );
  }
});

stopButton.addEventListener("click", () => stopPlayback());

async function initialize(): Promise<void> {
  const id = new URLSearchParams(window.location.search).get("id");
  if (id === null || id.length === 0) {
    setStatus("URLパラメータ id で課題を指定してください。", true);
    title.textContent = "課題を指定できません";
    score.innerHTML =
      '<p class="placeholder">例: <code>?id=sample1</code></p>';
    return;
  }

  try {
    melody = await loadMelody(id);
    title.textContent = melody.title;

    const keyNames = Object.keys(melody.keys);
    keySelect.replaceChildren(
      ...keyNames.map((keyName) => {
        const option = document.createElement("option");
        option.value = keyName;
        option.textContent = keyName;
        option.selected = keyName === melody?.base_key;
        return option;
      }),
    );

    const measureOptions = Array.from(
      { length: melody.measures },
      (_, index) => {
        const option = document.createElement("option");
        option.value = String(index + 1);
        option.textContent = String(index + 1);
        return option;
      },
    );
    startMeasureSelect.replaceChildren(
      ...measureOptions.map((option) => option.cloneNode(true)),
    );
    endMeasureSelect.replaceChildren(
      ...measureOptions.map((option) => option.cloneNode(true)),
    );
    startMeasureSelect.value = "1";
    endMeasureSelect.value = String(melody.measures);
    updateMeasureRangeOptions();

    audioPlayer.setTimbre("triangle");
    renderSelectedScore();
    setPlaying(false);
    updatePracticeSummary();
  } catch (error) {
    melody = undefined;
    setPlaying(false);
    title.textContent = "課題を読み込めません";
    score.innerHTML =
      '<p class="placeholder">課題データを確認して、再読み込みしてください。</p>';
    setStatus(formatLoadError(error), true);
  }
}

function updateMeasureRangeOptions(): void {
  const startMeasure = Number(startMeasureSelect.value);
  const endMeasure = Number(endMeasureSelect.value);

  for (const option of startMeasureSelect.options) {
    option.disabled = Number(option.value) > endMeasure;
  }
  for (const option of endMeasureSelect.options) {
    option.disabled = Number(option.value) < startMeasure;
  }
}

function updatePracticeSummary(): void {
  if (melody === undefined) {
    return;
  }
  setStatus(
    `${keySelect.value}調・${startMeasureSelect.value}〜${endMeasureSelect.value}小節・${playbackRateSelect.value}倍・基準${melody.play.bpm} BPM`,
  );
}

function formatLoadError(error: unknown): string {
  if (error instanceof MelodyLoadError) {
    return error.message;
  }
  return error instanceof Error
    ? `予期しないエラーが発生しました: ${error.message}`
    : "予期しないエラーが発生しました。";
}

void initialize();
