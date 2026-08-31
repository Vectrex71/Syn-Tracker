/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSong, TrackerPattern, TrackerStep, TrackerSample } from '../types';

// ProTracker 16-finetune period table (3 octaves, 36 notes each)
export const PROTRACKER_PERIODS: number[][] = [
  // Finetune 0
  [856,808,762,720,678,640,604,570,538,508,480,453, 428,404,381,360,339,320,302,285,269,254,240,226, 214,202,190,180,170,160,151,143,135,127,120,113],
  // Finetune 1
  [850,802,757,715,674,637,601,567,535,505,477,450, 425,401,379,357,337,318,300,284,268,253,239,225, 213,201,189,179,169,159,150,142,134,126,119,113],
  // Finetune 2
  [844,796,752,709,670,632,597,563,532,502,474,447, 422,398,376,355,335,316,298,282,266,251,237,224, 211,199,188,177,167,158,149,141,133,125,118,112],
  // Finetune 3
  [838,791,746,704,665,628,592,559,528,498,470,444, 419,395,373,352,332,314,296,280,264,249,235,222, 210,198,187,176,166,157,148,140,132,125,118,111],
  // Finetune 4
  [832,785,741,699,660,623,588,555,524,495,467,441, 416,392,370,350,330,312,294,278,262,247,233,220, 208,196,185,175,165,156,147,139,131,124,117,110],
  // Finetune 5
  [826,779,736,694,655,619,584,551,520,491,463,437, 413,390,368,347,328,309,292,276,260,245,232,219, 206,195,184,174,164,155,146,138,130,123,116,109],
  // Finetune 6
  [820,774,730,689,651,614,580,547,516,487,460,434, 410,387,365,345,325,307,290,274,258,244,230,217, 205,193,183,172,163,154,145,137,129,122,115,109],
  // Finetune 7
  [814,768,725,684,646,610,575,543,513,484,456,431, 407,384,363,342,323,305,288,272,256,242,228,216, 204,192,181,171,161,152,144,136,128,121,114,108],
  // Finetune -8 (8 in file)
  [907,856,808,762,720,678,640,604,570,538,508,480, 453,428,404,381,360,339,320,302,285,269,254,240, 226,214,202,190,180,170,160,151,143,135,127,120],
  // Finetune -7 (9 in file)
  [900,850,802,757,715,675,636,601,567,535,505,477, 450,425,401,379,357,337,318,300,284,268,253,238, 225,212,200,189,179,169,159,150,142,134,126,119],
  // Finetune -6 (10 in file)
  [894,844,796,752,709,669,631,596,563,531,501,473, 447,422,398,376,355,335,316,298,281,266,251,237, 223,211,199,188,177,167,158,149,141,133,125,118],
  // Finetune -5 (11 in file)
  [887,838,790,746,704,664,627,591,558,526,496,469, 444,419,395,373,352,332,313,296,279,263,248,234, 222,209,198,187,176,166,157,148,139,132,124,117],
  // Finetune -4 (12 in file)
  [881,832,785,740,699,659,622,587,554,523,493,465, 441,416,392,370,350,330,311,293,277,261,247,233, 220,208,196,185,175,165,156,147,138,131,123,116],
  // Finetune -3 (13 in file)
  [875,826,779,735,694,654,618,583,550,519,489,462, 437,413,390,368,347,327,309,291,275,260,245,231, 219,207,195,184,174,164,154,146,137,130,122,115],
  // Finetune -2 (14 in file)
  [868,820,774,730,689,650,613,579,546,515,486,458, 434,410,387,365,345,325,307,289,273,258,243,229, 217,205,193,183,172,163,153,145,136,129,121,115],
  // Finetune -1 (15 in file)
  [862,814,768,725,684,645,609,575,542,511,482,455, 431,407,384,363,342,323,304,287,271,256,241,228, 216,203,192,181,171,161,152,144,136,128,121,114]
];

