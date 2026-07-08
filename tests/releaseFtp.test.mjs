import { readFile, rm, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  APP_RELEASE_PATH,
  createFtpRelease,
  DATA_RELEASE_PATH,
  DATA_RELEASE_PATHS,
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

  it("リポジトリのindex.htmlにrobots noindexがある", async () => {
    const html = await readFile(resolve("index.html"), "utf8");
    expect(hasNoindexMeta(html)).toBe(true);
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
    writeFile(
      dataFiles[0].sourcePath,
      '{"schema_version":1,"id":"sample1"}\n',
    ),
    writeFile(
      dataFiles[1].sourcePath,
      '{"schema_version":2,"id":"sample_harmony1"}\n',
    ),
  ]);
}
