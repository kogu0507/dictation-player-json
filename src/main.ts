import { OscillatorAudioPlayer } from "./audio/OscillatorAudioPlayer";
import type { SynthTimbre } from "./audio/types";
import { loadMelody, MelodyLoadError } from "./data/loadMelody";
import type { MelodyData } from "./data/types";
import {
  createFullSongEvents,
  getPlaybackDuration,
} from "./domain/playbackEvents";
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
}

function renderSelectedScore(): void {
  if (melody === undefined) {
    return;
  }
  const selectedKey = keySelect.value;
  const key = melody.keys[selectedKey];
  if (key === undefined) {
    throw new Error("選択した調の譜面がありません。");
  }

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

keySelect.addEventListener("change", renderSelectedScore);

timbreSelect.addEventListener("change", () => {
  audioPlayer.setTimbre(timbreSelect.value as SynthTimbre);
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

    const events = createFullSongEvents(melody, keySelect.value);
    const scheduledDuration = audioPlayer.play(events);
    const eventDuration = getPlaybackDuration(events);
    setStatus(
      `再生中（${melody.play.bpm} BPM・約${Math.ceil(eventDuration)}秒）`,
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

    audioPlayer.setTimbre("triangle");
    renderSelectedScore();
    setPlaying(false);
    setStatus(
      `${melody.time_signature}・${melody.measures}小節・${melody.play.bpm} BPM`,
    );
  } catch (error) {
    melody = undefined;
    setPlaying(false);
    title.textContent = "課題を読み込めません";
    score.innerHTML =
      '<p class="placeholder">課題データを確認して、再読み込みしてください。</p>';
    setStatus(formatLoadError(error), true);
  }
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
