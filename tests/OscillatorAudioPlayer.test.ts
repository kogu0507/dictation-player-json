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
