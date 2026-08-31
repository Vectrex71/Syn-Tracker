/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface SynEditorWaveformProps {
  currentBuffer: AudioBuffer | null;
  selection: { start: number; end: number } | null;
  setSelection: React.Dispatch<React.SetStateAction<{ start: number; end: number } | null>>;
  loopStart: number;
  setLoopStart: (val: number) => void;
  loopEnd: number;
  setLoopEnd: (val: number) => void;
  loopEnabled: boolean;
  setLoopEnabled: (val: boolean) => void;
  isPlaying: boolean;
  isLoopPlayback: boolean;
  setIsLoopPlayback: (val: boolean) => void;
  onStartPlayback: () => void;
  onStopPlayback: () => void;
  playheadFrame: number;
  meterLevels: { leftPeak: number; rightPeak: number; isClipping: boolean };
  viewMode: 'waveform' | 'stereo';
  setViewMode: (mode: 'waveform' | 'stereo') => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  scrollOffset: number;
  setScrollOffset: (val: number) => void;

  // Wave Action Handlers
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDeleteSelection: () => void;
  onTrim: () => void;
  onSilence: () => void;
  onReverse: () => void;
  onSnapZeroCrossings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasClipboard: boolean;

  // Recording
  isRecording: boolean;
  recordingSeconds: number;
  onToggleRecord: () => void;
}

