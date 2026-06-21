import type { PlaybackEvent } from "../domain/playbackEvents";
import type { AudioPlayer, SynthTimbre } from "./types";

interface ActiveVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

const START_DELAY_SECONDS = 0.05;
const ATTACK_SECONDS = 0.01;
const RELEASE_SECONDS = 0.03;
const MAX_GAIN = 0.18;

export class OscillatorAudioPlayer implements AudioPlayer {
  private context: AudioContext | undefined;
  private timbre: SynthTimbre = "triangle";
  private readonly activeVoices = new Set<ActiveVoice>();

  constructor(
    private readonly contextFactory: () => AudioContext = () =>
      new AudioContext(),
  ) {}

  async resume(): Promise<void> {
    const context = this.getContext();
    if (context.state !== "running") {
      await context.resume();
    }
  }

  setTimbre(timbre: SynthTimbre): void {
    this.timbre = timbre;
  }

  play(events: PlaybackEvent[]): number {
    const context = this.getContext();
    if (context.state !== "running") {
      throw new Error("AudioContextが開始されていません。");
    }

    this.stopAll();
    const baseTime = context.currentTime + START_DELAY_SECONDS;
    let playbackDuration = 0;

    for (const event of events) {
      const startTime = baseTime + event.startSeconds;
      const endTime = startTime + event.durationSeconds;
      playbackDuration = Math.max(
        playbackDuration,
        event.startSeconds + event.durationSeconds,
      );
      this.scheduleVoice(context, event, startTime, endTime);
    }

    return playbackDuration + START_DELAY_SECONDS;
  }

  stopAll(): void {
    const stopTime = this.context?.currentTime ?? 0;
    for (const voice of this.activeVoices) {
      try {
        voice.oscillator.stop(stopTime);
      } catch {
        // すでに停止済みのノードは無視する。
      }
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    this.activeVoices.clear();
  }

  private getContext(): AudioContext {
    this.context ??= this.contextFactory();
    return this.context;
  }

  private scheduleVoice(
    context: AudioContext,
    event: PlaybackEvent,
    startTime: number,
    endTime: number,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const activeVoice = { oscillator, gain };
    const sustainGain = (event.velocity / 127) * MAX_GAIN;
    const attackEnd = Math.min(startTime + ATTACK_SECONDS, endTime);
    const releaseStart = Math.max(attackEnd, endTime - RELEASE_SECONDS);

    oscillator.type = this.timbre;
    oscillator.frequency.setValueAtTime(
      midiPitchToFrequency(event.pitch),
      startTime,
    );

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(sustainGain, attackEnd);
    gain.gain.setValueAtTime(sustainGain, releaseStart);
    gain.gain.linearRampToValueAtTime(0, endTime);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener(
      "ended",
      () => {
        oscillator.disconnect();
        gain.disconnect();
        this.activeVoices.delete(activeVoice);
      },
      { once: true },
    );

    this.activeVoices.add(activeVoice);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.01);
  }
}

export function midiPitchToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12);
}
