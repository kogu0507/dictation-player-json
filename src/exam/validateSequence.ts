import type { SequenceStep } from "../data/types";

type JsonObject = Record<string, unknown>;

export class ExamSequenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExamSequenceValidationError";
  }
}

function fail(message: string): never {
  throw new ExamSequenceValidationError(message);
}

function requireObject(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${path} はオブジェクトである必要があります。`);
  }
  return value as JsonObject;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(`${path} は配列である必要があります。`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${path} は空でない文字列である必要があります。`);
  }
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${path} は有限の数値である必要があります。`);
  }
  return value;
}

function requireInteger(value: unknown, path: string): number {
  const number = requireNumber(value, path);
  if (!Number.isInteger(number)) {
    fail(`${path} は整数である必要があります。`);
  }
  return number;
}

function requireMidiValue(value: unknown, path: string): number {
  const number = requireInteger(value, path);
  if (number < 0 || number > 127) {
    fail(`${path} は0〜127である必要があります。`);
  }
  return number;
}

function validateStep(
  value: unknown,
  index: number,
  measureCount: number,
): SequenceStep {
  const path = `sequence[${index}]`;
  const step = requireObject(value, path);
  const stepNumber = requireInteger(step.step, `${path}.step`);
  if (stepNumber !== index + 1) {
    fail(`${path}.step は1からの連番である必要があります。`);
  }

  const type = requireString(step.type, `${path}.type`);
  if (type === "chord") {
    const pitches = requireArray(step.pitches, `${path}.pitches`).map(
      (pitch, pitchIndex) =>
        requireMidiValue(pitch, `${path}.pitches[${pitchIndex}]`),
    );
    if (pitches.length === 0) {
      fail(`${path}.pitches は1音以上必要です。`);
    }
    const durationSec = requireNumber(
      step.duration_sec,
      `${path}.duration_sec`,
    );
    if (durationSec <= 0) {
      fail(`${path}.duration_sec は0より大きい必要があります。`);
    }
    const label =
      step.label === undefined
        ? undefined
        : requireString(step.label, `${path}.label`);
    return {
      step: stepNumber,
      type,
      pitches,
      duration_sec: durationSec,
      velocity: requireMidiValue(step.velocity, `${path}.velocity`),
      ...(label === undefined ? {} : { label }),
    };
  }

  if (type === "rest") {
    const durationSec = requireNumber(
      step.duration_sec,
      `${path}.duration_sec`,
    );
    if (durationSec <= 0) {
      fail(`${path}.duration_sec は0より大きい必要があります。`);
    }
    return { step: stepNumber, type, duration_sec: durationSec };
  }

  if (type === "play") {
    const startMeasure = requireInteger(
      step.start_measure,
      `${path}.start_measure`,
    );
    const endMeasure = requireInteger(
      step.end_measure,
      `${path}.end_measure`,
    );
    if (
      startMeasure < 1 ||
      endMeasure > measureCount ||
      startMeasure > endMeasure
    ) {
      fail(`${path} の小節範囲が課題範囲外です。`);
    }
    return {
      step: stepNumber,
      type,
      start_measure: startMeasure,
      end_measure: endMeasure,
    };
  }

  if (type === "signal") {
    if (step.content !== "end_bell") {
      fail(`${path}.content は end_bell である必要があります。`);
    }
    return { step: stepNumber, type, content: "end_bell" };
  }

  fail(`${path}.type は未対応です。`);
}

export function validateExamSequence(
  value: unknown,
  measureCount: number,
): SequenceStep[] {
  if (!Number.isInteger(measureCount) || measureCount < 1) {
    fail("課題の小節数が不正です。");
  }

  const sequence = requireArray(value, "sequence");
  if (sequence.length === 0) {
    fail("sequence は1ステップ以上必要です。");
  }
  return sequence.map((step, index) =>
    validateStep(step, index, measureCount),
  );
}
