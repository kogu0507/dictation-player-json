import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildMelodyDataReleasePath,
  createDataOnlyRelease,
} from "../scripts/release-data-lib.mjs";
import {
  listFiles,
  MANIFEST_NAME,
  sha256,
} from "../scripts/release-ftp-lib.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("data-only melody release", () => {
  it("任意IDのmelody JSONだけをmanifest付きで公開パッケージ化する", async () => {
    const workspace = await createTemporaryWorkspace();
    const id = "solfege2026_01_c44";
    const sourceJson = resolve(workspace, "content", `${id}.json`);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await mkdir(resolve(sourceJson, ".."), { recursive: true });
    await writeFile(
      sourceJson,
      JSON.stringify({ schema_version: 1, id }) + "\n",
      "utf8",
    );

    const result = await createDataOnlyRelease({
      sourceJson,
      id,
      releaseRoot,
    });
    const releasePath = buildMelodyDataReleasePath(id);

    expect(await listFiles(releaseRoot)).toEqual([
      releasePath,
      MANIFEST_NAME,
    ]);
    expect(result.releasePath).toBe(releasePath);
    expect(result.sourceHash).toBe(result.releasedHash);
    expect(result.releasedHash).toBe(
      await sha256(resolve(releaseRoot, ...releasePath.split("/"))),
    );
    expect(
      await readFile(resolve(releaseRoot, MANIFEST_NAME), "utf8"),
    ).toContain(`${result.releasedHash}  ${releasePath}`);
  });

  it("同じ入力から安定したmanifestを生成する", async () => {
    const workspace = await createTemporaryWorkspace();
    const id = "lesson_02";
    const sourceJson = resolve(workspace, "content", `${id}.json`);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await mkdir(resolve(sourceJson, ".."), { recursive: true });
    await writeFile(sourceJson, '{"schema_version":1,"id":"lesson_02"}\n');

    const first = await createDataOnlyRelease({ sourceJson, id, releaseRoot });
    const second = await createDataOnlyRelease({ sourceJson, id, releaseRoot });

    expect(second.manifest).toBe(first.manifest);
  });

  it.each(["../sample1", "a/b", "", "日本語", "sample 1"])(
    "危険または非対応のIDを拒否する: %s",
    (id) => {
      expect(() => buildMelodyDataReleasePath(id)).toThrow(
        "課題IDは半角英数字",
      );
    },
  );
});

async function createTemporaryWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), "dictation-data-release-"));
  temporaryDirectories.push(workspace);
  return workspace;
}
