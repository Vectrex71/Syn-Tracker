/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  Download, 
  HardDrive, 
  Database, 
  Disc, 
  Music, 
  Layers, 
  X, 
  Check, 
  Loader2, 
  Sliders, 
  Sparkles, 
  FileText,
  Clock,
  Radio,
  HelpCircle,
  FolderDown,
  Info,
  Cpu,
  Video,
  Film
} from 'lucide-react';
import { TrackerSong, LocalSavedSongMeta, RetroChipSystem } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { renderSongToAudioBuffer, audioBufferToWavBlob, audioBufferToMp3Blob } from '../utils/audioExporter';
import { parseDataUrlImage } from '../utils/id3Writer';
import { exportMODFile } from '../utils/modFormat';
import { exportStemsZip } from '../utils/stemsExporter';
import { exportSIDFile, exportPRGFile } from '../utils/sidExporter';
import { saveLocalSong, listLocalSongs } from '../lib/indexedDB';
import { getAvailableExportFormats, detectSongSystem, ExportFormatId } from '../utils/exportFilters';

export type SaveFormatType = ExportFormatId | 'video';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: TrackerSong;
  onUpdateSongName: (name: string) => void;
  onShowToast: (msg: string) => void;
  initialFormat?: SaveFormatType;
  activeSystem?: RetroChipSystem | null;
  onOpenVisualizerStudio?: () => void;
}

