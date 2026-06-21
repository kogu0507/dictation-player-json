import type { PlaybackEvent } from "../domain/playbackEvents";

export type SynthTimbre = "triangle" | "sine";

export interface AudioPlayer {
  resume(): Promise<void>;
  setTimbre(timbre: SynthTimbre): void;
  play(events: PlaybackEvent[]): number;
  stopAll(): void;
}
