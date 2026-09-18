/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSong, TrackerPattern, TrackerStep, TrackerSample } from '../types';
import { CHIP_KITS, CHIP_INSTRUMENTS, createChipSample, ChipKitType } from '../lib/chipPresets';
import { parseSIDFileDetailed, ParsedSidDetailedResult } from './sidExporter';

export type RetroSystemKind = 'c64' | 'nes' | 'gameboy' | 'megadrive';

export interface RetroFileInfo {
  system: RetroSystemKind;
  systemName: string;
  chipName: string;
  channelsCount: number;
  fileName: string;
  title: string;
  author: string;
  released: string;
  isNativeSynTracker: boolean;
  format: string;
  song: TrackerSong;
}

/**
 * Builds a clean initial TrackerSong configured for the specific retro system
 */
function createRetroDefaultSong(
  system: RetroSystemKind,
  title: string,
  channelsCount: number,
  audioCtx?: AudioContext
): TrackerSong {
  const kitId: ChipKitType = system === 'c64' ? 'c64' : system === 'nes' ? 'nes' : system === 'gameboy' ? 'gameboy' : 'megadrive';
  const kit = CHIP_KITS.find((k) => k.id === kitId) || CHIP_KITS[0];

  const emptyChannels: TrackerStep[][] = Array.from({ length: channelsCount }).map(() =>
    Array.from({ length: 64 }).map(() => ({
      note: null,
      instrument: null,
      volume: null,
      effectCode: null,
      effectVal: null,
    }))
  );

  const initialPattern: TrackerPattern = {
    id: 0,
    name: 'Pattern 00',
    length: 64,
    channels: emptyChannels,
  };

  const samples: TrackerSample[] = Array.from({ length: 32 }, (_, idx) => {
    if (audioCtx && idx < kit.instruments.length) {
      const instDef = CHIP_INSTRUMENTS[kit.instruments[idx]];
      if (instDef) {
        return createChipSample(audioCtx, instDef, idx);
      }
    }
    return {
      id: idx,
      name: idx < kit.instruments.length ? CHIP_INSTRUMENTS[kit.instruments[idx]]?.name || `Sound ${idx + 1}` : `Sample ${(idx + 1).toString().padStart(2, '0')}`,
      filename: '',
      buffer: null,
      volume: 64,
      panning: 0.0,
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 0,
      baseNote: 60,
      sourceType: 'synth',
    };
  });

  return {
    name: title || (system === 'nes' ? 'NES Chiptune' : system === 'gameboy' ? 'Game Boy Chiptune' : system === 'megadrive' ? 'Mega Drive Chiptune' : 'C64 Chiptune'),
    bpm: 125,
    speed: 6,
    channelsCount,
    patterns: [initialPattern],
    orderList: [0],
    samples,
    system,
  };
}

/**
 * Extracts a null-terminated ASCII string from byte array
 */
function readNullTerminatedString(bytes: Uint8Array, start: number, maxLen: number): string {
  let str = '';
  for (let i = start; i < start + maxLen && i < bytes.length; i++) {
    if (bytes[i] === 0) break;
    str += String.fromCharCode(bytes[i]);
  }
  return str.trim();
}

/**
 * Parses Nintendo NES (.NSF / .NSFE) File Headers
 */
export async function parseNESFileDetailed(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  audioCtx?: AudioContext
): Promise<RetroFileInfo> {
  const bytes = new Uint8Array(arrayBuffer);
  const magic = String.fromCharCode(...bytes.slice(0, 4));

  let title = 'NES Soundtrack';
  let author = 'NES Composer';
  let released = 'Nintendo Famicom';
  let format = 'NSF';

  if (magic === 'NESM') {
    format = 'NSF (Ricoh 2A03)';
    const parsedTitle = readNullTerminatedString(bytes, 14, 32);
    const parsedArtist = readNullTerminatedString(bytes, 46, 32);
    const parsedCopyright = readNullTerminatedString(bytes, 78, 32);

    if (parsedTitle) title = parsedTitle;
    if (parsedArtist) author = parsedArtist;
    if (parsedCopyright) released = parsedCopyright;
  } else if (magic === 'NSFE') {
    format = 'NSFE (Extended)';
    title = fileName.replace(/\.[^/.]+$/, '');
  }

  const song = createRetroDefaultSong('nes', title, 5, audioCtx);

  return {
    system: 'nes',
    systemName: 'NES / Famicom',
    chipName: 'Ricoh 2A03 (5-CH APU)',
    channelsCount: 5,
    fileName,
    title,
    author,
    released,
    isNativeSynTracker: false,
    format,
    song,
  };
}

/**
 * Parses Nintendo Game Boy (.GBS) File Headers
 */
export async function parseGameBoyFileDetailed(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  audioCtx?: AudioContext
): Promise<RetroFileInfo> {
  const bytes = new Uint8Array(arrayBuffer);
  const magic = String.fromCharCode(...bytes.slice(0, 3));

  let title = 'Game Boy Soundtrack';
  let author = 'Game Boy Composer';
  let released = 'Nintendo Game Boy';
  let format = 'GBS (DMG-01)';

  if (magic === 'GBS') {
    const parsedTitle = readNullTerminatedString(bytes, 16, 32);
    const parsedAuthor = readNullTerminatedString(bytes, 48, 32);
    const parsedCopyright = readNullTerminatedString(bytes, 80, 32);

    if (parsedTitle) title = parsedTitle;
    if (parsedAuthor) author = parsedAuthor;
    if (parsedCopyright) released = parsedCopyright;
  } else {
    title = fileName.replace(/\.[^/.]+$/, '');
  }

  const song = createRetroDefaultSong('gameboy', title, 4, audioCtx);

  return {
    system: 'gameboy',
    systemName: 'Nintendo Game Boy',
    chipName: 'Sharp LR35902 APU (4-CH)',
    channelsCount: 4,
    fileName,
    title,
    author,
    released,
    isNativeSynTracker: false,
    format,
    song,
  };
}

