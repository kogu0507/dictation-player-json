import { OscillatorAudioPlayer } from "./audio/OscillatorAudioPlayer";
import type { SynthTimbre } from "./audio/types";
import { loadMelody, MelodyLoadError } from "./data/loadMelody";
import type {
  MelodyData,
  PlaySequenceStep,
  SequenceStep,
} from "./data/types";
import { resolvePlaybackRate } from "./domain/playbackRate";
import {
  createMelodyPlaybackEvents,
  getPlaybackDuration,
} from "./domain/playbackEvents";
import { getMelodyKey } from "./domain/transposition";
import { ExamSequenceRunner } from "./exam/ExamSequenceRunner";
import { validateExamSequence } from "./exam/validateSequence";
import "./styles/main.css";
import { renderAppShell, requireElement } from "./ui/appView";
import {
  getModeUiState,
  type AppActivity,
  type AppMode,
  type ExamOutcome,
} from "./ui/modeState";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) {
  throw new Error("アプリの描画先が見つかりません。");
}

renderAppShell(root);

const title = requireElement<HTMLElement>(root, "#app-title");
const status = requireElement<HTMLElement>(root, "#status");
const modeSelect = requireElement<HTMLSelectElement>(root, "#mode-select");
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
const practiceControls = requireElement<HTMLElement>(
  root,
  "#practice-controls",
);
const examControls = requireElement<HTMLElement>(root, "#exam-controls");
const playButton = requireElement<HTMLButtonElement>(root, "#play-button");
const stopButton = requireElement<HTMLButtonElement>(root, "#stop-button");
const examStartButton = requireElement<HTMLButtonElement>(
  root,
  "#exam-start-button",
);
const examCancelButton = requireElement<HTMLButtonElement>(
  root,
  "#exam-cancel-button",
);
const examStepStatus = requireElement<HTMLElement>(
  root,
  "#exam-step-status",
);
const scorePanel = requireElement<HTMLElement>(root, "#score-panel");
const score = requireElement<HTMLElement>(root, "#score");
const scoreKey = requireElement<HTMLElement>(root, "#score-key");

const audioPlayer = new OscillatorAudioPlayer();
const examRunner = new ExamSequenceRunner(audioPlayer);
let melody: MelodyData | undefined;
let mode: AppMode = "practice";
let activity: AppActivity = "idle";
let examOutcome: ExamOutcome = "not-started";
let practiceRun = 0;
let examRequest = 0;
let completionTimer: number | undefined;

