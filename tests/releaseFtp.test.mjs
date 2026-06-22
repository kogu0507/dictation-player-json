import { readFile, rm, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  APP_RELEASE_PATH,
  createFtpRelease,
  DATA_RELEASE_PATH,
  hasNoindexMeta,
  listFiles,
  MANIFEST_NAME,
  sha256,
  validatePayloadPaths,
} from "../scripts/release-ftp-lib.mjs";

const temporaryDirectories = [];

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
    const sourceJson = resolve(workspace, "content/sample1.json");
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, sourceJson);

    const first = await createFtpRelease({
      distDir,
      sourceJson,
      releaseRoot,
    });
    const firstManifest = await readFile(
      resolve(releaseRoot, MANIFEST_NAME),
      "utf8",
    );
    const second = await createFtpRelease({
      distDir,
      sourceJson,
      releaseRoot,
    });

    expect(await listFiles(releaseRoot)).toEqual([
      `${APP_RELEASE_PATH}/assets/index.css`,
      `${APP_RELEASE_PATH}/assets/index.js`,
      `${APP_RELEASE_PATH}/index.html`,
      DATA_RELEASE_PATH,
      MANIFEST_NAME,
    ]);
    expect(second.manifest).toBe(firstManifest);
    expect(first.sourceJsonHash).toBe(first.releasedJsonHash);
    expect(second.sourceJsonHash).toBe(
      await sha256(resolve(releaseRoot, DATA_RELEASE_PATH)),
    );
    expect(first.entries.map(({ path }) => path)).toEqual([
      `${APP_RELEASE_PATH}/assets/index.css`,
      `${APP_RELEASE_PATH}/assets/index.js`,
      `${APP_RELEASE_PATH}/index.html`,
      DATA_RELEASE_PATH,
    ]);
  });

  it("manifestへ全公開ファイルを安定順序のSHA-256付きで出力する", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const sourceJson = resolve(workspace, "content/sample1.json");
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, sourceJson);

    const result = await createFtpRelease({
      distDir,
      sourceJson,
      releaseRoot,
    });

    for (const entry of result.entries) {
      expect(result.manifest).toContain(
        `${entry.sha256}  ${entry.path}`,
      );
    }
    expect(result.manifest).not.toContain(MANIFEST_NAME);
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
        DATA_RELEASE_PATH,
      ]),
    ).toThrow("公開パッケージへ含められないファイル");
  });

  it("robots noindexがないproduction HTMLを拒否する", async () => {
    const workspace = await createTemporaryWorkspace();
    const distDir = resolve(workspace, "dist");
    const sourceJson = resolve(workspace, "content/sample1.json");
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFixture(distDir, sourceJson, false);

    await expect(
      createFtpRelease({ distDir, sourceJson, releaseRoot }),
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

async function writeFixture(distDir, sourceJson, noindex = true) {
  await mkdir(resolve(distDir, "assets"), { recursive: true });
  await mkdir(resolve(sourceJson, ".."), { recursive: true });
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
    writeFile(sourceJson, '{"schema_version":1,"id":"sample1"}\n'),
  ]);
}
