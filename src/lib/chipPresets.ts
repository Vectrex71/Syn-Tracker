/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSample } from '../types';

/**
 * Converts a Float32Array channel to a valid WAV ArrayBuffer and returns base64.
 */
export function audioBufferToBase64Wav(buffer: AudioBuffer): string {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM audio data
  let offset = 44;
  for (let i = 0; i < data.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, data[i]));
    const intSample = s < 0 ? Math.floor(s * 0x8000) : Math.floor(s * 0x7fff);
    view.setInt16(offset, intSample, true);
  }

  // Convert to Base64 safely in 8KB chunks
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// ==========================================
// VINTAGE CHIPTUNE DSP SOUND ENGINE
// Complete 16-Instrument Sound Sets for:
// - GameBoy (LR35902 APU)
// - Commodore 64 (MOS SID 6581/8580)
// - Sega Mega Drive (Yamaha YM2612 FM + Texas SN76489 PSG)
// - NES / Famicom (Ricoh 2A03 / RP2A07)
// ==========================================

export type ChipSystemType = 'GameBoy' | 'Commodore 64' | 'Sega Mega Drive' | 'NES / Famicom';
export type ChipKitType = 'gameboy' | 'c64' | 'megadrive' | 'nes';

export interface ChipInstrumentDefinition {
  id: string;
  name: string;
  category: ChipSystemType;
  description: string;
  baseNote: number; // MIDI base note (e.g. 60 = C-4, 48 = C-3, 36 = C-2)
  loopEnabled: boolean;
  generator: (sampleRate: number) => {
    samples: Float32Array;
    loopStart: number;
    loopEnd: number;
  };
}

/**
 * Helper to generate an exact integral number of waveform cycles for seamless looping
 */
function makeSeamlessLoop(
  sr: number,
  freq: number,
  minDuration: number,
  waveFunc: (t: number, phase: number) => number
): { samples: Float32Array; loopStart: number; loopEnd: number } {
  const periodSamples = sr / freq;
  const numCycles = Math.max(2, Math.round((sr * minDuration) / periodSamples));
  const totalLen = Math.round(numCycles * periodSamples);
  const data = new Float32Array(totalLen);
  for (let i = 0; i < totalLen; i++) {
    const t = i / sr;
    const phase = ((i * freq) / sr) % 1.0;
    data[i] = waveFunc(t, phase);
  }
  return { samples: data, loopStart: 0, loopEnd: totalLen };
}

