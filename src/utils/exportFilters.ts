/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RetroChipSystem, TrackerSong } from '../types';

export type ExportFormatId = 'trk' | 'browser' | 'mod' | 'sid' | 'prg' | 'wav' | 'mp3' | 'stems';

/**
 * Determines the active retro system based on explicit system flag, channels count, and instrument signatures
 */
export function detectSongSystem(
  song: TrackerSong,
  activeSystem?: RetroChipSystem | null
): RetroChipSystem {
  if (activeSystem) return activeSystem;
  if (song.system) return song.system;

  // 3-Channels or SID configs -> C64 SID
  if (song.channelsCount === 3 || song.samples.some(s => !!s.sidConfig)) {
    return 'c64';
  }

  // 16-Channels -> SYN-Tracker Workstation
  if (song.channelsCount === 16) {
    return 'trk';
  }

  // Check if samples contain GameBoy / NES / Mega Drive tags
  const hasGb = song.samples.some(s => s.name?.includes('GB ') || s.name?.includes('GameBoy') || s.name?.includes('DMG'));
  if (hasGb || (song.channelsCount === 4 && song.name?.toLowerCase().includes('gameboy'))) return 'gameboy';

  const hasNes = song.samples.some(s => s.name?.includes('NES ') || s.name?.includes('2A03'));
  if (hasNes || (song.channelsCount === 5 && song.name?.toLowerCase().includes('nes'))) return 'nes';

  const hasMd = song.samples.some(s => s.name?.includes('FM ') || s.name?.includes('Mega Drive') || s.name?.includes('MD ') || s.name?.includes('YM2612'));
  if (hasMd || (song.channelsCount === 6 && song.name?.toLowerCase().includes('mega'))) return 'megadrive';

  // 4 or 8 channels default to Amiga / Retro tracker
  if (song.channelsCount === 4 || song.channelsCount === 8) {
    return 'amiga';
  }

  return 'trk';
}

/**
 * Returns strictly the export formats that make functional and musical sense for the given project type:
 * - C64: .TRK, Browser, .SID, .PRG, .WAV, .MP3, .ZIP (Stems)
 * - Amiga: .TRK, Browser, .MOD (4/8 CH), .WAV, .MP3, .ZIP (Stems)
 * - NES / Game Boy / Mega Drive: .TRK, Browser, .WAV, .MP3, .ZIP (Stems) (NO .SID/.PRG/.MOD)
 * - Standard Workstation (.TRK): .TRK, Browser, .MOD (if 4/8 CH), .WAV, .MP3, .ZIP (Stems) (NO .SID/.PRG)
 */
export function getAvailableExportFormats(
  song: TrackerSong,
  activeSystem?: RetroChipSystem | null
): ExportFormatId[] {
  const system = detectSongSystem(song, activeSystem);

  switch (system) {
    case 'c64':
      // C64 SID Mode: Supports native 3-voice PSID v2 & 6502 PRG, plus standard audio/project formats.
      return ['trk', 'browser', 'sid', 'prg', 'wav', 'mp3', 'stems'];

    case 'amiga':
      // Amiga Mode: Supports Amiga ProTracker / SoundTracker .MOD (4/8 CH) and standard audio formats.
      if (song.channelsCount === 4 || song.channelsCount === 8) {
        return ['trk', 'browser', 'mod', 'wav', 'mp3', 'stems'];
      }
      return ['trk', 'browser', 'wav', 'mp3', 'stems'];

    case 'gameboy':
    case 'nes':
    case 'megadrive':
      // Retro Consoles: .TRK, Browser Storage, Master WAV, MP3, Multitrack Stems.
      // EXCLUDES .SID / .PRG (C64 specific) and .MOD (Amiga specific).
      return ['trk', 'browser', 'wav', 'mp3', 'stems'];

    case 'trk':
    default:
      // Flagship SYN-Tracker Studio (.TRK):
      if (song.channelsCount === 4 || song.channelsCount === 8) {
        return ['trk', 'browser', 'mod', 'wav', 'mp3', 'stems'];
      }
      return ['trk', 'browser', 'wav', 'mp3', 'stems'];
  }
}

