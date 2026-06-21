import type { MelodyData, MelodyKey } from "../data/types";

export function getMelodyKey(
  melody: MelodyData,
  selectedKey: string,
): MelodyKey {
  const key = melody.keys[selectedKey];
  if (key === undefined) {
    throw new Error(`未対応の調です: ${selectedKey}`);
  }
  return key;
}

export function transposePitch(pitch: number, semitones: number): number {
  const transposedPitch = pitch + semitones;
  if (
    !Number.isInteger(transposedPitch) ||
    transposedPitch < 0 ||
    transposedPitch > 127
  ) {
    throw new Error("移調後のpitchがMIDI範囲外です。");
  }
  return transposedPitch;
}
