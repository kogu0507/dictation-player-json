import { describe, expect, it } from "vitest";
import sample1Json from "../testdata/melody/sample1.json";
import { validateMelodyData } from "../src/data/validateMelody";
import { createMelodyPlaybackEvents } from "../src/domain/playbackEvents";
import { getMelodyKey } from "../src/domain/transposition";

const melody = validateMelodyData(sample1Json, "sample1");
const expectedSemitones: Record<string, number> = {
  C: 5,
  Db: 6,
  D: -5,
  Eb: -4,
  E: -3,
  F: -2,
  Gb: -1,
  G: 0,
  Ab: 1,
  A: 2,
  Bb: 3,
  B: 4,
};
const sourceNotes = Object.values(melody.play.voices)
  .flat()
  .sort((left, right) => left.qstamp - right.qstamp);

describe("sample1の12調移調", () => {
  it.each(Object.entries(expectedSemitones))(
    "%s調でJSON指定の半音数を譜面と再生へ共通利用する",
    (keyName, semitones) => {
      const key = getMelodyKey(melody, keyName);
      const events = createMelodyPlaybackEvents(melody, {
        selectedKey: keyName,
        playbackRate: 1,
        startMeasure: 1,
        endMeasure: melody.measures,
      });

      expect(key.semitones).toBe(semitones);
      expect(key.svg.startsWith("<svg")).toBe(true);
      expect(events[0]?.pitch).toBe(
        (sourceNotes[0]?.pitch ?? 0) + semitones,
      );
      expect(events.every((event) => event.pitch >= 0 && event.pitch <= 127))
        .toBe(true);
    },
  );

  it("キー名から推測せずkeysに存在しない調を拒否する", () => {
    expect(() => getMelodyKey(melody, "C#")).toThrow(
      "未対応の調です: C#",
    );
  });
});
