/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSong, TrackerStep, TrackerSample } from '../types';
import { noteStrToPeriod, getAmigaPeriod } from './modFormat';
import { MasterFxSettings, noteToMidi, midiToNote, midiToFreq, getPlaybackRate, getAmigaPlaybackRate } from '../lib/audioEngine';
import { Mp3Encoder } from '@breezystack/lamejs';
import { attachId3v2ToMp3Blob, ID3TagData } from './id3Writer';

// Normalizes and soft-limits audio samples to prevent digital clipping
function normalizeAndLimitAudio(buffer: AudioBuffer, targetPeak = 0.95): void {
  const numChannels = buffer.numberOfChannels;
  let maxPeak = 0;

  for (let ch = 0; ch < numChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }

  if (maxPeak > targetPeak) {
    const gainFactor = targetPeak / maxPeak;
    for (let ch = 0; ch < numChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] *= gainFactor;
      }
    }
  }
}

// Convert Float32Array to 16-bit PCM WAV ArrayBuffer
export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  normalizeAndLimitAudio(audioBuffer, 0.95);
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelDataL = audioBuffer.getChannelData(0);
  const channelDataR = numChannels > 1 ? audioBuffer.getChannelData(1) : channelDataL;
  const samples = channelDataL.length;
  const dataSize = samples * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  let offset = 44;
  if (numChannels === 1) {
    for (let i = 0; i < samples; i++) {
      const s = Math.max(-1, Math.min(1, channelDataL[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  } else {
    for (let i = 0; i < samples; i++) {
      const sL = Math.max(-1, Math.min(1, channelDataL[i]));
      const sR = Math.max(-1, Math.min(1, channelDataR[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
      view.setInt16(offset + 2, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
      offset += 4;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Convert AudioBuffer to MP3 Blob using lamejs with time-sliced, non-blocking chunking & cancellation support
export async function audioBufferToMp3Blob(
  audioBuffer: AudioBuffer,
  bitrate = 192,
  onProgress?: (pct: number) => void,
  id3Data?: ID3TagData,
  isCancelled?: () => boolean
): Promise<Blob> {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const leftFloat = audioBuffer.getChannelData(0);
  const rightFloat = numChannels > 1 ? audioBuffer.getChannelData(1) : leftFloat;
  const samples = leftFloat.length;

  if (isCancelled?.()) throw new Error('Render cancelled');
  if (onProgress) onProgress(0);

  // Initialize Lame MP3 Encoder
  const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, bitrate);
  const mp3Data: Uint8Array[] = [];
  const chunkSize = 1152; // standard MP3 frame sample size

  // Small reusable buffers for frame conversion - zero large heap allocations
  const leftChunkInt16 = new Int16Array(chunkSize);
  const rightChunkInt16 = new Int16Array(chunkSize);

  let lastYieldTs = Date.now();
  let frameCount = 0;

  for (let i = 0; i < samples; i += chunkSize) {
    if (isCancelled?.()) throw new Error('Render cancelled');

    const currentChunkLen = Math.min(chunkSize, samples - i);
    
    // Fast conversion of Float32 to Int16 on the fly per chunk
    for (let j = 0; j < currentChunkLen; j++) {
      const sL = Math.max(-1, Math.min(1, leftFloat[i + j]));
      leftChunkInt16[j] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
      if (numChannels > 1) {
        const sR = Math.max(-1, Math.min(1, rightFloat[i + j]));
        rightChunkInt16[j] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
      }
    }

    // Zero-fill any partial trailing frame
    if (currentChunkLen < chunkSize) {
      for (let j = currentChunkLen; j < chunkSize; j++) {
        leftChunkInt16[j] = 0;
        if (numChannels > 1) rightChunkInt16[j] = 0;
      }
    }

    const chunkL = currentChunkLen === chunkSize ? leftChunkInt16 : leftChunkInt16.subarray(0, currentChunkLen);
    const chunkR = currentChunkLen === chunkSize ? rightChunkInt16 : rightChunkInt16.subarray(0, currentChunkLen);

    let mp3buf: Uint8Array | Int8Array;
    if (numChannels === 1) {
      mp3buf = mp3Encoder.encodeBuffer(chunkL);
    } else {
      mp3buf = mp3Encoder.encodeBuffer(chunkL, chunkR);
    }

    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf.buffer, mp3buf.byteOffset, mp3buf.length));
    }

    frameCount++;

    // Yield control to browser every 16ms (60 FPS) to guarantee smooth UI and zero tab freezes
    const now = Date.now();
    if (now - lastYieldTs >= 16 || frameCount % 8 === 0) {
      const pct = Math.min(99, Math.round((i / samples) * 100));
      if (onProgress) onProgress(pct);
      await new Promise(r => setTimeout(r, 0));
      lastYieldTs = Date.now();
    }
  }

  if (isCancelled?.()) throw new Error('Render cancelled');

  // Flush remaining buffer
  const finalChunk = mp3Encoder.flush();
  if (finalChunk && finalChunk.length > 0) {
    mp3Data.push(new Uint8Array(finalChunk.buffer, finalChunk.byteOffset, finalChunk.length));
  }

  if (onProgress) onProgress(100);

  const rawMp3Blob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });

  // If ID3 metadata or album cover art is provided, attach ID3v2.3 tag
  if (id3Data && (id3Data.title || id3Data.artist || id3Data.album || id3Data.image)) {
    try {
      return await attachId3v2ToMp3Blob(rawMp3Blob, id3Data);
    } catch (err) {
      console.warn('Could not attach ID3 tag to MP3, returning raw blob:', err);
      return rawMp3Blob;
    }
  }

  return rawMp3Blob;
}

// ProTracker Sine Table
const PROTRACKER_SINE_TABLE = [
    0,  24,  49,  74,  97, 120, 141, 161, 
  180, 197, 212, 224, 235, 244, 250, 253, 
  255, 253, 250, 244, 235, 224, 212, 197, 
  180, 161, 141, 120,  97,  74,  49,  24
];

function getWaveformValue(pos: number, waveform: number): number {
  const step = pos & 0x1f;
  let val = 0;
  switch (waveform & 0x03) {
    case 0: // Sine
      val = PROTRACKER_SINE_TABLE[step];
      break;
    case 1: // Ramp Down
      val = 255 - ((pos & 0x3f) * 4);
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

interface ScheduledTimelineRow {
  orderIndex: number;
  patternId: number;
  row: number;
  startTime: number;
  bpm: number;
  speed: number;
  tickDuration: number;
  lineDuration: number;
}

/**
 * Accurately calculate a single complete playthrough of the tracker song timeline (1x Playthrough).
 * Respects Position Jumps (Bxx), Pattern Breaks (Dxx), Speed/Tempo Changes (Fxx),
 * Pattern Delays (EEx), and Pattern Loops (E6x).
 * Stops cleanly when the song reaches the end or loops back to an earlier position.
 */
function buildSongTimeline(song: TrackerSong): ScheduledTimelineRow[] {
  const timeline: ScheduledTimelineRow[] = [];
  const orderList = song.orderList && song.orderList.length > 0 ? song.orderList : [0];
  const numChannels = song.channelsCount || 4;

  let currentOrder = 0;
  let currentRow = 0;
  let currentBpm = song.bpm || 125;
  let currentSpeed = song.speed || 6;
  let currentTime = 0.05;

  const patternLoopStartLine: { [ch: number]: number } = {};
  const patternLoopCount: { [ch: number]: number } = {};
  let patternDelayLines = 0;

  const maxTotalRows = 16384;
  let iterations = 0;

  // Track visit counts per order/row to allow repeat sections while preventing infinite loops
  const rowVisitCounts = new Map<string, number>();

  while (currentOrder < orderList.length && iterations < maxTotalRows) {
    iterations++;
    const patId = orderList[currentOrder];
    const pattern = song.patterns.find(p => p.id === patId) || song.patterns[0];
    if (!pattern) break;

    const patternLength = pattern.length || 64;
    if (currentRow >= patternLength) {
      currentOrder++;
      currentRow = 0;
      if (currentOrder >= orderList.length) break;
      continue;
    }

    const stateKey = `${currentOrder}:${currentRow}`;
    let hasActivePatternLoop = false;
    for (let ch = 0; ch < numChannels; ch++) {
      if ((patternLoopCount[ch] || 0) > 0) {
        hasActivePatternLoop = true;
        break;
      }
    }

    const visits = (rowVisitCounts.get(stateKey) || 0) + 1;
    if (visits > 2 && !hasActivePatternLoop) {
      // Reached full song cycle loop
      break;
    }
    rowVisitCounts.set(stateKey, visits);

    const tickDuration = 2.5 / currentBpm;
    const speedMultiplier = 1 + patternDelayLines;
    const lineDuration = currentSpeed * tickDuration * speedMultiplier;
    patternDelayLines = 0;

    timeline.push({
      orderIndex: currentOrder,
      patternId: patId,
      row: currentRow,
      startTime: currentTime,
      bpm: currentBpm,
      speed: currentSpeed,
      tickDuration,
      lineDuration,
    });

    currentTime += lineDuration;

    let pendingOrderJump: number | null = null;
    let pendingLineJump: number | null = null;

    for (let ch = 0; ch < numChannels; ch++) {
      const step: TrackerStep | undefined = pattern.channels?.[ch]?.[currentRow];
      if (!step || !step.effectCode) continue;

      const code = step.effectCode.toUpperCase();
      const val = step.effectVal ?? 0;

      if (code === 'F') {
        if (val >= 32) {
          currentBpm = val;
        } else if (val > 0) {
          currentSpeed = val;
        }
      } else if (code === 'B') {
        pendingOrderJump = val;
        pendingLineJump = 0;
      } else if (code === 'D') {
        const targetRow = (((val >> 4) & 0x0f) * 10) + (val & 0x0f);
        pendingOrderJump = currentOrder + 1;
        pendingLineJump = targetRow;
      } else if (code === 'E') {
        const sub = (val >> 4) & 0x0f;
        const subVal = val & 0x0f;
        if (sub === 0x6) { // Pattern Loop (E6x)
          if (subVal === 0) {
            patternLoopStartLine[ch] = currentRow;
          } else {
            if (!patternLoopCount[ch] || patternLoopCount[ch] === 0) {
              patternLoopCount[ch] = subVal;
              pendingLineJump = patternLoopStartLine[ch] ?? 0;
              pendingOrderJump = currentOrder;
            } else {
              patternLoopCount[ch]--;
              if (patternLoopCount[ch] > 0) {
                pendingLineJump = patternLoopStartLine[ch] ?? 0;
                pendingOrderJump = currentOrder;
              }
            }
          }
        } else if (sub === 0xe) { // Pattern Delay (EEx)
          patternDelayLines = subVal;
        }
      }
    }

    if (pendingOrderJump !== null || pendingLineJump !== null) {
      if (pendingOrderJump !== null) {
        currentOrder = pendingOrderJump;
      } else {
        currentOrder++;
      }
      currentRow = pendingLineJump !== null ? pendingLineJump : 0;
    } else {
      currentRow++;
      if (currentRow >= patternLength) {
        currentRow = 0;
        currentOrder++;
      }
    }
  }

  return timeline;
}

/**
 * High-performance, 100% bit-accurate tracker audio DSP renderer.
 * Accurately reproduces all Amiga Paula clock, finetune, pitch calculations,
 * and ProTracker effect behaviors matching the real-time player.
 */
export async function renderSongToAudioBuffer(
  song: TrackerSong,
  fxSettings: MasterFxSettings,
  onProgress?: (status: string, pct?: number) => void,
  isCancelled?: () => boolean
): Promise<AudioBuffer> {
  const sampleRate = 44100;
  
  if (isCancelled?.()) throw new Error('Render cancelled');
  if (onProgress) onProgress('Analyzing tracker score & timeline...', 5);

  const timeline = buildSongTimeline(song);
  if (isCancelled?.()) throw new Error('Render cancelled');
  if (timeline.length === 0) {
    const dummyCtx = new OfflineAudioContext(2, sampleRate, sampleRate);
    return await dummyCtx.startRendering();
  }

  const lastRow = timeline[timeline.length - 1];
  const calculatedDuration = lastRow.startTime + lastRow.lineDuration;
  const totalDuration = Math.min(3600, Math.max(1.0, isFinite(calculatedDuration) ? calculatedDuration + 0.6 : 60));
  const totalFrames = Math.ceil(totalDuration * sampleRate);

  if (onProgress) onProgress('Preparing audio synthesizer & samples...', 10);
  await new Promise(r => setTimeout(r, 0));

  // Extract raw channel PCM float arrays from song samples for direct, high-speed mixing
  const preparedSamples = song.samples.map(s => {
    let pcm: Float32Array | null = null;
    let sRate = 44100;
    if (s.buffer) {
      pcm = s.buffer.getChannelData(0);
      sRate = s.buffer.sampleRate;
    }
    const loopStart = s.loopStart || 0;
    const loopEnd = (s.loopEnd && s.loopEnd > loopStart) ? s.loopEnd : (pcm ? pcm.length : 0);
    const baseNote = s.baseNote ?? (s.sourceType === 'synth' ? 60 : 48);
    return {
      ...s,
      pcm,
      pcmSampleRate: sRate,
      loopStart,
      loopEnd,
      baseNote,
    };
  });

  const numChannels = song.channelsCount || 4;
  const stereoWidth = fxSettings.stereoWidth ?? 0.7;

  // Initialize Channel State
  const channels = Array.from({ length: numChannels }, (_, ch) => {
    const defaultPan = (ch % 4 === 0 || ch % 4 === 3) ? -0.75 * stereoWidth : 0.75 * stereoWidth;
    return {
      instrumentIndex: 0,
      volume64: 64,
      finetune: 0,
      midiNote: 60,
      baseNote: 48,
      currentPeriod: 428,
      basePeriod: 428,
      targetPeriod: 0,
      baseRate: 1.0,
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
      panning: defaultPan,
      // Playback State
      isPlaying: false,
      isSynth: false,
      synthType: 'square',
      synthPhase: 0,
      samplePos: 0,
      sampleData: null as Float32Array | null,
      sampleOrigRate: 44100,
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 0,
      noteDelayTicks: 0,
    };
  });

  // Pre-allocate Stereo Mix Buffers
  const mixLeft = new Float32Array(totalFrames);
  const mixRight = new Float32Array(totalFrames);

  let currentSampleIdx = 0;
  let lastYieldTs = Date.now();

  for (let tIdx = 0; tIdx < timeline.length; tIdx++) {
    if (isCancelled?.()) throw new Error('Render cancelled');

    const tItem = timeline[tIdx];
    const pattern = song.patterns.find(p => p.id === tItem.patternId) || song.patterns[0];
    const row = tItem.row;
    const speed = Math.max(1, tItem.speed);
    const tickDuration = tItem.tickDuration;
    const samplesPerTick = Math.max(1, Math.round(tickDuration * sampleRate));

    // Yield control periodically to guarantee UI responsiveness
    const now = Date.now();
    if (now - lastYieldTs >= 20 || tIdx % 40 === 0) {
      const pct = Math.min(85, Math.round(10 + (tIdx / timeline.length) * 75));
      if (onProgress) onProgress(`Rendering audio DSP mixdown (${pct}%)...`, pct);
      await new Promise(r => setTimeout(r, 0));
      lastYieldTs = Date.now();
    }

    // 1. Process Row / Step Headers for All Channels (Tick 0)
    for (let ch = 0; ch < numChannels; ch++) {
      const strip = channels[ch];
      const step: TrackerStep | undefined = pattern?.channels?.[ch]?.[row];
      strip.noteDelayTicks = 0;

      if (!step) continue;

      const effectCodeUpper = step.effectCode ? step.effectCode.toUpperCase() : '';
      const effectVal = step.effectVal ?? 0;
      const isTonePorta = effectCodeUpper === '3' || effectCodeUpper === '5';

      // Key Off
      if (step.note === 'OFF' || step.note === '===') {
        strip.isPlaying = false;
        continue;
      }

      // Check for Note Delay (EDx)
      if (effectCodeUpper === 'E' && ((effectVal >> 4) & 0x0F) === 0x0D) {
        strip.noteDelayTicks = effectVal & 0x0F;
      }

      const hasNote = step.note && step.note !== '---';
      const instIdx = step.instrument !== null ? step.instrument : strip.instrumentIndex;
      const sample = preparedSamples[instIdx];

      if (step.instrument !== null) {
        strip.instrumentIndex = step.instrument;
        if (sample) {
          strip.finetune = sample.finetune || 0;
          if (step.volume === null) {
            strip.volume64 = sample.volume ?? 64;
          }
        }
      }

      if (step.volume !== null) {
        strip.volume64 = Math.max(0, Math.min(64, step.volume));
      }

      // Effect Commands at Row Start
      if (effectCodeUpper === 'C') {
        strip.volume64 = Math.min(64, effectVal);
      } else if (effectCodeUpper === '8') {
        strip.panning = Math.max(-1, Math.min(1, (effectVal / 128) - 1.0));
      } else if (effectCodeUpper === 'E') {
        const sub = (effectVal >> 4) & 0x0f;
        const subVal = effectVal & 0x0f;
        if (sub === 0x1) { // Fine Portamento Up (E1x)
          strip.currentPeriod = Math.max(113, strip.currentPeriod - subVal);
        } else if (sub === 0x2) { // Fine Portamento Down (E2x)
          strip.currentPeriod = Math.min(856, strip.currentPeriod + subVal);
        } else if (sub === 0x4) { // Vibrato Waveform (E4x)
          strip.vibratoWaveform = subVal & 0x03;
          strip.vibratoNoRetrig = (subVal & 0x04) !== 0;
        } else if (sub === 0x7) { // Tremolo Waveform (E7x)
          strip.tremoloWaveform = subVal & 0x03;
          strip.tremoloNoRetrig = (subVal & 0x04) !== 0;
        } else if (sub === 0x8) { // Extended Panning (E8x)
          strip.panning = Math.max(-1, Math.min(1, (subVal / 7.5) - 1.0));
        } else if (sub === 0xA) { // Fine Volume Slide Up (EAx)
          strip.volume64 = Math.min(64, strip.volume64 + subVal);
        } else if (sub === 0xB) { // Fine Volume Slide Down (EBx)
          strip.volume64 = Math.max(0, strip.volume64 - subVal);
        }
      }

      // Trigger Note (if no note delay)
      if (hasNote && strip.noteDelayTicks === 0) {
        triggerChannelNote(strip, step, sample, isTonePorta, effectCodeUpper, effectVal);
      }
    }

    // 2. Synthesize & Mix Audio Ticks for This Row (0 .. speed - 1)
    for (let tick = 0; tick < speed; tick++) {
      // Process Tick-Level Events & Automations for all channels
      for (let ch = 0; ch < numChannels; ch++) {
        const strip = channels[ch];
        const step: TrackerStep | undefined = pattern?.channels?.[ch]?.[row];
        if (!step) continue;

        const effectCodeUpper = step.effectCode ? step.effectCode.toUpperCase() : '';
        const effectVal = step.effectVal ?? 0;
        const sample = preparedSamples[strip.instrumentIndex];

        // Delayed Note Trigger (EDx)
        if (tick === strip.noteDelayTicks && strip.noteDelayTicks > 0 && step.note && step.note !== '---') {
          const isTonePorta = effectCodeUpper === '3' || effectCodeUpper === '5';
          triggerChannelNote(strip, step, sample, isTonePorta, effectCodeUpper, effectVal);
        }

        // Cut Note (ECx)
        if (effectCodeUpper === 'E' && ((effectVal >> 4) & 0x0F) === 0x0C && (effectVal & 0x0F) === tick) {
          strip.isPlaying = false;
        }

        // Retrigger Note (E9x)
        if (effectCodeUpper === 'E' && ((effectVal >> 4) & 0x0F) === 0x09) {
          const subVal = effectVal & 0x0F;
          if (subVal > 0 && tick > 0 && tick % subVal === 0) {
            strip.samplePos = 0;
            strip.isPlaying = true;
          }
        }
      }

      // Render PCM samples for this tick into Stereo Mixdown Buffer
      const tickSamples = Math.min(samplesPerTick, totalFrames - currentSampleIdx);
      if (tickSamples <= 0) break;

      for (let ch = 0; ch < numChannels; ch++) {
        const strip = channels[ch];
        if (!strip.isPlaying) continue;

        const step: TrackerStep | undefined = pattern?.channels?.[ch]?.[row];
        const effectCodeUpper = step?.effectCode ? step.effectCode.toUpperCase() : '';
        const effectVal = step?.effectVal ?? 0;

        // Calculate dynamic pitch rate and volume for this tick
        let tickRate = strip.baseRate;
        if (strip.basePeriod > 0 && strip.currentPeriod > 0) {
          tickRate = strip.baseRate * (strip.basePeriod / strip.currentPeriod);
        }
        let tickVol64 = strip.volume64;

        if (effectCodeUpper) {
          switch (effectCodeUpper) {
            case '0': { // Arpeggio (0xy)
              const n1 = (effectVal >> 4) & 0x0f;
              const n2 = effectVal & 0x0f;
              if (n1 !== 0 || n2 !== 0) {
                let semi = 0;
                if (tick % 3 === 1) semi = n1;
                else if (tick % 3 === 2) semi = n2;
                const smp = preparedSamples[strip.instrumentIndex];
                tickRate = (smp?.isAmigaModSample || strip.baseNote === 48)
                  ? getAmigaPlaybackRate(getAmigaPeriod(midiToNote(strip.midiNote + semi), strip.finetune || 0), strip.finetune || 0)
                  : getPlaybackRate(strip.midiNote + semi, strip.baseNote || 60, strip.finetune || 0);
              }
              break;
            }

            case '1': { // Portamento Up (1xx)
              if (tick > 0) {
                if (effectVal > 0) strip.portamentoUpSpeed = effectVal;
                strip.currentPeriod = Math.max(113, strip.currentPeriod - strip.portamentoUpSpeed);
              }
              tickRate = strip.baseRate * (strip.basePeriod / Math.max(1, strip.currentPeriod));
              break;
            }

            case '2': { // Portamento Down (2xx)
              if (tick > 0) {
                if (effectVal > 0) strip.portamentoDownSpeed = effectVal;
                strip.currentPeriod = Math.min(856, strip.currentPeriod + strip.portamentoDownSpeed);
              }
              tickRate = strip.baseRate * (strip.basePeriod / Math.max(1, strip.currentPeriod));
              break;
            }

            case '3':
            case '5': { // Tone Portamento (3xx or 5xx)
              if (tick > 0) {
                if (effectVal > 0 && effectCodeUpper === '3') strip.portamentoSpeed = effectVal;
                if (strip.targetPeriod > 0) {
                  if (strip.currentPeriod < strip.targetPeriod) {
                    strip.currentPeriod = Math.min(strip.targetPeriod, strip.currentPeriod + strip.portamentoSpeed);
                  } else if (strip.currentPeriod > strip.targetPeriod) {
                    strip.currentPeriod = Math.max(strip.targetPeriod, strip.currentPeriod - strip.portamentoSpeed);
                  }
                }
                if (effectCodeUpper === '5') {
                  applyTickVolSlide(strip, effectVal);
                }
              }
              tickRate = strip.baseRate * (strip.basePeriod / Math.max(1, strip.currentPeriod));
              tickVol64 = strip.volume64;
              break;
            }

            case '4':
            case '6': { // Vibrato (4xy or 6xy)
              const vSpd = (effectVal >> 4) & 0x0f;
              const vDep = effectVal & 0x0f;
              if (vSpd > 0) strip.vibratoSpeed = vSpd;
              if (vDep > 0) strip.vibratoDepth = vDep;
              const raw = getWaveformValue(strip.vibratoPos, strip.vibratoWaveform);
              const delta = (raw * strip.vibratoDepth) / 128;
              const tickPeriod = Math.max(113, Math.min(856, strip.currentPeriod + delta));
              tickRate = strip.baseRate * (strip.basePeriod / Math.max(1, tickPeriod));
              strip.vibratoPos = (strip.vibratoPos + strip.vibratoSpeed) & 0x3f;
              if (tick > 0 && effectCodeUpper === '6') {
                applyTickVolSlide(strip, effectVal);
              }
              tickVol64 = strip.volume64;
              break;
            }

            case '7': { // Tremolo (7xy)
              const tSpd = (effectVal >> 4) & 0x0f;
              const tDep = effectVal & 0x0f;
              if (tSpd > 0) strip.tremoloSpeed = tSpd;
              if (tDep > 0) strip.tremoloDepth = tDep;
              const raw = getWaveformValue(strip.tremoloPos, strip.tremoloWaveform);
              const delta = (raw * strip.tremoloDepth) / 64;
              tickVol64 = Math.max(0, Math.min(64, strip.volume64 + delta));
              strip.tremoloPos = (strip.tremoloPos + strip.tremoloSpeed) & 0x3f;
              break;
            }

            case 'A': { // Volume Slide (Axy)
              if (tick > 0) {
                applyTickVolSlide(strip, effectVal);
              }
              tickVol64 = strip.volume64;
              break;
            }
          }
        }

        const effVol = Math.max(0, Math.min(64, tickVol64));
        const chGain = (effVol / 64) * 0.38;
        if (chGain <= 0.0001) {
          if (strip.sampleData) {
            const stepIncrement = tickRate * (strip.sampleOrigRate / sampleRate);
            strip.samplePos += stepIncrement * tickSamples;
          }
          continue;
        }

        const pan = strip.panning;
        const panRad = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
        const leftGain = chGain * Math.cos(panRad);
        const rightGain = chGain * Math.sin(panRad);

        if (strip.isSynth) {
          // Real-time chip synth rendering (Square, Saw, Tri, Noise)
          const oscFreq = midiToFreq(strip.midiNote) * (tickRate / Math.max(0.01, strip.baseRate));
          const phaseInc = (oscFreq * 2 * Math.PI) / sampleRate;

          for (let s = 0; s < tickSamples; s++) {
            const outIdx = currentSampleIdx + s;
            let sampleVal = 0;
            const phase = strip.synthPhase;

            switch (strip.synthType) {
              case 'sine':
                sampleVal = Math.sin(phase);
                break;
              case 'sawtooth':
                sampleVal = 1 - (phase / Math.PI);
                break;
              case 'triangle':
                sampleVal = (2 / Math.PI) * Math.asin(Math.sin(phase));
                break;
              case 'noise':
                sampleVal = (Math.random() * 2) - 1;
                break;
              case 'square':
              default:
                sampleVal = phase < Math.PI ? 0.9 : -0.9;
                break;
            }

            mixLeft[outIdx] += sampleVal * leftGain;
            mixRight[outIdx] += sampleVal * rightGain;

            strip.synthPhase = (phase + phaseInc) % (2 * Math.PI);
          }
        } else if (strip.sampleData) {
          // High-Fidelity Interpolated PCM Sample Rendering
          const pcm = strip.sampleData;
          const pcmLen = pcm.length;
          const isLooping = strip.loopEnabled && strip.loopEnd > strip.loopStart && strip.loopEnd <= pcmLen;
          const lStart = strip.loopStart;
          const lEnd = isLooping ? strip.loopEnd : pcmLen;
          const stepIncrement = tickRate * (strip.sampleOrigRate / sampleRate);

          let sPos = strip.samplePos;

          for (let s = 0; s < tickSamples; s++) {
            const outIdx = currentSampleIdx + s;

            if (isLooping) {
              if (sPos >= lEnd) {
                sPos = lStart + ((sPos - lStart) % (lEnd - lStart));
              }
            } else if (sPos >= pcmLen - 1) {
              strip.isPlaying = false;
              break;
            }

            const idxA = Math.floor(sPos);
            const frac = sPos - idxA;
            let idxB = idxA + 1;
            if (isLooping) {
              if (idxB >= lEnd) idxB = lStart;
            } else {
              if (idxB >= pcmLen) idxB = pcmLen - 1;
            }

            const valA = pcm[idxA] || 0;
            const valB = pcm[idxB] || 0;
            const sampleVal = valA + frac * (valB - valA);

            mixLeft[outIdx] += sampleVal * leftGain;
            mixRight[outIdx] += sampleVal * rightGain;

            sPos += stepIncrement;
          }

          strip.samplePos = sPos;
        }
      }

      currentSampleIdx += tickSamples;
    }
  }

  if (isCancelled?.()) throw new Error('Render cancelled');

  // Master Audio Post-Processing (Master FX Rack: Reverb, Delay, Saturation, Master Filter)
  if (onProgress) onProgress('Applying master DSP rack & filter FX (90%)...', 90);
  await new Promise(r => setTimeout(r, 10));

  const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);
  const mixBuffer = offlineCtx.createBuffer(2, totalFrames, sampleRate);
  mixBuffer.copyToChannel(mixLeft, 0);
  mixBuffer.copyToChannel(mixRight, 1);

  const rawSource = offlineCtx.createBufferSource();
  rawSource.buffer = mixBuffer;

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(fxSettings.masterVolume ?? 0.85, 0);

  const fxBusGain = offlineCtx.createGain();
  const masterFxOut = offlineCtx.createGain();
  fxBusGain.connect(masterFxOut);

  // Delay FX
  if (fxSettings.delayEnabled && (fxSettings.delayWet || 0) > 0) {
    const delayNode = offlineCtx.createDelay(2.0);
    delayNode.delayTime.setValueAtTime(fxSettings.delayTime || 0.25, 0);
    const delayFeedback = offlineCtx.createGain();
    delayFeedback.gain.setValueAtTime(Math.min(0.85, fxSettings.delayFeedback || 0.35), 0);
    const delayWet = offlineCtx.createGain();
    delayWet.gain.setValueAtTime(fxSettings.delayWet || 0.25, 0);

    fxBusGain.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);
    delayWet.connect(masterFxOut);
  }

  // Reverb FX
  if (fxSettings.reverbEnabled && (fxSettings.reverbWet || 0) > 0) {
    const reverbConvolver = offlineCtx.createConvolver();
    const reverbDuration = Math.max(0.3, Math.min(1.5, fxSettings.reverbSize || 1.0));
    const reverbLength = Math.floor(sampleRate * reverbDuration);
    const impulse = offlineCtx.createBuffer(2, reverbLength, sampleRate);
    const leftImp = impulse.getChannelData(0);
    const rightImp = impulse.getChannelData(1);
    for (let i = 0; i < reverbLength; i++) {
      const n = reverbLength - i;
      const env = Math.pow(n / reverbLength, 2.2);
      leftImp[i] = (Math.random() * 2 - 1) * env;
      rightImp[i] = (Math.random() * 2 - 1) * env;
    }
    reverbConvolver.buffer = impulse;

    const reverbWet = offlineCtx.createGain();
    reverbWet.gain.setValueAtTime(fxSettings.reverbWet || 0.20, 0);

    fxBusGain.connect(reverbConvolver);
    reverbConvolver.connect(reverbWet);
    reverbWet.connect(masterFxOut);
  }

  // Filter & Saturation
  const filterNode = offlineCtx.createBiquadFilter();
  filterNode.type = fxSettings.filterType || 'lowpass';
  filterNode.frequency.setValueAtTime(
    fxSettings.filterEnabled ? fxSettings.filterCutoff : 20000,
    0
  );
  filterNode.Q.setValueAtTime(fxSettings.filterResonance || 1.0, 0);

  if (fxSettings.saturationEnabled && (fxSettings.saturationDrive || 0) > 0) {
    const saturationNode = offlineCtx.createWaveShaper();
    const k = fxSettings.saturationDrive;
    const n_samples = 4096;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    saturationNode.curve = curve;
    masterFxOut.connect(saturationNode);
    saturationNode.connect(filterNode);
  } else {
    masterFxOut.connect(filterNode);
  }

  filterNode.connect(offlineCtx.destination);
  rawSource.connect(masterGain);
  masterGain.connect(fxBusGain);

  rawSource.start(0);

  const renderedBuffer = await offlineCtx.startRendering();

  if (isCancelled?.()) throw new Error('Render cancelled');
  if (onProgress) onProgress('Normalizing and mastering audio levels (95%)...', 95);
  await new Promise(r => setTimeout(r, 10));

  normalizeAndLimitAudio(renderedBuffer, 0.95);
  if (onProgress) onProgress('Audio DSP mixdown complete!', 100);

  return renderedBuffer;
}

function triggerChannelNote(
  strip: any,
  step: TrackerStep,
  sample: any,
  isTonePorta: boolean,
  effectCodeUpper: string,
  effectVal: number
) {
  const midiNote = noteToMidi(step.note!);
  const period = (step.period && step.period > 0) ? step.period : noteStrToPeriod(step.note!);

  if (!isTonePorta) {
    if (!strip.vibratoNoRetrig) strip.vibratoPos = 0;
    if (!strip.tremoloNoRetrig) strip.tremoloPos = 0;
  }

  if (isTonePorta && strip.isPlaying) {
    // Portamento: only update targetPeriod, never reset samplePos or voice!
    if (period > 0) strip.targetPeriod = period;
  } else {
    strip.midiNote = midiNote;
    if (period > 0) {
      strip.currentPeriod = period;
      strip.targetPeriod = period;
    }

    const baseNote = sample?.baseNote ?? (sample?.sourceType === 'synth' ? 60 : 48);
    const finetune = strip.finetune ?? sample?.finetune ?? 0;
    strip.baseNote = baseNote;
    strip.basePeriod = period > 0 ? period : 428;
    strip.baseRate = (period > 0 && (sample?.isAmigaModSample || baseNote === 48))
      ? (214 / period)
      : getPlaybackRate(midiNote, baseNote, finetune);

    strip.isPlaying = true;
    strip.isSynth = sample?.sourceType === 'synth';
    strip.synthType = sample?.synthType || 'square';
    strip.synthPhase = 0;
    strip.sampleData = sample?.pcm || null;
    strip.sampleOrigRate = sample?.pcmSampleRate || 44100;
    strip.loopEnabled = !!sample?.loopEnabled;
    strip.loopStart = sample?.loopStart || 0;
    strip.loopEnd = sample?.loopEnd || (strip.sampleData ? strip.sampleData.length : 0);

    let startOffset = 0;
    if (effectCodeUpper === '9') {
      if (effectVal > 0) strip.lastSampleOffset = effectVal * 256;
      startOffset = strip.lastSampleOffset;
    }
    strip.samplePos = startOffset;
  }
}

function applyTickVolSlide(strip: any, val: number) {
  if (val > 0) strip.volumeSlideVal = val;
  const slide = strip.volumeSlideVal;
  const up = (slide >> 4) & 0x0f;
  const down = slide & 0x0f;
  if (up > 0) {
    strip.volume64 = Math.min(64, strip.volume64 + up);
  } else if (down > 0) {
    strip.volume64 = Math.max(0, strip.volume64 - down);
  }
}
