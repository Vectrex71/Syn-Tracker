/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Settings, Keyboard, Globe, Sliders, Volume2, ShieldCheck, Check, Coffee, Heart, Eye, EyeOff, ExternalLink } from 'lucide-react';
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
  showSupportButton?: boolean;
  onToggleSupportButton?: (show: boolean) => void;
  onOpenSupport?: () => void;
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
  showSupportButton = true,
  onToggleSupportButton,
  onOpenSupport,
}) => {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'tracker' | 'audio' | 'support'>('keyboard');

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
              onClick={() => setActiveTab('support')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all text-left ${
                activeTab === 'support'
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                  : 'text-[#64748b] hover:text-amber-300 hover:bg-[#131922]'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>Support & Dev</span>
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

            {/* TAB 4: SUPPORT & DONATIONS */}
            {activeTab === 'support' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-amber-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mb-1">
                    <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Support Indie Development & Coffee Tip</span>
                  </h3>
                  <p className="text-[#64748b] text-[11px] leading-relaxed">
                    SYN-Tracker is free, open, and community-driven. You can support future chip synthesizers and updates or hide the support buttons.
                  </p>
                </div>

                {/* Visibility Toggle with official Switch for Support Buttons across all Personas */}
                <div className="bg-[#0e131a] border border-[#273547] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {showSupportButton ? (
                          <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-[#f1f5f9] font-bold text-xs">
                          Show Support Button in Interface
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748b] leading-relaxed">
                        Show or hide the &quot;Support&quot; button in Tracker, Sample Editor, Visualizer &amp; Cover Designer.
                      </p>
                    </div>

                    {/* Official Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showSupportButton}
                      onClick={() => onToggleSupportButton?.(!showSupportButton)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                        showSupportButton
                          ? 'bg-amber-500 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                          : 'bg-[#1e293b] border-[#334155]'
                      }`}
                      title={showSupportButton ? 'Click to disable (hide)' : 'Click to enable (show)'}
                    >
                      <span className="sr-only">Toggle Support Button</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-[1px] ${
                          showSupportButton ? 'translate-x-6.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#64748b]">Status:</span>
                    <span className={showSupportButton ? 'text-amber-400 font-bold' : 'text-slate-400 font-medium'}>
                      {showSupportButton ? '● VISIBLE (ON)' : '○ HIDDEN (OFF)'}
                    </span>
                  </div>
                </div>

                {/* Direct Donation Channels - Generous Vertical Stack */}
                <div className="flex flex-col gap-2.5">
                  {/* Buy Me a Coffee */}
                  <a
                    href="https://buymeacoffee.com/hj_wuethrich"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 bg-[#131922] border border-amber-500/30 hover:border-amber-400/80 rounded-xl flex items-center justify-between group transition-all hover:bg-amber-950/20 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 text-base font-bold shadow">
                        ☕
                      </div>
                      <div className="min-w-0">
                        <div className="text-[#f1f5f9] font-bold text-xs group-hover:text-amber-300 transition-colors">
                          Buy Me a Coffee
                        </div>
                        <div className="text-[11px] text-[#94a3b8] font-mono truncate">
                          buymeacoffee.com/hj_wuethrich
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="text-[11px] font-mono text-amber-400 hidden sm:inline group-hover:underline">Open</span>
                      <ExternalLink className="w-4 h-4 text-[#64748b] group-hover:text-amber-400 transition-colors" />
                    </div>
                  </a>

                  {/* PayPal.Me */}
                  <a
                    href="https://paypal.me/HansjuergWuethrich"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 bg-[#131922] border border-sky-500/30 hover:border-sky-400/80 rounded-xl flex items-center justify-between group transition-all hover:bg-sky-950/20 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-[#0070ba] flex items-center justify-center text-white text-base font-bold shadow">
                        P
                      </div>
                      <div className="min-w-0">
                        <div className="text-[#f1f5f9] font-bold text-xs group-hover:text-sky-300 transition-colors">
                          PayPal.Me Tip
                        </div>
                        <div className="text-[11px] text-[#94a3b8] font-mono truncate">
                          paypal.me/HansjuergWuethrich
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="text-[11px] font-mono text-sky-400 hidden sm:inline group-hover:underline">Open</span>
                      <ExternalLink className="w-4 h-4 text-[#64748b] group-hover:text-sky-400 transition-colors" />
                    </div>
                  </a>
                </div>

                {/* Open Full Support Modal with QR Code */}
                {onOpenSupport && (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSupport();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_12px_rgba(251,191,36,0.12)]"
                    >
                      <Coffee className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>Open Full Support Card &amp; QR Code Scanner</span>
                    </button>
                  </div>
                )}
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