export const CHIP_INSTRUMENTS: Record<string, ChipInstrumentDefinition> = {
  // ==========================================
  // GAMEBOY DMG (LR35902) INSTRUMENTS (16 INSTRUMENTS)
  // ==========================================
  'gb_pulse_25': {
    id: 'gb_pulse_25',
    name: 'GB Pulse 25%',
    category: 'GameBoy',
    description: 'Classic 8-bit GameBoy melody lead (25% duty cycle)',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.25 ? 0.85 : -0.85));
    }
  },
  'gb_pulse_12': {
    id: 'gb_pulse_12',
    name: 'GB Pulse 12.5%',
    category: 'GameBoy',
    description: 'Sharp, piercing 12.5% duty cycle pulse wave for high leads',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.125 ? 0.85 : -0.85));
    }
  },
  'gb_pulse_50': {
    id: 'gb_pulse_50',
    name: 'GB Pulse 50%',
    category: 'GameBoy',
    description: 'Warm, hollow 50% square wave for backing chords & pads',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.5 ? 0.85 : -0.85));
    }
  },
  'gb_wave_ram_bass': {
    id: 'gb_wave_ram_bass',
    name: 'GB Wave RAM Bass',
    category: 'GameBoy',
    description: 'Authentic 4-bit 16-sample quantized DMG wavetable slap bass',
    baseNote: 48,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 130.8128;
      const table = [0, 2, 5, 8, 12, 14, 15, 15, 14, 11, 7, 4, 2, 1, 0, 0].map(v => (v / 7.5) - 1.0);
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const stepIdx = Math.floor(phase * 16);
        return table[stepIdx % 16] * 0.9;
      });
    }
  },
  'gb_wave_sub': {
    id: 'gb_wave_sub',
    name: 'GB Wave Sub',
    category: 'GameBoy',
    description: 'Deep 4-bit smooth sine/triangle wave RAM sub bass',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      const table = [0, 1, 3, 6, 9, 12, 14, 15, 15, 14, 12, 9, 6, 3, 1, 0].map(v => (v / 7.5) - 1.0);
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const stepIdx = Math.floor(phase * 16);
        return table[stepIdx % 16] * 0.95;
      });
    }
  },
  'gb_maj_arp': {
    id: 'gb_maj_arp',
    name: 'GB Major Arp',
    category: 'GameBoy',
    description: 'Rapid 3-note cyclic major arpeggiator chord with crisp decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const arpSpeed = 35;
      const duration = 0.75;
      const len = Math.round(duration * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.2599, 1.4983];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 3;
        const phase = (t * (rootFreq * intervals[step])) % 1.0;
        const pulse = phase < 0.25 ? 0.85 : -0.85;
        const decayEnv = Math.exp(-3.2 * t);
        data[i] = pulse * decayEnv;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_min_arp': {
    id: 'gb_min_arp',
    name: 'GB Minor Arp',
    category: 'GameBoy',
    description: 'Moody 4-note cyclic minor arpeggio with smooth decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const arpSpeed = 40;
      const duration = 0.8;
      const len = Math.round(duration * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.1892, 1.4983, 2.0];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 4;
        const phase = (t * (rootFreq * intervals[step])) % 1.0;
        const pulse = phase < 0.5 ? 0.85 : -0.85;
        const decayEnv = Math.exp(-3.0 * t);
        data[i] = pulse * decayEnv;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_vib_lead': {
    id: 'gb_vib_lead',
    name: 'GB Vibrato Lead',
    category: 'GameBoy',
    description: 'Heroic melodic pulse lead with delayed software pitch vibrato',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      const len = Math.floor(sr * 1.0);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const vib = Math.sin(2 * Math.PI * 5.5 * t) * (freq * 0.035);
        const curFreq = freq + vib;
        const phase = (t * curFreq) % 1.0;
        data[i] = phase < 0.25 ? 0.85 : -0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  // PERCUSSION: GameBoy
  'gb_kick_drum': {
    id: 'gb_kick_drum',
    name: 'GB 8-Bit Kick',
    category: 'GameBoy',
    description: 'Punchy pitch-dropping square wave kick drum with deep sub thump',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.45);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 180 * Math.exp(-14 * t) + 42;
        const env = Math.exp(-6.0 * t);
        const phase = (t * freq) % 1.0;
        const wave = phase < 0.5 ? 0.85 : -0.85;
        const sub = Math.sin(2 * Math.PI * freq * t) * 0.45;
        data[i] = (wave * 0.65 + sub) * env;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_punch_kick': {
    id: 'gb_punch_kick',
    name: 'GB Punch Kick',
    category: 'GameBoy',
    description: 'Fast acoustic-transient DMG kick with snappy top click',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.35);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 320 * Math.exp(-24 * t) + 45;
        const env = Math.exp(-8.0 * t);
        const phase = (t * freq) % 1.0;
        const click = Math.random() > 0.5 ? 0.4 : -0.4;
        data[i] = ((phase < 0.5 ? 0.85 : -0.85) * 0.8 + (t < 0.02 ? click : 0)) * env;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_lfsr_snare': {
    id: 'gb_lfsr_snare',
    name: 'GB Noise Snare',
    category: 'GameBoy',
    description: 'Crunchy 15-bit LFSR noise decay burst with punchy tonal body',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.45);
      const data = new Float32Array(len);
      let lfsr = 0x7fff;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-7.5 * t);
        const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
        lfsr = (lfsr >> 1) | (bit << 14);
        const noiseVal = (lfsr & 1) ? 0.85 : -0.85;
        const tone = Math.sin(2 * Math.PI * (220 * Math.exp(-22 * t) + 90) * t) * Math.exp(-12 * t);
        data[i] = (noiseVal * 0.65 + tone * 0.5) * env * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_crisp_snare': {
    id: 'gb_crisp_snare',
    name: 'GB Crisp Snare',
    category: 'GameBoy',
    description: 'Tight 7-bit periodic noise crack snare drum',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.32);
      const data = new Float32Array(len);
      let lfsr = 0x7f;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-11.0 * t);
        const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
        lfsr = (lfsr >> 1) | (bit << 6);
        const noiseVal = (lfsr & 1) ? 0.9 : -0.9;
        const tone = Math.sin(2 * Math.PI * (340 * Math.exp(-30 * t) + 120) * t);
        data[i] = (noiseVal * 0.75 + tone * 0.35) * env;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_lfsr_hat': {
    id: 'gb_lfsr_hat',
    name: 'GB Closed HiHat',
    category: 'GameBoy',
    description: 'Crisp 7-bit LFSR pseudo-random noise tick for 8-bit closed hi-hat',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.15);
      const data = new Float32Array(len);
      let lfsr = 0x7f;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-32.0 * t);
        const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
        lfsr = (lfsr >> 1) | (bit << 6);
        const noiseVal = (lfsr & 1) ? 0.9 : -0.9;
        data[i] = noiseVal * env;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_open_hat': {
    id: 'gb_open_hat',
    name: 'GB Open HiHat',
    category: 'GameBoy',
    description: 'Sustained 15-bit LFSR open hi-hat / cymbal sizzle',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.55);
      const data = new Float32Array(len);
      let lfsr = 0x7fff;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-6.0 * t);
        const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
        lfsr = (lfsr >> 1) | (bit << 14);
        const noiseVal = (lfsr & 1) ? 0.85 : -0.85;
        data[i] = noiseVal * env * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_tom_pulse': {
    id: 'gb_tom_pulse',
    name: 'GB Synth Tom',
    category: 'GameBoy',
    description: 'Pitch-swept melodic synth tom for fills and groove accents',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.38);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 240 * Math.exp(-10 * t) + 60;
        const env = Math.exp(-7.0 * t);
        const phase = (t * freq) % 1.0;
        data[i] = (phase < 0.5 ? 0.85 : -0.85) * env;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'gb_laser_fx': {
    id: 'gb_laser_fx',
    name: 'GB Laser FX',
    category: 'GameBoy',
    description: 'Iconic arcade down-sweep laser and power-up SFX',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.40);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 2200 * Math.exp(-18 * t) + 100;
        const env = Math.exp(-6.5 * t);
        const phase = (t * freq) % 1.0;
        data[i] = (phase < 0.25 ? 0.85 : -0.85) * env;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },

  // ==========================================
  // COMMODORE 64 (SID 6581/8580) (16 INSTRUMENTS)
  // ==========================================
  'sid_pwm_lead': {
    id: 'sid_pwm_lead',
    name: 'SID PWM Lead',
    category: 'Commodore 64',
    description: 'Lush dynamic pulse-width modulation with animated LFO',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const lfoFreq = 4.0;
      const lfoCycles = 4;
      const duration = lfoCycles / lfoFreq;
      const freq = 261.6256;
      const periodSamples = sr / freq;
      const numCycles = Math.round((sr * duration) / periodSamples);
      const len = Math.round(numCycles * periodSamples);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const lfoPhase = (i / len) * 2 * Math.PI * lfoCycles;
        const pwm = 0.5 + 0.35 * Math.sin(lfoPhase);
        const phase = (i % periodSamples) / periodSamples;
        data[i] = (phase < pwm ? 0.85 : -0.85);
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_saw_lead': {
    id: 'sid_saw_lead',
    name: 'SID Saw Lead',
    category: 'Commodore 64',
    description: 'Warm analog-filtered SID sawtooth with subtle sub-harmonic',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (t, phase) => {
        const saw = 2.0 * phase - 1.0;
        const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25;
        return (saw * 0.75 + sub) * 0.9;
      });
    }
  },
  'sid_galway_arp': {
    id: 'sid_galway_arp',
    name: 'SID Galway Arp',
    category: 'Commodore 64',
    description: 'Legendary Martin Galway minor chord arpeggio (Minor 7th) with crisp decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const arpSpeed = 45;
      const duration = 0.75;
      const len = Math.round(duration * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.1892, 1.4983, 2.0];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 4;
        const currentFreq = rootFreq * intervals[step];
        const pwm = 0.5 + 0.25 * Math.sin(2 * Math.PI * 6.0 * t);
        const phase = (t * currentFreq) % 1.0;
        const pulse = phase < pwm ? 0.85 : -0.85;
        const decayEnv = Math.exp(-3.2 * t);
        data[i] = pulse * decayEnv;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_hubbard_arp': {
    id: 'sid_hubbard_arp',
    name: 'SID Hubbard Arp',
    category: 'Commodore 64',
    description: 'Rob Hubbard signature major 9th rapid cycling arpeggiator with snappy decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const arpSpeed = 50;
      const duration = 0.75;
      const len = Math.round(duration * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.2599, 1.4983, 1.8877]; // Maj9
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 4;
        const currentFreq = rootFreq * intervals[step];
        const phase = (t * currentFreq) % 1.0;
        const saw = 2.0 * phase - 1.0;
        const decayEnv = Math.exp(-3.4 * t);
        data[i] = saw * decayEnv * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_resonant_bass': {
    id: 'sid_resonant_bass',
    name: 'SID 6581 Bass',
    category: 'Commodore 64',
    description: 'Punchy low-end resonant lowpass filtered C64 bass',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const fundamental = Math.sin(2 * Math.PI * phase);
        const h2 = Math.sin(4 * Math.PI * phase) * 0.45;
        const h3 = Math.sin(6 * Math.PI * phase) * 0.35;
        const sub = Math.sin(Math.PI * phase) * 0.4;
        return (fundamental * 0.7 + h2 + h3 + sub) * 0.75;
      });
    }
  },
  'sid_slap_bass': {
    id: 'sid_slap_bass',
    name: 'SID Slap Bass',
    category: 'Commodore 64',
    description: 'Sharp biting SID pulse bass with fast filter envelope',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const pulse = phase < 0.3 ? 0.85 : -0.85;
        const resonance = Math.sin(10 * Math.PI * phase) * 0.3;
        return (pulse * 0.75 + resonance) * 0.85;
      });
    }
  },
  'sid_ring_mod': {
    id: 'sid_ring_mod',
    name: 'SID Ring Mod Bell',
    category: 'Commodore 64',
    description: 'Metallic, crystalline ring-modulated SID bell lead',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const carrierFreq = 261.6256;
      const modRatio = 2.4142;
      return makeSeamlessLoop(sr, carrierFreq, 0.8, (t, phase) => {
        const carrier = 2.0 * phase - 1.0;
        const mod = Math.sin(2 * Math.PI * (carrierFreq * modRatio) * t);
        return carrier * mod * 0.85;
      });
    }
  },
  'sid_sync_lead': {
    id: 'sid_sync_lead',
    name: 'SID Hard Sync',
    category: 'Commodore 64',
    description: 'Aggressive hard-sync harmonic tearing solo lead',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const masterFreq = 261.6256;
      const slaveRatio = 2.75;
      return makeSeamlessLoop(sr, masterFreq, 0.8, (_t, phase) => {
        const slavePhase = (phase * slaveRatio) % 1.0;
        return (2.0 * slavePhase - 1.0) * 0.85;
      });
    }
  },
  'sid_sub_bass': {
    id: 'sid_sub_bass',
    name: 'SID Sub Bass',
    category: 'Commodore 64',
    description: 'Deep, round triangle sub bass with analog SID warmth',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const tri = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
        const sin = Math.sin(2 * Math.PI * phase) * 0.5;
        return (tri * 0.7 + sin) * 0.85;
      });
    }
  },
  // PERCUSSION: Commodore 64
  'sid_reso_kick': {
    id: 'sid_reso_kick',
    name: 'SID Thump Kick',
    category: 'Commodore 64',
    description: 'Resonant lowpass swept SID kick with analog low-end punch',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.45);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 200 * Math.exp(-15 * t) + 40;
        const triPhase = (t * freq) % 1.0;
        const tri = 2.0 * Math.abs(2.0 * triPhase - 1.0) - 1.0;
        const sub = Math.sin(2 * Math.PI * freq * t) * 0.5;
        data[i] = (tri * 0.6 + sub) * Math.exp(-5.5 * t) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_acoustic_snare': {
    id: 'sid_acoustic_snare',
    name: 'SID Acoustic Snare',
    category: 'Commodore 64',
    description: 'Classic C64 mixed waveform snare combining triangle body and white noise',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.42);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1) * Math.exp(-9.0 * t);
        const tone = Math.sin(2 * Math.PI * (240 * Math.exp(-20 * t) + 85) * t) * Math.exp(-14 * t);
        data[i] = (noise * 0.65 + tone * 0.5) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_laser_snare': {
    id: 'sid_laser_snare',
    name: 'SID Laser Snare',
    category: 'Commodore 64',
    description: 'High-speed pitch sweep and noise burst hybrid snare',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.40);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1) * Math.exp(-10.0 * t);
        const laser = Math.sin(2 * Math.PI * (600 * Math.exp(-30 * t) + 120) * t) * Math.exp(-12 * t);
        data[i] = (noise * 0.6 + laser * 0.6) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_closed_hat': {
    id: 'sid_closed_hat',
    name: 'SID Closed Hat',
    category: 'Commodore 64',
    description: 'Filtered highpass SID noise tick for tight rhythmic hi-hats',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.16);
      const data = new Float32Array(len);
      let lastVal = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const rawNoise = Math.random() * 2 - 1;
        const hpNoise = rawNoise - lastVal * 0.7;
        lastVal = rawNoise;
        data[i] = hpNoise * Math.exp(-28 * t) * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_open_cymbal': {
    id: 'sid_open_cymbal',
    name: 'SID Open Cymbal',
    category: 'Commodore 64',
    description: 'Sizzling SID noise crash cymbal with long decaying metallic resonance',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.75);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1);
        const metallic = Math.sin(2 * Math.PI * 4200 * t) * 0.2 + Math.sin(2 * Math.PI * 6800 * t) * 0.2;
        data[i] = (noise * 0.7 + metallic) * Math.exp(-4.5 * t) * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_syn_tom': {
    id: 'sid_syn_tom',
    name: 'SID SynTom',
    category: 'Commodore 64',
    description: 'Classic 80s pitch-dropping synth tom drum for fills',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.40);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 280 * Math.exp(-12 * t) + 55;
        const tone = Math.sin(2 * Math.PI * freq * t);
        data[i] = tone * Math.exp(-7.0 * t) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'sid_zap_fx': {
    id: 'sid_zap_fx',
    name: 'SID Zap Noise FX',
    category: 'Commodore 64',
    description: 'Sci-fi electro zap laser effect',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.35);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 1900 * Math.exp(-22 * t) + 150;
        const wave = Math.sin(2 * Math.PI * freq * t);
        data[i] = wave * Math.exp(-7.5 * t);
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },

  // ==========================================
  // SEGA MEGA DRIVE (YM2612 FM / PSG) (16 INSTRUMENTS)
  // ==========================================
  'ym_lately_bass': {
    id: 'ym_lately_bass',
    name: 'Lately Bass (FM)',
    category: 'Sega Mega Drive',
    description: 'The definitive 90s Sega FM Lately Bass (Sonic, Streets of Rage)',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      return makeSeamlessLoop(sr, freq, 0.8, (t, phase) => {
        const modFreq = freq * 2.0;
        const modIndex = 2.8;
        const mod = Math.sin(2 * Math.PI * modFreq * t) * modIndex;
        const carrier = Math.sin(2 * Math.PI * freq * t + mod);
        const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.4;
        return (carrier * 0.75 + sub) * 0.85;
      });
    }
  },
  'ym_slap_fm_bass': {
    id: 'ym_slap_fm_bass',
    name: 'YM FM Slap Bass',
    category: 'Sega Mega Drive',
    description: 'Bright 4-OP FM slap bass with crisp percussive transient',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      return makeSeamlessLoop(sr, freq, 0.8, (t, _phase) => {
        const mod1 = Math.sin(2 * Math.PI * (freq * 3.0) * t) * 2.2;
        const mod2 = Math.sin(2 * Math.PI * (freq * 1.0) * t + mod1) * 1.5;
        const carrier = Math.sin(2 * Math.PI * freq * t + mod2);
        return carrier * 0.85;
      });
    }
  },
  'ym_crystal_bell': {
    id: 'ym_crystal_bell',
    name: 'Crystal FM Bell',
    category: 'Sega Mega Drive',
    description: 'Iconic 16-bit shimmering FM glass bell with inharmonic partials',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const carrierFreq = 261.6256;
      return makeSeamlessLoop(sr, carrierFreq, 0.8, (t, _phase) => {
        const modRatio = 3.5;
        const mod = Math.sin(2 * Math.PI * (carrierFreq * modRatio) * t) * 1.6;
        return Math.sin(2 * Math.PI * carrierFreq * t + mod) * 0.85;
      });
    }
  },
  'ym_synth_brass': {
    id: 'ym_synth_brass',
    name: 'Arcade FM Brass',
    category: 'Sega Mega Drive',
    description: 'Punchy 16-bit arcade synth brass with rich sawtooth warmth',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (t, _phase) => {
        const mod = Math.sin(2 * Math.PI * freq * t) * 1.8;
        const op1 = Math.sin(2 * Math.PI * freq * t + mod);
        const op2 = Math.sin(2 * Math.PI * (freq * 2.0) * t + mod * 0.5) * 0.5;
        return (op1 + op2) * 0.65;
      });
    }
  },
  'ym_organ_stab': {
    id: 'ym_organ_stab',
    name: 'FM Organ Stab',
    category: 'Sega Mega Drive',
    description: 'Funky 16-bit arcade house and rave FM organ chord stab',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (t, _phase) => {
        const f1 = Math.sin(2 * Math.PI * freq * t);
        const f2 = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.7;
        const f3 = Math.sin(2 * Math.PI * (freq * 3) * t) * 0.5;
        const f4 = Math.sin(2 * Math.PI * (freq * 4) * t) * 0.3;
        return (f1 + f2 + f3 + f4) * 0.45;
      });
    }
  },
  'ym_fm_pluck': {
    id: 'ym_fm_pluck',
    name: 'FM Pluck Synth',
    category: 'Sega Mega Drive',
    description: 'Crisp percussive FM plucked synth for fast lead sequences',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (t, _phase) => {
        const mod = Math.sin(2 * Math.PI * (freq * 4.0) * t) * 2.0;
        return Math.sin(2 * Math.PI * freq * t + mod) * 0.85;
      });
    }
  },
  'ym_scifi_lead': {
    id: 'ym_scifi_lead',
    name: 'YM Sci-Fi Lead',
    category: 'Sega Mega Drive',
    description: 'Feedback modulated FM cutting lead synth',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (t, _phase) => {
        const feedback = Math.sin(2 * Math.PI * freq * t) * 1.5;
        return Math.sin(2 * Math.PI * freq * t + feedback) * 0.85;
      });
    }
  },
  'psg_square_lead': {
    id: 'psg_square_lead',
    name: 'PSG Square Lead',
    category: 'Sega Mega Drive',
    description: 'Texas Instruments SN76489 pure square wave pulse lead',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.5 ? 0.85 : -0.85));
    }
  },
  'psg_pulse_arp': {
    id: 'psg_pulse_arp',
    name: 'PSG Fast Arp',
    category: 'Sega Mega Drive',
    description: 'Rapid 3-note cyclic PSG chord arpeggio with crisp decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const arpSpeed = 40;
      const duration = 0.75;
      const len = Math.round(duration * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.2599, 1.4983];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 3;
        const phase = (t * (rootFreq * intervals[step])) % 1.0;
        const pulse = phase < 0.5 ? 0.85 : -0.85;
        const decayEnv = Math.exp(-3.2 * t);
        data[i] = pulse * decayEnv;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  // PERCUSSION: Sega Mega Drive
  'ym_fm_kick': {
    id: 'ym_fm_kick',
    name: 'FM Punch Kick',
    category: 'Sega Mega Drive',
    description: 'Classic 16-bit FM bass drum with heavy punch & fast transient pitch drop',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.45);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 190 * Math.exp(-16 * t) + 42;
        const mod = Math.sin(2 * Math.PI * (freq * 2) * t) * (3.5 * Math.exp(-25 * t));
        const carrier = Math.sin(2 * Math.PI * freq * t + mod);
        data[i] = carrier * Math.exp(-5.5 * t) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'ym_heavy_sub_kick': {
    id: 'ym_heavy_sub_kick',
    name: 'FM Sub Kick',
    category: 'Sega Mega Drive',
    description: 'Deep FM techno sub kick with massive low-end weight',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.50);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 150 * Math.exp(-12 * t) + 38;
        const mod = Math.sin(2 * Math.PI * freq * t) * (1.8 * Math.exp(-18 * t));
        const carrier = Math.sin(2 * Math.PI * freq * t + mod);
        data[i] = carrier * Math.exp(-4.5 * t) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'ym_metal_snare': {
    id: 'ym_metal_snare',
    name: 'FM Metal Snare',
    category: 'Sega Mega Drive',
    description: 'Industrial 16-bit FM snare drum with metallic rim sound',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.45);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1) * Math.exp(-8.0 * t);
        const fmTone = Math.sin(2 * Math.PI * 340 * t + Math.sin(2 * Math.PI * 820 * t) * 2.5) * Math.exp(-12 * t);
        data[i] = (noise * 0.6 + fmTone * 0.6) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'ym_rimshot_snare': {
    id: 'ym_rimshot_snare',
    name: 'FM Rimshot Snare',
    category: 'Sega Mega Drive',
    description: 'Snappy FM arcade rimshot snare with tight transient snap',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.30);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1) * Math.exp(-15.0 * t);
        const rim = Math.sin(2 * Math.PI * (520 * Math.exp(-35 * t) + 180) * t) * Math.exp(-18 * t);
        data[i] = (noise * 0.5 + rim * 0.75) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'psg_noise_hat': {
    id: 'psg_noise_hat',
    name: 'PSG Closed Hat',
    category: 'Sega Mega Drive',
    description: 'SN76489 periodic noise closed hi-hat tick',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.14);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-35.0 * t) * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'psg_open_crash': {
    id: 'psg_open_crash',
    name: 'PSG Crash Cymbal',
    category: 'Sega Mega Drive',
    description: '16-bit wide frequency PSG white noise crash cymbal',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.70);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-4.8 * t) * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'ym_electric_tom': {
    id: 'ym_electric_tom',
    name: 'FM Electric Tom',
    category: 'Sega Mega Drive',
    description: 'Modulated FM electronic tom drum for arcade rhythm fills',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.40);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 260 * Math.exp(-12 * t) + 65;
        const mod = Math.sin(2 * Math.PI * (freq * 1.5) * t) * (1.2 * Math.exp(-15 * t));
        const tone = Math.sin(2 * Math.PI * freq * t + mod);
        data[i] = tone * Math.exp(-6.5 * t) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },

  // ==========================================
  // NES / FAMICOM (RICOH 2A03) (16 INSTRUMENTS)
  // ==========================================
  'nes_pulse_25': {
    id: 'nes_pulse_25',
    name: 'NES 25% Pulse',
    category: 'NES / Famicom',
    description: 'Authentic 2A03 25% duty cycle pulse lead (Super Mario, Mega Man)',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.25 ? 0.85 : -0.85));
    }
  },
  'nes_pulse_12': {
    id: 'nes_pulse_12',
    name: 'NES 12.5% Pulse',
    category: 'NES / Famicom',
    description: 'Sharp, nasal 12.5% duty cycle 2A03 pulse wave for high melodies',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.125 ? 0.85 : -0.85));
    }
  },
  'nes_pulse_50': {
    id: 'nes_pulse_50',
    name: 'NES 50% Pulse',
    category: 'NES / Famicom',
    description: 'Hollow, deep 50% square wave for counter-melodies & chords',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => (phase < 0.5 ? 0.85 : -0.85));
    }
  },
  'nes_vib_lead': {
    id: 'nes_vib_lead',
    name: 'NES Hero Lead',
    category: 'NES / Famicom',
    description: 'Melodic pulse lead with 2A03 style 6Hz software pitch vibrato',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 261.6256;
      const len = Math.floor(sr * 1.0);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const vib = Math.sin(2 * Math.PI * 6.0 * t) * (freq * 0.03);
        const curFreq = freq + vib;
        const phase = (t * curFreq) % 1.0;
        data[i] = (phase < 0.25 ? 0.85 : -0.85);
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_triangle_bass': {
    id: 'nes_triangle_bass',
    name: 'NES Triangle Bass',
    category: 'NES / Famicom',
    description: 'Stepped 16-level quantized 2A03 triangle channel bass',
    baseNote: 48,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 130.8128;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const rawTri = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
        const quantized = Math.round(rawTri * 7.5) / 7.5;
        return quantized * 0.95;
      });
    }
  },
  'nes_triangle_sub': {
    id: 'nes_triangle_sub',
    name: 'NES Sub Triangle',
    category: 'NES / Famicom',
    description: 'Deep low octave 16-step NES triangle sub bass',
    baseNote: 36,
    loopEnabled: true,
    generator: (sr) => {
      const freq = 65.4064;
      return makeSeamlessLoop(sr, freq, 0.8, (_t, phase) => {
        const rawTri = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
        const quantized = Math.round(rawTri * 7.5) / 7.5;
        return quantized * 0.95;
      });
    }
  },
  'nes_fast_arp': {
    id: 'nes_fast_arp',
    name: 'NES Fast Arp',
    category: 'NES / Famicom',
    description: 'Rapid 3-note cyclic arpeggio with punchy decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const arpSpeed = 35;
      const duration = 0.75;
      const len = Math.round(duration * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.2599, 1.4983];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 3;
        const phase = (t * (rootFreq * intervals[step])) % 1.0;
        const pulse = phase < 0.25 ? 0.85 : -0.85;
        const decayEnv = Math.exp(-3.2 * t);
        data[i] = pulse * decayEnv;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_chord_stab': {
    id: 'nes_chord_stab',
    name: 'NES Chord Stab',
    category: 'NES / Famicom',
    description: 'Classic NES platformer rapid minor 7th chord stab',
    baseNote: 60,
    loopEnabled: true,
    generator: (sr) => {
      const arpSpeed = 40;
      const stepDuration = 1 / arpSpeed;
      const len = Math.round(10 * (stepDuration * 4) * sr);
      const data = new Float32Array(len);
      const rootFreq = 261.6256;
      const intervals = [1.0, 1.1892, 1.4983, 2.0];
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const step = Math.floor(t * arpSpeed) % 4;
        const phase = (t * (rootFreq * intervals[step])) % 1.0;
        data[i] = (phase < 0.5 ? 0.85 : -0.85);
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  // PERCUSSION: NES / Famicom
  'nes_sweep_kick': {
    id: 'nes_sweep_kick',
    name: 'NES Sweep Kick',
    category: 'NES / Famicom',
    description: 'Classic NES triangle channel pitch-dropping kick drum',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.40);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 160 * Math.exp(-15 * t) + 40;
        const triPhase = (t * freq) % 1.0;
        const tri = 2.0 * Math.abs(2.0 * triPhase - 1.0) - 1.0;
        data[i] = tri * Math.exp(-6.0 * t) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_punch_kick': {
    id: 'nes_punch_kick',
    name: 'NES Punch Kick',
    category: 'NES / Famicom',
    description: 'Fast acoustic-feel NES kick with snappy triangle click',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.32);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 280 * Math.exp(-22 * t) + 45;
        const triPhase = (t * freq) % 1.0;
        const tri = 2.0 * Math.abs(2.0 * triPhase - 1.0) - 1.0;
        data[i] = tri * Math.exp(-8.0 * t) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_noise_snare': {
    id: 'nes_noise_snare',
    name: 'NES Long Snare',
    category: 'NES / Famicom',
    description: '2A03 pseudo-random noise channel snare with sustained decay',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.40);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1) * Math.exp(-8.0 * t);
        const tone = Math.sin(2 * Math.PI * (210 * Math.exp(-20 * t) + 85) * t) * Math.exp(-12 * t);
        data[i] = (noise * 0.7 + tone * 0.45) * 0.95;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_tight_snare': {
    id: 'nes_tight_snare',
    name: 'NES Tight Snare',
    category: 'NES / Famicom',
    description: 'Punchy fast-decay 2A03 noise channel snare drum',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.28);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1) * Math.exp(-14.0 * t);
        const tone = Math.sin(2 * Math.PI * (300 * Math.exp(-28 * t) + 110) * t) * Math.exp(-16 * t);
        data[i] = (noise * 0.75 + tone * 0.35) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_noise_hat': {
    id: 'nes_noise_hat',
    name: 'NES Closed Hat',
    category: 'NES / Famicom',
    description: 'Ultra-short 2A03 pseudo-random noise tick for closed hi-hats',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.12);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-38.0 * t) * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_open_crash': {
    id: 'nes_open_crash',
    name: 'NES Crash Cymbal',
    category: 'NES / Famicom',
    description: '2A03 full pseudo-noise crash cymbal with long decaying tail',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.65);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-5.0 * t) * 0.85;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_tri_tom': {
    id: 'nes_tri_tom',
    name: 'NES Triangle Tom',
    category: 'NES / Famicom',
    description: 'Stepped 2A03 pitch-swept triangle tom for rhythmic fills',
    baseNote: 48,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.35);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 250 * Math.exp(-11 * t) + 60;
        const triPhase = (t * freq) % 1.0;
        const tri = 2.0 * Math.abs(2.0 * triPhase - 1.0) - 1.0;
        data[i] = tri * Math.exp(-6.5 * t) * 0.9;
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  },
  'nes_laser_fx': {
    id: 'nes_laser_fx',
    name: 'NES Laser Shot',
    category: 'NES / Famicom',
    description: 'Retro arcade fast down-sweep laser sound effect',
    baseNote: 60,
    loopEnabled: false,
    generator: (sr) => {
      const len = Math.floor(sr * 0.35);
      const data = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const freq = 1800 * Math.exp(-25 * t) + 120;
        const phase = (t * freq) % 1.0;
        const pulse = phase < 0.25 ? 0.85 : -0.85;
        data[i] = pulse * Math.exp(-8.0 * t);
      }
      return { samples: data, loopStart: 0, loopEnd: len };
    }
  }
};

