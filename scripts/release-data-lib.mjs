import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  createManifest,
  listFiles,
  MANIFEST_NAME,
  sha256,
} from "./release-ftp-lib.mjs";

import {
  buildDataReleasePath,
  CONTENT_ID_PATTERN,
  readApprovedInput,
  readReleaseBaselines,
} from "./release-inputs.mjs";

export const MELODY_ID_PATTERN = CONTENT_ID_PATTERN;

export function buildMelodyDataReleasePath(id) {
  return buildDataReleasePath("melody", id);
}

export async function createDataOnlyRelease({ sourceJson, id, releaseRoot, type = "melody" }) {
  const resolvedSourceJson = resolve(sourceJson);
  const resolvedReleaseRoot = resolve(releaseRoot);
  const releasePath = buildDataReleasePath(type, id);

  await requireFile(resolvedSourceJson, `dictation-contentの${id}.json`);
  assertSourceOutsideReleaseRoot(resolvedSourceJson, resolvedReleaseRoot);
  const baselines = await readReleaseBaselines();
  const { bytes, sourceHash } = await readApprovedInput(
    baselines, releasePath, resolvedSourceJson,
  );
  await resetReleaseRoot(resolvedReleaseRoot);

  const destination = resolve(
    resolvedReleaseRoot,
    ...releasePath.split("/"),
  );
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  const releasedHash = await sha256(destination);
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

function assertSourceOutsideReleaseRoot(sourcePath, releaseRoot) {
  const sourceRelativePath = relative(releaseRoot, sourcePath);
  const isInsideReleaseRoot =
    sourceRelativePath === "" ||
    (!sourceRelativePath.startsWith(`..${sep}`) &&
      sourceRelativePath !== ".." &&
      !isAbsolute(sourceRelativePath));
  if (isInsideReleaseRoot) {
    throw new Error(
      "生成元JSONをrelease/ftp-root内に置くことはできません。",
    );
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
