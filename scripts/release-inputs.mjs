import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

export const CONTENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function buildDataReleasePath(type, id) {
  if (!["melody", "harmony", "grand_staff"].includes(type)) {
    throw new Error(`未対応の課題種別です: ${type}`);
  }
  if (typeof id !== "string" || !CONTENT_ID_PATTERN.test(id)) {
    throw new Error("課題IDは半角英数字、ハイフン、アンダースコアだけを使用できます。");
  }
  return `data/dictation/${type}/${id}.json`;
}

export async function readReleaseBaselines() {
  const records = JSON.parse(await readFile(new URL("./release-baselines.json", import.meta.url), "utf8"));
  const baselines = new Map();
  for (const record of records) {
    const { releasePath, type, id, sha256 } = record;
    if (releasePath !== buildDataReleasePath(type, id) ||
        !/^[0-9a-f]{64}$/.test(sha256) || baselines.has(releasePath)) {
      throw new Error(`公開基準の登録が不正または重複しています: ${releasePath}`);
    }
    baselines.set(releasePath, sha256);
  }
  return baselines;
}

export async function readApprovedInput(baselines, releasePath, sourcePath) {
  const expected = baselines.get(releasePath);
  if (expected === undefined) {
    throw new Error(`公開基準に未登録です: ${releasePath}\n入力: ${sourcePath}`);
  }
  const bytes = await readFile(sourcePath);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) {
    throw new Error(
      `承認済みSHA-256と一致しません: ${releasePath}\n入力: ${sourcePath}\n期待: ${expected}\n実測: ${actual}`,
    );
  }
  if (releasePath.startsWith("data/dictation/grand_staff/")) {
    const data = JSON.parse(bytes.toString("utf8"));
    const id = releasePath.split("/").at(-1).slice(0, -5);
    if (data?.schema_version !== 3 || data.type !== "grand_staff" || data.id !== id ||
        typeof data.score?.svg !== "string" ||
        !/^\s*<svg(?:\s|>)[\s\S]*<\/svg>\s*$/.test(data.score.svg)) {
      throw new Error(`公開用の大譜表には対応するv3 JSONとscore.svgが必要です: ${sourcePath}`);
    }
  }
  return { bytes, sourceHash: actual.toUpperCase() };
}

export function resolveReleaseSource({ type, id, dataOnly = false }) {
  buildDataReleasePath(type, id);
  const fileName = `${id}.json`;
  if (dataOnly) {
    const directory = process.env[`DICTATION_CONTENT_${type.toUpperCase()}_DIR`]?.trim();
    if (directory) return resolve(directory, fileName);
  } else {
    const variable = type === "harmony"
      ? "DICTATION_CONTENT_HARMONY_SAMPLE1" : "DICTATION_CONTENT_SAMPLE1";
    const path = process.env[variable]?.trim();
    if (path) return resolve(path);
  }
  const suffix = ["dictation-content", "dist", type, fileName];
  const candidates = [
    resolve("..", ...suffix),
    resolve(homedir(), "OneDrive", "ドキュメント", ...suffix),
  ];
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}