/**
 * Kits grouping 16 complete instruments for full workstation setup
 */
export const CHIP_KITS: {
  id: ChipKitType;
  title: string;
  subtitle: string;
  badge: string;
  iconColor: string;
  instruments: string[];
}[] = [
  {
    id: 'gameboy',
    title: 'GameBoy DMG (LR35902)',
    subtitle: 'Classic 8-Bit Nintendo Pulses, Wave RAM Slap/Sub Bass & Complete LFSR Drum Kit',
    badge: '8-BIT DMG',
    iconColor: '#38bdf8',
    instruments: [
      'gb_pulse_25',
      'gb_pulse_12',
      'gb_pulse_50',
      'gb_wave_ram_bass',
      'gb_wave_sub',
      'gb_maj_arp',
      'gb_min_arp',
      'gb_vib_lead',
      'gb_kick_drum',
      'gb_punch_kick',
      'gb_lfsr_snare',
      'gb_crisp_snare',
      'gb_lfsr_hat',
      'gb_open_hat',
      'gb_tom_pulse',
      'gb_laser_fx'
    ]
  },
  {
    id: 'c64',
    title: 'Commodore 64 (SID 6581/8580)',
    subtitle: 'Dynamic PWM, Rob Hubbard Arps, Resonant Filter Bass & Full SID Analog Drum Set',
    badge: 'C64 SID',
    iconColor: '#38bdf8',
    instruments: [
      'sid_pwm_lead',
      'sid_saw_lead',
      'sid_galway_arp',
      'sid_hubbard_arp',
      'sid_resonant_bass',
      'sid_slap_bass',
      'sid_ring_mod',
      'sid_sync_lead',
      'sid_sub_bass',
      'sid_reso_kick',
      'sid_acoustic_snare',
      'sid_laser_snare',
      'sid_closed_hat',
      'sid_open_cymbal',
      'sid_syn_tom',
      'sid_zap_fx'
    ]
  },
  {
    id: 'megadrive',
    title: 'Sega Mega Drive (YM2612 FM + PSG)',
    subtitle: 'Sonic Lately Bass, 16-Bit Crystal FM Bells, Arcade Brass, FM Drums & PSG Pulses',
    badge: '16-BIT FM',
    iconColor: '#38bdf8',
    instruments: [
      'ym_lately_bass',
      'ym_slap_fm_bass',
      'ym_crystal_bell',
      'ym_synth_brass',
      'ym_organ_stab',
      'ym_fm_pluck',
      'ym_scifi_lead',
      'psg_square_lead',
      'psg_pulse_arp',
      'ym_fm_kick',
      'ym_heavy_sub_kick',
      'ym_metal_snare',
      'ym_rimshot_snare',
      'psg_noise_hat',
      'psg_open_crash',
      'ym_electric_tom'
    ]
  },
  {
    id: 'nes',
    title: 'NES / Famicom (Ricoh 2A03)',
    subtitle: '16-Step Stepped Triangle Bass, 2A03 Pulse Leads, Chord Stabs & Complete Noise Drums',
    badge: '2A03 NES',
    iconColor: '#38bdf8',
    instruments: [
      'nes_pulse_25',
      'nes_pulse_12',
      'nes_pulse_50',
      'nes_vib_lead',
      'nes_triangle_bass',
      'nes_triangle_sub',
      'nes_fast_arp',
      'nes_chord_stab',
      'nes_sweep_kick',
      'nes_punch_kick',
      'nes_noise_snare',
      'nes_tight_snare',
      'nes_noise_hat',
      'nes_open_crash',
      'nes_tri_tom',
      'nes_laser_fx'
    ]
  }
];