/**
 * Parses Sega Mega Drive / Genesis (.VGM / .VGZ / .CYM) File Headers
 */
export async function parseMegaDriveFileDetailed(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  audioCtx?: AudioContext
): Promise<RetroFileInfo> {
  const bytes = new Uint8Array(arrayBuffer);
  const magic = String.fromCharCode(...bytes.slice(0, 4));

  let title = fileName.replace(/\.[^/.]+$/, '');
  let author = 'Sega Sound Team';
  let released = 'Sega Mega Drive / Genesis';
  let format = 'VGM (YM2612 + PSG)';

  if (magic === 'Vgm ') {
    format = 'VGM Stream';
    // Check if GD3 tag offset is present at offset 0x14 (little endian 32-bit offset relative to 0x14)
    if (bytes.length >= 0x18) {
      const gd3RelOffset = bytes[0x14] | (bytes[0x15] << 8) | (bytes[0x16] << 16) | (bytes[0x17] << 24);
      if (gd3RelOffset > 0) {
        const gd3Pos = 0x14 + gd3RelOffset;
        if (gd3Pos + 12 < bytes.length) {
          const gd3Magic = String.fromCharCode(...bytes.slice(gd3Pos, gd3Pos + 4));
          if (gd3Magic === 'Gd3 ') {
            // GD3 contains UTF-16LE strings: Track name (EN), Track name (JP), Game name (EN), etc.
            try {
              let ptr = gd3Pos + 12;
              const readUtf16 = () => {
                let s = '';
                while (ptr + 1 < bytes.length) {
                  const code = bytes[ptr] | (bytes[ptr + 1] << 8);
                  ptr += 2;
                  if (code === 0) break;
                  s += String.fromCharCode(code);
                }
                return s.trim();
              };
              const trackEn = readUtf16();
              /* const trackJp = */ readUtf16();
              const gameEn = readUtf16();
              /* const gameJp = */ readUtf16();
              const systemEn = readUtf16();
              /* const systemJp = */ readUtf16();
              const authorEn = readUtf16();
              /* const authorJp = */ readUtf16();
              const dateStr = readUtf16();

              if (trackEn) title = trackEn;
              else if (gameEn) title = gameEn;
              if (authorEn) author = authorEn;
              if (dateStr || systemEn) released = `${dateStr || ''} ${systemEn || 'Sega Genesis'}`.trim();
            } catch (e) {
              console.warn('GD3 tag parsing skipped:', e);
            }
          }
        }
      }
    }
  }

  const song = createRetroDefaultSong('megadrive', title, 6, audioCtx);

  return {
    system: 'megadrive',
    systemName: 'Sega Mega Drive / Genesis',
    chipName: 'Yamaha YM2612 (FM 6-CH) + SN76489 PSG',
    channelsCount: 6,
    fileName,
    title,
    author,
    released,
    isNativeSynTracker: false,
    format,
    song,
  };
}

/**
 * Universal auto-detection and parsing for all retro chiptune files:
 * - C64: .sid, .prg, .psid, .rsid
 * - NES: .nsf, .nsfe
 * - Game Boy: .gbs
 * - Mega Drive: .vgm, .vgz, .cym
 */
export async function parseRetroChiptuneFile(
  file: File | { name: string; arrayBuffer: () => Promise<ArrayBuffer> },
  audioCtx?: AudioContext
): Promise<RetroFileInfo | null> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const fileName = file.name.toLowerCase();

  // 1. Check C64 SID / PRG
  if (
    fileName.endsWith('.sid') ||
    fileName.endsWith('.prg') ||
    fileName.endsWith('.psid') ||
    fileName.endsWith('.rsid') ||
    String.fromCharCode(...bytes.slice(0, 4)) === 'PSID' ||
    String.fromCharCode(...bytes.slice(0, 4)) === 'RSID'
  ) {
    const detailed: ParsedSidDetailedResult = await parseSIDFileDetailed(arrayBuffer, audioCtx);
    return {
      system: 'c64',
      systemName: 'Commodore 64',
      chipName: 'MOS 6581 / 8580 SID (3-CH)',
      channelsCount: 3,
      fileName: file.name,
      title: detailed.title,
      author: detailed.author,
      released: detailed.released,
      isNativeSynTracker: detailed.isNativeSynTracker,
      format: detailed.format,
      song: detailed.song,
    };
  }

  // 2. Check NES / Famicom NSF
  if (
    fileName.endsWith('.nsf') ||
    fileName.endsWith('.nsfe') ||
    String.fromCharCode(...bytes.slice(0, 4)) === 'NESM' ||
    String.fromCharCode(...bytes.slice(0, 4)) === 'NSFE'
  ) {
    return parseNESFileDetailed(arrayBuffer, file.name, audioCtx);
  }

  // 3. Check Nintendo Game Boy GBS
  if (
    fileName.endsWith('.gbs') ||
    String.fromCharCode(...bytes.slice(0, 3)) === 'GBS'
  ) {
    return parseGameBoyFileDetailed(arrayBuffer, file.name, audioCtx);
  }

  // 4. Check Sega Mega Drive / Genesis VGM / VGZ / CYM
  if (
    fileName.endsWith('.vgm') ||
    fileName.endsWith('.vgz') ||
    fileName.endsWith('.cym') ||
    String.fromCharCode(...bytes.slice(0, 4)) === 'Vgm '
  ) {
    return parseMegaDriveFileDetailed(arrayBuffer, file.name, audioCtx);
  }

  return null;
}