// Convert AudioBuffer to 16-bit WAV ArrayBuffer helper
function audioBufferToWavArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
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

  // Write RIFF
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false);

  // Write fmt
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // Write data
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataSize, true);

  let offset = 44;
  if (numChannels === 1) {
    for (let i = 0; i < samples; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  } else {
    const rightChannelData = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : channelData;
    for (let i = 0; i < samples; i++) {
      const sL = Math.max(-1, Math.min(1, channelData[i]));
      const sR = Math.max(-1, Math.min(1, rightChannelData[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
      view.setInt16(offset + 2, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
      offset += 4;
    }
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  song,
  onUpdateSongName,
  onShowToast,
  initialFormat = 'trk',
  activeSystem,
  onOpenVisualizerStudio,
}) => {
  const detectedSystem = detectSongSystem(song, activeSystem);
  const availableFormats = getAvailableExportFormats(song, activeSystem);

  const [songName, setSongName] = useState(song.name || 'Back on Track');
  const [selectedFormat, setSelectedFormat] = useState<SaveFormatType>(() => {
    return (initialFormat === 'video' || (availableFormats as string[]).includes(initialFormat)) ? initialFormat : (availableFormats[0] || 'trk');
  });
  const [mp3Bitrate, setMp3Bitrate] = useState<number>(192);
  const [embedSamples, setEmbedSamples] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [existingVaultSaves, setExistingVaultSaves] = useState<LocalSavedSongMeta[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<boolean>(false);

  const handleCancelModal = () => {
    cancelRef.current = true;
    setIsProcessing(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      cancelRef.current = false;
      setSongName(song.name || 'Back on Track');
      const validInitial = (initialFormat === 'video' || (availableFormats as string[]).includes(initialFormat)) ? initialFormat : (availableFormats[0] || 'trk');
      setSelectedFormat(validInitial);
      setIsProcessing(false);
      setProgressPercent(0);
      setStatusMessage('');
      
      // Fetch browser local saves to show helpful context
      listLocalSongs().then(setExistingVaultSaves).catch(() => {});
      
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
          nameInputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, song.name, initialFormat, detectedSystem]);

  // Compute stats
  let totalSeconds = 0;
  for (let ord = 0; ord < song.orderList.length; ord++) {
    const patId = song.orderList[ord];
    const pattern = song.patterns.find(p => p.id === patId) || song.patterns[0];
    const rows = pattern ? pattern.length : 64;
    const tickDuration = 2.5 / (song.bpm || 125);
    const lineDuration = (song.speed || 6) * tickDuration;
    totalSeconds += rows * lineDuration;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const cleanFilename = (songName.trim() || 'tracker_project').replace(/[^a-zA-Z0-9_\-]/g, '_');

  const handleExecuteSave = async () => {
    cancelRef.current = false;
    const trimmedTitle = songName.trim() || 'Untitled Track';
    onUpdateSongName(trimmedTitle);

    const workingSong: TrackerSong = {
      ...song,
      name: trimmedTitle,
    };

    setIsProcessing(true);
    setProgressPercent(5);
    setStatusMessage('Preparing project data...');

    try {
      if (selectedFormat === 'trk') {
        // 1. SAVE AS .TRK PROJECT JSON FILE
        setStatusMessage('Serializing patterns & instruments...');
        setProgressPercent(40);
        await new Promise(r => setTimeout(r, 80));

        const serializedSamples = workingSong.samples.map((sm) => {
          let b64 = sm.base64Data;
          if (embedSamples && !b64 && sm.buffer) {
            try {
              const wavArrBuf = audioBufferToWavArrayBuffer(sm.buffer);
              b64 = arrayBufferToBase64(wavArrBuf);
            } catch (e) {
              console.error('Could not serialize audio buffer for sample:', sm.name, e);
            }
          }
          return {
            ...sm,
            buffer: null,
            base64Data: embedSamples ? b64 : undefined,
          };
        });

        const songToSave: TrackerSong = {
          ...workingSong,
          samples: serializedSamples,
        };

        setProgressPercent(80);
        const jsonStr = JSON.stringify(songToSave, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFilename}.trk`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Saved Project: ${cleanFilename}.trk`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);

      } else if (selectedFormat === 'browser') {
        // 2. SAVE TO INDEXEDDB BROWSER VAULT
        setStatusMessage('Saving to Browser Vault (IndexedDB)...');
        setProgressPercent(40);
        
        const songId = trimmedTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || `song_${Date.now()}`;
        const serializedSamples = workingSong.samples.map((sm) => {
          let b64 = sm.base64Data;
          if (!b64 && sm.buffer) {
            try {
              const wavArrBuf = audioBufferToWavArrayBuffer(sm.buffer);
              b64 = arrayBufferToBase64(wavArrBuf);
            } catch (e) {
              console.error('Could not serialize sample for browser DB:', sm.name, e);
            }
          }
          return {
            ...sm,
            buffer: null,
            base64Data: b64,
          };
        });

        const serialized = {
          ...workingSong,
          samples: serializedSamples,
        };

        await saveLocalSong(songId, trimmedTitle, serialized);
        setProgressPercent(100);
        onShowToast(`Saved to Browser Vault: "${trimmedTitle}"`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);

      } else if (selectedFormat === 'mod') {
        // 3. EXPORT AMIGA .MOD FILE
        setStatusMessage('Encoding Amiga Soundtracker MOD binary...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 100));
        
        const modBytes = exportMODFile(workingSong);
        const modBlob = new Blob([modBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(modBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFilename}.mod`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported Amiga MOD: ${cleanFilename}.mod`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);

      } else if (selectedFormat === 'wav' || selectedFormat === 'mp3') {
        // 4. RENDER STEREO AUDIO MIXDOWN (WAV/MP3)
        const isMp3 = selectedFormat === 'mp3';
        setStatusMessage(`Initializing DSP mixdown (${isMp3 ? 'MP3' : 'WAV'})...`);
        setProgressPercent(10);
        
        const renderedBuffer = await renderSongToAudioBuffer(
          workingSong,
          audioEngine.fxSettings,
          (status, pct) => {
            if (cancelRef.current) return;
            setStatusMessage(status);
            if (pct !== undefined) {
              const mapped = Math.round(10 + (pct * (isMp3 ? 0.45 : 0.75)));
              setProgressPercent(mapped);
            }
          },
          () => cancelRef.current
        );

        if (cancelRef.current) return;

        let finalBlob: Blob;
        let ext: string;

        if (isMp3) {
          setStatusMessage(`Encoding MP3 (${mp3Bitrate} kbps)... 0%`);
          setProgressPercent(55);
          await new Promise(r => setTimeout(r, 30));
          if (cancelRef.current) return;

          const id3Data = {
            title: workingSong.name || 'Untitled Track',
            artist: workingSong.artist || 'SYN-Tracker Artist',
            album: workingSong.album || 'SYN-Tracker Releases',
            year: workingSong.year || new Date().getFullYear().toString(),
            genre: workingSong.genre || 'Chiptune / Tracker',
            image: workingSong.coverArt ? parseDataUrlImage(workingSong.coverArt) || undefined : undefined,
          };
          finalBlob = await audioBufferToMp3Blob(
            renderedBuffer,
            mp3Bitrate,
            (encProgress) => {
              if (cancelRef.current) return;
              setStatusMessage(`Encoding MP3 (${mp3Bitrate} kbps)... ${encProgress}%`);
              setProgressPercent(55 + Math.round(encProgress * 0.42));
            },
            id3Data,
            () => cancelRef.current
          );
          ext = 'mp3';
        } else {
          setStatusMessage('Packaging 16-Bit 44.1kHz Stereo WAV...');
          setProgressPercent(95);
          finalBlob = audioBufferToWavBlob(renderedBuffer);
          ext = 'wav';
        }

        if (cancelRef.current) return;

        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFilename}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported ${ext.toUpperCase()}: ${cleanFilename}.${ext}`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);

      } else if (selectedFormat === 'stems') {
        // 5. EXPORT MULTITRACK AUDIO STEMS ZIP
        setStatusMessage('Rendering multitrack stems ZIP...');
        const zipBlob = await exportStemsZip(
          workingSong,
          audioEngine.fxSettings,
          (status, pct) => {
            if (cancelRef.current) return;
            setStatusMessage(status);
            setProgressPercent(pct);
          },
          () => cancelRef.current
        );

        if (cancelRef.current) return;

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFilename}_stems.zip`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported Stems ZIP: ${cleanFilename}_stems.zip`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);

      } else if (selectedFormat === 'sid') {
        // 6. EXPORT COMMODORE 64 PSID v2 FILE
        setStatusMessage('Encoding 3-Voice Commodore 64 PSID v2...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 80));
        if (cancelRef.current) return;

        const sidBytes = exportSIDFile(workingSong);
        const sidBlob = new Blob([sidBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(sidBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFilename}.sid`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported C64 SID: ${cleanFilename}.sid (3 Hardware Voices)`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);

      } else if (selectedFormat === 'prg') {
        // 7. EXPORT COMMODORE 64 PRG EXECUTABLE BINARY
        setStatusMessage('Building Commodore 64 6502 Executable ($1000)...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 80));
        if (cancelRef.current) return;

        const prgBytes = exportPRGFile(workingSong);
        const prgBlob = new Blob([prgBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(prgBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cleanFilename}.prg`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported C64 PRG: ${cleanFilename}.prg`);
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 300);
      } else if (selectedFormat === 'video') {
        // 8. OPEN VIDEO VISUALIZER STUDIO
        setIsProcessing(false);
        onClose();
        if (onOpenVisualizerStudio) {
          onOpenVisualizerStudio();
        } else {
          onShowToast('Visualizer Studio option selected');
        }
      }
    } catch (err: any) {
      if (err?.message === 'Render cancelled' || cancelRef.current) {
        setIsProcessing(false);
        onShowToast('Export cancelled');
        return;
      }
      console.error('Save failed:', err);
      setIsProcessing(false);
      alert(`Save / Export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="save-project-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/45 backdrop-blur-lg z-50 flex items-center justify-center p-3 sm:p-4 select-none"
          onClick={handleCancelModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancelModal();
          }}
        >
          <motion.div 
            key="save-project-modal-card"
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ 
              y: 40, 
              opacity: 0, 
              scale: 0.96, 
              transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] } 
            }}
            transition={{ 
              duration: 0.4, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            className="bg-[#0c1422] border border-sky-500/40 ring-1 ring-sky-400/20 w-full max-w-2xl rounded-2xl shadow-[0_0_60px_rgba(56,189,248,0.25)] flex flex-col overflow-hidden text-[#cbd5e1]"
            onClick={(e) => e.stopPropagation()}
          >
        {/* MODAL HEADER */}
        <div className="shrink-0 bg-[#0f1a2c] border-b border-sky-500/30 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8] shadow-inner">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[#f8fafc] font-display tracking-wide uppercase flex items-center gap-2">
                <span>Save & Export Project</span>
                {detectedSystem === 'c64' ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 font-bold">
                    C64 SID ({song.channelsCount}-VOICES)
                  </span>
                ) : detectedSystem === 'amiga' ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 font-bold">
                    AMIGA .MOD ({song.channelsCount} CH)
                  </span>
                ) : detectedSystem === 'gameboy' ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-400 border border-sky-400/30 font-bold">
                    GAME BOY ({song.channelsCount}-CH DMG)
                  </span>
                ) : detectedSystem === 'nes' ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-400/15 text-rose-400 border border-rose-400/30 font-bold">
                    NES ({song.channelsCount}-CH 2A03)
                  </span>
                ) : detectedSystem === 'megadrive' ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-400/15 text-purple-400 border border-purple-400/30 font-bold">
                    MEGA DRIVE ({song.channelsCount}-CH FM)
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                    SYN-TRACKER ({song.channelsCount} CH)
                  </span>
                )}
              </h2>
              <p className="text-[10.5px] text-[#64748b]">
                Filtered for your active project type ({detectedSystem.toUpperCase()}) — only compatible formats shown.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelModal}
            title={isProcessing ? "Cancel Export" : "Close"}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#f8fafc] hover:bg-[#1f2d3f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 space-y-3 overflow-hidden flex flex-col justify-between">
          <div className="space-y-2.5">
            {/* 1. SONG TITLE & FILENAME */}
            <div className="bg-[#121c29] border border-[#223347] px-3 py-2 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#f1f5f9] flex items-center gap-1.5 uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Song Title / Project Name</span>
                </label>
                <span className="text-[10.5px] font-mono text-[#64748b]">
                  Target: <span className="text-[#38bdf8] font-bold">
                    {cleanFilename}
                    {selectedFormat === 'trk' ? '.trk' : selectedFormat === 'mod' ? '.mod' : selectedFormat === 'sid' ? '.sid' : selectedFormat === 'prg' ? '.prg' : selectedFormat === 'wav' ? '.wav' : selectedFormat === 'mp3' ? '.mp3' : selectedFormat === 'stems' ? '_stems.zip' : ''}
                  </span>
                </span>
              </div>
              
              <input
                ref={nameInputRef}
                type="text"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isProcessing) {
                    handleExecuteSave();
                  }
                }}
                placeholder="e.g. Back on Track"
                maxLength={40}
                className="w-full bg-[#0b111a] border border-[#2a3c53] focus:border-[#38bdf8] text-[#f8fafc] px-3 py-1 rounded-md text-xs font-mono outline-none shadow-inner transition-colors"
              />
            </div>

            {/* 2. CHOOSE STORAGE / EXPORT TARGET */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#f1f5f9] uppercase tracking-wide flex items-center gap-1.5">
                  <FolderDown className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Choose Format &amp; Destination</span>
                </label>
                <span className="text-[10.5px] text-[#64748b]">
                  Duration: <span className="text-[#94a3b8] font-mono font-medium">{formattedDuration}</span> • BPM: <span className="text-[#94a3b8] font-mono font-medium">{song.bpm}</span>
                </span>
              </div>

              {/* Informational callout for Retro Consoles explaining why they export as .TRK / Studio Audio rather than binary ROMs */}
              {(detectedSystem === 'nes' || detectedSystem === 'gameboy' || detectedSystem === 'megadrive') && (
                <div className="mb-2 p-2.5 rounded-lg bg-[#0b131f] border border-[#1e2d3e] flex items-start gap-2.5 text-[11px] text-[#94a3b8] leading-tight">
                  <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#f8fafc] font-semibold block">
                      Why are {detectedSystem === 'nes' ? 'NES (.NSF)' : detectedSystem === 'gameboy' ? 'Game Boy (.GBS)' : 'Mega Drive (.VGM)'} direct exports not listed?
                    </span>
                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">
                      Vintage {detectedSystem === 'nes' ? 'NES' : detectedSystem === 'gameboy' ? 'Game Boy' : 'Mega Drive'} files are compiled machine code/register streams. To keep your work 100% editable, save as <strong className="text-[#38bdf8]">.TRK</strong> (or Browser Storage). For listening and sharing, export lossless <strong className="text-[#f1f5f9]">.WAV</strong>, <strong className="text-[#f1f5f9]">.MP3</strong>, or multitrack <strong className="text-[#f1f5f9]">.ZIP</strong> stems.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {/* Option A: .TRK Project File */}
              {availableFormats.includes('trk') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('trk')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'trk'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    SYN Project File <span className="text-[#38bdf8] font-mono">(.TRK)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Full editable project with synth DSP, notes &amp; master rack FX.
                  </p>
                </button>
              )}

              {/* Option B: Browser Vault */}
              {availableFormats.includes('browser') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('browser')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'browser'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">Browser Storage</span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Save in local browser storage for instant reload without downloading files.
                  </p>
                </button>
              )}

              {/* Option C: Amiga .MOD (Visible ONLY for Amiga / compatible 4/8-track songs) */}
              {availableFormats.includes('mod') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mod')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'mod'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    Amiga Module <span className="text-[#38bdf8] font-mono">(.MOD)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    ProTracker / Soundtracker format for Amiga hardware, MilkyTracker, OpenMPT.
                  </p>
                </button>
              )}

              {/* Option D: C64 .SID (Visible ONLY for C64 3-Voice songs) */}
              {availableFormats.includes('sid') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('sid')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'sid'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    C64 Format <span className="text-[#38bdf8] font-mono">(.SID)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Standard 3-voice C64 SID tune with 6502 machine code playroutine.
                  </p>
                </button>
              )}

              {/* Option E: C64 .PRG Executable (Visible ONLY for C64 songs) */}
              {availableFormats.includes('prg') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('prg')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'prg'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    C64 Executable <span className="text-[#38bdf8] font-mono">(.PRG)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Standalone runnable C64 binary for Commodore 64 or emulator.
                  </p>
                </button>
              )}

              {/* Option F: WAV Lossless Audio (Universal) */}
              {availableFormats.includes('wav') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('wav')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'wav'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    Master Audio <span className="text-[#38bdf8] font-mono">(.WAV)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Uncompressed stereo master audio mix with full master rack FX.
                  </p>
                </button>
              )}

              {/* Option G: MP3 Audio (Universal) */}
              {availableFormats.includes('mp3') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp3')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'mp3'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    Audio File <span className="text-[#38bdf8] font-mono">(.MP3)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Compressed stereo audio file, ideal for sharing on web, chat, or phone.
                  </p>
                </button>
              )}

              {/* Option H: Multitrack Stems (Universal) */}
              {availableFormats.includes('stems') && (
                <button
                  type="button"
                  onClick={() => setSelectedFormat('stems')}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedFormat === 'stems'
                      ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                      : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                  }`}
                >
                  <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                    Multitrack Stems <span className="text-[#38bdf8] font-mono">(.ZIP)</span>
                  </span>
                  <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                    Individual WAV stems for all {song.channelsCount} tracks for mixing in DAWs.
                  </p>
                </button>
              )}

              {/* Option I: Video Visualizer Studio */}
              <button
                type="button"
                onClick={() => setSelectedFormat('video')}
                className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedFormat === 'video'
                    ? 'bg-[#16273b] border-[#38bdf8] text-[#f8fafc] shadow-md ring-1 ring-[#38bdf8]/40'
                    : 'bg-[#121c29]/90 border-[#223347] text-[#94a3b8] hover:border-sky-500/40 hover:bg-[#152130]'
                }`}
              >
                <span className="font-bold text-xs text-[#f8fafc] block leading-tight">
                  Video <span className="text-[#38bdf8] font-mono">(.MP4 /.WEBM)</span>
                </span>
                <p className="text-[10.5px] text-[#64748b] mt-0.5 leading-tight">
                  Spectrum visualizer, logos &amp; customizable styles for YouTube &amp; Reels.
                </p>
              </button>
            </div>
          </div>
        </div>

          {/* 3. FORMAT SPECIFIC CUSTOMIZATIONS / SPEC INFO (FIXED HEIGHT CONTAINER) */}
          <div className="shrink-0">
            {selectedFormat === 'trk' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="embedSamples"
                    checked={embedSamples}
                    onChange={(e) => setEmbedSamples(e.target.checked)}
                    className="rounded bg-[#0b111a] border-[#2a3c53] text-[#38bdf8] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                  />
                  <label htmlFor="embedSamples" className="text-[#f1f5f9] cursor-pointer text-xs font-medium">
                    Embed custom sample audio waveforms inside .trk file
                  </label>
                </div>
                <span className="text-[10.5px] text-[#64748b] font-mono">
                  {song.samples.length} instruments
                </span>
              </div>
            )}

            {selectedFormat === 'mp3' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-1.5 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#f1f5f9] font-medium text-xs">MP3 Export Quality:</span>
                <div className="flex items-center gap-1 bg-[#0b111a] p-0.5 rounded border border-[#223347]">
                  {[128, 192, 320].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setMp3Bitrate(rate)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        mp3Bitrate === rate ? 'bg-[#38bdf8] text-[#0b111a] font-bold shadow-sm' : 'text-[#64748b] hover:text-[#cbd5e1]'
                      }`}
                    >
                      {rate} kbps
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedFormat === 'browser' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  Instant browser database storage • Quick reload without file downloading
                </span>
                <span className="font-mono text-[10px] text-[#34d399] px-2 py-0.5 rounded bg-[#34d399]/10 border border-[#34d399]/30">
                  {existingVaultSaves.length} cached
                </span>
              </div>
            )}

            {selectedFormat === 'mod' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  Amiga ProTracker V2.3a format • 8-bit signed PCM audio • Hardware compatible
                </span>
                <span className="font-mono text-[10px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/30">
                  {song.channelsCount} CH MOD
                </span>
              </div>
            )}

            {selectedFormat === 'sid' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  Commodore 64 SID tune • Standard 3-voice 6502 machine code playroutine
                </span>
                <span className="font-mono text-[10px] text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  PSID V2
                </span>
              </div>
            )}

            {selectedFormat === 'prg' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  Commodore 64 Standalone Executable • Ready for real C64 hardware or VICE emulator
                </span>
                <span className="font-mono text-[10px] text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  C64 PRG
                </span>
              </div>
            )}

            {selectedFormat === 'wav' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  44.1 kHz / 16-Bit Stereo uncompressed master audio mix • Master Rack FX included
                </span>
                <span className="font-mono text-[10px] text-[#38bdf8] px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30">
                  LOSSLESS
                </span>
              </div>
            )}

            {selectedFormat === 'stems' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  Individual high quality WAV stems for all {song.channelsCount} tracks in ZIP
                </span>
                <span className="font-mono text-[10px] text-[#38bdf8] px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30">
                  {song.channelsCount} STEMS
                </span>
              </div>
            )}

            {selectedFormat === 'video' && (
              <div className="bg-[#121c29] border border-[#223347] px-3.5 py-2 rounded-lg flex items-center justify-between text-xs h-[38px]">
                <span className="text-[#cbd5e1] text-xs">
                  Configurable spectrum bars, oscilloscope &amp; branding overlays for YouTube / Reels
                </span>
                <span className="font-mono text-[10px] text-[#38bdf8] px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/30">
                  STUDIO
                </span>
              </div>
            )}

            {/* PROGRESS & STATUS NOTIFIER */}
            {isProcessing && (
              <div className="mt-2 bg-[#152336] border border-[#38bdf8]/40 p-2.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#38bdf8] font-bold flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{statusMessage}</span>
                  </span>
                  <span className="font-mono text-[#7dd3fc] font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-[#0b111a] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#38bdf8] h-full transition-all duration-200" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="shrink-0 bg-[#0f1a2c] border-t border-sky-500/30 px-5 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancelModal}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#16253b] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteSave}
            disabled={isProcessing}
            className="px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#08121e] shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : selectedFormat === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                <span>Open Visualizer Studio (Video Exporter)</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {selectedFormat === 'browser' ? 'Save to Browser Vault' : `Save & Download (${cleanFilename}.${selectedFormat === 'stems' ? 'zip' : selectedFormat})`}
                </span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
