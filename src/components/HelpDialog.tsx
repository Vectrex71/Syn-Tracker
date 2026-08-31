/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  ChevronRight,
  BookOpen,
  Keyboard,
  Music,
  Volume2,
  Sliders,
  HardDrive,
  Cpu,
  Radio,
  Disc,
  Download,
  Layers,
  Sparkles,
  Command,
  Coffee,
  Heart
} from 'lucide-react';
import { KeyboardLayout } from '../types';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyboardLayout: KeyboardLayout;
  onStartTutorial?: () => void;
  onOpenSupport?: () => void;
}

type ChapterId = 
  | 'getting_started' 
  | 'shortcuts' 
  | 'piano_map' 
  | 'effects_guide' 
  | 'sampler_dsp' 
  | 'retro_systems' 
  | 'file_formats';

interface ShortcutItem {
  keys: string[];
  action: string;
  category: string;
  description: string;
}

interface FxCommandItem {
  code: string;
  name: string;
  example: string;
  description: string;
}

/**
 * Highlights matches in text safely.
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }

  const cleanQuery = query.trim();
  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-sky-400/25 text-sky-200 font-semibold px-1 py-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function KeyBadge({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-[#16202e] text-slate-200 border border-slate-700/80 rounded shadow-[0_1px_0_rgba(255,255,255,0.1)]">
      {k}
    </kbd>
  );
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ 
  isOpen, 
  onClose, 
  keyboardLayout,
  onStartTutorial,
  onOpenSupport,
}) => {
  const [activeChapter, setActiveChapter] = useState<ChapterId>('getting_started');
  const [searchQuery, setSearchQuery] = useState('');

  const isQwertz = keyboardLayout === 'QWERTZ';
  const isAzerty = keyboardLayout === 'AZERTY';

  const chapters = useMemo(() => [
    { 
      id: 'getting_started' as ChapterId, 
      num: '01',
      title: 'Tracker Basics & Workflow', 
      desc: 'Vertical pattern timeline, step structure & order list',
      icon: BookOpen,
    },
    { 
      id: 'shortcuts' as ChapterId, 
      num: '02',
      title: 'Keyboard Shortcuts', 
      desc: 'Playback, navigation, recording & clipboard commands',
      icon: Keyboard,
    },
    { 
      id: 'piano_map' as ChapterId, 
      num: '03',
      title: 'Virtual Piano & MIDI', 
      desc: 'Keyboard note layout & USB MIDI controller mapping',
      icon: Music,
    },
    { 
      id: 'effects_guide' as ChapterId, 
      num: '04',
      title: 'Pattern FX Reference', 
      desc: 'Complete command table: arpeggio, portamento, volume & timing',
      icon: Volume2,
    },
    { 
      id: 'sampler_dsp' as ChapterId, 
      num: '05',
      title: 'Sample Editor & Master FX', 
      desc: 'Slicing, zero-crossing loops, 3-band EQ, delay & tube saturation',
      icon: Sliders,
    },
    { 
      id: 'retro_systems' as ChapterId, 
      num: '06',
      title: 'Retro Soundchips & Systems', 
      desc: 'Amiga ST-Disks, C64 SID, Game Boy DMG-01, NES 2A03 & Sega Genesis',
      icon: Cpu,
    },
    { 
      id: 'file_formats' as ChapterId, 
      num: '07',
      title: 'Export Hub & File Formats', 
      desc: '.MOD, .TRK, .SID, .PRG executable, 24-bit WAV, MP3 & Stems ZIP',
      icon: Download,
    },
  ], []);

  // Shortcut dataset for Chapter 2
  const shortcuts: ShortcutItem[] = useMemo(() => [
    { category: 'Transport', keys: ['Space'], action: 'Play / Pause', description: 'Starts or pauses playback from current row without moving edit cursor.' },
    { category: 'Transport', keys: ['F5'], action: 'Play Song', description: 'Plays song from beginning of Order List.' },
    { category: 'Transport', keys: ['F6'], action: 'Loop Pattern', description: 'Loops the currently active pattern indefinitely.' },
    { category: 'Transport', keys: ['F8'], action: 'Stop', description: 'Stops playback immediately and silences active audio channels.' },
    { category: 'Editing', keys: ['Esc'], action: 'Toggle Edit Mode', description: 'Switches between live keyboard recording and preview playback mode.' },
    { category: 'Editing', keys: ['Enter'], action: 'Step Down', description: 'Advances the cursor down 1 row in the pattern grid.' },
    { category: 'Editing', keys: ['Shift', 'Enter'], action: 'Step Up', description: 'Advances the cursor up 1 row in the pattern grid.' },
    { category: 'Editing', keys: ['Delete'], action: 'Clear Note & Step Down', description: 'Erases the active note/command and moves 1 step forward.' },
    { category: 'Editing', keys: ['Backspace'], action: 'Clear Note & Step Up', description: 'Erases the active note/command and moves 1 step backward.' },
    { category: 'Navigation', keys: ['Tab'], action: 'Next Channel', description: 'Moves focus to the next channel column (Tracks 1–16).' },
    { category: 'Navigation', keys: ['Shift', 'Tab'], action: 'Previous Channel', description: 'Moves focus to the previous channel column.' },
    { category: 'Navigation', keys: ['PgUp', 'PgDn'], action: 'Jump 16 Rows', description: 'Jumps 16 steps forward or backward through the pattern.' },
    { category: 'Navigation', keys: ['Home'], action: 'Jump to Step 00', description: 'Jumps directly to the very top row of the current pattern.' },
    { category: 'Navigation', keys: ['End'], action: 'Jump to Step 63', description: 'Jumps to the bottom row (step 63) of the pattern.' },
    { category: 'Clipboard', keys: ['Ctrl', 'C'], action: 'Copy Track', description: 'Copies all rows of the current channel column to clipboard.' },
    { category: 'Clipboard', keys: ['Ctrl', 'V'], action: 'Paste Track', description: 'Pastes clipboard rows into the active channel column.' },
    { category: 'Clipboard', keys: ['Ctrl', 'Shift', 'C'], action: 'Copy Entire Pattern', description: 'Copies all channels across all 64 steps.' },
    { category: 'Clipboard', keys: ['Ctrl', 'Shift', 'V'], action: 'Paste Pattern', description: 'Pastes complete multi-track pattern.' },
    { category: 'History', keys: ['Ctrl', 'Z'], action: 'Undo', description: 'Reverts previous edit with multi-level history.' },
    { category: 'History', keys: ['Ctrl', 'Y'], action: 'Redo', description: 'Re-applies previously undone operation.' },
  ], []);

  // ProTracker FX dataset for Chapter 4
  const fxCommands: FxCommandItem[] = useMemo(() => [
    { code: '0xy', name: 'Arpeggio', example: '047', description: 'Rapidly cycles base note, note+x semitones, and note+y semitones per tick. 047 = Major triad, 037 = Minor triad. Quintessential chiptune sound.' },
    { code: '1xx', name: 'Portamento Up', example: '103', description: 'Slides note pitch upward continuously at speed xx per tick.' },
    { code: '2xx', name: 'Portamento Down', example: '203', description: 'Slides note pitch downward continuously at speed xx per tick.' },
    { code: '3xx', name: 'Tone Portamento', example: '305', description: 'Glides pitch smoothly towards a new target note at speed xx without retriggering the sample attack envelope.' },
    { code: '4xy', name: 'Vibrato', example: '442', description: 'Modulates note pitch with a sine LFO. Parameter x = modulation speed/rate, y = vibrato depth.' },
    { code: '9xx', name: 'Sample Offset', example: '910', description: 'Starts playback from byte offset xx * 256. Perfect for slicing drum breakbeats without separate audio files.' },
    { code: 'Axy', name: 'Volume Slide', example: 'A02', description: 'Gradually slides volume up by x or down by y each tick. A02 fades down, A20 fades up.' },
    { code: 'Bxx', name: 'Position Jump', example: 'B04', description: 'Jumps directly to song order position xx in the sequence list.' },
    { code: 'Cxx', name: 'Set Volume', example: 'C40', description: 'Sets channel volume directly in hex. C00 = silence, C20 = 50%, C40 = 100% full volume.' },
    { code: 'Dxx', name: 'Pattern Break', example: 'D00', description: 'Ends current pattern early and jumps to row xx of the next pattern in the order list.' },
    { code: 'E9x', name: 'Retrigger Note', example: 'E93', description: 'Retriggers note sample every x ticks. Essential for drum rolls, drill fills and stutters.' },
    { code: 'ECx', name: 'Note Cut', example: 'EC3', description: 'Silences the playing note after x ticks within the step row. Creates tight staccato bass and gated snares.' },
    { code: 'Fxx', name: 'Set Speed / BPM', example: 'F06 / F7D', description: 'Values 01-1F set Speed in ticks per row (F06 = standard 6 ticks). Values 20-FF set musical BPM (F7D = 125 BPM).' },
  ], []);

  // Filter shortcuts / FX if search active
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return shortcuts;
    const q = searchQuery.toLowerCase().trim();
    return shortcuts.filter(s => 
      s.action.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q) || 
      s.category.toLowerCase().includes(q) ||
      s.keys.some(k => k.toLowerCase().includes(q))
    );
  }, [shortcuts, searchQuery]);

  const filteredFx = useMemo(() => {
    if (!searchQuery.trim()) return fxCommands;
    const q = searchQuery.toLowerCase().trim();
    return fxCommands.filter(f => 
      f.code.toLowerCase().includes(q) || 
      f.name.toLowerCase().includes(q) || 
      f.example.toLowerCase().includes(q) || 
      f.description.toLowerCase().includes(q)
    );
  }, [fxCommands, searchQuery]);

  // Global ESC listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeChapterObj = chapters.find(c => c.id === activeChapter) || chapters[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="help-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none"
          onClick={onClose}
        >
          <motion.div 
            key="help-dialog-content"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl h-[88vh] bg-[#0c121c] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl text-slate-300"
          >
            
            {/* Header */}
            <div className="h-14 bg-[#0f1724] border-b border-slate-800/90 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
                    SYN-Tracker Reference Manual
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Audio Engine & Keyboard Reference Guide
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose} 
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Close (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Content Layout: Sidebar + Documentation Body */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              
              {/* Left Sidebar */}
              <div className="w-72 bg-[#090e17] border-r border-slate-800/80 flex flex-col p-3 shrink-0">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search manual..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111927] border border-slate-800 text-slate-200 text-xs pl-8 pr-7 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 placeholder:text-slate-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Chapter List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase px-2.5 py-1">
                    Chapters
                  </div>

                  {chapters.map((chapter) => {
                    const isActive = activeChapter === chapter.id;
                    const Icon = chapter.icon;
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => setActiveChapter(chapter.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer group ${
                          isActive
                            ? 'bg-[#142030] text-sky-300 font-medium border border-sky-500/30'
                            : 'text-slate-400 hover:bg-[#0f1724] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`font-mono text-[10px] ${isActive ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
                            {chapter.num}
                          </span>
                          <span className="truncate">{chapter.title}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Content Pane */}
              <div className="flex-1 bg-[#090e17]/50 p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                
                {/* Chapter 1: Fundamentals */}
                {activeChapter === 'getting_started' && (
                  <div className="max-w-3xl space-y-6">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 01</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Tracker Basics & Core Workflow</h1>
                      <p className="text-xs text-slate-400 mt-1">Understanding the vertical pattern grid, step anatomy, and song sequencing.</p>
                    </div>

                    <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-100">The Vertical Timeline Philosophy</h3>
                        <p>
                          Unlike traditional horizontal timeline DAWs, trackers arrange musical data vertically from top to bottom. Each pattern represents <strong>64 rhythmic rows</strong> (indexed 00 to 63) executing across parallel audio tracks.
                        </p>
                      </section>

                      {/* Step Anatomy Visualization */}
                      <div className="bg-[#0f1724] border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="text-[11px] font-semibold text-slate-300">Step Cell Anatomy (4 Parameters)</div>
                        <div className="font-mono text-sm bg-[#080d15] p-3 rounded-lg border border-slate-800/80 flex items-center justify-between text-slate-300">
                          <div className="flex items-center gap-6">
                            <div>
                              <span className="text-sky-400 font-bold">C-4</span>
                              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Note (Pitch)</span>
                            </div>
                            <div>
                              <span className="text-emerald-400 font-bold">01</span>
                              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Sample (01–1F)</span>
                            </div>
                            <div>
                              <span className="text-rose-400 font-bold">C40</span>
                              <span className="block text-[10px] text-slate-500 font-sans mt-0.5">Command & Param</span>
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-slate-400 font-sans hidden sm:block">
                            Full volume C-4 on Instrument #1
                          </div>
                        </div>
                      </div>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-100">Order List & Song Structure</h3>
                        <p>
                          A full song is composed of an <strong>Order List</strong>. Instead of duplicating lengthy pattern data, you reuse patterns by assigning their IDs in sequence (e.g. Order 00 &rarr; Pattern 00 [Intro], Order 01 &rarr; Pattern 01 [Verse], Order 02 &rarr; Pattern 02 [Chorus]).
                        </p>
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-100">BPM vs. Speed (Ticks per Row)</h3>
                        <p>
                          <strong>BPM</strong> controls the musical beats per minute. <strong>Speed</strong> defines the number of internal audio clock ticks per row (Default is 6 ticks = 4 rows per beat). Reducing Speed to 3 provides double-speed resolution for intricate arpeggios and fast breakbeats.
                        </p>
                      </section>
                    </div>
                  </div>
                )}

                {/* Chapter 2: Keyboard Shortcuts */}
                {activeChapter === 'shortcuts' && (
                  <div className="max-w-3xl space-y-5">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 02</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Keyboard Shortcuts Reference</h1>
                      <p className="text-xs text-slate-400 mt-1">Master quick editing, transport controls, and clipboard operations.</p>
                    </div>

                    {/* Clean tabular list */}
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0f1724]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#0b111a] border-b border-slate-800 text-slate-400 font-medium">
                            <th className="py-2.5 px-4 w-44">Key Combination</th>
                            <th className="py-2.5 px-4 w-48">Action</th>
                            <th className="py-2.5 px-4 hidden sm:table-cell">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredShortcuts.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2 px-4">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {item.keys.map((k, kIdx) => (
                                    <React.Fragment key={kIdx}>
                                      <KeyBadge k={k} />
                                      {kIdx < item.keys.length - 1 && <span className="text-slate-500 text-[10px]">+</span>}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2 px-4 font-medium text-slate-200">
                                <HighlightedText text={item.action} query={searchQuery} />
                              </td>
                              <td className="py-2 px-4 text-slate-400 text-[11px] hidden sm:table-cell">
                                <HighlightedText text={item.description} query={searchQuery} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Chapter 3: Piano & MIDI */}
                {activeChapter === 'piano_map' && (
                  <div className="max-w-3xl space-y-6">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 03</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Virtual Piano & MIDI Mapping</h1>
                      <p className="text-xs text-slate-400 mt-1">Computer keyboard octave layout and plug-and-play USB MIDI support.</p>
                    </div>

                    {/* Visual Key Layout Chart */}
                    <div className="space-y-4">
                      <div className="bg-[#0f1724] border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-200">
                          Upper Octave (C-3 to C-4) — Numbers & Top Letter Row
                        </div>
                        <div className="grid grid-cols-7 sm:grid-cols-13 gap-1 font-mono text-center text-xs">
                          {[
                            { k: isAzerty ? 'A' : 'Q', note: 'C-3', white: true },
                            { k: isAzerty ? 'É' : '2', note: 'C#3', white: false },
                            { k: isAzerty ? 'Z' : 'W', note: 'D-3', white: true },
                            { k: isAzerty ? '"' : '3', note: 'D#3', white: false },
                            { k: 'E', note: 'E-3', white: true },
                            { k: 'R', note: 'F-3', white: true },
                            { k: isAzerty ? '(' : '5', note: 'F#3', white: false },
                            { k: 'T', note: 'G-3', white: true },
                            { k: isAzerty ? '-' : '6', note: 'G#3', white: false },
                            { k: isQwertz ? 'Z' : 'Y', note: 'A-3', white: true },
                            { k: isAzerty ? 'È' : '7', note: 'A#3', white: false },
                            { k: 'U', note: 'B-3', white: true },
                            { k: 'I', note: 'C-4', white: true },
                          ].map((item, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 rounded border ${
                                item.white 
                                  ? 'bg-[#151f2e] border-slate-700 text-slate-100' 
                                  : 'bg-[#080d14] border-slate-800 text-sky-300'
                              }`}
                            >
                              <div className="text-[10px] text-slate-500 font-sans">{item.k}</div>
                              <div className="font-bold text-xs mt-0.5">{item.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-[#0f1724] border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-200">
                          Lower Octave (C-2 to B-2) — Bottom Row
                        </div>
                        <div className="grid grid-cols-7 sm:grid-cols-12 gap-1 font-mono text-center text-xs">
                          {[
                            { k: isQwertz ? 'Y' : isAzerty ? 'W' : 'Z', note: 'C-2', white: true },
                            { k: 'S', note: 'C#2', white: false },
                            { k: 'X', note: 'D-2', white: true },
                            { k: 'D', note: 'D#2', white: false },
                            { k: 'C', note: 'E-2', white: true },
                            { k: 'V', note: 'F-2', white: true },
                            { k: 'G', note: 'F#2', white: false },
                            { k: 'B', note: 'G-2', white: true },
                            { k: 'H', note: 'G#2', white: false },
                            { k: 'N', note: 'A-2', white: true },
                            { k: 'J', note: 'A#2', white: false },
                            { k: 'M', note: 'B-2', white: true },
                          ].map((item, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 rounded border ${
                                item.white 
                                  ? 'bg-[#151f2e] border-slate-700 text-slate-100' 
                                  : 'bg-[#080d14] border-slate-800 text-emerald-300'
                              }`}
                            >
                              <div className="text-[10px] text-slate-500 font-sans">{item.k}</div>
                              <div className="font-bold text-xs mt-0.5">{item.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                      <h3 className="text-sm font-semibold text-slate-100">USB & Bluetooth MIDI Controller Support</h3>
                      <p>
                        Plug in any class-compliant MIDI controller keyboard. Incoming MIDI Note-On events are mapped directly with velocity into the active pattern channel with zero setup required.
                      </p>
                    </div>
                  </div>
                )}

                {/* Chapter 4: FX Reference */}
                {activeChapter === 'effects_guide' && (
                  <div className="max-w-3xl space-y-5">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 04</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Pattern Effect Commands Reference</h1>
                      <p className="text-xs text-slate-400 mt-1">Standard tracker effect hex command codes and modulation parameters.</p>
                    </div>

                    {/* FX Table */}
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0f1724]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#0b111a] border-b border-slate-800 text-slate-400 font-medium">
                            <th className="py-2.5 px-4 w-20 font-mono">Code</th>
                            <th className="py-2.5 px-4 w-36">Command</th>
                            <th className="py-2.5 px-4 w-24 font-mono">Example</th>
                            <th className="py-2.5 px-4">Explanation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                          {filteredFx.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-sky-400">
                                <HighlightedText text={item.code} query={searchQuery} />
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-200">
                                <HighlightedText text={item.name} query={searchQuery} />
                              </td>
                              <td className="py-2.5 px-4 font-mono text-emerald-400 text-[11px]">
                                {item.example}
                              </td>
                              <td className="py-2.5 px-4 text-slate-300 text-xs leading-relaxed">
                                <HighlightedText text={item.description} query={searchQuery} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Chapter 5: Sampler & DSP */}
                {activeChapter === 'sampler_dsp' && (
                  <div className="max-w-3xl space-y-6">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 05</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Sample Editor & Master DSP Rack</h1>
                      <p className="text-xs text-slate-400 mt-1">Audio waveform slicing, zero-crossing snapping, and 3-band mastering chain.</p>
                    </div>

                    <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-100">Waveform Selection & Slicing</h3>
                        <p>
                          Click and drag across the waveform canvas in the Sample Editor to define active selection boundaries. Use <strong>Trim / Crop</strong> to permanently remove audio outside the markers, optimizing project memory.
                        </p>
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-100">Zero-Crossing Snapping & Sustain Loops</h3>
                        <p>
                          Enable <strong>Zero-Crossing Snap</strong> to ensure loop start and end points align with 0dB amplitude transitions, eliminating clicks and pop artifacts during looping. Supports both <em>Forward Loops</em> (wrap end to start) and <em>Ping-Pong Loops</em> (back and forth).
                        </p>
                      </section>

                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-100">Master Effects Chain</h3>
                        <div className="bg-[#0f1724] border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-200">1. Parametric 3-Band EQ</span>
                            <span className="text-slate-400">Low (80Hz), Mid (1kHz), High (10kHz)</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-200">2. Ping-Pong Delay</span>
                            <span className="text-slate-400">BPM-synchronized stereo feedback</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-200">3. Tube Saturation & Brickwall Limiter</span>
                            <span className="text-slate-400">Harmonic warmth + 0dB safety ceiling</span>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {/* Chapter 6: Retro Soundchips & Systems */}
                {activeChapter === 'retro_systems' && (
                  <div className="max-w-3xl space-y-8">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 06</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Retro Soundchips & Systems</h1>
                      <p className="text-xs text-slate-400 mt-1">Hardware specs, soundchip engines, and vintage library integration.</p>
                    </div>

                    {/* Dedicated Guide: Dedicated Players vs Pattern Trackers */}
                    <div className="border border-sky-500/30 rounded-xl bg-sky-950/20 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2 text-sky-300 font-bold text-xs sm:text-sm">
                        <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Why Retro Chiptune Formats (.SID, .NSF, .GBS, .VGM) Differ from Trackers (.MOD, .TRK)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Understanding how classic game systems generated music explains why certain files are played by <strong>CPU emulators</strong> rather than read as editable note sheets:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-300 mt-2">
                        <div className="p-3 rounded-lg bg-[#0b131f] border border-slate-800 space-y-1.5">
                          <strong className="text-amber-400 font-mono block">Commodore 64 (.SID / .PRG)</strong>
                          <p className="text-slate-400">
                            C64 SIDs contain raw <strong>MOS 6502 machine code</strong>. Each composer wrote custom assembly routines (running at 50Hz–200Hz) to write directly into SID registers ($D400–$D418).
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#0b131f] border border-slate-800 space-y-1.5">
                          <strong className="text-rose-400 font-mono block">Nintendo NES / Famicom (.NSF)</strong>
                          <p className="text-slate-400">
                            NES Music Format (.NSF) is compiled <strong>Ricoh 2A03 6502 assembly</strong> code. Dedicated players emulate the NES CPU to trigger sound routines every frame.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#0b131f] border border-slate-800 space-y-1.5">
                          <strong className="text-emerald-400 font-mono block">Nintendo Game Boy (.GBS)</strong>
                          <p className="text-slate-400">
                            Game Boy Sound (.GBS) files contain <strong>Sharp LR35902 (Z80-hybrid) binary code</strong> that writes to hardware audio registers ($FF10–$FF3F).
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#0b131f] border border-slate-800 space-y-1.5">
                          <strong className="text-purple-400 font-mono block">Sega Mega Drive / Genesis (.VGM / .CYM)</strong>
                          <p className="text-slate-400">
                            Video Game Music (.VGM) files are <strong>timed register-dump streams</strong> capturing every byte sent to the Yamaha YM2612 FM synth and SN76489 PSG chip.
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-sky-200/90 leading-relaxed pt-1">
                        <strong>SYN-Tracker's Role:</strong> SYN-Tracker provides an interactive composition studio for all these systems with accurate DSP synthesis models. Songs created here can be saved, edited, reloaded, and exported as native tracker modules (.MOD, .TRK), studio audio (.WAV, .MP3), and real C64 executable binaries (.SID, .PRG).
                      </p>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Commodore Amiga & ST Sound Disks */}
                      <div className="border border-slate-800/90 rounded-xl bg-[#0b121c] p-5 space-y-4">
                        <div className="border-b border-slate-800/80 pb-3">
                          <div>
                            <h2 className="text-base font-bold text-slate-100">Commodore Amiga 500 / 1200</h2>
                            <p className="text-[11px] text-sky-400 font-mono">MOS Technology 8364 Paula • 4 Channels DMA (8-bit PCM)</p>
                          </div>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-300">
                          The Amiga Paula sound processor streams 8-bit linear PCM audio using hardware DMA channels with zero host CPU usage. SYN-Tracker precisely models Paula's hard left/right channel split and the switchable <strong>4.4 kHz analog Butterworth LED low-pass filter</strong> for authentic demoscene sound.
                        </p>

                        {/* ST Sound Disk Vault Feature */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3.5 rounded-lg bg-[#070d15] border border-slate-800">
                          <img 
                            src="/Disk_Blue.png" 
                            alt="ST-Disk" 
                            className="w-12 h-12 object-contain shrink-0 drop-shadow" 
                          />
                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-slate-200">Integrated ST-Disk Sound Vault (115 Disks / 10,547+ Instruments)</h3>
                            <p className="text-[11px] text-slate-400 leading-normal">
                              Direct access to the complete vintage floppy collection of 115 ST disks containing 10,547+ original instruments from Karsten Obarski, SoundTracker, and 90s tracker disks.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Commodore 64 / SID */}
                      <div className="border border-slate-800/90 rounded-xl bg-[#0b121c] p-5 space-y-4">
                        <div className="border-b border-slate-800/80 pb-3">
                          <div>
                            <h2 className="text-base font-bold text-slate-100">Commodore 64</h2>
                            <p className="text-[11px] text-amber-400 font-mono">MOS 6581 / 8580 SID • 3-Voice Hybrid Synthesizer</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <div className="sm:col-span-2 text-xs leading-relaxed text-slate-300 space-y-2">
                            <p>
                              Bob Yannes’ iconic SID chip features 3 oscillators with Triangle, Sawtooth, variable Pulse Width Modulation (PWM), and pseudo-random Noise, combined with a multi-mode resonant analog filter (LP/BP/HP/Notch) and ring modulation.
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Use the dedicated <strong>SID Synth Lab</strong> to tweak ADSR envelopes, filter cutoffs, resonance, and pulse modulation in real time, then export directly to C64 executable binaries (.PRG) or .SID music tracks.
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <img 
                              src="/C64.png" 
                              alt="C64 System" 
                              className="w-full max-w-[160px] object-contain rounded-lg opacity-90" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Game Boy DMG-01 */}
                      <div className="border border-slate-800/90 rounded-xl bg-[#0b121c] p-5 space-y-4">
                        <div className="border-b border-slate-800/80 pb-3">
                          <div>
                            <h2 className="text-base font-bold text-slate-100">Nintendo Game Boy (DMG-01)</h2>
                            <p className="text-[11px] text-emerald-400 font-mono">Sharp LR35902 APU • 4 Audio Channels</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <div className="sm:col-span-2 text-xs leading-relaxed text-slate-300 space-y-2">
                            <p>
                              The classic DMG sound architecture generates iconic handheld chiptune audio across 4 discrete channels:
                            </p>
                            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1 ml-1">
                              <li><strong>Pulse 1:</strong> Square wave with automatic pitch sweep register.</li>
                              <li><strong>Pulse 2:</strong> Variable duty cycles (12.5%, 25%, 50%, 75%).</li>
                              <li><strong>Wave:</strong> 32-step 4-bit user programmable sample RAM for bass and vocal tones.</li>
                              <li><strong>Noise:</strong> 7-bit & 15-bit LFSR noise for crisp hi-hats and crunchy snares.</li>
                            </ul>
                          </div>
                          <div className="flex justify-center">
                            <img 
                              src="/GB.png" 
                              alt="Game Boy DMG" 
                              className="w-full max-w-[130px] object-contain rounded-lg opacity-90" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* NES / Famicom */}
                      <div className="border border-slate-800/90 rounded-xl bg-[#0b121c] p-5 space-y-4">
                        <div className="border-b border-slate-800/80 pb-3">
                          <div>
                            <h2 className="text-base font-bold text-slate-100">Nintendo Entertainment System / Famicom</h2>
                            <p className="text-[11px] text-rose-400 font-mono">Ricoh 2A03 (NTSC) / 2A07 (PAL) • 5 Audio Channels</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <div className="sm:col-span-2 text-xs leading-relaxed text-slate-300 space-y-2">
                            <p>
                              The definitive 8-bit sound chip featuring 2 duty-variable Pulse channels, an unattenuated 32-step pure Triangle wave channel (essential for authentic 80s basslines), a 16-step LFSR Noise generator, and a 1-bit Delta Modulation Channel (DPCM) for 1-bit drum samples and speech synthesis.
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <img 
                              src="/NES.png" 
                              alt="Nintendo NES Console" 
                              className="w-full max-w-[170px] object-contain rounded-lg opacity-90" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sega Mega Drive / Genesis */}
                      <div className="border border-slate-800/90 rounded-xl bg-[#0b121c] p-5 space-y-4">
                        <div className="border-b border-slate-800/80 pb-3">
                          <div>
                            <h2 className="text-base font-bold text-slate-100">Sega Mega Drive / Genesis</h2>
                            <p className="text-[11px] text-purple-400 font-mono">Yamaha YM2612 (OPN2) FM & Texas Instruments SN76489 PSG</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <div className="sm:col-span-2 text-xs leading-relaxed text-slate-300 space-y-2">
                            <p>
                              The 16-bit arcade powerhouse combines 6 channels of 4-operator FM synthesis (with 8 operator routing algorithms and Channel 6 Direct 8-bit DAC mode for PCM drums) alongside 3 square wave channels and 1 noise channel from the integrated SN76489 PSG.
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <img 
                              src="/Megadrive.png" 
                              alt="Sega Mega Drive Console" 
                              className="w-full max-w-[170px] object-contain rounded-lg opacity-90" 
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Chapter 7: File Formats & Export Hub */}
                {activeChapter === 'file_formats' && (
                  <div className="max-w-3xl space-y-6">
                    <div>
                      <div className="text-[11px] font-mono text-sky-400 mb-1">CHAPTER 07</div>
                      <h1 className="text-xl font-bold text-white tracking-tight">Export Hub & File Formats</h1>
                      <p className="text-xs text-slate-400 mt-1">Comprehensive export options for retro hardware emulators, physical computers, and modern DAWs.</p>
                    </div>

                    <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                      
                      {/* Format Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        
                        <div className="bg-[#0b121c] border border-slate-800 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sky-400 text-sm">
                              .MOD
                            </span>
                            <span className="text-[10px] font-mono font-bold text-sky-400/80 bg-sky-950/60 border border-sky-500/30 px-1.5 py-0.5 rounded">
                              4 / 8 CHANNELS
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Standard 4-channel &amp; extended 8-channel (up to 8 Channels) binary module format. Stores 8-bit PCM audio samples, patterns, and song sequences. 100% playable on real Amiga hardware, WinUAE, OpenMPT, and VLC.
                          </p>
                        </div>

                        <div className="bg-[#0b121c] border border-slate-800 rounded-xl p-4 space-y-2">
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            .TRK
                          </div>
                          <p className="text-[11px] text-slate-300">
                            High-fidelity JSON project container supporting up to 16 channels, 16-bit 44.1kHz audio samples, stereo panning curves, 3-band Master EQ, delay, and saturation parameters.
                          </p>
                        </div>

                        <div className="bg-[#0b121c] border border-slate-800 rounded-xl p-4 space-y-2">
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            .SID
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Standard PSID v2 chiptune container containing 6502 machine code and SID driver routine. Playable in SIDPLAY, VICE emulator, and retro audio players.
                          </p>
                        </div>

                        <div className="bg-[#0b121c] border border-slate-800 rounded-xl p-4 space-y-2">
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            .PRG
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Directly runnable machine-code program with load address $0801. Ready to write to floppy disk (.D64) or execute on real Commodore 64 / TheC64 / VICE.
                          </p>
                        </div>

                        <div className="bg-[#0b121c] border border-slate-800 rounded-xl p-4 space-y-2">
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            WAV & MP3
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Render full project mixdowns directly to 24-bit / 44.1 kHz uncompressed studio WAV or web-ready MP3 audio for distribution and streaming.
                          </p>
                        </div>

                        <div className="bg-[#0b121c] border border-slate-800 rounded-xl p-4 space-y-2">
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            Stems ZIP
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Exports individual isolated audio tracks into a ZIP archive for professional remixing and mastering in Ableton Live, FL Studio, or Logic Pro.
                          </p>
                        </div>

                      </div>

                      <section className="bg-[#0f1724] border border-slate-800 rounded-xl p-4 space-y-2 mt-4">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-sky-400" />
                          <h3 className="text-sm font-semibold text-slate-100">Continuous Auto-Save & Browser Storage</h3>
                        </div>
                        <p className="text-slate-300 text-[11px]">
                          Your work is continuously auto-saved in local browser IndexedDB storage. If a power outage or accidental tab closure occurs, SYN-Tracker presents an instant session recovery option upon your return.
                        </p>
                      </section>

                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Clean, Refined Footer */}
            <div className="h-12 bg-[#0f1724] border-t border-slate-800/90 px-6 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Press <KeyBadge k="Space" /> to test playback at any time
                </span>
                {onOpenSupport && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSupport();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                  >
                    <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Support / Buy Coffee</span>
                  </button>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="px-4 py-1.5 font-medium rounded-lg text-xs cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors"
              >
                Close
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
