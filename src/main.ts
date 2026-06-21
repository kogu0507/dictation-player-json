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
import {
  ExamWakeLockController,
  type ExamInterruptionReason,
  type WakeLockRequestResult,
} from "./platform/ExamWakeLockController";
import "./styles/main.css";
import { renderAppShell, requireElement } from "./ui/appView";
import { getKeyboardAction } from "./ui/keyboardShortcuts";
import {
  getModeUiState,
  type AppActivity,
  type AppMode,
  type ExamOutcome,
} from "./ui/modeState";
import { applyModeVisibility } from "./ui/modeVisibility";
import {
  getStatusPresentation,
  type AppStatusKind,
} from "./ui/statusPresentation";
import { getWakeLockGuidance } from "./ui/wakeLockGuidance";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) {
  throw new Error("アプリの描画先が見つかりません。");
}
const appRoot = root;

renderAppShell(appRoot);

const title = requireElement<HTMLElement>(appRoot, "#app-title");
const status = requireElement<HTMLElement>(appRoot, "#status");
const statusLabel = requireElement<HTMLElement>(appRoot, "#status-label");
const statusMessage = requireElement<HTMLElement>(appRoot, "#status-message");
const modeSelect = requireElement<HTMLSelectElement>(appRoot, "#mode-select");
const keySelect = requireElement<HTMLSelectElement>(appRoot, "#key-select");
const timbreSelect = requireElement<HTMLSelectElement>(
  appRoot,
  "#timbre-select",
);
const playbackRateSelect = requireElement<HTMLSelectElement>(
  appRoot,
  "#playback-rate-select",
);
const startMeasureSelect = requireElement<HTMLSelectElement>(
  appRoot,
  "#start-measure-select",
);
const endMeasureSelect = requireElement<HTMLSelectElement>(
  appRoot,
  "#end-measure-select",
);
const practiceControls = requireElement<HTMLElement>(
  appRoot,
  "#practice-controls",
);
const examControls = requireElement<HTMLElement>(appRoot, "#exam-controls");
const playButton = requireElement<HTMLButtonElement>(appRoot, "#play-button");
const stopButton = requireElement<HTMLButtonElement>(appRoot, "#stop-button");
const examStartButton = requireElement<HTMLButtonElement>(
  appRoot,
  "#exam-start-button",
);
const examCancelButton = requireElement<HTMLButtonElement>(
  appRoot,
  "#exam-cancel-button",
);
const examStepStatus = requireElement<HTMLElement>(
  appRoot,
  "#exam-step-status",
);
const examWakeLockGuidance = requireElement<HTMLElement>(
  appRoot,
  "#exam-wake-lock-guidance",
);
const scorePanel = requireElement<HTMLElement>(appRoot, "#score-panel");
const score = requireElement<HTMLElement>(appRoot, "#score");
const scoreKey = requireElement<HTMLElement>(appRoot, "#score-key");

const audioPlayer = new OscillatorAudioPlayer();
const examRunner = new ExamSequenceRunner(audioPlayer);
const examWakeLock = new ExamWakeLockController();
let melody: MelodyData | undefined;
let mode: AppMode = "practice";
let activity: AppActivity = "idle";
let examOutcome: ExamOutcome = "not-started";
let practiceRun = 0;
let examRequest = 0;
let completionTimer: number | undefined;

function setStatus(
  kind: AppStatusKind,
  message: string,
  options: { focus?: boolean } = {},
): void {
  const presentation = getStatusPresentation(kind);
  status.dataset.state = kind;
  status.setAttribute("role", presentation.role);
  status.setAttribute("aria-live", presentation.ariaLive);
  statusLabel.textContent = presentation.label;
  statusMessage.textContent = message;
  appRoot.setAttribute("aria-busy", String(presentation.busy));
  if (options.focus) {
    status.focus();
  }
}

function applyModeUiState(): void {
  const state = getModeUiState({
    mode,
    activity,
    examOutcome,
    hasMelody: melody !== undefined,
  });

  applyModeVisibility(
    { practiceControls, examControls, scorePanel },
    state,
  );
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
  setStatus("stopped", message);
  playButton.focus();
}

