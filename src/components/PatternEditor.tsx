/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { TrackerPattern, TrackerStep, TrackerSample, KeyboardLayout, RetroChipSystem, getAllowedChannelsForSystem } from '../types';
import { NOTES, noteToMidi, midiToNote, audioEngine } from '../lib/audioEngine';
import { Copy, Clipboard, Trash2, Undo2, Redo2 } from 'lucide-react';
import { TrackSpectrumMeter } from './TrackSpectrumMeter';

interface PatternEditorProps {
  pattern: TrackerPattern;
  currentOrderIndex?: number;
  currentLine: number;
  isPlaying: boolean;
  isEditMode: boolean;
  activeOctave: number;
  activeSampleIndex: number;
  samples: TrackerSample[];
  channelsCount: number;
  bpm?: number;
  speed?: number;
  activeChipSystem?: RetroChipSystem | null;
  onChangeBpm?: (bpm: number) => void;
  onChangeSpeed?: (speed: number) => void;
  onChangeOctave?: (octave: number) => void;
  onChangeChannelsCount?: (count: number) => void;
  keyboardLayout: KeyboardLayout;
  hasTrackClipboard?: boolean;
  hasPatternClipboard?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleEditMode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectLine?: (lineIndex: number) => void;
  onUpdateStep: (channelIndex: number, stepIndex: number, updated: Partial<TrackerStep>, targetOrderIndex?: number) => void;
  onPlayPreview: (midiNote: number, sample: TrackerSample) => void;
  onStopPreview: () => void;
  onCopyTrack?: (channelIndex: number) => void;
  onPasteTrack?: (channelIndex: number) => void;
  onClearTrack?: (channelIndex: number) => void;
  onCopyTracks?: (channelIndices: number[]) => void;
  onPasteTracks?: (channelIndices: number[]) => void;
  onClearTracks?: (channelIndices: number[]) => void;
  onCopyPattern?: () => void;
  onPastePattern?: () => void;
  onDuplicatePattern?: () => void;
  onClearPattern?: () => void;
}

// Map keyboard keys to piano semi-tones (C is 0, C# is 1, etc.) per layout
const PIANO_MAPS: Record<KeyboardLayout, { lower: Record<string, number>; upper: Record<string, number> }> = {
  QWERTZ: {
    lower: {
      'y': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11, ',': 12,
    },
    upper: {
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'z': 21, '7': 22, 'u': 23, 'i': 24, '9': 25, 'o': 26, '0': 27, 'p': 28,
    },
  },
  QWERTY: {
    lower: {
      'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11, ',': 12,
    },
    upper: {
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23, 'i': 24, '9': 25, 'o': 26, '0': 27, 'p': 28,
    },
  },
  AZERTY: {
    lower: {
      'w': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, ',': 11, ';': 12,
    },
    upper: {
      'a': 12, 'é': 13, 'z': 14, '"': 15, 'e': 16, 'r': 17, '(': 18, 't': 19, '-': 20, 'y': 21, 'è': 22, 'u': 23, 'i': 24, 'c': 25, 'o': 26, 'à': 27, 'p': 28,
    },
  },
  AUTO: {
    lower: {
      'KeyZ': 0, 'KeyS': 1, 'KeyX': 2, 'KeyD': 3, 'KeyC': 4, 'KeyV': 5, 'KeyG': 6, 'KeyB': 7, 'KeyH': 8, 'KeyN': 9, 'KeyJ': 10, 'KeyM': 11, 'Comma': 12,
    },
    upper: {
      'KeyQ': 12, 'Digit2': 13, 'KeyW': 14, 'Digit3': 15, 'KeyE': 16, 'KeyR': 17, 'Digit5': 18, 'KeyT': 19, 'Digit6': 20, 'KeyY': 21, 'Digit7': 22, 'KeyU': 23, 'KeyI': 24, 'Digit9': 25, 'KeyO': 26, 'Digit0': 27, 'KeyP': 28,
    },
  },
};

// Helper function to return deterministic CSS grid styles for both track headers and pattern rows
const getTrackGridStyle = (channelsCount: number): React.CSSProperties => {
  if (channelsCount <= 8) {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${channelsCount}, minmax(0, 1fr))`,
      width: '100%',
      minWidth: '100%',
    };
  }
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${channelsCount}, 116px)`,
    width: `${channelsCount * 116}px`,
    minWidth: `${channelsCount * 116}px`,
  };
};

interface PatternRowProps {
  lineIndex: number;
  channelsCount: number;
  steps: TrackerStep[];
  isActiveRow: boolean;
  isCursorRow: boolean;
  isPlaying: boolean;
  cursorChannel: number;
  cursorField: 0 | 1 | 2 | 3 | 4;
  isEditMode: boolean;
  selectedTracks: number[];
  mutedChannels: number[];
  soloedChannels: number[];
  onCellClick: (lineIndex: number, channelIndex: number, fieldIndex: 0 | 1 | 2 | 3 | 4) => void;
}

