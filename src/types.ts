/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type KeyboardLayout = 'QWERTZ' | 'QWERTY' | 'AZERTY' | 'AUTO';

export interface TrackerStep {
  note: string | null;         // e.g., "C-4", "D#5", "OFF" (Key Off), null (empty)
  instrument: number | null;   // Sample index (0-indexed: 0-15), null (empty)
  volume: number | null;       // Volume 0 to 64, null (empty)
  effectCode: string | null;   // e.g., '0' (Arpeggio), '1' (Portamento Up), '2' (Portamento Down), 'C' (Set Volume), 'F' (Set Tempo/Speed)
  effectVal: number | null;    // Effect value, 0 to 255 (stored as number, displayed as Hex)
  period?: number | null;      // Raw 12-bit Amiga Period from MOD file
}

export interface TrackerPattern {
  id: number;
  name: string;
  length: number;              // default 64 steps
  // channels[channelIndex][stepIndex]
  channels: TrackerStep[][];
}

export type SidWaveformType = 'pulse' | 'saw' | 'triangle' | 'noise' | 'pulsesaw' | 'pulsetri';
export type SidFilterType = 'none' | 'lowpass' | 'bandpass' | 'highpass' | 'notch';

export interface SidInstrumentConfig {
  waveform: SidWaveformType;
  pulseWidth: number;       // 0 to 4095 (or 0% to 100%)
  pwmSpeed: number;         // LFO Speed (0 to 20 Hz)
  pwmDepth: number;         // LFO Depth (0% to 100%)
  attack: number;           // 0 to 15 (SID hardware ADSR rate)
  decay: number;            // 0 to 15 (SID hardware ADSR rate)
  sustain: number;          // 0 to 15 (SID hardware ADSR level)
  release: number;          // 0 to 15 (SID hardware ADSR rate)
  filterEnabled: boolean;
  filterType: SidFilterType;
  filterCutoff: number;     // 0 to 2047
  filterResonance: number;  // 0 to 15
  hardSync: boolean;
  ringMod: boolean;
  arpMacro?: number[];      // Semitone offsets e.g. [0, 3, 7, 12] or [0, 4, 7, 11]
  arpSpeed?: number;        // Speed in ticks (1 to 16)
}

export interface SidInstrumentPack {
  format: 'SYN-TRACKER-SIDPACK';
  version: 1;
  name: string;
  author: string;
  description?: string;
  instruments: {
    slot?: number;
    name: string;
    baseNote: number;
    volume?: number;
    config: SidInstrumentConfig;
  }[];
}

export type RetroChipSystem = 'c64' | 'gameboy' | 'nes' | 'megadrive' | 'amiga' | 'trk';

export function getAllowedChannelsForSystem(system?: string | null): number[] {
  switch (system) {
    case 'c64':
      return [3];
    case 'gameboy':
    case 'nes':
    case 'megadrive':
      return [4];
    case 'amiga':
      return [4, 8];
    case 'trk':
    default:
      return [4, 8, 16];
  }
}

export interface TrackerSample {
  id: number;
  name: string;
  filename: string;
  buffer: AudioBuffer | null;  // Loaded AudioBuffer (client-only, transient)
  base64Data?: string;         // Base64 encoded audio data (for saving/loading songs)
  volume: number;              // 0 to 64 (default 64)
  panning: number;             // -1.0 (Left) to 1.0 (Right), default 0.0
  loopEnabled: boolean;
  loopStart: number;           // sample frame or percentage
  loopEnd: number;
  baseNote: number;            // MIDI note number where playrate is 1.0 (default 36 = C-2)
  finetune?: number;           // Amiga ProTracker finetune: -8 to +7 (default 0)
  attack?: number;             // ADSR Attack time in seconds (0.001 to 2.0)
  decay?: number;              // ADSR Decay time in seconds (0.01 to 2.0)
  sustain?: number;            // ADSR Sustain level (0.0 to 1.0)
  release?: number;            // ADSR Release time in seconds (0.01 to 3.0)
  sourceType?: 'upload' | 'synth'; // 'upload' audio sample
  synthType?: string;
  isAmigaModSample?: boolean;
  sidConfig?: SidInstrumentConfig;
}

export interface TrackerSong {
  name: string;
  artist?: string;             // Artist / Composer Name (e.g. "Captain", "Dr. Awesome", "SYN-Artist")
  album?: string;              // Album / Release Name
  year?: string;               // Release Year
  genre?: string;              // Music Genre (e.g. "Chiptune", "Demoscene", "Tracker Synth")
  coverArt?: string;           // Base64 / Data URL of high-res cover art (PNG/JPEG)
  bpm: number;                 // Beats per minute (e.g., 125)
  speed: number;               // Ticks per line (default 6)
  channelsCount: number;       // Number of tracks (default 4, up to 8)
  patterns: TrackerPattern[];
  orderList: number[];         // List of pattern IDs to play in sequence
  samples: TrackerSample[];
  system?: RetroChipSystem;    // Active retro chip architecture ('c64' | 'gameboy' | 'nes' | 'megadrive' | 'amiga' | 'trk')
}

export interface LocalSavedSongMeta {
  id: string;
  name: string;
  updatedAt: string;
  patternCount: number;
  channelsCount: number;
}
