import { describe, expect, it } from "vitest";
import {
  PRACTICE_PLAYBACK_RATES,
  resolvePlaybackRate,
} from "../src/domain/playbackRate";
import { createPlaybackEvents } from "../src/domain/playbackEvents";

describe("resolvePlaybackRate", () => {
  it("練習モードで4つの固定倍率を許可する", () => {
    expect(
      PRACTICE_PLAYBACK_RATES.map((rate) =>
        resolvePlaybackRate("practice", rate),
      ),
    ).toEqual([0.75, 1, 1.25, 1.5]);
  });

  it("練習モードで候補外の倍率を拒否する", () => {
    expect(() => resolvePlaybackRate("practice", 2)).toThrow(
      "練習速度は指定された候補から選択してください。",
    );
  });

  it("試験モードでは要求値にかかわらず1.0へ固定する", () => {
    expect(resolvePlaybackRate("exam", 0.75)).toBe(1);
    expect(resolvePlaybackRate("exam", 1.5)).toBe(1);
  });
});

describe("速度倍率と再生イベント", () => {
  const note = {
    pitch: 60,
    qstamp: 2,
    duration: 2,
    measure: 1,
    velocity: 90,
  };

  it("音程を変えず開始時刻と音価だけを倍率に応じて変更する", () => {
    const normal = createPlaybackEvents([note], {
      bpm: 60,
      playbackRate: 1,
      semitones: 0,
      startQstamp: 0,
      endQstamp: 8,
    })[0];
    const fast = createPlaybackEvents([note], {
      bpm: 60,
      playbackRate: 1.5,
      semitones: 0,
      startQstamp: 0,
      endQstamp: 8,
    })[0];

    expect(fast?.pitch).toBe(normal?.pitch);
    expect(fast?.startSeconds).toBeCloseTo(
      (normal?.startSeconds ?? 0) / 1.5,
    );
    expect(fast?.durationSeconds).toBeCloseTo(
      (normal?.durationSeconds ?? 0) / 1.5,
    );
  });

  it("音価と休符の相対比を維持する", () => {
    const events = createPlaybackEvents(
      [
        note,
        {
          ...note,
          pitch: 62,
          qstamp: 6,
          duration: 1,
        },
      ],
      {
        bpm: 80,
        playbackRate: 1.25,
        semitones: 0,
        startQstamp: 0,
        endQstamp: 8,
      },
    );

    const [first, second] = events;
    const restSeconds =
      (second?.startSeconds ?? 0) -
      ((first?.startSeconds ?? 0) + (first?.durationSeconds ?? 0));
    expect(restSeconds / (second?.durationSeconds ?? 1)).toBeCloseTo(2);
  });
});
