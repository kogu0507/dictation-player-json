import type { MelodyData, MelodyNote } from "../data/types";
import {
  getMeasureQstampRange,
  type MeasureRange,
} from "./measureRange";
import { getMelodyKey, transposePitch } from "./transposition";

export interface PlaybackEvent {
  pitch: number;
  startSeconds: number;
  durationSeconds: number;
  velocity: number;
}

export interface QstampRange {
  startQstamp: number;
  endQstamp: number;
}

export interface PlaybackEventOptions extends QstampRange {
  bpm: number;
  playbackRate: number;
  semitones: number;
}

export interface MelodyPlaybackOptions extends MeasureRange {
  selectedKey: string;
  playbackRate: number;
}

export function qstampToSeconds(
  qstamp: number,
  bpm: number,
  playbackRate = 1,
): number {
  if (bpm <= 0 || playbackRate <= 0) {
    throw new Error("BPMと速度倍率は0より大きい必要があります。");
  }
  return qstamp * (60 / (bpm * playbackRate));
}

export function createPlaybackEvents(
  notes: MelodyNote[],
  options: PlaybackEventOptions,
): PlaybackEvent[] {
  const {
    bpm,
    playbackRate,
    semitones,
    startQstamp,
    endQstamp,
  } = options;

  if (startQstamp < 0 || endQstamp <= startQstamp) {
    throw new Error("再生範囲のqstampが不正です。");
  }

  return notes
    .flatMap((note): PlaybackEvent[] => {
      const noteEndQstamp = note.qstamp + note.duration;
      if (
        note.qstamp >= endQstamp ||
        noteEndQstamp <= startQstamp
      ) {
        return [];
      }

      const clippedStartQstamp = Math.max(note.qstamp, startQstamp);
      const clippedEndQstamp = Math.min(noteEndQstamp, endQstamp);

      return [
        {
          pitch: transposePitch(note.pitch, semitones),
          startSeconds: qstampToSeconds(
            clippedStartQstamp - startQstamp,
            bpm,
            playbackRate,
          ),
          durationSeconds: qstampToSeconds(
            clippedEndQstamp - clippedStartQstamp,
            bpm,
            playbackRate,
          ),
          velocity: note.velocity,
        },
      ];
    })
    .sort((left, right) => left.startSeconds - right.startSeconds);
}

export function createFullSongEvents(
  melody: MelodyData,
  selectedKey: string,
  playbackRate = 1,
): PlaybackEvent[] {
  return createMelodyPlaybackEvents(melody, {
    selectedKey,
    playbackRate,
    startMeasure: 1,
    endMeasure: melody.measures,
  });
}

export function createMelodyPlaybackEvents(
  melody: MelodyData,
  options: MelodyPlaybackOptions,
): PlaybackEvent[] {
  const { selectedKey, playbackRate, startMeasure, endMeasure } = options;
  const key = getMelodyKey(melody, selectedKey);

  const range = getMeasureQstampRange(melody.measure_map, {
    startMeasure,
    endMeasure,
  });

  return createPlaybackEvents(Object.values(melody.play.voices).flat(), {
    bpm: melody.play.bpm,
    playbackRate,
    semitones: key.semitones,
    ...range,
  });
}

export function getPlaybackDuration(events: PlaybackEvent[]): number {
  return events.reduce(
    (duration, event) =>
      Math.max(duration, event.startSeconds + event.durationSeconds),
    0,
  );
}
