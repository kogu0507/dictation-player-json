export const PRACTICE_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

export type PracticePlaybackRate =
  (typeof PRACTICE_PLAYBACK_RATES)[number];
export type PlaybackMode = "practice" | "exam";

export function isPracticePlaybackRate(
  value: number,
): value is PracticePlaybackRate {
  return PRACTICE_PLAYBACK_RATES.some((rate) => rate === value);
}

export function resolvePlaybackRate(
  mode: PlaybackMode,
  requestedRate: number,
): PracticePlaybackRate {
  if (mode === "exam") {
    return 1;
  }
  if (!isPracticePlaybackRate(requestedRate)) {
    throw new Error("練習速度は指定された候補から選択してください。");
  }
  return requestedRate;
}
