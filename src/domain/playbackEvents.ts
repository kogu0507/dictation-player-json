import type { MelodyData } from "../data/types";

export interface PlaybackEvent {
  pitch: number;
  startSeconds: number;
  durationSeconds: number;
  velocity: number;
}

export function qstampToSeconds(
  qstamp: number,
  bpm: number,
  playbackRate = 1,
): number {
  return qstamp * (60 / (bpm * playbackRate));
}

export function createFullSongEvents(
  melody: MelodyData,
  selectedKey: string,
): PlaybackEvent[] {
  const key = melody.keys[selectedKey];
  if (key === undefined) {
    throw new Error(`未対応の調です: ${selectedKey}`);
  }

  return Object.values(melody.play.voices)
    .flat()
    .map((note) => ({
      pitch: note.pitch + key.semitones,
      startSeconds: qstampToSeconds(note.qstamp, melody.play.bpm),
      durationSeconds: qstampToSeconds(note.duration, melody.play.bpm),
      velocity: note.velocity,
    }))
    .sort((left, right) => left.startSeconds - right.startSeconds);
}

export function getPlaybackDuration(events: PlaybackEvent[]): number {
  return events.reduce(
    (duration, event) =>
      Math.max(duration, event.startSeconds + event.durationSeconds),
    0,
  );
}
