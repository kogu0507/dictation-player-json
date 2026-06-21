import type {
  MeasureBoundary,
  MelodyData,
  MelodyNote,
  SequenceStep,
} from "./types";

type JsonObject = Record<string, unknown>;

export type MelodyValidationErrorCode =
  | "unsupported-schema"
  | "invalid-data";

export class MelodyValidationError extends Error {
  constructor(
    public readonly code: MelodyValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MelodyValidationError";
  }
}

function fail(message: string): never {
  throw new MelodyValidationError("invalid-data", message);
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

function validateNote(
  value: unknown,
  path: string,
  measureBoundaries: Map<number, MeasureBoundary>,
): MelodyNote {
  const note = requireObject(value, path);
  const pitch = requireMidiValue(note.pitch, `${path}.pitch`);
  const qstamp = requireNumber(note.qstamp, `${path}.qstamp`);
  const duration = requireNumber(note.duration, `${path}.duration`);
  const measure = requireInteger(note.measure, `${path}.measure`);
  const velocity = requireMidiValue(note.velocity, `${path}.velocity`);

  if (qstamp < 0) {
    fail(`${path}.qstamp は0以上である必要があります。`);
  }
  if (duration <= 0) {
    fail(`${path}.duration は0より大きい必要があります。`);
  }
  const boundary = measureBoundaries.get(measure);
  if (boundary === undefined) {
    fail(`${path}.measure に未定義の小節が指定されています。`);
  }
  if (
    qstamp < boundary.start_qstamp ||
    qstamp + duration > boundary.end_qstamp
  ) {
    fail(`${path} が指定小節の時間範囲外です。`);
  }

  return { pitch, qstamp, duration, measure, velocity };
}

function validateSequenceStep(
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

export function validateMelodyData(
  value: unknown,
  requestedId: string,
): MelodyData {
  const root = requireObject(value, "JSON");
  if (root.schema_version !== 1) {
    throw new MelodyValidationError(
      "unsupported-schema",
      "対応していないschema_versionです。",
    );
  }

  const id = requireString(root.id, "id");
  if (id !== requestedId) {
    fail("JSONのidが要求したidと一致しません。");
  }
  if (root.type !== "melody") {
    fail("type は melody である必要があります。");
  }

  const measures = requireInteger(root.measures, "measures");
  if (measures < 1) {
    fail("measures は1以上である必要があります。");
  }

  let previousEnd: number | undefined;
  const measureMap = requireArray(root.measure_map, "measure_map").map(
    (value, index) => {
      const path = `measure_map[${index}]`;
      const boundary = requireObject(value, path);
      const measure = requireInteger(boundary.measure, `${path}.measure`);
      const start = requireNumber(
        boundary.start_qstamp,
        `${path}.start_qstamp`,
      );
      const end = requireNumber(
        boundary.end_qstamp,
        `${path}.end_qstamp`,
      );
      if (measure !== index + 1) {
        fail("measure_map は1からの連番である必要があります。");
      }
      if (start < 0 || end <= start) {
        fail(`${path} の時間範囲が不正です。`);
      }
      if (previousEnd !== undefined && previousEnd !== start) {
        fail("measure_map の前後の境界が連続していません。");
      }
      previousEnd = end;
      return {
        measure,
        start_qstamp: start,
        end_qstamp: end,
      };
    },
  );
  if (measureMap.length !== measures) {
    fail("measure_map の件数がmeasuresと一致しません。");
  }

  const measureBoundaries = new Map(
    measureMap.map((boundary) => [boundary.measure, boundary]),
  );
  const play = requireObject(root.play, "play");
  const bpm = requireNumber(play.bpm, "play.bpm");
  if (bpm <= 0) {
    fail("play.bpm は0より大きい必要があります。");
  }

  const voicesObject = requireObject(play.voices, "play.voices");
  const voices: Record<string, MelodyNote[]> = {};
  for (const [voiceName, notesValue] of Object.entries(voicesObject)) {
    voices[voiceName] = requireArray(
      notesValue,
      `play.voices.${voiceName}`,
    ).map((note, index) =>
      validateNote(
        note,
        `play.voices.${voiceName}[${index}]`,
        measureBoundaries,
      ),
    );
  }
  if (
    Object.keys(voices).length === 0 ||
    Object.values(voices).every((notes) => notes.length === 0)
  ) {
    fail("play.voices には1音以上必要です。");
  }

  const keysObject = requireObject(root.keys, "keys");
  const keys: MelodyData["keys"] = {};
  for (const [keyName, keyValue] of Object.entries(keysObject)) {
    const key = requireObject(keyValue, `keys.${keyName}`);
    keys[keyName] = {
      semitones: requireInteger(
        key.semitones,
        `keys.${keyName}.semitones`,
      ),
      svg: requireString(key.svg, `keys.${keyName}.svg`),
    };
  }
  if (Object.keys(keys).length !== 12) {
    fail("keys には12調すべてが必要です。");
  }

  const allNotes = Object.values(voices).flat();
  for (const [keyName, key] of Object.entries(keys)) {
    for (const note of allNotes) {
      const transposedPitch = note.pitch + key.semitones;
      if (transposedPitch < 0 || transposedPitch > 127) {
        fail(`keys.${keyName} の移調後pitchがMIDI範囲外です。`);
      }
    }
  }

  const sequence = requireArray(root.sequence, "sequence").map(
    (step, index) => validateSequenceStep(step, index, measures),
  );
  for (const [keyName, key] of Object.entries(keys)) {
    for (const step of sequence) {
      if (step.type !== "chord") {
        continue;
      }
      for (const pitch of step.pitches) {
        const transposedPitch = pitch + key.semitones;
        if (transposedPitch < 0 || transposedPitch > 127) {
          fail(`keys.${keyName} の移調後chord pitchがMIDI範囲外です。`);
        }
      }
    }
  }

  const mode = requireString(root.mode, "mode");
  if (mode !== "major" && mode !== "minor") {
    fail("mode は major または minor である必要があります。");
  }

  const baseKey = requireString(root.base_key, "base_key");
  if (!(baseKey in keys)) {
    fail("base_key がkeysに存在しません。");
  }

  return {
    schema_version: 1,
    id,
    type: "melody",
    title: requireString(root.title, "title"),
    base_key: baseKey,
    mode,
    time_signature: requireString(root.time_signature, "time_signature"),
    measures,
    measure_map: measureMap,
    play: { bpm, voices },
    keys,
    sequence,
  };
}
