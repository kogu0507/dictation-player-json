import { describe, expect, it, vi } from "vitest";
import sample1Json from "../testdata/melody/sample1.json";
import { validateMelodyData } from "../src/data/validateMelody";
import type { PlaybackEvent } from "../src/domain/playbackEvents";
import {
  ExamSequenceRunner,
  type ExamWait,
} from "../src/exam/ExamSequenceRunner";

const melody = validateMelodyData(sample1Json, "sample1");

function createAudioPlayer() {
  return {
    play: vi.fn((events: PlaybackEvent[]) =>
      events.reduce(
        (duration, event) =>
          Math.max(
            duration,
            event.startSeconds + event.durationSeconds,
          ),
        0,
      ),
    ),
    stopAll: vi.fn(),
  };
}

describe("ExamSequenceRunner", () => {
  it("sample1の全stepを配列順に最後まで実行する", async () => {
    const audioPlayer = createAudioPlayer();
    const waitedDurations: number[] = [];
    const wait: ExamWait = async (durationSeconds) => {
      waitedDurations.push(durationSeconds);
    };
    const runner = new ExamSequenceRunner(audioPlayer, wait);
    const visitedSteps: Array<[number, string]> = [];
    const playRanges: Array<[number, number]> = [];
    const onComplete = vi.fn();

    const result = await runner.run(melody.sequence, {
      semitones: 0,
      createPlayEvents: (step) => {
        playRanges.push([step.start_measure, step.end_measure]);
        return [
          {
            pitch: 67,
            startSeconds: 0,
            durationSeconds: 1,
            velocity: 90,
          },
        ];
      },
      onStep: ({ step }) => {
        visitedSteps.push([step.step, step.type]);
      },
      onComplete,
    });

    expect(result).toBe("completed");
    expect(visitedSteps).toEqual(
      melody.sequence.map((step) => [step.step, step.type]),
    );
    expect(playRanges).toEqual([
      [1, 8],
      [1, 4],
      [1, 4],
      [1, 8],
      [5, 8],
      [5, 8],
      [1, 8],
    ]);
    expect(waitedDurations).toHaveLength(melody.sequence.length);
    expect(audioPlayer.play).toHaveBeenCalledTimes(9);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(runner.isRunning).toBe(false);
  });

  it("120秒待機中でも中止し、後続stepを実行しない", async () => {
    const audioPlayer = createAudioPlayer();
    let waitingSignal: AbortSignal | undefined;
    const wait: ExamWait = (_durationSeconds, signal) =>
      new Promise((_resolve, reject) => {
        waitingSignal = signal;
        signal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      });
    const runner = new ExamSequenceRunner(audioPlayer, wait);
    const onStep = vi.fn();
    const onComplete = vi.fn();
    const onCancelled = vi.fn();

    const running = runner.run(
      [
        { step: 1, type: "rest", duration_sec: 120 },
        { step: 2, type: "rest", duration_sec: 1 },
      ],
      {
        semitones: 0,
        createPlayEvents: () => [],
        onStep,
        onComplete,
        onCancelled,
      },
    );
    expect(waitingSignal?.aborted).toBe(false);

    runner.cancel();
    await expect(running).resolves.toBe("cancelled");

    expect(waitingSignal?.aborted).toBe(true);
    expect(audioPlayer.stopAll).toHaveBeenCalledOnce();
    expect(onStep).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCancelled).toHaveBeenCalledOnce();
    expect(runner.isRunning).toBe(false);
  });

  it("多重開始を拒否する", async () => {
    const audioPlayer = createAudioPlayer();
    const wait: ExamWait = (_durationSeconds, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      });
    const runner = new ExamSequenceRunner(audioPlayer, wait);
    const firstRun = runner.run(
      [{ step: 1, type: "rest", duration_sec: 120 }],
      { semitones: 0, createPlayEvents: () => [] },
    );

    await expect(
      runner.run(
        [{ step: 1, type: "rest", duration_sec: 1 }],
        { semitones: 0, createPlayEvents: () => [] },
      ),
    ).rejects.toThrow("試験はすでに実行中です。");

    runner.cancel();
    await expect(firstRun).resolves.toBe("cancelled");
  });

  it("中止後に古い実行が完了状態を通知しない", async () => {
    const audioPlayer = createAudioPlayer();
    let releaseWait: (() => void) | undefined;
    const wait: ExamWait = (_durationSeconds, signal) =>
      new Promise((resolve, reject) => {
        releaseWait = resolve;
        signal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      });
    const runner = new ExamSequenceRunner(audioPlayer, wait);
    const onComplete = vi.fn();
    const running = runner.run(
      [{ step: 1, type: "rest", duration_sec: 1 }],
      { semitones: 0, createPlayEvents: () => [], onComplete },
    );

    runner.cancel();
    releaseWait?.();
    await expect(running).resolves.toBe("cancelled");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
