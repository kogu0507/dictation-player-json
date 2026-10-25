/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sample1 from "../testdata/melody/sample1.json";
import { OscillatorAudioPlayer } from "../src/audio/OscillatorAudioPlayer";
import { validateMelodyData } from "../src/data/validateMelody";
import { getPlaybackDuration, getMeasurePlaybackDuration } from "../src/domain/playbackEvents";

const content = validateMelodyData(process.env.PD001_FIXTURE_PATH
  ? JSON.parse(readFileSync(process.env.PD001_FIXTURE_PATH, "utf8")) : sample1,
  process.env.PD001_FIXTURE_PATH ? "pd001-rinaldo" : "sample1");
const $ = (id) => document.querySelector(`#${id}`);
const select = (id, value) => {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event("change", { bubbles: true }));
};
const flush = async () => { await vi.advanceTimersByTimeAsync(0); };

describe("formal UI trailing rests and exam regression", () => {
  let play;
  let stop;
  beforeAll(async () => {
    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState({}, "", `/?id=${content.id}`);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => content }));
    vi.spyOn(OscillatorAudioPlayer.prototype, "resume").mockResolvedValue();
    play = vi.spyOn(OscillatorAudioPlayer.prototype, "play")
      .mockImplementation((events) => getPlaybackDuration(events) + 0.05);
    stop = vi.spyOn(OscillatorAudioPlayer.prototype, "stopAll").mockImplementation(() => {});
    await import("../src/main");
    await vi.waitFor(() => expect($("app-title").textContent).toBe(content.title));
    vi.useFakeTimers();
  });
  beforeEach(() => {
    $("stop-button").click();
    $("exam-cancel-button").click();
    select("mode-select", "practice");
    select("start-measure-select", 1);
    select("end-measure-select", 8);
    select("key-select", content.base_key);
    select("playback-rate-select", 1);
    vi.clearAllMocks();
  });
  afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each([0.75, 1, 1.25, 1.5])("waits for a full bar at speed %s and then unlocks", async (rate) => {
    const bar = content.id === "sample1" ? 4 : 2;
    select("start-measure-select", bar);
    select("end-measure-select", bar);
    select("playback-rate-select", rate);
    $("play-button").click();
    await flush();
    const endMs = (getMeasurePlaybackDuration(content, { startMeasure: bar, endMeasure: bar }, rate) + 0.15) * 1000;
    // Allow for integer-millisecond timer truncation and floating-point sums.
    await vi.advanceTimersByTimeAsync(endMs - 5);
    expect($("status").dataset.state).toBe("playing");
    expect($("key-select").disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(10);
    expect($("status").dataset.state).toBe("completed");
    expect($("key-select").disabled).toBe(false);
  });

  it("stops in trailing silence and prevents a stale completion", async () => {
    const bar = content.id === "sample1" ? 4 : 2;
    select("start-measure-select", bar);
    select("end-measure-select", bar);
    $("play-button").click(); await flush();
    await vi.advanceTimersByTimeAsync((getPlaybackDuration(play.mock.calls[0][0]) + 0.06) * 1000);
    $("stop-button").click();
    await vi.advanceTimersByTimeAsync(5000);
    expect($("status").dataset.state).toBe("stopped");
    expect(stop).toHaveBeenCalled();
  });

  it("runs all 17 real steps, ignores practice speed, hides/reveals score", async () => {
    select("playback-rate-select", 1.5);
    select("mode-select", "exam");
    expect($("score-panel").hidden).toBe(true);
    $("exam-start-button").click(); await flush();
    let elapsed = 0;
    for (const [index, step] of content.sequence.entries()) {
      expect($("exam-step-status").textContent).toContain(`ステップ ${index + 1}/17`);
      expect($("score-panel").hidden).toBe(true);
      const duration = step.type === "rest" ? step.duration_sec
        : step.type === "chord" ? step.duration_sec + 0.05
        : step.type === "signal" ? 0.79
        : getMeasurePlaybackDuration(content, { startMeasure: step.start_measure, endMeasure: step.end_measure }, 1) + 0.05;
      // Browser setTimeout truncates fractional milliseconds.
      const milliseconds = Math.floor(duration * 1000);
      await vi.advanceTimersByTimeAsync(milliseconds);
      elapsed += milliseconds;
    }
    expect(elapsed).toBeGreaterThan(300000);
    expect($("status").dataset.state).toBe("completed");
    expect($("score-panel").hidden).toBe(false);
    expect($("exam-start-button").disabled).toBe(false);
    expect(play).toHaveBeenCalledTimes(9);
    select("mode-select", "practice");
    expect($("play-button").disabled).toBe(false);
  });

  it("cancels when hidden and never resumes on return", async () => {
    select("mode-select", "exam");
    $("exam-start-button").click(); await flush();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange")); await flush();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(400000);
    expect($("status").dataset.state).toBe("stopped");
    expect($("status-message").textContent).toContain("自動再開しません");
    expect(play).toHaveBeenCalledTimes(1);
    expect($("score-panel").hidden).toBe(false);
    delete document.hidden;
  });

  it("cancels the final 120-second rest without playing the end signal", async () => {
    select("mode-select", "exam");
    $("exam-start-button").click(); await flush();
    for (const step of content.sequence.slice(0, 15)) {
      const duration = step.type === "rest" ? step.duration_sec
        : step.type === "chord" ? step.duration_sec + 0.05
        : getMeasurePlaybackDuration(content, {
          startMeasure: step.start_measure, endMeasure: step.end_measure,
        }, 1) + 0.05;
      await vi.advanceTimersByTimeAsync(Math.floor(duration * 1000));
    }
    expect($("exam-step-status").textContent).toContain("ステップ 16/17");
    $("exam-cancel-button").click(); await flush();
    await vi.advanceTimersByTimeAsync(120000);
    expect(play).toHaveBeenCalledTimes(8);
    expect($("status").dataset.state).toBe("stopped");
    expect($("score-panel").hidden).toBe(false);
    expect($("exam-start-button").disabled).toBe(false);
  });
});
