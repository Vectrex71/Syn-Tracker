/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { KeyboardLayout, TrackerSample } from '../types';
import { NOTES, midiToNote, getPlaybackRate } from '../lib/audioEngine';
import { Volume2, Music, Keyboard, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AuditionNoteInfo {
  midiNote: number;
  noteStr: string;
  keyLabel: string;
  playbackRate: number;
}

interface SynEditorAuditionBarProps {
  currentBuffer: AudioBuffer | null;
  activeOctave: number;
  setActiveOctave: React.Dispatch<React.SetStateAction<number>>;
  keyboardLayout: KeyboardLayout;
  setKeyboardLayout: React.Dispatch<React.SetStateAction<KeyboardLayout>>;
  activeAuditionNote: AuditionNoteInfo | null;
  onPlayNote: (midiNote: number) => void;
  onStopNote: () => void;
  baseNote?: number;
  finetune?: number;
}

// 29-semitone visual piano key definition (covering lower & upper keyboard rows)
interface PianoKeyDef {
  semitoneOffset: number; // 0 to 28
  noteIndex: number;      // 0 to 11
  noteName: string;       // "C", "C#", "D", etc.
  isBlack: boolean;
  lowerKeyHint?: string;
  upperKeyHint?: string;
}

export const SynEditorAuditionBar: React.FC<SynEditorAuditionBarProps> = ({
  currentBuffer,
  activeOctave,
  setActiveOctave,
  keyboardLayout,
  setKeyboardLayout,
  activeAuditionNote,
  onPlayNote,
  onStopNote,
  baseNote = 48,
  finetune = 0,
}) => {
  // Key hints based on layout
  const keyHints = useMemo(() => {
    const isQwertz = keyboardLayout === 'QWERTZ';
    const isAzerty = keyboardLayout === 'AZERTY';

    return {
      lower: [
        { offset: 0, key: isAzerty ? 'W' : isQwertz ? 'Y' : 'Z' },
        { offset: 1, key: 'S' },
        { offset: 2, key: 'X' },
        { offset: 3, key: 'D' },
        { offset: 4, key: 'C' },
        { offset: 5, key: 'V' },
        { offset: 6, key: 'G' },
        { offset: 7, key: 'B' },
        { offset: 8, key: 'H' },
        { offset: 9, key: 'N' },
        { offset: 10, key: 'J' },
        { offset: 11, key: isAzerty ? ',' : 'M' },
        { offset: 12, key: isAzerty ? ';' : ',' },
      ],
      upper: [
        { offset: 12, key: isAzerty ? 'A' : 'Q' },
        { offset: 13, key: isAzerty ? '2' : '2' },
        { offset: 14, key: isAzerty ? 'Z' : 'W' },
        { offset: 15, key: isAzerty ? '3' : '3' },
        { offset: 16, key: 'E' },
        { offset: 17, key: 'R' },
        { offset: 18, key: isAzerty ? '(' : '5' },
        { offset: 19, key: 'T' },
        { offset: 20, key: isAzerty ? '-' : '6' },
        { offset: 21, key: isAzerty ? 'Y' : isQwertz ? 'Z' : 'Y' },
        { offset: 22, key: isAzerty ? '7' : '7' },
        { offset: 23, key: 'U' },
        { offset: 24, key: 'I' },
        { offset: 25, key: isAzerty ? '9' : '9' },
        { offset: 26, key: 'O' },
        { offset: 27, key: isAzerty ? '0' : '0' },
        { offset: 28, key: 'P' },
      ],
    };
  }, [keyboardLayout]);

  // Build the 29 piano keys spanning over 2.4 octaves
  const pianoKeys = useMemo<PianoKeyDef[]>(() => {
    const keys: PianoKeyDef[] = [];
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const blackIndices = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

    for (let offset = 0; offset <= 28; offset++) {
      const noteIdx = offset % 12;
      const isBlack = blackIndices.includes(noteIdx);
      const lowerHint = keyHints.lower.find((k) => k.offset === offset)?.key;
      const upperHint = keyHints.upper.find((k) => k.offset === offset)?.key;

      keys.push({
        semitoneOffset: offset,
        noteIndex: noteIdx,
        noteName: noteNames[noteIdx],
        isBlack,
        lowerKeyHint: lowerHint,
        upperKeyHint: upperHint,
      });
    }
    return keys;
  }, [keyHints]);

  const handleOctaveDown = () => {
    setActiveOctave((prev) => Math.max(1, prev - 1));
  };

  const handleOctaveUp = () => {
    setActiveOctave((prev) => Math.min(6, prev + 1));
  };

  return (
    <div className="w-full flex flex-col gap-1.5 pt-2 border-t border-[#1a2638]/90 select-none">
      {/* Audition Top Control Ribbon */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        {/* Left: Info & Live Note Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#090e16] border border-[#1e2d42] text-slate-300 font-mono text-[11px]">
            <Keyboard className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-slate-200">KEYBOARD AUDITION</span>
          </div>

          {activeAuditionNote ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-950/80 border border-sky-400/50 text-sky-200 font-mono text-[11px] font-bold shadow-[0_0_12px_rgba(56,189,248,0.25)] animate-pulse">
              <Music className="w-3 h-3 text-sky-300" />
              <span>{activeAuditionNote.noteStr}</span>
              <span className="text-sky-400/70 text-[10px]">({activeAuditionNote.playbackRate.toFixed(2)}x)</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[10.5px] font-mono text-slate-500">
              <span>Press keyboard letters to audition pitches</span>
            </div>
          )}
        </div>

        {/* Right: Octave Shift & Keyboard Layout Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Octave Controls */}
          <div className="flex items-center gap-1 bg-[#090e16] px-1.5 py-0.5 rounded border border-[#1e2d42] text-xs">
            <span className="text-[10px] font-bold text-slate-400 font-mono mr-0.5">OCT:</span>
            <button
              onClick={handleOctaveDown}
              disabled={activeOctave <= 1}
              className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs transition-all ${
                activeOctave > 1 ? 'bg-[#162232] hover:bg-[#203248] text-sky-300 cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-600'
              }`}
              title="Octave Down (Shortcut: [ or -)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-sky-400 w-3.5 text-center text-xs">
              {activeOctave}
            </span>
            <button
              onClick={handleOctaveUp}
              disabled={activeOctave >= 6}
              className={`h-5 w-5 rounded flex items-center justify-center font-bold text-xs transition-all ${
                activeOctave < 6 ? 'bg-[#162232] hover:bg-[#203248] text-sky-300 cursor-pointer' : 'opacity-30 cursor-not-allowed text-slate-600'
              }`}
              title="Octave Up (Shortcut: ] or +)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Keyboard Layout Toggle */}
          <div className="flex items-center gap-1 bg-[#090e16] px-1.5 py-0.5 rounded border border-[#1e2d42] text-xs">
            <span className="text-[10px] font-bold text-slate-400 font-mono">LAYOUT:</span>
            <select
              value={keyboardLayout}
              onChange={(e) => setKeyboardLayout(e.target.value as KeyboardLayout)}
              className="bg-transparent text-[11px] font-mono font-bold text-sky-300 focus:outline-none cursor-pointer"
            >
              <option value="AUTO" className="bg-[#0c121b] text-slate-200">AUTO (Physical)</option>
              <option value="QWERTZ" className="bg-[#0c121b] text-slate-200">QWERTZ (DE/CH)</option>
              <option value="QWERTY" className="bg-[#0c121b] text-slate-200">QWERTY (US/UK)</option>
              <option value="AZERTY" className="bg-[#0c121b] text-slate-200">AZERTY (FR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Piano Keys Strip with Keycap Bindings */}
      <div className="relative w-full h-[52px] bg-[#05080c] rounded-lg border border-[#182333] p-1 flex items-stretch overflow-x-auto overflow-y-hidden select-none shadow-inner scrollbar-thin">
        <div className="flex items-stretch flex-1 min-w-[580px] gap-0.5 relative">
          {pianoKeys.map((k) => {
            const currentMidi = 12 * (activeOctave + 1) + k.semitoneOffset;
            const currentOctaveNum = Math.floor(currentMidi / 12) - 1;
            const isNoteActive = activeAuditionNote?.midiNote === currentMidi;
            const rate = getPlaybackRate(currentMidi, baseNote, finetune);

            if (k.isBlack) {
              return (
                <div
                  key={k.semitoneOffset}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPlayNote(currentMidi);
                  }}
                  onMouseUp={onStopNote}
                  onMouseLeave={onStopNote}
                  className={`flex-1 min-w-[16px] max-w-[24px] h-[34px] rounded-b-[3px] border z-10 flex flex-col items-center justify-between pb-0.5 pt-0.5 cursor-pointer transition-all ${
                    isNoteActive
                      ? 'bg-sky-400 border-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.8)] text-slate-950 font-bold -translate-y-0.5'
                      : 'bg-[#151c27] hover:bg-[#202c3d] border-[#29384d] text-slate-400'
                  }`}
                  title={`${k.noteName}${currentOctaveNum} (Rate: ${rate.toFixed(2)}x) - Key: ${k.upperKeyHint || k.lowerKeyHint || ''}`}
                >
                  <span className={`text-[8px] font-mono leading-none ${isNoteActive ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                    {k.noteName}
                  </span>
                  {(k.upperKeyHint || k.lowerKeyHint) && (
                    <span className={`text-[8px] font-mono font-bold px-0.5 rounded-[2px] leading-none ${
                      isNoteActive ? 'bg-black/30 text-white' : 'bg-black/40 text-amber-300'
                    }`}>
                      {k.upperKeyHint || k.lowerKeyHint}
                    </span>
                  )}
                </div>
              );
            }

            // White Key
            return (
              <div
                key={k.semitoneOffset}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPlayNote(currentMidi);
                }}
                onMouseUp={onStopNote}
                onMouseLeave={onStopNote}
                className={`flex-1 min-w-[20px] h-full rounded-b-[4px] border flex flex-col items-center justify-between pb-1 pt-1 cursor-pointer transition-all ${
                  isNoteActive
                    ? 'bg-sky-400 border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.85)] text-slate-950 font-bold -translate-y-0.5 z-20'
                    : 'bg-[#223042] hover:bg-[#2d3e54] border-[#374961] text-slate-200'
                }`}
                title={`${k.noteName}${currentOctaveNum} (Rate: ${rate.toFixed(2)}x) - Keys: ${[k.lowerKeyHint, k.upperKeyHint].filter(Boolean).join(' / ')}`}
              >
                <div className="flex flex-col items-center leading-none gap-0.5">
                  <span className={`text-[9px] font-mono font-bold ${isNoteActive ? 'text-slate-950' : 'text-slate-300'}`}>
                    {k.noteName}{k.noteName === 'C' ? currentOctaveNum : ''}
                  </span>
                </div>

                {/* Key Binding Hint Badges */}
                <div className="flex items-center gap-0.5">
                  {k.lowerKeyHint && (
                    <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded-[2px] leading-none ${
                      isNoteActive ? 'bg-black/40 text-white' : 'bg-[#101824] text-sky-300 border border-[#2a3c52]'
                    }`}>
                      {k.lowerKeyHint}
                    </span>
                  )}
                  {k.upperKeyHint && (
                    <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded-[2px] leading-none ${
                      isNoteActive ? 'bg-black/40 text-white' : 'bg-[#101824] text-amber-300 border border-[#2a3c52]'
                    }`}>
                      {k.upperKeyHint}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
