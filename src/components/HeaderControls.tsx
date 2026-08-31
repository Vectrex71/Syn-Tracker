/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Pause, 
  Save, 
  FolderOpen, 
  Disc, 
  Keyboard, 
  HelpCircle, 
  Settings, 
  Plus, 
  FileAudio, 
  Download, 
  ChevronDown, 
  Music, 
  Sliders, 
  Undo2, 
  Redo2,
  HardDrive,
  Laptop,
  Sparkles,
  Cpu,
  Pencil,
  Check,
  Layers,
  Film,
  Video,
  Repeat,
  Waves,
  Coffee
} from 'lucide-react';
import { TrackerSong, KeyboardLayout, RetroChipSystem, getAllowedChannelsForSystem } from '../types';
import { getAvailableExportFormats } from '../utils/exportFilters';
import { PersonaSwitcher, AppPersona } from './PersonaSwitcher';

export const CHIP_ICON_MAP: Record<RetroChipSystem, string> = {
  c64: '/C64.png',
  gameboy: '/GB.png',
  nes: '/NES.png',
  megadrive: '/Megadrive.png',
  amiga: '/Icon_A500.png',
  trk: '/Icon_TRK.png',
};

export const CHIP_LABEL_MAP: Record<RetroChipSystem, string> = {
  c64: 'C64 SID',
  gameboy: 'Game Boy',
  nes: 'NES 2A03',
  megadrive: 'Mega Drive',
  amiga: 'ST-Disks Collection',
  trk: 'SYN-Tracker TRK',
};

