import { describe, expect, it } from "vitest";
import type { MelodyData } from "../src/data/types";
import {
  createPlaybackEvents,
  createFullSongEvents,
  qstampToSeconds,
} from "../src/domain/playbackEvents";
import { transposePitch } from "../src/domain/transposition";

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

  it("0以下のBPMまたは速度倍率を拒否する", () => {
    expect(() => qstampToSeconds(1, 0, 1)).toThrow();
    expect(() => qstampToSeconds(1, 80, 0)).toThrow();
    expect(() => qstampToSeconds(-1, 80, 1)).toThrow();
  });
});

describe("transposePitch", () => {
  it("半音数を加算する", () => {
    expect(transposePitch(60, -5)).toBe(55);
    expect(transposePitch(60, 6)).toBe(66);
  });

  it("MIDI範囲外を拒否する", () => {
    expect(() => transposePitch(0, -1)).toThrow(
      "移調後のpitchがMIDI範囲外です。",
    );
    expect(() => transposePitch(127, 1)).toThrow(
      "移調後のpitchがMIDI範囲外です。",
    );
  });

  it("MIDI境界値0と127を許可する", () => {
    expect(transposePitch(5, -5)).toBe(0);
    expect(transposePitch(121, 6)).toBe(127);
  });
});

describe("createPlaybackEvents", () => {
  it("範囲先頭へ時刻を再配置し、境界をまたぐ音を切り詰める", () => {
    expect(
      createPlaybackEvents(
        [
          {
            pitch: 60,
            qstamp: 2,
            duration: 3,
            measure: 1,
            velocity: 64,
          },
          {
            pitch: 62,
            qstamp: 7,
            duration: 2,
            measure: 2,
            velocity: 100,
          },
          {
            pitch: 64,
            qstamp: 9,
            duration: 1,
            measure: 3,
            velocity: 90,
          },
        ],
        {
          bpm: 60,
          playbackRate: 1,
          semitones: 2,
          startQstamp: 4,
          endQstamp: 8,
        },
      ),
    ).toEqual([
      {
        pitch: 62,
        startSeconds: 0,
        durationSeconds: 1,
        velocity: 64,
      },
      {
        pitch: 64,
        startSeconds: 3,
        durationSeconds: 1,
        velocity: 100,
      },
    ]);
  });

  it("velocityを変更せず再生イベントへ反映する", () => {
    const [event] = createPlaybackEvents(
      [
        {
          pitch: 60,
          qstamp: 0,
          duration: 1,
          measure: 1,
          velocity: 37,
        },
      ],
      {
        bpm: 120,
        playbackRate: 1,
        semitones: 0,
        startQstamp: 0,
        endQstamp: 4,
      },
    );
    expect(event?.velocity).toBe(37);
  });

  it("範囲開始で終了する音と範囲終了で始まる音を除外する", () => {
    expect(
      createPlaybackEvents(
        [
          {
            pitch: 60,
            qstamp: 2,
            duration: 2,
            measure: 1,
            velocity: 80,
          },
          {
            pitch: 62,
            qstamp: 8,
            duration: 1,
            measure: 3,
            velocity: 80,
          },
        ],
        {
          bpm: 60,
          playbackRate: 1,
          semitones: 0,
          startQstamp: 4,
          endQstamp: 8,
        },
      ),
    ).toEqual([]);
  });

  it("逆転または負の再生範囲を拒否する", () => {
    const note = {
      pitch: 60,
      qstamp: 0,
      duration: 1,
      measure: 1,
      velocity: 80,
    };
    expect(() =>
      createPlaybackEvents([note], {
        bpm: 80,
        playbackRate: 1,
        semitones: 0,
        startQstamp: 4,
        endQstamp: 4,
      }),
    ).toThrow("再生範囲のqstampが不正です。");
    expect(() =>
      createPlaybackEvents([note], {
        bpm: 80,
        playbackRate: 1,
        semitones: 0,
        startQstamp: -1,
        endQstamp: 4,
      }),
    ).toThrow("再生範囲のqstampが不正です。");
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
