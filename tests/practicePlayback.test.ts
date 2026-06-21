import { describe, expect, it } from "vitest";
import sample1Json from "../testdata/melody/sample1.json";
import { validateMelodyData } from "../src/data/validateMelody";
import { createMelodyPlaybackEvents } from "../src/domain/playbackEvents";

const melody = validateMelodyData(sample1Json, "sample1");

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
