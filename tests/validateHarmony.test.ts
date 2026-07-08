import { describe, expect, it } from "vitest";
import sampleHarmonyJson from "../testdata/harmony/sample_harmony1.json";
import {
  HARMONY_VOICE_NAMES,
  TARGET_KEY_NAMES,
} from "../src/data/types";
import { validateHarmonyData } from "../src/data/validateMelody";

describe("validateHarmonyData", () => {
  it("sample_harmony1のschema v2 harmonyデータを受け入れる", () => {
    const harmony = validateHarmonyData(
      sampleHarmonyJson,
      "sample_harmony1",
    );

    expect(harmony.schema_version).toBe(2);
    expect(harmony.type).toBe("harmony");
    expect(harmony.id).toBe("sample_harmony1");
    expect(harmony.sequence).toEqual([]);
    expect(Object.keys(harmony.play.voices)).toEqual(HARMONY_VOICE_NAMES);
  });

  it("3声のschema v2 harmonyデータも受け入れる", () => {
    const threePartHarmonyJson = {
      ...sampleHarmonyJson,
      play: {
        ...sampleHarmonyJson.play,
        voices: {
          soprano: sampleHarmonyJson.play.voices.soprano,
          alto: sampleHarmonyJson.play.voices.alto,
          bass: sampleHarmonyJson.play.voices.bass,
        },
      },
    };

    const harmony = validateHarmonyData(
      threePartHarmonyJson,
      "sample_harmony1",
    );

    expect(Object.keys(harmony.play.voices)).toEqual([
      "soprano",
      "alto",
      "bass",
    ]);
  });

  it("2声以下または5声以上のharmonyデータを拒否する", () => {
    const twoPartHarmonyJson = {
      ...sampleHarmonyJson,
      play: {
        ...sampleHarmonyJson.play,
        voices: {
          soprano: sampleHarmonyJson.play.voices.soprano,
          bass: sampleHarmonyJson.play.voices.bass,
        },
      },
    };

    expect(() =>
      validateHarmonyData(twoPartHarmonyJson, "sample_harmony1"),
    ).toThrow("play.voices は3声または4声である必要があります。");
  });

  it("4声すべてのnoteに再生用フィールドがある", () => {
    const harmony = validateHarmonyData(
      sampleHarmonyJson,
      "sample_harmony1",
    );

    for (const voiceName of HARMONY_VOICE_NAMES) {
      expect(harmony.play.voices[voiceName].length).toBeGreaterThan(0);
      for (const note of harmony.play.voices[voiceName]) {
        expect(Number.isInteger(note.pitch)).toBe(true);
        expect(typeof note.qstamp).toBe("number");
        expect(note.duration).toBeGreaterThan(0);
        expect(Number.isInteger(note.measure)).toBe(true);
        expect(Number.isInteger(note.velocity)).toBe(true);
      }
    }
  });

  it("12調のSVGとsemitonesを検証し、移調後pitchをMIDI範囲に収める", () => {
    const harmony = validateHarmonyData(
      sampleHarmonyJson,
      "sample_harmony1",
    );
    const sourcePitches = Object.values(harmony.play.voices)
      .flat()
      .map((note) => note.pitch);

    expect(Object.keys(harmony.keys)).toEqual(TARGET_KEY_NAMES);
    for (const [keyName, key] of Object.entries(harmony.keys)) {
      expect(Number.isInteger(key.semitones)).toBe(true);
      expect(key.svg.startsWith("<svg")).toBe(true);
      expect(
        sourcePitches.every((pitch) => {
          const transposedPitch = pitch + key.semitones;
          return transposedPitch >= 0 && transposedPitch <= 127;
        }),
        keyName,
      ).toBe(true);
    }
  });

  it("schema_versionとtypeの不一致を拒否する", () => {
    expect(() =>
      validateHarmonyData(
        { ...sampleHarmonyJson, schema_version: 1 },
        "sample_harmony1",
      ),
    ).toThrow("対応していないschema_versionです。");

    expect(() =>
      validateHarmonyData(
        { ...sampleHarmonyJson, type: "melody" },
        "sample_harmony1",
      ),
    ).toThrow("type は harmony である必要があります。");
  });
});
