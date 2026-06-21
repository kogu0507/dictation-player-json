import { DATA_BASE_URL } from "../config/dataSource";
import type { MelodyData } from "./types";
import {
  MelodyValidationError,
  validateMelodyData,
} from "./validateMelody";

export type MelodyLoadErrorCode =
  | "invalid-id"
  | "not-found"
  | "http-error"
  | "network-error"
  | "invalid-json"
  | "unsupported-schema"
  | "invalid-data";

export class MelodyLoadError extends Error {
  constructor(
    public readonly code: MelodyLoadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MelodyLoadError";
  }
}

export function validateMelodyId(id: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new MelodyLoadError(
      "invalid-id",
      "課題IDに使用できない文字が含まれています。",
    );
  }
}

export async function loadMelody(id: string): Promise<MelodyData> {
  validateMelodyId(id);
  const url = `${DATA_BASE_URL}/${id}.json`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new MelodyLoadError(
      "network-error",
      "課題データへ接続できませんでした。",
    );
  }

  if (response.status === 404) {
    throw new MelodyLoadError("not-found", "指定した課題が見つかりません。");
  }
  if (!response.ok) {
    throw new MelodyLoadError(
      "http-error",
      `課題データの取得に失敗しました（HTTP ${response.status}）。`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new MelodyLoadError(
      "invalid-json",
      "課題データをJSONとして読み込めませんでした。",
    );
  }

  try {
    return validateMelodyData(json, id);
  } catch (error) {
    if (error instanceof MelodyValidationError) {
      throw new MelodyLoadError(error.code, error.message);
    }
    throw error;
  }
}
