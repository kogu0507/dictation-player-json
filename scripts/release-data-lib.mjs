import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  createManifest,
  listFiles,
  MANIFEST_NAME,
  sha256,
} from "./release-ftp-lib.mjs";

export const MELODY_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function buildMelodyDataReleasePath(id) {
  if (!MELODY_ID_PATTERN.test(id)) {
    throw new Error(
      "課題IDは半角英数字、ハイフン、アンダースコアだけを使用できます。",
    );
  }
  return `data/dictation/melody/${id}.json`;
}

export async function createDataOnlyRelease({ sourceJson, id, releaseRoot }) {
  const resolvedSourceJson = resolve(sourceJson);
  const resolvedReleaseRoot = resolve(releaseRoot);
  const releasePath = buildMelodyDataReleasePath(id);

  await requireFile(resolvedSourceJson, `dictation-contentの${id}.json`);
  await resetReleaseRoot(resolvedReleaseRoot);

  const destination = resolve(
    resolvedReleaseRoot,
    ...releasePath.split("/"),
  );
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolvedSourceJson, destination);

  const [sourceHash, releasedHash] = await Promise.all([
    sha256(resolvedSourceJson),
    sha256(destination),
  ]);
  if (sourceHash !== releasedHash) {
    throw new Error(
      `公開用JSONのSHA-256が生成元と一致しません: ${releasePath}`,
    );
  }

  const payloadFiles = await listFiles(resolvedReleaseRoot);
  if (
    payloadFiles.length !== 1 ||
    payloadFiles[0] !== releasePath
  ) {
    throw new Error(
      `data-only公開には指定JSON以外を含められません: ${payloadFiles.join(", ")}`,
    );
  }

  const entries = [
    {
      path: releasePath,
      sha256: releasedHash,
    },
  ];
  const manifest = createManifest(entries);
  await writeFile(
    resolve(resolvedReleaseRoot, MANIFEST_NAME),
    manifest,
    "utf8",
  );

  return {
    entries,
    files: [releasePath, MANIFEST_NAME],
    manifest,
    releasePath,
    releasedHash,
    sourceHash,
    sourcePath: resolvedSourceJson,
  };
}

async function requireFile(path, label) {
  const entry = await stat(path).catch(() => undefined);
  if (!entry?.isFile()) {
    throw new Error(`${label}が見つかりません: ${path}`);
  }
}

async function resetReleaseRoot(releaseRoot) {
  const parent = dirname(releaseRoot);
  if (
    releaseRoot === parent ||
    basename(releaseRoot).toLowerCase() !== "ftp-root"
  ) {
    throw new Error(
      `削除対象はftp-rootディレクトリである必要があります: ${releaseRoot}`,
    );
  }
  await mkdir(parent, { recursive: true });
  await rm(releaseRoot, { recursive: true, force: true });
  await mkdir(releaseRoot, { recursive: true });
}