modeSelect.addEventListener("change", () => {
  void examWakeLock.release();
  mode = modeSelect.value as AppMode;
  if (mode === "exam") {
    examOutcome = "not-started";
    examStepStatus.textContent = "試験開始前";
    showWakeLockGuidance(examWakeLock.capability);
    updateExamSummary();
  } else {
    hideWakeLockGuidance();
    updatePracticeSummary();
  }
  applyModeUiState();
  focusPrimaryAction();
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
  setStatus("preparing", "再生を準備しています。");
  stopButton.focus();

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
      "playing",
      `再生中（${startMeasure}〜${endMeasure}小節・${playbackRate}倍・約${Math.ceil(eventDuration)}秒）`,
    );

    completionTimer = window.setTimeout(() => {
      if (currentRun !== practiceRun || activity !== "practice") {
        return;
      }
      completionTimer = undefined;
      activity = "idle";
      applyModeUiState();
      setStatus("completed", "再生が終了しました。");
      playButton.focus();
    }, (scheduledDuration + 0.1) * 1000);
  } catch (error) {
    if (currentRun !== practiceRun) {
      return;
    }
    audioPlayer.stopAll();
    activity = "idle";
    applyModeUiState();
    setStatus(
      "error",
      error instanceof Error
        ? `再生できませんでした: ${error.message}`
        : "再生できませんでした。",
      { focus: true },
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
      "error",
      error instanceof Error
        ? `試験手順が不正です: ${error.message}`
        : "試験手順が不正です。",
      { focus: true },
    );
    return;
  }

  const currentRequest = ++examRequest;
  activity = "exam";
  examOutcome = "not-started";
  examStepStatus.textContent = "試験を準備しています";
  applyModeUiState();
  setStatus("preparing", "試験を準備しています。");
  examCancelButton.focus();

  try {
    const wakeLockRequest = examWakeLock.acquire(
      handleExamInterruption,
    );
    const audioResume = audioPlayer.resume();
    const wakeLockResult = await wakeLockRequest;
    updateWakeLockRequestGuidance(wakeLockResult);
    await audioResume;
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
        setStatus(
          stepState.step.type === "rest" ? "waiting" : "playing",
          `試験中: ${message}`,
        );
      },
    });

    if (currentRequest !== examRequest) {
      return;
    }
    await examWakeLock.release();
    activity = "idle";
    examOutcome = result === "completed" ? "completed" : "cancelled";
    examStepStatus.textContent =
      result === "completed" ? "試験終了" : "試験中止";
    applyModeUiState();
    setStatus(
      result === "completed" ? "completed" : "stopped",
      result === "completed"
        ? "試験が終了しました。"
        : "試験を中止しました。",
    );
    examStartButton.focus();
  } catch (error) {
    if (currentRequest !== examRequest) {
      return;
    }
    audioPlayer.stopAll();
    await examWakeLock.release();
    activity = "idle";
    examOutcome = "cancelled";
    examStepStatus.textContent = "試験エラー";
    applyModeUiState();
    setStatus(
      "error",
      error instanceof Error
        ? `試験を実行できませんでした: ${error.message}`
        : "試験を実行できませんでした。",
      { focus: true },
    );
  }
});

examCancelButton.addEventListener("click", () => {
  cancelExam("試験を中止しました。");
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const action = getKeyboardAction({
    code: event.code,
    targetTagName:
      target instanceof HTMLElement ? target.tagName : "",
    mode,
    activity,
    hasMelody: melody !== undefined,
  });
  if (action === undefined) {
    return;
  }

  event.preventDefault();
  if (action === "start-practice") {
    playButton.click();
  } else if (action === "stop-practice") {
    stopButton.click();
  } else if (action === "start-exam") {
    examStartButton.click();
  } else {
    examCancelButton.click();
  }
});

async function initialize(): Promise<void> {
  setStatus("loading", "課題データを読み込んでいます。");
  const id = new URLSearchParams(window.location.search).get("id");
  if (id === null || id.length === 0) {
    setStatus(
      "error",
      "URLパラメータ id で課題を指定してください。",
      { focus: true },
    );
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
    setStatus("error", formatLoadError(error), { focus: true });
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
    "ready",
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
    "ready",
    `${keySelect.value}調・基準${melody.play.bpm} BPM・${scoreState}`,
  );
}

function handleExamInterruption(reason: ExamInterruptionReason): void {
  if (activity !== "exam") {
    return;
  }
  const message =
    reason === "document-hidden"
      ? "画面が非表示になったため、試験と発音を中止しました。復帰後は自動再開しません。"
      : "画面消灯防止が解除されたため、試験を中止しました。";
  cancelExam(message, true);
}

function cancelExam(message: string, focusStatus = false): void {
  if (activity !== "exam") {
    return;
  }
  examRequest += 1;
  examRunner.cancel();
  audioPlayer.stopAll();
  void examWakeLock.release();
  activity = "idle";
  examOutcome = "cancelled";
  examStepStatus.textContent = "試験中止";
  applyModeUiState();
  setStatus("stopped", message, { focus: focusStatus });
  if (!focusStatus) {
    examStartButton.focus();
  }
}

function updateWakeLockRequestGuidance(
  result: WakeLockRequestResult,
): void {
  if (result === "acquired") {
    hideWakeLockGuidance();
    return;
  }
  showWakeLockGuidance(result);
}

function showWakeLockGuidance(
  state: Parameters<typeof getWakeLockGuidance>[0],
): void {
  const message = getWakeLockGuidance(state);
  examWakeLockGuidance.hidden = message === undefined;
  examWakeLockGuidance.textContent = message ?? "";
}

function hideWakeLockGuidance(): void {
  examWakeLockGuidance.hidden = true;
  examWakeLockGuidance.textContent = "";
}

function focusPrimaryAction(): void {
  const target = mode === "practice" ? playButton : examStartButton;
  if (!target.disabled) {
    target.focus();
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
