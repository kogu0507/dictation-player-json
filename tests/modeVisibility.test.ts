import { describe, expect, it } from "vitest";
import { getModeUiState } from "../src/ui/modeState";
import {
  applyModeVisibility,
  type ModeVisibilityTargets,
} from "../src/ui/modeVisibility";

function createTargets(): ModeVisibilityTargets {
  return {
    practiceControls: { hidden: false },
    examControls: { hidden: true },
    scorePanel: { hidden: false },
  };
}

describe("applyModeVisibility", () => {
  it("練習→試験→練習の往復で操作UIと譜面表示が復帰する", () => {
    const targets = createTargets();

    applyModeVisibility(
      targets,
      getModeUiState({
        mode: "practice",
        activity: "idle",
        examOutcome: "not-started",
        hasMelody: true,
        examAvailable: true,
      }),
    );
    expect(targets.practiceControls.hidden).toBe(false);
    expect(targets.examControls.hidden).toBe(true);
    expect(targets.scorePanel.hidden).toBe(false);

    applyModeVisibility(
      targets,
      getModeUiState({
        mode: "exam",
        activity: "idle",
        examOutcome: "not-started",
        hasMelody: true,
        examAvailable: true,
      }),
    );
    expect(targets.practiceControls.hidden).toBe(true);
    expect(targets.examControls.hidden).toBe(false);
    expect(targets.scorePanel.hidden).toBe(true);

    applyModeVisibility(
      targets,
      getModeUiState({
        mode: "practice",
        activity: "idle",
        examOutcome: "not-started",
        hasMelody: true,
        examAvailable: true,
      }),
    );
    expect(targets.practiceControls.hidden).toBe(false);
    expect(targets.examControls.hidden).toBe(true);
    expect(targets.scorePanel.hidden).toBe(false);
  });

  it("試験実行中も試験ボタン領域を表示し、譜面だけを隠す", () => {
    const targets = createTargets();
    applyModeVisibility(
      targets,
      getModeUiState({
        mode: "exam",
        activity: "exam",
        examOutcome: "not-started",
        hasMelody: true,
        examAvailable: true,
      }),
    );

    expect(targets.practiceControls.hidden).toBe(true);
    expect(targets.examControls.hidden).toBe(false);
    expect(targets.scorePanel.hidden).toBe(true);
  });
});
