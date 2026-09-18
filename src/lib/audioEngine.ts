/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSong, TrackerStep, TrackerSample } from '../types';
import { noteStrToPeriod, getAmigaPeriod } from '../utils/modFormat';

// Constants for note conversion
export const NOTES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];

/**
 * Convert note name (e.g., "C-4", "D#5", "C--4", "OFF") into MIDI note number.
 */
export function noteToMidi(noteStr: string): number {
  if (!noteStr || noteStr === '---' || noteStr === 'OFF') return 0;
  const clean = noteStr.trim().replace('--', '-');
  const match = clean.match(/^([A-G][#-]?)-?(\d+)$/i);
  if (!match) return 0;
  let name = match[1].toUpperCase();
  if (name.length === 1) name += '-';
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTES.indexOf(name);
  if (noteIndex === -1 || isNaN(octave)) return 0;
  return 12 * (octave + 1) + noteIndex;
}

/**
 * Convert MIDI note number back to note string (e.g. 60 -> "C-4")
 */
export function midiToNote(midiNum: number): string {
  if (midiNum < 12 || midiNum > 119) return '---';
  const octave = Math.floor(midiNum / 12) - 1;
  const noteIndex = midiNum % 12;
  return `${NOTES[noteIndex]}${octave}`;
}

// Map MIDI note to oscillator frequency
export function midiToFreq(midiNum: number): number {
  return 440 * Math.pow(2, (midiNum - 69) / 12);
}

/**
 * Calculate playback rate multiplier taking pitch diff and finetune into account.
 * Handles both cents (-100..+100) and Amiga finetune (-8..+7).
 */
export function getPlaybackRate(midiNote: number, baseNote = 60, finetune = 0): number {
  if (baseNote === 48) {
    const noteStr = midiToNote(midiNote);
    const p = getAmigaPeriod(noteStr, finetune);
    return p > 0 ? (214 / p) : 1.0;
  }
  const noteDiff = midiNote - baseNote;
  const finetuneSemitones = Math.abs(finetune) <= 8 ? (finetune / 8) : (finetune / 100);
  return Math.pow(2, (noteDiff + finetuneSemitones) / 12);
}

/**
 * Calculate exact Amiga playback rate from Amiga Period and finetune.
 * Amiga PAL C-3 (Period 214) = 16574 Hz = Rate 1.0
 */
export function getAmigaPlaybackRate(period: number, finetune = 0): number {
  if (period <= 0) return 1.0;
  const finetuneCents = Math.abs(finetune) <= 8 ? (finetune * 12.5) : finetune;
  const finetuneMultiplier = Math.pow(2, finetuneCents / 1200);
  return (214 / period) * finetuneMultiplier;
}

// Simple white noise audio buffer cache
let whiteNoiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (whiteNoiseBuffer) return whiteNoiseBuffer;
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  whiteNoiseBuffer = buffer;
  return buffer;
}

interface ActiveChannelNode {
  source: AudioScheduledSourceNode | null;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  oscType?: string;
  baseFreq?: number;
  startTime: number;
  midiNote: number;
  baseRate?: number;
  basePeriod?: number;
  currentPeriod: number;
  targetPeriod?: number;
  portamentoSpeed: number;     // Effect 3xx parameter memory
  portamentoUpSpeed: number;   // Effect 1xx parameter memory
  portamentoDownSpeed: number; // Effect 2xx parameter memory
  vibratoSpeed: number;        // Effect 4xx speed memory
  vibratoDepth: number;        // Effect 4xx depth memory
  vibratoPos: number;          // Position in vibrato sine table (0..63)
  vibratoWaveform: number;     // 0=sine, 1=ramp down, 2=square
  vibratoNoRetrig: boolean;
  tremoloSpeed: number;        // Effect 7xx speed memory
  tremoloDepth: number;        // Effect 7xx depth memory
  tremoloPos: number;          // Position in tremolo table (0..63)
  tremoloWaveform: number;     // 0=sine, 1=ramp down, 2=square
  tremoloNoRetrig: boolean;
  volumeSlideVal: number;      // Effect Axx memory
  lastSampleOffset: number;    // Effect 9xx memory
  glissando: boolean;          // Effect E3x
  instrumentIndex: number;
  currentVol: number;          // 0..1
  volume64: number;            // ProTracker 0..64 volume scale
  finetune: number;
}

// Standard ProTracker 32-value Sine Table
const PROTRACKER_SINE_TABLE = [
    0,  24,  49,  74,  97, 120, 141, 161, 
  180, 197, 212, 224, 235, 244, 250, 253, 
  255, 253, 250, 244, 235, 224, 212, 197, 
  180, 161, 141, 120,  97,  74,  49,  24
];

function getWaveformValue(pos: number, waveform: number): number {
  const step = pos & 0x1F;
  let val = 0;
  switch (waveform & 0x03) {
    case 0: // Sine
      val = PROTRACKER_SINE_TABLE[step];
      break;
    case 1: // Ramp Down
      val = 255 - ((pos & 0x3F) * 4);
      break;
    case 2: // Square
      val = 255;
      break;
    default:
      val = PROTRACKER_SINE_TABLE[step];
      break;
  }
  return (pos & 0x20) !== 0 ? -val : val;
}

export interface MasterFxSettings {
  delayEnabled: boolean;
  delayTime: number; // in seconds, e.g. 0.25
  delayFeedback: number; // 0..0.9
  delayWet: number; // 0..1
  reverbEnabled: boolean;
  reverbWet: number; // 0..1
  reverbSize: number; // 1..5 seconds
  filterEnabled: boolean;
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  filterCutoff: number; // 20..20000 Hz
  filterResonance: number; // 0..20 Q
  saturationEnabled: boolean;
  saturationDrive: number; // 0..100
  stereoWidth: number; // 0..1
  masterVolume: number; // 0..1
}

export class AudioEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public filterNode: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  public song: TrackerSong | null = null;
  public isPlaying = false;

  // Master FX Chain Nodes
  public delayNode: DelayNode | null = null;
  public delayFeedbackGain: GainNode | null = null;
  public delayWetGain: GainNode | null = null;
  public delayDryGain: GainNode | null = null;

  public reverbConvolver: ConvolverNode | null = null;
  public reverbWetGain: GainNode | null = null;
  public reverbDryGain: GainNode | null = null;

  public saturationNode: WaveShaperNode | null = null;
  public fxBusGain: GainNode | null = null;

  // Channel Mute & Solo
  public mutedChannels: Set<number> = new Set();
  public soloedChannels: Set<number> = new Set();
  public channelAnalysers: { [channel: number]: AnalyserNode } = {};
  public channelGains: { [channel: number]: GainNode } = {};

  // Master FX Settings
  public fxSettings: MasterFxSettings = {
    delayEnabled: false,
    delayTime: 0.25,
    delayFeedback: 0.35,
    delayWet: 0.25,
    reverbEnabled: false,
    reverbWet: 0.20,
    reverbSize: 2.0,
    filterEnabled: false,
    filterType: 'lowpass',
    filterCutoff: 20000,
    filterResonance: 1.0,
    saturationEnabled: false,
    saturationDrive: 15,
    stereoWidth: 0.70,
    masterVolume: 0.85,
  };

  // Amiga hardware options
  public amigaStereoSeparation = 0.70; // 0 = Mono, 0.7 = Classic Amiga stereo width, 1.0 = Hard LRRL
  public enableAmigaFilter = false;    // Amiga Paula hardware lowpass filter
  
  // Timing variables
  private nextStepTime = 0;
  private scheduleAheadTime = 0.20; // 200ms lookahead for rock-solid playback
  private timerId: number | null = null;
  private visualAnimId: number | null = null;
  private scheduledTimeline: Array<{ time: number; orderIndex: number; lineIndex: number }> = [];
  public playbackSessionId = 0;

  // Engine playback state (Decoupled from song object during runtime to prevent race conditions)
  private playbackBpm = 125;
  private playbackSpeed = 6;
  private patternDelayLines = 0;
  
  // Tracking indexes
  public currentOrderIndex = 0;
  public currentLine = 0;
  public currentPlayingOrderIndex = 0;
  public currentPlayingLineIndex = 0;

  // Live recording quantizer state & microsecond-accurate timeline history
  public enableLiveQuantize = true;
  public stepHistory: Array<{
    time: number;
    duration: number;
    orderIndex: number;
    lineIndex: number;
  }> = [];

  // Jump requests from effects (Bxx, Dxx)
  private pendingOrderJump: number | null = null;
  private pendingLineJump: number | null = null;
  
  // Pattern loop playback mode
  public isPatternLoopMode = false;
  
  // Pattern loop variables (E6x effect)
  private patternLoopStartLine: { [channel: number]: number } = {};
  private patternLoopCount: { [channel: number]: number } = {};
  
  // Active nodes mapped by channel, so we can cut or apply effects
  private activeChannelNodes: { [channel: number]: ActiveChannelNode } = {};

  // Dedicated preview voice (independent of track sequencer channels so sample auditioning never cuts off playback)
  private previewSource: AudioScheduledSourceNode | null = null;
  private previewGainNode: GainNode | null = null;
  private previewPanNode: StereoPannerNode | null = null;

  // For visual tracking of step triggers
  private onStepTrigger: (orderIndex: number, lineIndex: number) => void = () => {};

  constructor() {
    // Lazy initialize when user interacts
  }

  public getOrCreateContext(): AudioContext {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx!;
  }

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.fxSettings.masterVolume, this.ctx.currentTime);

      this.fxBusGain = this.ctx.createGain();

      // Setup Filter
      this.filterNode = this.ctx.createBiquadFilter();
      if (this.fxSettings.filterEnabled) {
        this.filterNode.type = this.fxSettings.filterType;
        this.filterNode.frequency.setValueAtTime(this.fxSettings.filterCutoff, this.ctx.currentTime);
        this.filterNode.Q.setValueAtTime(this.fxSettings.filterResonance, this.ctx.currentTime);
      } else if (this.enableAmigaFilter) {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(4800, this.ctx.currentTime);
        this.filterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);
      } else {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);
        this.filterNode.Q.setValueAtTime(0.0001, this.ctx.currentTime);
      }

      // Setup Delay
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.setValueAtTime(this.fxSettings.delayTime, this.ctx.currentTime);
      this.delayFeedbackGain = this.ctx.createGain();
      this.delayFeedbackGain.gain.setValueAtTime(this.fxSettings.delayFeedback, this.ctx.currentTime);
      this.delayWetGain = this.ctx.createGain();
      this.delayWetGain.gain.setValueAtTime(this.fxSettings.delayEnabled ? this.fxSettings.delayWet : 0, this.ctx.currentTime);
      this.delayDryGain = this.ctx.createGain();
      this.delayDryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.delayNode.connect(this.delayFeedbackGain);
      this.delayFeedbackGain.connect(this.delayNode);
      this.delayNode.connect(this.delayWetGain);

      // Setup Reverb Convolver
      this.reverbWetGain = this.ctx.createGain();
      this.reverbWetGain.gain.setValueAtTime(this.fxSettings.reverbEnabled ? this.fxSettings.reverbWet : 0, this.ctx.currentTime);
      this.reverbDryGain = this.ctx.createGain();
      this.reverbDryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Setup Saturation
      this.saturationNode = this.ctx.createWaveShaper();
      this.updateSaturationCurve(this.fxSettings.saturationEnabled ? this.fxSettings.saturationDrive : 0);

      // Master Analyser
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.6;

      // Master FX Routing Graph:
      // Active Channels -> MasterGain -> FxBus -> [Dry + DelayWet + ReverbWet] -> Filter -> Saturation -> Analyser -> Destination
      const masterFxOut = this.ctx.createGain();
      this.fxBusGain.connect(this.delayDryGain);
      this.delayDryGain.connect(masterFxOut);

      this.fxBusGain.connect(this.delayNode);
      this.delayWetGain.connect(masterFxOut);

      // Generate impulse and connect reverb
      this.generateReverbImpulse(this.fxSettings.reverbSize);
      this.reverbWetGain.connect(masterFxOut);

      masterFxOut.connect(this.filterNode);
      this.filterNode.connect(this.saturationNode);
      this.saturationNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.masterGain.connect(this.fxBusGain);
    }
  }

  public updateMasterFx(settings: Partial<MasterFxSettings>) {
    this.init();
    this.fxSettings = { ...this.fxSettings, ...settings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.masterGain && settings.masterVolume !== undefined) {
      this.masterGain.gain.setValueAtTime(settings.masterVolume, now);
    }

    if (this.filterNode) {
      if (this.fxSettings.filterEnabled) {
        this.filterNode.type = this.fxSettings.filterType;
        this.filterNode.frequency.setValueAtTime(this.fxSettings.filterCutoff, now);
        this.filterNode.Q.setValueAtTime(this.fxSettings.filterResonance, now);
      } else if (this.enableAmigaFilter) {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(4800, now);
        this.filterNode.Q.setValueAtTime(1.0, now);
      } else {
        // Transparent bypass
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(20000, now);
        this.filterNode.Q.setValueAtTime(0.0001, now);
      }
    }

    if (this.delayNode && this.delayFeedbackGain && this.delayWetGain) {
      if (settings.delayTime !== undefined) this.delayNode.delayTime.setValueAtTime(settings.delayTime, now);
      if (settings.delayFeedback !== undefined) this.delayFeedbackGain.gain.setValueAtTime(settings.delayFeedback, now);
      if (settings.delayWet !== undefined || settings.delayEnabled !== undefined) {
        this.delayWetGain.gain.setValueAtTime(this.fxSettings.delayEnabled ? this.fxSettings.delayWet : 0, now);
      }
    }

    if (this.reverbWetGain && (settings.reverbWet !== undefined || settings.reverbEnabled !== undefined)) {
      this.reverbWetGain.gain.setValueAtTime(this.fxSettings.reverbEnabled ? this.fxSettings.reverbWet : 0, now);
    }

    if (settings.reverbSize !== undefined) {
      this.generateReverbImpulse(settings.reverbSize);
    }

    if (settings.saturationDrive !== undefined || settings.saturationEnabled !== undefined) {
      this.updateSaturationCurve(this.fxSettings.saturationEnabled ? this.fxSettings.saturationDrive : 0);
    }

    if (settings.stereoWidth !== undefined) {
      this.setStereoSeparation(settings.stereoWidth);
    }
  }

  public getFxSettings(): MasterFxSettings {
    return { ...this.fxSettings };
  }

  public generateReverbImpulse(durationSec: number) {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.max(0.5, Math.min(6, durationSec)));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const env = Math.pow(n / length, 2.5);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    try {
      if (this.reverbConvolver) {
        try {
          if (this.fxBusGain) this.fxBusGain.disconnect(this.reverbConvolver);
          this.reverbConvolver.disconnect();
        } catch (e) {}
      }
      const newConvolver = this.ctx.createConvolver();
      newConvolver.buffer = impulse;
      if (this.fxBusGain && this.reverbWetGain) {
        this.fxBusGain.connect(newConvolver);
        newConvolver.connect(this.reverbWetGain);
      }
      this.reverbConvolver = newConvolver;
    } catch (e) {
      console.warn('Reverb buffer init note:', e);
    }
  }

  public updateSaturationCurve(drive: number) {
    if (!this.saturationNode || !this.ctx) return;
    if (!this.fxSettings.saturationEnabled || drive <= 0) {
      this.saturationNode.curve = null;
      return;
    }

    const n_samples = 4096;
    const curve = new Float32Array(n_samples);
    const amount = drive / 10; // 0..6
    const norm = Math.tanh(1 + amount * 1.5);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = Math.tanh(x * (1 + amount * 1.5)) / norm;
    }
    this.saturationNode.curve = curve;
  }

  public setChannelMute(channelIndex: number, muted: boolean) {
    if (muted) {
      this.mutedChannels.add(channelIndex);
    } else {
      this.mutedChannels.delete(channelIndex);
    }
    this.updateChannelGains();
  }

  public setChannelSolo(channelIndex: number, soloed: boolean) {
    if (soloed) {
      this.soloedChannels.add(channelIndex);
    } else {
      this.soloedChannels.delete(channelIndex);
    }
    this.updateChannelGains();
  }

  public isChannelMuted(channelIndex: number): boolean {
    if (this.soloedChannels.size > 0) {
      return !this.soloedChannels.has(channelIndex);
    }
    return this.mutedChannels.has(channelIndex);
  }

  private updateChannelGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    Object.keys(this.activeChannelNodes).forEach((chStr) => {
      const ch = parseInt(chStr, 10);
      const active = this.activeChannelNodes[ch];
      if (active && this.ctx) {
        const isMuted = this.isChannelMuted(ch);
        active.gainNode.gain.cancelScheduledValues(now);
        if (isMuted) {
          active.gainNode.gain.setValueAtTime(0, now);
        } else {
          const targetVol = (active.volume64 / 64) * 0.38;
          active.gainNode.gain.setValueAtTime(targetVol, now);
        }
      }
    });
  }

  // Get live peak volume (0..1) for channel LED meter
  public getChannelPeak(channelIndex: number): number {
    if (this.isChannelMuted(channelIndex)) {
      return 0;
    }
    const analyser = this.channelAnalysers[channelIndex];
    if (!analyser) return 0;
    const data = new Uint8Array(16);
    analyser.getByteFrequencyData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > max) max = data[i];
    }
    return max / 255;
  }

  // Get real frequency data for a specific channel
  public getChannelFrequencyData(channelIndex: number, dataArray: Uint8Array) {
    if (this.isChannelMuted(channelIndex)) {
      dataArray.fill(0);
      return;
    }
    const analyser = this.channelAnalysers[channelIndex];
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
    } else {
      dataArray.fill(0);
    }
  }

  public setAmigaFilter(enabled: boolean) {
    this.enableAmigaFilter = enabled;
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setValueAtTime(enabled ? 4800 : 20000, this.ctx.currentTime);
    }
  }

  public setStereoSeparation(separation: number) {
    this.amigaStereoSeparation = Math.max(0, Math.min(1, separation));
    this.fxSettings.stereoWidth = this.amigaStereoSeparation;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      Object.keys(this.activeChannelNodes).forEach((chStr) => {
        const ch = parseInt(chStr, 10);
        const active = this.activeChannelNodes[ch];
        if (active && active.panNode) {
          const sample = this.song?.samples[active.instrumentIndex];
          const panVal = (sample && sample.panning !== 0) ? sample.panning : this.getDefaultChannelPan(ch);
          active.panNode.pan.setValueAtTime(panVal, now);
        }
      });
    }
  }

  public getFrequencyData(dataArray?: Uint8Array): Uint8Array {
    const target = dataArray || new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 128);
    if (this.analyser) {
      this.analyser.getByteFrequencyData(target);
    } else {
      target.fill(0);
    }
    return target;
  }

  public getWaveformData(dataArray?: Uint8Array): Uint8Array {
    const target = dataArray || new Uint8Array(this.analyser ? this.analyser.fftSize : 128);
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(target);
    } else {
      target.fill(128);
    }
    return target;
  }

  public setSong(song: TrackerSong) {
    this.song = song;
    if (song.bpm && song.bpm >= 32) {
      this.playbackBpm = song.bpm;
    }
    if (song.speed && song.speed >= 1) {
      this.playbackSpeed = song.speed;
    }
  }

  public setBpm(bpm: number) {
    const validBpm = Math.max(32, Math.min(255, bpm || 125));
    this.playbackBpm = validBpm;
    if (this.song) {
      this.song.bpm = validBpm;
    }
  }

  public setSpeed(speed: number) {
    const validSpeed = Math.max(1, Math.min(32, speed || 6));
    this.playbackSpeed = validSpeed;
    if (this.song) {
      this.song.speed = validSpeed;
    }
  }

  public setOnStepTrigger(callback: (orderIndex: number, lineIndex: number) => void) {
    this.onStepTrigger = callback;
  }

  public onSongEnd: (() => void) | null = null;

  public setOnSongEnd(callback: (() => void) | null) {
    this.onSongEnd = callback;
  }

  public setPatternLoop(enabled: boolean) {
    this.isPatternLoopMode = enabled;
  }

  public isPatternLoop(): boolean {
    return this.isPatternLoopMode;
  }

  public start(startOrderIndex = 0, startLine = 0) {
    this.init();
    if (!this.ctx || !this.song) return;
    
    if (this.isPlaying) {
      this.stop();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.playbackSessionId++;
    this.isPlaying = true;
    this.currentOrderIndex = startOrderIndex;
    this.currentLine = startLine;
    this.currentPlayingOrderIndex = startOrderIndex;
    this.currentPlayingLineIndex = startLine;
    this.pendingOrderJump = null;
    this.pendingLineJump = null;
    this.patternDelayLines = 0;
    this.patternLoopStartLine = {};
    this.patternLoopCount = {};
    this.playbackBpm = this.song.bpm || 125;
    this.playbackSpeed = this.song.speed || 6;
    this.scheduledTimeline = [];
    this.stepHistory = [{
      time: this.ctx.currentTime,
      duration: (this.playbackSpeed * 2.5) / this.playbackBpm,
      orderIndex: startOrderIndex,
      lineIndex: startLine,
    }];
    this.nextStepTime = this.ctx.currentTime + 0.005;

    // Immediately trigger initial position
    this.onStepTrigger(startOrderIndex, startLine);

    // Audio scheduler loop (buffers ahead into Web Audio)
    const runScheduler = () => {
      if (!this.isPlaying) return;
      this.scheduler();
      this.timerId = window.setTimeout(runScheduler, 20);
    };
    runScheduler();

    // High precision Visual Sync loop (60fps rAF matching exact AudioContext time)
    const syncVisuals = () => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      // 20ms optical lead compensation to perfectly align React state dispatch + browser repaint with physical audio transients
      const visualNow = now + 0.020;

      let latest: { orderIndex: number; lineIndex: number } | null = null;
      while (this.scheduledTimeline.length > 0 && this.scheduledTimeline[0].time <= visualNow) {
        latest = this.scheduledTimeline.shift()!;
      }

      if (latest) {
        this.currentPlayingOrderIndex = latest.orderIndex;
        this.currentPlayingLineIndex = latest.lineIndex;
        this.onStepTrigger(latest.orderIndex, latest.lineIndex);
      }

      this.visualAnimId = requestAnimationFrame(syncVisuals);
    };
    this.visualAnimId = requestAnimationFrame(syncVisuals);
  }

  public pause(): { orderIndex: number; lineIndex: number } {
    const pausedOrderIndex = this.currentPlayingOrderIndex;
    const pausedLineIndex = this.currentPlayingLineIndex;
    this.stop();
    return { orderIndex: pausedOrderIndex, lineIndex: pausedLineIndex };
  }

  public stop() {
    this.isPlaying = false;
    this.playbackSessionId++;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.visualAnimId) {
      cancelAnimationFrame(this.visualAnimId);
      this.visualAnimId = null;
    }
    this.scheduledTimeline = [];
    this.stepHistory = [];
    this.currentPlayingLineIndex = 0;
    this.currentLine = 0;
    this.pendingOrderJump = null;
    this.pendingLineJump = null;
    this.patternDelayLines = 0;
    this.patternLoopStartLine = {};
    this.patternLoopCount = {};
    this.allNotesOff();
    try {
      this.onStepTrigger(this.currentOrderIndex, 0);
    } catch (e) {
      // ignore
    }
  }

  public setLiveQuantize(enabled: boolean) {
    this.enableLiveQuantize = enabled;
  }

  /**
   * Calculates the exact quantized pattern step for live recording based on microsecond WebAudio time.
   * If human notes are played slightly early (anticipating the beat) or slightly late, this quantizes
   * to the nearest physical row time.
   */
  public getLiveQuantizedStep(): { orderIndex: number; lineIndex: number } | null {
    if (!this.isPlaying || !this.ctx || this.stepHistory.length === 0) {
      return null;
    }
    const now = this.ctx.currentTime;

    if (!this.enableLiveQuantize) {
      // Find the step currently active (that has triggered and is currently sounding)
      let currentStep = this.stepHistory[0];
      for (let i = 0; i < this.stepHistory.length; i++) {
        const step = this.stepHistory[i];
        if (step.time <= now) {
          currentStep = step;
        } else {
          break;
        }
      }
      return {
        orderIndex: currentStep.orderIndex,
        lineIndex: currentStep.lineIndex,
      };
    }

    // Nearest step quantization: find the step whose start time is closest to now
    let bestStep = this.stepHistory[0];
    let minDistance = Math.abs(now - bestStep.time);

    for (let i = 1; i < this.stepHistory.length; i++) {
      const step = this.stepHistory[i];
      const dist = Math.abs(now - step.time);
      if (dist < minDistance) {
        minDistance = dist;
        bestStep = step;
      }
    }

    return {
      orderIndex: bestStep.orderIndex,
      lineIndex: bestStep.lineIndex,
    };
  }

  public allNotesOff() {
    this.stopPreviewNote();
    Object.keys(this.activeChannelNodes).forEach((chKey) => {
      const ch = parseInt(chKey, 10);
      const chObj = this.activeChannelNodes[ch];
      if (chObj && chObj.source) {
        try {
          chObj.source.stop();
          chObj.source.disconnect();
        } catch (e) {
          // ignore
        }
        chObj.source = null;
      }
    });
    this.activeChannelNodes = {};
  }

  /**
   * Smoothly releases an actively playing preview note without killing sequencer channels or cutting off song tracks.
   */
  public stopPreviewNote() {
    if (!this.ctx || !this.previewSource || !this.previewGainNode) return;
    try {
      const now = this.ctx.currentTime;
      this.previewGainNode.gain.cancelScheduledValues(now);
      this.previewGainNode.gain.setValueAtTime(this.previewGainNode.gain.value, now);
      this.previewGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.previewSource.stop(now + 0.09);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Calculates default panning for a channel in Amiga LRRL mode
   */
  private getDefaultChannelPan(channelIndex: number): number {
    // Amiga 4-channel standard: Ch0 = L, Ch1 = R, Ch2 = R, Ch3 = L
    if (channelIndex % 4 === 0 || channelIndex % 4 === 3) {
      return -0.75 * this.amigaStereoSeparation;
    } else {
      return 0.75 * this.amigaStereoSeparation;
    }
  }

  /**
   * Schedule sound for a specific tracker step at a given time on a given channel.
   */
  private scheduleStep(channelIndex: number, step: TrackerStep, time: number) {
    if (!this.ctx || !this.song || !step) return;

    const hasNote = step.note && step.note !== '---' && step.note !== 'OFF';
    const hasEffect = Boolean(step.effectCode);

    // Fast exit if step has no notes, no commands, and no Key-Off
    if (!hasNote && !hasEffect && step.note !== 'OFF') {
      return;
    }

    // 1. Key Off (OFF) check
    if (step.note === 'OFF') {
      const active = this.activeChannelNodes[channelIndex];
      if (active && active.source) {
        try {
          active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, time);
          active.gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
          active.source.stop(time + 0.04);
        } catch (e) {
          // already stopped
        }
        this.activeChannelNodes[channelIndex].source = null;
      }
      return;
    }

    const effectCodeUpper = step.effectCode ? step.effectCode.toUpperCase() : '';
    const effectVal = step.effectVal ?? 0;
    const isTonePortamento = effectCodeUpper === '3' || effectCodeUpper === '5';

    // Check for Note Delay effect (EDx)
    let noteDelayTicks = 0;
    if (effectCodeUpper === 'E' && ((effectVal >> 4) & 0x0F) === 0x0D) {
      noteDelayTicks = effectVal & 0x0F;
    }

    const tickDuration = 2.5 / this.playbackBpm;
    const noteStartTime = time + (noteDelayTicks * tickDuration);

    const instIdx = (step.instrument !== null) ? step.instrument : 
                    (this.activeChannelNodes[channelIndex]?.instrumentIndex);
    
    // In tracker architecture: a note on an uninitialized channel with no instrument specified does not trigger
    if ((instIdx === undefined || instIdx === null) && step.instrument === null) {
      return;
    }
    const resolvedInstIdx = instIdx ?? 0;
    const sample = this.song.samples[resolvedInstIdx];

    if (!sample) return;

    // Setup or reuse Channel Gain & Pan Nodes
    let active = this.activeChannelNodes[channelIndex];
    if (!active) {
      const gainNode = this.ctx.createGain();
      const panNode = this.ctx.createStereoPanner();
      
      // Setup per-channel analyser for LED VU meters
      let chAnalyser = this.channelAnalysers[channelIndex];
      if (!chAnalyser) {
        chAnalyser = this.ctx.createAnalyser();
        chAnalyser.fftSize = 32;
        chAnalyser.smoothingTimeConstant = 0.6;
        this.channelAnalysers[channelIndex] = chAnalyser;
      }

      gainNode.connect(panNode);
      panNode.connect(chAnalyser);
      chAnalyser.connect(this.masterGain || this.ctx.destination);

      active = {
        source: null,
        gainNode,
        panNode,
        startTime: time,
        midiNote: 60,
        currentPeriod: 214,
        portamentoSpeed: 4,
        portamentoUpSpeed: 4,
        portamentoDownSpeed: 4,
        vibratoSpeed: 4,
        vibratoDepth: 4,
        vibratoPos: 0,
        vibratoWaveform: 0,
        vibratoNoRetrig: false,
        tremoloSpeed: 4,
        tremoloDepth: 4,
        tremoloPos: 0,
        tremoloWaveform: 0,
        tremoloNoRetrig: false,
        volumeSlideVal: 0,
        lastSampleOffset: 0,
        glissando: false,
        instrumentIndex: instIdx,
        currentVol: 1.0,
        volume64: sample.volume,
        finetune: sample.finetune,
      };
      this.activeChannelNodes[channelIndex] = active;
    }

    // Cancel old scheduled automation from previous rows
    active.gainNode.gain.cancelScheduledValues(time);
    active.panNode.pan.cancelScheduledValues(time);

    // Update volume64 scale based on step input
    if (step.volume !== null) {
      active.volume64 = Math.min(64, Math.max(0, step.volume));
    } else if (step.instrument !== null) {
      // ProTracker Rule: Volume is reset to sample default when an explicit instrument number is provided
      active.volume64 = sample.volume;
      active.finetune = sample.finetune;
      active.instrumentIndex = instIdx;
    }

    const isMuted = this.isChannelMuted(channelIndex);
    const targetVolume = isMuted ? 0 : (active.volume64 / 64) * 0.38;

    // Update gain if note, volume, instrument or Effect C is present
    if (hasNote || step.volume !== null || step.instrument !== null || effectCodeUpper === 'C') {
      active.currentVol = targetVolume;
      if (sample.sourceType === 'synth') {
        const attack = Math.max(0.001, sample.attack ?? 0.003);
        const decay = Math.max(0.005, sample.decay ?? 0.15);
        const sustain = Math.max(0.0, Math.min(1.0, sample.sustain ?? 0.85));
        const sustainGain = targetVolume * sustain;

        if (hasNote) {
          active.gainNode.gain.cancelScheduledValues(noteStartTime);
          active.gainNode.gain.setValueAtTime(0.0001, noteStartTime);
          active.gainNode.gain.linearRampToValueAtTime(targetVolume, noteStartTime + attack);
          active.gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainGain), noteStartTime + attack + decay);
        } else {
          active.gainNode.gain.setValueAtTime(targetVolume, time);
        }
      } else {
        // Amiga PCM Sample: Instant transparent Paula volume level
        active.gainNode.gain.cancelScheduledValues(noteStartTime);
        active.gainNode.gain.setValueAtTime(targetVolume, noteStartTime);
      }
    }
    
    // Pan: Use step/sample custom panning or default Amiga channel panning
    const panVal = sample.panning !== 0 ? sample.panning : this.getDefaultChannelPan(channelIndex);
    active.panNode.pan.setValueAtTime(panVal, time);

    if (hasNote) {
      const midiNote = noteToMidi(step.note!);
      const newPeriod = (step.period && step.period > 0) ? step.period : noteStrToPeriod(step.note!);

      // Reset vibrato & tremolo phase on new note unless no-retrig is active
      if (!isTonePortamento) {
        if (!active.vibratoNoRetrig) active.vibratoPos = 0;
        if (!active.tremoloNoRetrig) active.tremoloPos = 0;
      }

      // If Tone Portamento (3xx or 5xx) and channel is already playing, glide to targetPeriod without restarting note
      if (isTonePortamento && active.source) {
        if (newPeriod > 0) active.targetPeriod = newPeriod;
      } else {
        // Standard note trigger: update period and restart sample/synth
        active.midiNote = midiNote;
        if (newPeriod > 0) {
          active.currentPeriod = newPeriod;
          active.targetPeriod = newPeriod;
        }

        const baseRate = (newPeriod > 0 && (sample.isAmigaModSample || sample.baseNote === 48))
          ? (214 / newPeriod)
          : getPlaybackRate(midiNote, sample.baseNote || 60, sample.finetune || 0);
        active.baseRate = baseRate;
        active.basePeriod = newPeriod > 0 ? newPeriod : 428;

        // Cleanly stop any currently playing source on this channel
        if (active.source) {
          try {
            active.source.stop(noteStartTime);
          } catch (e) {
            // already stopped
          }
          active.source = null;
        }

        let sourceNode: AudioScheduledSourceNode | null = null;

        if (sample.buffer) {
          // Play real audio buffer (uploaded samples or generated chip synthesizer DSP buffers)
          const bufSource = this.ctx.createBufferSource();
          bufSource.buffer = sample.buffer;
          
          if (sample.loopEnabled) {
            bufSource.loop = true;
            const sRate = sample.buffer.sampleRate;
            const dur = sample.buffer.duration;
            const lStart = Math.max(0, sample.loopStart / sRate);
            let lEnd = sample.loopEnd / sRate;
            if (lEnd > dur || lEnd <= 0) lEnd = dur;
            if (lEnd > lStart) {
              bufSource.loopStart = lStart;
              bufSource.loopEnd = lEnd;
            }
          }

          bufSource.playbackRate.setValueAtTime(baseRate, noteStartTime);

          // Handle Sample Offset (Effect 9xx)
          let startOffset = 0;
          if (effectCodeUpper === '9') {
            if (effectVal > 0) active.lastSampleOffset = effectVal * 256;
            const sRate = sample.buffer.sampleRate;
            startOffset = active.lastSampleOffset / sRate;
            if (startOffset >= sample.buffer.duration) startOffset = 0;
          }

          bufSource.connect(active.gainNode);
          bufSource.start(noteStartTime, startOffset);
          sourceNode = bufSource;
        } else if (sample.sourceType === 'synth') {
          const type = sample.synthType || 'square';
          if (type === 'noise') {
            const noiseBuffer = getNoiseBuffer(this.ctx);
            const noiseSource = this.ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.loop = true;
            const rateMultiplier = getPlaybackRate(midiNote, sample.baseNote || 60, sample.finetune || 0);
            noiseSource.playbackRate.setValueAtTime(rateMultiplier, noteStartTime);
            sourceNode = noiseSource;
          } else {
            const safeOscType = (['sine', 'square', 'sawtooth', 'triangle'].includes(type) ? type : 'square') as OscillatorType;
            const osc = this.ctx.createOscillator();
            osc.type = safeOscType;
            const freq = midiToFreq(midiNote);
            osc.frequency.setValueAtTime(freq, noteStartTime);
            sourceNode = osc;
            active.oscType = safeOscType;
            active.baseFreq = freq;
          }

          sourceNode.connect(active.gainNode);
          sourceNode.start(noteStartTime);
        }

        if (sourceNode) {
          sourceNode.onended = () => {
            try {
              sourceNode?.disconnect();
            } catch (e) {}
          };
          active.source = sourceNode;
          active.startTime = noteStartTime;
        }
      }
    } else if (active.source) {
      // ProTracker Standard: Tick 0 restores Paula period to active.currentPeriod for existing notes
      const baseP = active.basePeriod || 428;
      const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, active.finetune || 0);
      if (active.source instanceof AudioBufferSourceNode) {
        const normalRate = baseR * (baseP / Math.max(1, active.currentPeriod));
        active.source.playbackRate.setValueAtTime(normalRate, time);
      } else if (active.oscType && active.oscType !== 'noise') {
        const normalFreq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
        (active.source as OscillatorNode).frequency.setValueAtTime(normalFreq, time);
      }
    }

    // Apply Effects & Continuous Commands
    if (step.effectCode) {
      this.applyEffect(channelIndex, step.effectCode, step.effectVal ?? 0, time);
    }
  }

  /**
   * Play a note instantly on a specific sample (useful for previewing, clicking keys)
   * Runs in a dedicated preview voice pipeline that NEVER interferes with sequencer track playback.
   */
  public playNoteInstantly(midiNote: number, sample: TrackerSample, channelIndex = 0) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Stop and disconnect any previous preview note before starting new one
    if (this.previewSource) {
      try {
        this.previewSource.stop();
        this.previewSource.disconnect();
      } catch (e) {
        // ignore
      }
      this.previewSource = null;
    }

    const volume = (sample.volume / 64) * 0.38;
    const gainNode = this.ctx.createGain();
    const panNode = this.ctx.createStereoPanner();
    
    // Route preview through channel analyser for visualizer animation
    const targetChannel = (channelIndex >= 0 && channelIndex < 8) ? channelIndex : 0;
    let chAnalyser = this.channelAnalysers[targetChannel];
    if (!chAnalyser) {
      chAnalyser = this.ctx.createAnalyser();
      chAnalyser.fftSize = 64;
      chAnalyser.smoothingTimeConstant = 0.5;
      this.channelAnalysers[targetChannel] = chAnalyser;
    }

    gainNode.connect(panNode);
    panNode.connect(chAnalyser);
    chAnalyser.connect(this.masterGain || this.ctx.destination);
    
    panNode.pan.setValueAtTime(sample.panning, this.ctx.currentTime);

    let sourceNode: AudioScheduledSourceNode | null = null;
    const now = this.ctx.currentTime;
    
    // Musical, crisp tracker audition duration:
    // Looped waveforms (C64 SID, GameBoy, NES, MegaDrive) audition at a punchy ~0.75s note instead of droning on for seconds
    let previewDuration = 0.75;

    const attack = Math.min(0.08, Math.max(0.001, sample.attack ?? 0.003));
    const decay = Math.min(0.20, Math.max(0.005, sample.decay ?? 0.12));
    const sustain = Math.max(0.0, Math.min(1.0, sample.sustain ?? 0.75));
    const release = Math.min(0.12, Math.max(0.01, sample.release ?? 0.08));

    if (sample.buffer) {
      const bufSource = this.ctx.createBufferSource();
      bufSource.buffer = sample.buffer;
      bufSource.loop = sample.loopEnabled;
      if (sample.loopEnabled) {
        const sRate = sample.buffer.sampleRate;
        const dur = sample.buffer.duration;
        const lStart = Math.max(0, sample.loopStart / sRate);
        let lEnd = sample.loopEnd / sRate;
        if (lEnd > dur || lEnd <= 0) lEnd = dur;
        if (lEnd > lStart) {
          bufSource.loopStart = lStart;
          bufSource.loopEnd = lEnd;
        }
        previewDuration = 0.75;
      } else {
        const rawDur = sample.buffer.duration / Math.max(0.05, getPlaybackRate(midiNote, sample.baseNote || 60, sample.finetune || 0));
        previewDuration = Math.min(1.8, Math.max(0.3, rawDur));
      }
      
      const rateMultiplier = getPlaybackRate(midiNote, sample.baseNote || 60, sample.finetune || 0);
      bufSource.playbackRate.setValueAtTime(rateMultiplier, now);
      sourceNode = bufSource;
    } else if (sample.sourceType === 'synth') {
      const type = sample.synthType || 'square';
      if (type === 'noise') {
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = getNoiseBuffer(this.ctx);
        const rateMultiplier = getPlaybackRate(midiNote, sample.baseNote || 60, sample.finetune || 0);
        noiseSource.playbackRate.setValueAtTime(rateMultiplier, now);
        sourceNode = noiseSource;
      } else {
        const safeOscType = (['sine', 'square', 'sawtooth', 'triangle'].includes(type) ? type : 'square') as OscillatorType;
        const osc = this.ctx.createOscillator();
        osc.type = safeOscType;
        osc.frequency.setValueAtTime(midiToFreq(midiNote), now);
        sourceNode = osc;
      }
      previewDuration = 0.75;
    }

    if (sourceNode) {
      // Crisp ADSR Envelope
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + attack);
      
      const effectiveSustain = Math.max(0.15, sustain);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * effectiveSustain), now + attack + decay);

      const releaseStart = Math.max(now + attack + decay + 0.05, now + previewDuration - release);
      gainNode.gain.setValueAtTime(Math.max(0.0001, volume * effectiveSustain), releaseStart);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release);

      sourceNode.connect(gainNode);
      sourceNode.start(now);
      
      const cleanupPreviewNodes = () => {
        try { sourceNode?.disconnect(); } catch (e) {}
        try { gainNode.disconnect(); } catch (e) {}
        try { panNode.disconnect(); } catch (e) {}
      };
      sourceNode.onended = cleanupPreviewNodes;

      try {
        sourceNode.stop(releaseStart + release + 0.02);
      } catch (e) {}

      this.previewSource = sourceNode;
      this.previewGainNode = gainNode;
      this.previewPanNode = panNode;
    }
  }

  public stopChannelNote(channelIndex: number) {
    if (!this.ctx) return;
    const active = this.activeChannelNodes[channelIndex];
    if (active && active.source) {
      const now = this.ctx.currentTime;
      try {
        active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
        active.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        active.source.stop(now + 0.04);
      } catch (e) {}
      active.source = null;
    }
  }

  /**
   * Core Audio Scheduler
   */
  private scheduler() {
    if (!this.ctx || !this.song) return;

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      const patternId = this.song.orderList[this.currentOrderIndex];
      const pattern = this.song.patterns.find(p => p.id === patternId);

      if (pattern) {
        const triggerTime = this.nextStepTime;
        const triggerOrderIndex = this.currentOrderIndex;
        const triggerLine = this.currentLine;

        // Push scheduled event to frame-accurate timeline queue
        this.scheduledTimeline.push({
          time: triggerTime,
          orderIndex: triggerOrderIndex,
          lineIndex: triggerLine,
        });

        // Record into sliding history window for live recording quantization
        this.stepHistory.push({
          time: triggerTime,
          duration: (this.playbackSpeed * 2.5) / this.playbackBpm,
          orderIndex: triggerOrderIndex,
          lineIndex: triggerLine,
        });

        // Pre-scan row for global speed/tempo (Fxx) and delay (EEx) so all channels execute synchronously
        const playChannelsCount = Math.min(this.song.channelsCount, pattern.channels ? pattern.channels.length : 0);
        for (let ch = 0; ch < playChannelsCount; ch++) {
          const chan = pattern.channels[ch];
          const step = Array.isArray(chan) ? chan[this.currentLine] : (chan as unknown as { steps?: TrackerStep[] })?.steps?.[this.currentLine];
          if (step?.effectCode) {
            const code = step.effectCode.toUpperCase();
            const val = step.effectVal ?? 0;
            if (code === 'F') {
              if (val >= 32) {
                this.playbackBpm = val;
              } else if (val > 0) {
                this.playbackSpeed = val;
              }
            } else if (code === 'E' && ((val >> 4) & 0x0F) === 0x0E) {
              this.patternDelayLines = val & 0x0F;
            }
          }
        }

        for (let ch = 0; ch < playChannelsCount; ch++) {
          const chan = pattern.channels[ch];
          const step = Array.isArray(chan) ? chan[this.currentLine] : (chan as unknown as { steps?: TrackerStep[] })?.steps?.[this.currentLine];
          if (step) {
            this.scheduleStep(ch, step, triggerTime);
          }
        }
      }

      // Move tracker clock forward with exact tempo for this row
      const tickDuration = 2.5 / this.playbackBpm;
      const speedMultiplier = 1 + this.patternDelayLines;
      const lineDuration = this.playbackSpeed * tickDuration * speedMultiplier;
      this.patternDelayLines = 0; // Reset pattern delay for next line
      
      this.nextStepTime += lineDuration;

      // Clean old history beyond 3 seconds in the past to keep memory lean
      if (this.ctx && this.stepHistory.length > 80) {
        const audioTime = this.ctx.currentTime;
        this.stepHistory = this.stepHistory.filter(s => s.time >= audioTime - 2.5 && s.time <= audioTime + 3.0);
      }

      // Handle pattern jump / break effects if requested
      if (this.pendingOrderJump !== null) {
        this.currentOrderIndex = Math.min(this.pendingOrderJump, this.song.orderList.length - 1);
        this.currentLine = this.pendingLineJump ?? 0;
        this.pendingOrderJump = null;
        this.pendingLineJump = null;
      } else {
        this.currentLine++;
        const maxLines = pattern ? pattern.length : 64;
        if (this.currentLine >= maxLines) {
          this.currentLine = 0;
          if (!this.isPatternLoopMode) {
            this.currentOrderIndex++;
            if (this.currentOrderIndex >= this.song.orderList.length) {
              this.currentOrderIndex = 0; // Loop song
              if (this.onSongEnd) {
                try {
                  this.onSongEnd();
                } catch (e) {
                  console.error('Error in onSongEnd callback:', e);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Apply all classic SoundTracker & ProTracker effects.
   */
  private applyEffect(channelIndex: number, code: string, val: number, time: number) {
    if (!this.ctx || !this.song) return;
    const active = this.activeChannelNodes[channelIndex];
    if (!active) return;

    const sample = this.song.samples[active.instrumentIndex];
    const finetune = active.finetune ?? sample?.finetune ?? 0;
    const isAmigaSample = sample?.baseNote === 48;

    const tickDuration = 2.5 / this.playbackBpm;
    const totalTicks = Math.max(1, this.playbackSpeed);

    const codeUpper = code.toUpperCase();

    switch (codeUpper) {
      case '0': { // Arpeggio (0xy)
        const note1 = (val >> 4) & 0x0F;
        const note2 = val & 0x0F;
        if (note1 === 0 && note2 === 0) break;
        if (!active.source) break;

        const baseP = active.basePeriod || 428;
        const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);

        for (let tick = 0; tick < totalTicks; tick++) {
          const tickTime = time + (tick * tickDuration);
          let semitoneOffset = 0;
          if (tick % 3 === 1) semitoneOffset = note1;
          else if (tick % 3 === 2) semitoneOffset = note2;

          if (active.oscType && active.oscType !== 'noise') {
            const freq = midiToFreq(active.midiNote + semitoneOffset);
            (active.source as OscillatorNode).frequency.setValueAtTime(freq, tickTime);
          } else if (active.source instanceof AudioBufferSourceNode) {
            const rateMultiplier = (sample.isAmigaModSample || sample.baseNote === 48)
              ? getAmigaPlaybackRate(getAmigaPeriod(midiToNote(active.midiNote + semitoneOffset), finetune), finetune)
              : getPlaybackRate(active.midiNote + semitoneOffset, sample?.baseNote ?? 60, finetune);
            active.source.playbackRate.setValueAtTime(rateMultiplier, tickTime);
          }
        }

        // Return pitch to base period after ticks complete
        const resetTime = time + (totalTicks * tickDuration);
        if (active.oscType && active.oscType !== 'noise') {
          const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
          (active.source as OscillatorNode).frequency.setValueAtTime(freq, resetTime);
        } else if (active.source instanceof AudioBufferSourceNode) {
          const normalRate = baseR * (baseP / Math.max(1, active.currentPeriod));
          active.source.playbackRate.setValueAtTime(normalRate, resetTime);
        }
        break;
      }

      case '1': { // Portamento Up (1xx)
        if (val > 0) active.portamentoUpSpeed = val;
        const speed = active.portamentoUpSpeed;
        if (!active.source) break;

        const baseP = active.basePeriod || 428;
        const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);

        for (let tick = 1; tick < totalTicks; tick++) {
          const tickTime = time + (tick * tickDuration);
          active.currentPeriod = Math.max(113, active.currentPeriod - speed);

          if (active.oscType && active.oscType !== 'noise') {
            const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
            (active.source as OscillatorNode).frequency.setValueAtTime(freq, tickTime);
          } else if (active.source instanceof AudioBufferSourceNode) {
            const rate = baseR * (baseP / Math.max(1, active.currentPeriod));
            active.source.playbackRate.setValueAtTime(rate, tickTime);
          }
        }
        break;
      }

      case '2': { // Portamento Down (2xx)
        if (val > 0) active.portamentoDownSpeed = val;
        const speed = active.portamentoDownSpeed;
        if (!active.source) break;

        const baseP = active.basePeriod || 428;
        const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);

        for (let tick = 1; tick < totalTicks; tick++) {
          const tickTime = time + (tick * tickDuration);
          active.currentPeriod = Math.min(856, active.currentPeriod + speed);

          if (active.oscType && active.oscType !== 'noise') {
            const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
            (active.source as OscillatorNode).frequency.setValueAtTime(freq, tickTime);
          } else if (active.source instanceof AudioBufferSourceNode) {
            const rate = baseR * (baseP / Math.max(1, active.currentPeriod));
            active.source.playbackRate.setValueAtTime(rate, tickTime);
          }
        }
        break;
      }

      case '3':   // Tone Portamento (3xx)
      case '5': { // Tone Portamento + Volume Slide (5xx)
        if (val > 0) active.portamentoSpeed = val;
        const speed = active.portamentoSpeed;

        if (active.targetPeriod !== undefined && active.source) {
          const target = active.targetPeriod;
          const baseP = active.basePeriod || 428;
          const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);

          for (let tick = 1; tick < totalTicks; tick++) {
            const tickTime = time + (tick * tickDuration);
            if (active.currentPeriod < target) {
              active.currentPeriod = Math.min(target, active.currentPeriod + speed);
            } else if (active.currentPeriod > target) {
              active.currentPeriod = Math.max(target, active.currentPeriod - speed);
            }

            if (active.oscType && active.oscType !== 'noise') {
              const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
              (active.source as OscillatorNode).frequency.setValueAtTime(freq, tickTime);
            } else if (active.source instanceof AudioBufferSourceNode) {
              const rate = baseR * (baseP / Math.max(1, active.currentPeriod));
              active.source.playbackRate.setValueAtTime(rate, tickTime);
            }
          }
        }

        if (codeUpper === '5') {
          this.applyVolumeSlide(active, val, time, tickDuration, totalTicks);
        }
        break;
      }

      case '4':   // Vibrato (4xy)
      case '6': { // Vibrato + Volume Slide (6xy)
        const vSpeed = (val >> 4) & 0x0F;
        const vDepth = val & 0x0F;
        if (vSpeed > 0) active.vibratoSpeed = vSpeed;
        if (vDepth > 0) active.vibratoDepth = vDepth;

        if (!active.source) break;
        const basePeriod = active.currentPeriod;
        const baseP = active.basePeriod || 428;
        const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);

        for (let tick = 0; tick < totalTicks; tick++) {
          const tickTime = time + (tick * tickDuration);
          const rawDelta = getWaveformValue(active.vibratoPos, active.vibratoWaveform);
          const delta = (rawDelta * active.vibratoDepth) / 128;
          const tickPeriod = Math.max(113, Math.min(856, basePeriod + delta));

          if (active.oscType && active.oscType !== 'noise') {
            const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, tickPeriod));
            (active.source as OscillatorNode).frequency.setValueAtTime(freq, tickTime);
          } else if (active.source instanceof AudioBufferSourceNode) {
            const rate = baseR * (baseP / Math.max(1, tickPeriod));
            active.source.playbackRate.setValueAtTime(rate, tickTime);
          }

          active.vibratoPos = (active.vibratoPos + active.vibratoSpeed) & 0x3F;
        }

        // Return pitch to base period after ticks complete
        const resetTime = time + (totalTicks * tickDuration);
        if (active.oscType && active.oscType !== 'noise') {
          const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
          (active.source as OscillatorNode).frequency.setValueAtTime(freq, resetTime);
        } else if (active.source instanceof AudioBufferSourceNode) {
          const normalRate = baseR * (baseP / Math.max(1, active.currentPeriod));
          active.source.playbackRate.setValueAtTime(normalRate, resetTime);
        }

        if (codeUpper === '6') {
          this.applyVolumeSlide(active, val, time, tickDuration, totalTicks);
        }
        break;
      }

      case '7': { // Tremolo (7xy)
        const tSpeed = (val >> 4) & 0x0F;
        const tDepth = val & 0x0F;
        if (tSpeed > 0) active.tremoloSpeed = tSpeed;
        if (tDepth > 0) active.tremoloDepth = tDepth;

        for (let tick = 0; tick < totalTicks; tick++) {
          const tickTime = time + (tick * tickDuration);
          const rawDelta = getWaveformValue(active.tremoloPos, active.tremoloWaveform);
          const delta = (rawDelta * active.tremoloDepth) / 64;
          const tickVol = Math.max(0, Math.min(64, active.volume64 + delta));
          const targetGain = (tickVol / 64) * 0.38;

          active.gainNode.gain.setValueAtTime(targetGain, tickTime);
          active.tremoloPos = (active.tremoloPos + active.tremoloSpeed) & 0x3F;
        }
        break;
      }

      case '8': { // Panning (8xx: 0x00 = Left, 0x80 = Center, 0xFF = Right)
        const panVal = ((val / 128) - 1.0);
        active.panNode.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), time);
        break;
      }

      case '9': { // Sample Offset (9xx: handled in scheduleStep, stores offset memory)
        if (val > 0) active.lastSampleOffset = val * 256;
        break;
      }

      case 'A': { // Volume Slide (Axy)
        this.applyVolumeSlide(active, val, time, tickDuration, totalTicks);
        break;
      }

      case 'B': { // Position Jump (Bxx)
        this.pendingOrderJump = val;
        this.pendingLineJump = 0;
        break;
      }

      case 'C': { // Set Volume (Cxx: 0..64)
        active.volume64 = Math.min(val, 64);
        const targetVol = (active.volume64 / 64) * 0.38;
        active.gainNode.gain.setValueAtTime(targetVol, time);
        active.currentVol = targetVol;
        break;
      }

      case 'D': { // Pattern Break (Dxx: target line in BCD)
        const high = (val >> 4) & 0x0F;
        const low = val & 0x0F;
        const targetLine = (high * 10) + low;
        this.pendingOrderJump = this.currentOrderIndex + 1;
        this.pendingLineJump = targetLine;
        break;
      }

      case 'E': { // Extended Effects (Exx)
        const subCode = (val >> 4) & 0x0F;
        const subVal = val & 0x0F;

        switch (subCode) {
          case 0x0: { // Set Filter (E0x: 0 = on, 1 = off)
            this.setAmigaFilter(subVal === 0);
            break;
          }
          case 0x1: { // Fine Portamento Up (E1x: tick 0 only)
            active.currentPeriod = Math.max(113, active.currentPeriod - subVal);
            const baseP = active.basePeriod || 428;
            const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);
            if (active.source instanceof AudioBufferSourceNode) {
              const rate = baseR * (baseP / Math.max(1, active.currentPeriod));
              active.source.playbackRate.setValueAtTime(rate, time);
            } else if (active.oscType && active.oscType !== 'noise') {
              const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
              (active.source as OscillatorNode).frequency.setValueAtTime(freq, time);
            }
            break;
          }
          case 0x2: { // Fine Portamento Down (E2x: tick 0 only)
            active.currentPeriod = Math.min(856, active.currentPeriod + subVal);
            const baseP = active.basePeriod || 428;
            const baseR = active.baseRate || getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, finetune);
            if (active.source instanceof AudioBufferSourceNode) {
              const rate = baseR * (baseP / Math.max(1, active.currentPeriod));
              active.source.playbackRate.setValueAtTime(rate, time);
            } else if (active.oscType && active.oscType !== 'noise') {
              const freq = (active.baseFreq || midiToFreq(active.midiNote)) * (baseP / Math.max(1, active.currentPeriod));
              (active.source as OscillatorNode).frequency.setValueAtTime(freq, time);
            }
            break;
          }
          case 0x3: { // Glissando Control (E3x)
            active.glissando = subVal !== 0;
            break;
          }
          case 0x4: { // Set Vibrato Waveform (E4x)
            active.vibratoWaveform = subVal & 0x03;
            active.vibratoNoRetrig = (subVal & 0x04) !== 0;
            break;
          }
          case 0x5: { // Set Finetune (E5x)
            active.finetune = subVal > 7 ? subVal - 16 : subVal;
            const baseR = getPlaybackRate(active.midiNote, sample?.baseNote ?? 60, active.finetune);
            active.baseRate = baseR;
            const baseP = active.basePeriod || 428;
            if (active.source instanceof AudioBufferSourceNode) {
              const rate = baseR * (baseP / Math.max(1, active.currentPeriod));
              active.source.playbackRate.setValueAtTime(rate, time);
            }
            break;
          }
          case 0x6: { // Pattern Loop (E6x)
            if (subVal === 0) {
              this.patternLoopStartLine[channelIndex] = this.currentLine;
            } else {
              if (this.patternLoopCount[channelIndex] === undefined || this.patternLoopCount[channelIndex] === 0) {
                this.patternLoopCount[channelIndex] = subVal;
              } else {
                this.patternLoopCount[channelIndex]--;
              }
              if (this.patternLoopCount[channelIndex] > 0) {
                this.pendingLineJump = this.patternLoopStartLine[channelIndex] || 0;
                this.pendingOrderJump = this.currentOrderIndex;
              }
            }
            break;
          }
          case 0x7: { // Set Tremolo Waveform (E7x)
            active.tremoloWaveform = subVal & 0x03;
            active.tremoloNoRetrig = (subVal & 0x04) !== 0;
            break;
          }
          case 0x8: { // Extended Panning (E8x: 0x0 = L .. 0x8 = C .. 0xF = R)
            const panVal = ((subVal / 7.5) - 1.0);
            active.panNode.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), time);
            break;
          }
          case 0x9: { // Retrigger Note every x ticks (E9x)
            if (subVal > 0 && sample && sample.buffer) {
              for (let tick = subVal; tick < totalTicks; tick += subVal) {
                const retrigTime = time + (tick * tickDuration);
                const bufSrc = this.ctx.createBufferSource();
                bufSrc.buffer = sample.buffer;
                bufSrc.loop = sample.loopEnabled;
                if (sample.loopEnabled) {
                  const sRate = sample.buffer.sampleRate;
                  const dur = sample.buffer.duration;
                  const lStart = Math.max(0, sample.loopStart / sRate);
                  let lEnd = sample.loopEnd / sRate;
                  if (lEnd > dur) lEnd = dur;
                  if (lEnd > lStart) {
                    bufSrc.loopStart = lStart;
                    bufSrc.loopEnd = lEnd;
                  }
                }
                const rate = getPlaybackRate(active.midiNote, sample.baseNote || 60, finetune);
                bufSrc.playbackRate.setValueAtTime(rate, retrigTime);
                bufSrc.connect(active.gainNode);
                bufSrc.start(retrigTime);
              }
            }
            break;
          }
          case 0xA: { // Fine Volume Slide Up (EAx: tick 0 only)
            active.volume64 = Math.min(64, active.volume64 + subVal);
            const targetVol = (active.volume64 / 64) * 0.38;
            active.gainNode.gain.setValueAtTime(targetVol, time);
            active.currentVol = targetVol;
            break;
          }
          case 0xB: { // Fine Volume Slide Down (EBx: tick 0 only)
            active.volume64 = Math.max(0, active.volume64 - subVal);
            const targetVol = (active.volume64 / 64) * 0.38;
            active.gainNode.gain.setValueAtTime(targetVol, time);
            active.currentVol = targetVol;
            break;
          }
          case 0xC: { // Cut note after x ticks (ECx)
            const cutTime = time + (subVal * tickDuration);
            active.gainNode.gain.setValueAtTime(0.0001, cutTime);
            if (active.source) {
              try { active.source.stop(cutTime + 0.01); } catch (e) {}
            }
            break;
          }
          case 0xD: { // Delay Note by x ticks (EDx: note trigger scheduled in scheduleStep)
            break;
          }
          case 0xE: { // Pattern Delay (EEx)
            this.patternDelayLines = subVal;
            break;
          }
          default:
            break;
        }
        break;
      }

      case 'F': { // Set Speed (1..31) or Tempo (>= 32) (Fxx)
        if (val >= 32) {
          this.playbackBpm = val;
        } else if (val > 0) {
          this.playbackSpeed = val;
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Helper to perform volume slide up/down across ticks (Axx, 5xx, 6xx)
   */
  private applyVolumeSlide(active: ActiveChannelNode, val: number, time: number, tickDuration: number, totalTicks: number) {
    if (val > 0) active.volumeSlideVal = val;
    const slideVal = active.volumeSlideVal;

    const volUp = (slideVal >> 4) & 0x0F;
    const volDown = slideVal & 0x0F;

    for (let tick = 1; tick < totalTicks; tick++) {
      const tickTime = time + (tick * tickDuration);
      if (volUp > 0) {
        active.volume64 = Math.min(64, active.volume64 + volUp);
      } else if (volDown > 0) {
        active.volume64 = Math.max(0, active.volume64 - volDown);
      }
      const targetGain = (active.volume64 / 64) * 0.38;
      active.gainNode.gain.setValueAtTime(targetGain, tickTime);
    }
    active.currentVol = (active.volume64 / 64) * 0.38;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGainNode(): GainNode | null {
    return this.masterGain;
  }
}

// Singleton global audio engine instance
export const audioEngine = new AudioEngine();
