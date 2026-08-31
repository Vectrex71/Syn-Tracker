/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HardDrive, Upload, AlertTriangle, Trash2 } from 'lucide-react';

import { TrackerSong, TrackerPattern, TrackerStep, TrackerSample, KeyboardLayout, RetroChipSystem } from './types';
import { audioEngine } from './lib/audioEngine';
import { saveLocalSong, loadLocalSong, saveAutoSaveSession, getAutoSaveSession, clearAutoSaveSession, AUTOSAVE_BACKUP_KEY } from './lib/indexedDB';
import { parseMODFile, exportMODFile, arrayBufferToBase64 } from './utils/modFormat';
import { parseSIDFile, parseSIDFileDetailed } from './utils/sidExporter';
import { parseRetroChiptuneFile, RetroFileInfo, RetroSystemKind } from './utils/retroChipParsers';

// Components
import { HeaderControls } from './components/HeaderControls';
import { LandingPage } from './components/LandingPage';
import { PatternEditor } from './components/PatternEditor';
import { SampleManager } from './components/SampleManager';
import { OrderList } from './components/OrderList';
import { HelpDialog } from './components/HelpDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { LocalStorageDialog } from './components/LocalStorageDialog';
import { MasterRack } from './components/MasterRack';
import { ExportAudioModal } from './components/ExportAudioModal';
import { SaveProjectModal, SaveFormatType } from './components/SaveProjectModal';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { NewProjectDialog, NewProjectTemplate } from './components/NewProjectDialog';
import { SidSynthModal } from './components/SidSynthModal';
import { RetroChipInfoModal, SidFileInfo } from './components/RetroChipInfoModal';
import { AmigaDiskVaultModal } from './components/AmigaDiskVaultModal';
import { VisualizerStudioModal } from './components/VisualizerStudioModal';
import { SynEditorModal } from './components/SynEditorModal';
import { CoverDesignerModal } from './components/CoverDesignerModal';
import { SupportModal } from './components/SupportModal';
import { PersonaSwitcher, AppPersona } from './components/PersonaSwitcher';
import { AutoRecoveryBanner } from './components/AutoRecoveryBanner';
import { MobileUnsupportedScreen, isSmartphoneDevice } from './components/MobileUnsupportedScreen';
import { CHIP_KITS, CHIP_INSTRUMENTS, ChipKitType, createChipSample } from './lib/chipPresets';
import { decodeAudioBufferSafe } from './utils/audioDecoder';
import { trackEvent } from './utils/analytics';

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate blank empty tracker step
function createEmptyStep(): TrackerStep {
  return {
    note: null,
    instrument: null,
    volume: null,
    effectCode: null,
    effectVal: null,
  };
}

// Generate blank empty pattern
function createEmptyPattern(id: number, length = 64, channelsCount = 8): TrackerPattern {
  const channels: TrackerStep[][] = [];
  for (let c = 0; c < channelsCount; c++) {
    const channelRow: TrackerStep[] = [];
    for (let s = 0; s < length; s++) {
      channelRow.push(createEmptyStep());
    }
    channels.push(channelRow);
  }
  return {
    id,
    name: `Pattern ${id.toString().padStart(2, '0')}`,
    length,
    channels,
  };
}

// Generate initial empty tracker song with 16 tracks and 32 sample slots (.TRK format standard)
function createNewEmptySong(): TrackerSong {
  const defaultSamples: TrackerSample[] = [];

  // 32 blank sample slots ready for audio sample files (.wav/.mp3) or sample presets
  for (let i = 0; i < 32; i++) {
    defaultSamples.push({
      id: i,
      name: '',
      filename: '',
      buffer: null,
      volume: 64,
      panning: 0.0,
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 0,
      baseNote: 36,
      sourceType: 'upload',
    });
  }

  return {
    name: 'Back on Track',
    bpm: 125,
    speed: 6,
    channelsCount: 16,
    patterns: [createEmptyPattern(0, 64, 16)],
    orderList: [0],
    samples: defaultSamples,
  };
}