// Base Period table for Amiga ProTracker note name lookup (Finetune 0)
const PERIOD_TABLE: { note: string; octave: number; period: number }[] = [
  { note: 'C-', octave: 1, period: 856 }, { note: 'C#', octave: 1, period: 808 },
  { note: 'D-', octave: 1, period: 762 }, { note: 'D#', octave: 1, period: 720 },
  { note: 'E-', octave: 1, period: 678 }, { note: 'F-', octave: 1, period: 640 },
  { note: 'F#', octave: 1, period: 604 }, { note: 'G-', octave: 1, period: 570 },
  { note: 'G#', octave: 1, period: 538 }, { note: 'A-', octave: 1, period: 508 },
  { note: 'A#', octave: 1, period: 480 }, { note: 'B-', octave: 1, period: 453 },

  { note: 'C-', octave: 2, period: 428 }, { note: 'C#', octave: 2, period: 404 },
  { note: 'D-', octave: 2, period: 381 }, { note: 'D#', octave: 2, period: 360 },
  { note: 'E-', octave: 2, period: 339 }, { note: 'F-', octave: 2, period: 320 },
  { note: 'F#', octave: 2, period: 302 }, { note: 'G-', octave: 2, period: 285 },
  { note: 'G#', octave: 2, period: 269 }, { note: 'A-', octave: 2, period: 254 },
  { note: 'A#', octave: 2, period: 240 }, { note: 'B-', octave: 2, period: 226 },

  { note: 'C-', octave: 3, period: 214 }, { note: 'C#', octave: 3, period: 202 },
  { note: 'D-', octave: 3, period: 190 }, { note: 'D#', octave: 3, period: 180 },
  { note: 'E-', octave: 3, period: 170 }, { note: 'F-', octave: 3, period: 160 },
  { note: 'F#', octave: 3, period: 151 }, { note: 'G-', octave: 3, period: 143 },
  { note: 'G#', octave: 3, period: 135 }, { note: 'A-', octave: 3, period: 127 },
  { note: 'A#', octave: 3, period: 120 }, { note: 'B-', octave: 3, period: 113 },

  { note: 'C-', octave: 4, period: 107 }, { note: 'C#', octave: 4, period: 101 },
  { note: 'D-', octave: 4, period: 95  }, { note: 'D#', octave: 4, period: 90  },
  { note: 'E-', octave: 4, period: 85  }, { note: 'F-', octave: 4, period: 80  },
  { note: 'F#', octave: 4, period: 75  }, { note: 'G-', octave: 4, period: 71  },
  { note: 'G#', octave: 4, period: 67  }, { note: 'A-', octave: 4, period: 63  },
  { note: 'A#', octave: 4, period: 60  }, { note: 'B-', octave: 4, period: 56  },
];

