import { describe, expect, it } from "vitest";
import { validateMelodyData } from "../src/data/validateMelody";

function createValidData(): Record<string, unknown> {
  const keys = Object.fromEntries(
    ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"].map(
      (key) => [key, { semitones: 0, svg: "<svg></svg>" }],
    ),
  );

  return {
    schema_version: 1,
    id: "sample",
    type: "melody",
    title: "サンプル",
    base_key: "G",
    mode: "major",
    time_signature: "4/4",
    measures: 1,
    measure_map: [{ measure: 1, start_qstamp: 0, end_qstamp: 4 }],
    play: {
      bpm: 80,
      voices: {
        soprano: [
          {
            pitch: 67,
            qstamp: 0,
            duration: 1,
            measure: 1,
            velocity: 90,
          },
        ],
      },
    },
    keys,
    sequence: [
      {
        step: 1,
        type: "play",
        start_measure: 1,
        end_measure: 1,
      },
    ],
  };
}

describe("validateMelodyData", () => {
  it("schema v1の有効なデータを内部モデルへ変換する", () => {
    expect(validateMelodyData(createValidData(), "sample").id).toBe("sample");
  });

  it("未対応schemaを区別して拒否する", () => {
    const data = createValidData();
    data.schema_version = 2;

    expect(() => validateMelodyData(data, "sample")).toThrowError(
      "対応していないschema_versionです。",
    );
  });
});