function setStatus(message: string, isError = false): void {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function applyModeUiState(): void {
  const state = getModeUiState({
    mode,
    activity,
    examOutcome,
    hasMelody: melody !== undefined,
  });

  practiceControls.hidden = state.practiceControlsHidden;
  examControls.hidden = state.examControlsHidden;
  scorePanel.hidden = state.scoreHidden;
  modeSelect.disabled = state.modeDisabled;
  keySelect.disabled = state.commonSettingsDisabled;
  timbreSelect.disabled = state.commonSettingsDisabled;
  playbackRateSelect.disabled = state.practiceSettingsDisabled;
  startMeasureSelect.disabled = state.practiceSettingsDisabled;
  endMeasureSelect.disabled = state.practiceSettingsDisabled;
  playButton.disabled = state.practicePlayDisabled;
  stopButton.disabled = state.practiceStopDisabled;
  examStartButton.disabled = state.examStartDisabled;
  examCancelButton.disabled = state.examCancelDisabled;
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

function stopPracticePlayback(message = "停止しました。"): void {
  practiceRun += 1;
  if (completionTimer !== undefined) {
    window.clearTimeout(completionTimer);
    completionTimer = undefined;
  }
  audioPlayer.stopAll();
  activity = "idle";
  applyModeUiState();
  setStatus(message);
}

modeSelect.addEventListener("change", () => {
  mode = modeSelect.value as AppMode;
  if (mode === "exam") {
    examOutcome = "not-started";
    examStepStatus.textContent = "試験開始前";
    updateExamSummary();
  } else {
    updatePracticeSummary();
  }
  applyModeUiState();
});

keySelect.addEventListener("change", () => {
  renderSelectedScore();
  if (mode === "practice") {
    updatePracticeSummary();
  } else {
    updateExamSummary();
  }
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
  if (melody === undefined || mode !== "practice") {
    return;
  }

  const currentRun = ++practiceRun;
  activity = "practice";
  applyModeUiState();
  setStatus("再生を準備しています…");

  try {
    await audioPlayer.resume();
    if (currentRun !== practiceRun || activity !== "practice") {
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
      if (currentRun !== practiceRun || activity !== "practice") {
        return;
      }
      completionTimer = undefined;
      activity = "idle";
      applyModeUiState();
      setStatus("再生が終了しました。");
    }, (scheduledDuration + 0.1) * 1000);
  } catch (error) {
    if (currentRun !== practiceRun) {
      return;
    }
    audioPlayer.stopAll();
    activity = "idle";
    applyModeUiState();
    setStatus(
      error instanceof Error
        ? `再生できませんでした: ${error.message}`
        : "再生できませんでした。",
      true,
    );
  }
});

stopButton.addEventListener("click", () => stopPracticePlayback());

examStartButton.addEventListener("click", async () => {
  if (melody === undefined || mode !== "exam" || activity !== "idle") {
    return;
  }
  const currentMelody = melody;

  let sequence: SequenceStep[];
  try {
    sequence = validateExamSequence(
      currentMelody.sequence,
      currentMelody.measures,
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? `試験手順が不正です: ${error.message}`
        : "試験手順が不正です。",
      true,
    );
    return;
  }

  const currentRequest = ++examRequest;
  activity = "exam";
  examOutcome = "not-started";
  examStepStatus.textContent = "試験を準備しています";
  applyModeUiState();
  setStatus("試験を準備しています…");

  try {
    await audioPlayer.resume();
    if (currentRequest !== examRequest || activity !== "exam") {
      return;
    }

    const selectedKey = getMelodyKey(currentMelody, keySelect.value);
    const result = await examRunner.run(sequence, {
      semitones: selectedKey.semitones,
      createPlayEvents: (step) =>
        createExamPlayEvents(currentMelody, step),
      onStep: (stepState) => {
        if (currentRequest !== examRequest || activity !== "exam") {
          return;
        }
        const message = formatExamStep(stepState.step);
        examStepStatus.textContent =
          `ステップ ${stepState.index + 1}/${stepState.total}: ${message}`;
        setStatus(`試験中: ${message}`);
      },
    });

    if (currentRequest !== examRequest) {
      return;
    }
    activity = "idle";
    examOutcome = result === "completed" ? "completed" : "cancelled";
    examStepStatus.textContent =
      result === "completed" ? "試験終了" : "試験中止";
    applyModeUiState();
    setStatus(
      result === "completed"
        ? "試験が終了しました。"
        : "試験を中止しました。",
    );
  } catch (error) {
    if (currentRequest !== examRequest) {
      return;
    }
    audioPlayer.stopAll();
    activity = "idle";
    examOutcome = "cancelled";
    examStepStatus.textContent = "試験エラー";
    applyModeUiState();
    setStatus(
      error instanceof Error
        ? `試験を実行できませんでした: ${error.message}`
        : "試験を実行できませんでした。",
      true,
    );
  }
});

examCancelButton.addEventListener("click", () => {
  if (activity !== "exam") {
    return;
  }
  examRequest += 1;
  examRunner.cancel();
  audioPlayer.stopAll();
  activity = "idle";
  examOutcome = "cancelled";
  examStepStatus.textContent = "試験中止";
  applyModeUiState();
  setStatus("試験を中止しました。");
});

async function initialize(): Promise<void> {
  const id = new URLSearchParams(window.location.search).get("id");
  if (id === null || id.length === 0) {
    setStatus("URLパラメータ id で課題を指定してください。", true);
    title.textContent = "課題を指定できません";
    score.innerHTML =
      '<p class="placeholder">例: <code>?id=sample1</code></p>';
    applyModeUiState();
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
    activity = "idle";
    mode = "practice";
    examOutcome = "not-started";
    applyModeUiState();
    updatePracticeSummary();
  } catch (error) {
    melody = undefined;
    activity = "idle";
    applyModeUiState();
    title.textContent = "課題を読み込めません";
    score.innerHTML =
      '<p class="placeholder">課題データを確認して、再読み込みしてください。</p>';
    setStatus(formatLoadError(error), true);
  }
}

function createExamPlayEvents(
  currentMelody: MelodyData,
  step: PlaySequenceStep,
) {
  return createMelodyPlaybackEvents(currentMelody, {
    selectedKey: keySelect.value,
    playbackRate: resolvePlaybackRate(
      "exam",
      Number(playbackRateSelect.value),
    ),
    startMeasure: step.start_measure,
    endMeasure: step.end_measure,
  });
}

function formatExamStep(step: SequenceStep): string {
  if (step.type === "chord") {
    return step.label ?? "和音を再生";
  }
  if (step.type === "rest") {
    return `待機中（${step.duration_sec}秒）`;
  }
  if (step.type === "play") {
    return `${step.start_measure}〜${step.end_measure}小節を再生`;
  }
  return "終了音を再生";
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

function updateExamSummary(): void {
  if (melody === undefined) {
    return;
  }
  const scoreState =
    examOutcome === "not-started" ? "譜面非表示" : "譜面表示";
  setStatus(
    `${keySelect.value}調・基準${melody.play.bpm} BPM・${scoreState}`,
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
