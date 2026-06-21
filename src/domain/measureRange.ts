import type { MeasureBoundary } from "../data/types";
import type { QstampRange } from "./playbackEvents";

export interface MeasureRange {
  startMeasure: number;
  endMeasure: number;
}

export function getMeasureQstampRange(
  measureMap: MeasureBoundary[],
  range: MeasureRange,
): QstampRange {
  const { startMeasure, endMeasure } = range;
  if (
    !Number.isInteger(startMeasure) ||
    !Number.isInteger(endMeasure) ||
    startMeasure < 1 ||
    startMeasure > endMeasure
  ) {
    throw new Error("小節範囲が不正です。");
  }

  const startBoundary = measureMap.find(
    (boundary) => boundary.measure === startMeasure,
  );
  const endBoundary = measureMap.find(
    (boundary) => boundary.measure === endMeasure,
  );
  if (startBoundary === undefined || endBoundary === undefined) {
    throw new Error("小節範囲が課題範囲外です。");
  }

  return {
    startQstamp: startBoundary.start_qstamp,
    endQstamp: endBoundary.end_qstamp,
  };
}
