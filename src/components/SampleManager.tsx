/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, Layers, Scissors, Activity, Repeat, Trash2, Play, Volume2, Plus, Disc, Waves, Sliders } from 'lucide-react';
import { TrackerSample, KeyboardLayout, RetroChipSystem } from '../types';
import { midiToNote } from '../lib/audioEngine';
import { saveSampleData } from '../lib/indexedDB';
import { arrayBufferToBase64 } from '../utils/modFormat';
import { decodeAudioBufferSafe } from '../utils/audioDecoder';
import { AmigaDiskVaultModal } from './AmigaDiskVaultModal';
import { CHIP_ICON_MAP, CHIP_LABEL_MAP } from './HeaderControls';

// Convert AudioBuffer to 16-bit PCM WAV ArrayBuffer for persistent storage
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
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // Write fmt
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // Write data
  view.setUint32(36, 0x64617461, false); // "data"
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

interface SampleManagerProps {
  samples: TrackerSample[];
  selectedSampleIndex: number;
  audioCtx: AudioContext | null;
  keyboardLayout?: KeyboardLayout;
  activeChipSystem?: RetroChipSystem | null;
  isFxRackOpen?: boolean;
  onToggleFxRack?: () => void;
  onKeyboardLayoutChange?: (layout: KeyboardLayout) => void;
  onSelectSample: (index: number) => void;
  onUpdateSample: (index: number, updated: Partial<TrackerSample>) => void;
  onPlayPreview: (midiNote: number, sample: TrackerSample) => void;
  onAddSampleSlot?: () => void;
  onOpenAmigaVault?: () => void;
  onOpenSidSynth?: () => void;
  onOpenSynEditor?: () => void;
}

