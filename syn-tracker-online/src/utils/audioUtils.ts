/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSong } from '../types';
import { decodeAudioBufferSafe } from './audioDecoder';

/**
 * Helper to convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Rebuilds Web Audio API AudioBuffers for all serialized base64 samples in a TrackerSong.
 */
export async function rebuildAudioBuffers(
  loadedSong: TrackerSong,
  audioCtx?: AudioContext
): Promise<TrackerSong> {
  const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();

  const updatedSamples = await Promise.all(
    loadedSong.samples.map(async (sample) => {
      if (sample.base64Data) {
        try {
          const arrBuf = base64ToArrayBuffer(sample.base64Data);
          const decoded = await decodeAudioBufferSafe(arrBuf, ctx);
          return { ...sample, buffer: decoded.buffer };
        } catch (e) {
          console.error('Failed to restore sample sound buffer:', sample.name, e);
        }
      }
      return sample;
    })
  );

  return { ...loadedSong, samples: updatedSamples };
}