export const SynEditorWaveform: React.FC<SynEditorWaveformProps> = ({
  currentBuffer,
  selection,
  setSelection,
  loopStart,
  setLoopStart,
  loopEnd,
  setLoopEnd,
  loopEnabled,
  setLoopEnabled,
  isPlaying,
  isLoopPlayback,
  setIsLoopPlayback,
  onStartPlayback,
  onStopPlayback,
  playheadFrame,
  meterLevels,
  viewMode,
  setViewMode,
  zoom,
  setZoom,
  scrollOffset,
  setScrollOffset,
  onCut,
  onCopy,
  onPaste,
  onDeleteSelection,
  onTrim,
  onSilence,
  onReverse,
  onSnapZeroCrossings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasClipboard,
  isRecording,
  recordingSeconds,
  onToggleRecord,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const dragModeRef = useRef<'select' | 'move_start' | 'move_end' | 'scrub'>('select');

  const bufferDurationSec = currentBuffer ? (currentBuffer.length / currentBuffer.sampleRate).toFixed(3) : '0.000';
  const selectionDurationSec = selection && currentBuffer && Math.abs(selection.end - selection.start) > 0
    ? (Math.abs(selection.end - selection.start) / currentBuffer.sampleRate).toFixed(3)
    : null;

  // Draw Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark Studio Background
    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, width, height);

    // Amplitude Center & Zero Guides
    ctx.strokeStyle = '#15202e';
    ctx.lineWidth = 1;

    // Zero-line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // +6dB / -6dB guides
    ctx.strokeStyle = '#0e1622';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width, height * 0.25);
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width, height * 0.75);
    ctx.stroke();

    // Time Grid Marks
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (!currentBuffer || currentBuffer.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No audio loaded in this tracker slot', width / 2, height / 2 + 4);
      return;
    }

    const totalSamples = currentBuffer.length;
    const visibleSamples = Math.floor(totalSamples / zoom);
    const startSample = Math.floor(scrollOffset * (totalSamples - visibleSamples));
    const endSample = Math.min(totalSamples, startSample + visibleSamples);
    const sampleWindow = Math.max(1, endSample - startSample);

    const numChannels = currentBuffer.numberOfChannels;
    const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#38bdf8';

    // Helper to draw a single channel waveform smoothly without gaps
    const drawChannelWaveform = (
      data: Float32Array,
      offsetY: number,
      subH: number,
      strokeColor: string,
      fillColor: string
    ) => {
      const midY = offsetY + subH / 2;
      const step = sampleWindow / width;

      if (step <= 1.5) {
        // High zoom: Draw continuous sample-accurate line connecting every sample point
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();

        for (let s = startSample; s <= endSample; s++) {
          const x = ((s - startSample) / sampleWindow) * width;
          const val = s >= 0 && s < totalSamples ? data[s] : 0;
          const y = midY - val * (subH / 2) * 0.94;
          if (s === startSample) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // If zoom is very high (less than 200 samples visible), draw discrete sample dot markers
        if (sampleWindow <= 256) {
          ctx.fillStyle = strokeColor;
          for (let s = startSample; s <= endSample; s++) {
            const x = ((s - startSample) / sampleWindow) * width;
            const val = s >= 0 && s < totalSamples ? data[s] : 0;
            const y = midY - val * (subH / 2) * 0.94;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Normal to zoomed out overview: Draw filled peak envelope + anti-aliased continuous outlines
        const topPoints: [number, number][] = [];
        const botPoints: [number, number][] = [];

        for (let x = 0; x < width; x++) {
          const windowStart = Math.floor(startSample + x * step);
          const windowEnd = Math.max(windowStart + 1, Math.floor(startSample + (x + 1) * step));
          let min = 1.0;
          let max = -1.0;

          for (let s = windowStart; s < windowEnd && s < totalSamples; s++) {
            const val = data[s] || 0;
            if (val < min) min = val;
            if (val > max) max = val;
          }

          if (min > max) {
            min = 0;
            max = 0;
          }

          const y1 = midY - max * (subH / 2) * 0.94;
          const y2 = midY - min * (subH / 2) * 0.94;
          topPoints.push([x, y1]);
          botPoints.push([x, y2]);
        }

        // Fill body with translucent gradient fill
        ctx.beginPath();
        if (topPoints.length > 0) {
          ctx.moveTo(topPoints[0][0], topPoints[0][1]);
          for (let i = 1; i < topPoints.length; i++) {
            ctx.lineTo(topPoints[i][0], topPoints[i][1]);
          }
          for (let i = botPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(botPoints[i][0], botPoints[i][1]);
          }
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
        }

        // Draw solid vertical min/max bar connections (at least 1px height to avoid 0-height gaps)
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < topPoints.length; i++) {
          const x = topPoints[i][0];
          const y1 = topPoints[i][1];
          const y2 = botPoints[i][1];
          // Ensure at least 1.5px vertical line around center
          if (Math.abs(y2 - y1) < 1.5) {
            ctx.moveTo(x, midY - 0.75);
            ctx.lineTo(x, midY + 0.75);
          } else {
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
          }
        }
        ctx.stroke();

        // Stroke continuous top and bottom boundary curves for crisp anti-aliasing
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        if (topPoints.length > 0) {
          ctx.moveTo(topPoints[0][0], topPoints[0][1]);
          for (let i = 1; i < topPoints.length; i++) {
            ctx.lineTo(topPoints[i][0], topPoints[i][1]);
          }
          ctx.stroke();
        }

        ctx.beginPath();
        if (botPoints.length > 0) {
          ctx.moveTo(botPoints[0][0], botPoints[0][1]);
          for (let i = 1; i < botPoints.length; i++) {
            ctx.lineTo(botPoints[i][0], botPoints[i][1]);
          }
          ctx.stroke();
        }
      }
    };

    // Draw audio channels
    if (viewMode === 'stereo' && numChannels >= 2) {
      // Split Stereo View: Channel 0 on Top, Channel 1 on Bottom
      const halfH = height / 2;
      drawChannelWaveform(
        currentBuffer.getChannelData(0),
        0,
        halfH,
        '#38bdf8',
        'rgba(56, 189, 248, 0.25)'
      );
      drawChannelWaveform(
        currentBuffer.getChannelData(1),
        halfH,
        halfH,
        '#34d399',
        'rgba(52, 211, 153, 0.25)'
      );
    } else {
      // Combined Mono/Stereo Waveform
      const dataL = currentBuffer.getChannelData(0);
      let combinedData = dataL;
      if (numChannels > 1) {
        const dataR = currentBuffer.getChannelData(1);
        const len = currentBuffer.length;
        combinedData = new Float32Array(len);
        for (let i = 0; i < len; i++) {
          combinedData[i] = (dataL[i] + dataR[i]) * 0.5;
        }
      }

      drawChannelWaveform(
        combinedData,
        0,
        height,
        themeAccent,
        'rgba(56, 189, 248, 0.22)'
      );
    }

    // Draw Selection Overlay
    if (selection) {
      const selStart = Math.min(selection.start, selection.end);
      const selEnd = Math.max(selection.start, selection.end);

      const x1 = ((selStart - startSample) / sampleWindow) * width;
      const x2 = ((selEnd - startSample) / sampleWindow) * width;

      if (x2 > 0 && x1 < width) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.fillRect(Math.max(0, x1), 0, Math.min(width, x2 - x1), height);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.max(0, x1), 0, Math.min(width, x2 - x1), height);
      }
    }

    // Draw Loop Markers if enabled
    if (loopEnabled && loopEnd > loopStart) {
      const loopX1 = ((loopStart - startSample) / sampleWindow) * width;
      const loopX2 = ((loopEnd - startSample) / sampleWindow) * width;

      // Loop region subtle highlight
      if (loopX2 > 0 && loopX1 < width) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fillRect(Math.max(0, loopX1), 0, Math.min(width, loopX2 - loopX1), height);
      }

      // Loop Start (Green marker)
      if (loopX1 >= 0 && loopX1 <= width) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(loopX1, 0);
        ctx.lineTo(loopX1, height);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.fillRect(loopX1, 0, 8, 14);
      }

      // Loop End (Red marker)
      if (loopX2 >= 0 && loopX2 <= width) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(loopX2, 0);
        ctx.lineTo(loopX2, height);
        ctx.stroke();

        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(loopX2 - 8, 0, 8, 14);
      }
    }

    // Draw Playhead Cursor
    if (isPlaying && playheadFrame >= startSample && playheadFrame <= endSample) {
      const playheadX = ((playheadFrame - startSample) / sampleWindow) * width;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [currentBuffer, selection, loopEnabled, loopStart, loopEnd, isPlaying, playheadFrame, viewMode, zoom, scrollOffset]);

  // Canvas Mouse Interactions for Selection & Loop Dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentBuffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    const totalSamples = currentBuffer.length;
    const visibleSamples = Math.floor(totalSamples / zoom);
    const startSample = Math.floor(scrollOffset * (totalSamples - visibleSamples));
    const sampleWindow = Math.max(1, visibleSamples);

    const clickSample = Math.max(0, Math.min(totalSamples, Math.round(startSample + (clickX / width) * sampleWindow)));

    isMouseDownRef.current = true;
    dragModeRef.current = 'select';
    setSelection({ start: clickSample, end: clickSample });
  };

  // Attach global mousemove & mouseup so dragging all the way to the edges/outside canvas never loses or drops the selection
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !canvasRef.current || !currentBuffer) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;

      const totalSamples = currentBuffer.length;
      const visibleSamples = Math.floor(totalSamples / zoom);
      const startSample = Math.floor(scrollOffset * (totalSamples - visibleSamples));
      const sampleWindow = Math.max(1, visibleSamples);

      // Clamp safely to [0, totalSamples]. If mouse is dragged past the right edge (clickX >= width - 4), clamp directly to totalSamples
      let currentSample = Math.round(startSample + (clickX / width) * sampleWindow);
      if (clickX >= width - 4 && zoom === 1) {
        currentSample = totalSamples;
      }
      currentSample = Math.max(0, Math.min(totalSamples, currentSample));

      setSelection((prev) => (prev ? { ...prev, end: currentSample } : { start: currentSample, end: currentSample }));
    };

    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [currentBuffer, zoom, scrollOffset, setSelection]);

  // Double click canvas to select entire sample
  const handleCanvasDoubleClick = () => {
    if (!currentBuffer) return;
    setSelection({ start: 0, end: currentBuffer.length });
  };

  const handleSelectAll = () => {
    if (!currentBuffer) return;
    setSelection({ start: 0, end: currentBuffer.length });
  };

  const handleClearSelection = () => {
    setSelection(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#070c13] rounded-xl border border-[#1e2d42] shadow-inner p-3 gap-2.5">
      {/* Top Status & Meter Bar */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400">Duration: </span>
            <span className="text-white font-bold">{bufferDurationSec}s</span>
            <span className="text-slate-400 text-[10px] ml-1">
              ({currentBuffer?.length || 0} samples @ {currentBuffer?.sampleRate || 44100}Hz)
            </span>
          </div>

          {selectionDurationSec && (
            <div className="bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded text-sky-300">
              <span>Selection: </span>
              <span className="font-bold">{selectionDurationSec}s</span>
            </div>
          )}
        </div>

        {/* Stereo Peak dB VU Meter & View Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#101824] p-0.5 rounded border border-[#223348]">
            <button
              onClick={() => setViewMode('waveform')}
              className={`aqua-gloss h-6 px-2 text-[10px] font-bold rounded cursor-pointer ${
                viewMode === 'waveform' ? 'aqua-theme text-white' : 'text-slate-400'
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => setViewMode('stereo')}
              className={`aqua-gloss h-6 px-2 text-[10px] font-bold rounded cursor-pointer ${
                viewMode === 'stereo' ? 'aqua-theme text-white' : 'text-slate-400'
              }`}
            >
              Stereo L/R
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#0e1624] px-2.5 py-1 rounded-lg border border-[#1e2d42]">
            <span className="text-[10px] font-bold text-slate-400">PEAK:</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-sky-400 font-bold">L</span>
              <div className="w-16 h-2 bg-[#080d14] rounded-xs overflow-hidden border border-[#22354e]">
                <div
                  className={`h-full transition-all duration-75 ${
                    meterLevels.isClipping ? 'bg-rose-500' : meterLevels.leftPeak > 0.85 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, meterLevels.leftPeak * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[9px] text-emerald-400 font-bold">R</span>
              <div className="w-16 h-2 bg-[#080d14] rounded-xs overflow-hidden border border-[#22354e]">
                <div
                  className={`h-full transition-all duration-75 ${
                    meterLevels.isClipping ? 'bg-rose-500' : meterLevels.rightPeak > 0.85 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, meterLevels.rightPeak * 100)}%` }}
                />
              </div>
            </div>

            <div
              className={`w-2 h-2 rounded-full border ${
                meterLevels.isClipping
                  ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,1)]'
                  : 'bg-slate-800 border-slate-700 opacity-40'
              }`}
              title="Clip Indicator"
            />
          </div>
        </div>
      </div>

      {/* Main Interactive Waveform Canvas */}
      <div className="flex-1 relative rounded-xl border border-[#1e2d42] overflow-hidden bg-[#070c13] shadow-inner flex flex-col min-h-[160px]">
        <canvas
          ref={canvasRef}
          width={1280}
          height={400}
          onMouseDown={handleCanvasMouseDown}
          onDoubleClick={handleCanvasDoubleClick}
          className="w-full flex-1 block cursor-crosshair select-none"
        />

        {/* Zoom Pan Slider */}
        {zoom > 1 && (
          <div className="h-4 bg-[#0a1017] border-t border-[#1a2636] px-2 flex items-center shrink-0">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={scrollOffset}
              onChange={(e) => setScrollOffset(parseFloat(e.target.value))}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded cursor-ew-resize"
            />
          </div>
        )}
      </div>

      {/* Quick Action Waveform Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-[#0b1018] rounded-lg border border-[#1e2d42] text-xs">
        {/* Cut / Copy / Paste / Trim / Silence */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={onCut}
            disabled={!selection}
            className={`aqua-gloss h-7 px-2 rounded flex items-center gap-1 ${
              selection ? 'aqua-dark text-slate-200 cursor-pointer' : 'aqua-inactive cursor-not-allowed'
            }`}
            title="Cut Selection (Ctrl+X)"
          >
            <Scissors className="w-3 h-3" />
            <span className="hidden md:inline">Cut</span>
          </button>

          <button
            onClick={onCopy}
            className="aqua-gloss aqua-dark h-7 px-2 rounded text-slate-200 flex items-center gap-1 cursor-pointer"
            title="Copy Selection or Sample (Ctrl+C)"
          >
            <Copy className="w-3 h-3" />
            <span className="hidden md:inline">Copy</span>
          </button>

          <button
            onClick={onPaste}
            disabled={!hasClipboard}
            className={`aqua-gloss h-7 px-2 rounded flex items-center gap-1 ${
              hasClipboard ? 'aqua-dark text-slate-200 cursor-pointer' : 'aqua-inactive cursor-not-allowed'
            }`}
            title="Paste from Clipboard (Ctrl+V)"
          >
            <Clipboard className="w-3 h-3" />
            <span className="hidden md:inline">Paste</span>
          </button>

          <button
            onClick={onDeleteSelection}
            disabled={!selection}
            className={`aqua-gloss h-7 px-2 rounded flex items-center gap-1 ${
              selection ? 'aqua-red cursor-pointer' : 'aqua-inactive cursor-not-allowed'
            }`}
            title="Delete Selected Region (Del)"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden md:inline">Del</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <button
            onClick={onTrim}
            disabled={!selection}
            className={`aqua-gloss h-7 px-2 rounded font-bold flex items-center gap-1 ${
              selection ? 'aqua-blue cursor-pointer' : 'aqua-inactive cursor-not-allowed'
            }`}
            title="Trim: Crop and keep only selected region"
          >
            <span>Trim</span>
          </button>

          <button
            onClick={onSilence}
            className="aqua-gloss aqua-dark h-7 px-2 rounded text-slate-300 cursor-pointer"
            title="Silence selected region"
          >
            <span>Silence</span>
          </button>

          <button
            onClick={onReverse}
            className="aqua-gloss aqua-dark h-7 px-2 rounded text-slate-300 cursor-pointer"
            title="Reverse Audio"
          >
            <span>Reverse</span>
          </button>

          <button
            onClick={onSnapZeroCrossings}
            className="aqua-gloss aqua-green h-7 px-2 rounded font-mono text-[11px] cursor-pointer"
            title="Snap Selection to zero-crossings to remove audio clicks"
          >
            <span>Zero-Snap</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <button
            onClick={handleSelectAll}
            className="aqua-gloss aqua-dark h-7 px-2 rounded text-sky-300 font-mono text-[11px] cursor-pointer"
            title="Select Entire Sample (Ctrl+A or Double-Click waveform)"
          >
            <span>Select All</span>
          </button>

          {selection && (
            <button
              onClick={handleClearSelection}
              className="aqua-gloss aqua-dark h-7 px-2 rounded text-slate-400 hover:text-slate-200 font-mono text-[11px] cursor-pointer"
              title="Clear Selection (Esc)"
            >
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Waveform Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(1, z / 2))}
            className="aqua-gloss aqua-dark h-7 w-7 rounded text-slate-300 flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono text-sky-400 px-1">{zoom}x</span>
          <button
            onClick={() => setZoom((z) => Math.min(32, z * 2))}
            className="aqua-gloss aqua-dark h-7 w-7 rounded text-slate-300 flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