export function getAmigaPeriod(noteStr: string, finetune = 0): number {
  if (!noteStr || noteStr === 'OFF' || noteStr === '---') return 0;
  const clean = noteStr.trim().replace('--', '-');
  const match = clean.match(/^([A-G][#-]?)-?(\d+)$/i);
  if (!match) return 0;
  let name = match[1].toUpperCase();
  if (name.length === 1) name += '-';
  const octave = parseInt(match[2], 10);
  const noteIndex = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'].indexOf(name);
  if (noteIndex === -1 || isNaN(octave)) return 0;

  // Convert finetune (-8..+7) to table index (0..15)
  let ftIdx = 0;
  if (finetune < 0) {
    ftIdx = (finetune + 16) & 0x0f;
  } else {
    ftIdx = finetune & 0x0f;
  }

  const table = PROTRACKER_PERIODS[ftIdx] || PROTRACKER_PERIODS[0];
  const clampedOctave = Math.max(1, Math.min(3, octave));
  const semitoneInOctave = (clampedOctave - 1) * 12 + noteIndex;
  let basePeriod = table[semitoneInOctave] || 214;

  if (octave <= 0) {
    basePeriod = basePeriod * Math.pow(2, 1 - octave);
  } else if (octave > 3) {
    basePeriod = Math.max(1, Math.round(basePeriod / Math.pow(2, octave - 3)));
  }

  return basePeriod;
}

function periodToNoteStr(period: number): string | null {
  if (period <= 0) return null;
  let closest = PERIOD_TABLE[0];
  let minDiff = Math.abs(period - closest.period);

  for (let i = 1; i < PERIOD_TABLE.length; i++) {
    const diff = Math.abs(period - PERIOD_TABLE[i].period);
    if (diff < minDiff) {
      minDiff = diff;
      closest = PERIOD_TABLE[i];
    }
  }

  return `${closest.note}${closest.octave}`;
}

export function noteStrToPeriod(noteStr: string, finetune = 0): number {
  return getAmigaPeriod(noteStr, finetune);
}

// Convert ASCII bytes to string
function readAscii(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const charCode = view.getUint8(offset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
}

export function pcm8SignedToWavBuffer(pcmData: Uint8Array, sampleRate = 16574): ArrayBuffer {
  const len = pcmData.length;
  const dataSize = len * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16-bit
  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < len; i++) {
    let b = pcmData[i];
    let s8 = b > 127 ? b - 256 : b;
    let s16 = Math.floor((s8 / 128.0) * 32767);
    view.setInt16(offset, s16, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Parses a binary .MOD file (SoundTracker 15-sample, ProTracker 31-sample, 4, 6, 8 channel)
 */
export async function parseMODFile(buffer: ArrayBuffer, audioCtx: AudioContext): Promise<TrackerSong> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // 1. Song Title (20 bytes)
  const songTitle = readAscii(view, 0, 20) || 'Imported MOD';

  // Check tag at byte 1080 to determine if standard 31-sample MOD with tag
  let channelsCount = 4;
  let hasKnown31Tag = false;
  let tag = '';

  if (buffer.byteLength >= 1084) {
    tag = readAscii(view, 1080, 4);
    if (tag === 'M.K.' || tag === 'M!K!' || tag === 'FLT4' || tag === '4CHN') {
      channelsCount = 4;
      hasKnown31Tag = true;
    } else if (tag === '6CHN' || tag === 'FLT6') {
      channelsCount = 6;
      hasKnown31Tag = true;
    } else if (tag === '8CHN' || tag === 'CD81' || tag === 'OCTA' || tag === 'OKTA') {
      channelsCount = 8;
      hasKnown31Tag = true;
    } else if (tag.endsWith('CH') || tag.endsWith('CN')) {
      const ch = parseInt(tag.substring(0, 2), 10);
      if (!isNaN(ch) && ch >= 1 && ch <= 16) {
        channelsCount = ch;
        hasKnown31Tag = true;
      }
    }
  }

  // Determine if this is a 15-sample SoundTracker module vs 31-sample module
  let is15Sample = false;
  if (!hasKnown31Tag) {
    // If no 31-sample tag exists, analyze the 15-sample vs 31-sample file structure

    // 1. Check 15-sample structure (song length at 470, order table 472..599, patterns at 600)
    let valid15 = false;
    let sizeDiff15 = Infinity;
    let maxPat15 = 0;
    if (buffer.byteLength >= 600) {
      const songLen15 = view.getUint8(470);
      if (songLen15 >= 1 && songLen15 <= 128) {
        for (let i = 0; i < songLen15; i++) {
          const p = view.getUint8(472 + i);
          if (p > maxPat15) maxPat15 = p;
        }
        if (maxPat15 <= 64) {
          let totalSamples15 = 0;
          for (let i = 0; i < 15; i++) {
            const offset = 20 + i * 30;
            totalSamples15 += view.getUint16(offset + 22, false) * 2;
          }
          const expectedSize15 = 600 + (maxPat15 + 1) * 1024 + totalSamples15;
          sizeDiff15 = Math.abs(buffer.byteLength - expectedSize15);
          valid15 = true;
        }
      }
    }

    // 2. Check 31-sample structure (song length at 950, order table 952..1079, patterns at 1084)
    let valid31 = false;
    let sizeDiff31 = Infinity;
    let maxPat31 = 0;
    if (buffer.byteLength >= 1084) {
      const songLen31 = view.getUint8(950);
      let invalidSample31 = false;
      for (let i = 15; i < 31; i++) {
        const offset = 20 + i * 30;
        const vol = view.getUint8(offset + 25);
        if (vol > 64) {
          invalidSample31 = true;
          break;
        }
      }
      if (!invalidSample31 && songLen31 >= 1 && songLen31 <= 128) {
        for (let i = 0; i < songLen31; i++) {
          const p = view.getUint8(952 + i);
          if (p > maxPat31) maxPat31 = p;
        }
        if (maxPat31 <= 64) {
          let totalSamples31 = 0;
          for (let i = 0; i < 31; i++) {
            const offset = 20 + i * 30;
            totalSamples31 += view.getUint16(offset + 22, false) * 2;
          }
          const expectedSize31 = 1084 + (maxPat31 + 1) * 1024 + totalSamples31;
          sizeDiff31 = Math.abs(buffer.byteLength - expectedSize31);
          valid31 = true;
        }
      }
    }

    // Decision: If size matches 15-sample layout or is much closer to 15-sample layout
    if (valid15 && (!valid31 || sizeDiff15 < sizeDiff31 || sizeDiff15 <= 4)) {
      is15Sample = true;
    }
  }

  const numSampleHeaders = is15Sample ? 15 : 31;
  const samples: TrackerSample[] = [];
  const sampleLengths: number[] = [];
  const sampleLoopStarts: number[] = [];
  const sampleLoopLengths: number[] = [];

  // Read Sample Headers
  for (let i = 0; i < 31; i++) {
    if (i < numSampleHeaders) {
      const offset = 20 + i * 30;
      const name = readAscii(view, offset, 22);
      const lengthInWords = view.getUint16(offset + 22, false); // big-endian
      const finetuneByte = view.getUint8(offset + 24) & 0x0f;
      const volume = Math.min(64, view.getUint8(offset + 25));
      const repeatStartWords = view.getUint16(offset + 26, false);
      const repeatLengthWords = view.getUint16(offset + 28, false);

      const lengthBytes = lengthInWords * 2;
      let repeatStartBytes = repeatStartWords * 2;
      let repeatLengthBytes = repeatLengthWords * 2;

      // In 15-sample SoundTracker modules, repeatStart was in bytes in some versions
      if (is15Sample) {
        if (repeatStartWords >= lengthBytes) {
          repeatStartBytes = 0;
        } else if (repeatStartWords * 2 > lengthBytes && repeatStartWords < lengthBytes) {
          repeatStartBytes = repeatStartWords;
        }
        if (repeatLengthWords > 1 && repeatLengthWords * 2 > lengthBytes && repeatLengthWords <= lengthBytes) {
          repeatLengthBytes = repeatLengthWords;
        }
      }

      // Convert 4-bit unsigned finetune (0..15) to signed (-8..+7)
      const finetune = finetuneByte > 7 ? finetuneByte - 16 : finetuneByte;

      sampleLengths.push(lengthBytes);
      sampleLoopStarts.push(repeatStartBytes);
      sampleLoopLengths.push(repeatLengthBytes);

      const isLooping = repeatLengthBytes > 2 && repeatStartBytes < lengthBytes;
      const sanitizedLoopStart = Math.min(lengthBytes, repeatStartBytes);
      const sanitizedLoopEnd = isLooping
        ? Math.max(sanitizedLoopStart + 2, Math.min(lengthBytes, repeatStartBytes + repeatLengthBytes))
        : 0;

      samples.push({
        id: i,
        name: name || (lengthBytes > 0 ? `Sample ${(i + 1).toString().padStart(2, '0')}` : 'Empty'),
        filename: `${name || `sample_${i + 1}`}.wav`,
        buffer: null,
        sourceType: 'upload',
        synthType: 'square',
        volume,
        panning: 0,
        baseNote: 48, // Amiga C-3 (Period 214) = MIDI 48
        finetune: is15Sample ? 0 : finetune,
        loopEnabled: isLooping && sanitizedLoopEnd > sanitizedLoopStart,
        loopStart: sanitizedLoopStart,
        loopEnd: sanitizedLoopEnd,
        isAmigaModSample: true,
      });
    } else {
      sampleLengths.push(0);
      sampleLoopStarts.push(0);
      sampleLoopLengths.push(0);
      samples.push({
        id: i,
        name: 'Empty',
        filename: `sample_${i + 1}.wav`,
        buffer: null,
        sourceType: 'upload',
        synthType: 'square',
        volume: 64,
        panning: 0,
        baseNote: 48,
        finetune: 0,
        loopEnabled: false,
        loopStart: 0,
        loopEnd: 0,
      });
    }
  }

  // 3. Song Length & Order Table
  const songLengthOffset = is15Sample ? 470 : 950;
  const orderListOffset = is15Sample ? 472 : 952;
  const songLength = buffer.byteLength > songLengthOffset ? Math.max(1, Math.min(128, view.getUint8(songLengthOffset))) : 1;

  const orderListRaw: number[] = [];
  let maxPatternId = 0;

  for (let i = 0; i < 128; i++) {
    if (orderListOffset + i < buffer.byteLength) {
      const pat = view.getUint8(orderListOffset + i);
      orderListRaw.push(pat);
      if (i < songLength && pat > maxPatternId) {
        maxPatternId = pat;
      }
    }
  }

  const orderList = orderListRaw.slice(0, Math.max(1, songLength));
  const totalPatterns = maxPatternId + 1;

  // 4. Pattern Data (Starts at byte 600 for 15-sample, byte 1084 for 31-sample)
  let patOffset = is15Sample ? 600 : 1084;
  const patterns: TrackerPattern[] = [];

  for (let p = 0; p < totalPatterns; p++) {
    const channels: TrackerStep[][] = Array.from({ length: channelsCount }, () => []);

    for (let row = 0; row < 64; row++) {
      for (let ch = 0; ch < channelsCount; ch++) {
        if (patOffset + 4 > buffer.byteLength) {
          channels[ch].push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
          continue;
        }

        const b0 = bytes[patOffset];
        const b1 = bytes[patOffset + 1];
        const b2 = bytes[patOffset + 2];
        const b3 = bytes[patOffset + 3];
        patOffset += 4;

        // In 15-sample MODs, sample number is 4-bit in b0 only
        const sampleNum = is15Sample ? ((b0 & 0xf0) >> 4) : ((b0 & 0xf0) | ((b2 & 0xf0) >> 4));
        const period = ((b0 & 0x0f) << 8) | b1;
        const effectCodeNum = b2 & 0x0f;
        let effectVal = b3;

        const noteStr = periodToNoteStr(period);
        const instIndex = sampleNum > 0 && sampleNum <= 31 ? sampleNum - 1 : null;

        // Map effect code
        let effectCodeStr: string | null = null;
        let effectValNum: number | null = null;

        if (effectCodeNum !== 0 || effectVal !== 0) {
          effectCodeStr = effectCodeNum.toString(16).toUpperCase();
          effectValNum = effectVal;

          // In SoundTracker / NoiseTracker / MED-converted modules, F with value 0x1F (31) or 0x10..0x20 was the VBL tempo slider (1F = 31 = 125 BPM)
          if (effectCodeStr === 'F' && (effectVal === 0x1F || (is15Sample && effectVal >= 0x10 && effectVal <= 0x20))) {
            effectValNum = Math.max(32, Math.min(255, Math.round((effectVal * 125) / 31)));
          }
        }

        channels[ch].push({
          note: noteStr,
          instrument: instIndex,
          volume: null,
          effectCode: effectCodeStr,
          effectVal: effectValNum,
          period: period > 0 ? period : null,
        });
      }
    }

    patterns.push({
      id: p,
      name: `Pattern ${p.toString().padStart(2, '0')}`,
      length: 64,
      channels,
    });
  }

  // 5. Decode Sample Audio PCM (8-bit signed raw PCM -> WebAudio AudioBuffer)
  let pcmOffset = patOffset;
  for (let i = 0; i < numSampleHeaders; i++) {
    const len = sampleLengths[i];
    if (len > 0 && pcmOffset + len <= buffer.byteLength) {
      const pcmData = bytes.subarray(pcmOffset, pcmOffset + len);
      pcmOffset += len;

      // Amiga PAL C-3 frequency (Period 214) is 16574 Hz
      const sampleRate = 16574;
      const audioBuffer = audioCtx.createBuffer(1, len, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      // Convert 8-bit signed integer (-128 .. 127) to float32 (-1.0 .. 1.0)
      for (let s = 0; s < len; s++) {
        let sampleVal = pcmData[s];
        if (sampleVal >= 128) sampleVal -= 256;
        channelData[s] = sampleVal / 128.0;
      }

      samples[i].buffer = audioBuffer;
      samples[i].baseNote = 48; // MIDI 48 = C-3 = Period 214
      samples[i].sourceType = 'upload';
      try {
        const wavBuf = pcm8SignedToWavBuffer(pcmData, sampleRate);
        samples[i].base64Data = arrayBufferToBase64(wavBuf);
      } catch (e) {
        console.error('Could not generate base64 for MOD sample:', i, e);
      }
    }
  }

  return {
    name: songTitle,
    bpm: 125,
    speed: 6,
    channelsCount,
    orderList,
    patterns,
    samples,
  };
}

/**
 * Exports a TrackerSong to a standard ProTracker .MOD binary file
 */
export function exportMODFile(song: TrackerSong): Uint8Array {
  const numChannels = Math.min(8, Math.max(4, song.channelsCount));
  const numPatterns = song.patterns.length;
  
  // Calculate total required buffer size
  // 1084 bytes header + (numPatterns * 64 * numChannels * 4) + sample lengths
  let totalSampleBytes = 0;
  const sampleByteLengths: number[] = [];

  for (let i = 0; i < 31; i++) {
    const smp = song.samples[i];
    if (smp && smp.buffer) {
      // 8-bit mono raw PCM length (must be even length in bytes)
      let len = smp.buffer.length;
      if (len % 2 !== 0) len += 1;
      sampleByteLengths.push(len);
      totalSampleBytes += len;
    } else {
      sampleByteLengths.push(0);
    }
  }

  const patternDataSize = numPatterns * 64 * numChannels * 4;
  const totalFileSize = 1084 + patternDataSize + totalSampleBytes;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // 1. Write Title (20 bytes)
  const title = (song.name || 'Untitled MOD').padEnd(20, '\0').substring(0, 20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = title.charCodeAt(i);
  }

  // 2. Write 31 Sample Headers (30 bytes each)
  for (let i = 0; i < 31; i++) {
    const offset = 20 + i * 30;
    const smp = song.samples[i];
    const name = (smp?.name || '').padEnd(22, '\0').substring(0, 22);

    for (let c = 0; c < 22; c++) {
      bytes[offset + c] = name.charCodeAt(c);
    }

    const lengthInWords = Math.floor(sampleByteLengths[i] / 2);
    const finetuneVal = smp && smp.finetune !== undefined ? (smp.finetune < 0 ? smp.finetune + 16 : smp.finetune) & 0x0f : 0;
    view.setUint16(offset + 22, lengthInWords, false); // Big endian length
    view.setUint8(offset + 24, finetuneVal); // Finetune
    view.setUint8(offset + 25, smp ? Math.min(64, smp.volume) : 64); // Volume

    const loopStartWords = smp?.loopEnabled ? Math.floor(smp.loopStart / 2) : 0;
    const loopLengthWords = smp?.loopEnabled ? Math.floor((smp.loopEnd - smp.loopStart) / 2) : 1;

    view.setUint16(offset + 26, loopStartWords, false);
    view.setUint16(offset + 28, Math.max(1, loopLengthWords), false);
  }

  // 3. Write Song Length & Order Table
  view.setUint8(950, Math.min(128, song.orderList.length));
  view.setUint8(951, 127); // Restart byte

  for (let i = 0; i < 128; i++) {
    view.setUint8(952 + i, i < song.orderList.length ? song.orderList[i] : 0);
  }

  // 4. Tag Identifier (Byte 1080)
  const tagStr = numChannels === 4 ? 'M.K.' : `${numChannels}CHN`;
  for (let i = 0; i < 4; i++) {
    bytes[1080 + i] = tagStr.charCodeAt(i);
  }

  // 5. Write Pattern Data
  let patOffset = 1084;
  for (let p = 0; p < numPatterns; p++) {
    const pat = song.patterns[p];
    for (let row = 0; row < 64; row++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const step: TrackerStep = pat?.channels[ch]?.[row] || {
          note: null,
          instrument: null,
          volume: null,
          effectCode: null,
          effectVal: null,
        };

        const period = step.note ? noteStrToPeriod(step.note) : 0;
        const instIndex = step.instrument !== null ? step.instrument + 1 : 0;
        let effectCodeNum = 0;
        if (step.effectCode) {
          effectCodeNum = parseInt(step.effectCode, 16) || 0;
        }
        const effectVal = step.effectVal !== null ? step.effectVal : 0;

        const b0 = (instIndex & 0xf0) | ((period >> 8) & 0x0f);
        const b1 = period & 0xff;
        const b2 = ((instIndex & 0x0f) << 4) | (effectCodeNum & 0x0f);
        const b3 = effectVal & 0xff;

        bytes[patOffset] = b0;
        bytes[patOffset + 1] = b1;
        bytes[patOffset + 2] = b2;
        bytes[patOffset + 3] = b3;
        patOffset += 4;
      }
    }
  }

  // 6. Write Sample PCM Raw 8-bit Audio Data
  let pcmOffset = patOffset;
  for (let i = 0; i < 31; i++) {
    const smp = song.samples[i];
    const len = sampleByteLengths[i];
    if (smp && smp.buffer && len > 0) {
      const channelData = smp.buffer.getChannelData(0);
      for (let s = 0; s < len; s++) {
        const floatVal = s < channelData.length ? channelData[s] : 0;
        // Clamp float [-1.0 .. 1.0] to signed 8-bit [-128 .. 127]
        let intVal = Math.floor(floatVal * 127.0);
        if (intVal < -128) intVal = -128;
        if (intVal > 127) intVal = 127;
        // Store as byte (uint8)
        bytes[pcmOffset + s] = intVal < 0 ? intVal + 256 : intVal;
      }
      pcmOffset += len;
    }
  }

  return bytes;
}
