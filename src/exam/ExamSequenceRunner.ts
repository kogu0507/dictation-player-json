import type { AudioPlayer } from "../audio/types";
import type {
  PlaySequenceStep,
  SequenceStep,
} from "../data/types";
import type { PlaybackEvent } from "../domain/playbackEvents";
import {
  createChordPlaybackEvents,
  createSignalPlaybackEvents,
} from "./examEvents";

export type ExamRunResult = "completed" | "cancelled";

export interface ExamStepState {
  index: number;
  total: number;
  step: SequenceStep;
}

export interface ExamRunOptions {
  semitones: number;
  createPlayEvents(step: PlaySequenceStep): PlaybackEvent[];
  onStep?(state: ExamStepState): void;
  onComplete?(): void;
  onCancelled?(): void;
}

export type ExamWait = (
  durationSeconds: number,
  signal: AbortSignal,
) => Promise<void>;

interface ActiveExecution {
  id: number;
  controller: AbortController;
}

export class ExamSequenceRunner {
  private nextExecutionId = 0;
  private activeExecution: ActiveExecution | undefined;

  constructor(
    private readonly audioPlayer: Pick<AudioPlayer, "play" | "stopAll">,
    private readonly wait: ExamWait = waitForSeconds,
  ) {}

  get isRunning(): boolean {
    return this.activeExecution !== undefined;
  }

  async run(
    sequence: SequenceStep[],
    options: ExamRunOptions,
  ): Promise<ExamRunResult> {
    if (this.activeExecution !== undefined) {
      throw new Error("試験はすでに実行中です。");
    }

    const execution: ActiveExecution = {
      id: ++this.nextExecutionId,
      controller: new AbortController(),
    };
    this.activeExecution = execution;

    try {
      for (const [index, step] of sequence.entries()) {
        this.assertActive(execution);
        options.onStep?.({
          index,
          total: sequence.length,
          step,
        });
        await this.executeStep(step, execution, options);
      }

      this.assertActive(execution);
      options.onComplete?.();
      return "completed";
    } catch (error) {
      if (isCancellation(error, execution.controller.signal)) {
        options.onCancelled?.();
        return "cancelled";
      }
      throw error;
    } finally {
      if (this.activeExecution?.id === execution.id) {
        this.activeExecution = undefined;
      }
    }
  }

  cancel(): void {
    const execution = this.activeExecution;
    if (execution === undefined) {
      return;
    }
    execution.controller.abort();
    this.audioPlayer.stopAll();
  }

  private async executeStep(
    step: SequenceStep,
    execution: ActiveExecution,
    options: ExamRunOptions,
  ): Promise<void> {
    if (step.type === "rest") {
      await this.wait(step.duration_sec, execution.controller.signal);
      return;
    }

    const events =
      step.type === "chord"
        ? createChordPlaybackEvents(step, options.semitones)
        : step.type === "play"
          ? options.createPlayEvents(step)
          : createSignalPlaybackEvents(step);
    const durationSeconds = this.audioPlayer.play(events);
    await this.wait(durationSeconds, execution.controller.signal);
  }

  private assertActive(execution: ActiveExecution): void {
    if (
      this.activeExecution?.id !== execution.id ||
      execution.controller.signal.aborted
    ) {
      throw new ExamCancelledError();
    }
  }
}

export function waitForSeconds(
  durationSeconds: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new ExamCancelledError());
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, durationSeconds * 1000);

    function handleAbort(): void {
      clearTimeout(timer);
      reject(new ExamCancelledError());
    }

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

class ExamCancelledError extends Error {
  constructor() {
    super("試験が中止されました。");
    this.name = "ExamCancelledError";
  }
}

function isCancellation(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || error instanceof ExamCancelledError;
}