export const CHIP_PRESET_KITS: Record<ChipKitType, ChipInstrumentDefinition[]> = {
  gameboy: (CHIP_KITS.find((k) => k.id === 'gameboy')?.instruments || []).map((id) => CHIP_INSTRUMENTS[id]).filter(Boolean),
  c64: (CHIP_KITS.find((k) => k.id === 'c64')?.instruments || []).map((id) => CHIP_INSTRUMENTS[id]).filter(Boolean),
  megadrive: (CHIP_KITS.find((k) => k.id === 'megadrive')?.instruments || []).map((id) => CHIP_INSTRUMENTS[id]).filter(Boolean),
  nes: (CHIP_KITS.find((k) => k.id === 'nes')?.instruments || []).map((id) => CHIP_INSTRUMENTS[id]).filter(Boolean),
};

/**
 * Creates a single TrackerSample object from a Chip Instrument definition.
 */
export function createChipSample(
  audioCtx: AudioContext,
  instDef: ChipInstrumentDefinition,
  slotIndex: number
): TrackerSample {
  const sr = audioCtx.sampleRate || 44100;
  const { samples, loopStart, loopEnd } = instDef.generator(sr);
  
  const buffer = audioCtx.createBuffer(1, samples.length, sr);
  buffer.getChannelData(0).set(samples);
  
  const base64Data = audioBufferToBase64Wav(buffer);

  return {
    id: slotIndex,
    name: instDef.name.slice(0, 20),
    filename: `${instDef.id}.wav`,
    buffer: buffer,
    base64Data: base64Data,
    volume: 64,
    panning: 0.0,
    loopEnabled: instDef.loopEnabled,
    loopStart: loopStart,
    loopEnd: loopEnd,
    baseNote: instDef.baseNote,
    sourceType: 'upload',
  };
}
