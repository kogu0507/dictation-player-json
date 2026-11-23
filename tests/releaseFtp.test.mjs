import { readFile, rm, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveReleaseSource } from "../scripts/release-inputs.mjs";
import { approvedBytes } from "./releaseBaselineFixtures.mjs";
import {
  APP_RELEASE_PATH,
  createFtpRelease,
  DATA_RELEASE_PATH,
  DATA_RELEASE_PATHS,
  RELEASE_MODES,
  hasNoindexMeta,
  listFiles,
  MANIFEST_NAME,
  sha256,
  validatePayloadPaths,
} from "../scripts/release-ftp-lib.mjs";

const temporaryDirectories = [];
const sortedDataReleasePaths = [...DATA_RELEASE_PATHS].sort((left, right) =>
  left.localeCompare(right, "en"),
);

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("FTP release package", () => {
  it("distと生成元JSONから再現可能な公開構成とmanifestを作る", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const dataFiles = createFixtureDataFiles(workspace);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, dataFiles);

    const first = await createFtpRelease({
      distDir,
      dataFiles,
      releaseRoot,
    });
    const firstManifest = await readFile(
      resolve(releaseRoot, MANIFEST_NAME),
      "utf8",
    );
    const second = await createFtpRelease({
      distDir,
      dataFiles,
      releaseRoot,
    });

    expect(await listFiles(releaseRoot)).toEqual([
      `${APP_RELEASE_PATH}/assets/index.css`,
      `${APP_RELEASE_PATH}/assets/index.js`,
      `${APP_RELEASE_PATH}/index.html`,
      ...sortedDataReleasePaths,
      MANIFEST_NAME,
    ]);
    expect(second.manifest).toBe(firstManifest);
    expect(first.jsonResults).toHaveLength(2);
    for (const jsonResult of first.jsonResults) {
      expect(jsonResult.sourceHash).toBe(jsonResult.releasedHash);
    }
    for (const jsonResult of second.jsonResults) {
      expect(jsonResult.sourceHash).toBe(
        await sha256(resolve(releaseRoot, jsonResult.releasePath)),
      );
    }
    expect(first.entries.map(({ path }) => path)).toEqual([
      `${APP_RELEASE_PATH}/assets/index.css`,
      `${APP_RELEASE_PATH}/assets/index.js`,
      `${APP_RELEASE_PATH}/index.html`,
      ...sortedDataReleasePaths,
    ]);
  });

  it("manifestへ全公開ファイルを安定順序のSHA-256付きで出力する", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const dataFiles = createFixtureDataFiles(workspace);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, dataFiles);

    const result = await createFtpRelease({
      distDir,
      dataFiles,
      releaseRoot,
    });

    for (const entry of result.entries) {
      expect(result.manifest).toContain(
        `${entry.sha256}  ${entry.path}`,
      );
    }
    expect(result.manifest).not.toContain(MANIFEST_NAME);
    expect(result.manifest).toContain(DATA_RELEASE_PATHS[1]);
  });

  it("melody-onlyではアプリとmelody JSONだけを安全に公開する", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const [melodyFile] = createFixtureDataFiles(workspace);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, [melodyFile]);

    const result = await createFtpRelease({
      distDir,
      dataFiles: [melodyFile],
      releaseRoot,
      mode: RELEASE_MODES.MELODY_ONLY,
    });

    expect(await listFiles(releaseRoot)).toEqual([
      `${APP_RELEASE_PATH}/assets/index.css`,
      `${APP_RELEASE_PATH}/assets/index.js`,
      `${APP_RELEASE_PATH}/index.html`,
      DATA_RELEASE_PATH,
      MANIFEST_NAME,
    ]);
    expect(result.jsonResults).toHaveLength(1);
    expect(result.manifest).not.toContain(DATA_RELEASE_PATHS[1]);
  });

  it.each([
    `${APP_RELEASE_PATH}/src/main.ts`,
    `${APP_RELEASE_PATH}/tests/app.test.ts`,
    `${APP_RELEASE_PATH}/node_modules/vite/index.js`,
    `${APP_RELEASE_PATH}/.htaccess`,
    `${APP_RELEASE_PATH}/package.json`,
  ])("公開対象外ファイルを拒否する: %s", (forbiddenPath) => {
    expect(() =>
      validatePayloadPaths([
        `${APP_RELEASE_PATH}/index.html`,
        forbiddenPath,
        ...DATA_RELEASE_PATHS,
      ]),
    ).toThrow("公開パッケージへ含められないファイル");
  });

  it("melody/harmony以外のdata pathを拒否する", () => {
    expect(() =>
      validatePayloadPaths([
        `${APP_RELEASE_PATH}/index.html`,
        ...DATA_RELEASE_PATHS,
        "data/dictation/other/sample.json",
      ]),
    ).toThrow("公開先が許可されていません");
  });

  it("melody-onlyではharmony JSONを拒否する", () => {
    expect(() =>
      validatePayloadPaths(
        [
          `${APP_RELEASE_PATH}/index.html`,
          ...DATA_RELEASE_PATHS,
        ],
        RELEASE_MODES.MELODY_ONLY,
      ),
    ).toThrow("この公開モードでは許可されていないJSON");
  });

  it("robots noindexがないproduction HTMLを拒否する", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const dataFiles = createFixtureDataFiles(workspace);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, dataFiles, false);

    await expect(
      createFtpRelease({ distDir, dataFiles, releaseRoot }),
    ).rejects.toThrow("robots noindex");
  });

  it.each([
    [0, "melody", "sample1", "DICTATION_CONTENT_SAMPLE1", false],
    [1, "harmony", "sample_harmony1", "DICTATION_CONTENT_HARMONY_SAMPLE1", false],
    [0, "melody", "sample1", "DICTATION_CONTENT_SAMPLE1", true],
    [1, "harmony", "sample_harmony1", "DICTATION_CONTENT_HARMONY_SAMPLE1", true],
  ])("対象%d（%s %s）の基準外データを拒否する（環境変数: %s, 使用: %s）",
    async (index, type, id, variable, useOverride) => {
      const workspace = await createTemporaryWorkspace();
      const distDir = resolve(workspace, "dist");
      const dataFiles = createFixtureDataFiles(workspace);
      const releaseRoot = resolve(workspace, "release/ftp-root");
      await writeFixture(distDir, dataFiles);
      await mkdir(releaseRoot, { recursive: true });
      await writeFile(resolve(releaseRoot, "previous.txt"), "keep");
      const expected = (await sha256(dataFiles[index].sourcePath)).toLowerCase();
      const sourcePath = useOverride
        ? resolve(workspace, "override.json")
        : dataFiles[index].sourcePath;
      const approved = await approvedBytes(type, id);
      const stale = type === "melody"
        ? approved.replaceAll("\n", "\r\n")
        : approved.replace('"time_signature": "4/4"', '"time_signature": "2/2"');
      await writeFile(sourcePath, stale);
      if (useOverride) {
        vi.stubEnv(variable, sourcePath);
        dataFiles[index].sourcePath = resolveReleaseSource({ type, id });
      }
      const actual = (await sha256(sourcePath)).toLowerCase();
      await expect(createFtpRelease({ distDir, dataFiles, releaseRoot })).rejects.toThrow(
        `入力: ${sourcePath}\n期待: ${expected}\n実測: ${actual}`,
      );
      expect(await listFiles(releaseRoot)).toEqual(["previous.txt"]);
    },
  );

  it("リポジトリのindex.htmlにrobots noindexがある", async () => {
    const html = await readFile(resolve("index.html"), "utf8");
    expect(hasNoindexMeta(html)).toBe(true);
  });

  it("通常版に未登録の課題を混ぜると出力前に拒否する", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const dataFiles = createFixtureDataFiles(workspace);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, dataFiles);
    dataFiles.push({
      releasePath: "data/dictation/melody/unapproved.json",
      sourcePath: dataFiles[0].sourcePath,
    });
    await expect(createFtpRelease({ distDir, dataFiles, releaseRoot })).rejects.toThrow(
      "この公開モードでは許可されていないJSON",
    );
    await expect(listFiles(releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

async function createTemporaryWorkspace() {
  const workspace = await mkdtemp(
    join(tmpdir(), "dictation-release-"),
  );
  temporaryDirectories.push(workspace);
  return workspace;
}

function createFixtureDataFiles(workspace) {
  return [
    {
      label: "melody sample1",
      releasePath: DATA_RELEASE_PATH,
      sourcePath: resolve(workspace, "content/melody/sample1.json"),
    },
    {
      label: "harmony sample_harmony1",
      releasePath: DATA_RELEASE_PATHS[1],
      sourcePath: resolve(
        workspace,
        "content/harmony/sample_harmony1.json",
      ),
    },
  ];
}

async function writeFixture(distDir, dataFiles, noindex = true) {
  await mkdir(resolve(distDir, "assets"), { recursive: true });
  await Promise.all(
    dataFiles.map((dataFile) =>
      mkdir(resolve(dataFile.sourcePath, ".."), { recursive: true }),
    ),
  );
  const robotsMeta = noindex
    ? '<meta name="robots" content="noindex">'
    : "";
  await Promise.all([
    writeFile(
      resolve(distDir, "index.html"),
      `<!doctype html><html><head>${robotsMeta}</head></html>`,
    ),
    writeFile(resolve(distDir, "assets/index.js"), "console.log('ok');"),
    writeFile(resolve(distDir, "assets/index.css"), "body{}"),
    ...dataFiles.map(async (dataFile) => {
      const [, , type, filename] = dataFile.releasePath.split("/");
      await writeFile(dataFile.sourcePath, await approvedBytes(type, filename.slice(0, -5)));
    }),
  ]);
}
