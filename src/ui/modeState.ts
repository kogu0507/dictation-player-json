export type AppMode = "practice" | "exam";
export type AppActivity = "idle" | "practice" | "exam";
export type ExamOutcome = "not-started" | "completed" | "cancelled";

export interface ModeStateInput {
  mode: AppMode;
  activity: AppActivity;
  examOutcome: ExamOutcome;
  hasMelody: boolean;
}

export interface ModeUiState {
  practiceControlsHidden: boolean;
  examControlsHidden: boolean;
  scoreHidden: boolean;
  modeDisabled: boolean;
  commonSettingsDisabled: boolean;
  practiceSettingsDisabled: boolean;
  practicePlayDisabled: boolean;
  practiceStopDisabled: boolean;
  examStartDisabled: boolean;
  examCancelDisabled: boolean;
}

export function getModeUiState(input: ModeStateInput): ModeUiState {
  const { mode, activity, examOutcome, hasMelody } = input;
  const busy = activity !== "idle";
  const unavailable = !hasMelody;

  return {
    practiceControlsHidden: mode !== "practice",
    examControlsHidden: mode !== "exam",
    scoreHidden:
      mode === "exam" &&
      (activity === "exam" || examOutcome === "not-started"),
    modeDisabled: unavailable || busy,
    commonSettingsDisabled: unavailable || busy,
    practiceSettingsDisabled:
      unavailable || busy || mode !== "practice",
    practicePlayDisabled:
      unavailable || busy || mode !== "practice",
    practiceStopDisabled: activity !== "practice",
    examStartDisabled: unavailable || busy || mode !== "exam",
    examCancelDisabled: activity !== "exam",
  };
}
