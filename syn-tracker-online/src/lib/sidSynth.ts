/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SidInstrumentConfig, SidInstrumentPack, TrackerSample } from '../types';
import { audioBufferToBase64Wav } from './chipPresets';

// SID hardware ADSR tables (C64 MOS 6581/8580 specification in milliseconds)
export const SID_ATTACK_TIMES_MS = [2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1000, 3000, 5000, 8000];
export const SID_DECAY_RELEASE_TIMES_MS = [6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000, 24000];

// PAL C64 SID Clock constant (985248.4 Hz)
export const PAL_SID_CLOCK = 985248.4;

/**
 * Calculates 16-bit SID frequency register value for a given Hz
 */
export function hzToSidFreq(hz: number): number {
  return Math.max(0, Math.min(65535, Math.round((hz * 16777216) / PAL_SID_CLOCK)));
}

/**
 * Calculates Hz from 16-bit SID frequency register
 */
export function sidFreqToHz(freq: number): number {
  return (freq * PAL_SID_CLOCK) / 16777216;
}

/**
 * Default SID instrument configuration
 */
export const DEFAULT_SID_CONFIG: SidInstrumentConfig = {
  waveform: 'pulse',
  pulseWidth: 2048, // 50% square wave (0-4095)
  pwmSpeed: 3.5,    // 3.5 Hz LFO
  pwmDepth: 35,     // 35% modulation depth
  attack: 0,        // 2ms instant attack
  decay: 6,         // ~200ms decay
  sustain: 12,      // 80% sustain level
  release: 5,       // ~168ms release
  filterEnabled: false,
  filterType: 'lowpass',
  filterCutoff: 1024, // 50% cutoff
  filterResonance: 4, // Moderate resonance (0-15)
  hardSync: false,
  ringMod: false,
};

/**
 * Curated list of classic Commodore 64 SID Instrument presets
 */
