/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSample } from '../types';
import { decodeAudioBufferSafe } from './audioDecoder';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert AudioBuffer to 16-bit PCM WAV ArrayBuffer for persistence
function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelData = audioBuffer.getChannelData(0);
  const samples = channelData.length;
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
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export const ST_STARTER_FILES = [
  { file: 'BassDrum4.aiff', name: 'BassDrum4', baseNote: 36 },
  { file: 'CloseHiHat.aiff', name: 'CloseHiHat', baseNote: 42 },
  { file: 'Claps1.aiff', name: 'Claps1', baseNote: 38 },
  { file: 'DeepBass.aiff', name: 'DeepBass', baseNote: 36 },
  { file: 'AnalogString.aiff', name: 'AnalogString', baseNote: 48 },
  { file: 'Asia.aiff', name: 'Asia', baseNote: 48 },
  { file: 'Call.aiff', name: 'Call', baseNote: 48 },
  { file: 'DigDug.aiff', name: 'DigDug', baseNote: 36 },
  { file: 'Celeste.aiff', name: 'Celeste', baseNote: 48 },
  { file: 'Cinema.aiff', name: 'Cinema', baseNote: 48 },
  { file: 'Aligator.aiff', name: 'Aligator', baseNote: 36 },
  { file: 'Breath.aiff', name: 'Breath', baseNote: 48 },
  { file: 'Chink.aiff', name: 'Chink', baseNote: 42 },
  { file: 'CowBell.aiff', name: 'CowBell', baseNote: 46 },
  { file: 'Alien.aiff', name: 'Alien', baseNote: 48 },
  { file: 'BigBow.aiff', name: 'BigBow', baseNote: 36 },
];

/**
 * Loads the curated ST-01 Starter Kit into TrackerSample array with full AudioBuffers
 */
export async function loadStStarterKit(audioCtx: AudioContext): Promise<TrackerSample[]> {
  const result: TrackerSample[] = [];

  for (let i = 0; i < 32; i++) {
    if (i < ST_STARTER_FILES.length) {
      const def = ST_STARTER_FILES[i];
      let buffer: AudioBuffer | null = null;
      let b64: string | null = null;
      let loopStart = 0;
      let loopEnd = 0;
      let loopEnabled = false;

      const candidateUrls = [
        `/amiga_st/samples/ST-01/${def.file}`,
        `/samples/st_disks/ST-01/${def.file}`,
        `/dist/amiga_st/samples/ST-01/${def.file}`,
      ];

      for (const url of candidateUrls) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const arrBuf = await resp.arrayBuffer();
            const decoded = await decodeAudioBufferSafe(arrBuf, audioCtx);
            buffer = decoded.buffer;
            loopStart = decoded.loopStart ?? 0;
            loopEnd = decoded.loopEnd ?? decoded.buffer.length;
            loopEnabled = decoded.loopEnabled ?? false;
            b64 = arrayBufferToBase64(arrBuf);
            break;
          }
        } catch {}
      }

      // If network fetch failed for any reason, synthesize an authentic fallback 8-bit sound
      if (!buffer) {
        const sr = 16574;
        const dur = def.name.includes('Drum') || def.name.includes('Clap') ? 0.25 : 0.6;
        const frames = Math.floor(sr * dur);
        buffer = audioCtx.createBuffer(1, frames, sr);
        const data = buffer.getChannelData(0);
        for (let s = 0; s < frames; s++) {
          const t = s / sr;
          if (def.name.includes('Drum')) {
            const freq = 120 * Math.exp(-t * 22) + 40;
            data[s] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 8);
          } else if (def.name.includes('HiHat') || def.name.includes('Clap')) {
            data[s] = (Math.random() * 2 - 1) * Math.exp(-t * 25);
          } else {
            const freq = 110 * Math.pow(2, (def.baseNote - 36) / 12);
            data[s] = (2 * ((t * freq) % 1) - 1) * Math.exp(-t * 3);
          }
        }
        loopEnd = buffer.length;
        b64 = arrayBufferToBase64(audioBufferToWav(buffer));
      }

      result.push({
        id: i,
        name: def.name,
        filename: def.file,
        buffer,
        base64Data: b64,
        volume: 64,
        panning: i % 2 === 0 ? -0.4 : 0.4,
        loopEnabled,
        loopStart,
        loopEnd,
        baseNote: def.baseNote,
        sourceType: 'upload',
      });
    } else {
      result.push({
        id: i,
        name: '',
        filename: '',
        buffer: null,
        base64Data: null,
        volume: 64,
        panning: 0.0,
        loopEnabled: false,
        loopStart: 0,
        loopEnd: 0,
        baseNote: 36,
        sourceType: 'upload',
      });
    }
  }

  return result;
}
