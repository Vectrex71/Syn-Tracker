/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { TrackerSong } from '../types';
import { MasterFxSettings } from '../lib/audioEngine';
import { renderSongToAudioBuffer, audioBufferToWavBlob } from './audioExporter';

/**
 * Export all active song tracks/channels as individual synchronized 16-bit WAV stems bundled in a ZIP.
 */
export async function exportStemsZip(
  song: TrackerSong,
  fxSettings: MasterFxSettings,
  onProgress?: (status: string, percent: number) => void,
  isCancelled?: () => boolean
): Promise<Blob> {
  const zip = new JSZip();
  const safeSongName = (song.name || 'tracker_song').replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = zip.folder(`${safeSongName}_stems`) || zip;
  const numChannels = song.channelsCount || 8;

  if (isCancelled?.()) throw new Error('Render cancelled');

  // 1. Render Full Master Mix
  if (onProgress) onProgress('Rendering Master Mix...', 5);
  const masterBuf = await renderSongToAudioBuffer(song, fxSettings, undefined, isCancelled);
  if (isCancelled?.()) throw new Error('Render cancelled');
  const masterWav = audioBufferToWavBlob(masterBuf);
  folder.file(`${safeSongName}_Master_Mix.wav`, masterWav);

  // 2. Render each isolated Channel Stem
  for (let ch = 0; ch < numChannels; ch++) {
    if (isCancelled?.()) throw new Error('Render cancelled');
    const chNum = (ch + 1).toString().padStart(2, '0');
    const chName = `Track_${chNum}`;
    const pct = Math.round(15 + ((ch + 1) / numChannels) * 75);

    if (onProgress) {
      onProgress(`Rendering Stem ${ch + 1}/${numChannels} (${chName})...`, pct);
    }

    // Create a copy of the song where only channel 'ch' has notes/volume (others silenced)
    const isolatedSong: TrackerSong = {
      ...song,
      patterns: song.patterns.map((pat) => ({
        ...pat,
        channels: pat.channels.map((chanArr, cIdx) => {
          if (cIdx === ch) return chanArr;
          // Return empty steps for all other channels
          return chanArr.map(() => ({
            note: null,
            instrument: null,
            volume: null,
            effectCode: null,
            effectVal: null,
          }));
        }),
      })),
    };

    // Render stem without global master reverb/delay wash to keep stems clean for DAW mixdown
    const stemFxSettings: MasterFxSettings = {
      ...fxSettings,
      filterEnabled: false,
      delayEnabled: false,
      reverbEnabled: false,
    };

    const stemBuffer = await renderSongToAudioBuffer(isolatedSong, stemFxSettings, undefined, isCancelled);
    if (isCancelled?.()) throw new Error('Render cancelled');
    const stemWav = audioBufferToWavBlob(stemBuffer);
    folder.file(`${safeSongName}_Stem_${chNum}_${chName}.wav`, stemWav);
    
    // Yield to browser UI
    await new Promise((r) => setTimeout(r, 10));
  }

  // 3. Generate README / Info text file
  const infoText = `Song: ${song.name || 'Untitled'}\nBPM: ${song.bpm || 125}\nSpeed: ${song.speed || 6}\nChannels: ${numChannels}\nPatterns: ${song.patterns.length}\nRendered with ProTracker Web Audio Workstation.\nFormat: 16-bit 44.1kHz Stereo WAV Stems\n`;
  folder.file('README_STEMS.txt', infoText);

  if (onProgress) onProgress('Compressing ZIP bundle...', 95);
  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(`Packaging ZIP archive: ${Math.round(metadata.percent)}%`, 95 + Math.round(metadata.percent * 0.05));
    }
  });

  if (onProgress) onProgress('Ready', 100);
  return zipBlob;
}
