import type {
  ChordSequenceStep,
  SignalSequenceStep,
} from "../data/types";
import type { PlaybackEvent } from "../domain/playbackEvents";
import { transposePitch } from "../domain/transposition";

export function createChordPlaybackEvents(
  step: ChordSequenceStep,
  semitones: number,
): PlaybackEvent[] {
  return step.pitches.map((pitch) => ({
    pitch: transposePitch(pitch, semitones),
    startSeconds: 0,
    durationSeconds: step.duration_sec,
    velocity: step.velocity,
  }));
}

export function createSignalPlaybackEvents(
  step: SignalSequenceStep,
): PlaybackEvent[] {
  if (step.content !== "end_bell") {
    throw new Error(`未対応の終了信号です: ${step.content}`);
  }

  return [
    {
      pitch: 84,
      startSeconds: 0,
      durationSeconds: 0.22,
      velocity: 76,
    },
    {
      pitch: 91,
      startSeconds: 0.24,
      durationSeconds: 0.5,
      velocity: 68,
    },
  ];
}
