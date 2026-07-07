import { getDataBaseUrl } from "../config/dataSource";
import type { ContentData, ContentType, MelodyData } from "./types";
import {
  MelodyValidationError,
  validateContentData,
  validateMelodyData,
} from "./validateMelody";

export type MelodyLoadErrorCode =
  | "invalid-id"
  | "invalid-type"
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

export function validateContentType(contentType: string): ContentType {
  if (contentType === "melody" || contentType === "harmony") {
    return contentType;
  }
  throw new MelodyLoadError(
    "invalid-type",
    "課題typeは melody または harmony を指定してください。",
  );
}

export interface LoadContentOptions {
  id: string;
  type?: ContentType;
}

export async function loadContent(
  options: LoadContentOptions,
): Promise<ContentData> {
  const { id, type = "melody" } = options;
  validateMelodyId(id);
  const url = `${getDataBaseUrl(type)}/${id}.json`;

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
    return validateContentData(json, id, type);
  } catch (error) {
    if (error instanceof MelodyValidationError) {
      throw new MelodyLoadError(error.code, error.message);
    }
    throw error;
  }
}

export async function loadMelody(id: string): Promise<MelodyData> {
  const content = await loadContent({ id, type: "melody" });
  return validateMelodyData(content, id);
}
