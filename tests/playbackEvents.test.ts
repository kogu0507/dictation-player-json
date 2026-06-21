import { describe, expect, it } from "vitest";
import type { MelodyData } from "../src/data/types";
import {
  createFullSongEvents,
  qstampToSeconds,
} from "../src/domain/playbackEvents";

const melody: MelodyData = {
  schema_version: 1,
  id: "test",
  type: "melody",
  title: "テスト",
  base_key: "G",
  mode: "major",
  time_signature: "4/4",
  measures: 1,
  measure_map: [{ measure: 1, start_qstamp: 0, end_qstamp: 4 }],
  play: {
    bpm: 60,
    voices: {
      soprano: [
        {
          pitch: 60,
          qstamp: 1,
          duration: 2,
          measure: 1,
          velocity: 100,
        },
      ],
    },
  },
  keys: {
    G: { semitones: 0, svg: "<svg></svg>" },
    A: { semitones: 2, svg: "<svg></svg>" },
  },
  sequence: [],
};

describe("qstampToSeconds", () => {
  it("BPMと速度倍率から秒へ変換する", () => {
    expect(qstampToSeconds(4, 120, 2)).toBe(1);
  });
});

describe("createFullSongEvents", () => {
  it("選択調の半音数を加算して全曲イベントを作る", () => {
    expect(createFullSongEvents(melody, "A")).toEqual([
      {
        pitch: 62,
        startSeconds: 1,
        durationSeconds: 2,
        velocity: 100,
      },
    ]);
  });
});
