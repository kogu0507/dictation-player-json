import { describe, expect, it } from "vitest";
import type { MeasureBoundary } from "../src/data/types";
import { getMeasureQstampRange } from "../src/domain/measureRange";

const measureMap: MeasureBoundary[] = Array.from(
  { length: 8 },
  (_, index) => ({
    measure: index + 1,
    start_qstamp: index * 4,
    end_qstamp: (index + 1) * 4,
  }),
);

describe("getMeasureQstampRange", () => {
  it.each([
    [1, 4, { startQstamp: 0, endQstamp: 16 }],
    [5, 8, { startQstamp: 16, endQstamp: 32 }],
    [1, 8, { startQstamp: 0, endQstamp: 32 }],
  ])("%i〜%i小節をqstamp範囲へ変換する", (start, end, expected) => {
    expect(
      getMeasureQstampRange(measureMap, {
        startMeasure: start,
        endMeasure: end,
      }),
    ).toEqual(expected);
  });

  it("開始が終了より後の範囲を拒否する", () => {
    expect(() =>
      getMeasureQstampRange(measureMap, {
        startMeasure: 5,
        endMeasure: 4,
      }),
    ).toThrow("小節範囲が不正です。");
  });

  it("課題範囲外を拒否する", () => {
    expect(() =>
      getMeasureQstampRange(measureMap, {
        startMeasure: 1,
        endMeasure: 9,
      }),
    ).toThrow("小節範囲が課題範囲外です。");
  });

  it("0以下と非整数の小節番号を拒否する", () => {
    expect(() =>
      getMeasureQstampRange(measureMap, {
        startMeasure: 0,
        endMeasure: 1,
      }),
    ).toThrow("小節範囲が不正です。");
    expect(() =>
      getMeasureQstampRange(measureMap, {
        startMeasure: 1.5,
        endMeasure: 2,
      }),
    ).toThrow("小節範囲が不正です。");
  });

  it("空のmeasure_mapを課題範囲外として拒否する", () => {
    expect(() =>
      getMeasureQstampRange([], {
        startMeasure: 1,
        endMeasure: 1,
      }),
    ).toThrow("小節範囲が課題範囲外です。");
  });
});
