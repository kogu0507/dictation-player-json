import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateMelodyData } from "../src/data/validateMelody";
import {
  createContentPlaybackEvents,
  getMeasurePlaybackDuration,
  getPlaybackDuration,
} from "../src/domain/playbackEvents";
import { ExamSequenceRunner } from "../src/exam/ExamSequenceRunner";
import { createChordPlaybackEvents } from "../src/exam/examEvents";

// The unpublished candidate is supplied locally, never bundled into releases.
const fixturePath = process.env.PD001_FIXTURE_PATH;
describe.skipIf(!fixturePath)("PD-001 v0.7 private candidate", () => {
  const bytes = fixturePath ? readFileSync(fixturePath) : undefined;
  const content = bytes
    ? validateMelodyData(JSON.parse(bytes.toString("utf8")), "pd001-rinaldo")
    : undefined;

  it("pins the exact v0.7 input and metadata", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "903d45c0c869a714ab42f87cb557bdfa59c7212282f1ee1b55ca6d59ff600641",
    );
    expect(content).toMatchObject({
      schema_version: 1, type: "melody", base_key: "F", mode: "major",
      time_signature: "3/2", measures: 8, play: { bpm: 144 },
    });
    expect(content.play.voices.soprano).toHaveLength(25);
    expect(content.play.voices.soprano.filter((n) => n.pitch === 70)).toHaveLength(4);
    expect(content.measure_map).toEqual(Array.from({ length: 8 }, (_, i) => ({
      measure: i + 1, start_qstamp: i * 6, end_qstamp: (i + 1) * 6,
    })));
    expect(content.sequence.filter((step) => step.type === "play")
      .map((step) => [step.start_measure, step.end_measure])).toEqual([
      [1, 8], [1, 4], [1, 4], [1, 8], [5, 8], [5, 8], [1, 8],
    ]);
  });

  it("preserves note timing and chord pitches across all 12 keys and 4 speeds", () => {
    expect(Object.keys(content.keys)).toHaveLength(12);
    for (const [selectedKey, key] of Object.entries(content.keys)) {
      expect(key.svg).toContain("<svg");
      expect(createChordPlaybackEvents(content.sequence[0], key.semitones).map((e) => e.pitch))
        .toEqual([65, 69, 72].map((pitch) => pitch + key.semitones));
      for (const playbackRate of [0.75, 1, 1.25, 1.5]) {
        const events = createContentPlaybackEvents(content, {
          selectedKey, playbackRate, startMeasure: 1, endMeasure: 8,
        });
        expect(events).toHaveLength(25);
        events.forEach((event, i) => {
          const note = content.play.voices.soprano[i];
          expect(event.pitch).toBe(note.pitch + key.semitones);
          expect(event.startSeconds).toBeCloseTo(note.qstamp * 60 / 144 / playbackRate);
          expect(event.durationSeconds).toBeCloseTo(note.duration * 60 / 144 / playbackRate);
        });
      }
    }
  });

  it("keeps bar 2 silent after 1.666667s until its 2.5s boundary", () => {
    const events = createContentPlaybackEvents(content, {
      selectedKey: "F", playbackRate: 1, startMeasure: 2, endMeasure: 2,
    });
    expect(getPlaybackDuration(events)).toBeCloseTo(5 / 3);
    expect(getMeasurePlaybackDuration(content, { startMeasure: 2, endMeasure: 2 }, 1)).toBe(2.5);
  });

  it("runs the actual 17 steps with 50ms audio lead-in and unchanged rests", async () => {
    const waits = [];
    const soundingEvents = [];
    const runner = new ExamSequenceRunner({
      play(events) { soundingEvents.push(events); return getPlaybackDuration(events) + 0.05; },
      stopAll() {},
    }, async (seconds) => { waits.push(seconds); });
    const visited = [];
    await expect(runner.run(content.sequence, {
      semitones: 0,
      createPlayEvents: (step) => createContentPlaybackEvents(content, {
        selectedKey: "F", playbackRate: 1,
        startMeasure: step.start_measure, endMeasure: step.end_measure,
      }),
      getPlayDuration: (step) => getMeasurePlaybackDuration(content, {
        startMeasure: step.start_measure, endMeasure: step.end_measure,
      }, 1),
      onStep: ({ step }) => visited.push(step.step),
    })).resolves.toBe("completed");
    expect(visited).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    const expected = [4.05, 4, 20.05, 20, 10.05, 20, 10.05, 20,
      20.05, 20, 10.05, 20, 10.05, 20, 20.05, 120, 0.79];
    waits.forEach((seconds, i) => expect(seconds).toBeCloseTo(expected[i]));
    expect(waits).toHaveLength(17);
    expect(waits.reduce((a, b) => a + b, 0)).toBeCloseTo(349.19);
    expect(soundingEvents[0].map((e) => e.pitch)).toEqual([65, 69, 72]);
    expect(soundingEvents[0].every((e) => e.startSeconds === 0 && e.durationSeconds === 4)).toBe(true);
  });
});


