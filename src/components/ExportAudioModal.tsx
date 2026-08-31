/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Music, Disc, X, Check, Loader2, Sparkles, FileAudio, Info, Archive, Layers, Cpu, Video } from 'lucide-react';
import { RetroChipSystem, TrackerSong } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { renderSongToAudioBuffer, audioBufferToWavBlob, audioBufferToMp3Blob } from '../utils/audioExporter';
import { parseDataUrlImage } from '../utils/id3Writer';
import { exportMODFile } from '../utils/modFormat';
import { exportStemsZip } from '../utils/stemsExporter';
import { exportSIDFile, exportPRGFile } from '../utils/sidExporter';
import { getAvailableExportFormats, detectSongSystem } from '../utils/exportFilters';
import { trackEvent } from '../utils/analytics';

interface ExportAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: TrackerSong;
  onShowToast: (msg: string) => void;
  activeSystem?: RetroChipSystem | null;
  onOpenVisualizerStudio?: () => void;
}

export const ExportAudioModal: React.FC<ExportAudioModalProps> = ({
  isOpen,
  onClose,
  song,
  onShowToast,
  activeSystem,
  onOpenVisualizerStudio,
}) => {
  const detectedSystem = detectSongSystem(song, activeSystem);
  const availableFormats = getAvailableExportFormats(song, activeSystem);

  const [format, setFormat] = useState<'trk' | 'mp3' | 'wav' | 'stems' | 'mod' | 'sid' | 'prg' | 'video'>(() => {
    return (availableFormats.includes('mp3') ? 'mp3' : availableFormats[0]) as any;
  });
  const [bitrate, setBitrate] = useState<number>(192);
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const cancelRef = React.useRef<boolean>(false);

  const handleCancelModal = () => {
    cancelRef.current = true;
    setIsExporting(false);
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      cancelRef.current = false;
      setIsExporting(false);
      setProgressPercent(0);
      setStatusText('');
      if (!availableFormats.includes(format as any)) {
        const nextFmt = availableFormats.find(f => ['trk', 'mp3', 'wav', 'stems', 'mod', 'sid', 'prg'].includes(f)) || 'wav';
        setFormat(nextFmt as any);
      }
    }
  }, [isOpen, detectedSystem]);

  // Calculate approximate duration
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

  // Estimate file sizes
  const estimatedWavMb = ((totalSeconds * 44100 * 2 * 2) / (1024 * 1024)).toFixed(1);
  const estimatedMp3Mb = ((totalSeconds * (bitrate * 1000 / 8)) / (1024 * 1024)).toFixed(2);
  const estimatedStemsMb = (parseFloat(estimatedWavMb) * (song.channelsCount + 1)).toFixed(1);

  const handleStartExport = async () => {
    cancelRef.current = false;
    setIsExporting(true);
    setProgressPercent(5);
    setStatusText('Preparing export...');

    const safeFilename = (song.name || 'tracker_song').replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      if (format === 'trk') {
        setStatusText('Saving SYN Tracker Project File...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 80));
        if (cancelRef.current) return;

        const jsonStr = JSON.stringify(song, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.trk`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported ${safeFilename}.trk`);
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
        return;
      }

      if (format === 'video') {
        setIsExporting(false);
        onClose();
        if (onOpenVisualizerStudio) {
          onOpenVisualizerStudio();
        }
        return;
      }

      if (format === 'mod') {
        setStatusText('Encoding Amiga MOD (8CHN / 4CHN)...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 100));
        if (cancelRef.current) return;
        
        const modBytes = exportMODFile(song);
        const blob = new Blob([modBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.mod`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported ${safeFilename}.mod (${song.channelsCount} Channels)`);
        trackEvent('export_file', { format: 'mod', channels: song.channelsCount, system: detectedSystem });
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
        return;
      }

      if (format === 'stems') {
        setStatusText('Rendering multi-track stems...');
        const zipBlob = await exportStemsZip(
          song,
          audioEngine.fxSettings,
          (status, pct) => {
            if (cancelRef.current) return;
            setStatusText(status);
            setProgressPercent(pct);
          },
          () => cancelRef.current
        );

        if (cancelRef.current) return;

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}_stems.zip`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported ${safeFilename}_stems.zip (${(zipBlob.size / 1024 / 1024).toFixed(1)} MB)`);
        trackEvent('export_file', { format: 'stems', system: detectedSystem });
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
        return;
      }

      if (format === 'sid') {
        setStatusText('Encoding 3-Voice Commodore 64 PSID v2...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 80));
        if (cancelRef.current) return;

        const sidBytes = exportSIDFile(song);
        const blob = new Blob([sidBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.sid`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported C64 ${safeFilename}.sid (3 Hardware Voices)`);
        trackEvent('export_file', { format: 'sid', system: 'c64' });
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
        return;
      }

      if (format === 'prg') {
        setStatusText('Building C64 6502 Executable binary ($1000)...');
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 80));
        if (cancelRef.current) return;

        const prgBytes = exportPRGFile(song);
        const blob = new Blob([prgBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.prg`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported C64 ${safeFilename}.prg`);
        trackEvent('export_file', { format: 'prg', system: 'c64' });
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
        return;
      }

      // Audio DSP Render (WAV / MP3)
      const isMp3Format = format === 'mp3';
      setStatusText('Initializing tracker audio pipeline...');
      setProgressPercent(10);
      await new Promise(r => setTimeout(r, 60));
      
      const audioBuffer = await renderSongToAudioBuffer(
        song,
        audioEngine.fxSettings,
        (status, pct) => {
          if (cancelRef.current) return;
          setStatusText(status);
          if (pct !== undefined) {
            const mappedPct = Math.round(10 + (pct * (isMp3Format ? 0.40 : 0.75)));
            setProgressPercent(mappedPct);
          }
        },
        () => cancelRef.current
      );

      if (cancelRef.current) return;

      if (format === 'wav') {
        setStatusText('Packaging 16-bit 44.1kHz Stereo WAV...');
        setProgressPercent(90);
        await new Promise(r => setTimeout(r, 50));
        if (cancelRef.current) return;
        
        const wavBlob = audioBufferToWavBlob(audioBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.wav`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported ${safeFilename}.wav (${(wavBlob.size / 1024 / 1024).toFixed(1)} MB)`);
        trackEvent('export_file', { format: 'wav', system: detectedSystem });
      } else {
        // MP3 encoding via LameJS with ID3v2 metadata & APIC album cover embedding
        setStatusText(`Encoding MP3 (${bitrate} kbps)... 0%`);
        setProgressPercent(50);
        await new Promise(r => setTimeout(r, 20));
        if (cancelRef.current) return;

        const id3Data = {
          title: song.name || 'Untitled Track',
          artist: song.artist || 'SYN-Tracker Artist',
          album: song.album || 'SYN-Tracker Releases',
          year: song.year || new Date().getFullYear().toString(),
          genre: song.genre || 'Chiptune / Tracker',
          image: song.coverArt ? parseDataUrlImage(song.coverArt) || undefined : undefined,
        };

        const mp3Blob = await audioBufferToMp3Blob(
          audioBuffer,
          bitrate,
          (pct) => {
            if (cancelRef.current) return;
            setStatusText(`Encoding MP3 (${bitrate} kbps)... ${pct}%`);
            setProgressPercent(50 + Math.round(pct * 0.45));
          },
          id3Data,
          () => cancelRef.current
        );

        if (cancelRef.current) return;

        setStatusText('Attaching ID3v2 Tags & Cover Art...');
        setProgressPercent(98);
        await new Promise(r => setTimeout(r, 40));
        if (cancelRef.current) return;

        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.mp3`;
        a.click();
        URL.revokeObjectURL(url);

        setProgressPercent(100);
        onShowToast(`Exported ${safeFilename}.mp3 (${(mp3Blob.size / 1024 / 1024).toFixed(1)} MB)`);
        trackEvent('export_file', { format: 'mp3', bitrate, system: detectedSystem });
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err: any) {
      if (err?.message === 'Render cancelled' || cancelRef.current) {
        setIsExporting(false);
        onShowToast('Export abgebrochen');
        return;
      }
      console.error('Export failed:', err);
      onShowToast('Audio Export Error: ' + ((err as Error)?.message || 'Export failed'));
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="export-audio-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
          onClick={handleCancelModal}
        >
          <motion.div 
            key="export-audio-modal-card"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 15, opacity: 0, transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="w-full max-w-xl rounded-2xl bg-[#101722]/95 border border-[#2a3c53] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#23354a] flex items-center justify-between bg-[#0b1017]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f8fafc] font-display flex items-center gap-2">
                Pro Audio Export Studio
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Export <span className="text-[#38bdf8] font-mono">{song.name || 'Back on Track'}</span> ({song.channelsCount} CH, {formattedDuration})
              </p>
            </div>
          </div>

          <button
            onClick={handleCancelModal}
            title={isExporting ? "Export abbrechen" : "Schließen"}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* 1. Format Selection */}
          <div>
            <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block mb-2 font-mono">
              Export Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {/* TRK PROJECT FILE */}
              {availableFormats.includes('trk') && (
                <button
                  type="button"
                  onClick={() => setFormat('trk')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'trk'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    Syn Project File <span className="text-[#38bdf8] font-mono">(.TRK)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    Native Project
                  </span>
                </button>
              )}

              {/* MP3 */}
              {availableFormats.includes('mp3') && (
                <button
                  type="button"
                  onClick={() => setFormat('mp3')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'mp3'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    Audio File <span className="text-[#38bdf8] font-mono">(.MP3)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    ~{estimatedMp3Mb} MB
                  </span>
                </button>
              )}

              {/* WAV */}
              {availableFormats.includes('wav') && (
                <button
                  type="button"
                  onClick={() => setFormat('wav')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'wav'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    Master Audio <span className="text-[#38bdf8] font-mono">(.WAV)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    ~{estimatedWavMb} MB
                  </span>
                </button>
              )}

              {/* STEMS ZIP */}
              {availableFormats.includes('stems') && (
                <button
                  type="button"
                  onClick={() => setFormat('stems')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'stems'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    Multitrack Stems <span className="text-[#38bdf8] font-mono">(.ZIP)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    ~{estimatedStemsMb} MB
                  </span>
                </button>
              )}

              {/* Amiga MOD */}
              {availableFormats.includes('mod') && (
                <button
                  type="button"
                  onClick={() => setFormat('mod')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'mod'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    Amiga Module <span className="text-[#38bdf8] font-mono">(.MOD)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    ProTracker
                  </span>
                </button>
              )}

              {/* C64 SID */}
              {availableFormats.includes('sid') && (
                <button
                  type="button"
                  onClick={() => setFormat('sid')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'sid'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    C64 Format <span className="text-[#38bdf8] font-mono">(.SID)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    PSID v2
                  </span>
                </button>
              )}

              {/* C64 PRG */}
              {availableFormats.includes('prg') && (
                <button
                  type="button"
                  onClick={() => setFormat('prg')}
                  disabled={isExporting}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    format === 'prg'
                      ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#f8fafc]">
                    C64 Executable <span className="text-[#38bdf8] font-mono">(.PRG)</span>
                  </span>
                  <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                    C64 Binary
                  </span>
                </button>
              )}

              {/* VIDEO VISUALIZER */}
              <button
                type="button"
                onClick={() => setFormat('video')}
                disabled={isExporting}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  format === 'video'
                    ? 'bg-[#14263b] border-[#38bdf8] text-[#f8fafc] shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                    : 'bg-[#090d14]/70 border-white/10 hover:border-white/20 text-[#94a3b8]'
                }`}
              >
                <span className="text-xs font-bold text-[#f8fafc]">
                  Video <span className="text-[#38bdf8] font-mono">(.MP4 /.WEBM)</span>
                </span>
                <span className="text-[10px] text-[#64748b] leading-tight mt-1">
                  Visualizer Studio
                </span>
              </button>
            </div>
          </div>

          {format === 'video' && (
            <div className="p-3.5 rounded-xl bg-[#090d14]/80 border border-[#f472b6]/30 flex items-start gap-2.5 text-xs text-[#cbd5e1]">
              <Video className="w-4 h-4 text-[#f472b6] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#f472b6] mb-1">
                  Music Visualizer Video Studio
                </p>
                <p className="text-[#94a3b8] leading-relaxed">
                  Öffnet das Visualizer Studio mit animierten Audio-Spektren, Branding-Logos und automatischer 60 FPS Aufzeichnung.
                </p>
              </div>
            </div>
          )}

          {/* 2. Format Specific Options */}
          {format === 'mp3' && (
            <div className="p-3.5 rounded-xl bg-[#090d14]/80 border border-white/10 space-y-2">
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider block font-mono">
                MP3 Bitrate (Audioqualität)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { rate: 128, label: '128 kbps', desc: 'Sehr klein' },
                  { rate: 192, label: '192 kbps (Standard)', desc: 'Optimal' },
                  { rate: 320, label: '320 kbps', desc: 'Max. Qualität' },
                ].map((b) => (
                  <button
                    key={b.rate}
                    type="button"
                    onClick={() => setBitrate(b.rate)}
                    disabled={isExporting}
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      bitrate === b.rate
                        ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8] font-bold'
                        : 'bg-[#0e141d] border-white/5 text-[#94a3b8] hover:border-white/15'
                    }`}
                  >
                    <div className="text-xs font-mono">{b.label}</div>
                    <div className="text-[10px] opacity-70">{b.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {format === 'stems' && (
            <div className="p-3.5 rounded-xl bg-[#090d14]/80 border border-white/10 flex items-start gap-2.5 text-xs text-[#cbd5e1]">
              <Archive className="w-4 h-4 text-[#fb923c] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#fb923c] mb-1">
                  Multi-Track Stems ZIP Paket ({song.channelsCount} Spuren + Master Mix)
                </p>
                <p className="text-[#94a3b8] leading-relaxed">
                  Exportiert jede einzelne Tonspur deines Songs als isolierte, synchronisierte 16-Bit WAV-Datei sowie den kompletten Master-Mix. Ideal zum Importieren in DAWs wie Ableton Live, Logic, FL Studio oder Reaper für Mastering und Gesangsaufnahmen.
                </p>
              </div>
            </div>
          )}

          {format === 'mod' && (
            <div className="p-3.5 rounded-xl bg-[#090d14]/80 border border-white/10 flex items-start gap-2.5 text-xs text-[#cbd5e1]">
              <Info className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#34d399] mb-1">
                  8-Kanal MOD Kompatibilität
                </p>
                <p className="text-[#94a3b8] leading-relaxed">
                  Deine {song.channelsCount} Kanäle werden mit dem standardisierten Amiga <span className="font-mono text-[#f8fafc]">8CHN</span>-Tag exportiert. Diese Datei kann in allen Tracker-Programmen (OpenMPT, MilkyTracker, Renoise) oder modernen Amiga-Playern voll mit 8 Spuren wiedergegeben und editiert werden.
                </p>
              </div>
            </div>
          )}

          {/* Progress / Status Display during render */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-[#0b1017] border border-[#38bdf8]/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#38bdf8] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {statusText}
                </span>
                <span className="text-[#f8fafc] font-bold">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#16202c] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#38bdf8] via-[#c084fc] to-[#fb923c] transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#23354a] bg-[#0b1017]/80 flex items-center justify-between">
          <div className="text-[11px] text-[#64748b] font-mono">
            Dauer: <span className="text-[#cbd5e1]">{formattedDuration}</span> &bull; Channels: <span className="text-[#cbd5e1]">{song.channelsCount}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancelModal}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#94a3b8] hover:text-[#f8fafc] hover:bg-white/5 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>

            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                format === 'video'
                  ? 'bg-[#f472b6] hover:bg-[#f472b6]/80 text-[#210419] shadow-[0_0_15px_rgba(244,114,182,0.4)]'
                  : format === 'mp3'
                  ? 'bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#02182b] shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  : format === 'wav'
                  ? 'bg-[#c084fc] hover:bg-[#d8b4fe] text-[#1e0836] shadow-[0_0_15px_rgba(192,132,252,0.4)]'
                  : format === 'stems'
                  ? 'bg-[#fb923c] hover:bg-[#fdba74] text-[#2c1204] shadow-[0_0_15px_rgba(251,146,60,0.4)]'
                  : 'bg-[#34d399] hover:bg-[#6ee7b7] text-[#022214] shadow-[0_0_15px_rgba(52,211,153,0.4)]'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Wird exportiert...</span>
                </>
              ) : format === 'video' ? (
                <>
                  <Video className="w-3.5 h-3.5" />
                  <span>Visualizer Studio öffnen</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {format === 'mp3' ? 'MP3 jetzt herunterladen' : format === 'wav' ? 'WAV jetzt herunterladen' : format === 'stems' ? 'STEMS ZIP herunterladen' : 'MOD Datei herunterladen'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
