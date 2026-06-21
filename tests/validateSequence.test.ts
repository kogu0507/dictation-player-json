import { describe, expect, it } from "vitest";
import { validateExamSequence } from "../src/exam/validateSequence";

const validSequence = [
  {
    step: 1,
    type: "chord",
    pitches: [55, 59, 62, 67],
    duration_sec: 2,
    velocity: 80,
    label: "主和音",
  },
  { step: 2, type: "rest", duration_sec: 4 },
  { step: 3, type: "play", start_measure: 1, end_measure: 8 },
  { step: 4, type: "signal", content: "end_bell" },
];

describe("validateExamSequence", () => {
  it("chord、rest、play、signalを配列順に検証する", () => {
    expect(validateExamSequence(validSequence, 8)).toEqual(validSequence);
  });

  it("未知のstep typeを拒否する", () => {
    expect(() =>
      validateExamSequence(
        [{ step: 1, type: "unknown", duration_sec: 1 }],
        8,
      ),
    ).toThrow("sequence[0].type は未対応です。");
  });

  it("未知のsignal contentを拒否する", () => {
    expect(() =>
      validateExamSequence(
        [{ step: 1, type: "signal", content: "other" }],
        8,
      ),
    ).toThrow("sequence[0].content は end_bell である必要があります。");
  });

  it.each([
    [{ step: 1, type: "play", start_measure: 0, end_measure: 4 }],
    [{ step: 1, type: "play", start_measure: 5, end_measure: 4 }],
    [{ step: 1, type: "play", start_measure: 1, end_measure: 9 }],
  ])("小節範囲外または逆転したplayを拒否する", (step) => {
    expect(() => validateExamSequence([step], 8)).toThrow(
      "sequence[0] の小節範囲が課題範囲外です。",
    );
  });

  it("sequence全体のstep連番を開始前に拒否する", () => {
    expect(() =>
      validateExamSequence(
        [
          { step: 1, type: "rest", duration_sec: 1 },
          { step: 3, type: "rest", duration_sec: 1 },
        ],
        8,
      ),
    ).toThrow("sequence[1].step は1からの連番である必要があります。");
  });
});