const PatternRow = React.memo<PatternRowProps>(({
  lineIndex,
  channelsCount,
  steps,
  isActiveRow,
  isCursorRow,
  isPlaying,
  cursorChannel,
  cursorField,
  isEditMode,
  selectedTracks,
  mutedChannels,
  soloedChannels,
  onCellClick,
}) => {
  const isBeatMarker = lineIndex % 4 === 0;
  const isBarMarker = lineIndex % 16 === 0;

  return (
    <div
      data-row-index={lineIndex}
      className={`flex items-stretch h-[24px] min-h-[24px] max-h-[24px] box-border border-b select-none font-mono min-w-full ${
        isActiveRow
          ? 'border-[#38bdf8]/40 text-[#f8fafc] z-10'
          : isBarMarker
            ? 'bg-[#121923]/70 border-white/10 text-[#cbd5e1]'
            : isBeatMarker
              ? 'bg-[#0c1219]/45 border-white/5 text-[#94a3b8]'
              : 'border-white/[0.03] text-[#475569]'
      }`}
      style={{ 
        width: channelsCount > 8 ? `${channelsCount * 116}px` : '100%', 
        minWidth: '100%' 
      }}
    >
      {/* Channels Row Data with exact same vertical track dividers as headers */}
      <div 
        className="h-full items-center divide-x divide-white/[0.08] flex-1" 
        style={getTrackGridStyle(channelsCount)}
      >
        {Array.from({ length: channelsCount }).map((_, channelIndex) => {
          const step: TrackerStep = steps?.[channelIndex] || {
            note: null,
            instrument: null,
            volume: null,
            effectCode: null,
            effectVal: null,
          };

          const isTrackSelected = selectedTracks.includes(channelIndex);
          const hasSelectedTracks = selectedTracks.length > 0;
          const isDimmedBySelection = hasSelectedTracks && !isTrackSelected;
          
          const hasSolo = soloedChannels.length > 0;
          const isSoloed = soloedChannels.includes(channelIndex);
          const isMuted = mutedChannels.includes(channelIndex);
          const isEffectiveMuted = hasSolo ? !isSoloed : isMuted;

          // Only show cell/field edit box on the cursor row (when stopped) or on active row (when in edit mode)
          const showCursor = !isPlaying ? isCursorRow : (isEditMode && isActiveRow);

          const isFocusedNote = showCursor && cursorChannel === channelIndex && cursorField === 0;
          const isFocusedInst = showCursor && cursorChannel === channelIndex && cursorField === 1;
          const isFocusedVol = showCursor && cursorChannel === channelIndex && cursorField === 2;
          const isFocusedEff = showCursor && cursorChannel === channelIndex && cursorField === 3;
          const isFocusedVal = showCursor && cursorChannel === channelIndex && cursorField === 4;
          const isFocusedChannel = showCursor && cursorChannel === channelIndex;

          return (
            <div
              key={channelIndex}
              className={`px-2 h-full flex items-center justify-between text-center gap-0.5 overflow-hidden box-border font-mono text-[11.5px] transition-colors ${
                isDimmedBySelection || isEffectiveMuted ? 'opacity-30' : 'opacity-100'
              } ${
                isFocusedChannel
                  ? 'bg-[#142234]/80 text-[#f8fafc]'
                  : isTrackSelected && !isActiveRow
                    ? 'bg-[#0f1f30]/50'
                    : channelIndex % 2 === 1
                      ? 'bg-white/[0.015]'
                      : ''
              }`}
            >
              {/* 1. Note Column */}
              <span
                onClick={() => onCellClick(lineIndex, channelIndex, 0)}
                style={
                  isFocusedNote
                    ? !isEditMode
                      ? {
                          backgroundColor: 'var(--theme-accent, #38bdf8)',
                          color: '#080d14',
                          borderColor: 'var(--theme-accent-hover, #7dd3fc)',
                          boxShadow: '0 0 6px var(--theme-accent-glow, rgba(56,189,248,0.6))',
                        }
                      : undefined
                    : step.note && step.note !== 'OFF'
                    ? { color: 'var(--theme-note-color, var(--theme-accent, #38bdf8))' }
                    : undefined
                }
                className={`cursor-pointer px-1 h-[16px] inline-flex items-center justify-center rounded-[2px] font-mono font-bold tracking-tight border box-border select-none leading-none ${
                  isFocusedNote
                    ? isEditMode
                      ? 'bg-[#f43f5e] text-white border-[#fb7185] shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                      : ''
                    : 'border-transparent hover:bg-white/5'
                } ${
                  step.note === 'OFF'
                    ? 'text-[#f43f5e] font-bold'
                    : step.note
                    ? 'font-bold'
                    : 'text-[#2a384c]'
                }`}
              >
                {step.note ? step.note : '···'}
              </span>

              {/* 2. Instrument Column */}
              <span
                onClick={() => onCellClick(lineIndex, channelIndex, 1)}
                style={
                  isFocusedInst && !isEditMode
                    ? {
                        backgroundColor: 'var(--theme-accent, #38bdf8)',
                        color: '#080d14',
                        borderColor: 'var(--theme-accent-hover, #7dd3fc)',
                        boxShadow: '0 0 6px var(--theme-accent-glow, rgba(56,189,248,0.6))',
                      }
                    : undefined
                }
                className={`cursor-pointer px-0.5 h-[16px] inline-flex items-center justify-center rounded-[2px] font-mono font-bold border box-border select-none leading-none ${
                  isFocusedInst
                    ? isEditMode
                      ? 'bg-[#fbbf24] text-[#0f172a] border-[#fde047] shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                      : ''
                    : 'border-transparent hover:bg-white/5'
                } ${
                  step.instrument !== null
                    ? 'text-[#fbbf24]'
                    : 'text-[#2a384c]'
                }`}
              >
                {step.instrument !== null ? (step.instrument + 1).toString(16).toUpperCase().padStart(2, '0') : '··'}
              </span>

              {/* 3. Volume / FX Column */}
              <div className="flex items-center gap-1 font-mono">
                <span
                  onClick={() => onCellClick(lineIndex, channelIndex, 2)}
                  style={
                    isFocusedVol && !isEditMode
                      ? {
                          backgroundColor: 'var(--theme-accent, #38bdf8)',
                          color: '#080d14',
                          borderColor: 'var(--theme-accent-hover, #7dd3fc)',
                          boxShadow: '0 0 6px var(--theme-accent-glow, rgba(56,189,248,0.6))',
                        }
                      : undefined
                  }
                  className={`cursor-pointer px-0.5 h-[16px] inline-flex items-center justify-center rounded-[2px] font-mono font-bold border box-border select-none leading-none ${
                    isFocusedVol
                      ? isEditMode
                        ? 'bg-[#f472b6] text-[#080d14] border-[#fbcfe8] shadow-[0_0_6px_rgba(244,114,182,0.8)]'
                        : ''
                      : 'border-transparent hover:bg-white/5'
                  } ${
                    step.volume !== null
                      ? 'text-[#f472b6]'
                      : 'text-[#2a384c]'
                  }`}
                >
                  {step.volume !== null ? step.volume.toString(10).padStart(2, '0') : '··'}
                </span>

                <span
                  onClick={() => onCellClick(lineIndex, channelIndex, 3)}
                  style={
                    isFocusedEff && !isEditMode
                      ? {
                          backgroundColor: 'var(--theme-accent, #38bdf8)',
                          color: '#080d14',
                          borderColor: 'var(--theme-accent-hover, #7dd3fc)',
                          boxShadow: '0 0 6px var(--theme-accent-glow, rgba(56,189,248,0.6))',
                        }
                      : undefined
                  }
                  className={`cursor-pointer px-0.5 h-[16px] inline-flex items-center justify-center rounded-[2px] font-mono font-bold border box-border select-none leading-none ${
                    isFocusedEff
                      ? isEditMode
                        ? 'bg-[#f43f5e] text-white border-[#fb7185] shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                        : ''
                      : 'border-transparent hover:bg-white/5'
                  } ${
                    step.effectCode
                      ? 'text-[#22d3ee]'
                      : 'text-[#2a384c]'
                  }`}
                >
                  {step.effectCode ? step.effectCode : '·'}
                </span>

                <span
                  onClick={() => onCellClick(lineIndex, channelIndex, 4)}
                  style={
                    isFocusedVal && !isEditMode
                      ? {
                          backgroundColor: 'var(--theme-accent, #38bdf8)',
                          color: '#080d14',
                          borderColor: 'var(--theme-accent-hover, #7dd3fc)',
                          boxShadow: '0 0 6px var(--theme-accent-glow, rgba(56,189,248,0.6))',
                        }
                      : undefined
                  }
                  className={`cursor-pointer px-0.5 h-[16px] inline-flex items-center justify-center rounded-[2px] font-mono font-bold border box-border select-none leading-none ${
                    isFocusedVal
                      ? isEditMode
                        ? 'bg-[#f43f5e] text-white border-[#fb7185] shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                        : ''
                      : 'border-transparent hover:bg-white/5'
                  } ${
                    step.effectVal !== null
                      ? 'text-[#22d3ee]'
                      : 'text-[#2a384c]'
                  }`}
                >
                  {step.effectVal !== null ? step.effectVal.toString(16).toUpperCase().padStart(2, '0') : '··'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.isActiveRow !== next.isActiveRow) return false;
  if (prev.isCursorRow !== next.isCursorRow) return false;
  if (prev.isPlaying !== next.isPlaying) return false;
  if (prev.channelsCount !== next.channelsCount) return false;
  if (prev.isEditMode !== next.isEditMode) return false;
  if (prev.steps !== next.steps) return false;
  if (prev.cursorChannel !== next.cursorChannel) return false;
  if (prev.cursorField !== next.cursorField) return false;
  if (prev.selectedTracks !== next.selectedTracks) return false;
  if (prev.mutedChannels !== next.mutedChannels) return false;
  if (prev.soloedChannels !== next.soloedChannels) return false;
  return true;
});
PatternRow.displayName = 'PatternRow';

export const PatternEditor: React.FC<PatternEditorProps> = ({
  pattern,
  currentOrderIndex = 0,
  currentLine,
  isPlaying,
  isEditMode,
  activeOctave,
  activeSampleIndex,
  samples,
  channelsCount,
  bpm = 125,
  speed = 6,
  activeChipSystem = 'c64',
  onChangeBpm,
  onChangeSpeed,
  onChangeOctave,
  onChangeChannelsCount,
  keyboardLayout,
  hasTrackClipboard = false,
  hasPatternClipboard = false,
  canUndo = false,
  canRedo = false,
  onToggleEditMode,
  onUndo,
  onRedo,
  onSelectLine,
  onUpdateStep,
  onPlayPreview,
  onStopPreview,
  onCopyTrack,
  onPasteTrack,
  onClearTrack,
  onCopyTracks,
  onPasteTracks,
  onClearTracks,
  onCopyPattern,
  onPastePattern,
  onDuplicatePattern,
  onClearPattern,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  
  const [selectedTracks, setSelectedTracks] = useState<number[]>([]);
  const [mutedChannels, setMutedChannels] = useState<number[]>([]);
  const [soloedChannels, setSoloedChannels] = useState<number[]>([]);

  const toggleTrackSelect = (channelIndex: number) => {
    setSelectedTracks((prev) =>
      prev.includes(channelIndex)
        ? prev.filter((i) => i !== channelIndex)
        : [...prev, channelIndex]
    );
  };

  const toggleMute = (channelIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isMuted = mutedChannels.includes(channelIndex);
    setMutedChannels((prev) =>
      isMuted ? prev.filter((i) => i !== channelIndex) : [...prev, channelIndex]
    );
    audioEngine.setChannelMute(channelIndex, !isMuted);
  };

  const toggleSolo = (channelIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSoloed = soloedChannels.includes(channelIndex);
    setSoloedChannels((prev) =>
      isSoloed ? prev.filter((i) => i !== channelIndex) : [...prev, channelIndex]
    );
    audioEngine.setChannelSolo(channelIndex, !isSoloed);
  };

  // Cursor state
  const [cursorLine, setCursorLine] = useState<number>(currentLine || 0);
  const [cursorChannel, setCursorChannel] = useState<number>(0);
  const [cursorField, setCursorField] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  // Blinking Tempo / Beat LED State (Strict 4/4 Quarter-Beat Metronome Pulse)
  const [beatPulse, setBeatPulse] = useState(false);
  const [isDownbeat, setIsDownbeat] = useState(false);
  const lastBeatKeyRef = useRef<string>('');
  const beatTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setBeatPulse(false);
      setIsDownbeat(false);
      lastBeatKeyRef.current = '';
      if (beatTimerRef.current) {
        clearTimeout(beatTimerRef.current);
        beatTimerRef.current = null;
      }
      return;
    }

    const beatIndex = Math.floor(currentLine / 4);
    const beatKey = `${currentOrderIndex}-${beatIndex}`;

    // Quarter note beats happen strictly every 4 rows (00, 04, 08, 12...)
    if (currentLine % 4 === 0 && beatKey !== lastBeatKeyRef.current) {
      lastBeatKeyRef.current = beatKey;
      const isFirstBeatOfBar = currentLine % 16 === 0;
      setIsDownbeat(isFirstBeatOfBar);
      setBeatPulse(true);

      if (beatTimerRef.current) {
        clearTimeout(beatTimerRef.current);
      }

      const beatDurationMs = Math.round(60000 / (bpm || 125));
      const flashDuration = Math.max(75, Math.min(160, Math.round(beatDurationMs * 0.32)));

      beatTimerRef.current = window.setTimeout(() => {
        setBeatPulse(false);
      }, flashDuration);
    }
  }, [currentLine, currentOrderIndex, isPlaying, bpm]);

  useEffect(() => {
    return () => {
      if (beatTimerRef.current) {
        clearTimeout(beatTimerRef.current);
      }
    };
  }, []);

  // Measure container height for exact integer pixel center-lock
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    const updateHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (container) {
          setContainerHeight(container.clientHeight);
        }
      });
    };
    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(container);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // Sync cursor line with currentLine when stopped/paused
  useEffect(() => {
    if (!isPlaying) {
      setCursorLine(currentLine);
    }
  }, [isPlaying, currentLine]);

  // Auto-scroll horizontal container when active cursor track changes
  useEffect(() => {
    const scrollEl = horizontalScrollRef.current;
    if (!scrollEl || channelsCount <= 4) return;

    const trackWidth = channelsCount <= 8 ? 120 : 116;
    const trackLeft = cursorChannel * trackWidth;
    const trackRight = trackLeft + trackWidth;
    const currentScroll = scrollEl.scrollLeft;
    const visibleWidth = scrollEl.clientWidth;

    if (trackLeft < currentScroll) {
      scrollEl.scrollTo({
        left: trackLeft,
        behavior: 'smooth',
      });
    } else if (trackRight > currentScroll + visibleWidth) {
      scrollEl.scrollTo({
        left: trackRight - visibleWidth + 12,
        behavior: 'smooth',
      });
    }
  }, [cursorChannel, channelsCount]);

  const activeLine = isPlaying ? currentLine : cursorLine;
  const patLen = pattern?.length || 64;

  const wheelAccumulatorRef = useRef<number>(0);

  // Handle fast, natural mouse-wheel & trackpad scrolling (vertical lines + horizontal track navigation)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Horizontal scrolling on Shift + Wheel or trackpad deltaX
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (horizontalScrollRef.current) {
          const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
          horizontalScrollRef.current.scrollLeft += delta;
        }
        return;
      }

      // 24px per row line for 1:1 natural vertical scroll acceleration
      e.preventDefault();
      wheelAccumulatorRef.current += e.deltaY;
      const stepThreshold = 24;
      const linesDelta = Math.trunc(wheelAccumulatorRef.current / stepThreshold);

      if (linesDelta !== 0) {
        wheelAccumulatorRef.current -= linesDelta * stepThreshold;
        const baseLine = isPlaying ? currentLine : cursorLine;
        const next = Math.max(0, Math.min(patLen - 1, baseLine + linesDelta));
        setCursorLine(next);
        onSelectLine?.(next);
      }
    },
    [currentLine, cursorLine, isPlaying, patLen, onSelectLine]
  );

  const scrollToBank = (startChannelIndex: number) => {
    if (!horizontalScrollRef.current) return;
    const trackWidth = channelsCount <= 4 ? 130 : channelsCount <= 8 ? 120 : 116;
    const targetLeft = startChannelIndex * trackWidth;
    horizontalScrollRef.current.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
    setCursorChannel(startChannelIndex);
  };

  // Transform rows data
  const rowsData = useMemo(() => {
    const rows: TrackerStep[][] = [];
    const patLen = pattern?.length || 64;
    for (let r = 0; r < patLen; r++) {
      const stepRow: TrackerStep[] = [];
      for (let ch = 0; ch < channelsCount; ch++) {
        const chan = pattern?.channels?.[ch];
        const step = Array.isArray(chan) ? chan[r] : (chan as unknown as { steps?: TrackerStep[] })?.steps?.[r];
        stepRow.push(
          step || {
            note: null,
            instrument: null,
            volume: null,
            effectCode: null,
            effectVal: null,
          }
        );
      }
      rows.push(stepRow);
    }
    return rows;
  }, [pattern, channelsCount]);

  const handleCellClick = useCallback(
    (lineIndex: number, channelIndex: number, fieldIndex: 0 | 1 | 2 | 3 | 4) => {
      setCursorLine(lineIndex);
      setCursorChannel(channelIndex);
      setCursorField(fieldIndex);
      onSelectLine?.(lineIndex);
    },
    [onSelectLine]
  );

  // Keyboard navigation & step editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Toggle Edit Mode / Record on Escape (or deselect tracks if multi-selected)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedTracks.length > 0) {
          setSelectedTracks([]);
          return;
        }
        onToggleEditMode?.();
        return;
      }

      // Undo & Redo Shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            onRedo?.();
          } else {
            onUndo?.();
          }
          return;
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          onRedo?.();
          return;
        }
      }

      // Pattern operations keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          onCopyPattern?.();
          return;
        }
        if (e.shiftKey && e.key.toLowerCase() === 'v') {
          e.preventDefault();
          onPastePattern?.();
          return;
        }
        if (e.shiftKey && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          onClearPattern?.();
          return;
        }
      }

      // Track Multi-Select / Track Copy-Paste Shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          if (selectedTracks.length > 1) {
            onCopyTracks?.(selectedTracks);
          } else {
            onCopyTrack?.(cursorChannel);
          }
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          if (selectedTracks.length > 1) {
            onPasteTracks?.(selectedTracks);
          } else {
            onPasteTrack?.(cursorChannel);
          }
          return;
        }
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          if (selectedTracks.length > 1) {
            onClearTracks?.(selectedTracks);
          } else {
            onClearTrack?.(cursorChannel);
          }
          return;
        }
      }

      // Cursor movement
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = cursorLine > 0 ? cursorLine - 1 : pattern.length - 1;
        setCursorLine(next);
        onSelectLine?.(next);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = cursorLine < pattern.length - 1 ? cursorLine + 1 : 0;
        setCursorLine(next);
        onSelectLine?.(next);
        return;
      }
      if (e.key === 'PageUp') {
        e.preventDefault();
        const next = Math.max(0, cursorLine - 16);
        setCursorLine(next);
        onSelectLine?.(next);
        return;
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        const next = Math.min(pattern.length - 1, cursorLine + 16);
        setCursorLine(next);
        onSelectLine?.(next);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setCursorLine(0);
        onSelectLine?.(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        const next = pattern.length - 1;
        setCursorLine(next);
        onSelectLine?.(next);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (cursorField > 0) {
          setCursorField((prev) => (prev - 1) as 0 | 1 | 2 | 3 | 4);
        } else if (cursorChannel > 0) {
          setCursorChannel((prev) => prev - 1);
          setCursorField(4);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (cursorField < 4) {
          setCursorField((prev) => (prev + 1) as 0 | 1 | 2 | 3 | 4);
        } else if (cursorChannel < channelsCount - 1) {
          setCursorChannel((prev) => prev + 1);
          setCursorField(0);
        }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setCursorChannel((prev) => (prev > 0 ? prev - 1 : channelsCount - 1));
        } else {
          setCursorChannel((prev) => (prev < channelsCount - 1 ? prev + 1 : 0));
        }
        return;
      }

      // Enter / Return key: Advance 1 step down (Shift+Enter advances 1 step up)
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = e.shiftKey
          ? (cursorLine > 0 ? cursorLine - 1 : pattern.length - 1)
          : (cursorLine < pattern.length - 1 ? cursorLine + 1 : 0);
        setCursorLine(next);
        onSelectLine?.(next);
        return;
      }

      // Helper to compute exact quantized target row and order for live recording vs manual step input
      const getTargetRowAndOrder = (): { row: number; order: number } => {
        if (isPlaying) {
          const liveStep = audioEngine.getLiveQuantizedStep();
          if (liveStep) {
            return { row: liveStep.lineIndex, order: liveStep.orderIndex };
          }
          return { row: currentLine, order: currentOrderIndex ?? 0 };
        }
        return { row: cursorLine, order: currentOrderIndex ?? 0 };
      };

      // Delete (Delete and step forward 1 line) & Backspace (Delete and step back 1 line)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const { row: targetRow, order: targetOrder } = getTargetRowAndOrder();
        if (cursorField === 0) {
          onUpdateStep(cursorChannel, targetRow, { note: null, instrument: null }, targetOrder);
        } else if (cursorField === 1) {
          onUpdateStep(cursorChannel, targetRow, { instrument: null }, targetOrder);
        } else if (cursorField === 2) {
          onUpdateStep(cursorChannel, targetRow, { volume: null }, targetOrder);
        } else if (cursorField === 3) {
          onUpdateStep(cursorChannel, targetRow, { effectCode: null }, targetOrder);
        } else if (cursorField === 4) {
          onUpdateStep(cursorChannel, targetRow, { effectVal: null }, targetOrder);
        }

        if (!isPlaying) {
          if (e.key === 'Delete') {
            // Delete: Advance 1 step down (Shift+Delete steps 1 up)
            const next = e.shiftKey
              ? (cursorLine > 0 ? cursorLine - 1 : pattern.length - 1)
              : (cursorLine < pattern.length - 1 ? cursorLine + 1 : 0);
            setCursorLine(next);
            onSelectLine?.(next);
          } else if (e.key === 'Backspace') {
            // Backspace: Step 1 line back
            const next = cursorLine > 0 ? cursorLine - 1 : pattern.length - 1;
            setCursorLine(next);
            onSelectLine?.(next);
          }
        }
        return;
      }

      // Note Off / Cut
      if (e.key === '`' || e.key === '~' || e.key === '1') {
        if (cursorField === 0) {
          e.preventDefault();
          const { row: targetRow, order: targetOrder } = getTargetRowAndOrder();
          onUpdateStep(cursorChannel, targetRow, { note: 'OFF' }, targetOrder);
          if (isEditMode && !isPlaying) {
            const next = cursorLine < pattern.length - 1 ? cursorLine + 1 : 0;
            setCursorLine(next);
            onSelectLine?.(next);
          }
          return;
        }
      }

      // Note entry via keyboard piano
      if (cursorField === 0) {
        const map = PIANO_MAPS[keyboardLayout] || PIANO_MAPS.AUTO;
        const key = keyboardLayout === 'AUTO' ? e.code : e.key.toLowerCase();
        
        let semiTone: number | undefined;
        let octaveOffset = 0;

        if (key in map.lower) {
          semiTone = map.lower[key];
          octaveOffset = 0;
        } else if (key in map.upper) {
          semiTone = map.upper[key];
          octaveOffset = 1;
        }

        if (semiTone !== undefined) {
          e.preventDefault();
          const targetOctave = activeOctave + octaveOffset;
          const noteIndex = (semiTone % 12);
          const noteName = NOTES[noteIndex];
          const fullNoteString = `${noteName}${targetOctave}`;
          const midiNum = noteToMidi(fullNoteString);

          const curSample = samples[activeSampleIndex];
          if (curSample) {
            onPlayPreview(midiNum, curSample);
          }

          if (isEditMode) {
            const { row: targetRow, order: targetOrder } = getTargetRowAndOrder();
            onUpdateStep(cursorChannel, targetRow, {
              note: fullNoteString,
              instrument: activeSampleIndex,
            }, targetOrder);
            if (!isPlaying) {
              const next = cursorLine < pattern.length - 1 ? cursorLine + 1 : 0;
              setCursorLine(next);
              onSelectLine?.(next);
            }
          }
          return;
        }
      }

      // Numeric inputs for Instrument & Volume & Effect fields
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'].includes(e.key.toLowerCase())) {
        const val = parseInt(e.key, 16);
        const { row: targetRow, order: targetOrder } = getTargetRowAndOrder();
        if (cursorField === 1 && isEditMode) {
          e.preventDefault();
          onUpdateStep(cursorChannel, targetRow, { instrument: val }, targetOrder);
          if (!isPlaying) {
            const next = cursorLine < pattern.length - 1 ? cursorLine + 1 : 0;
            setCursorLine(next);
            onSelectLine?.(next);
          }
          return;
        }
        if (cursorField === 2 && isEditMode) {
          e.preventDefault();
          const volVal = Math.min(64, parseInt(e.key, 10) * 6);
          onUpdateStep(cursorChannel, targetRow, { volume: volVal }, targetOrder);
          if (!isPlaying) {
            const next = cursorLine < pattern.length - 1 ? cursorLine + 1 : 0;
            setCursorLine(next);
            onSelectLine?.(next);
          }
          return;
        }
        if (cursorField === 4 && isEditMode) {
          e.preventDefault();
          onUpdateStep(cursorChannel, targetRow, { effectVal: val }, targetOrder);
          if (!isPlaying) {
            const next = cursorLine < pattern.length - 1 ? cursorLine + 1 : 0;
            setCursorLine(next);
            onSelectLine?.(next);
          }
          return;
        }
      }
    };

    const handleKeyUp = () => {
      onStopPreview();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    cursorLine,
    cursorChannel,
    cursorField,
    currentLine,
    isPlaying,
    pattern,
    channelsCount,
    keyboardLayout,
    activeOctave,
    activeSampleIndex,
    samples,
    isEditMode,
    selectedTracks,
    onUpdateStep,
    onPlayPreview,
    onStopPreview,
    onCopyTrack,
    onPasteTrack,
    onClearTrack,
    onCopyTracks,
    onPasteTracks,
    onClearTracks,
    onCopyPattern,
    onPastePattern,
    onDuplicatePattern,
    onClearPattern,
    onToggleEditMode,
    onUndo,
    onRedo,
  ]);

  return (
    <div className="rounded-lg flex flex-col h-full min-h-0 overflow-hidden font-mono text-xs select-none glass-panel text-[#cbd5e1]">
      {/* 1. Dedicated Pattern & Actions Toolbar */}
      <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 border-b border-white/10 shrink-0 select-none bg-[#0e141d]/90 backdrop-blur-md overflow-x-auto no-scrollbar">
        {/* Left Area: Pattern Badge & Track Selection */}
        <div className="flex items-center gap-2">
          {/* Connected Pattern Badge */}
          <div className="inline-flex items-center rounded overflow-hidden border border-[#1f364d] shadow-sm bg-[#080d14]">
            <span 
              className="px-2.5 py-1 font-bold font-mono text-[11px] tracking-wider"
              style={{
                color: 'var(--theme-accent, #38bdf8)',
                backgroundColor: 'var(--theme-accent-dim, rgba(56,189,248,0.16))',
              }}
              title={`Active Pattern ${pattern.id}`}
            >
              PATTERN {pattern.id.toString().padStart(2, '0')}
            </span>
          </div>

          {selectedTracks.length > 0 && (
            <div 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border backdrop-blur-sm text-[11px]"
              style={{
                borderColor: 'var(--theme-accent, #0284c7)',
                backgroundColor: 'var(--theme-accent-dim, rgba(3,105,161,0.2))',
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--theme-accent, #38bdf8)' }}
              />
              <span 
                className="font-semibold"
                style={{ color: 'var(--theme-accent, #38bdf8)' }}
              >
                {selectedTracks.length === 1 ? '1 Track Active' : `${selectedTracks.length} Tracks Active`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTracks([])}
                className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-medium text-white cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--theme-accent-dim, rgba(2,132,199,0.3))' }}
                title="Deselect all tracks (Esc)"
              >
                Deselect
              </button>
            </div>
          )}
        </div>

        {/* Center: Hardware Timing Encoders (BPM / SPD / OCT / TRK Tile) */}
        <div className="flex items-center gap-2.5 px-2.5 py-0.5 rounded-lg bg-[#070b10]/80 backdrop-blur-sm border border-[#1a2536] font-mono shadow-inner">
          {/* BPM with Blinking Tempo LED & Steppers */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1" title={isPlaying ? `Beat Pulse (BPM: ${bpm})` : 'Beat LED (Standby)'}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">BPM</span>
              {/* Hardware Beat Pulse LED */}
              <div className="relative w-3.5 h-3.5 rounded-full bg-[#05080d] border border-[#273549] flex items-center justify-center shadow-inner">
                <div
                  className={`w-2 h-2 rounded-full transition-all ease-out ${
                    !isPlaying
                      ? 'opacity-30 scale-90 duration-200'
                      : beatPulse
                      ? isDownbeat
                        ? 'opacity-100 scale-125 duration-75'
                        : 'opacity-95 scale-110 duration-75'
                      : 'opacity-25 scale-90 duration-200'
                  }`}
                  style={{
                    backgroundColor: isPlaying && beatPulse ? 'var(--theme-accent, #38bdf8)' : 'rgba(100, 116, 139, 0.4)',
                    boxShadow: isPlaying && beatPulse 
                      ? (isDownbeat 
                          ? '0 0 16px var(--theme-accent, #38bdf8), 0 0 28px var(--theme-accent, #38bdf8)' 
                          : '0 0 10px var(--theme-accent, #38bdf8), 0 0 18px var(--theme-accent, #38bdf8)') 
                      : 'none',
                  }}
                />
                <div className="absolute top-0.5 left-0.5 w-1 h-0.5 rounded-full bg-white/40 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-0.5 bg-[#0e1520]/90 border border-[#1c2738] px-1 py-0.5 rounded">
              <button
                type="button"
                onClick={() => onChangeBpm?.(Math.max(32, (bpm || 125) - 1))}
                className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                title="BPM -1"
              >
                -
              </button>
              <input
                id="pattern-input-bpm"
                type="number"
                min={32}
                max={255}
                value={bpm}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    onChangeBpm?.(Math.max(32, Math.min(255, val)));
                  }
                }}
                className="w-10 bg-transparent text-center font-bold text-xs focus:outline-none"
                style={{ color: 'var(--theme-accent, #38bdf8)' }}
              />
              <button
                type="button"
                onClick={() => onChangeBpm?.(Math.min(255, (bpm || 125) + 1))}
                className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                title="BPM +1"
              >
                +
              </button>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#1a2636]" />

          {/* SPEED with Steppers */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748b]">SPD</span>
            <div className="flex items-center gap-0.5 bg-[#0e1520]/90 border border-[#1c2738] px-1 py-0.5 rounded">
              <button
                type="button"
                onClick={() => onChangeSpeed?.(Math.max(1, (speed || 6) - 1))}
                className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                title="Speed -1"
              >
                -
              </button>
              <input
                id="pattern-input-speed"
                type="number"
                min={1}
                max={32}
                value={speed}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    onChangeSpeed?.(Math.max(1, Math.min(32, val)));
                  }
                }}
                className="w-7 bg-transparent text-center font-bold text-xs text-[#e2e8f0] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onChangeSpeed?.(Math.min(32, (speed || 6) + 1))}
                className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                title="Speed +1"
              >
                +
              </button>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#1a2636]" />

          {/* OCTAVE */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748b]">OCT</span>
            <div className="flex items-center gap-1 bg-[#0e1520]/90 border border-[#1c2738] px-1.5 py-0.5 rounded">
              <button
                onClick={() => onChangeOctave?.(Math.max(0, activeOctave - 1))}
                className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                title="Octave -1"
              >
                -
              </button>
              <span className="font-bold text-xs min-w-[12px] text-center" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{activeOctave}</span>
              <button
                onClick={() => onChangeOctave?.(Math.min(8, activeOctave + 1))}
                className="px-1 font-bold text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                title="Octave +1"
              >
                +
              </button>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#1a2636]" />

          {/* TRACKS / CHANNELS (Dynamic for chip system) */}
          {(() => {
            const allowedChannels = getAllowedChannelsForSystem(activeChipSystem);
            return (
              <div 
                className="flex items-center gap-1.5" 
                title={`Tracks Polyphony for active chip system`}
              >
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748b]">TRK</span>
                <div className="flex items-center rounded bg-[#0e1520]/90 border border-[#1c2738] overflow-hidden p-0.5 gap-0.5">
                  {allowedChannels.map((count) => {
                    const isActive = channelsCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => onChangeChannelsCount?.(count)}
                        className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded-[3px] transition-all cursor-pointer ${
                          isActive 
                            ? 'text-white shadow-sm font-black' 
                            : 'text-[#64748b] hover:text-[#cbd5e1]'
                        }`}
                        style={isActive ? { backgroundColor: 'var(--theme-badge-bg, #0284c7)' } : undefined}
                        title={`${count} Tracks`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: PATTERN ACTIONS & TRACK BANK CONTROLS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Track Bank Jumper for 8 and 16 Channels */}
          {channelsCount >= 8 && (
            <div className="inline-flex items-center rounded overflow-hidden border border-white/10 bg-[#090e15] p-0.5 gap-0.5">
              {Array.from({ 
                length: Math.ceil(channelsCount / (channelsCount > 8 ? 8 : 4)) 
              }, (_, bankIdx) => {
                const bankSize = channelsCount > 8 ? 8 : 4;
                const startChan = bankIdx * bankSize;
                const endChan = Math.min(channelsCount, (bankIdx + 1) * bankSize);
                const isBankActive = cursorChannel >= startChan && cursorChannel < endChan;
                return (
                  <button
                    key={bankIdx}
                    type="button"
                    onClick={() => scrollToBank(startChan)}
                    className={`h-5 px-2 text-[10px] font-bold rounded-[2px] transition-colors cursor-pointer ${
                      isBankActive
                        ? 'bg-[#38bdf8] text-[#070b10] shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                        : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                    }`}
                    title={`Jump to Tracks ${startChan + 1}-${endChan}`}
                  >
                    TRK {startChan + 1}-{endChan}
                  </button>
                );
              })}
            </div>
          )}

          {channelsCount >= 8 && <div className="h-4 w-[1px] bg-white/10" />}

          {/* Pattern Operations Group */}
          <div className="inline-flex items-center rounded overflow-hidden border border-white/10 bg-[#090e15]">
            <button
              onClick={() => onCopyPattern?.()}
              className="h-6 px-2.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer border-r border-white/10 text-[#cbd5e1] hover:text-white hover:bg-white/5 transition-colors"
              title="Copy Pattern (Ctrl+Shift+C)"
            >
              <Copy className="w-3 h-3" style={{ color: 'var(--theme-accent, #38bdf8)' }} />
              <span>Copy</span>
            </button>

            <button
              onClick={() => onPastePattern?.()}
              className={`h-6 px-2.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer border-r border-white/10 transition-colors ${
                hasPatternClipboard ? 'hover:bg-white/5' : 'text-[#64748b] hover:text-[#cbd5e1] hover:bg-white/5'
              }`}
              style={hasPatternClipboard ? { color: 'var(--theme-accent, #38bdf8)' } : undefined}
              title="Paste Pattern (Ctrl+Shift+V)"
            >
              <Clipboard className="w-3 h-3" />
              <span>Paste</span>
            </button>

            <button
              onClick={() => onClearPattern?.()}
              className="h-6 px-2.5 text-[11px] font-medium flex items-center gap-1 cursor-pointer text-[#cbd5e1] hover:text-[#fb7185] hover:bg-rose-500/10 transition-colors"
              title="Clear Pattern (Ctrl+Shift+X)"
            >
              <Trash2 className="w-3 h-3 text-[#f43f5e]" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Horizontal Track Matrix Area & Vertical Scrubber */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-row relative">
        {/* 1. LEFT PINNED STEP NUMBER & POS/LIN COLUMN (Permanently visible on left, never scrolls horizontally) */}
        <div className="w-[52px] min-w-[52px] shrink-0 flex flex-col border-r border-white/10 bg-[#070b10] z-30 shadow-[2px_0_8px_rgba(0,0,0,0.5)]">
          {/* Top POS & LIN Header */}
          <div 
            className="h-[48px] min-h-[48px] max-h-[48px] border-b border-white/10 bg-[#06090e] flex flex-col justify-center items-center py-1 px-1.5 select-none shrink-0"
            title="Current Position (Order Index) & Line"
          >
            <div className="flex items-center justify-between w-full leading-none">
              <span className="text-[8px] font-bold text-[#64748b] font-mono">POS</span>
              <span className="text-[10px] font-bold font-mono tabular-nums" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{currentOrderIndex.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex items-center justify-between w-full leading-none mt-1">
              <span className="text-[8px] font-bold text-[#64748b] font-mono">LIN</span>
              <span className="text-[10px] font-bold font-mono tabular-nums" style={{ color: 'var(--theme-accent, #38bdf8)' }}>{currentLine.toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Left Step Numbers Viewport */}
          <div 
            onWheel={handleWheel}
            className="relative flex-1 min-h-0 overflow-hidden select-none bg-[#070b10]"
          >
            {/* Center Beam segment for left step numbers */}
            {containerHeight > 0 && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-10 h-[24px] border-y"
                style={{
                  top: `${Math.floor(containerHeight / 2) - 12}px`,
                  background: 'var(--theme-beam-bg)',
                  borderColor: 'var(--theme-beam-border)',
                  boxShadow: 'var(--theme-beam-shadow)',
                }}
              />
            )}

            {/* GPU Hardware-Accelerated Step Numbers List */}
            <div
              className="w-full will-change-transform"
              style={{
                transform: `translate3d(0px, ${Math.floor(containerHeight / 2) - 12 - activeLine * 24}px, 0px)`,
              }}
            >
              {Array.from({ length: patLen }).map((_, lineIndex) => {
                const isActiveRow = lineIndex === activeLine;
                const isBeatMarker = lineIndex % 4 === 0;
                const isBarMarker = lineIndex % 16 === 0;

                return (
                  <div
                    key={lineIndex}
                    onClick={() => {
                      setCursorLine(lineIndex);
                      onSelectLine?.(lineIndex);
                    }}
                    className={`h-[24px] min-h-[24px] max-h-[24px] box-border border-b flex items-center justify-center cursor-pointer transition-colors ${
                      isActiveRow
                        ? 'border-[#38bdf8]/40 bg-[#0f2438]/60'
                        : isBarMarker
                          ? 'bg-[#121923]/70 border-white/10'
                          : isBeatMarker
                            ? 'bg-[#0c1219]/45 border-white/5'
                            : 'border-white/[0.03]'
                    }`}
                  >
                    <div 
                      className={`w-[38px] h-[18px] flex items-center justify-center font-mono text-[11px] font-bold select-none rounded-[2px] tabular-nums ${
                        isActiveRow
                          ? 'text-[#070b10] font-bold'
                          : isBarMarker
                            ? 'bg-white/10'
                            : isBeatMarker
                              ? 'text-[#cbd5e1]'
                              : 'text-[#475569]'
                      }`}
                      style={
                        isActiveRow
                          ? { backgroundColor: 'var(--theme-accent, #38bdf8)', boxShadow: '0 0 8px var(--theme-accent-glow)' }
                          : isBarMarker
                            ? { color: 'var(--theme-accent, #38bdf8)' }
                            : undefined
                      }
                    >
                      {lineIndex.toString().padStart(2, '0')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. RIGHT HORIZONTALLY SCROLLABLE TRACK MATRIX */}
        <div 
          ref={horizontalScrollRef}
          className="flex-1 min-w-0 h-full overflow-x-auto overflow-y-hidden custom-scrollbar flex flex-col relative"
        >
          {/* Top Track Header Matrix */}
          <div 
            className="flex items-stretch border-b border-white/10 shrink-0 select-none bg-[#090d14] backdrop-blur-md min-w-full h-[48px] min-h-[48px] max-h-[48px]"
            style={{ width: channelsCount > 8 ? `${channelsCount * 116}px` : '100%', minWidth: '100%' }}
          >
            {/* Track Headers with Exact Divide-X Matching Pattern Rows Below */}
            <div 
              className="flex-1 divide-x divide-white/[0.08] items-stretch min-w-0" 
              style={getTrackGridStyle(channelsCount)}
            >
              {Array.from({ length: channelsCount }).map((_, i) => {
                const isSelected = selectedTracks.includes(i);
                const isMuted = mutedChannels.includes(i);
                const isSoloed = soloedChannels.includes(i);
                const hasSolo = soloedChannels.length > 0;
                const isEffectiveMuted = hasSolo ? !isSoloed : isMuted;
                const isCursorOnTrack = cursorChannel === i;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setCursorChannel(i);
                      toggleTrackSelect(i);
                    }}
                    className={`relative flex flex-col justify-between py-1.5 px-2 cursor-pointer select-none transition-colors min-w-0 overflow-hidden ${
                      isSelected
                        ? 'bg-[#0f2438] text-white'
                        : isCursorOnTrack
                          ? 'bg-[#0b1622] text-[#f8fafc]'
                          : isEffectiveMuted
                            ? 'bg-[#06090e]/90 text-[#475569] opacity-70'
                            : selectedTracks.length > 0
                              ? 'bg-[#06090e]/80 text-[#64748b] opacity-60'
                              : 'bg-[#080d14] text-[#cbd5e1] hover:bg-[#0d141e]'
                    }`}
                    style={{ minWidth: 0 }}
                    title={
                      isSelected
                        ? `Track ${i + 1} Selected (Click to Deselect)`
                        : isEffectiveMuted
                          ? `Track ${i + 1} (Muted in playback)`
                          : `Track ${i + 1} (Click to Select / Set Active)`
                    }
                  >
                    {/* Top Glowing Indicator when Selected or Focused */}
                    {isSelected && (
                      <div 
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{
                          backgroundColor: 'var(--theme-accent, #38bdf8)',
                          boxShadow: '0 0 8px var(--theme-accent, #38bdf8)',
                        }}
                      />
                    )}

                    {/* Track Title & Mute/Solo Quick Controls */}
                    <div className="flex items-center justify-between w-full leading-none mb-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span 
                          className={`font-mono font-bold tracking-tight text-[11px] truncate leading-none ${
                            isSelected
                              ? ''
                              : isCursorOnTrack
                                ? 'text-white'
                                : isEffectiveMuted
                                  ? 'text-[#64748b] line-through decoration-rose-500/40'
                                  : 'text-[#cbd5e1]'
                          }`}
                          style={isSelected ? { color: 'var(--theme-accent, #38bdf8)' } : undefined}
                        >
                          TRACK {(i + 1).toString().padStart(2, '0')}
                        </span>
                        {isSelected && (
                          <span 
                            className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" 
                            style={{
                              backgroundColor: 'var(--theme-accent, #38bdf8)',
                              boxShadow: '0 0 4px var(--theme-accent, #38bdf8)',
                            }}
                          />
                        )}
                      </div>

                      {/* Tactile Hardware Mute / Solo Buttons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => toggleMute(i, e)}
                          className={`w-4 h-4 rounded-[2px] font-mono text-[9px] font-bold flex items-center justify-center cursor-pointer transition-colors border ${
                            isMuted
                              ? 'bg-rose-500/30 text-rose-300 border-rose-500/60 shadow-[0_0_4px_rgba(244,63,94,0.4)]'
                              : 'bg-white/[0.04] text-[#64748b] border-white/5 hover:text-white hover:bg-white/10'
                          }`}
                          title={isMuted ? `Unmute Track ${i + 1}` : `Mute Track ${i + 1}`}
                        >
                          M
                        </button>
                        <button
                          type="button"
                          onClick={(e) => toggleSolo(i, e)}
                          className={`w-4 h-4 rounded-[2px] font-mono text-[9px] font-bold flex items-center justify-center cursor-pointer transition-colors border ${
                            isSoloed
                              ? 'bg-sky-500/30 text-sky-300 border-sky-500/60 shadow-[0_0_4px_rgba(56,189,248,0.4)]'
                              : 'bg-white/[0.04] text-[#64748b] border-white/5 hover:text-white hover:bg-white/10'
                          }`}
                          title={isSoloed ? `Unsolo Track ${i + 1}` : `Solo Track ${i + 1}`}
                        >
                          S
                        </button>
                      </div>
                    </div>

                    {/* Real-time Dynamic Spectrum Analyzer with Peak-Hold Physics */}
                    <div className="w-full h-[18px] bg-[#040609] rounded-[2px] p-0.5 flex items-center border border-white/[0.06] overflow-hidden">
                      <TrackSpectrumMeter
                        channelIndex={i}
                        isMuted={isEffectiveMuted}
                        isSelected={isSelected}
                        isPlaying={isPlaying}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracker Pattern Grid & Viewport */}
          <div 
            className="relative flex-1 min-h-0 overflow-hidden bg-[#080b0f]/50 backdrop-blur-sm flex min-w-full"
            style={{ width: channelsCount > 8 ? `${channelsCount * 116}px` : '100%', minWidth: '100%' }}
          >
            {/* 100% Stationary Center-Locked Tracking Beam - Absolute Pinned Center across all tracks */}
            {containerHeight > 0 && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-10 h-[24px] border-y min-w-full"
                style={{
                  top: `${Math.floor(containerHeight / 2) - 12}px`,
                  background: 'var(--theme-beam-bg)',
                  borderColor: 'var(--theme-beam-border)',
                  boxShadow: 'var(--theme-beam-shadow)',
                }}
              />
            )}

            {/* Scrollable / Transform Viewport */}
            <div
              ref={containerRef}
              onWheel={handleWheel}
              className="relative flex-1 h-full overflow-hidden select-none cursor-default min-w-full"
              style={{ width: channelsCount > 8 ? `${channelsCount * 116}px` : '100%', minWidth: '100%' }}
            >
              {/* GPU Hardware-Accelerated Rows Layer */}
              <div
                className="w-full will-change-transform min-w-full"
                style={{
                  width: channelsCount > 8 ? `${channelsCount * 116}px` : '100%',
                  minWidth: '100%',
                  transform: `translate3d(0px, ${Math.floor(containerHeight / 2) - 12 - activeLine * 24}px, 0px)`,
                }}
              >
                {rowsData.map((steps, lineIndex) => {
                  const isActiveRow = lineIndex === activeLine;
                  const isCursorRow = lineIndex === cursorLine;

                  return (
                    <PatternRow
                      key={lineIndex}
                      lineIndex={lineIndex}
                      channelsCount={channelsCount}
                      steps={steps}
                      isActiveRow={isActiveRow}
                      isCursorRow={isCursorRow}
                      isPlaying={isPlaying}
                      cursorChannel={cursorChannel}
                      cursorField={cursorField}
                      isEditMode={isEditMode}
                      selectedTracks={selectedTracks}
                      mutedChannels={mutedChannels}
                      soloedChannels={soloedChannels}
                      onCellClick={handleCellClick}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Edge Pattern Scrubbing Rail - Pinned on right outer edge */}
        <div
          className="w-3.5 h-full bg-[#05080c]/80 border-l border-white/5 flex flex-col items-center py-2 cursor-pointer select-none shrink-0 z-40"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            const targetLine = Math.min(patLen - 1, Math.floor(ratio * patLen));
            setCursorLine(targetLine);
            onSelectLine?.(targetLine);
          }}
          title="Pattern Position Scrubber"
        >
          <div className="w-1.5 h-full bg-[#111827] rounded-full relative">
            <div
              className="absolute w-full rounded-full"
              style={{
                height: `${Math.max(6, 100 / patLen)}%`,
                top: `${(activeLine / patLen) * 100}%`,
                backgroundColor: 'var(--theme-accent, #38bdf8)',
                boxShadow: '0 0 6px var(--theme-accent, #38bdf8)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
