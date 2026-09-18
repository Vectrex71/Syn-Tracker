/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Keyboard, 
  Globe, 
  Sliders, 
  Volume2, 
  ShieldCheck, 
  Check, 
  Info, 
  Heart,
  Award,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { KeyboardLayout, RetroChipSystem, getAllowedChannelsForSystem } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyboardLayout: KeyboardLayout;
  onChangeKeyboardLayout: (layout: KeyboardLayout) => void;
  channelsCount: number;
  onChangeChannelsCount: (count: number) => void;
  highlightRows: number;
  onChangeHighlightRows: (rows: number) => void;
  songName?: string;
  onChangeSongName?: (name: string) => void;
  activeChipSystem?: RetroChipSystem | null;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  channelsCount,
  onChangeChannelsCount,
  highlightRows,
  onChangeHighlightRows,
  songName,
  onChangeSongName,
  activeChipSystem,
}) => {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'tracker' | 'audio' | 'about'>('keyboard');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none">
      <div className="bg-[#11161d]/95 backdrop-blur-xl border border-white/10 w-full max-w-2xl h-[520px] max-h-[90vh] rounded-lg overflow-hidden shadow-2xl flex flex-col text-[#cbd5e1]">
        
        {/* Header */}
        <div className="bg-[#161d27]/80 backdrop-blur-md border-b border-white/10 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#1f2b3b]/80 border border-[#2d3d52] text-[#38bdf8]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[#f1f5f9] font-bold tracking-wider text-xs uppercase">
                SETTINGS & HARDWARE CONFIG
              </h2>
              <p className="text-[10px] text-[#64748b] uppercase tracking-wider">
                System Preferences, Keyboard Calibration & Audio Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded hover:bg-[#1f2b3b] transition-colors"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Tabs & Main Settings Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Navigation Sidebar */}
          <div className="w-44 bg-[#0d1218]/80 backdrop-blur-md border-r border-white/10 p-2.5 flex flex-col gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('keyboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all text-left ${
                activeTab === 'keyboard'
                  ? 'bg-[#182535] text-[#38bdf8] border border-[#2c3f56]'
                  : 'text-[#64748b] hover:text-white hover:bg-[#131922]'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard Map</span>
            </button>

            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all text-left ${
                activeTab === 'tracker'
                  ? 'bg-[#182535] text-[#38bdf8] border border-[#2c3f56]'
                  : 'text-[#64748b] hover:text-white hover:bg-[#131922]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Pattern Grid</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all text-left ${
                activeTab === 'audio'
                  ? 'bg-[#182535] text-[#38bdf8] border border-[#2c3f56]'
                  : 'text-[#64748b] hover:text-white hover:bg-[#131922]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all text-left ${
                activeTab === 'about'
                  ? 'bg-[#182535] text-[#38bdf8] border border-[#2c3f56]'
                  : 'text-[#64748b] hover:text-white hover:bg-[#131922]'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>About &amp; Project</span>
            </button>
          </div>

          {/* Settings Content View */}
          <div className="flex-1 p-5 overflow-y-auto min-h-0 custom-scrollbar text-xs">
            {/* TAB 1: KEYBOARD LAYOUT */}
            {activeTab === 'keyboard' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[#38bdf8] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Keyboard Mapping Engine</span>
                  </h3>
                  <p className="text-[#64748b] text-[11px] leading-relaxed">
                    The tracker uses automatic physical key position detection for seamless play on all hardware keyboards worldwide.
                  </p>
                </div>

                <div className="bg-[#0e131a] border border-[#273547] p-3.5 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#38bdf8]">
                      <Check className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>Hardware Direct Position (AUTO)</span>
                    </div>
                    <span className="text-[9px] bg-[#172535] border border-[#2d435e] px-2 py-0.5 rounded text-[#38bdf8] font-bold">
                      ACTIVE & UNIVERSAL
                    </span>
                  </div>

                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    Uses physical key codes (<code className="text-[#38bdf8]">KeyboardEvent.code</code>). Piano keys automatically map accurately to physical key positions on any computer keyboard layout worldwide (DE, CH, US, UK, FR, etc.) without manual switching.
                  </p>

                  <div className="pt-2 border-t border-[#1e2733] grid grid-cols-2 gap-2 text-[10px] font-mono text-[#64748b]">
                    <div className="bg-[#141b24] p-2 rounded border border-[#212b38]">
                      <span className="text-[#38bdf8] font-bold block mb-0.5">Lower Octave (C-2)</span>
                      <span>Bottom-left key position triggers base note C-2</span>
                    </div>
                    <div className="bg-[#141b24] p-2 rounded border border-[#212b38]">
                      <span className="text-[#fbbf24] font-bold block mb-0.5">Upper Octave (C-3)</span>
                      <span>Top-left row key position triggers octave note C-3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TRACKER OPTIONS */}
            {activeTab === 'tracker' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[#38bdf8] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mb-1">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Song Project & Grid Settings</span>
                  </h3>
                  <p className="text-[#64748b] text-[11px]">
                    Customize song title, tracker pattern layout and track count.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Song Title / Name */}
                  {onChangeSongName && (
                    <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[#f1f5f9] font-bold block text-xs">Song Title / Name</span>
                        <span className="text-[11px] text-[#64748b]">Display title used for MOD export & saving</span>
                      </div>
                      <div className="w-full sm:w-56">
                        <input
                          type="text"
                          value={songName || ''}
                          onChange={(e) => onChangeSongName(e.target.value)}
                          maxLength={32}
                          placeholder="e.g. Back on Track"
                          className="w-full bg-[#141b24] border border-[#212b38] focus:border-[#38bdf8] text-[#38bdf8] px-3 py-1.5 rounded text-xs font-mono outline-none shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  {/* Channels Count */}
                  <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded flex items-center justify-between">
                    <div>
                      <span className="text-[#f1f5f9] font-bold block text-xs">Channels Count</span>
                      <span className="text-[11px] text-[#64748b]">
                        {activeChipSystem === 'c64'
                          ? 'C64 SID: 3 Hardware voices locked'
                          : activeChipSystem === 'gameboy'
                          ? 'Game Boy DMG: 4 Hardware channels locked'
                          : activeChipSystem === 'nes'
                          ? 'NES 2A03: 4 Hardware channels locked'
                          : activeChipSystem === 'megadrive'
                          ? 'Sega Mega Drive: 4 Channels locked'
                          : activeChipSystem === 'amiga'
                          ? 'Amiga ProTracker / Paula: 4 or 8 Tracks'
                          : 'SYN-Tracker TRK Format: 4, 8, or 16 Tracks'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {getAllowedChannelsForSystem(activeChipSystem).map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => onChangeChannelsCount(cnt)}
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer aqua-gloss ${
                            channelsCount === cnt ? 'aqua-blue' : 'aqua-dark'
                          }`}
                          title={`${cnt} Tracks`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Highlight Rows */}
                  <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded flex items-center justify-between">
                    <div>
                      <span className="text-[#f1f5f9] font-bold block text-xs">Row Highlight Interval</span>
                      <span className="text-[11px] text-[#64748b]">Visual beat markers in the grid</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onChangeHighlightRows(4)}
                        className={`px-3 py-1 rounded text-xs font-bold cursor-pointer aqua-gloss ${
                          highlightRows === 4 ? 'aqua-blue' : 'aqua-dark'
                        }`}
                      >
                        Every 4 Rows
                      </button>
                      <button
                        onClick={() => onChangeHighlightRows(8)}
                        className={`px-3 py-1 rounded text-xs font-bold cursor-pointer aqua-gloss ${
                          highlightRows === 8 ? 'aqua-blue' : 'aqua-dark'
                        }`}
                      >
                        Every 8 Rows
                      </button>
                    </div>
                  </div>

                  {/* Live Recording Quantizer */}
                  <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[#f1f5f9] font-bold block text-xs">Live Recording Quantizer (SPACE + Edit Mode)</span>
                        <span className="text-[11px] text-[#64748b]">
                          Snaps live keyboard input with sub-millisecond precision to the nearest physical tracker step
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const next = !audioEngine.enableLiveQuantize;
                          audioEngine.setLiveQuantize(next);
                          setActiveTab('tracker');
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                          audioEngine.enableLiveQuantize
                            ? 'bg-[#38bdf8] text-[#090d12] border-[#38bdf8]'
                            : 'bg-[#151c26] text-[#94a3b8] border-[#273547] hover:text-white'
                        }`}
                      >
                        {audioEngine.enableLiveQuantize ? 'QUANTIZE ON' : 'QUANTIZE OFF'}
                      </button>
                    </div>
                    <div className="p-2.5 bg-[#121b26] border border-[#1f2e42] rounded text-[11px] text-[#94a3b8]">
                      <span className="text-[#38bdf8] font-bold">Nearest Step Alignment: </span>
                      Notes played slightly early (anticipating the beat) or slightly late will accurately land on their intended row instead of bleeding into neighboring steps.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AUDIO ENGINE */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[#38bdf8] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mb-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio System & Amiga Hardware Options</span>
                  </h3>
                  <p className="text-[#64748b] text-[11px]">
                    Configure Web Audio API synthesizer, Amiga Paula filter, and stereo separation.
                  </p>
                </div>

                {/* Amiga Hardware Controls */}
                <div className="space-y-3">
                  {/* Amiga LED Filter */}
                  <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded flex items-center justify-between">
                    <div>
                      <span className="text-[#f1f5f9] font-bold block text-xs">Amiga Hardware Filter ("LED Filter")</span>
                      <span className="text-[11px] text-[#64748b]">Emulates warm Amiga Paula 4.8 kHz lowpass output filter</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextState = !audioEngine.enableAmigaFilter;
                        audioEngine.setAmigaFilter(nextState);
                        setActiveTab('audio');
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                        audioEngine.enableAmigaFilter
                          ? 'bg-[#38bdf8] text-[#090d12] border-[#38bdf8]'
                          : 'bg-[#151c26] text-[#94a3b8] border-[#273547] hover:text-white'
                      }`}
                    >
                      {audioEngine.enableAmigaFilter ? 'FILTER ON' : 'FILTER OFF'}
                    </button>
                  </div>

                  {/* Amiga Stereo Separation Slider */}
                  <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[#f1f5f9] font-bold block text-xs">Amiga Stereo Separation</span>
                        <span className="text-[11px] text-[#64748b]">Width for classic 4-channel LRRL panning</span>
                      </div>
                      <span className="text-[#38bdf8] font-bold text-xs">
                        {Math.round(audioEngine.amigaStereoSeparation * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioEngine.amigaStereoSeparation}
                      onChange={(e) => {
                        audioEngine.setStereoSeparation(parseFloat(e.target.value));
                        setActiveTab('audio');
                      }}
                      className="w-full accent-[#38bdf8] bg-[#1e2733] h-1.5 rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#64748b]">
                      <span>0% (Mono)</span>
                      <span>70% (Classic)</span>
                      <span>100% (Hard Amiga L/R)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0e131a] border border-[#1e2733] p-3.5 rounded space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8] font-bold">Audio Output Driver</span>
                    <span className="text-[#38bdf8] font-bold">Web Audio API (44.1 kHz / 48 kHz)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8] font-bold">Polyphony</span>
                    <span className="text-[#38bdf8] font-bold">Unlimited (Multi-Node)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8] font-bold">Latency Mode</span>
                    <span className="text-[#fbbf24] font-bold">Interactive Low Latency</span>
                  </div>
                </div>

                <div className="p-3 bg-[#111d29] border border-[#213a52] rounded text-[#38bdf8] text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#38bdf8] flex-shrink-0" />
                  <span>All ProTracker effects (Arpeggio, Pitch Slides, Vibrato, Sample Offset, Vol Slides, Pattern Jumps) execute live in Web Audio.</span>
                </div>
              </div>
            )}

            {/* TAB 4: ABOUT & PROJECT */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sky-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mb-1">
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                    <span>About SYN-Tracker</span>
                  </h3>
                  <p className="text-[#64748b] text-[11px] leading-relaxed">
                    SYN-Tracker is a 100% free, open retro audio workstation and chiptune tracker powered by the modern Web Audio API.
                  </p>
                </div>

                <div className="bg-[#0e131a] border border-[#273547] p-4 rounded-xl space-y-3 text-xs leading-relaxed text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-white font-mono text-[11px] uppercase tracking-wider">
                      100% Free &amp; Open Philosophy
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Every synthesizer, sample instrument, chip engine, DSP effect, visualizer mode, and export format (WAV, MP3, Multi-Track Stems, 60 FPS Video) is completely unlocked and unrestricted for all creators forever.
                  </p>
                </div>

                {/* Creator & Portfolio link */}
                <div className="bg-[#0e131a] border border-[#273547] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-white font-bold text-xs">Synthek Design</div>
                    <div className="text-[11px] text-slate-400 font-mono">Hansjürg Wüthrich • Switzerland</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://bsky.app/profile/hj-wuethrich.bsky.social"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono transition-colors"
                      title="Follow on Bluesky (@hj-wuethrich.bsky.social)"
                    >
                      <img src="/bluesky.svg" alt="Bluesky" className="w-3.5 h-3.5 object-contain" />
                      <span>Bluesky</span>
                    </a>
                    <a
                      href="https://www.hj-wuethrich.cv"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
                    >
                      <span>Portfolio</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Engine Spec Details */}
                <div className="p-3.5 rounded-xl bg-[#080d14] border border-slate-800/80 font-mono text-[11px] text-slate-400 space-y-1.5">
                  <div className="text-slate-300 font-bold mb-1">Emulated Chip Architectures:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                    <div>• Commodore 64 (SID 6581/8580)</div>
                    <div>• Nintendo NES (Ricoh 2A03)</div>
                    <div>• Game Boy (Sharp LR35902 DMG)</div>
                    <div>• Sega Mega Drive (Yamaha YM2612)</div>
                    <div>• Atari 2600 (TIA Audio)</div>
                    <div>• SNK Neo Geo (YM2610 Arcade)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#161d27] border-t border-[#212b38] px-5 py-2.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-[#64748b] font-mono">
            SETTINGS ARE AUTOMATICALLY SAVED
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 font-bold rounded text-xs cursor-pointer aqua-gloss aqua-blue"
          >
            DONE
          </button>
        </div>

      </div>
    </div>
  );
};