export const SampleManager: React.FC<SampleManagerProps> = ({
  samples,
  selectedSampleIndex,
  audioCtx,
  keyboardLayout,
  activeChipSystem,
  isFxRackOpen,
  onToggleFxRack,
  onKeyboardLayoutChange,
  onSelectSample,
  onUpdateSample,
  onPlayPreview,
  onAddSampleSlot,
  onOpenAmigaVault,
  onOpenSidSynth,
  onOpenSynEditor,
}) => {
  const activeSample = samples?.[selectedSampleIndex] || samples?.[0];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Selection range inside the waveform editor (in sample frames)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'adsr' | 'tuning'>('editor');
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Safely get or resume an AudioContext
  const getActiveAudioContext = (): AudioContext | null => {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }
    if (typeof window !== 'undefined') {
      try {
        const win = window as any;
        if (!win.__synTrackerCtx) {
          win.__synTrackerCtx = new (window.AudioContext || win.webkitAudioContext)();
        }
        if (win.__synTrackerCtx.state === 'suspended') {
          win.__synTrackerCtx.resume().catch(() => {});
        }
        return win.__synTrackerCtx;
      } catch (e) {
        console.error('Could not get audio context:', e);
      }
    }
    return null;
  };

  // Draw Sample Waveform with Loop Points & Selection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear Canvas
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 30; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Render wave if sample buffer is present
    if (activeSample && activeSample.buffer && activeSample.buffer.numberOfChannels > 0) {
      const buffer = activeSample.buffer;
      const data = buffer.getChannelData(0);
      const step = Math.ceil(data.length / width);
      
      const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#38bdf8';
      ctx.strokeStyle = themeAccent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const val = data[i * step + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }

        const y1 = ((min + 1) / 2) * height;
        const y2 = ((max + 1) / 2) * height;

        ctx.moveTo(i, y1);
        ctx.lineTo(i, y2);
      }
      ctx.stroke();

      // Draw Selected Region
      if (selectionRange && buffer.length > 0) {
        const selStartPct = Math.max(0, Math.min(1, selectionRange.start / buffer.length));
        const selEndPct = Math.max(0, Math.min(1, selectionRange.end / buffer.length));
        const x1 = Math.min(selStartPct, selEndPct) * width;
        const x2 = Math.max(selStartPct, selEndPct) * width;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(x1, 0, Math.max(2, x2 - x1), height);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, 0, Math.max(2, x2 - x1), height);
      }

      // Draw Loop markers if enabled
      if (activeSample.loopEnabled && buffer.length > 0) {
        const loopStartPct = Math.max(0, Math.min(1, activeSample.loopStart / buffer.length));
        const loopEndPct = Math.max(0, Math.min(1, activeSample.loopEnd / buffer.length));

        // Loop Region Highlight
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(loopStartPct * width, 0, (loopEndPct - loopStartPct) * width, height);

        // Loop Start Marker
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(loopStartPct * width, 0);
        ctx.lineTo(loopStartPct * width, height);
        ctx.stroke();

        // Loop End Marker
        ctx.strokeStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(loopEndPct * width, 0);
        ctx.lineTo(loopEndPct * width, height);
        ctx.stroke();
      }
    }
  }, [activeSample, selectionRange]);

  // Zero-crossing snap finder
  const findZeroCrossing = useCallback((buffer: AudioBuffer, targetSampleIdx: number, direction: 'forward' | 'backward' | 'nearest' = 'nearest') => {
    const data = buffer.getChannelData(0);
    const maxSearch = Math.min(1024, buffer.length);
    let bestIdx = Math.max(0, Math.min(buffer.length - 1, targetSampleIdx));

    if (direction === 'nearest') {
      let minVal = Math.abs(data[bestIdx]);
      for (let i = 1; i < maxSearch; i++) {
        const left = targetSampleIdx - i;
        if (left >= 0 && Math.abs(data[left]) < minVal) {
          minVal = Math.abs(data[left]);
          bestIdx = left;
          if (minVal < 0.001) break;
        }
        const right = targetSampleIdx + i;
        if (right < buffer.length && Math.abs(data[right]) < minVal) {
          minVal = Math.abs(data[right]);
          bestIdx = right;
          if (minVal < 0.001) break;
        }
      }
    }
    return bestIdx;
  }, []);

  // Snap loop points to nearest zero-crossings
  const handleSnapZeroCrossings = () => {
    if (!activeSample.buffer) return;
    const buf = activeSample.buffer;
    const newStart = findZeroCrossing(buf, activeSample.loopStart);
    const newEnd = findZeroCrossing(buf, activeSample.loopEnd);
    onUpdateSample(selectedSampleIndex, {
      loopStart: newStart,
      loopEnd: Math.max(newStart + 32, newEnd),
    });
  };

  // Waveform click & drag interaction for selection and loop points
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeSample.buffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = Math.max(0, Math.min(1, clickX / rect.width));
    const sampleIdx = Math.floor(clickPct * activeSample.buffer.length);

    setSelectionRange({ start: sampleIdx, end: sampleIdx });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeSample.buffer || !selectionRange) return;
    if (e.buttons !== 1) return; // Only if mouse is pressed
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = Math.max(0, Math.min(1, clickX / rect.width));
    const sampleIdx = Math.floor(clickPct * activeSample.buffer.length);

    setSelectionRange(prev => prev ? { ...prev, end: sampleIdx } : null);
  };

  // Helper to commit edited buffer to state, base64 persistence and preview
  const commitEditedBuffer = async (newBuf: AudioBuffer, extraProps: Partial<TrackerSample> = {}) => {
    try {
      const wavArrayBuf = audioBufferToWavArrayBuffer(newBuf);
      const base64Data = arrayBufferToBase64(wavArrayBuf);
      const sampleName = activeSample.name || `Sample_${selectedSampleIndex}`;
      await saveSampleData(sampleName, wavArrayBuf);

      const updatedSample: TrackerSample = {
        ...activeSample,
        buffer: newBuf,
        base64Data,
        loopEnd: Math.min(activeSample.loopEnd || newBuf.length, newBuf.length),
        ...extraProps,
      };

      onUpdateSample(selectedSampleIndex, updatedSample);
      onPlayPreview(updatedSample.baseNote || 36, updatedSample);
    } catch (err) {
      console.warn('Error saving edited audio:', err);
      onUpdateSample(selectedSampleIndex, { buffer: newBuf, ...extraProps });
    }
  };

  // Trim to selection
  const handleTrimToSelection = () => {
    const ctx = getActiveAudioContext();
    if (!activeSample.buffer || !ctx || !selectionRange) return;
    const buf = activeSample.buffer;
    const start = Math.min(selectionRange.start, selectionRange.end);
    const end = Math.max(selectionRange.start, selectionRange.end);
    const newLength = Math.max(64, end - start);

    const newBuf = ctx.createBuffer(buf.numberOfChannels, newLength, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      for (let i = 0; i < newLength; i++) {
        dst[i] = src[start + i] || 0;
      }
    }

    setSelectionRange(null);
    commitEditedBuffer(newBuf, {
      loopStart: 0,
      loopEnd: newLength,
    });
  };

  // Fade In Selection / Whole Sample
  const handleFadeIn = () => {
    const ctx = getActiveAudioContext();
    if (!activeSample.buffer || !ctx) return;
    const buf = activeSample.buffer;
    const start = selectionRange ? Math.min(selectionRange.start, selectionRange.end) : 0;
    const end = selectionRange ? Math.max(selectionRange.start, selectionRange.end) : buf.length;
    const fadeLen = Math.max(1, end - start);

    const newBuf = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      dst.set(src);
      for (let i = 0; i < fadeLen; i++) {
        const gain = i / fadeLen;
        dst[start + i] = src[start + i] * gain;
      }
    }
    commitEditedBuffer(newBuf);
  };

  // Fade Out Selection / Whole Sample
  const handleFadeOut = () => {
    const ctx = getActiveAudioContext();
    if (!activeSample.buffer || !ctx) return;
    const buf = activeSample.buffer;
    const start = selectionRange ? Math.min(selectionRange.start, selectionRange.end) : 0;
    const end = selectionRange ? Math.max(selectionRange.start, selectionRange.end) : buf.length;
    const fadeLen = Math.max(1, end - start);

    const newBuf = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      dst.set(src);
      for (let i = 0; i < fadeLen; i++) {
        const gain = 1.0 - (i / fadeLen);
        dst[start + i] = src[start + i] * gain;
      }
    }
    commitEditedBuffer(newBuf);
  };

  // Handle uploaded audio files (supports multiple files for sequential slot filling)
  const handleAudioFiles = async (files: FileList | File[]) => {
    const ctx = getActiveAudioContext();
    if (!ctx || !files || files.length === 0) return;
    try {
      const fileArr = Array.from(files);
      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const targetSlot = (selectedSampleIndex + i) % samples.length;
        const arrayBuf = await file.arrayBuffer();
        const decoded = await decodeAudioBufferSafe(arrayBuf, ctx);
        const audioBuf = decoded.buffer;
        const base64Data = arrayBufferToBase64(arrayBuf);
        await saveSampleData(file.name, arrayBuf);

        const newSample: TrackerSample = {
          ...samples[targetSlot],
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 20),
          sourceType: 'upload',
          buffer: audioBuf,
          base64Data: base64Data,
          loopStart: decoded.loopStart ?? 0,
          loopEnd: decoded.loopEnd ?? audioBuf.length,
          loopEnabled: decoded.loopEnabled ?? false,
          baseNote: 36,
        };

        onUpdateSample(targetSlot, newSample);
        if (i === 0) {
          onPlayPreview(36, newSample);
        }
      }
      setSelectionRange(null);
    } catch (err) {
      console.error('Audio decode error:', err);
      alert('Could not decode one or more audio files.');
    }
  };

  const handleNormalize = () => {
    const ctx = getActiveAudioContext();
    if (!activeSample.buffer || !ctx) return;
    const buf = activeSample.buffer;
    let max = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
      }
    }
    if (max > 0) {
      const scale = 0.98 / max;
      const newBuf = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const src = buf.getChannelData(ch);
        const dst = newBuf.getChannelData(ch);
        for (let i = 0; i < src.length; i++) {
          dst[i] = src[i] * scale;
        }
      }
      commitEditedBuffer(newBuf);
    }
  };

  const handleReverse = () => {
    const ctx = getActiveAudioContext();
    if (!activeSample.buffer || !ctx) return;
    const buf = activeSample.buffer;
    const newBuf = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        dst[i] = src[src.length - 1 - i];
      }
    }
    commitEditedBuffer(newBuf);
  };

  const handleBitcrush = () => {
    if (!activeSample.buffer || !audioCtx) return;
    const buf = activeSample.buffer;
    const newBuf = audioCtx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    const steps = 128;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        dst[i] = Math.round(src[i] * steps) / steps;
      }
    }
    commitEditedBuffer(newBuf);
  };

  return (
    <div className="rounded-lg p-3 flex flex-col h-full select-none glass-panel text-[#cbd5e1] overflow-y-auto min-h-0 custom-scrollbar">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".wav,.mp3,.ogg,.flac,.aiff,.aif,.m4a,audio/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAudioFiles(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Header with Title and Sample Controls */}
      <div className="border-b border-white/10 pb-2 mb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#f8fafc]">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="uppercase tracking-wider text-[11px] text-[#f8fafc] font-display">Instruments</span>
        </div>

        <div className="flex items-center gap-1">
          {onAddSampleSlot && samples.length < 32 && (
            <button
              onClick={onAddSampleSlot}
              className="h-6 px-2 rounded text-[10.5px] font-medium cursor-pointer aqua-gloss aqua-dark text-slate-300 hover:text-white flex items-center gap-1 shadow-sm transition-colors border border-white/10"
              title="Add New Instrument Slot"
            >
              <Plus className="w-3 h-3" />
              <span>Slot</span>
            </button>
          )}

          {activeSample && activeSample.buffer && (
            <button
              onClick={() => {
                onUpdateSample(selectedSampleIndex, {
                  name: 'Empty',
                  buffer: undefined,
                  base64Data: undefined,
                  length: 0,
                  loopLength: 0,
                });
              }}
              className="h-6 px-2 rounded text-[10.5px] font-medium cursor-pointer aqua-gloss aqua-dark text-[#94a3b8] hover:text-rose-400 flex items-center gap-1 shadow-sm transition-colors border border-white/10"
              title="Clear current sample slot"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Default / TRK Mode: No retro system selected (Pure Sample Tracker with Audio Upload) */}
      {/* 1. TRK / Generic System: Upload Audio + ST-Disks quick access */}
      {(activeChipSystem === 'trk' || !activeChipSystem) && (
        <div className="space-y-1.5 mb-2 shrink-0">
          <button
            onClick={() => {
              if (onOpenAmigaVault) onOpenAmigaVault();
              else setIsVaultOpen(true);
            }}
            className="w-full h-7 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-300 hover:text-sky-100 flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(56,189,248,0.15)] transition-all font-mono"
            title="Open Amiga SoundTracker ST-Disk Collection"
          >
            <img
              src="/Disk_Blue.png"
              alt="Amiga Disks"
              className="w-4 h-4 object-contain rounded-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span>ST-Disks Collection</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-6 px-2 rounded-lg text-[10px] font-medium cursor-pointer bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            title="Import WAV, MP3, AIFF or raw audio file from your computer into 32 slots"
          >
            <Upload className="w-3 h-3 text-sky-400" />
            <span>Upload Audio (.WAV / .MP3 / .AIFF)</span>
          </button>
        </div>
      )}

      {/* 2. Amiga System: ST-Disks Collection button + Audio Upload (.WAV / .MP3 / .AIFF) */}
      {activeChipSystem === 'amiga' && (
        <div className="space-y-1.5 mb-2 shrink-0">
          <button
            onClick={() => {
              if (onOpenAmigaVault) onOpenAmigaVault();
              else setIsVaultOpen(true);
            }}
            className="w-full h-7 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-300 hover:text-sky-100 flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(56,189,248,0.15)] transition-all font-mono"
            title="Open Amiga SoundTracker ST-Disk Collection"
          >
            <img
              src="/Disk_Blue.png"
              alt="Amiga Disks"
              className="w-4 h-4 object-contain rounded-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span>ST-Disks Collection</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-6 px-2 rounded-lg text-[10px] font-medium cursor-pointer bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
            title="Import WAV, MP3, AIFF or raw audio file from your computer"
          >
            <Upload className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Upload Audio (.WAV / .MP3 / .AIFF)</span>
          </button>
        </div>
      )}

      {/* 3. Vintage Hardware Synthesizers (C64 SID, Mega Drive, Game Boy, NES): Dedicated Hardware Synth Studio + ST-Disks access */}
      {activeChipSystem && activeChipSystem !== 'amiga' && activeChipSystem !== 'trk' && (
        <div className="space-y-1.5 mb-2 shrink-0">
          <button
            onClick={() => {
              if (onOpenSidSynth) onOpenSidSynth();
            }}
            className="w-full h-7 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer bg-[#141b2d] hover:bg-[#1c263e] border border-sky-500/40 text-sky-200 hover:text-white flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(56,189,248,0.15)] transition-all font-mono"
            title={`Open ${CHIP_LABEL_MAP[activeChipSystem]} Studio`}
          >
            <img
              src={CHIP_ICON_MAP[activeChipSystem] || '/C64.png'}
              alt={CHIP_LABEL_MAP[activeChipSystem]}
              className="w-4 h-4 object-contain rounded-sm"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span>{CHIP_LABEL_MAP[activeChipSystem]} Studio</span>
          </button>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => {
                if (onOpenAmigaVault) onOpenAmigaVault();
                else setIsVaultOpen(true);
              }}
              className="h-6 px-1.5 rounded-md text-[10px] font-mono cursor-pointer bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 hover:text-sky-100 flex items-center justify-center gap-1 transition-all truncate"
              title="Open Amiga ST-01..115 Disk Vault (10,547+ Instruments)"
            >
              <img
                src="/Disk_Blue.png"
                alt="ST Disks"
                className="w-3 h-3 object-contain shrink-0"
              />
              <span className="truncate">ST-Disks</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-6 px-1.5 rounded-md text-[10px] font-mono cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-all truncate"
              title="Upload Audio File"
            >
              <Upload className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">Upload</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of Sample Slots: 4 columns with balanced mathematical padding */}
      <div className="grid grid-cols-4 gap-1.5 mb-2.5 p-2 border border-white/10 bg-[#06090e]/60 backdrop-blur-xs rounded-xl h-[192px] max-h-[196px] overflow-y-auto custom-scrollbar shrink-0 shadow-inner">
        {samples.map((sample, index) => {
          const isSelected = index === selectedSampleIndex;
          const isEmpty = !sample.name || sample.name === '' || sample.name === 'Empty';
          const hasAudio = !!sample.buffer;

          return (
            <button
              key={index}
              id={`sample-slot-${index}`}
              onClick={() => {
                onSelectSample(index);
                if (hasAudio) {
                  onPlayPreview(sample.baseNote || 36, sample);
                } else if (isEmpty) {
                  if (!activeChipSystem || activeChipSystem === 'amiga') {
                    setTimeout(() => {
                      fileInputRef.current?.click();
                    }, 50);
                  } else if (onOpenSidSynth) {
                    onOpenSidSynth();
                  }
                }
              }}
              title={sample.name ? `Slot ${index.toString().padStart(2, '0')}: ${sample.name}` : `Slot ${index.toString().padStart(2, '0')} (Empty - Click to Load)`}
              className={`px-2 py-1 rounded-lg text-left flex flex-col justify-between cursor-pointer h-[40px] relative overflow-hidden transition-all duration-100 aqua-gloss ${
                isSelected 
                  ? 'aqua-theme text-white ring-1 ring-white/30 shadow-md' 
                  : 'aqua-dark text-[#cbd5e1] hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full leading-none font-mono">
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-[#7e8fa6]'}`}>
                  {index.toString().padStart(2, '0')}
                </span>
                {hasAudio && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.95)] animate-pulse" />
                )}
              </div>
              <span className={`truncate text-[10px] font-mono font-bold leading-tight max-w-full ${
                isSelected ? 'text-white' : isEmpty ? 'text-[#52637a] italic' : 'text-[#e2e8f0]'
              }`}>
                {sample.name || 'Empty'}
              </span>
            </button>
          );
        })}

        {/* Plus Slot placeholder button inside grid */}
        {onAddSampleSlot && samples.length < 32 && (
          <button
            onClick={onAddSampleSlot}
            title="Add sample slot (up to 32 slots)"
            className="px-2 py-1 rounded-lg text-center flex flex-col items-center justify-center cursor-pointer h-[40px] border border-dashed border-white/20 hover:border-[#38bdf8]/50 hover:bg-[#38bdf8]/10 text-[#64748b] hover:text-[#38bdf8] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono font-semibold whitespace-nowrap leading-none mt-0.5">Add Slot</span>
          </button>
        )}
      </div>

      {/* Tabs: Waveform Editor | ADSR Envelope | Loop & Tuning | FX Rack */}
      <div className="flex items-center justify-between gap-1 mb-2 border-b border-white/10 pb-1.5 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-2 py-1 text-[10.5px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
              activeTab === 'editor' ? 'border' : 'text-[#94a3b8] hover:text-white'
            }`}
            style={activeTab === 'editor' ? {
              backgroundColor: 'var(--theme-accent-dim, rgba(56,189,248,0.2))',
              color: 'var(--theme-accent, #38bdf8)',
              borderColor: 'var(--theme-accent, #38bdf8)',
            } : undefined}
          >
            <Scissors className="w-3 h-3" />
            <span>Wave Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('adsr')}
            className={`px-2 py-1 text-[10.5px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
              activeTab === 'adsr' ? 'border' : 'text-[#94a3b8] hover:text-white'
            }`}
            style={activeTab === 'adsr' ? {
              backgroundColor: 'var(--theme-accent-dim, rgba(56,189,248,0.2))',
              color: 'var(--theme-accent, #38bdf8)',
              borderColor: 'var(--theme-accent, #38bdf8)',
            } : undefined}
          >
            <Activity className="w-3 h-3" />
            <span>ADSR</span>
          </button>
          <button
            onClick={() => setActiveTab('tuning')}
            className={`px-2 py-1 text-[10.5px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
              activeTab === 'tuning' ? 'border' : 'text-[#94a3b8] hover:text-white'
            }`}
            style={activeTab === 'tuning' ? {
              backgroundColor: 'var(--theme-accent-dim, rgba(56,189,248,0.2))',
              color: 'var(--theme-accent, #38bdf8)',
              borderColor: 'var(--theme-accent, #38bdf8)',
            } : undefined}
          >
            <Repeat className="w-3 h-3" />
            <span>Loop</span>
          </button>
        </div>

        {/* FX RACK TOGGLE BUTTON (Placed beside Wave Editor tab) */}
        {onToggleFxRack && (
          <button
            onClick={onToggleFxRack}
            className={`px-2 py-1 text-[10.5px] font-bold rounded-md flex items-center gap-1 cursor-pointer aqua-gloss transition-all shrink-0 ${
              isFxRackOpen ? 'aqua-theme text-white' : 'aqua-dark text-sky-400 hover:text-white border border-[#27364a]'
            }`}
            title="Toggle Master Hardware FX & Spectrum Rack"
          >
            <Sliders className="w-3 h-3 text-sky-400" />
            <span>FX Rack</span>
          </button>
        )}
      </div>

      {activeSample && (
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Active Sample Name Input & Play Preview & Audacity Studio */}
          <div className="flex items-center justify-between gap-1.5 bg-[#090d13]/60 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
            <span className="font-bold uppercase text-[10px] tracking-wider text-[#64748b]">Name:</span>
            <input
              id="input-sample-name"
              type="text"
              maxLength={22}
              value={activeSample.name}
              onChange={(e) => onUpdateSample(selectedSampleIndex, { name: e.target.value })}
              className="border border-[#263445] bg-[#0c1015]/80 text-[#f1f5f9] px-2 py-0.5 rounded text-xs font-mono font-bold focus:outline-none flex-1 min-w-0"
              style={{ borderColor: 'var(--theme-accent, #38bdf8)' }}
              placeholder="Instrument Name"
            />
            {onOpenSynEditor && (
              <button
                onClick={onOpenSynEditor}
                className="h-6 px-2 text-[10.5px] font-bold rounded cursor-pointer aqua-gloss flex items-center gap-1 shrink-0 shadow-sm border border-sky-400/40 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition-all active:scale-95"
                title="Open in SYN-Editor Audio Studio (Full Waveform Editor, DSP FX Rack, Amiga 8-Bit & Mic Recorder)"
              >
                <Waves className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">SYN-Editor</span>
              </button>
            )}
            <button
              onClick={() => onPlayPreview(activeSample.baseNote || 36, activeSample)}
              className="h-6 px-2 text-[10.5px] font-bold text-white rounded cursor-pointer aqua-gloss aqua-theme flex items-center gap-1 shrink-0 shadow-sm"
              title="Preview Note (plays sample with ADSR, volume & pitch)"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test Note</span>
            </button>
          </div>

          {/* TAB 1: WAVEFORM EDITOR */}
          {activeTab === 'editor' && (
            <>
              {/* Sound Waveform / Visual preview */}
              <div className="relative border border-white/10 rounded-xl bg-[#05080c]/60 backdrop-blur-sm p-1 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={75}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onDoubleClick={() => onPlayPreview(activeSample.baseNote || 36, activeSample)}
                  className="w-full h-[75px] block cursor-crosshair rounded-lg"
                  title="Click & Drag to select region. Double click to preview."
                />
                {!activeSample.buffer && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-[#05080c]/85 select-none pointer-events-none">
                    <span className="text-xs font-mono font-medium text-slate-300">
                      No audio sample loaded
                    </span>
                  </div>
                )}
              </div>

              {/* Wave Edit Actions */}
              {activeSample.buffer && (
                <div className="grid grid-cols-4 gap-1 bg-[#090d13]/60 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                  <button
                    onClick={handleTrimToSelection}
                    disabled={!selectionRange}
                    className={`h-6 px-1 text-[10px] font-bold rounded cursor-pointer aqua-gloss text-center ${
                      selectionRange ? 'aqua-theme text-white' : 'opacity-30 cursor-not-allowed text-[#64748b]'
                    }`}
                    title="Trim sample to selected region"
                  >
                    Trim
                  </button>
                  <button
                    onClick={handleNormalize}
                    className="h-6 px-1 text-[10px] font-bold rounded cursor-pointer aqua-gloss aqua-dark"
                    style={{ color: 'var(--theme-accent, #38bdf8)' }}
                    title="Normalize peak amplitude"
                  >
                    Normalize
                  </button>
                  <button
                    onClick={handleReverse}
                    className="h-6 px-1 text-[10px] font-bold rounded cursor-pointer aqua-gloss aqua-dark"
                    style={{ color: 'var(--theme-accent, #38bdf8)' }}
                    title="Reverse audio"
                  >
                    Reverse
                  </button>
                  <button
                    onClick={handleSnapZeroCrossings}
                    className="h-6 px-1 text-[10px] font-bold text-[#34d399] rounded cursor-pointer aqua-gloss aqua-dark"
                    title="Snap loop points to zero-crossings"
                  >
                    Zero-Snap
                  </button>
                </div>
              )}

              {/* Fade & Bitcrush row & Audacity 2.0 launcher */}
              {activeSample.buffer && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 justify-between bg-[#090d13]/60 backdrop-blur-sm p-1 rounded-lg border border-white/10 text-[10px]">
                    <button
                      onClick={handleFadeIn}
                      className="h-5 px-2 font-semibold text-[#cbd5e1] hover:text-[#38bdf8] rounded cursor-pointer"
                    >
                      Fade In
                    </button>
                    <button
                      onClick={handleFadeOut}
                      className="h-5 px-2 font-semibold text-[#cbd5e1] hover:text-[#38bdf8] rounded cursor-pointer"
                    >
                      Fade Out
                    </button>
                    <button
                      onClick={handleBitcrush}
                      className="h-5 px-2 font-semibold text-[#cbd5e1] hover:text-[#38bdf8] rounded cursor-pointer"
                    >
                      8-Bit Crunch
                    </button>
                  </div>

                  {onOpenSynEditor && (
                    <button
                      onClick={onOpenSynEditor}
                      className="w-full h-6 px-2 text-[10.5px] font-bold text-sky-300 hover:text-white rounded-lg cursor-pointer bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      title="Open full SYN-Editor Audio Studio for this sample"
                    >
                      <Waves className="w-3.5 h-3.5 text-sky-400" />
                      <span>SYN-Editor Studio Pro</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: ADSR ENVELOPE */}
          {activeTab === 'adsr' && (
            <div className="space-y-2 p-2.5 rounded-xl bg-[#090d13]/60 backdrop-blur-sm border border-white/10 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: 'var(--theme-accent, #38bdf8)' }}>
                <span>Volume ADSR Curve</span>
                <span className="text-[10px] font-mono text-[#94a3b8]">Shape your instrument</span>
              </div>

              {/* Attack */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-[#94a3b8]">
                  <span>Attack (ms)</span>
                  <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{Math.round((activeSample.attack ?? 0.005) * 1000)}ms</span>
                </div>
                <input
                  type="range"
                  min={0.001}
                  max={1.0}
                  step={0.005}
                  value={activeSample.attack ?? 0.005}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { attack: parseFloat(e.target.value) })}
                  className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                />
              </div>

              {/* Decay */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-[#94a3b8]">
                  <span>Decay (ms)</span>
                  <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{Math.round((activeSample.decay ?? 0.2) * 1000)}ms</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={1.5}
                  step={0.01}
                  value={activeSample.decay ?? 0.2}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { decay: parseFloat(e.target.value) })}
                  className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                />
              </div>

              {/* Sustain */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-[#94a3b8]">
                  <span>Sustain Level</span>
                  <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{Math.round((activeSample.sustain ?? 0.8) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={activeSample.sustain ?? 0.8}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { sustain: parseFloat(e.target.value) })}
                  className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                />
              </div>

              {/* Release */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-[#94a3b8]">
                  <span>Release (ms)</span>
                  <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{Math.round((activeSample.release ?? 0.15) * 1000)}ms</span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={2.0}
                  step={0.01}
                  value={activeSample.release ?? 0.15}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { release: parseFloat(e.target.value) })}
                  className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: LOOP & TUNING */}
          {activeTab === 'tuning' && (
            <div className="space-y-2.5 p-2.5 rounded-xl bg-[#090d13]/60 backdrop-blur-sm border border-white/10 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: 'var(--theme-accent, #38bdf8)' }}>
                <span>Loop Points & Tuning</span>
                <span className="text-[10px] font-mono text-[#94a3b8]">Sample playback config</span>
              </div>

              {/* Loop Start / Loop End sliders if buffer exists */}
              {activeSample.buffer && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-[#94a3b8]">
                    <span>Loop Start</span>
                    <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{activeSample.loopStart} frames</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, activeSample.buffer.length - 32)}
                    value={activeSample.loopStart}
                    onChange={(e) => onUpdateSample(selectedSampleIndex, { loopStart: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-[#94a3b8]">
                    <span>Loop End</span>
                    <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{activeSample.loopEnd} frames</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(1, activeSample.loopStart + 16)}
                    max={activeSample.buffer.length}
                    value={activeSample.loopEnd}
                    onChange={(e) => onUpdateSample(selectedSampleIndex, { loopEnd: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Finetune */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#94a3b8]">
                  <span>Finetune (Cents)</span>
                  <span className="font-mono" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{activeSample.finetune > 0 ? `+${activeSample.finetune}` : activeSample.finetune} cents</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={activeSample.finetune || 0}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { finetune: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#38bdf8] h-1.5 bg-[#141c26] rounded cursor-pointer"
                />
              </div>

              {/* Loop toggle checkbox */}
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#101722] border border-[#1e2c3e]">
                <span className="text-[11px] font-semibold text-[#cbd5e1]">Loop aktiv:</span>
                <input
                  type="checkbox"
                  checked={activeSample.loopEnabled}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { loopEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[#38bdf8] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Standard Controls (Volume, Panning, Base Pitch, Loop) */}
          <div className="space-y-2 p-2 rounded-xl bg-[#090d13]/60 backdrop-blur-sm border border-white/10">
            {/* Volume */}
            <div className="space-y-0.5">
              <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-[#64748b]">
                <span className="uppercase">Volume</span>
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{activeSample.volume} / 64</span>
              </div>
              <input
                type="range"
                min={0}
                max={64}
                value={activeSample.volume}
                onChange={(e) => onUpdateSample(selectedSampleIndex, { volume: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-[#141c26] rounded cursor-pointer"
              />
            </div>

            {/* Panning */}
            <div className="space-y-0.5">
              <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-[#64748b]">
                <span className="uppercase">Panning</span>
                <span className="font-mono text-[#f8fafc] text-xs font-bold">
                  {activeSample.panning === 0 ? 'Center' : activeSample.panning < 0 ? `L${Math.abs(Math.round(activeSample.panning * 100))}` : `R${Math.round(activeSample.panning * 100)}`}
                </span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={activeSample.panning}
                onChange={(e) => onUpdateSample(selectedSampleIndex, { panning: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-[#141c26] rounded cursor-pointer"
              />
            </div>

            {/* Base Note Tuning & Loop */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#16202c]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold uppercase text-[10px] tracking-wider text-[#64748b]">Pitch:</span>
                <div className="flex items-center gap-1.5 border border-[#223042] bg-[#0c1219] px-2 py-0.5 rounded-md">
                  <button
                    onClick={() => onUpdateSample(selectedSampleIndex, { baseNote: Math.max(12, activeSample.baseNote - 1) })}
                    className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold font-mono text-xs min-w-[32px] text-center" style={{ color: 'var(--theme-accent, #38bdf8)' }}>
                    {midiToNote(activeSample.baseNote)}
                  </span>
                  <button
                    onClick={() => onUpdateSample(selectedSampleIndex, { baseNote: Math.min(108, activeSample.baseNote + 1) })}
                    className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold uppercase text-[10px] tracking-wider text-[#64748b]">Loop:</span>
                <input
                  type="checkbox"
                  checked={activeSample.loopEnabled}
                  onChange={(e) => onUpdateSample(selectedSampleIndex, { loopEnabled: e.target.checked })}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Amiga ST-01..ST-115 Disk Vault Modal */}
      <AmigaDiskVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        selectedSlotIndex={selectedSampleIndex}
        totalSlots={samples.length}
        audioCtx={audioCtx}
        onLoadSampleToSlot={(slotIndex, newSample) => {
          onUpdateSample(slotIndex, newSample);
        }}
        onBatchLoadSamples={(startSlot, sampleList) => {
          sampleList.forEach((samp, idx) => {
            const targetSlot = (startSlot + idx) % samples.length;
            onUpdateSample(targetSlot, samp);
          });
        }}
      />
    </div>
  );
};