export default function App() {
  const [showLanding, setShowLanding] = useState<boolean>(true);

  const [song, setSong] = useState<TrackerSong>(createNewEmptySong());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeOctave, setActiveOctave] = useState<number>(2);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayout>(() => {
    return (localStorage.getItem('syn_tracker_kbd_layout') as KeyboardLayout) || 'AUTO';
  });

  const handleKeyboardLayoutChange = (layout: KeyboardLayout) => {
    setKeyboardLayout(layout);
    localStorage.setItem('syn_tracker_kbd_layout', layout);
  };
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [currentOrderIndex, setCurrentOrderIndex] = useState<number>(0);
  const [currentLine, setCurrentLine] = useState<number>(0);

  // Track & Pattern Clipboard state
  const [trackClipboard, setTrackClipboard] = useState<TrackerStep[] | null>(null);
  const [multiTrackClipboard, setMultiTrackClipboard] = useState<{ channelIndex: number; steps: TrackerStep[] }[] | null>(null);
  const [patternClipboard, setPatternClipboard] = useState<TrackerStep[][] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  // Modal dialog states
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLocalOpen, setIsLocalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isSidModalOpen, setIsSidModalOpen] = useState<boolean>(false);
  const [isSidInfoModalOpen, setIsSidInfoModalOpen] = useState<boolean>(false);
  const [sidInfoData, setSidInfoData] = useState<SidFileInfo | null>(null);
  const [pendingSidSong, setPendingSidSong] = useState<TrackerSong | null>(null);
  const [isAmigaVaultOpen, setIsAmigaVaultOpen] = useState<boolean>(false);
  const [isVisualizerStudioOpen, setIsVisualizerStudioOpen] = useState<boolean>(false);
  const [isSynEditorOpen, setIsSynEditorOpen] = useState<boolean>(false);
  const [isCoverDesignerOpen, setIsCoverDesignerOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [showSupportButton, setShowSupportButton] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('syntracker_show_support_btn');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleSupportButton = (show: boolean) => {
    setShowSupportButton(show);
    try {
      localStorage.setItem('syntracker_show_support_btn', JSON.stringify(show));
    } catch {
      // Ignore
    }
    showToast(show ? 'Support button is now visible' : 'Support button hidden');
  };

  // Studio Persona Switcher (Tracker / Waveform Editor / Visualizer / Cover Designer)
  const handleSelectPersona = useCallback((persona: AppPersona) => {
    if (persona === 'tracker') {
      setIsSynEditorOpen(false);
      setIsVisualizerStudioOpen(false);
      setIsCoverDesignerOpen(false);
    } else if (persona === 'editor') {
      setIsVisualizerStudioOpen(false);
      setIsCoverDesignerOpen(false);
      setIsSynEditorOpen(true);
    } else if (persona === 'visualizer') {
      setIsSynEditorOpen(false);
      setIsCoverDesignerOpen(false);
      setIsVisualizerStudioOpen(true);
    } else if (persona === 'cover') {
      setIsSynEditorOpen(false);
      setIsVisualizerStudioOpen(false);
      setIsCoverDesignerOpen(true);
    }
  }, []);

  const [activeChipSystem, setActiveChipSystem] = useState<RetroChipSystem | null>(null);
  const [saveModalInitialFormat, setSaveModalInitialFormat] = useState<SaveFormatType>('trk');

  const handleOpenSaveModal = (format: SaveFormatType = 'trk') => {
    setSaveModalInitialFormat(format);
    setIsSaveModalOpen(true);
  };
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'open' | 'save'>('open');
  const [highlightRows, setHighlightRows] = useState<number>(4);

  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isFxRackOpen, setIsFxRackOpen] = useState(false);

  // Auto-Save & Emergency Crash Recovery State
  const [autoRecoveryMeta, setAutoRecoveryMeta] = useState<{
    name: string;
    updatedAt: string;
    patternCount: number;
    channelsCount: number;
    system?: RetroChipSystem | null;
  } | null>(null);
  const [isAutoRecoveryBannerOpen, setIsAutoRecoveryBannerOpen] = useState<boolean>(false);

  // Smartphone detection state
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(isSmartphoneDevice());
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Check for auto-saved emergency backup on startup
  useEffect(() => {
    let isMounted = true;
    getAutoSaveSession().then((backup) => {
      if (!isMounted || !backup || !backup.songData) return;
      
      const songData = backup.songData;
      const hasNotes = songData.patterns?.some((p: any) =>
        p.channels?.some((c: any) => c?.some((st: any) => st?.note || (st?.instrument !== null && st?.instrument !== undefined)))
      );
      const isCustomNamed = backup.name && backup.name !== 'Back on Track';
      const hasCustomSamples = songData.samples?.some((s: any) => (s.name && !s.name.startsWith('Sample ')) || s.buffer || s.base64Data || s.sidConfig);

      if (hasNotes || isCustomNamed || hasCustomSamples) {
        setAutoRecoveryMeta({
          name: backup.name || songData.name || 'Unsaved Jam Session',
          updatedAt: backup.updatedAt,
          patternCount: songData.patterns?.length || 0,
          channelsCount: songData.channelsCount || 4,
          system: (backup.system as RetroChipSystem) || songData.system || null,
        });
        setIsAutoRecoveryBannerOpen(true);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Web MIDI API listener for hardware MIDI keyboard support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
      (navigator as any).requestMIDIAccess()
        .then((midiAccess: any) => {
          const inputs = midiAccess.inputs.values();
          for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = (msg: any) => {
              const [status, note, velocity] = msg.data;
              const command = status >> 4;
              if (command === 9 && velocity > 0) {
                // Note On
                const activeSample = song.samples[selectedSampleIndex];
                if (activeSample) {
                  handlePlayPreview(note, activeSample);
                }
              }
            };
          }
        })
        .catch(() => {
          // MIDI access silently ignored if unavailable
        });
    }
  }, [song, selectedSampleIndex]);

  // Global mouse wheel support for all range sliders (when hovered or focused)
  useEffect(() => {
    const handleSliderWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const rangeInput = target.closest('input[type="range"]') as HTMLInputElement | null;
      if (!rangeInput || rangeInput.disabled) return;

      // Prevent page/panel scroll while adjusting slider with mouse wheel
      e.preventDefault();

      const min = rangeInput.min !== '' ? parseFloat(rangeInput.min) : 0;
      const max = rangeInput.max !== '' ? parseFloat(rangeInput.max) : 100;
      const span = max - min;
      const rawStep = rangeInput.step;
      
      let baseStep = 1;
      if (rawStep && rawStep !== 'any' && !isNaN(parseFloat(rawStep))) {
        baseStep = parseFloat(rawStep);
      } else if (span <= 1) {
        baseStep = 0.01;
      } else if (span <= 16) {
        baseStep = 1;
      } else if (span <= 100) {
        baseStep = 1;
      } else {
        baseStep = 1;
      }
      if (isNaN(baseStep) || baseStep <= 0) baseStep = 1;

      // Determine responsive step increment so user doesn't have to spin forever
      let effectiveStep = baseStep;
      if (e.shiftKey) {
        // Fine control with Shift key
        effectiveStep = baseStep;
      } else {
        // Dynamic comfortable scaling for audio controls
        if (baseStep <= 0.005 && span >= 0.5) {
          effectiveStep = 0.02; // e.g. SampleManager attack
        } else if (baseStep <= 0.01 && span >= 1.0) {
          effectiveStep = 0.05; // e.g. SampleManager decay/release
        } else if (span > 1000 && baseStep <= 16) {
          effectiveStep = 64; // e.g. Filter Cutoff (0..2047)
        } else if (span > 500 && baseStep <= 16) {
          effectiveStep = 32;
        } else if (span > 50 && baseStep <= 1) {
          effectiveStep = 2; // percentage / pan
        } else {
          effectiveStep = baseStep;
        }
      }

      // Determine direction (deltaY < 0 = scroll up = increase, deltaY > 0 = scroll down = decrease)
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : -e.deltaX;
      const direction = delta < 0 ? 1 : -1;
      const currentValue = parseFloat(rangeInput.value) || 0;

      let newValue = currentValue + direction * effectiveStep;

      // Clean precision formatting
      if (rawStep && rawStep.includes('.')) {
        const decimals = rawStep.split('.')[1].length;
        newValue = parseFloat(newValue.toFixed(decimals));
      } else if (effectiveStep < 1) {
        newValue = parseFloat(newValue.toFixed(3));
      } else {
        newValue = Math.round(newValue);
      }

      newValue = Math.max(min, Math.min(max, newValue));

      if (newValue !== currentValue) {
        // Trigger React synthetic event tracking
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (prototypeValueSetter) {
          prototypeValueSetter.call(rangeInput, String(newValue));
        } else {
          rangeInput.value = String(newValue);
        }

        rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
        rangeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    window.addEventListener('wheel', handleSliderWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleSliderWheel);
    };
  }, []);

  // Update sound engine on song state change
  useEffect(() => {
    audioEngine.setSong(song);
  }, [song]);

  // Connect Audio Engine scheduler callback to React triggers
  useEffect(() => {
    audioEngine.setOnStepTrigger((orderIdx, lineIdx) => {
      setCurrentOrderIndex(orderIdx);
      setCurrentLine(lineIdx);
    });
  }, []);

  // Playback control wrappers
  const handlePlay = () => {
    audioEngine.start(currentOrderIndex, currentLine);
    setIsPlaying(true);
    trackEvent('playback_start', { type: 'play', order: currentOrderIndex, line: currentLine });
  };

  const handlePause = () => {
    const pos = audioEngine.pause();
    setIsPlaying(false);
    if (pos) {
      setCurrentOrderIndex(pos.orderIndex);
      setCurrentLine(pos.lineIndex);
    }
    trackEvent('playback_pause');
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentLine(0);
    trackEvent('playback_stop');
  };

  const handlePlaySong = () => {
    audioEngine.setPatternLoop(false);
    setIsPatternLoop(false);
    setCurrentOrderIndex(0);
    setCurrentLine(0);
    audioEngine.start(0, 0);
    setIsPlaying(true);
    showToast('▶ Play Song from Start (F5)');
    trackEvent('playback_song_start', { channels: song.channelsCount, bpm: song.bpm });
  };

  const handlePlayPattern = () => {
    audioEngine.setPatternLoop(true);
    setIsPatternLoop(true);
    audioEngine.start(currentOrderIndex, 0);
    setIsPlaying(true);
    showToast(`🔁 Loop Pattern ${currentOrderIndex.toString().padStart(2, '0')} (F6)`);
    trackEvent('playback_pattern_loop', { pattern: currentOrderIndex });
  };

  // Pattern Loop Mode State
  const [isPatternLoop, setIsPatternLoop] = useState<boolean>(false);

  const handleTogglePatternLoop = useCallback(() => {
    setIsPatternLoop((prev) => {
      const next = !prev;
      audioEngine.setPatternLoop(next);
      showToast(next ? 'Pattern Loop: ACTIVE (loops current pattern)' : 'Pattern Loop: OFF (plays whole song in sequence)');
      return next;
    });
  }, []);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const handlePlayRef = useRef(handlePlay);
  handlePlayRef.current = handlePlay;
  const handlePauseRef = useRef(handlePause);
  handlePauseRef.current = handlePause;
  const handleStopRef = useRef(handleStop);
  handleStopRef.current = handleStop;
  const handlePlaySongRef = useRef(handlePlaySong);
  handlePlaySongRef.current = handlePlaySong;
  const handlePlayPatternRef = useRef(handlePlayPattern);
  handlePlayPatternRef.current = handlePlayPattern;

  // Undo / Redo History Management
  const [undoStack, setUndoStack] = useState<TrackerSong[]>([]);
  const [redoStack, setRedoStack] = useState<TrackerSong[]>([]);
  const songRef = useRef<TrackerSong>(song);
  songRef.current = song;
  const undoStackRef = useRef<TrackerSong[]>(undoStack);
  undoStackRef.current = undoStack;
  const redoStackRef = useRef<TrackerSong[]>(redoStack);
  redoStackRef.current = redoStack;

  const handleUndo = useCallback(() => {
    const currentUndo = undoStackRef.current;
    if (currentUndo.length === 0) return;
    const prevSong = currentUndo[currentUndo.length - 1];
    const remainingUndo = currentUndo.slice(0, -1);
    const currentSong = songRef.current;

    setRedoStack((r) => [...r.slice(-29), currentSong]);
    setUndoStack(remainingUndo);
    setSong(prevSong);
    showToast('Undo');
  }, []);

  const handleRedo = useCallback(() => {
    const currentRedo = redoStackRef.current;
    if (currentRedo.length === 0) return;
    const nextSong = currentRedo[currentRedo.length - 1];
    const remainingRedo = currentRedo.slice(0, -1);
    const currentSong = songRef.current;

    setUndoStack((u) => [...u.slice(-29), currentSong]);
    setRedoStack(remainingRedo);
    setSong(nextSong);
    showToast('Redo');
  }, []);

  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;
  const handleRedoRef = useRef(handleRedo);
  handleRedoRef.current = handleRedo;
  const handleOpenSaveModalRef = useRef(handleOpenSaveModal);
  handleOpenSaveModalRef.current = handleOpenSaveModal;

  const updateSongWithUndo = useCallback((updater: (prev: TrackerSong) => TrackerSong) => {
    const currentSong = songRef.current;
    const nextSong = updater(currentSong);
    if (nextSong !== currentSong) {
      setUndoStack((u) => [...u.slice(-29), currentSong]);
      setRedoStack([]);
      setSong(nextSong);
    }
  }, []);

  const handleChannelsCountChange = useCallback((newCount: number) => {
    if (newCount === songRef.current.channelsCount) return;
    
    updateSongWithUndo((prev) => {
      const updatedPatterns = prev.patterns.map((p) => {
        let newChannels = [...p.channels];
        if (newChannels.length < newCount) {
          while (newChannels.length < newCount) {
            const emptyChan: TrackerStep[] = Array.from({ length: p.length }, () => createEmptyStep());
            newChannels.push(emptyChan);
          }
        } else if (newChannels.length > newCount) {
          newChannels = newChannels.slice(0, newCount);
        }
        return { ...p, channels: newChannels };
      });

      return {
        ...prev,
        channelsCount: newCount,
        patterns: updatedPatterns,
      };
    });

    showToast(
      newCount === 3 
        ? 'Switched to 3 Tracks (C64 SID Mode)' 
        : newCount === 4 
        ? 'Switched to 4 Tracks (Amiga / Retro Mode)' 
        : newCount === 8 
        ? 'Switched to 8 Tracks (Extended Polyphony Mode)' 
        : newCount === 16 
        ? 'Switched to 16 Tracks (SYN-Tracker TRK Mode)' 
        : `Switched to ${newCount} Tracks`
    );
  }, [updateSongWithUndo]);

  // Keyboard shortcuts (SPACE = Play/Stop, ESC = Toggle Edit/Record mode, CTRL+Z/CTRL+Y = Undo/Redo, CTRL+S = Save Project)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when editing inputs or when specialized modal editors (SYN-Editor, Visualizer Studio) are active
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (isSynEditorOpen || isVisualizerStudioOpen || isCoverDesignerOpen || isSidModalOpen || isAmigaVaultOpen || isSaveModalOpen || isExportModalOpen || isNewProjectDialogOpen) {
        return;
      }

      // F1: Toggle Reference Manual / Help Dialog
      if (e.key === 'F1' || e.code === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // F5: Play Song from order 00
      if (e.key === 'F5' || e.code === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handlePlaySongRef.current();
        return;
      }

      // F6: Loop Pattern from start of pattern
      if (e.key === 'F6' || e.code === 'F6') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handlePlayPatternRef.current();
        return;
      }

      // F7: Play from cursor row / Toggle Play
      if (e.key === 'F7' || e.code === 'F7') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isPlayingRef.current) {
          handlePauseRef.current();
        } else {
          handlePlayRef.current();
        }
        return;
      }

      // F8: Stop Playback immediately & silence all active audio channels
      if (e.key === 'F8' || e.code === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleStopRef.current();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleOpenSaveModalRef.current('trk');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.shiftKey) {
          handleRedoRef.current();
        } else {
          handleUndoRef.current();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleRedoRef.current();
        return;
      }
      
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isPlayingRef.current) {
          handlePauseRef.current();
        } else {
          handlePlayRef.current();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsEditMode((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts, { capture: true });
    };
  }, [isSynEditorOpen, isVisualizerStudioOpen, isSidModalOpen, isAmigaVaultOpen, isSaveModalOpen, isExportModalOpen, isNewProjectDialogOpen]);

  // Change BPM helper
  const handleBpmChange = (newBpm: number) => {
    const validBpm = Math.max(32, Math.min(255, newBpm || 125));
    audioEngine.setBpm(validBpm);
    updateSongWithUndo((prev) => ({ ...prev, bpm: validBpm }));
  };

  // Change Speed helper
  const handleSpeedChange = (newSpeed: number) => {
    const validSpeed = Math.max(1, Math.min(32, newSpeed || 6));
    audioEngine.setSpeed(validSpeed);
    updateSongWithUndo((prev) => ({ ...prev, speed: validSpeed }));
  };

  // Open the New Project template modal
  const handleNewSong = () => {
    setIsNewProjectDialogOpen(true);
  };

  // Handle template selection from New Project requester
  const handleSelectNewProjectTemplate = (template: NewProjectTemplate | string) => {
    handleStop();
    if (!audioEngine.ctx) {
      audioEngine.init();
    }
    const audioCtx = audioEngine.ctx;

    let newSong: TrackerSong;

    if (template === 'empty' || template === 'trk') {
      setActiveChipSystem('trk');
      newSong = createNewEmptySong();
      showToast('Created empty SYN-Tracker project (.TRK)');
    } else if (template === 'amiga') {
      setActiveChipSystem('amiga');
      audioEngine.enableAmigaFilter = true;
      newSong = {
        name: 'Amiga 500 Project',
        bpm: 125,
        speed: 6,
        patterns: [createEmptyPattern(0, 64, 4)],
        orderList: [0],
        samples: Array.from({ length: 31 }, (_, i) => ({
          id: i,
          name: '',
          filename: '',
          buffer: null,
          base64Data: null,
          volume: 64,
          panning: i % 2 === 0 ? -0.65 : 0.65,
          loopEnabled: false,
          loopStart: 0,
          loopEnd: 0,
          baseNote: 36,
          sourceType: 'upload' as const,
        })),
        channelsCount: 4,
      };
      showToast('Created Commodore Amiga 500 project (4-Channel .MOD / Paula DSP)');
    } else {
      setActiveChipSystem(template as RetroChipSystem);
      const kit = CHIP_KITS.find((k) => k.id === template);
      if (kit && audioCtx) {
        const generatedSamples: TrackerSample[] = [];
        // Generate all 16 kit instruments into slots 00..15
        for (let i = 0; i < 16; i++) {
          if (i < kit.instruments.length) {
            const instDef = CHIP_INSTRUMENTS[kit.instruments[i]];
            if (instDef) {
              const sample = createChipSample(audioCtx, instDef, i);
              generatedSamples.push(sample);
            } else {
              generatedSamples.push({
                id: i,
                name: '',
                filename: '',
                buffer: null,
                base64Data: null,
                volume: 64,
                panning: 0.0,
                loopEnabled: false,
                loopStart: 0,
                loopEnd: 0,
                baseNote: 48,
                sourceType: 'upload',
              });
            }
          } else {
            generatedSamples.push({
              id: i,
              name: '',
              filename: '',
              buffer: null,
              base64Data: null,
              volume: 64,
              panning: 0.0,
              loopEnabled: false,
              loopStart: 0,
              loopEnd: 0,
              baseNote: 48,
              sourceType: 'upload',
            });
          }
        }

        const targetChannels = template === 'c64' ? 3 : 4;
        const pat0 = createEmptyPattern(0, 64, targetChannels);
        newSong = {
          name: `${kit.title} Track`,
          bpm: 125,
          speed: 6,
          patterns: [pat0],
          orderList: [0],
          samples: generatedSamples,
          channelsCount: targetChannels,
        };
        showToast(`Loaded ${kit.title} — all 16 instruments ready to play! (${targetChannels} Channels)`);
      } else {
        setActiveChipSystem(null);
        newSong = createNewEmptySong();
        showToast('Created SYN-Tracker project (.TRK - 16 Tracks / 32 Instruments)');
      }
    }

    setSong(newSong);
    setUndoStack([]);
    setRedoStack([]);
    setCurrentOrderIndex(0);
    setCurrentLine(0);
    setSelectedSampleIndex(0);
    setIsEditMode(false);
    setIsNewProjectDialogOpen(false);
  };

  // Pattern updates
  const handleUpdateStep = (
    channelIndex: number,
    stepIndex: number,
    updated: Partial<TrackerStep>,
    targetOrderIndex = currentOrderIndex
  ) => {
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[targetOrderIndex] ?? prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        // Find active loaded pattern
        if (pat.id === activePatId) {
          const updatedChannels = pat.channels.map((chan, chIdx) => {
            if (chIdx === channelIndex) {
              const updatedSteps = chan.map((st, sIdx) => {
                if (sIdx === stepIndex) {
                  return { ...st, ...updated };
                }
                return st;
              });
              return updatedSteps;
            }
            return chan;
          });
          return { ...pat, channels: updatedChannels };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
  };

  // Instrument updates
  const handleUpdateSample = (index: number, updated: Partial<TrackerSample>) => {
    updateSongWithUndo((prev) => {
      const updatedSamples = prev.samples.map((sm, i) => {
        if (i === index) {
          return { ...sm, ...updated };
        }
        return sm;
      });
      return { ...prev, samples: updatedSamples };
    });
  };

  const handleBatchLoadSamples = (startSlot: number, sampleList: Partial<TrackerSample>[]) => {
    updateSongWithUndo((prev) => {
      const updated = [...prev.samples];
      sampleList.forEach((samp, idx) => {
        const targetSlot = startSlot + idx;
        if (targetSlot < 32) {
          if (targetSlot < updated.length) {
            updated[targetSlot] = { ...updated[targetSlot], ...samp, id: targetSlot };
          } else {
            updated.push({
              id: targetSlot,
              name: samp.name || `Sample ${targetSlot + 1}`,
              filename: samp.filename || '',
              buffer: samp.buffer || null,
              volume: samp.volume ?? 64,
              panning: samp.panning ?? 0.0,
              loopEnabled: samp.loopEnabled ?? false,
              loopStart: samp.loopStart ?? 0,
              loopEnd: samp.loopEnd ?? 0,
              baseNote: samp.baseNote ?? 60,
              sourceType: 'upload',
              ...samp,
            });
          }
        }
      });
      return { ...prev, samples: updated };
    });
    showToast(`Loaded ${sampleList.length} instruments to tracker`);
  };

  const handleAddSampleSlot = () => {
    if (song.samples.length >= 32) {
      showToast('Maximum of 32 sample slots reached');
      return;
    }
    const newId = song.samples.length;
    const newSlot: TrackerSample = {
      id: newId,
      name: '',
      filename: '',
      buffer: null,
      volume: 64,
      panning: 0.0,
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 0,
      baseNote: 36,
      sourceType: 'upload',
    };
    updateSongWithUndo((prev) => {
      if (prev.samples.length >= 32) return prev;
      return {
        ...prev,
        samples: [...prev.samples, newSlot],
      };
    });
    setSelectedSampleIndex(newId);
    showToast(`Added Instrument Slot ${newId.toString().padStart(2, '0')} (${song.samples.length + 1}/32)`);
  };

  // Add pattern sequence to order list
  const handleAddOrderStep = () => {
    updateSongWithUndo((prev) => {
      // Find maximum existing pattern ID or create new one
      const nextPatId = prev.patterns.length;
      const newPattern = createEmptyPattern(nextPatId, 64, prev.channelsCount);
      return {
        ...prev,
        patterns: [...prev.patterns, newPattern],
        orderList: [...prev.orderList, nextPatId],
      };
    });
  };

  const handleRemoveOrderStep = (index: number) => {
    updateSongWithUndo((prev) => {
      if (prev.orderList.length <= 1) return prev;
      const newOrderList = prev.orderList.filter((_, i) => i !== index);
      return { ...prev, orderList: newOrderList };
    });
    // Adjust active position
    if (currentOrderIndex >= song.orderList.length - 1) {
      setCurrentOrderIndex(Math.max(0, song.orderList.length - 2));
    }
  };

  const handleUpdateOrderValue = (index: number, patternId: number) => {
    updateSongWithUndo((prev) => {
      const newOrderList = [...prev.orderList];
      newOrderList[index] = patternId;
      return { ...prev, orderList: newOrderList };
    });
  };

  const handleReorderOrderList = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    updateSongWithUndo((prev) => {
      const updated = [...prev.orderList];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...prev, orderList: updated };
    });

    setCurrentOrderIndex((prevIdx) => {
      if (prevIdx === fromIndex) {
        return toIndex;
      }
      if (fromIndex < prevIdx && toIndex >= prevIdx) {
        return prevIdx - 1;
      }
      if (fromIndex > prevIdx && toIndex <= prevIdx) {
        return prevIdx + 1;
      }
      return prevIdx;
    });
  };

  const handleSelectOrderIndex = (index: number) => {
    handleStop();
    setCurrentOrderIndex(index);
    setCurrentLine(0);
  };

  // Track Copy / Paste / Clear
  const handleCopyTrack = (channelIndex: number) => {
    if (!activePattern || !activePattern.channels[channelIndex]) return;
    const stepsCopy = JSON.parse(JSON.stringify(activePattern.channels[channelIndex]));
    setTrackClipboard(stepsCopy);
    setMultiTrackClipboard(null);
    showToast(`Track ${(channelIndex + 1).toString().padStart(2, '0')} copied`);
  };

  const handleCopyTracks = (channelIndices: number[]) => {
    if (!activePattern || channelIndices.length === 0) return;
    if (channelIndices.length === 1) {
      handleCopyTrack(channelIndices[0]);
      return;
    }
    const multiCopy = channelIndices.map((idx) => ({
      channelIndex: idx,
      steps: JSON.parse(JSON.stringify(activePattern.channels[idx])),
    }));
    setMultiTrackClipboard(multiCopy);
    setTrackClipboard(multiCopy[0].steps);
    const names = channelIndices
      .map((i) => (i + 1).toString().padStart(2, '0'))
      .sort()
      .join(', ');
    showToast(`Tracks ${names} copied`);
  };

  const handlePasteTrack = (channelIndex: number) => {
    if (!trackClipboard) {
      showToast('Track clipboard is empty');
      return;
    }
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        if (pat.id === activePatId) {
          const updatedChannels = pat.channels.map((chan, chIdx) => {
            if (chIdx === channelIndex) {
              return JSON.parse(JSON.stringify(trackClipboard));
            }
            return chan;
          });
          return { ...pat, channels: updatedChannels };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
    showToast(`Pasted into Track ${(channelIndex + 1).toString().padStart(2, '0')}`);
  };

  const handlePasteTracks = (channelIndices: number[]) => {
    if (!trackClipboard && !multiTrackClipboard) {
      showToast('Track clipboard is empty');
      return;
    }
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        if (pat.id === activePatId) {
          const updatedChannels = pat.channels.map((chan, chIdx) => {
            if (channelIndices.includes(chIdx)) {
              if (multiTrackClipboard && multiTrackClipboard.length > 1) {
                const found = multiTrackClipboard.find((m) => m.channelIndex === chIdx);
                if (found) {
                  return JSON.parse(JSON.stringify(found.steps));
                }
              }
              if (trackClipboard) {
                return JSON.parse(JSON.stringify(trackClipboard));
              }
            }
            return chan;
          });
          return { ...pat, channels: updatedChannels };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
    const names = channelIndices
      .map((i) => (i + 1).toString().padStart(2, '0'))
      .sort()
      .join(', ');
    showToast(`Pasted into Track(s) ${names}`);
  };

  const handleClearTrack = (channelIndex: number) => {
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        if (pat.id === activePatId) {
          const updatedChannels = pat.channels.map((chan, chIdx) => {
            if (chIdx === channelIndex) {
              return Array.from({ length: pat.length }).map(() => ({
                note: null,
                instrument: null,
                volume: null,
                effectCode: null,
                effectVal: null,
              }));
            }
            return chan;
          });
          return { ...pat, channels: updatedChannels };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
    showToast(`Track ${(channelIndex + 1).toString().padStart(2, '0')} cleared`);
  };

  const handleClearTracks = (channelIndices: number[]) => {
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        if (pat.id === activePatId) {
          const updatedChannels = pat.channels.map((chan, chIdx) => {
            if (channelIndices.includes(chIdx)) {
              return Array.from({ length: pat.length }).map(() => ({
                note: null,
                instrument: null,
                volume: null,
                effectCode: null,
                effectVal: null,
              }));
            }
            return chan;
          });
          return { ...pat, channels: updatedChannels };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
    const names = channelIndices
      .map((i) => (i + 1).toString().padStart(2, '0'))
      .sort()
      .join(', ');
    showToast(`Track(s) ${names} cleared`);
  };

  // Pattern Copy / Paste / Duplicate / Clear
  const handleCopyPattern = () => {
    if (!activePattern) return;
    const channelsCopy = JSON.parse(JSON.stringify(activePattern.channels));
    setPatternClipboard(channelsCopy);
    showToast(`Pattern ${activePattern.id.toString().padStart(2, '0')} copied`);
  };

  const handlePastePattern = () => {
    if (!patternClipboard) {
      showToast('Pattern clipboard is empty');
      return;
    }
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        if (pat.id === activePatId) {
          return { ...pat, channels: JSON.parse(JSON.stringify(patternClipboard)) };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
    showToast(`Pasted into Pattern ${activePattern.id.toString().padStart(2, '0')}`);
  };

  const handleDuplicatePattern = () => {
    if (!activePattern) return;
    const nextPatId = song.patterns.length;
    const newPattern: TrackerPattern = {
      id: nextPatId,
      name: activePattern.name || `Pattern ${nextPatId.toString().padStart(2, '0')}`,
      length: activePattern.length,
      channels: JSON.parse(JSON.stringify(activePattern.channels)),
    };
    updateSongWithUndo((prev) => {
      const updatedOrder = [...prev.orderList];
      updatedOrder.splice(currentOrderIndex + 1, 0, nextPatId);
      return {
        ...prev,
        patterns: [...prev.patterns, newPattern],
        orderList: updatedOrder,
      };
    });
    setCurrentOrderIndex(currentOrderIndex + 1);
    showToast(`Pattern duplicated as Pattern ${nextPatId.toString().padStart(2, '0')}`);
  };

  const handleClearPattern = () => {
    updateSongWithUndo((prev) => {
      const activePatId = prev.orderList[currentOrderIndex];
      const updatedPatterns = prev.patterns.map((pat) => {
        if (pat.id === activePatId) {
          const emptyChannels = Array.from({ length: prev.channelsCount }).map(() =>
            Array.from({ length: pat.length }).map(() => ({
              note: null,
              instrument: null,
              volume: null,
              effectCode: null,
              effectVal: null,
            }))
          );
          return { ...pat, channels: emptyChannels };
        }
        return pat;
      });
      return { ...prev, patterns: updatedPatterns };
    });
    showToast(`Pattern ${activePattern.id.toString().padStart(2, '0')} cleared`);
  };

  // Note preview playing (direct Web Audio routing)
  const handlePlayPreview = (midiNote: number, sample: TrackerSample) => {
    audioEngine.playNoteInstantly(midiNote, sample);
  };

  const handleStopPreview = () => {
    audioEngine.stopPreviewNote();
  };

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

  // Rebuild sound binary envelopes when loading songs
  const rebuildAudioBuffers = async (loadedSong: TrackerSong): Promise<TrackerSong> => {
    audioEngine.init();
    const ctx = audioEngine.ctx;
    if (!ctx) return loadedSong;

    const updatedSamples = await Promise.all(
      loadedSong.samples.map(async (sample) => {
        if (sample.base64Data) {
          try {
            const arrBuf = base64ToArrayBuffer(sample.base64Data);
            const decoded = await decodeAudioBufferSafe(arrBuf, ctx);
            return { ...sample, buffer: decoded.buffer };
          } catch (e) {
            console.error('Failed to restore sample sound buffer:', sample.name, e);
          }
        }
        return sample;
      })
    );

    return { ...loadedSong, samples: updatedSamples };
  };

  // Load space_debris.mod demo from /public/space_debris.mod
  const loadSpaceDebrisDemo = async () => {
    try {
      if (!audioEngine.ctx) {
        audioEngine.init();
      }
      if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
        await audioEngine.ctx.resume();
      }
      const response = await fetch('/space_debris.mod');
      if (!response.ok) {
        throw new Error(`Failed to fetch /space_debris.mod: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      if (!audioEngine.ctx) {
        audioEngine.init();
      }
      const importedSong = await parseMODFile(arrayBuffer, audioEngine.ctx || undefined);
      setActiveChipSystem('amiga');
      setSong(importedSong);
      setCurrentOrderIndex(0);
      setCurrentLine(0);
      handleStop();
      showToast('Loaded Demo: Space Debris (Captain)');
    } catch (err) {
      console.error('Error loading space_debris.mod demo:', err);
      showToast('Could not load Space Debris demo');
    }
  };

  const prepareSongForSaving = (songToSave: TrackerSong): TrackerSong => {
    const serializedSamples = songToSave.samples.map((sm) => {
      let b64 = sm.base64Data;
      if (!b64 && sm.buffer) {
        try {
          const wavArrBuf = audioBufferToWavArrayBuffer(sm.buffer);
          b64 = arrayBufferToBase64(wavArrBuf);
        } catch (e) {
          console.error('Could not serialize audio buffer for sample:', sm.name, e);
        }
      }
      return {
        ...sm,
        buffer: null, // do not serialize live Web Audio DOM objects
        base64Data: b64,
      };
    });
    return { 
      ...songToSave, 
      system: activeChipSystem || songToSave.system || null,
      samples: serializedSamples 
    };
  };

  // 1. LOCAL STORAGE DIALOG ACTIONS & AUTO-SAVE ENGINE
  const handleUpdateSongName = (name: string) => {
    updateSongWithUndo((prev) => ({ ...prev, name }));
  };

  // Continuous background auto-save (Debounced 2.5s)
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastSavedStateFingerprintRef = useRef<string>('');

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Do NOT auto-save if the recovery banner is open (awaiting user decision)
    // or if the project is just the initial untouched 16-channel placeholder
    const isUntouchedDefaultPlaceholder = 
      song.name === 'Back on Track' &&
      song.channelsCount === 16 &&
      activeChipSystem === null &&
      !song.patterns.some(p => p.channels?.some(c => c?.some(st => st.note || (st.instrument !== null && st.instrument !== undefined)))) &&
      !song.samples.some(s => !!s.buffer || !!s.base64Data || !!s.sidConfig || (s.name && !s.name.startsWith('Sample ')));

    if (isUntouchedDefaultPlaceholder || isAutoRecoveryBannerOpen) {
      return;
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const serializedSong = prepareSongForSaving(song);
        const stateFingerprint = JSON.stringify({
          name: song.name,
          bpm: song.bpm,
          speed: song.speed,
          channelsCount: song.channelsCount,
          orderList: song.orderList,
          patterns: song.patterns,
          system: activeChipSystem,
          samplesMeta: song.samples.map(s => ({
            name: s.name,
            baseNote: s.baseNote,
            volume: s.volume,
            panning: s.panning,
            sidConfig: s.sidConfig,
            hasBuffer: !!s.buffer || !!s.base64Data,
          })),
        });

        if (stateFingerprint !== lastSavedStateFingerprintRef.current) {
          lastSavedStateFingerprintRef.current = stateFingerprint;
          await saveAutoSaveSession(serializedSong, activeChipSystem);
        }
      } catch (err) {
        console.warn('Auto-save background check failed:', err);
      }
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [song, activeChipSystem, isAutoRecoveryBannerOpen]);

  // Handlers for Session Auto-Recovery Banner
  const handleRestoreAutoSave = async () => {
    try {
      const backup = await getAutoSaveSession();
      if (!backup || !backup.songData) {
        showToast('No auto-save backup found');
        setIsAutoRecoveryBannerOpen(false);
        return;
      }
      const restoredSong = await rebuildAudioBuffers(backup.songData);
      const targetSystem = (backup.system || backup.songData?.system || restoredSong.system || null) as RetroChipSystem | null;
      
      // Explicitly set the chip system (C64, Gameboy, NES, Amiga, Megadrive, TRK)
      setActiveChipSystem(targetSystem);
      if (targetSystem) {
        restoredSong.system = targetSystem;
      }

      // Ensure channel count correctly aligns with the vintage hardware system
      if (targetSystem === 'c64' && restoredSong.channelsCount !== 3) {
        restoredSong.channelsCount = 3;
      } else if ((targetSystem === 'amiga' || targetSystem === 'gameboy' || targetSystem === 'nes') && (!restoredSong.channelsCount || restoredSong.channelsCount > 8)) {
        restoredSong.channelsCount = 4;
      } else if (targetSystem === 'megadrive' && (!restoredSong.channelsCount || restoredSong.channelsCount > 8)) {
        restoredSong.channelsCount = 6;
      }

      setSong(restoredSong);
      songRef.current = restoredSong;
      setUndoStack([]);
      setRedoStack([]);
      setCurrentOrderIndex(0);
      setCurrentLine(0);
      handleStop();

      // Update last saved state fingerprint so auto-save won't redundantly trigger immediately
      lastSavedStateFingerprintRef.current = JSON.stringify({
        name: restoredSong.name,
        bpm: restoredSong.bpm,
        speed: restoredSong.speed,
        channelsCount: restoredSong.channelsCount,
        orderList: restoredSong.orderList,
        patterns: restoredSong.patterns,
        system: targetSystem,
        samplesMeta: restoredSong.samples.map(s => ({
          name: s.name,
          baseNote: s.baseNote,
          volume: s.volume,
          panning: s.panning,
          sidConfig: s.sidConfig,
          hasBuffer: !!s.buffer || !!s.base64Data,
        })),
      });

      // Switch directly to the active tracker workspace view
      setShowLanding(false);
      setIsAutoRecoveryBannerOpen(false);
    } catch (e) {
      console.error('Failed to restore auto-save session:', e);
      showToast('Error restoring session.');
    }
  };

  const handleDismissAutoSave = async () => {
    try {
      await clearAutoSaveSession();
      setAutoRecoveryMeta(null);
      setIsAutoRecoveryBannerOpen(false);
    } catch (e) {
      setIsAutoRecoveryBannerOpen(false);
    }
  };

  const handleLocalSave = async (name: string) => {
    setIsSavingLocal(true);
    try {
      const songToSave = { ...song, name };
      const serializedSong = prepareSongForSaving(songToSave);

      const songId = name.toLowerCase().replace(/\s+/g, '-');
      await saveLocalSong(songId, name, serializedSong, activeChipSystem);
      setSong((prev) => ({ ...prev, name }));
      showToast(`Saved "${name}" to browser cache`);
    } catch (err) {
      console.error(err);
      alert('Could not save tracker song to your browser memory.');
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleLocalLoad = async (id: string) => {
    try {
      const rawSong = await loadLocalSong(id);
      const restoredSong = await rebuildAudioBuffers(rawSong);
      if (restoredSong.system) {
        setActiveChipSystem(restoredSong.system as RetroChipSystem);
      }
      setSong(restoredSong);
      setCurrentOrderIndex(0);
      setCurrentLine(0);
      handleStop();
      showToast(`Loaded "${restoredSong.name || 'Song'}" from browser cache`);
    } catch (err) {
      console.error(err);
      alert('Could not open the selected local song file.');
    }
  };

  // 1.5 CHIP SOUND SETS & INSTRUMENT PRESETS
  const handleLoadChipKit = (kitId: ChipKitType) => {
    setActiveChipSystem(kitId as RetroChipSystem);
    if (!audioEngine.ctx) {
      audioEngine.init();
    }
    const ctx = audioEngine.ctx;
    if (!ctx) return;

    const kit = CHIP_KITS.find((k) => k.id === kitId) || CHIP_KITS[0];
    const newSamples: TrackerSample[] = song.samples.map((s, idx) => {
      if (idx < kit.instruments.length) {
        const instDef = CHIP_INSTRUMENTS[kit.instruments[idx]];
        if (instDef) {
          return createChipSample(ctx, instDef, idx);
        }
      }
      return s;
    });

    updateSongWithUndo((prev) => ({
      ...prev,
      samples: newSamples,
    }));
    showToast(`Loaded ${kit.title} Sound Set`);
  };

  const handleLoadSingleChipInstrument = (instId: string, slotIndex: number) => {
    if (!audioEngine.ctx) {
      audioEngine.init();
    }
    const ctx = audioEngine.ctx;
    if (!ctx) return;

    const instDef = CHIP_INSTRUMENTS[instId];
    if (!instDef) return;

    const chipSample = createChipSample(ctx, instDef, slotIndex);
    updateSongWithUndo((prev) => {
      const updated = [...prev.samples];
      updated[slotIndex] = chipSample;
      return { ...prev, samples: updated };
    });
    showToast(`Loaded ${instDef.name} into Slot ${slotIndex.toString().padStart(2, '0')}`);
  };

  const handleClearAllSlots = () => {
    setActiveChipSystem(null);
    updateSongWithUndo((prev) => ({
      ...prev,
      samples: prev.samples.map((s, idx) => ({
        id: idx,
        name: '',
        filename: '',
        buffer: null,
        volume: 64,
        panning: 0.0,
        loopEnabled: false,
        loopStart: 0,
        loopEnd: 0,
        baseNote: 60,
        sourceType: 'upload',
      })),
    }));
    showToast('All instrument slots cleared');
  };

  // 2. AMIGA .MOD & C64 .SID IMPORT & EXPORT HANDLERS
  const handleImportMod = async (file: File) => {
    try {
      // Ensure audio context is unlocked/ready
      if (!audioEngine.ctx) {
        audioEngine.init();
      }
      if (audioEngine.ctx) {
        if (audioEngine.ctx.state === 'suspended') {
          await audioEngine.ctx.resume();
        }
        const arrayBuffer = await file.arrayBuffer();
        const importedSong = await parseMODFile(arrayBuffer, audioEngine.ctx);
        setActiveChipSystem('amiga');
        setSong(importedSong);
        setCurrentOrderIndex(0);
        setCurrentLine(0);
        handleStop();
        showToast(`Loaded Amiga Module: ${file.name} (${importedSong.channelsCount} CH)`);
      }
    } catch (err) {
      console.error(err);
      alert('Could not parse tracker module. Please check if the file is a valid Amiga MOD file.');
    }
  };

  const handleImportSid = async (file: File) => {
    try {
      if (!audioEngine.ctx) {
        audioEngine.init();
      }
      if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
        await audioEngine.ctx.resume();
      }
      const arrayBuffer = await file.arrayBuffer();
      const detailed = await parseSIDFileDetailed(arrayBuffer, audioEngine.ctx || undefined);
      setActiveChipSystem('c64');
      setSong(detailed.song);
      setCurrentOrderIndex(0);
      setCurrentLine(0);
      handleStop();
      
      setSidInfoData({
        fileName: file.name,
        title: detailed.title,
        author: detailed.author,
        released: detailed.released,
        isNativeSynTracker: detailed.isNativeSynTracker,
        format: detailed.format,
        song: detailed.song,
      });
      setIsSidInfoModalOpen(true);
      showToast(`Loaded C64 SID: ${detailed.song.name || file.name} (${detailed.song.channelsCount} CH)`);
    } catch (err) {
      console.error('Failed to parse SID file:', err);
      alert('Could not parse SID file. Please check if the file is a valid Commodore 64 .SID or .PRG file.');
    }
  };

  const handleExportWav = () => {
    setIsExportModalOpen(true);
  };

  const handleExportMp3 = () => {
    setIsExportModalOpen(true);
  };

  const handleExportMod = () => {
    try {
      const modBytes = exportMODFile(song);
      const blob = new Blob([modBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(song.name || 'tracker_song').replace(/[^a-zA-Z0-9_-]/g, '_')}.mod`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported Amiga MOD (${song.channelsCount} Channels)`);
    } catch (err) {
      console.error(err);
      alert('Could not export song to .MOD file format.');
    }
  };

  // Open file from local computer / desktop (MOD, TRK, SID, PRG, JSON)
  const handleOpenLocalFile = async (file: File) => {
    try {
      if (!audioEngine.ctx) {
        audioEngine.init();
      }
      if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
        await audioEngine.ctx.resume();
      }

      const fileName = file.name.toLowerCase();
      
      // 1. Check for Retro Chiptunes (C64 .SID/.PRG, NES .NSF, Game Boy .GBS, Mega Drive .VGM/.VGZ/.CYM)
      const retroInfo = await parseRetroChiptuneFile(file, audioEngine.ctx || undefined);
      if (retroInfo) {
        setActiveChipSystem(retroInfo.system);
        setSong(retroInfo.song);
        setCurrentOrderIndex(0);
        setCurrentLine(0);
        handleStop();

        setSidInfoData(retroInfo);
        setIsSidInfoModalOpen(true);
        showToast(`Loaded ${retroInfo.systemName}: ${retroInfo.title || file.name} (${retroInfo.channelsCount} CH)`);
        return;
      }

      if (fileName.endsWith('.mod')) {
        const arrayBuffer = await file.arrayBuffer();
        const importedSong = await parseMODFile(arrayBuffer, audioEngine.ctx || undefined);
        setActiveChipSystem('amiga');
        setSong(importedSong);
        setCurrentOrderIndex(0);
        setCurrentLine(0);
        handleStop();
        showToast(`Loaded Amiga Module: ${file.name} (${importedSong.channelsCount} Channels)`);
      } else if (fileName.endsWith('.json') || fileName.endsWith('.trk') || fileName.endsWith('.syn')) {
        const text = await file.text();
        const parsedSong = JSON.parse(text) as TrackerSong;
        const restoredSong = await rebuildAudioBuffers(parsedSong);
        setActiveChipSystem(null);
        setSong(restoredSong);
        setCurrentOrderIndex(0);
        setCurrentLine(0);
        handleStop();
        showToast(`Loaded Project: ${restoredSong.name || file.name}`);
      } else {
        // Fallback: try parsing as MOD, then JSON
        try {
          const arrayBuffer = await file.arrayBuffer();
          const importedSong = await parseMODFile(arrayBuffer, audioEngine.ctx || undefined);
          setActiveChipSystem('amiga');
          setSong(importedSong);
          setCurrentOrderIndex(0);
          setCurrentLine(0);
          handleStop();
          showToast(`Loaded Amiga Module: ${file.name}`);
        } catch {
          const text = await file.text();
          const parsedSong = JSON.parse(text) as TrackerSong;
          const restoredSong = await rebuildAudioBuffers(parsedSong);
          setActiveChipSystem(null);
          setSong(restoredSong);
          setCurrentOrderIndex(0);
          setCurrentLine(0);
          handleStop();
          showToast(`Loaded Project: ${restoredSong.name || file.name}`);
        }
      }
    } catch (err) {
      console.error('Failed to open local file:', err);
      alert('Could not open file. Please make sure it is a valid Amiga .MOD, Commodore .SID, NES .NSF, Game Boy .GBS, Mega Drive .VGM, or .TRK / .JSON Project file.');
    }
  };

  // Save full project file (.trk) directly to computer / desktop
  const handleSaveProjectFile = () => {
    try {
      const songToSave = prepareSongForSaving(song);
      const jsonStr = JSON.stringify(songToSave, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (song.name || 'tracker_project').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}.trk`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Saved Project: ${safeName}.trk`);
    } catch (err) {
      console.error('Error saving project file:', err);
      alert('Could not save project file to disk.');
    }
  };

  const activePatternId = song.orderList[currentOrderIndex] ?? 0;
  const activePattern = song.patterns.find((p) => p.id === activePatternId) ?? song.patterns[0];

  return (
    <div 
      className="h-screen flex flex-col font-sans overflow-hidden text-[#cbd5e1] relative bg-[#445166]"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          handleOpenLocalFile(file);
        }
      }}
    >
      {/* Smartphone Device Gate Screen - Only blocks the Studio DAW workspace, leaving Landing Page open to explore */}
      {!showLanding && isMobileDevice && (
        <MobileUnsupportedScreen 
          onBackToLanding={() => setShowLanding(true)}
        />
      )}

      {/* Base Gray Studio Background - Silver Steel (Persistent across entire app) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 bg-[#445166]" 
      />

      {/* Studio Wallpaper Layer that smoothly fades out to the solid studio grey tone when the tracker opens */}
      <motion.div 
        initial={false}
        animate={{ 
          opacity: showLanding ? 0.65 : 0, 
        }}
        transition={{ 
          duration: showLanding ? 0.6 : 3.8, 
          ease: 'easeInOut', 
          delay: showLanding ? 0 : 0.4 
        }}
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat mix-blend-luminosity filter brightness-95 contrast-105"
        style={{ backgroundImage: `url('/Studiopaper.jpeg')` }}
      />

      {/* Ambient subtle vignette overlay (Persistent) */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

      {/* Primary View Router with Strict Sequential Exit-Before-Enter Animation */}
      <AnimatePresence mode="wait">
        {showLanding ? (
          <motion.div 
            key="landing-page-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-10 w-screen h-screen overflow-hidden flex flex-col font-sans"
          >
            <LandingPage
              onStart={() => setShowLanding(false)}
              onOpenVisualizer={() => {
                setShowLanding(false);
                setIsVisualizerStudioOpen(true);
              }}
              onLoadDemo={() => {
                setShowLanding(false);
                loadSpaceDebrisDemo();
              }}
              onSelectChipKit={(formatOrKitId) => {
                setShowLanding(false);
                handleSelectNewProjectTemplate(formatOrKitId);
              }}
              onStartTutorial={() => {
                setShowLanding(false);
                setIsTutorialOpen(true);
              }}
              onOpenSupport={() => setIsSupportOpen(true)}
            />
          </motion.div>
        ) : isSynEditorOpen ? (
          <SynEditorModal
            key="syn-editor-studio-view"
            isOpen={true}
            onClose={() => setIsSynEditorOpen(false)}
            samples={song.samples}
            selectedSampleIndex={selectedSampleIndex}
            audioCtx={audioEngine.ctx}
            activeChipSystem={activeChipSystem}
            onUpdateSample={handleUpdateSample}
            onPlayPreview={handlePlayPreview}
            onShowToast={showToast}
            onSwitchPersona={handleSelectPersona}
            onOpenSupport={() => setIsSupportOpen(true)}
            showSupportButton={showSupportButton}
          />
        ) : isVisualizerStudioOpen ? (
          <VisualizerStudioModal
            key="visualizer-studio-view"
            isOpen={true}
            onClose={() => setIsVisualizerStudioOpen(false)}
            song={song}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onShowToast={showToast}
            onOpenLocalFile={handleOpenLocalFile}
            onSwitchPersona={handleSelectPersona}
            onOpenSupport={() => setIsSupportOpen(true)}
            showSupportButton={showSupportButton}
          />
        ) : isCoverDesignerOpen ? (
          <CoverDesignerModal
            key="cover-designer-view"
            isOpen={true}
            onClose={() => setIsCoverDesignerOpen(false)}
            song={song}
            onUpdateSong={(updated) => updateSongWithUndo((prev) => ({ ...prev, ...updated }))}
            onShowToast={showToast}
            activeChipSystem={activeChipSystem}
            onSelectPersona={handleSelectPersona}
            onOpenSupport={() => setIsSupportOpen(true)}
            showSupportButton={showSupportButton}
          />
        ) : (
          <motion.div
            key="tracker-workspace-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-screen flex flex-col font-sans overflow-hidden relative z-10"
          >
            {/* 1. Top Transport & Controls Header (Slides down from top with smooth deceleration) */}
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -70, opacity: 0, transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
              className="relative z-50 shrink-0"
            >
              <HeaderControls
          song={song}
          isPlaying={isPlaying}
          isEditMode={isEditMode}
          activeOctave={activeOctave}
          keyboardLayout={keyboardLayout}
          currentOrderIndex={currentOrderIndex}
          currentLine={currentLine}
          isSavingLocal={isSavingLocal}
          isFxRackOpen={isFxRackOpen}
          isPatternLoop={isPatternLoop}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onToggleFxRack={() => setIsFxRackOpen(!isFxRackOpen)}
          onTogglePatternLoop={handleTogglePatternLoop}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          onChangeBpm={handleBpmChange}
          onChangeSpeed={handleSpeedChange}
          onChangeOctave={setActiveOctave}
          onChangeChannelsCount={handleChannelsCountChange}
          onOpenLocalDialog={() => {
            setDialogMode('open');
            setIsLocalOpen(true);
          }}
          onSaveLocalDialog={() => {
            setDialogMode('save');
            setIsLocalOpen(true);
          }}
          onOpenLocalFile={handleOpenLocalFile}
          onSaveProjectFile={handleSaveProjectFile}
          onNewSong={handleNewSong}
          onLoadDemo={loadSpaceDebrisDemo}
          onToggleHelp={() => setIsHelpOpen(true)}
          onStartTutorial={() => setIsTutorialOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onImportMod={handleImportMod}
          onImportSid={handleImportSid}
          onExportMod={handleExportMod}
          onExportWav={handleExportWav}
          onExportMp3={handleExportMp3}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenLanding={() => {
            setIsSynEditorOpen(false);
            setIsVisualizerStudioOpen(false);
            setIsCoverDesignerOpen(false);
            setShowLanding(true);
          }}
          activeChipSystem={activeChipSystem}
          onOpenSidSynth={(system) => {
            if (system) setActiveChipSystem(system);
            setIsSidModalOpen(true);
          }}
          onOpenAmigaVault={() => setIsAmigaVaultOpen(true)}
          onOpenVisualizerStudio={() => setIsVisualizerStudioOpen(true)}
          onOpenSynEditor={() => setIsSynEditorOpen(true)}
          activePersona={isCoverDesignerOpen ? 'cover' : isSynEditorOpen ? 'editor' : isVisualizerStudioOpen ? 'visualizer' : 'tracker'}
          onSelectPersona={handleSelectPersona}
          onUpdateSongName={handleUpdateSongName}
          onOpenSaveModal={handleOpenSaveModal}
          onOpenSupport={() => setIsSupportOpen(true)}
          showSupportButton={showSupportButton}
        />
      </motion.div>

      {/* Optional Master Hardware FX Rack Dropdown with Animated Height */}
      <AnimatePresence>
        {isFxRackOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="px-3 pt-2 shrink-0 z-20 overflow-hidden"
          >
            <MasterRack
              isOpen={isFxRackOpen}
              isPlaying={isPlaying}
              onClose={() => setIsFxRackOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main workspace (Grid, Sample selector, Order list) */}
      <main className="flex-1 p-2.5 flex flex-col lg:flex-row gap-2.5 overflow-hidden min-h-0 relative z-10">
        
        {/* 2a. Left column: Order sequencer list & Utility Corner (Flies in gently from left) */}
        <motion.div 
          initial={{ x: -70, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0, transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } }}
          transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          className="w-full lg:w-48 xl:w-52 shrink-0 flex flex-col h-full min-h-0 overflow-hidden"
        >
          <OrderList
            orderList={song.orderList}
            currentOrderIndex={currentOrderIndex}
            currentLine={currentLine}
            patternLength={activePattern.length}
            isPlaying={isPlaying}
            patternsCount={song.patterns.length}
            onSelectOrderIndex={handleSelectOrderIndex}
            onUpdateOrderValue={handleUpdateOrderValue}
            onAddOrderStep={handleAddOrderStep}
            onRemoveOrderStep={handleRemoveOrderStep}
            onReorderOrderList={handleReorderOrderList}
            onOpenSupport={() => setIsSupportOpen(true)}
            showSupportButton={showSupportButton}
            onStartTutorial={() => setIsTutorialOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleHelp={() => setIsHelpOpen(true)}
          />
        </motion.div>

        {/* 3. Center column: The major tracker grid (Flies up gently from bottom) */}
        <motion.div 
          initial={{ y: 70, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 70, opacity: 0, scale: 0.98, transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } }}
          transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-hidden"
        >
          <PatternEditor
            pattern={activePattern}
            currentOrderIndex={currentOrderIndex}
            currentLine={currentLine}
            isPlaying={isPlaying}
            isEditMode={isEditMode}
            activeOctave={activeOctave}
            activeSampleIndex={selectedSampleIndex}
            samples={song.samples}
            channelsCount={song.channelsCount}
            bpm={song.bpm}
            speed={song.speed}
            activeChipSystem={activeChipSystem}
            onChangeBpm={handleBpmChange}
            onChangeSpeed={handleSpeedChange}
            onChangeOctave={setActiveOctave}
            onChangeChannelsCount={handleChannelsCountChange}
            keyboardLayout={keyboardLayout}
            hasTrackClipboard={trackClipboard !== null}
            hasPatternClipboard={patternClipboard !== null}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onToggleEditMode={() => setIsEditMode((prev) => !prev)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSelectLine={setCurrentLine}
            onUpdateStep={handleUpdateStep}
            onPlayPreview={handlePlayPreview}
            onStopPreview={handleStopPreview}
            onCopyTrack={handleCopyTrack}
            onPasteTrack={handlePasteTrack}
            onClearTrack={handleClearTrack}
            onCopyTracks={handleCopyTracks}
            onPasteTracks={handlePasteTracks}
            onClearTracks={handleClearTracks}
            onCopyPattern={handleCopyPattern}
            onPastePattern={handlePastePattern}
            onDuplicatePattern={handleDuplicatePattern}
            onClearPattern={handleClearPattern}
          />
        </motion.div>

        {/* 2b. Right column: Sample Manager & uploading (Flies in gently from right) */}
        <motion.div 
          initial={{ x: 70, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0, transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } }}
          transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          className="w-full lg:w-72 xl:w-84 2xl:w-88 shrink-0 flex flex-col h-full min-h-0 overflow-hidden"
        >
          <SampleManager
            samples={song.samples}
            selectedSampleIndex={selectedSampleIndex}
            audioCtx={audioEngine.ctx}
            keyboardLayout={keyboardLayout}
            activeChipSystem={activeChipSystem}
            isFxRackOpen={isFxRackOpen}
            onToggleFxRack={() => setIsFxRackOpen((prev) => !prev)}
            onKeyboardLayoutChange={handleKeyboardLayoutChange}
            onSelectSample={setSelectedSampleIndex}
            onUpdateSample={handleUpdateSample}
            onPlayPreview={handlePlayPreview}
            onAddSampleSlot={handleAddSampleSlot}
            onOpenAmigaVault={() => setIsAmigaVaultOpen(true)}
            onOpenSidSynth={() => {
              setIsSidModalOpen(true);
            }}
            onOpenSynEditor={() => setIsSynEditorOpen(true)}
          />
        </motion.div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#38bdf8] text-[#090d12] px-4 py-2 rounded font-mono font-bold text-xs shadow-2xl flex items-center gap-2 border border-[#7dd3fc]">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Drag and Drop File Overlay */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#070b11]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 pointer-events-none border-4 border-dashed border-[#38bdf8]"
          >
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-[#0e1724] border border-[#273a52] flex items-center justify-center text-[#38bdf8] shadow-[0_0_50px_rgba(56,189,248,0.3)]">
                <HardDrive className="w-10 h-10 animate-bounce text-[#38bdf8]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#f8fafc] font-display">Drop File to Load</h2>
                <p className="text-xs text-[#94a3b8] mt-1 font-mono">
                  Release to instantly import Amiga <span className="text-[#38bdf8]">.MOD</span> or Project <span className="text-[#34d399]">.TRK / .JSON</span>
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16202c] border border-[#273a52] text-[10px] text-[#64748b]">
                  <span>Windows • macOS • Linux • ChromeOS</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency Auto-Save Session Recovery Toast - Only shown inside the Studio workspace */}
      <AutoRecoveryBanner
        isOpen={isAutoRecoveryBannerOpen && !showLanding}
        backupMeta={autoRecoveryMeta}
        onRestore={handleRestoreAutoSave}
        onDismiss={handleDismissAutoSave}
        onCloseBannerOnly={() => setIsAutoRecoveryBannerOpen(false)}
      />

      {/* Popups & Modals */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        keyboardLayout={keyboardLayout}
        onChangeKeyboardLayout={handleKeyboardLayoutChange}
        channelsCount={song.channelsCount}
        onChangeChannelsCount={handleChannelsCountChange}
        highlightRows={highlightRows}
        onChangeHighlightRows={setHighlightRows}
        songName={song.name}
        onChangeSongName={handleUpdateSongName}
        showSupportButton={showSupportButton}
        onToggleSupportButton={handleToggleSupportButton}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      <HelpDialog 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        keyboardLayout={keyboardLayout}
        onStartTutorial={() => setIsTutorialOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      <OnboardingTutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />
      
      <LocalStorageDialog
        isOpen={isLocalOpen}
        currentSongName={song.name}
        onClose={() => setIsLocalOpen(false)}
        onSave={handleLocalSave}
        onLoad={handleLocalLoad}
        onOpenDiskFile={handleOpenLocalFile}
        onSaveDiskFile={handleSaveProjectFile}
      />

      <ExportAudioModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        song={song}
        onShowToast={showToast}
        activeSystem={activeChipSystem}
        onOpenVisualizerStudio={() => setIsVisualizerStudioOpen(true)}
      />

      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        song={song}
        onUpdateSongName={handleUpdateSongName}
        onShowToast={showToast}
        initialFormat={saveModalInitialFormat}
        activeSystem={activeChipSystem}
        onOpenVisualizerStudio={() => setIsVisualizerStudioOpen(true)}
      />

      {/* New Project Selection Requester */}
      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        onClose={() => setIsNewProjectDialogOpen(false)}
        onSelectTemplate={handleSelectNewProjectTemplate}
      />

      {/* Retro Chip Synth Studio Modal (Dedicated C64 SID, Game Boy, NES, or Mega Drive Interface) */}
      <SidSynthModal
        isOpen={isSidModalOpen}
        onClose={() => setIsSidModalOpen(false)}
        samples={song.samples}
        selectedSampleIndex={selectedSampleIndex}
        audioCtx={audioEngine.ctx}
        initialSystem={activeChipSystem}
        onSystemChange={setActiveChipSystem}
        keyboardLayout={keyboardLayout}
        onKeyboardLayoutChange={setKeyboardLayout}
        onSelectSample={setSelectedSampleIndex}
        onUpdateSample={handleUpdateSample}
        onPlayPreview={handlePlayPreview}
      />

      {/* Amiga ST-Disk Floppy Vault Modal (SoundTracker Library) */}
      <AmigaDiskVaultModal
        isOpen={isAmigaVaultOpen}
        onClose={() => setIsAmigaVaultOpen(false)}
        samples={song.samples}
        selectedSlotIndex={selectedSampleIndex}
        totalSlots={song.samples.length}
        audioCtx={audioEngine.ctx}
        onSelectSample={setSelectedSampleIndex}
        onLoadSampleToSlot={(slotIndex, sample) => {
          handleUpdateSample(slotIndex, sample);
          setSelectedSampleIndex(slotIndex);
        }}
        onBatchLoadSamples={handleBatchLoadSamples}
      />

      {/* Support & Indie Dev Modal (Buy Me a Coffee, PayPal.Me & QR Code) */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Retro Chiptune & Hardware Format Information Modal (C64, NES, Game Boy, Mega Drive) */}
      <RetroChipInfoModal
        isOpen={isSidInfoModalOpen}
        fileInfo={sidInfoData}
        onClose={() => {
          setIsSidInfoModalOpen(false);
          setSidInfoData(null);
        }}
        onConfirmLoad={() => {
          setIsSidInfoModalOpen(false);
          setSidInfoData(null);
          showToast(`Loaded ${sidInfoData?.systemName || 'Retro'} track anyway`);
        }}
        onLoadTemplate={(sys) => {
          handleSelectNewProjectTemplate(sys);
          const nameMap: Record<string, string> = {
            c64: 'C64 MOS 6581 Sound Studio',
            nes: 'NES Ricoh 2A03 Sound Studio',
            gameboy: 'Game Boy DMG-01 Sound Studio',
            megadrive: 'Mega Drive YM2612 Sound Studio',
          };
          showToast(`${nameMap[sys] || 'Retro Studio'} loaded`);
        }}
      />
    </div>
  );
}

