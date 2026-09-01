import { describe, expect, it } from "vitest";
import {
  formatJapaneseKeyName,
  formatKeyOptionLabel,
} from "../src/domain/keyDisplayName";

const targetKeys = [
  ["C", "ハ"],
  ["Db", "変ニ"],
  ["D", "ニ"],
  ["Eb", "変ホ"],
  ["E", "ホ"],
  ["F", "ヘ"],
  ["Gb", "変ト"],
  ["G", "ト"],
  ["Ab", "変イ"],
  ["A", "イ"],
  ["Bb", "変ロ"],
  ["B", "ロ"],
] as const;

describe("formatJapaneseKeyName", () => {
  it.each(targetKeys)("12調の%sを長調として表示する", (keyName, expected) => {
    expect(formatJapaneseKeyName(keyName, "major")).toBe(`${expected}長調`);
  });

  it.each(targetKeys)("12調の%sを短調として表示する", (keyName, expected) => {
    expect(formatJapaneseKeyName(keyName, "minor")).toBe(`${expected}短調`);
  });

  it("flatの綴りを変として保持する", () => {
    expect(formatJapaneseKeyName("Db", "major")).toBe("変ニ長調");
    expect(formatKeyOptionLabel("Db", "major")).toBe("変ニ長調（D♭）");
  });

  it("sharpの綴りを嬰として保持する", () => {
    expect(formatJapaneseKeyName("F#", "minor")).toBe("嬰ヘ短調");
    expect(formatKeyOptionLabel("F#", "minor")).toBe("嬰ヘ短調（F♯）");
  });
});
