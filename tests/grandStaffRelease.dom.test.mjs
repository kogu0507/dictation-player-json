/** @vitest-environment jsdom */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { expect, it, vi } from "vitest";
import fixture from "../testdata/grand_staff/gymnopedie-1-1-12.json";
import { loadContent } from "../src/data/loadMelody";
import { createFullSongEvents } from "../src/domain/playbackEvents";

it("reads a packaged grand staff, displays its SVG and preserves all 58 notes", async () => {
  const workspace = await mkdtemp(resolve(tmpdir(), "grand-staff-package-"));
  try {
    const type = "grand_staff";
    const id = fixture.id;
    const sourceJson = resolve(workspace, `${id}.json`);
    const releaseRoot = resolve(workspace, "release/ftp-root");
    const fixtureText = await readFile(resolve("testdata", type, `${id}.json`), "utf8");
    await writeFile(sourceJson, fixtureText.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
    const { stdout } = await promisify(execFile)(process.execPath,
      [resolve("scripts/release-data.mjs"), "--id", id, "--type", type], {
        cwd: workspace,
        env: { ...process.env, DICTATION_CONTENT_GRAND_STAFF_DIR: workspace },
      },
    );
    expect(stdout.toLowerCase()).toContain(
      "b3f976af774bf723481f3d8f90456765f4a94be5dd1417d28f50a74c6ce686b4",
    );
    const packaged = resolve(releaseRoot, "data/dictation", type, `${id}.json`);
    const fetch = vi.fn(async (url) => {
      expect(url).toMatch(new RegExp(`/grand_staff/${id}\\.json$`));
      return {
        ok: true,
        json: async () => JSON.parse(await readFile(packaged, "utf8")),
      };
    });
    vi.stubGlobal("fetch", fetch);
    const content = await loadContent({ id, type });
    const expected = fixture.play.layers.flatMap((layer) =>
      layer.notes.map((note) => ({
        pitch: note.pitch, startSeconds: note.qstamp * 60 / fixture.play.bpm,
        durationSeconds: note.duration * 60 / fixture.play.bpm, velocity: note.velocity,
      })),
    ).sort((a, b) => a.startSeconds - b.startSeconds);
    expect(expected).toHaveLength(58);
    expect(createFullSongEvents(content, fixture.base_key)).toEqual(expected);
    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState({}, "", `/?type=${type}&id=${id}`);
    await import("../src/main");
    await vi.waitFor(() => {
      expect(document.querySelector("#score > svg")).not.toBeNull();
    });
    expect(document.querySelectorAll("#score .system")).toHaveLength(3);
  } finally {
    vi.unstubAllGlobals();
    await rm(workspace, { recursive: true, force: true });
  }
});
