export type KeyMode = "major" | "minor";

const JAPANESE_NOTE_NAMES: Record<string, string> = {
  C: "ハ",
  D: "ニ",
  E: "ホ",
  F: "ヘ",
  G: "ト",
  A: "イ",
  B: "ロ",
};

const JAPANESE_MODE_NAMES: Record<KeyMode, string> = {
  major: "長調",
  minor: "短調",
};

/**
 * Converts a data key spelling to its Japanese display name without deriving
 * a different enharmonic spelling or changing the source key value.
 */
export function formatJapaneseKeyName(
  keyName: string,
  mode: KeyMode,
): string {
  const match = /^([A-G])([b♭#♯]?)$/.exec(keyName);
  if (match === null) {
    return `${keyName}${JAPANESE_MODE_NAMES[mode]}`;
  }

  const [, noteName, accidental] = match;
  const accidentalName =
    accidental === "b" || accidental === "♭"
      ? "変"
      : accidental === "#" || accidental === "♯"
        ? "嬰"
        : "";
  return `${accidentalName}${JAPANESE_NOTE_NAMES[noteName]}${JAPANESE_MODE_NAMES[mode]}`;
}

export function formatKeyOptionLabel(
  keyName: string,
  mode: KeyMode,
): string {
  return `${formatJapaneseKeyName(keyName, mode)}（${formatLatinKeyName(keyName)}）`;
}

function formatLatinKeyName(keyName: string): string {
  return keyName.replace("b", "♭").replace("#", "♯");
}
