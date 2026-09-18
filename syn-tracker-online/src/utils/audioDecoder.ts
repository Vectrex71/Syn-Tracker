/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Universal Audio Decoder for SynTracker
 * Seamlessly decodes:
 * 1. Standard Web Audio formats (WAV, MP3, OGG, AAC, FLAC)
 * 2. Amiga IFF 8SVX audio files (with VHDR metadata, loop points & Fibonacci delta decompression)
 * 3. Raw signed 8-bit Amiga PCM samples (ST-01..ST-115 SoundTracker instruments)
 * 4. Raw unsigned 8-bit PCM
 */

const FIBONACCI_DELTA_TABLE = [
  -34, -21, -13, -8, -5, -3, -2, -1,
  0, 1, 2, 3, 5, 8, 13, 21
];

export interface DecodedAmigaAudio {
  buffer: AudioBuffer;
  sampleRate: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  baseNote: number;
  isIff8svx: boolean;
}

/**
 * Decompress Fibonacci-delta encoded 8-bit audio chunk
 */
function decompressFibonacciDelta(input: Uint8Array, outputLength: number): Int8Array {
  const output = new Int8Array(outputLength);
  if (input.length < 2) return output;

  // First 2 bytes are padding/initial value
  let currentVal = input[1] > 127 ? input[1] - 256 : input[1];
  let outIdx = 0;

  for (let i = 2; i < input.length && outIdx < outputLength; i++) {
    const byte = input[i];
    const hiNibble = (byte >> 4) & 0x0f;
    const loNibble = byte & 0x0f;

    currentVal = Math.max(-128, Math.min(127, currentVal + FIBONACCI_DELTA_TABLE[hiNibble]));
    output[outIdx++] = currentVal;

    if (outIdx < outputLength) {
      currentVal = Math.max(-128, Math.min(127, currentVal + FIBONACCI_DELTA_TABLE[loNibble]));
      output[outIdx++] = currentVal;
    }
  }

  return output;
}

/**
 * Try parsing buffer as IFF 8SVX format
 */
export function tryDecodeIff8svx(
  arrayBuffer: ArrayBuffer,
  audioCtx: AudioContext
): DecodedAmigaAudio | null {
  if (arrayBuffer.byteLength < 16) return null;

  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  // Check "FORM" magic (0x464F524D)
  if (view.getUint32(0, false) !== 0x464F524D) return null;

  // Check form type "8SVX" (0x38535658)
  const formType = view.getUint32(8, false);
  if (formType !== 0x38535658) return null;

  let oneShotHiSamples = 0;
  let repeatHiSamples = 0;
  let samplesPerSec = 16574;
  let sCompression = 0;
  let pcmData: Int8Array | null = null;

  let offset = 12;
  const totalLen = arrayBuffer.byteLength;

  while (offset + 8 <= totalLen) {
    const chunkId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, false);
    const chunkDataOffset = offset + 8;

    if (chunkId === 'VHDR' && chunkSize >= 20) {
      oneShotHiSamples = view.getUint32(chunkDataOffset, false);
      repeatHiSamples = view.getUint32(chunkDataOffset + 4, false);
      const samplesPerSecRaw = view.getUint16(chunkDataOffset + 12, false);
      if (samplesPerSecRaw > 0) samplesPerSec = samplesPerSecRaw;
      sCompression = view.getUint8(chunkDataOffset + 15);
    } else if (chunkId === 'BODY') {
      const bodyBytes = bytes.subarray(chunkDataOffset, Math.min(totalLen, chunkDataOffset + chunkSize));
      if (sCompression === 1) {
        // Fibonacci delta compression
        const totalSamples = oneShotHiSamples + repeatHiSamples || bodyBytes.length * 2;
        pcmData = decompressFibonacciDelta(bodyBytes, totalSamples);
      } else {
        // Raw signed 8-bit PCM
        pcmData = new Int8Array(bodyBytes.length);
        for (let i = 0; i < bodyBytes.length; i++) {
          const b = bodyBytes[i];
          pcmData[i] = b > 127 ? b - 256 : b;
        }
      }
    }

    // Chunks are 2-byte aligned
    offset = chunkDataOffset + chunkSize + (chunkSize % 2 === 1 ? 1 : 0);
  }

  if (!pcmData || pcmData.length === 0) return null;

  const sampleCount = pcmData.length;
  const audioBuf = audioCtx.createBuffer(1, sampleCount, samplesPerSec);
  const channelData = audioBuf.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    channelData[i] = pcmData[i] / 128.0;
  }

  const loopEnabled = repeatHiSamples > 0;
  const loopStart = oneShotHiSamples;
  const loopEnd = oneShotHiSamples + repeatHiSamples;

  return {
    buffer: audioBuf,
    sampleRate: samplesPerSec,
    loopStart: loopEnabled ? loopStart : 0,
    loopEnd: loopEnabled ? loopEnd : sampleCount,
    loopEnabled,
    baseNote: 60,
    isIff8svx: true,
  };
}

/**
 * Decode raw 8-bit signed PCM audio data (standard Amiga ST sample files)
 */
export function decodeRawSignedPcm(
  arrayBuffer: ArrayBuffer,
  audioCtx: AudioContext,
  sampleRate = 16574
): AudioBuffer {
  const bytes = new Uint8Array(arrayBuffer);
  const len = Math.max(1, bytes.length);
  const audioBuf = audioCtx.createBuffer(1, len, sampleRate);
  const channelData = audioBuf.getChannelData(0);

  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    const s8 = b > 127 ? b - 256 : b;
    channelData[i] = s8 / 128.0;
  }

  return audioBuf;
}

/**
 * Universal safe audio decoder.
 * Always produces a valid AudioBuffer and never throws.
 */
export async function decodeAudioBufferSafe(
  arrayBuffer: ArrayBuffer,
  audioCtx: AudioContext,
  sampleRate = 16574
): Promise<{
  buffer: AudioBuffer;
  loopStart?: number;
  loopEnd?: number;
  loopEnabled?: boolean;
}> {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    // Return a short silence buffer
    const silentBuf = audioCtx.createBuffer(1, 256, sampleRate);
    return { buffer: silentBuf };
  }

  // 1. Check if it's an Amiga IFF-8SVX audio container
  try {
    const iffResult = tryDecodeIff8svx(arrayBuffer, audioCtx);
    if (iffResult) {
      return {
        buffer: iffResult.buffer,
        loopStart: iffResult.loopStart,
        loopEnd: iffResult.loopEnd,
        loopEnabled: iffResult.loopEnabled,
      };
    }
  } catch (e) {
    // Fall through
  }

  // 2. Check if it's a standard WAV/AIFF/MP3/OGG file by trying native decodeAudioData
  // Note: decodeAudioData detaches the arrayBuffer, so we pass a slice clone!
  try {
    const cloned = arrayBuffer.slice(0);
    const nativeBuf = await audioCtx.decodeAudioData(cloned);
    if (nativeBuf && nativeBuf.length > 0) {
      return { buffer: nativeBuf };
    }
  } catch (nativeErr) {
    // If standard decode failed, it is likely a raw Amiga signed 8-bit PCM sample!
  }

  // 3. Fallback: Decode as raw signed 8-bit Amiga PCM sample
  try {
    const rawBuf = decodeRawSignedPcm(arrayBuffer, audioCtx, sampleRate);
    return { buffer: rawBuf };
  } catch (rawErr) {
    // 4. Last resort: Return silence
    const silentBuf = audioCtx.createBuffer(1, 256, sampleRate);
    return { buffer: silentBuf };
  }
}
