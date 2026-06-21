export interface MeasureBoundary {
  measure: number;
  start_qstamp: number;
  end_qstamp: number;
}

export interface MelodyNote {
  pitch: number;
  qstamp: number;
  duration: number;
  measure: number;
  velocity: number;
}

export interface MelodyKey {
  semitones: number;
  svg: string;
}

export interface ChordSequenceStep {
  step: number;
  type: "chord";
  pitches: number[];
  duration_sec: number;
  velocity: number;
  label?: string;
}

export interface RestSequenceStep {
  step: number;
  type: "rest";
  duration_sec: number;
}

export interface PlaySequenceStep {
  step: number;
  type: "play";
  start_measure: number;
  end_measure: number;
}

export interface SignalSequenceStep {
  step: number;
  type: "signal";
  content: "end_bell";
}

export type SequenceStep =
  | ChordSequenceStep
  | RestSequenceStep
  | PlaySequenceStep
  | SignalSequenceStep;

export interface MelodyData {
  schema_version: 1;
  id: string;
  type: "melody";
  title: string;
  base_key: string;
  mode: "major" | "minor";
  time_signature: string;
  measures: number;
  measure_map: MeasureBoundary[];
  play: {
    bpm: number;
    voices: Record<string, MelodyNote[]>;
  };
  keys: Record<string, MelodyKey>;
  sequence: SequenceStep[];
}
