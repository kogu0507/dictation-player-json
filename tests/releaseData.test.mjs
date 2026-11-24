import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDataReleasePath, readApprovedInput, resolveReleaseSource } from "../scripts/release-inputs.mjs";
import { approvedBytes } from "./releaseBaselineFixtures.mjs";
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
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("data-only release", () => {
  it.each([
    ["melody", "sample1"],
    ["harmony", "sample_harmony1"],
    ["grand_staff", "gymnopedie-1-1-12"],
  ])("承認済みの%s %sをmanifest付きで公開パッケージ化する", async (type, id) => {
    const workspace = await createTemporaryWorkspace();
    const sourceJson = resolve(workspace, "content", `${id}.json`);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await mkdir(resolve(sourceJson, ".."), { recursive: true });
    await writeFile(sourceJson, await approvedBytes(type, id));

    const result = await createDataOnlyRelease({
      sourceJson,
      id,
      type,
      releaseRoot,
    });
    const releasePath = buildDataReleasePath(type, id);

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
    const id = "sample1";
    const sourceJson = resolve(workspace, "content", `${id}.json`);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await mkdir(resolve(sourceJson, ".."), { recursive: true });
    await writeFile(sourceJson, await approvedBytes("melody", id));

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

  it("生成元JSONがftp-root内にある場合は削除せず拒否する", async () => {
    const workspace = await createTemporaryWorkspace();
    const releaseRoot = resolve(workspace, "release/ftp-root");
    const sourceJson = resolve(releaseRoot, "source.json");
    await mkdir(releaseRoot, { recursive: true });
    await writeFile(sourceJson, '{"schema_version":1}\n', "utf8");

    await expect(
      createDataOnlyRelease({
        sourceJson,
        id: "sample1",
        releaseRoot,
      }),
    ).rejects.toThrow("生成元JSONをrelease/ftp-root内に置くことはできません");
    await expect(readFile(sourceJson, "utf8")).resolves.toContain("schema_version");
  });

  it.each([
    ["melody", "sample1", false],
    ["harmony", "sample_harmony1", false],
    ["melody", "sample1", true],
    ["harmony", "sample_harmony1", true],
  ])("%s %sの基準外データを拒否する（環境変数使用: %s）", async (type, id, useOverride) => {
    const workspace = await createTemporaryWorkspace();
    const directory = resolve(workspace, useOverride ? "override" : "dist", type);
    const sourcePath = resolve(directory, `${id}.json`);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await mkdir(directory, { recursive: true });
    const approved = await approvedBytes(type, id);
    await writeFile(sourcePath, approved);
    const expected = (await sha256(sourcePath)).toLowerCase();
    const stale = type === "melody"
      ? approved.replaceAll("\n", "\r\n")
      : approved.replace('"time_signature": "4/4"', '"time_signature": "2/2"');
    await writeFile(sourcePath, stale);
    let sourceJson = sourcePath;
    if (useOverride) {
      vi.stubEnv(`DICTATION_CONTENT_${type.toUpperCase()}_DIR`, directory);
      sourceJson = resolveReleaseSource({ type, id, dataOnly: true });
    }
    const actual = (await sha256(sourcePath)).toLowerCase();
    await expect(createDataOnlyRelease({ sourceJson, id, type, releaseRoot })).rejects.toThrow(
      `入力: ${sourcePath}\n期待: ${expected}\n実測: ${actual}`,
    );
    await expect(listFiles(releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["melody", "harmony", "grand_staff"])("未登録の%s課題を拒否する", async (type) => {
    const workspace = await createTemporaryWorkspace();
    const sourceJson = resolve(workspace, "unapproved.json");
    const releaseRoot = resolve(workspace, "release/ftp-root");
    await writeFile(sourceJson, "{}");
    await expect(createDataOnlyRelease({
      sourceJson, type, id: "unapproved", releaseRoot,
    })).rejects.toThrow("公開基準に未登録");
    await expect(listFiles(releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([
    ["melody", "sample1"],
    ["harmony", "sample_harmony1"],
    ["grand_staff", "gymnopedie-1-1-12"],
  ])("%s の CLI ドライランは既存出力を書き換えない", async (type, id) => {
    const workspace = await createTemporaryWorkspace();
    const releaseRoot = resolve(workspace, "release/ftp-root");
    const source = resolve(workspace, `${id}.json`);
    await mkdir(releaseRoot, { recursive: true });
    await writeFile(resolve(releaseRoot, "keep.txt"), "old package");
    await writeFile(source, await approvedBytes(type, id));
    const cli = fileURLToPath(new URL("../scripts/release-data.mjs", import.meta.url));
    const { stdout } = await promisify(execFile)(process.execPath,
      [cli, "--id", id, "--type", type, "--dry-run"], {
        cwd: workspace,
        env: { ...process.env, [`DICTATION_CONTENT_${type.toUpperCase()}_DIR`]: workspace },
      },
    );
    expect(stdout).toContain(source);
    expect(stdout).toContain("承認済みSHA-256と一致");
    expect(stdout).toContain(buildDataReleasePath(type, id));
    expect(stdout).toContain(MANIFEST_NAME);
    expect(await listFiles(releaseRoot)).toEqual(["keep.txt"]);
    expect(await readFile(resolve(releaseRoot, "keep.txt"), "utf8")).toBe("old package");
  });

  it("大譜表の旧ハッシュは通常版とドライランのどちらでも拒否する", async () => {
    const workspace = await createTemporaryWorkspace();
    const sourceJson = resolve(workspace, "old.json");
    const releaseRoot = resolve(workspace, "release/ftp-root");
    const id = "gymnopedie-1-1-12";
    await writeFile(sourceJson, (await approvedBytes("grand_staff", id)).replaceAll("\r\n", "\n"));
    for (const dryRun of [false, true]) {
      await expect(createDataOnlyRelease({
        sourceJson, id, releaseRoot, type: "grand_staff", dryRun,
      })).rejects.toThrow("承認済みSHA-256と一致しません");
    }
    await expect(listFiles(releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("ハッシュが登録されても score.svg のない大譜表は拒否する", async () => {
    const workspace = await createTemporaryWorkspace();
    const source = resolve(workspace, "no-svg.json");
    const id = "gymnopedie-1-1-12";
    const { score: ignored, ...withoutScore } = JSON.parse(await approvedBytes("grand_staff", id));
    const bytes = JSON.stringify(withoutScore);
    await writeFile(source, bytes);
    const path = buildDataReleasePath("grand_staff", id);
    const baselines = new Map([[path, createHash("sha256").update(bytes).digest("hex")]]);
    await expect(readApprovedInput(baselines, path, source)).rejects.toThrow("score.svgが必要");
  });
});

async function createTemporaryWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), "dictation-data-release-"));
  temporaryDirectories.push(workspace);
  return workspace;
}
