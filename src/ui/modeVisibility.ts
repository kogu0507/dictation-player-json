import type { ModeUiState } from "./modeState";

export interface ModeVisibilityTargets {
  practiceControls: Pick<HTMLElement, "hidden">;
  examControls: Pick<HTMLElement, "hidden">;
  scorePanel: Pick<HTMLElement, "hidden">;
}

export function applyModeVisibility(
  targets: ModeVisibilityTargets,
  state: ModeUiState,
): void {
  targets.practiceControls.hidden = state.practiceControlsHidden;
  targets.examControls.hidden = state.examControlsHidden;
  targets.scorePanel.hidden = state.scoreHidden;
}
