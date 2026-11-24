/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from "vitest";
import fixture from "../testdata/grand_staff/gymnopedie-1-1-12.json";
import { validateGrandStaffData } from "../src/data/validateMelody";
import { createFullSongEvents } from "../src/domain/playbackEvents";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("preserves the source pitches, timing, lengths and velocity for all 58 notes", () => {
  const content = validateGrandStaffData(fixture, fixture.id);
  const events = createFullSongEvents(content, fixture.base_key);
  const seconds = 60 / fixture.play.bpm;
  const expected = fixture.play.layers.flatMap((layer) => layer.notes.map((note) => ({
    pitch: note.pitch,
    startSeconds: note.qstamp * seconds,
    durationSeconds: note.duration * seconds,
    velocity: note.velocity,
  }))).sort((a, b) => a.startSeconds - b.startSeconds);
  expect(events).toHaveLength(58);
  expect(events).toEqual(expected);
  const endingFSharp = events.filter((event) => event.pitch === 66 && event.startSeconds >= 24);
  expect(endingFSharp).toEqual([
    { pitch: 66, startSeconds: 24, durationSeconds: 12, velocity: 90 },
    ...[25, 28, 31, 34].map((startSeconds) => ({
      pitch: 66, startSeconds, durationSeconds: 2, velocity: 65,
    })),
  ]);
});

it.each([
  ["wrong measure", 9, 27],
  ["gap between segments", 10, 27.5],
])("rejects invalid tied segments: %s", (_, measure, qstamp) => {
  const data = structuredClone(fixture);
  const segment = data.play.layers[0].notes.at(-1)!.segments[1];
  segment.measure = measure;
  segment.qstamp = qstamp;
  expect(() => validateGrandStaffData(data, fixture.id)).toThrow("小節内時刻");
});

it("plays a v3 bundle with optional SVG absent", () => {
  const { score: _, ...audioOnly } = fixture;
  const data = validateGrandStaffData(audioOnly, fixture.id);
  expect(data.score).toBeUndefined();
  expect(createFullSongEvents(data, fixture.base_key)).toHaveLength(58);
});

it("loads a grand staff and displays the supplied two-staff SVG", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  window.history.replaceState({}, "", `/?type=grand_staff&id=${fixture.id}`);
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
  vi.stubGlobal("fetch", fetchMock);
  await import("../src/main");
  await vi.waitFor(() => {
    expect(document.querySelector("#app-title")?.textContent).toBe(fixture.title);
  });
  expect(fetchMock.mock.calls[0][0]).toContain(`/grand_staff/${fixture.id}.json`);
  const score = document.querySelector("#score");
  expect(score?.firstElementChild?.localName).toBe("svg");
  expect(Array.from(score!.querySelectorAll(".system"), (system) =>
    system.querySelectorAll(".measure").length,
  )).toEqual([4, 4, 4]);
  expect(score?.querySelector(".measure")?.querySelectorAll(".staff")).toHaveLength(2);
  expect(document.querySelectorAll("#key-select option")).toHaveLength(1);
});
