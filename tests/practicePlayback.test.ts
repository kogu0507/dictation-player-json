import { describe, expect, it } from "vitest";
import sampleHarmonyJson from "../testdata/harmony/sample_harmony1.json";
import sample1Json from "../testdata/melody/sample1.json";
import {
  validateHarmonyData,
  validateMelodyData,
} from "../src/data/validateMelody";
import {
  createContentPlaybackEvents,
  createMelodyPlaybackEvents,
} from "../src/domain/playbackEvents";

const melody = validateMelodyData(sample1Json, "sample1");
const harmony = validateHarmonyData(sampleHarmonyJson, "sample_harmony1");

describe("sample1の練習再生イベント", () => {
  it.each([
    [1, 4, 12],
    [5, 8, 12],
    [1, 8, 24],
  ])(
    "%i〜%i小節を範囲先頭0秒から再生できる",
    (startMeasure, endMeasure, expectedMaxSeconds) => {
      const events = createMelodyPlaybackEvents(melody, {
        selectedKey: "G",
        playbackRate: 1,
        startMeasure,
        endMeasure,
      });

      expect(events.length).toBeGreaterThan(0);
      expect(Math.min(...events.map((event) => event.startSeconds))).toBe(0);
      expect(
        Math.max(
          ...events.map(
            (event) => event.startSeconds + event.durationSeconds,
          ),
        ),
      ).toBeLessThanOrEqual(expectedMaxSeconds);
    },
  );
});

describe("sample_harmony1の練習再生イベント", () => {
  it("4声すべてをflattenして選択範囲の再生イベントを作る", () => {
    const events = createContentPlaybackEvents(harmony, {
      selectedKey: "G",
      playbackRate: 1,
      startMeasure: 1,
      endMeasure: 8,
    });

    expect(events).toHaveLength(32);
    expect(events.filter((event) => event.startSeconds === 0)).toHaveLength(4);
    expect(
      events
        .map((event) => event.pitch)
        .slice(0, 4)
        .sort((left, right) => left - right),
    ).toEqual([43, 62, 67, 71]);
  });

  it("小節範囲再生でも4声すべてを対象にする", () => {
    const events = createContentPlaybackEvents(harmony, {
      selectedKey: "G",
      playbackRate: 1,
      startMeasure: 1,
      endMeasure: 4,
    });

    expect(events).toHaveLength(16);
    expect(Math.min(...events.map((event) => event.startSeconds))).toBe(0);
    expect(
      Math.max(
        ...events.map((event) => event.startSeconds + event.durationSeconds),
      ),
    ).toBeLessThanOrEqual(12);
  });
});
