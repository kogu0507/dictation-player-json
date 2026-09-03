import { describe, expect, it } from "vitest";
import { getModeUiState } from "../src/ui/modeState";

describe("getModeUiState", () => {
  it("練習モードでは譜面と練習操作を表示する", () => {
    const state = getModeUiState({
      mode: "practice",
      activity: "idle",
      examOutcome: "not-started",
      hasMelody: true,
      examAvailable: true,
    });
    expect(state.practiceControlsHidden).toBe(false);
    expect(state.examControlsHidden).toBe(true);
    expect(state.scoreHidden).toBe(false);
    expect(state.practicePlayDisabled).toBe(false);
  });

  it("試験開始前と実行中は譜面を隠す", () => {
    expect(
      getModeUiState({
        mode: "exam",
        activity: "idle",
        examOutcome: "not-started",
        hasMelody: true,
      examAvailable: true,
      }).scoreHidden,
    ).toBe(true);
    const running = getModeUiState({
      mode: "exam",
      activity: "exam",
      examOutcome: "not-started",
      hasMelody: true,
      examAvailable: true,
    });
    expect(running.scoreHidden).toBe(true);
    expect(running.modeDisabled).toBe(true);
    expect(running.commonSettingsDisabled).toBe(true);
    expect(running.examStartDisabled).toBe(true);
    expect(running.examCancelDisabled).toBe(false);
  });

  it("試験手順がない課題では試験開始を無効化する", () => {
    const state = getModeUiState({
      mode: "exam",
      activity: "idle",
      examOutcome: "not-started",
      hasMelody: true,
      examAvailable: false,
    });
    expect(state.examStartDisabled).toBe(true);
  });

  it.each(["completed", "cancelled"] as const)(
    "試験%s後は譜面を再表示してモード切替可能にする",
    (examOutcome) => {
      const state = getModeUiState({
        mode: "exam",
        activity: "idle",
        examOutcome,
        hasMelody: true,
      examAvailable: true,
      });
      expect(state.scoreHidden).toBe(false);
      expect(state.modeDisabled).toBe(false);
      expect(state.examStartDisabled).toBe(false);
    },
  );
});
