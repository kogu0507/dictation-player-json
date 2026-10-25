import { describe, expect, it } from "vitest";
import { OscillatorAudioPlayer } from "../src/audio/OscillatorAudioPlayer";

class FakeAudioParam {
  readonly values: Array<[string, number, number]> = [];

  setValueAtTime(value: number, time: number): void {
    this.values.push(["set", value, time]);
  }

  linearRampToValueAtTime(value: number, time: number): void {
    this.values.push(["ramp", value, time]);
  }
}

class FakeOscillator {
  type: OscillatorType = "sine";
  readonly frequency = new FakeAudioParam();
  readonly startTimes: number[] = [];
  readonly stopTimes: number[] = [];
  disconnected = false;

  connect(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  addEventListener(): void {}

  start(time: number): void {
    this.startTimes.push(time);
  }

  stop(time: number): void {
    this.stopTimes.push(time);
  }
}

class FakeGain {
  readonly gain = new FakeAudioParam();
  disconnected = false;

  connect(): void {}

  disconnect(): void {
    this.disconnected = true;
  }
}

class FakeAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 10;
  destination = {};
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];

  async resume(): Promise<void> {
    this.state = "running";
  }

  createOscillator(): OscillatorNode {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }
}

describe("OscillatorAudioPlayer", () => {
  it("同じイベントを選択波形で予約し、再実行と全停止ができる", async () => {
    const context = new FakeAudioContext();
    const player = new OscillatorAudioPlayer(
      () => context as unknown as AudioContext,
    );
    const events = [
      {
        pitch: 69,
        startSeconds: 0,
        durationSeconds: 1,
        velocity: 100,
      },
    ];
    player.setTimbre("triangle");
    await player.resume();

    expect(player.play(events)).toBeCloseTo(1.05);

    const triangleOscillator = context.oscillators[0];
    expect(triangleOscillator.type).toBe("triangle");
    expect(triangleOscillator.frequency.values[0]?.[1]).toBeCloseTo(440);
    expect(triangleOscillator.startTimes).toEqual([10.05]);
    expect(triangleOscillator.stopTimes[0]).toBeCloseTo(11.06);

    player.setTimbre("sine");
    expect(player.play(events)).toBeCloseTo(1.05);
    const sineOscillator = context.oscillators[1];
    expect(sineOscillator.type).toBe("sine");
    expect(sineOscillator.startTimes).toEqual([10.05]);
    expect(triangleOscillator.disconnected).toBe(true);

    player.stopAll();
    expect(sineOscillator.stopTimes.at(-1)).toBe(10);
    expect(sineOscillator.disconnected).toBe(true);
    expect(context.gains[1]?.disconnected).toBe(true);
  });
});

describe("OscillatorAudioPlayer note ending", () => {
  it.each(["triangle", "sine"] as const)("keeps adjacent and dotted notes silent after note-off (%s)", async (timbre) => {
    const context = new FakeAudioContext();
    const player = new OscillatorAudioPlayer(() => context as unknown as AudioContext);
    player.setTimbre(timbre);
    await player.resume();
    const durations = [0.25, 0.5, 0.75, 4].map((qstamp) => qstamp * 60 / 144);
    let startSeconds = 0;
    const events = durations.map((durationSeconds) => {
      const event = { pitch: 70, startSeconds, durationSeconds, velocity: 90 };
      startSeconds += durationSeconds;
      return event;
    });
    player.play(events);
    events.forEach((event, i) => {
      const start = 10.05 + event.startSeconds;
      const end = start + event.durationSeconds;
      expect(context.oscillators[i]!.type).toBe(timbre);
      expect(context.oscillators[i]!.startTimes[0]).toBeCloseTo(start);
      expect(context.gains[i]!.gain.values[2]![2]).toBeCloseTo(end - 0.005);
      expect(context.gains[i]!.gain.values[3]![1]).toBe(0);
      expect(context.gains[i]!.gain.values[3]![2]).toBeCloseTo(end);
    });
  });

  it("releases only in the final 5ms and reaches silence at the exact note end", async () => {
    const context = new FakeAudioContext();
    const player = new OscillatorAudioPlayer(
      () => context as unknown as AudioContext,
    );
    await player.resume();
    player.play([{ pitch: 70, startSeconds: 0, durationSeconds: 1, velocity: 90 }]);
    const gainValues = context.gains[0]?.gain.values;
    expect(gainValues?.[2]?.[2]).toBeCloseTo(11.045);
    expect(gainValues?.[3]).toEqual(["ramp", 0, 11.05]);
  });

  it("preserves the final 5ms of a sixteenth note at quarter BPM 144", async () => {
    const context = new FakeAudioContext();
    const player = new OscillatorAudioPlayer(
      () => context as unknown as AudioContext,
    );
    await player.resume();
    const duration = 60 / 144 / 4;
    player.play([{ pitch: 70, startSeconds: 0, durationSeconds: duration, velocity: 90 }]);
    const gainValues = context.gains[0]?.gain.values;
    expect(gainValues?.[3]?.[2]).toBeCloseTo(10.05 + duration);
    expect((gainValues?.[3]?.[2] ?? 0) - (gainValues?.[2]?.[2] ?? 0)).toBeCloseTo(0.005);
  });
});
