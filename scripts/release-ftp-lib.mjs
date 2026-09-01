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
export const DATA_RELEASE_PATHS = [
  "data/dictation/melody/sample1.json",
  "data/dictation/harmony/sample_harmony1.json",
];
export const DATA_RELEASE_PATH = DATA_RELEASE_PATHS[0];
export const RELEASE_MODES = {
  FULL: "full",
  MELODY_ONLY: "melody-only",
};
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
  dataFiles,
  sourceJson,
  releaseRoot,
  mode = RELEASE_MODES.FULL,
}) {
  const resolvedDist = resolve(distDir);
  const resolvedReleaseRoot = resolve(releaseRoot);
  const releaseDataFiles = resolveReleaseDataFiles({
    dataFiles,
    sourceJson,
  });

  await requireDirectory(resolvedDist, "production buildのdist");
  for (const dataFile of releaseDataFiles) {
    await requireFile(dataFile.sourcePath, dataFile.label);
  }

  const distFiles = await listFiles(resolvedDist);
  const projectedFiles = [
    ...distFiles.map((path) => `${APP_RELEASE_PATH}/${path}`),
    ...releaseDataFiles.map(({ releasePath }) => releasePath),
  ];
  validatePayloadPaths(projectedFiles, mode);

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
  await cp(resolvedDist, appDestination, { recursive: true });

  const jsonResults = [];
  for (const dataFile of releaseDataFiles) {
    const dataDestination = resolve(
      resolvedReleaseRoot,
      ...dataFile.releasePath.split("/"),
    );
    await mkdir(dirname(dataDestination), { recursive: true });
    await copyFile(dataFile.sourcePath, dataDestination);

    const [sourceHash, releasedHash] = await Promise.all([
      sha256(dataFile.sourcePath),
      sha256(dataDestination),
    ]);
    if (sourceHash !== releasedHash) {
      throw new Error(
        `公開用JSONのSHA-256が生成元と一致しません: ${dataFile.releasePath}`,
      );
    }
    jsonResults.push({
      label: dataFile.label,
      releasePath: dataFile.releasePath,
      releasedHash,
      sourceHash,
      sourcePath: dataFile.sourcePath,
    });
  }

  const payloadFiles = await listFiles(resolvedReleaseRoot);
  validatePayloadPaths(payloadFiles, mode);
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
    jsonResults,
    manifest,
    releasedJsonHash: jsonResults[0]?.releasedHash,
    sourceJsonHash: jsonResults[0]?.sourceHash,
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

export function validatePayloadPaths(paths, mode = RELEASE_MODES.FULL) {
  const requiredDataPaths = getRequiredDataPaths(mode);
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
    if (!path.startsWith(`${APP_RELEASE_PATH}/`) && !isDataJsonPath(path)) {
      throw new Error(`公開先が許可されていません: ${path}`);
    }
    if (isDataJsonPath(path) && !requiredDataPaths.includes(path)) {
      throw new Error(`この公開モードでは許可されていないJSONです: ${path}`);
    }
  }

  if (!normalizedPaths.includes(`${APP_RELEASE_PATH}/index.html`)) {
    throw new Error("公開パッケージにアプリのindex.htmlがありません。");
  }
  for (const releasePath of requiredDataPaths) {
    if (!normalizedPaths.includes(releasePath)) {
      throw new Error(`公開パッケージに${releasePath}がありません。`);
    }
  }
}

function getRequiredDataPaths(mode) {
  if (mode === RELEASE_MODES.FULL) {
    return DATA_RELEASE_PATHS;
  }
  if (mode === RELEASE_MODES.MELODY_ONLY) {
    return [DATA_RELEASE_PATH];
  }
  throw new Error(`未対応の公開モードです: ${mode}`);
}

function isDataJsonPath(path) {
  return /^data\/dictation\/(?:melody|harmony)\/[A-Za-z0-9_-]+\.json$/.test(
    path,
  );
}

function resolveReleaseDataFiles({ dataFiles, sourceJson }) {
  const configuredFiles = dataFiles ?? [
    {
      label: "dictation-contentのsample1.json",
      releasePath: DATA_RELEASE_PATH,
      sourcePath: sourceJson,
    },
  ];
  if (!Array.isArray(configuredFiles) || configuredFiles.length === 0) {
    throw new Error("公開用JSONが指定されていません。");
  }
  return configuredFiles.map((dataFile) => ({
    label: dataFile.label ?? dataFile.releasePath,
    releasePath: dataFile.releasePath,
    sourcePath: resolve(dataFile.sourcePath),
  }));
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
