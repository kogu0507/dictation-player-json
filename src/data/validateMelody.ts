import {
  TARGET_KEY_NAMES,
  type ContentData,
  type ContentType,
  type HarmonyData,
  type MeasureBoundary,
  type MelodyData,
  type MelodyKey,
  type MelodyNote,
  type SequenceStep,
} from "./types";
import {
  ExamSequenceValidationError,
  validateExamSequence,
} from "../exam/validateSequence";

type JsonObject = Record<string, unknown>;
const HARMONY_MIN_VOICE_COUNT = 3;
const HARMONY_MAX_VOICE_COUNT = 4;
const VOICE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

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

interface CommonDataFields {
  id: string;
  title: string;
  base_key: string;
  mode: "major" | "minor";
  time_signature: string;
  measures: number;
  measure_map: MeasureBoundary[];
  bpm: number;
  keys: Record<string, MelodyKey>;
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

function validateMeasureMap(
  value: unknown,
  measures: number,
): MeasureBoundary[] {
  let previousEnd: number | undefined;
  const measureMap = requireArray(value, "measure_map").map(
    (item, index) => {
      const path = `measure_map[${index}]`;
      const boundary = requireObject(item, path);
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
  return measureMap;
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

function validateVoices(
  value: unknown,
  measureMap: MeasureBoundary[],
  expectedVoiceNames?: readonly string[],
): Record<string, MelodyNote[]> {
  const voicesObject = requireObject(value, "play.voices");
  const actualVoiceNames = Object.keys(voicesObject);
  const voiceNames = expectedVoiceNames ?? actualVoiceNames;

  if (expectedVoiceNames !== undefined) {
    const expected = new Set(expectedVoiceNames);
    if (
      actualVoiceNames.length !== expectedVoiceNames.length ||
      actualVoiceNames.some((voiceName) => !expected.has(voiceName))
    ) {
      fail("play.voices は soprano/alto/tenor/bass を含む必要があります。");
    }
  }

  const measureBoundaries = new Map(
    measureMap.map((boundary) => [boundary.measure, boundary]),
  );
  const voices: Record<string, MelodyNote[]> = {};
  for (const voiceName of voiceNames) {
    voices[voiceName] = requireArray(
      voicesObject[voiceName],
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
  return voices;
}

function validateHarmonyVoices(
  value: unknown,
  measureMap: MeasureBoundary[],
): Record<string, MelodyNote[]> {
  const voicesObject = requireObject(value, "play.voices");
  const voiceNames = Object.keys(voicesObject);

  if (
    voiceNames.length < HARMONY_MIN_VOICE_COUNT ||
    voiceNames.length > HARMONY_MAX_VOICE_COUNT
  ) {
    fail("play.voices は3声または4声である必要があります。");
  }
  if (voiceNames.some((voiceName) => !VOICE_NAME_PATTERN.test(voiceName))) {
    fail("play.voices の声部名に使用できない文字が含まれています。");
  }

  return validateVoices(value, measureMap, voiceNames);
}

function validateKeys(value: unknown): Record<string, MelodyKey> {
  const keysObject = requireObject(value, "keys");
  const actualKeyNames = Object.keys(keysObject);
  const expectedKeys = new Set<string>(TARGET_KEY_NAMES);
  if (
    actualKeyNames.length !== TARGET_KEY_NAMES.length ||
    actualKeyNames.some((keyName) => !expectedKeys.has(keyName))
  ) {
    fail("keys には12調すべてが必要です。");
  }

  const keys: Record<string, MelodyKey> = {};
  for (const keyName of TARGET_KEY_NAMES) {
    const key = requireObject(keysObject[keyName], `keys.${keyName}`);
    const svg = requireString(key.svg, `keys.${keyName}.svg`);
    if (!svg.includes("<svg")) {
      fail(`keys.${keyName}.svg はSVG文字列である必要があります。`);
    }
    keys[keyName] = {
      semitones: requireInteger(
        key.semitones,
        `keys.${keyName}.semitones`,
      ),
      svg,
    };
  }
  return keys;
}

function validateCommonFields(
  root: JsonObject,
  requestedId: string,
  expectedType: ContentType,
): CommonDataFields {
  const id = requireString(root.id, "id");
  if (id !== requestedId) {
    fail("JSONのidが要求したidと一致しません。");
  }
  if (root.type !== expectedType) {
    fail(`type は ${expectedType} である必要があります。`);
  }

  const measures = requireInteger(root.measures, "measures");
  if (measures < 1) {
    fail("measures は1以上である必要があります。");
  }
  const measureMap = validateMeasureMap(root.measure_map, measures);

  const play = requireObject(root.play, "play");
  const bpm = requireNumber(play.bpm, "play.bpm");
  if (bpm <= 0) {
    fail("play.bpm は0より大きい必要があります。");
  }

  const keys = validateKeys(root.keys);
  const mode = requireString(root.mode, "mode");
  if (mode !== "major" && mode !== "minor") {
    fail("mode は major または minor である必要があります。");
  }

  const baseKey = requireString(root.base_key, "base_key");
  if (!(baseKey in keys)) {
    fail("base_key がkeysに存在しません。");
  }

  return {
    id,
    title: requireString(root.title, "title"),
    base_key: baseKey,
    mode,
    time_signature: requireString(root.time_signature, "time_signature"),
    measures,
    measure_map: measureMap,
    bpm,
    keys,
  };
}

function validateSequence(
  value: unknown,
  measures: number,
  allowEmpty: boolean,
): SequenceStep[] {
  if (allowEmpty && Array.isArray(value) && value.length === 0) {
    return [];
  }
  try {
    return validateExamSequence(value, measures);
  } catch (error) {
    if (error instanceof ExamSequenceValidationError) {
      fail(error.message);
    }
    throw error;
  }
}

function validateTransposedPitches(
  keys: Record<string, MelodyKey>,
  voices: Record<string, MelodyNote[]>,
  sequence: SequenceStep[],
): void {
  const allNotes = Object.values(voices).flat();
  for (const [keyName, key] of Object.entries(keys)) {
    for (const note of allNotes) {
      const transposedPitch = note.pitch + key.semitones;
      if (transposedPitch < 0 || transposedPitch > 127) {
        fail(`keys.${keyName} の移調後pitchがMIDI範囲外です。`);
      }
    }
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
}

function validateHarmonyAnalysis(value: unknown): HarmonyData["harmony"] {
  const harmony = requireObject(value, "harmony");
  return {
    chord_sequence: requireArray(
      harmony.chord_sequence,
      "harmony.chord_sequence",
    ),
    key_regions: requireArray(harmony.key_regions, "harmony.key_regions"),
    cadences: requireArray(harmony.cadences, "harmony.cadences"),
  };
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

  const common = validateCommonFields(root, requestedId, "melody");
  const play = requireObject(root.play, "play");
  const voices = validateVoices(play.voices, common.measure_map);
  const sequence = validateSequence(root.sequence, common.measures, false);
  validateTransposedPitches(common.keys, voices, sequence);

  return {
    schema_version: 1,
    id: common.id,
    type: "melody",
    title: common.title,
    base_key: common.base_key,
    mode: common.mode,
    time_signature: common.time_signature,
    measures: common.measures,
    measure_map: common.measure_map,
    play: { bpm: common.bpm, voices },
    keys: common.keys,
    sequence,
  };
}

export function validateHarmonyData(
  value: unknown,
  requestedId: string,
): HarmonyData {
  const root = requireObject(value, "JSON");
  if (root.schema_version !== 2) {
    throw new MelodyValidationError(
      "unsupported-schema",
      "対応していないschema_versionです。",
    );
  }

  const common = validateCommonFields(root, requestedId, "harmony");
  const play = requireObject(root.play, "play");
  const voices = validateHarmonyVoices(play.voices, common.measure_map);
  const sequence = validateSequence(root.sequence, common.measures, true);
  validateTransposedPitches(common.keys, voices, sequence);

  return {
    schema_version: 2,
    id: common.id,
    type: "harmony",
    title: common.title,
    base_key: common.base_key,
    mode: common.mode,
    time_signature: common.time_signature,
    measures: common.measures,
    measure_map: common.measure_map,
    play: { bpm: common.bpm, voices },
    harmony: validateHarmonyAnalysis(root.harmony),
    keys: common.keys,
    sequence,
  };
}

export function validateContentData(
  value: unknown,
  requestedId: string,
  contentType: ContentType,
): ContentData {
  return contentType === "harmony"
    ? validateHarmonyData(value, requestedId)
    : validateMelodyData(value, requestedId);
}
