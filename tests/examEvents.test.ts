import { describe, expect, it } from "vitest";
import {
  createChordPlaybackEvents,
  createSignalPlaybackEvents,
} from "../src/exam/examEvents";

describe("試験用再生イベント", () => {
  it("chordへ選択調の半音数を適用する", () => {
    expect(
      createChordPlaybackEvents(
        {
          step: 1,
          type: "chord",
          pitches: [55, 59, 62, 67],
          duration_sec: 2,
          velocity: 80,
        },
        5,
      ),
    ).toEqual([
      {
        pitch: 60,
        startSeconds: 0,
        durationSeconds: 2,
        velocity: 80,
      },
      {
        pitch: 64,
        startSeconds: 0,
        durationSeconds: 2,
        velocity: 80,
      },
      {
        pitch: 67,
        startSeconds: 0,
        durationSeconds: 2,
        velocity: 80,
      },
      {
        pitch: 72,
        startSeconds: 0,
        durationSeconds: 2,
        velocity: 80,
      },
    ]);
  });

  it("end_bellを固定イベントへ変換する", () => {
    const events = createSignalPlaybackEvents({
      step: 1,
      type: "signal",
      content: "end_bell",
    });
    expect(events).toHaveLength(2);
    expect(events[1]?.startSeconds).toBeGreaterThan(0);
  });
});