export const SID_PRESET_LIBRARY: {
  id: string;
  name: string;
  category: 'Leads' | 'Bass' | 'Arpeggio' | 'Pads' | 'Percussion' | 'SFX';
  baseNote: number;
  config: SidInstrumentConfig;
}[] = [
  {
    id: 'sid_hubbard_lead',
    name: 'Rob Hubbard PWM Lead',
    category: 'Leads',
    baseNote: 60, // C-4
    config: {
      waveform: 'pulse',
      pulseWidth: 2048,
      pwmSpeed: 4.2,
      pwmDepth: 40,
      attack: 0,
      decay: 8,
      sustain: 14,
      release: 6,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 1500,
      filterResonance: 5,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_galway_lead',
    name: 'Martin Galway Saw Lead',
    category: 'Leads',
    baseNote: 60,
    config: {
      waveform: 'saw',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 1,
      decay: 6,
      sustain: 15,
      release: 5,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 1350,
      filterResonance: 8,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_sync_solo',
    name: 'C64 Hard Sync Lead',
    category: 'Leads',
    baseNote: 60,
    config: {
      waveform: 'saw',
      pulseWidth: 2048,
      pwmSpeed: 2.0,
      pwmDepth: 25,
      attack: 0,
      decay: 5,
      sustain: 15,
      release: 4,
      filterEnabled: false,
      filterType: 'none',
      filterCutoff: 1024,
      filterResonance: 0,
      hardSync: true,
      ringMod: false,
    }
  },
  {
    id: 'sid_ring_bell',
    name: 'SID Ring Mod Bell',
    category: 'Leads',
    baseNote: 60,
    config: {
      waveform: 'triangle',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 7,
      sustain: 8,
      release: 8,
      filterEnabled: false,
      filterType: 'none',
      filterCutoff: 1024,
      filterResonance: 0,
      hardSync: false,
      ringMod: true,
    }
  },
  {
    id: 'sid_6581_acid_bass',
    name: '6581 Resonant Acid Bass',
    category: 'Bass',
    baseNote: 36, // C-2
    config: {
      waveform: 'saw',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 4,
      sustain: 0,
      release: 3,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 650,
      filterResonance: 12,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_slap_bass',
    name: 'SID Snappy Slap Bass',
    category: 'Bass',
    baseNote: 36,
    config: {
      waveform: 'pulse',
      pulseWidth: 1024, // 25% pulse
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 5,
      sustain: 4,
      release: 4,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 850,
      filterResonance: 6,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_sub_tri_bass',
    name: 'SID Warm Sub Bass',
    category: 'Bass',
    baseNote: 36,
    config: {
      waveform: 'triangle',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 1,
      decay: 7,
      sustain: 15,
      release: 5,
      filterEnabled: false,
      filterType: 'none',
      filterCutoff: 1024,
      filterResonance: 0,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_tel_maj9_arp',
    name: 'Jeroen Tel Maj9 Arp',
    category: 'Arpeggio',
    baseNote: 60,
    config: {
      waveform: 'pulse',
      pulseWidth: 2048,
      pwmSpeed: 5.0,
      pwmDepth: 30,
      attack: 0,
      decay: 7,
      sustain: 0,
      release: 6,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 1600,
      filterResonance: 4,
      hardSync: false,
      ringMod: false,
      arpMacro: [0, 4, 7, 11, 14],
      arpSpeed: 2,
    }
  },
  {
    id: 'sid_min7_chord_arp',
    name: 'C64 Minor 7th Fast Arp',
    category: 'Arpeggio',
    baseNote: 60,
    config: {
      waveform: 'saw',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 8,
      sustain: 0,
      release: 7,
      filterEnabled: false,
      filterType: 'none',
      filterCutoff: 1024,
      filterResonance: 0,
      hardSync: false,
      ringMod: false,
      arpMacro: [0, 3, 7, 10, 12],
      arpSpeed: 2,
    }
  },
  {
    id: 'sid_pwm_string_pad',
    name: 'SID PWM Ensemble Pad',
    category: 'Pads',
    baseNote: 60,
    config: {
      waveform: 'pulse',
      pulseWidth: 2048,
      pwmSpeed: 1.8,
      pwmDepth: 45,
      attack: 7,
      decay: 9,
      sustain: 15,
      release: 8,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 1400,
      filterResonance: 3,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_reso_kick',
    name: 'SID Resonant 808 Kick',
    category: 'Percussion',
    baseNote: 48,
    config: {
      waveform: 'triangle',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 5,
      sustain: 0,
      release: 4,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 400,
      filterResonance: 14,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_noise_snare',
    name: 'C64 Noise Snare Drum',
    category: 'Percussion',
    baseNote: 60,
    config: {
      waveform: 'noise',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 5,
      sustain: 0,
      release: 4,
      filterEnabled: true,
      filterType: 'bandpass',
      filterCutoff: 1200,
      filterResonance: 6,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_closed_hihat',
    name: 'SID Closed 23-Bit Hat',
    category: 'Percussion',
    baseNote: 60,
    config: {
      waveform: 'noise',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 2,
      sustain: 0,
      release: 2,
      filterEnabled: true,
      filterType: 'highpass',
      filterCutoff: 1800,
      filterResonance: 3,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_crash_cymbal',
    name: 'SID Open Crash Cymbal',
    category: 'Percussion',
    baseNote: 60,
    config: {
      waveform: 'noise',
      pulseWidth: 2048,
      pwmSpeed: 0,
      pwmDepth: 0,
      attack: 0,
      decay: 8,
      sustain: 0,
      release: 8,
      filterEnabled: true,
      filterType: 'highpass',
      filterCutoff: 1600,
      filterResonance: 2,
      hardSync: false,
      ringMod: false,
    }
  },
  {
    id: 'sid_laser_zap',
    name: 'C64 Arcade Laser SFX',
    category: 'SFX',
    baseNote: 60,
    config: {
      waveform: 'pulse',
      pulseWidth: 1024,
      pwmSpeed: 10.0,
      pwmDepth: 50,
      attack: 0,
      decay: 4,
      sustain: 0,
      release: 3,
      filterEnabled: true,
      filterType: 'lowpass',
      filterCutoff: 1900,
      filterResonance: 10,
      hardSync: false,
      ringMod: false,
    }
  }
];

/**
 * Synthesize audio data from a SID configuration
 */
export function synthesizeSidSound(
  config: SidInstrumentConfig,
  baseNote = 60,
  sampleRate = 44100
): {
  samples: Float32Array;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
} {
  // Determine if this is a sustaining tone or a one-shot percussive hit
  const isOneShot = config.waveform === 'noise' || !!config.arpMacro;
  
  // Calculate duration
  const attackSec = (SID_ATTACK_TIMES_MS[Math.min(15, Math.max(0, config.attack))] || 2) / 1000;
  const decaySec = (SID_DECAY_RELEASE_TIMES_MS[Math.min(15, Math.max(0, config.decay))] || 6) / 1000;
  const releaseSec = (SID_DECAY_RELEASE_TIMES_MS[Math.min(15, Math.max(0, config.release))] || 6) / 1000;

  // Base frequency from MIDI note
  const baseFreq = 440 * Math.pow(2, (baseNote - 69) / 12);
  
  let totalDuration: number;
  let loopEnabled = false;
  let loopStart = 0;
  let loopEnd = 0;

  if (isOneShot) {
    totalDuration = Math.min(3.5, Math.max(0.6, attackSec + decaySec + (config.arpMacro ? 0.8 : 0.4)));
  } else {
    // For looping leads/pads/basses, generate a generous buffer with seamless loop
    const lfoPeriod = config.pwmSpeed > 0.1 ? (1.0 / config.pwmSpeed) : 0.5;
    const wavePeriod = 1.0 / baseFreq;
    const minSustainDuration = Math.max(1.0, Math.min(2.5, lfoPeriod * 3));
    
    // Fit exact cycles
    const numCycles = Math.max(6, Math.round(minSustainDuration / wavePeriod));
    totalDuration = numCycles * wavePeriod;
    loopEnabled = true;
    loopStart = 0;
    loopEnd = Math.round(totalDuration * sampleRate);
  }

  const totalSamples = Math.round(totalDuration * sampleRate);
  const data = new Float32Array(totalSamples);

  // 23-bit SID Galois LFSR register for noise
  let sidLfsr = 0x7ffff8;

  // State Variable Filter variables (Chamberlin SVF)
  let svfLow = 0;
  let svfBand = 0;
  
  // Cutoff calculation: C64 SID filter ~60Hz to ~14kHz
  const normCutoff = Math.max(0, Math.min(1, config.filterCutoff / 2047));
  const filterFreq = 60 * Math.pow(14000 / 60, normCutoff);
  const svfF = Math.min(0.95, 2 * Math.sin((Math.PI * filterFreq) / sampleRate));
  const svfQ = Math.max(0.15, 1.0 - (config.filterResonance / 15) * 0.85);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    
    // Pitch calculation (handles Arp macros & Drum pitch sweeps)
    let currentFreq = baseFreq;
    if (config.arpMacro && config.arpMacro.length > 0) {
      const stepTime = 1.0 / (50 / Math.max(1, config.arpSpeed || 2));
      const arpStep = Math.floor(t / stepTime) % config.arpMacro.length;
      const semitoneOffset = config.arpMacro[arpStep];
      currentFreq = baseFreq * Math.pow(2, semitoneOffset / 12);
    }

    // Phase calculation
    let phase = (t * currentFreq) % 1.0;

    // Hard Sync & Ring Mod calculation
    if (config.hardSync) {
      const syncPhase = (t * currentFreq * 2.75) % 1.0;
      phase = syncPhase;
    }

    // Dynamic Pulse Width & PWM LFO
    const basePw = config.pulseWidth / 4095; // 0.0 to 1.0
    const lfoMod = config.pwmSpeed > 0.05 
      ? (Math.sin(2 * Math.PI * config.pwmSpeed * t) * (config.pwmDepth / 200))
      : 0;
    const currentPw = Math.max(0.05, Math.min(0.95, basePw + lfoMod));

    // Raw Waveform generation
    let rawWave = 0;
    switch (config.waveform) {
      case 'pulse': {
        rawWave = phase < currentPw ? 0.85 : -0.85;
        break;
      }
      case 'saw': {
        rawWave = 2.0 * phase - 1.0;
        break;
      }
      case 'triangle': {
        rawWave = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
        break;
      }
      case 'noise': {
        // Clock SID 23-bit LFSR at audio rate
        const bit = ((sidLfsr >> 22) ^ (sidLfsr >> 17)) & 1;
        sidLfsr = ((sidLfsr << 1) | bit) & 0x7fffff;
        rawWave = ((sidLfsr & 0xff) / 127.5) - 1.0;
        break;
      }
      case 'pulsesaw': {
        const p = phase < currentPw ? 0.85 : -0.85;
        const s = 2.0 * phase - 1.0;
        rawWave = (p * 0.5 + s * 0.5) * 0.9;
        break;
      }
      case 'pulsetri': {
        const p = phase < currentPw ? 0.85 : -0.85;
        const tri = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
        rawWave = (p * 0.5 + tri * 0.5) * 0.9;
        break;
      }
    }

    // Ring Modulation
    if (config.ringMod) {
      const ringCarrier = Math.sin(2 * Math.PI * (currentFreq * 2.414) * t);
      rawWave = rawWave * ringCarrier;
    }

    // ADSR Envelope
    let env = 1.0;
    if (isOneShot) {
      if (t < attackSec) {
        env = t / Math.max(0.001, attackSec);
      } else {
        const decayProgress = (t - attackSec) / Math.max(0.01, decaySec);
        env = Math.exp(-3.5 * decayProgress);
      }
    }

    let processed = rawWave * env;

    // SID Multi-mode Filter (Lowpass, Bandpass, Highpass, Notch)
    if (config.filterEnabled && config.filterType !== 'none') {
      const high = processed - svfLow - svfQ * svfBand;
      svfBand += svfF * high;
      svfLow += svfF * svfBand;
      const notch = high + svfLow;

      switch (config.filterType) {
        case 'lowpass':
          processed = svfLow;
          break;
        case 'bandpass':
          processed = svfBand * 1.5;
          break;
        case 'highpass':
          processed = high;
          break;
        case 'notch':
          processed = notch;
          break;
      }
    }

    if (isNaN(processed) || !isFinite(processed)) {
      processed = 0;
      svfLow = 0;
      svfBand = 0;
    }

    // Soft saturation clipping
    data[i] = Math.max(-1, Math.min(1, processed * 0.9));
  }

  return {
    samples: data,
    loopStart,
    loopEnd: loopEnabled ? loopEnd : totalSamples,
    loopEnabled,
  };
}

/**
 * Creates a TrackerSample object from a SID Instrument Configuration
 */
export function createSampleFromSidConfig(
  audioCtx: AudioContext,
  name: string,
  config: SidInstrumentConfig,
  baseNote = 60,
  slotIndex = 0
): TrackerSample {
  const sr = audioCtx.sampleRate || 44100;
  const { samples, loopStart, loopEnd, loopEnabled } = synthesizeSidSound(config, baseNote, sr);

  const buffer = audioCtx.createBuffer(1, samples.length, sr);
  buffer.getChannelData(0).set(samples);

  const base64Data = audioBufferToBase64Wav(buffer);

  const attackSec = (SID_ATTACK_TIMES_MS[Math.min(15, Math.max(0, config.attack))] || 2) / 1000;
  const decaySec = (SID_DECAY_RELEASE_TIMES_MS[Math.min(15, Math.max(0, config.decay))] || 6) / 1000;
  const sustainLevel = Math.max(0.08, Math.min(1.0, config.sustain / 15));
  const releaseSec = (SID_DECAY_RELEASE_TIMES_MS[Math.min(15, Math.max(0, config.release))] || 6) / 1000;

  return {
    id: slotIndex,
    name: name.slice(0, 22),
    filename: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`,
    buffer,
    base64Data,
    volume: 64,
    panning: 0.0,
    loopEnabled,
    loopStart,
    loopEnd,
    baseNote,
    attack: attackSec,
    decay: decaySec,
    sustain: sustainLevel,
    release: releaseSec,
    sourceType: 'synth',
    synthType: 'SID-6581',
    sidConfig: { ...config },
  };
}

/**
 * Exports SID Instruments to a .sidpack JSON structure
 */
export function exportSidPack(
  name: string,
  author: string,
  description: string,
  samples: TrackerSample[]
): SidInstrumentPack {
  const instruments = samples
    .map((s, idx) => {
      if (!s.sidConfig && (!s.name || s.name === 'Empty')) return null;
      return {
        slot: idx,
        name: s.name || `SID Inst ${idx + 1}`,
        baseNote: s.baseNote || 60,
        volume: s.volume ?? 64,
        config: s.sidConfig || DEFAULT_SID_CONFIG,
      };
    })
    .filter(Boolean) as SidInstrumentPack['instruments'];

  return {
    format: 'SYN-TRACKER-SIDPACK',
    version: 1,
    name: name || 'Custom SID Soundbank',
    author: author || 'C64 Composer',
    description,
    instruments,
  };
}

/**
 * Triggers browser download for a .sidpack file
 */
export function downloadSidPack(pack: SidInstrumentPack, filename?: string) {
  const jsonStr = JSON.stringify(pack, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || pack.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.sidpack`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses a .sidpack JSON string
 */
export function parseSidPack(jsonText: string): SidInstrumentPack {
  const parsed = JSON.parse(jsonText);
  if (parsed.format !== 'SYN-TRACKER-SIDPACK') {
    throw new Error('Invalid SID Pack format (missing SYN-TRACKER-SIDPACK tag)');
  }
  return parsed as SidInstrumentPack;
}
