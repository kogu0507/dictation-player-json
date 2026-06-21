import type { AppActivity, AppMode } from "./modeState";

export type KeyboardAction =
  | "start-practice"
  | "stop-practice"
  | "start-exam"
  | "cancel-exam";

export interface KeyboardShortcutInput {
  code: string;
  targetTagName: string;
  mode: AppMode;
  activity: AppActivity;
  hasMelody: boolean;
}

const INTERACTIVE_TAGS = new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
]);

export function getKeyboardAction(
  input: KeyboardShortcutInput,
): KeyboardAction | undefined {
  if (!input.hasMelody) {
    return undefined;
  }

  if (input.code === "Escape") {
    if (input.activity === "practice") {
      return "stop-practice";
    }
    if (input.activity === "exam") {
      return "cancel-exam";
    }
    return undefined;
  }

  if (
    input.code !== "Space" ||
    INTERACTIVE_TAGS.has(input.targetTagName.toUpperCase())
  ) {
    return undefined;
  }

  if (input.mode === "practice") {
    return input.activity === "practice"
      ? "stop-practice"
      : input.activity === "idle"
        ? "start-practice"
        : undefined;
  }

  return input.activity === "exam"
    ? "cancel-exam"
    : input.activity === "idle"
      ? "start-exam"
      : undefined;
}
