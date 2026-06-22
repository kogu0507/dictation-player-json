import { createHash } from "node:crypto";
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";

export const APP_RELEASE_PATH = "app/dictation-player-json";
export const DATA_RELEASE_PATH =
  "data/dictation/melody/sample1.json";
export const MANIFEST_NAME = "RELEASE_MANIFEST.txt";

const FORBIDDEN_SEGMENTS = new Set([
  ".git",
  "coverage",
  "node_modules",
  "src",
  "testdata",
  "tests",
]);

const FORBIDDEN_FILES = new Set([
  ".htaccess",
  "package-lock.json",
  "package.json",
]);

export async function createFtpRelease({
  distDir,
  sourceJson,
  releaseRoot,
}) {
  const resolvedDist = resolve(distDir);
  const resolvedSourceJson = resolve(sourceJson);
  const resolvedReleaseRoot = resolve(releaseRoot);

  await requireDirectory(resolvedDist, "production buildのdist");
  await requireFile(
    resolvedSourceJson,
    "dictation-contentのsample1.json",
  );

  const distFiles = await listFiles(resolvedDist);
  const projectedFiles = [
    ...distFiles.map((path) => `${APP_RELEASE_PATH}/${path}`),
    DATA_RELEASE_PATH,
  ];
  validatePayloadPaths(projectedFiles);

  const distIndex = await readFile(
    resolve(resolvedDist, "index.html"),
    "utf8",
  );
  if (!hasNoindexMeta(distIndex)) {
    throw new Error(
      "production index.htmlにrobots noindexがありません。",
    );
  }

  await resetReleaseRoot(resolvedReleaseRoot);

  const appDestination = resolve(
    resolvedReleaseRoot,
    ...APP_RELEASE_PATH.split("/"),
  );
  const dataDestination = resolve(
    resolvedReleaseRoot,
    ...DATA_RELEASE_PATH.split("/"),
  );
  await cp(resolvedDist, appDestination, { recursive: true });
  await mkdir(dirname(dataDestination), { recursive: true });
  await copyFile(resolvedSourceJson, dataDestination);

  const [sourceJsonHash, releasedJsonHash] = await Promise.all([
    sha256(resolvedSourceJson),
    sha256(dataDestination),
  ]);
  if (sourceJsonHash !== releasedJsonHash) {
    throw new Error(
      "公開用sample1.jsonのSHA-256が生成元と一致しません。",
    );
  }

  const payloadFiles = await listFiles(resolvedReleaseRoot);
  validatePayloadPaths(payloadFiles);
  const entries = await Promise.all(
    payloadFiles.map(async (path) => ({
      path,
      sha256: await sha256(
        resolve(resolvedReleaseRoot, ...path.split("/")),
      ),
    })),
  );
  entries.sort((left, right) =>
    left.path.localeCompare(right.path, "en"),
  );

  const manifest = createManifest(entries);
  await writeFile(
    resolve(resolvedReleaseRoot, MANIFEST_NAME),
    manifest,
    "utf8",
  );

  return {
    entries,
    files: [...entries.map(({ path }) => path), MANIFEST_NAME],
    manifest,
    releasedJsonHash,
    sourceJsonHash,
  };
}

export function createManifest(entries) {
  const lines = [
    "# dictation-player-json FTP release manifest",
    "# SHA-256  relative/path",
    ...entries.map(
      ({ path, sha256: hash }) => `${hash}  ${path}`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function validatePayloadPaths(paths) {
  const normalizedPaths = [...paths].sort((left, right) =>
    left.localeCompare(right, "en"),
  );

  for (const path of normalizedPaths) {
    const segments = path.toLowerCase().split("/");
    const fileName = segments.at(-1);
    if (
      segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment)) ||
      (fileName !== undefined && FORBIDDEN_FILES.has(fileName))
    ) {
      throw new Error(
        `公開パッケージへ含められないファイルです: ${path}`,
      );
    }
    if (
      !path.startsWith(`${APP_RELEASE_PATH}/`) &&
      path !== DATA_RELEASE_PATH
    ) {
      throw new Error(`公開先が許可されていません: ${path}`);
    }
  }

  if (!normalizedPaths.includes(`${APP_RELEASE_PATH}/index.html`)) {
    throw new Error("公開パッケージにアプリのindex.htmlがありません。");
  }
  if (!normalizedPaths.includes(DATA_RELEASE_PATH)) {
    throw new Error("公開パッケージにsample1.jsonがありません。");
  }
}

export async function listFiles(root) {
  const resolvedRoot = resolve(root);
  const files = [];
  await collectFiles(resolvedRoot, resolvedRoot, files);
  return files.sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

export async function sha256(path) {
  const content = await readFile(path);
  return createHash("sha256")
    .update(content)
    .digest("hex")
    .toUpperCase();
}

export function hasNoindexMeta(html) {
  return /<meta\s+name=["']robots["']\s+content=["']noindex["']\s*\/?>/i.test(
    html,
  );
}

async function collectFiles(root, directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) =>
    left.name.localeCompare(right.name, "en"),
  );
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `公開パッケージではシンボリックリンクを使用できません: ${absolutePath}`,
      );
    }
    if (entry.isDirectory()) {
      await collectFiles(root, absolutePath, files);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(
        `公開パッケージでは通常ファイル以外を使用できません: ${absolutePath}`,
      );
    }
    files.push(relative(root, absolutePath).split(sep).join("/"));
  }
}

async function requireDirectory(path, label) {
  const entry = await stat(path).catch(() => undefined);
  if (!entry?.isDirectory()) {
    throw new Error(`${label}が見つかりません: ${path}`);
  }
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