interface HeaderControlsProps {
  song: TrackerSong;
  isPlaying: boolean;
  isEditMode: boolean;
  activeOctave: number;
  keyboardLayout: KeyboardLayout;
  currentOrderIndex: number;
  currentLine: number;
  isSavingLocal: boolean;
  isFxRackOpen?: boolean;
  isPatternLoop?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  activeChipSystem?: RetroChipSystem | null;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleFxRack?: () => void;
  onTogglePatternLoop?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleEditMode: () => void;
  onChangeBpm: (bpm: number) => void;
  onChangeSpeed: (speed: number) => void;
  onChangeOctave: (octave: number) => void;
  onChangeChannelsCount?: (count: number) => void;
  onOpenLocalDialog: () => void;
  onSaveLocalDialog: () => void;
  onOpenLocalFile?: (file: File) => void;
  onSaveProjectFile?: () => void;
  onNewSong: () => void;
  onLoadDemo?: () => void;
  onToggleHelp: () => void;
  onOpenSettings: () => void;
  onImportMod?: (file: File) => void;
  onImportSid?: (file: File) => void;
  onExportMod?: () => void;
  onExportWav?: () => void;
  onExportMp3?: () => void;
  onOpenExportModal?: () => void;
  onOpenLanding?: () => void;
  onStartTutorial?: () => void;
  onOpenSidSynth?: (system?: RetroChipSystem) => void;
  onOpenAmigaVault?: () => void;
  onOpenVisualizerStudio?: () => void;
  onOpenSynEditor?: () => void;
  onSelectPersona?: (persona: AppPersona) => void;
  onUpdateSongName?: (name: string) => void;
  onOpenSaveModal?: (format?: 'trk' | 'browser' | 'mod' | 'wav' | 'mp3' | 'stems' | 'sid' | 'prg') => void;
  onOpenSupport?: () => void;
  showSupportButton?: boolean;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  song,
  isPlaying,
  isEditMode,
  activeOctave,
  currentOrderIndex,
  currentLine,
  isSavingLocal,
  isFxRackOpen = false,
  isPatternLoop = false,
  canUndo = false,
  canRedo = false,
  activeChipSystem = 'c64' as RetroChipSystem,
  onUndo,
  onRedo,
  onToggleFxRack,
  onTogglePatternLoop,
  onPlay,
  onPause,
  onStop,
  onToggleEditMode,
  onChangeBpm,
  onChangeSpeed,
  onChangeOctave,
  onChangeChannelsCount,
  onOpenLocalDialog,
  onSaveLocalDialog,
  onOpenLocalFile,
  onSaveProjectFile,
  onNewSong,
  onLoadDemo,
  onToggleHelp,
  onOpenSettings,
  onImportMod,
  onImportSid,
  onExportMod,
  onExportWav,
  onExportMp3,
  onOpenExportModal,
  onOpenLanding,
  onStartTutorial,
  onOpenSidSynth,
  onOpenAmigaVault,
  onOpenVisualizerStudio,
  onOpenSynEditor,
  onSelectPersona,
  onUpdateSongName,
  onOpenSaveModal,
  onOpenSupport,
  showSupportButton = true,
}) => {
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const modFileInputRef = useRef<HTMLInputElement>(null);
  const sidFileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openDropdown, setOpenDropdown] = useState<'open' | 'save' | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempSongName, setTempSongName] = useState(song.name || 'Back on Track');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempSongName(song.name || 'Back on Track');
  }, [song.name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveSongName = () => {
    const trimmed = tempSongName.trim();
    if (trimmed && onUpdateSongName) {
      onUpdateSongName(trimmed);
    }
    setIsEditingName(false);
  };

  const handleCancelSongName = () => {
    setTempSongName(song.name || 'Back on Track');
    setIsEditingName(false);
  };

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

    // Tracker rows are 16th notes. Quarter note beats happen strictly every 4 rows (00, 04, 08, 12...)
    if (currentLine % 4 === 0 && beatKey !== lastBeatKeyRef.current) {
      lastBeatKeyRef.current = beatKey;
      const isFirstBeatOfBar = currentLine % 16 === 0;
      setIsDownbeat(isFirstBeatOfBar);
      setBeatPulse(true);

      if (beatTimerRef.current) {
        clearTimeout(beatTimerRef.current);
      }

      // Smooth musical pulse duration (~30% of beat length, 80-160ms)
      const beatDurationMs = Math.round(60000 / (song.bpm || 125));
      const flashDuration = Math.max(75, Math.min(160, Math.round(beatDurationMs * 0.32)));

      beatTimerRef.current = window.setTimeout(() => {
        setBeatPulse(false);
      }, flashDuration);
    }
  }, [currentLine, currentOrderIndex, isPlaying, song.bpm]);

  useEffect(() => {
    return () => {
      if (beatTimerRef.current) {
        clearTimeout(beatTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleModFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportMod) {
      onImportMod(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleSidFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImportSid) {
        onImportSid(file);
      } else if (onOpenLocalFile) {
        onOpenLocalFile(file);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onOpenLocalFile) {
      onOpenLocalFile(file);
    }
    if (e.target) e.target.value = '';
  };

  // Contextually available export formats for current song & active chip system
  const availableFormats = getAvailableExportFormats(song, activeChipSystem);

  return (
    <header className="relative z-50 px-2 sm:px-3 py-1.5 flex flex-col gap-1 select-none glass-panel-header text-[#cbd5e1] overflow-x-auto lg:overflow-x-visible no-scrollbar">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 w-full min-w-0">
        
        {/* LEFT GROUP: Branding & Transport Console */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
          {/* Logo & Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div 
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#141d27]/70 backdrop-blur-sm border border-[#27364a]/80 flex items-center justify-center shrink-0 shadow-inner transition-all ${
                onOpenLanding ? 'cursor-pointer group' : ''
              }`}
              style={{ color: 'var(--theme-accent, #38bdf8)' }}
              onClick={onOpenLanding}
              title="SYN-Tracker Studio Console (Click to open home)"
            >
              <Disc className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span 
                  className={`font-bold tracking-tight text-xs sm:text-sm text-[#f8fafc] font-display ${onOpenLanding ? 'cursor-pointer hover:opacity-90 transition-colors' : ''}`}
                  onClick={onOpenLanding}
                >
                  SYN-TRACKER
                </span>
              </div>
              
              {/* Song Name with Click-To-Rename */}
              {isEditingName ? (
                <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={tempSongName}
                    onChange={(e) => setTempSongName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSongName();
                      if (e.key === 'Escape') handleCancelSongName();
                    }}
                    onBlur={handleSaveSongName}
                    maxLength={32}
                    className="bg-[#0b1017] border text-[10px] sm:text-[10.5px] font-mono px-1.5 py-0.5 rounded outline-none w-24 sm:w-36 shadow-inner"
                    style={{
                      borderColor: 'var(--theme-accent, #38bdf8)',
                      color: 'var(--theme-accent, #38bdf8)',
                    }}
                    placeholder="Song title..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveSongName}
                    className="p-1 rounded text-[10px]"
                    style={{
                      backgroundColor: 'var(--theme-accent-dim, rgba(56,189,248,0.2))',
                      color: 'var(--theme-accent, #38bdf8)',
                    }}
                    title="Save name (Enter)"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-1 mt-0.5 px-1 py-0.5 -ml-1 rounded hover:bg-white/5 group/rename cursor-pointer transition-all border border-transparent text-left max-w-[85px] sm:max-w-[120px] md:max-w-[150px]"
                  title="Click to rename song title"
                >
                  <span 
                    className="text-[10px] sm:text-[10.5px] font-mono font-bold tracking-normal truncate"
                    style={{ color: 'var(--theme-accent, #38bdf8)' }}
                  >
                    {song.name || 'Back on Track'}
                  </span>
                  <Pencil className="w-2.5 h-2.5 opacity-60 group-hover/rename:opacity-100 shrink-0 transition-opacity" style={{ color: 'var(--theme-accent, #38bdf8)' }} />
                </button>
              )}
            </div>
          </div>

          <div className="h-6 w-[1px] hidden md:block bg-[#1f2c3e]/80" />

          {/* Affinity-style Studio Persona Switcher */}
          <PersonaSwitcher
            activePersona="tracker"
            onSelectPersona={(persona) => {
              if (onSelectPersona) {
                onSelectPersona(persona);
              } else {
                if (persona === 'editor') onOpenSynEditor?.();
                else if (persona === 'visualizer') onOpenVisualizerStudio?.();
              }
            }}
            showLabels={true}
          />

          <div className="h-6 w-[1px] hidden md:block bg-[#1f2c3e]/80" />

          {/* Main Transport Console (PLAY, STOP, RECORD) */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#070b10]/65 backdrop-blur-sm p-0.5 sm:p-1 rounded-lg border border-[#1a2536]/80">
            <button
              id="btn-play"
              onClick={isPlaying ? onPause : onPlay}
              className={`h-7 px-2.5 sm:px-3.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss ${
                isPlaying 
                  ? 'aqua-amber' 
                  : 'aqua-dark hover:border-[#1b5e47] text-[#e2e8f0]'
              }`}
              title="Play / Pause (Spacebar)"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current shrink-0 text-[#fbbf24]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current shrink-0 text-[#34d399]" />
              )}
              <span className={`hidden sm:inline ${isPlaying ? 'text-[#fbbf24]' : 'text-[#e2e8f0]'}`}>
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            </button>

            <button
              id="btn-stop"
              onClick={onStop}
              className="h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss aqua-dark hover:border-[#5c1f2d] text-[#e2e8f0]"
              title="Stop (Spacebar)"
            >
              <Square className="w-3 h-3 fill-current shrink-0 text-[#f43f5e]" />
              <span className="hidden sm:inline">STOP</span>
            </button>

            {/* Pattern Loop Toggle Button */}
            <button
              id="btn-pattern-loop"
              onClick={onTogglePatternLoop}
              className={`h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss transition-all ${
                isPatternLoop 
                  ? 'aqua-blue ring-1 ring-sky-400/40 text-[#38bdf8]' 
                  : 'aqua-dark text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
              title={
                isPatternLoop 
                  ? 'Pattern Loop: ACTIVE (loops current pattern) — Click to play whole song sequence' 
                  : 'Pattern Loop: OFF (plays whole song) — Click to loop current pattern'
              }
            >
              <Repeat className={`w-3.5 h-3.5 shrink-0 ${isPatternLoop ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
              <span className={`hidden md:inline ${isPatternLoop ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}`}>
                {isPatternLoop ? 'PAT LOOP' : 'PAT LOOP'}
              </span>
            </button>

            <button
              id="btn-record"
              onClick={onToggleEditMode}
              className={`h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss ${
                isEditMode 
                  ? 'aqua-red' 
                  : 'aqua-dark text-[#94a3b8]'
              }`}
              title="Toggle Edit / Step Input Mode (ESC)"
            >
              <Keyboard className={`w-3.5 h-3.5 shrink-0 ${isEditMode ? 'text-[#fb7185]' : 'text-[#64748b]'}`} />
              <span className={`hidden md:inline ${isEditMode ? 'text-[#fb7185]' : 'text-[#94a3b8]'}`}>
                {isEditMode ? '● REC ON' : 'EDIT OFF'}
              </span>
            </button>

            {/* Undo / Redo in Header Transport */}
            {(onUndo || onRedo) && (
              <>
                <div className="h-4 w-[1px] bg-[#1a2636] mx-0.5" />
                <button
                  id="btn-undo"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                    canUndo ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                  }`}
                  title="Undo Pattern Edit (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline">Undo</span>
                </button>
                <button
                  id="btn-redo"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                    canRedo ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                  }`}
                  title="Redo Pattern Edit (Ctrl+Y / Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline">Redo</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT GROUP: Song Functions, Hardware Timing, Settings */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* File Operations Toolbar */}
          <div ref={dropdownRef} className="flex items-center p-0.5 sm:p-1 rounded-lg bg-[#070b10]/65 backdrop-blur-sm border border-[#1a2536]/80 gap-0.5 sm:gap-1 relative z-50">
            {/* New Song */}
            <button
              onClick={onNewSong}
              className="h-7 px-2 sm:px-2.5 text-[11px] font-semibold flex items-center gap-1 sm:gap-1.5 rounded cursor-pointer aqua-gloss aqua-dark text-[#e2e8f0]"
              title="Create New Song"
            >
              <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="hidden sm:inline">New</span>
            </button>

            <div className="h-4 w-[1px] bg-[#1a2636]" />

            {/* OPEN DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'open' ? null : 'open')}
                className="h-7 px-2 sm:px-2.5 text-[11px] font-semibold flex items-center gap-1 sm:gap-1.5 rounded cursor-pointer aqua-gloss aqua-dark text-[#e2e8f0]"
                title="Open Song or Import File"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span className="hidden sm:inline">Open</span>
                <ChevronDown className="w-3 h-3 opacity-60 text-[#94a3b8]" />
              </button>

              {openDropdown === 'open' && (
                <div 
                  className="absolute right-0 sm:left-0 mt-1.5 w-64 rounded-lg bg-[#101722]/95 backdrop-blur-xl border border-[#2a3c53] py-1 z-[100] text-xs text-[#cbd5e1] shadow-2xl divide-y divide-[#1e2c3d]"
                  onClick={() => setOpenDropdown(null)}
                >
                  <div className="py-1">
                    {/* From Disk / Desktop (All supported tracker & retro formats) */}
                    <button
                      onClick={() => localFileInputRef.current?.click()}
                      className="w-full px-3 py-2 flex items-center text-left hover:bg-[#1b2636]/90 transition-colors font-medium cursor-pointer"
                    >
                      <span className="font-medium text-[#f8fafc]">
                        Open File...
                      </span>
                    </button>
                  </div>

                  <div className="py-1">
                    {/* Browser Storage */}
                    <button
                      onClick={onOpenLocalDialog}
                      className="w-full px-3 py-1.5 flex items-center text-left hover:bg-[#1b2636]/90 transition-colors font-medium cursor-pointer"
                    >
                      <span className="font-medium text-[#f8fafc]">Browser Project Vault</span>
                    </button>
                  </div>

                  {onLoadDemo && (
                    <div className="py-1">
                      <button
                        onClick={onLoadDemo}
                        className="w-full px-3 py-1.5 flex items-center text-left hover:bg-[#1b2636]/90 transition-colors font-medium cursor-pointer"
                      >
                        <span className="font-medium text-[#94a3b8] hover:text-[#f8fafc]">Load Demo: Space Debris</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-[#1a2636]" />

            {/* SAVE & EXPORT HUB BUTTON */}
            <button
              onClick={() => {
                if (onOpenSaveModal) {
                  onOpenSaveModal('trk');
                } else if (onOpenExportModal) {
                  onOpenExportModal();
                } else if (onSaveProjectFile) {
                  onSaveProjectFile();
                }
              }}
              className="h-7 px-2 sm:px-2.5 md:px-3 text-[11px] font-semibold flex items-center gap-1 sm:gap-1.5 rounded cursor-pointer aqua-gloss aqua-dark text-[#e2e8f0] hover:border-[#38bdf8]/40 transition active:scale-95 shrink-0"
              title="Save & Export Project (Open Save & Export Hub)"
            >
              {isSavingLocal ? (
                <div className="w-3.5 h-3.5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-[#34d399]" />
              )}
              <span className="hidden md:inline">Save / Export</span>
              <span className="md:hidden">Save</span>
            </button>

            <input
              ref={localFileInputRef}
              type="file"
              accept=".trk,.sid,.mod,.nsf,.nsfe,.gbs,.vgm,.vgz,.cym,.prg,.psid,.rsid,.json,.syn,audio/mod,audio/prs.sid,application/json,application/octet-stream,*"
              className="hidden"
              onChange={handleLocalFileSelect}
            />

            <input
              ref={modFileInputRef}
              type="file"
              accept=".mod,audio/mod,application/octet-stream,*"
              className="hidden"
              onChange={handleModFileSelect}
            />

            <input
              ref={sidFileInputRef}
              type="file"
              accept=".sid,.prg,.psid,.rsid,audio/prs.sid,application/octet-stream,*"
              className="hidden"
              onChange={handleSidFileSelect}
            />
          </div>

        </div>

      </div>
    </header>
  );
};
