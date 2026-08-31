/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Volume2, 
  Download, 
  FolderDown, 
  Sliders, 
  Wand2, 
  Layers, 
  Activity, 
  Radio, 
  Cpu,
  Music,
  ChevronDown,
  Save,
  Check
} from 'lucide-react';
import { TrackerSample, SidInstrumentConfig, SidWaveformType, SidFilterType, KeyboardLayout, RetroChipSystem } from '../types';
import { 
  DEFAULT_SID_CONFIG, 
  SID_PRESET_LIBRARY, 
  createSampleFromSidConfig, 
  exportSidPack, 
  downloadSidPack, 
  parseSidPack,
  SID_ATTACK_TIMES_MS,
  SID_DECAY_RELEASE_TIMES_MS
} from '../lib/sidSynth';
import { 
  CHIP_PRESET_KITS, 
  ChipKitType, 
  createChipSample, 
  ChipInstrumentDefinition 
} from '../lib/chipPresets';
import { saveSampleData } from '../lib/indexedDB';

// Gentle retro confirmation chime (D6 -> A6) for saving sound to slot
function playSaveSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const notes = [
      { freq: 1174.66, time: 0.00, dur: 0.12 }, // D6
      { freq: 1760.00, time: 0.08, dur: 0.28 }, // A6
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(0.045, now + time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  } catch {}
}

interface ToastData {
  title: string;
  message: string;
  subtext?: string;
  chipIcon?: string;
  chipLabel?: string;
  slot?: number;
}

interface RetroSystemInfo {
  id: RetroChipSystem;
  name: string;
  chipLabel: string;
  badge: string;
  icon: string;
  description: string;
  specs: string[];
}

export const RETRO_SYSTEMS: RetroSystemInfo[] = [
  {
    id: 'c64',
    name: 'Commodore 64',
    chipLabel: 'MOS 6581 / 8580 SID',
    badge: '3-VOICE ANALOG HYBRID',
    icon: '/C64.png',
    description: 'Analog/digital hybrid synthesizer with multi-mode resonant analog filter, dynamic pulse-width modulation, ring modulation, and oscillator hard sync.',
    specs: ['MOS 6581/8580 Audio IC', '12dB Multi-Mode Filter', 'Dynamic PWM Engine', 'Hard Sync & Ring Mod'],
  },
  {
    id: 'gameboy',
    name: 'Game Boy',
    chipLabel: 'DMG-01 APU (LR35902)',
    badge: '4-CHANNEL 8-BIT APU',
    icon: '/GB.png',
    description: '4 discrete audio channels: 2x Pulse with automatic pitch sweep, 4-bit 32-sample custom Wave RAM, and 7/15-bit LFSR pseudo-random noise generator.',
    specs: ['Sharp LR35902 APU', '4-Bit Custom Wave RAM', 'Hardware Pitch Sweep', '7-Bit Periodic Drum Noise'],
  },
  {
    id: 'nes',
    name: 'NES / Famicom',
    chipLabel: 'Ricoh 2A03 APU',
    badge: '5-CHANNEL 8-BIT APU',
    icon: '/NES.png',
    description: '5 audio channels: 2x Pulse with hardware sweep units, 16-step stepped triangle bass wave, 1-bit pseudo-random noise with 93-step periodic mode, and DPCM.',
    specs: ['Ricoh 2A03 Audio Co-Processor', '16-Step Stepped Triangle', 'Hardware Sweep Unit', '93-Step Metallic Noise'],
  },
  {
    id: 'megadrive',
    name: 'Sega Mega Drive',
    chipLabel: 'Yamaha YM2612 FM + PSG',
    badge: '16-BIT 4-OPERATOR FM',
    icon: '/Megadrive.png',
    description: '6-channel 4-operator Frequency Modulation synthesizer with 8 algorithm routings, operator feedback, detuning, and Texas Instruments SN76489 PSG channels.',
    specs: ['Yamaha YM2612 4-Op FM Synth', '8 Operator Algorithms', 'Op1 Feedback Loop', 'SN76489 3x Pulse PSG'],
  },
  {
    id: 'amiga',
    name: 'Commodore Amiga',
    chipLabel: 'Paula 8364 Sound IC',
    badge: '4/8-VOICE STEREO PCM',
    icon: '/Icon_A500.png',
    description: '4 or 8 hardware DMA channels with linear interpolation, hardware stereo panning, and full SoundTracker ST-disk sample library integration.',
    specs: ['MOS Technology 8364 Paula', '4/8 Stereo DMA Channels', '8-Bit Logarithmic DAC', 'ST-Disk Sample Library'],
  },
  {
    id: 'trk',
    name: 'SYN-Tracker TRK',
    chipLabel: 'Hybrid Sound Studio',
    badge: '16-TRK / 32-INST STUDIO',
    icon: '/Icon_TRK.png',
    description: 'Flagship tracker format featuring 16 parallel tracks, 32 instrument slots, integrated SID/APU/FM synth baking, and direct .TRK multi-track architecture.',
    specs: ['32 Instrument Slots', '4 / 8 / 16 Audio Tracks', 'Multi-Chip Sound Synthesizers', 'Lossless TRK Multi-File Engine'],
  },
];

// Piano mappings per keyboard layout for Live Audition
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

interface SidSynthModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: TrackerSample[];
  selectedSampleIndex: number;
  audioCtx: AudioContext | null;
  initialSystem?: RetroChipSystem | null;
  onSystemChange?: (sys: RetroChipSystem) => void;
  keyboardLayout?: KeyboardLayout;
  onKeyboardLayoutChange?: (layout: KeyboardLayout) => void;
  onSelectSample: (index: number) => void;
  onUpdateSample: (index: number, updated: Partial<TrackerSample>) => void;
  onPlayPreview: (midiNote: number, sample: TrackerSample) => void;
}

export const SidSynthModal: React.FC<SidSynthModalProps> = ({
  isOpen,
  onClose,
  samples,
  selectedSampleIndex,
  audioCtx,
  initialSystem = 'c64',
  onSystemChange,
  keyboardLayout = 'QWERTZ',
  onKeyboardLayoutChange,
  onSelectSample,
  onUpdateSample,
  onPlayPreview,
}) => {
  const [currentLayout, setCurrentLayout] = useState<KeyboardLayout>(() => {
    return keyboardLayout || (localStorage.getItem('syn_tracker_kbd_layout') as KeyboardLayout) || 'QWERTZ';
  });

  useEffect(() => {
    if (keyboardLayout) {
      setCurrentLayout(keyboardLayout);
    }
  }, [keyboardLayout]);

  const handleLayoutSelect = (layout: KeyboardLayout) => {
    setCurrentLayout(layout);
    if (onKeyboardLayoutChange) {
      onKeyboardLayoutChange(layout);
    }
    localStorage.setItem('syn_tracker_kbd_layout', layout);
  };

  // Active Retro Chip Synthesizer Engine (C64 SID, Game Boy APU, NES 2A03, Mega Drive FM)
  const [activeSystem, setActiveSystem] = useState<RetroChipSystem>(() => {
    if (initialSystem === 'gameboy' || initialSystem === 'nes' || initialSystem === 'megadrive' || initialSystem === 'c64') {
      return initialSystem;
    }
    return 'c64';
  });

  useEffect(() => {
    if (initialSystem === 'gameboy' || initialSystem === 'nes' || initialSystem === 'megadrive' || initialSystem === 'c64') {
      setActiveSystem(initialSystem);
    }
  }, [initialSystem]);

  const [targetSlot, setTargetSlot] = useState<number>(selectedSampleIndex);
  const [instrumentName, setInstrumentName] = useState<string>('SID Instrument');
  const [testNote, setTestNote] = useState<number>(36); // C-2 default
  const [activeOctave, setActiveOctave] = useState<number>(2); // Base octave 2 (C-2 = 36)
  const [activePlayingNote, setActivePlayingNote] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [selectedChipPresetId, setSelectedChipPresetId] = useState<string>('');
  const [bakedSuccessToast, setBakedSuccessToast] = useState<ToastData | null>(null);
  const [isMidiConnected, setIsMidiConnected] = useState<boolean>(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger rich bottom-right toast with retro chime and auto-dismiss
  const triggerSaveToast = useCallback((data: ToastData) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    playSaveSuccessChime();
    setBakedSuccessToast(data);
    toastTimerRef.current = setTimeout(() => {
      setBakedSuccessToast(null);
    }, 2800);
  }, []);

  // Dedicated GameBoy APU local state parameters
  const [gbDuty, setGbDuty] = useState<0.125 | 0.25 | 0.5 | 0.75>(0.25);
  const [gbSweepTime, setGbSweepTime] = useState<number>(2);
  const [gbSweepDir, setGbSweepDir] = useState<'up' | 'down'>('down');
  const [gbNoiseMode, setGbNoiseMode] = useState<'7bit' | '15bit'>('7bit');
  const [gbWaveRamShape, setGbWaveRamShape] = useState<string>('Slap Bass');

  // Dedicated NES 2A03 APU local state parameters
  const [nesDuty, setNesDuty] = useState<0.125 | 0.25 | 0.5 | 0.75>(0.5);
  const [nesSweepPeriod, setNesSweepPeriod] = useState<number>(3);
  const [nesNoiseLoop, setNesNoiseLoop] = useState<'93step' | '32767step'>('93step');
  const [nesTriangleSteps, setNesTriangleSteps] = useState<number>(16);

  // Dedicated Sega Mega Drive FM local state parameters
  const [mdAlgorithm, setMdAlgorithm] = useState<number>(4);
  const [mdFeedback, setMdFeedback] = useState<number>(5);
  const [mdOpMultipliers, setMdOpMultipliers] = useState<number[]>([1, 2, 1, 0.5]);
  const [mdOpLevels, setMdOpLevels] = useState<number[]>([98, 75, 88, 127]);

  // Save Pack / Soundbank Modal State
  const [isSavePackModalOpen, setIsSavePackModalOpen] = useState<boolean>(false);
  const [packNameInput, setPackNameInput] = useState<string>('');
  const [packAuthorInput, setPackAuthorInput] = useState<string>('Chip Musician');
  const [packDescInput, setPackDescInput] = useState<string>('SynTracker Soundbank');
  const [packNameError, setPackNameError] = useState<string | null>(null);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const packFileInputRef = useRef<HTMLInputElement>(null);
  const oscCanvasRef = useRef<HTMLCanvasElement>(null);
  const noteClearTimerRef = useRef<number | null>(null);

  // Safely get or initialize/resume an AudioContext
  const getActiveAudioContext = useCallback((): AudioContext | null => {
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
        console.error('Could not get audio context in SidSynthModal:', e);
      }
    }
    return null;
  }, [audioCtx]);

  // Active SID config state
  const [config, setConfig] = useState<SidInstrumentConfig>(() => {
    const sample = samples[selectedSampleIndex];
    return sample?.sidConfig ? { ...sample.sidConfig } : { ...DEFAULT_SID_CONFIG };
  });

  const configRef = useRef<SidInstrumentConfig>(config);
  configRef.current = config;

  const targetSlotRef = useRef<number>(targetSlot);
  targetSlotRef.current = targetSlot;

  const instrumentNameRef = useRef<string>(instrumentName);
  instrumentNameRef.current = instrumentName;

  const activeSystemRef = useRef<RetroChipSystem>(activeSystem);
  activeSystemRef.current = activeSystem;

  const selectedChipPresetIdRef = useRef<string>(selectedChipPresetId);
  selectedChipPresetIdRef.current = selectedChipPresetId;

  const prevIsOpenRef = useRef(false);

  // Sync state ONLY when modal first opens or initial active slot changes on open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setTargetSlot(selectedSampleIndex);
      targetSlotRef.current = selectedSampleIndex;
      const sample = samples[selectedSampleIndex];
      if (sample?.sidConfig) {
        setConfig({ ...sample.sidConfig });
        configRef.current = { ...sample.sidConfig };
        setActiveSystem('c64');
      } else {
        setConfig({ ...DEFAULT_SID_CONFIG });
        configRef.current = { ...DEFAULT_SID_CONFIG };
      }
      const initialName = sample?.name && sample.name !== 'Empty' && sample.name !== 'EMPTY'
        ? sample.name
        : (activeSystem === 'c64' ? 'Rob Hubbard PWM Lead' : `${activeSystem.toUpperCase()} Sound`);
      setInstrumentName(initialName);
      instrumentNameRef.current = initialName;

      setTimeout(() => {
        modalContainerRef.current?.focus();
      }, 50);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, selectedSampleIndex, activeSystem]);

  // Switch Active System cleanly
  const handleSwitchSystem = (sysId: RetroChipSystem) => {
    setActiveSystem(sysId);
    activeSystemRef.current = sysId;
    if (onSystemChange) {
      onSystemChange(sysId);
    }
    if (sysId === 'c64') {
      const defaultPreset = SID_PRESET_LIBRARY[0];
      setSelectedPresetId(defaultPreset.id);
      setConfig({ ...defaultPreset.config });
      configRef.current = { ...defaultPreset.config };
      setInstrumentName(defaultPreset.name);
      instrumentNameRef.current = defaultPreset.name;
      setTestNote(defaultPreset.baseNote);
    } else {
      const presets = CHIP_PRESET_KITS[sysId as ChipKitType];
      if (presets && presets.length > 0) {
        const firstPreset = presets[0];
        setSelectedChipPresetId(firstPreset.id);
        selectedChipPresetIdRef.current = firstPreset.id;
        setInstrumentName(firstPreset.name);
        instrumentNameRef.current = firstPreset.name;
        setTestNote(firstPreset.baseNote);
      }
    }
    modalContainerRef.current?.focus();
  };

  // Update target slot selection
  const handleSlotChange = (slotIdx: number) => {
    setTargetSlot(slotIdx);
    targetSlotRef.current = slotIdx;
    onSelectSample(slotIdx);
    const sample = samples[slotIdx];
    if (sample?.sidConfig) {
      setConfig({ ...sample.sidConfig });
      configRef.current = { ...sample.sidConfig };
      setActiveSystem('c64');
    }
    if (sample?.name && sample.name !== 'Empty' && sample.name !== 'EMPTY') {
      setInstrumentName(sample.name);
      instrumentNameRef.current = sample.name;
    }
    modalContainerRef.current?.focus();
  };

  const updateConfig = (partial: Partial<SidInstrumentConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      configRef.current = next;
      return next;
    });
  };

  // Preview the current retro sound in real-time
  const handlePreview = useCallback((noteToPlay = testNote, customConfig?: SidInstrumentConfig) => {
    const ctx = getActiveAudioContext();
    if (!ctx) return;

    setActivePlayingNote(noteToPlay);
    if (noteClearTimerRef.current) {
      clearTimeout(noteClearTimerRef.current);
    }
    noteClearTimerRef.current = window.setTimeout(() => {
      setActivePlayingNote(null);
    }, 280);

    if (activeSystemRef.current === 'c64') {
      const cfg = customConfig || configRef.current;
      const previewName = instrumentNameRef.current || 'SID Preview';
      const tempSample = createSampleFromSidConfig(
        ctx,
        previewName,
        cfg,
        noteToPlay,
        targetSlotRef.current
      );
      onPlayPreview(noteToPlay, tempSample);
    } else {
      const presets = CHIP_PRESET_KITS[activeSystemRef.current as ChipKitType];
      const chipDef = presets?.find((p) => p.id === selectedChipPresetIdRef.current) || presets?.[0];
      if (chipDef) {
        const tempSample = createChipSample(ctx, chipDef, targetSlotRef.current);
        if (instrumentNameRef.current) {
          tempSample.name = instrumentNameRef.current;
        }
        onPlayPreview(noteToPlay, tempSample);
      }
    }
  }, [getActiveAudioContext, testNote, onPlayPreview]);

  // Bake sound to target slot
  const handleBakeToSlot = (slot = targetSlot) => {
    const ctx = getActiveAudioContext();
    if (!ctx) return;

    let effectiveName = instrumentName.trim() || instrumentNameRef.current.trim();

    let sampleObj: TrackerSample;
    if (activeSystem === 'c64') {
      const cfg = configRef.current;
      if (!effectiveName || effectiveName === 'Empty' || effectiveName === 'EMPTY') {
        const found = SID_PRESET_LIBRARY.find((p) => p.id === selectedPresetId);
        effectiveName = found?.name || `SID ${cfg.waveform.toUpperCase()}`;
      }
      sampleObj = createSampleFromSidConfig(
        ctx,
        effectiveName,
        cfg,
        testNote,
        slot
      );
    } else {
      const presets = CHIP_PRESET_KITS[activeSystem as ChipKitType];
      const chipDef = presets?.find((p) => p.id === selectedChipPresetIdRef.current) || presets?.[0];
      if (!chipDef) return;
      if (!effectiveName || effectiveName === 'Empty' || effectiveName === 'EMPTY') {
        effectiveName = chipDef.name;
      }
      sampleObj = createChipSample(ctx, chipDef, slot);
      sampleObj.name = effectiveName.slice(0, 22);
    }

    if (!sampleObj.name || sampleObj.name === 'Empty' || sampleObj.name === 'EMPTY') {
      sampleObj.name = effectiveName || 'SID Sound';
    }

    // Keep state and ref in sync with the baked name
    setInstrumentName(sampleObj.name);
    instrumentNameRef.current = sampleObj.name;

    onUpdateSample(slot, sampleObj);

    if (sampleObj.buffer) {
      const wavArrayBuffer = audioBufferToWavArrayBuffer(sampleObj.buffer);
      saveSampleData(`sample-${slot}`, wavArrayBuffer).catch(() => {});
    }

    triggerSaveToast({
      title: 'Instrument Saved',
      message: sampleObj.name,
      subtext: `${currentSystemInfo.name} • 16-Bit PCM`,
      chipIcon: currentSystemInfo.icon,
      chipLabel: currentSystemInfo.name,
      slot: slot,
    });
    handlePreview(testNote);
  };

  // Bake full kit of presets into all slots
  const handleBakeFullKit = () => {
    const ctx = getActiveAudioContext();
    if (!ctx) return;

    if (activeSystem === 'c64') {
      const count = Math.min(samples.length, SID_PRESET_LIBRARY.length);
      for (let i = 0; i < count; i++) {
        const preset = SID_PRESET_LIBRARY[i];
        const sampleObj = createSampleFromSidConfig(
          ctx,
          preset.name,
          preset.config,
          preset.baseNote,
          i
        );
        onUpdateSample(i, sampleObj);
        if (sampleObj.buffer) {
          const wavArrayBuffer = audioBufferToWavArrayBuffer(sampleObj.buffer);
          saveSampleData(`sample-${i}`, wavArrayBuffer).catch(() => {});
        }
      }
      triggerSaveToast({
        title: 'Soundbank Loaded',
        message: `${count} C64 SID Presets`,
        subtext: 'Synthesized to Tracker Slots 00..15',
        chipIcon: currentSystemInfo.icon,
        chipLabel: currentSystemInfo.name,
      });
    } else {
      const presets = CHIP_PRESET_KITS[activeSystem as ChipKitType];
      if (presets) {
        const count = Math.min(samples.length, presets.length);
        for (let i = 0; i < count; i++) {
          const preset = presets[i];
          const sampleObj = createChipSample(ctx, preset, i);
          sampleObj.name = preset.name;
          onUpdateSample(i, sampleObj);
          if (sampleObj.buffer) {
            const wavArrayBuffer = audioBufferToWavArrayBuffer(sampleObj.buffer);
            saveSampleData(`sample-${i}`, wavArrayBuffer).catch(() => {});
          }
        }
        const sysName = RETRO_SYSTEMS.find((s) => s.id === activeSystem)?.name || 'Chip';
        triggerSaveToast({
          title: 'Soundbank Loaded',
          message: `${count} ${sysName} Instruments`,
          subtext: 'Synthesized to Tracker Slots 00..15',
          chipIcon: currentSystemInfo.icon,
          chipLabel: currentSystemInfo.name,
        });
      }
    }
    handlePreview(testNote);
  };

  // Apply a C64 SID preset from library
  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = SID_PRESET_LIBRARY.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig({ ...preset.config });
    configRef.current = { ...preset.config };
    setInstrumentName(preset.name);
    instrumentNameRef.current = preset.name;
    setTestNote(preset.baseNote);
    handlePreview(preset.baseNote, preset.config);
    modalContainerRef.current?.focus();
  };

  // Apply a non-C64 chip preset
  const handleApplyChipPreset = (chipDef: ChipInstrumentDefinition) => {
    setSelectedChipPresetId(chipDef.id);
    selectedChipPresetIdRef.current = chipDef.id;
    setInstrumentName(chipDef.name);
    instrumentNameRef.current = chipDef.name;
    setTestNote(chipDef.baseNote);
    handlePreview(chipDef.baseNote);
    modalContainerRef.current?.focus();
  };

  // Keyboard handler for live piano audition
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Only block note keys if the user is typing inside an actual text input or textarea
      const isTextInput =
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' &&
            !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(
              (target as HTMLInputElement).type
            )));

      if (isTextInput) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isSavePackModalOpen) {
          setIsSavePackModalOpen(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        setActiveOctave((o) => Math.max(1, o - 1));
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        setActiveOctave((o) => Math.min(6, o + 1));
        return;
      }

      const map = PIANO_MAPS[currentLayout] || PIANO_MAPS.QWERTZ;
      let noteOffset: number | undefined;

      if (currentLayout === 'AUTO') {
        if (map.lower[e.code] !== undefined) {
          noteOffset = map.lower[e.code];
        } else if (map.upper[e.code] !== undefined) {
          noteOffset = map.upper[e.code];
        }
      } else {
        const char = e.key.toLowerCase();
        if (map.lower[char] !== undefined) {
          noteOffset = map.lower[char];
        } else if (map.upper[char] !== undefined || map.upper[e.key] !== undefined) {
          noteOffset = map.upper[char] ?? map.upper[e.key];
        }
      }

      if (noteOffset !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        // If a control (like select or slider) held focus, release it to modal container
        if (target && target !== modalContainerRef.current) {
          target.blur();
          modalContainerRef.current?.focus();
        }
        const baseMidi = 12 * (activeOctave + 1);
        const midiNote = baseMidi + noteOffset;
        handlePreview(midiNote);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, currentLayout, activeOctave, handlePreview, onClose, isSavePackModalOpen]);

  // Web MIDI 2.0 Hardware Input Listener
  useEffect(() => {
    if (!isOpen) return;
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      return;
    }

    let midiAccess: any = null;

    const onMidiMessage = (event: any) => {
      const [status, noteNumber, velocity] = event.data;
      const command = status >> 4;
      if (command === 0x9 && velocity > 0) {
        handlePreview(noteNumber);
      }
    };

    const attachInputs = (access: any) => {
      let count = 0;
      for (const input of access.inputs.values()) {
        input.onmidimessage = onMidiMessage;
        count++;
      }
      setIsMidiConnected(count > 0);
    };

    (navigator as any).requestMIDIAccess({ sysex: false })
      .then((access: any) => {
        midiAccess = access;
        attachInputs(access);
        access.onstatechange = () => attachInputs(access);
      })
      .catch(() => {
        setIsMidiConnected(false);
      });

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [isOpen, handlePreview]);

  // Oscilloscope Animation Frame Loop - Classic Clean Sky Phosphor (#38bdf8)
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    let phase = 0;

    const render = () => {
      const canvas = oscCanvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Vintage CRT Grid Lines
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#152132';
      ctx.beginPath();
      for (let x = 0; x < width; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 16) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Unified Sky Phosphor Vector Waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      const cycles = 3;
      const wf = config.waveform;
      const pw = config.pulseWidth / 4095;

      for (let x = 0; x < width; x++) {
        const t = (x / width) * cycles * Math.PI * 2 + phase;
        let yNorm = 0;

        if (activeSystem === 'c64') {
          if (wf === 'pulse') {
            const modT = (t / (Math.PI * 2)) % 1;
            yNorm = modT < pw ? 0.75 : -0.75;
          } else if (wf === 'saw') {
            yNorm = ((t / (Math.PI * 2)) % 1) * 1.5 - 0.75;
          } else if (wf === 'triangle') {
            const tri = (t / (Math.PI * 2)) % 1;
            yNorm = (tri < 0.5 ? tri * 4 - 1 : 3 - tri * 4) * 0.75;
          } else if (wf === 'noise') {
            yNorm = (Math.sin(x * 12.345 + phase * 8) * 0.4 + (Math.random() - 0.5) * 0.8) * 0.75;
          } else if (wf === 'pulsesaw') {
            const modT = (t / (Math.PI * 2)) % 1;
            const p = modT < pw ? 0.6 : -0.6;
            const s = (modT * 2 - 1) * 0.6;
            yNorm = (p + s) * 0.6;
          } else if (wf === 'pulsetri') {
            const modT = (t / (Math.PI * 2)) % 1;
            const p = modT < pw ? 0.6 : -0.6;
            const tri = modT < 0.5 ? modT * 4 - 1 : 3 - modT * 4;
            yNorm = (p + tri * 0.6) * 0.6;
          }
        } else if (activeSystem === 'gameboy') {
          // Game Boy 4-bit staircase wave & sweep pulse
          const modT = (t / (Math.PI * 2)) % 1;
          const quantized = Math.floor(modT * 16) / 16;
          yNorm = (Math.sin(quantized * Math.PI * 2) * 0.8);
        } else if (activeSystem === 'nes') {
          // NES 16-step stepped triangle & pulse
          const tri = (t / (Math.PI * 2)) % 1;
          const rawTri = tri < 0.5 ? tri * 2 : 2 - tri * 2;
          const steps = Math.floor(rawTri * 15) / 15;
          yNorm = (steps * 2 - 1) * 0.75;
        } else {
          // Mega Drive 4-Op FM Modulation
          const op1 = Math.sin(t);
          const op2 = Math.sin(t * 2 + op1 * 1.5);
          yNorm = op2 * 0.75;
        }

        const y = midY - yNorm * (height * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.05;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, config, activeSystem]);

  // Open Save Pack Modal with validation
  const handleOpenSavePack = () => {
    setPackNameInput(instrumentName || (activeSystem === 'c64' ? 'SID Soundbank' : `${activeSystem.toUpperCase()} Pack`));
    setPackAuthorInput('Tracker Musician');
    setPackDescInput(`SynTracker ${activeSystem.toUpperCase()} Instruments`);
    setPackNameError(null);
    setIsSavePackModalOpen(true);
  };

  // Confirm and save the Soundbank pack
  const handleConfirmSavePack = () => {
    const trimmed = packNameInput.trim();
    if (!trimmed) {
      setPackNameError('Please provide a name for this soundbank pack.');
      return;
    }
    setPackNameError(null);

    const pack = exportSidPack(
      samples,
      trimmed,
      packAuthorInput.trim() || 'Anonymous',
      packDescInput.trim() || 'SynTracker Soundbank'
    );
    downloadSidPack(pack);
    setIsSavePackModalOpen(false);

    setBakedSuccessToast(`Saved "${trimmed}.sidpack"!`);
    setTimeout(() => setBakedSuccessToast(null), 2500);
  };

  // Load soundbank pack file
  const handleLoadPackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const pack = parseSidPack(text);
      if (!pack || !pack.instruments) {
        throw new Error('Invalid soundbank format.');
      }

      const ctx = getActiveAudioContext();
      if (!ctx) return;

      const loadedCount = Math.min(16, pack.instruments.length);
      for (let i = 0; i < loadedCount; i++) {
        const inst = pack.instruments[i];
        const sampleObj = createSampleFromSidConfig(
          ctx,
          inst.name,
          inst.config,
          inst.baseNote,
          i
        );
        onUpdateSample(i, sampleObj);
        if (sampleObj.buffer) {
          const wavArrayBuffer = audioBufferToWavArrayBuffer(sampleObj.buffer);
          saveSampleData(`sample-${i}`, wavArrayBuffer).catch(() => {});
        }
      }

      setBakedSuccessToast(`Loaded "${pack.name}" (${loadedCount} instruments)`);
      setTimeout(() => setBakedSuccessToast(null), 2500);
    } catch (err: any) {
      alert(`Could not load pack: ${err.message || 'File corrupted'}`);
    } finally {
      if (packFileInputRef.current) {
        packFileInputRef.current.value = '';
      }
    }
  };

  const currentSystemInfo = RETRO_SYSTEMS.find((s) => s.id === activeSystem) || RETRO_SYSTEMS[0];
  const chipPresetsForActiveSys = activeSystem !== 'c64' ? (CHIP_PRESET_KITS[activeSystem as ChipKitType] || []) : [];

  const isMultiSlotStudio = initialSystem === 'trk' || initialSystem === 'amiga' || samples.length > 16;
  const projectTitle = initialSystem === 'trk'
    ? 'SYN-Tracker TRK Synth Studio'
    : initialSystem === 'amiga'
    ? 'Amiga Sound & Synth Studio'
    : `${currentSystemInfo.name} Editor`;

  const projectChipLabel = initialSystem === 'trk'
    ? `${samples.length}-Slot Hybrid Studio`
    : initialSystem === 'amiga'
    ? `${samples.length}-Slot Paula & Synth`
    : currentSystemInfo.chipLabel;

  const projectBadge = initialSystem === 'trk'
    ? `${samples.length} SLOTS • MULTI-CHIP`
    : initialSystem === 'amiga'
    ? `${samples.length} SLOTS • MULTI-CHIP`
    : currentSystemInfo.badge;

  const projectIcon = initialSystem === 'trk'
    ? '/Icon_TRK.png'
    : initialSystem === 'amiga'
    ? '/Icon_A500.png'
    : currentSystemInfo.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sid-synth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/25 backdrop-blur-md select-none"
          onClick={onClose}
        >
          <input
            ref={packFileInputRef}
            type="file"
            accept=".sidpack,.json"
            className="hidden"
            onChange={handleLoadPackFile}
          />

          <motion.div
            ref={modalContainerRef}
            key="sid-synth-modal-content"
            initial={{ y: '100%', opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ 
              y: '100%', 
              opacity: 0, 
              scale: 0.98,
              transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } 
            }}
            transition={{ 
              duration: 0.5, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl max-h-[92vh] rounded-2xl bg-[#070c14] border border-sky-500/40 shadow-[0_0_60px_rgba(56,189,248,0.25)] overflow-hidden flex flex-col focus:outline-none text-[#e2e8f0]"
          >
        {/* Top Header Bar - Clean and Focused */}
        <div className="px-5 py-3 border-b border-sky-500/30 flex items-center justify-between bg-[#0c1422] shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-950/90 border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.25)] flex items-center justify-center overflow-hidden p-1 shrink-0">
              <img
                src={projectIcon}
                alt={projectTitle}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                  {projectTitle}
                </h2>
              </div>
            </div>
          </div>

          {/* Top Actions: Load Kit & Pack Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Load 16-Sound Kit Button */}
            <button
              type="button"
              onClick={handleBakeFullKit}
              className="h-7 px-2.5 text-xs font-mono font-bold rounded-lg cursor-pointer bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 transition-colors shadow-sm"
              title={`Load 16 authentic ${currentSystemInfo.name} sound presets into tracker slots 00-15`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Load 16 Kit</span>
            </button>

            {/* Sound Pack Tools */}
            <button
              type="button"
              onClick={handleOpenSavePack}
              className="h-7 px-2 text-xs font-mono font-semibold rounded-lg cursor-pointer bg-[#0e1626] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors"
              title="Save soundbank pack"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Save Pack</span>
            </button>

            <button
              type="button"
              onClick={() => packFileInputRef.current?.click()}
              className="h-7 px-2 text-xs font-mono font-semibold rounded-lg cursor-pointer bg-[#0e1626] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors"
              title="Load soundbank pack"
            >
              <FolderDown className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Load Pack</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg cursor-pointer bg-[#0e1626] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 flex items-center justify-center transition-colors ml-1"
              title="Close Editor (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 3-Column Studio Body */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#090d16]">
          {/* ========================================================================= */}
          {/* 1. COMMODORE 64 SID SYNTHESIZER INTERFACE                                  */}
          {/* ========================================================================= */}
          {activeSystem === 'c64' && (
            <>
              {/* COLUMN 1: Oscillator, Oscilloscope & Waveform Selection */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Activity className="w-3.5 h-3.5" />
                    <span>SID Oscillator</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Waveform & PWM</span>
                </div>

                {/* Real-time Oscilloscope Monitor */}
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#060a12] h-24 shrink-0 flex items-center justify-center">
                  <canvas
                    ref={oscCanvasRef}
                    width={340}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-black/70 border border-sky-500/30 uppercase">
                    {config.waveform} {config.waveform === 'pulse' ? `(${Math.round((config.pulseWidth / 4095) * 100)}%)` : ''}
                  </div>
                </div>

                {/* Waveform Selector Buttons */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Waveform Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['pulse', 'saw', 'triangle', 'noise', 'pulsesaw', 'pulsetri'] as SidWaveformType[]).map((wf) => {
                      const isActive = config.waveform === wf;
                      const label = wf === 'pulse' ? 'Pulse (PWM)' 
                        : wf === 'saw' ? 'Saw' 
                        : wf === 'triangle' ? 'Triangle' 
                        : wf === 'noise' ? 'Noise' 
                        : wf === 'pulsesaw' ? 'Pulse+Saw' 
                        : 'Pulse+Tri';
                      return (
                        <button
                          key={wf}
                          type="button"
                          onClick={() => updateConfig({ waveform: wf })}
                          className={`h-7 text-xs font-mono font-semibold rounded-lg cursor-pointer transition-colors border ${
                            isActive
                              ? 'bg-sky-500 text-black border-sky-400 shadow-sm'
                              : 'bg-[#080d16] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pulse Width & PWM Speed Modulation Controls */}
                <div className="space-y-2.5 p-2.5 rounded-lg bg-[#080d16] border border-slate-800">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pulse Width (0-4095)</span>
                    <span className="text-sky-400 font-bold">{config.pulseWidth} ({Math.round((config.pulseWidth / 4095) * 100)}%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4095"
                    step="16"
                    value={config.pulseWidth}
                    onChange={(e) => updateConfig({ pulseWidth: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>PWM Rate</span>
                        <span className="text-sky-400 font-bold">{config.pwmSpeed.toFixed(1)} Hz</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.2"
                        value={config.pwmSpeed}
                        onChange={(e) => updateConfig({ pwmSpeed: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>PWM Depth</span>
                        <span className="text-sky-400 font-bold">{config.pwmDepth}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2048"
                        step="16"
                        value={config.pwmDepth}
                        onChange={(e) => updateConfig({ pwmDepth: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Hardware 8580 Character Info */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#080d16] border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold text-slate-300">MOS 8580 DAC Emulation</span>
                    <span className="text-[10px] text-slate-500 font-mono">16-bit high dynamic range analog simulation</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* COLUMN 2: 12dB Resonant Analog Filter & Hardware ADSR Envelope */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Filter & Envelope</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">12dB Resonant + ADSR</span>
                </div>

                {/* 12dB Multi-Mode Filter Section */}
                <div className="space-y-2.5 p-3 rounded-xl bg-[#080d16] border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.filterEnabled}
                        onChange={(e) => updateConfig({ filterEnabled: e.target.checked })}
                        className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-slate-200">12dB Multi-Mode Filter</span>
                    </label>
                    <span className="text-[10px] font-mono text-sky-400 uppercase font-bold px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/30">
                      {config.filterEnabled ? `${config.filterType.toUpperCase()} MODE` : 'BYPASSED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {(['lowpass', 'bandpass', 'highpass', 'notch'] as SidFilterType[]).map((fType) => (
                      <button
                        key={fType}
                        type="button"
                        onClick={() => updateConfig({ filterType: fType, filterEnabled: true })}
                        className={`h-7 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors border uppercase ${
                          config.filterEnabled && config.filterType === fType
                            ? 'bg-sky-500 text-black border-sky-400 shadow-sm'
                            : 'bg-[#0b1120] text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {fType === 'lowpass' ? 'Lowpass' : fType === 'bandpass' ? 'Bandpass' : fType === 'highpass' ? 'Highpass' : 'Notch'}
                      </button>
                    ))}
                  </div>

                  {/* Cutoff & Resonance */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Cutoff Frequency</span>
                        <span className="text-sky-400 font-bold">{config.filterCutoff}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2047"
                        step="8"
                        value={config.filterCutoff}
                        onChange={(e) => updateConfig({ filterCutoff: parseInt(e.target.value, 10) })}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Resonance (Q)</span>
                        <span className="text-sky-400 font-bold">{config.filterResonance}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="1"
                        value={config.filterResonance}
                        onChange={(e) => updateConfig({ filterResonance: parseInt(e.target.value, 10) })}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Authentic SID 4-Bit ADSR Hardware Envelope - Spacious & Non-Abbreviated */}
                <div className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                        Hardware ADSR Envelope
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">(4-Bit DAC)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400">Register:</span>
                      <span className="text-xs font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 tracking-wider">
                        ${config.attack.toString(16).toUpperCase()}
                        {config.decay.toString(16).toUpperCase()}
                        {config.sustain.toString(16).toUpperCase()}
                        {config.release.toString(16).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 flex-1">
                    {/* Attack */}
                    <div className="flex flex-col items-center justify-between bg-[#0b1120] p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-center w-full">
                        <span className="text-[11px] font-mono font-bold text-slate-200 block tracking-wider">ATTACK</span>
                        <span className="text-[10px] font-mono text-sky-400 font-semibold block mt-0.5">
                          {SID_ATTACK_TIMES_MS[config.attack]} ms
                        </span>
                      </div>
                      <div className="h-44 flex items-center justify-center my-2">
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={config.attack}
                          onChange={(e) => updateConfig({ attack: parseInt(e.target.value, 10) })}
                          className="w-40 h-2 -rotate-90 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 shadow-inner"
                        />
                      </div>
                      <div className="w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 font-mono">
                        <span className="text-sm font-bold text-sky-300">{config.attack}</span>
                        <span className="text-[10px] text-slate-500">(${(config.attack).toString(16).toUpperCase()})</span>
                      </div>
                    </div>

                    {/* Decay */}
                    <div className="flex flex-col items-center justify-between bg-[#0b1120] p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-center w-full">
                        <span className="text-[11px] font-mono font-bold text-slate-200 block tracking-wider">DECAY</span>
                        <span className="text-[10px] font-mono text-sky-400 font-semibold block mt-0.5">
                          {SID_DECAY_RELEASE_TIMES_MS[config.decay]} ms
                        </span>
                      </div>
                      <div className="h-44 flex items-center justify-center my-2">
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={config.decay}
                          onChange={(e) => updateConfig({ decay: parseInt(e.target.value, 10) })}
                          className="w-40 h-2 -rotate-90 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 shadow-inner"
                        />
                      </div>
                      <div className="w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 font-mono">
                        <span className="text-sm font-bold text-sky-300">{config.decay}</span>
                        <span className="text-[10px] text-slate-500">(${(config.decay).toString(16).toUpperCase()})</span>
                      </div>
                    </div>

                    {/* Sustain */}
                    <div className="flex flex-col items-center justify-between bg-[#0b1120] p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-center w-full">
                        <span className="text-[11px] font-mono font-bold text-slate-200 block tracking-wider">SUSTAIN</span>
                        <span className="text-[10px] font-mono text-sky-400 font-semibold block mt-0.5">
                          {Math.round((config.sustain / 15) * 100)}%
                        </span>
                      </div>
                      <div className="h-44 flex items-center justify-center my-2">
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={config.sustain}
                          onChange={(e) => updateConfig({ sustain: parseInt(e.target.value, 10) })}
                          className="w-40 h-2 -rotate-90 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 shadow-inner"
                        />
                      </div>
                      <div className="w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 font-mono">
                        <span className="text-sm font-bold text-sky-300">{config.sustain}</span>
                        <span className="text-[10px] text-slate-500">(${(config.sustain).toString(16).toUpperCase()})</span>
                      </div>
                    </div>

                    {/* Release */}
                    <div className="flex flex-col items-center justify-between bg-[#0b1120] p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-center w-full">
                        <span className="text-[11px] font-mono font-bold text-slate-200 block tracking-wider">RELEASE</span>
                        <span className="text-[10px] font-mono text-sky-400 font-semibold block mt-0.5">
                          {SID_DECAY_RELEASE_TIMES_MS[config.release]} ms
                        </span>
                      </div>
                      <div className="h-44 flex items-center justify-center my-2">
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={config.release}
                          onChange={(e) => updateConfig({ release: parseInt(e.target.value, 10) })}
                          className="w-40 h-2 -rotate-90 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 shadow-inner"
                        />
                      </div>
                      <div className="w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 font-mono">
                        <span className="text-sm font-bold text-sky-300">{config.release}</span>
                        <span className="text-[10px] text-slate-500">(${(config.release).toString(16).toUpperCase()})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. NINTENDO GAME BOY DMG-01 APU SOUND INTERFACE                           */}
          {/* ========================================================================= */}
          {activeSystem === 'gameboy' && (
            <>
              {/* COLUMN 1: DMG Channels & Hardware Sweep */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Activity className="w-3.5 h-3.5" />
                    <span>DMG-01 APU Channel</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">LR35902 Co-Proc</span>
                </div>

                {/* Real-time Oscilloscope Monitor */}
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#060a12] h-24 shrink-0 flex items-center justify-center">
                  <canvas
                    ref={oscCanvasRef}
                    width={340}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-black/70 border border-sky-500/30 uppercase">
                    Game Boy APU (Duty: {Math.round(gbDuty * 100)}%)
                  </div>
                </div>

                {/* Pulse Duty Cycle Selector */}
                <div className="space-y-1 p-2.5 rounded-lg bg-[#080d16] border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Pulse Duty Cycle (Ch 1 / Ch 2)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([0.125, 0.25, 0.5, 0.75] as const).map((duty) => (
                      <button
                        key={duty}
                        type="button"
                        onClick={() => {
                          setGbDuty(duty);
                          handlePreview(testNote);
                        }}
                        className={`h-7 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors border ${
                          gbDuty === duty
                            ? 'bg-sky-500 text-black border-sky-400'
                            : 'bg-[#0b1120] text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        {Math.round(duty * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel 1 Pitch Sweep Unit */}
                <div className="space-y-2 p-2.5 rounded-lg bg-[#080d16] border border-slate-800">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ch 1 Pitch Sweep Unit
                    </span>
                    <span className="text-sky-400 font-bold text-[10px]">
                      Time: {gbSweepTime} | {gbSweepDir.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Sweep Time</span>
                        <span className="text-sky-400">{gbSweepTime}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={gbSweepTime}
                        onChange={(e) => setGbSweepTime(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setGbSweepDir('down')}
                          className={`h-6 text-[10px] font-mono font-bold rounded cursor-pointer border ${
                            gbSweepDir === 'down'
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/60'
                              : 'bg-[#0b1120] text-slate-400 border-slate-800'
                          }`}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => setGbSweepDir('up')}
                          className={`h-6 text-[10px] font-mono font-bold rounded cursor-pointer border ${
                            gbSweepDir === 'up'
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/60'
                              : 'bg-[#0b1120] text-slate-400 border-slate-800'
                          }`}
                        >
                          Up
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Channel 4 LFSR Drum Noise */}
                <div className="p-2.5 rounded-lg bg-[#080d16] border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Channel 4 LFSR Noise Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGbNoiseMode('7bit')}
                      className={`p-2 rounded-lg text-left cursor-pointer border ${
                        gbNoiseMode === '7bit'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/60'
                          : 'bg-[#0b1120] text-slate-400 border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">7-Bit Periodic</div>
                      <div className="text-[9px] text-slate-500 font-mono">Metallic hats & cymbals</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGbNoiseMode('15bit')}
                      className={`p-2 rounded-lg text-left cursor-pointer border ${
                        gbNoiseMode === '15bit'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/60'
                          : 'bg-[#0b1120] text-slate-400 border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">15-Bit White</div>
                      <div className="text-[9px] text-slate-500 font-mono">Snares & explosions</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: Game Boy Wave RAM & Envelope Generator */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Wave RAM & Envelope</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Ch 3 Wave + Env</span>
                </div>

                {/* 4-Bit 32-Sample Wave RAM Custom Channel */}
                <div className="space-y-2 p-3 rounded-xl bg-[#080d16] border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-slate-200">Channel 3: 4-Bit Wave RAM</span>
                    <span className="text-[10px] font-mono text-sky-400 uppercase font-bold px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/30">
                      32 Nibbles
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                    Custom 4-bit wavetable synthesis used for Pokémon cry sounds, basslines, and lo-fi digital vocals.
                  </p>

                  {/* Preset Wave RAM Shapes */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[
                      { name: 'Square', desc: '50% Pulse' },
                      { name: 'Sawtooth', desc: 'Bright Saw' },
                      { name: 'Triangle', desc: 'Deep Bass' },
                      { name: 'Digivox', desc: 'Vocaloid' },
                    ].map((w, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePreview(testNote)}
                        className="h-8 p-1 text-[10px] font-mono font-bold rounded-lg cursor-pointer bg-[#0b1120] text-slate-300 border border-slate-800 hover:border-sky-500/60 hover:text-sky-300 text-center flex flex-col justify-center items-center"
                      >
                        <span>{w.name}</span>
                        <span className="text-[8px] text-slate-500 font-normal">{w.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Game Boy Hardware Volume Envelope */}
                <div className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                        Hardware Volume Envelope
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40">
                      Auto-Step Decay
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Initial Volume (0 - 15)</span>
                        <span className="text-sky-400 font-bold">15 / 15</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        defaultValue="15"
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Envelope Sweep Speed</span>
                        <span className="text-sky-400 font-bold">Medium (3)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="7"
                        defaultValue="3"
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* 3. NES / FAMICOM RICOH 2A03 APU SOUND INTERFACE                          */}
          {/* ========================================================================= */}
          {activeSystem === 'nes' && (
            <>
              {/* COLUMN 1: Ricoh 2A03 Channels & Stepped Triangle */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Ricoh 2A03 Channels</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">5-Channel APU</span>
                </div>

                {/* Real-time Oscilloscope Monitor */}
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#060a12] h-24 shrink-0 flex items-center justify-center">
                  <canvas
                    ref={oscCanvasRef}
                    width={340}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-black/70 border border-sky-500/30 uppercase">
                    NES 2A03 APU (16-Step Stepped DAC)
                  </div>
                </div>

                {/* Pulse Duty Cycle */}
                <div className="space-y-1 p-2.5 rounded-lg bg-[#080d16] border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    2A03 Pulse Duty (12.5% / 25% / 50% / 75%)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([0.125, 0.25, 0.5, 0.75] as const).map((duty) => (
                      <button
                        key={duty}
                        type="button"
                        onClick={() => {
                          setNesDuty(duty);
                          handlePreview(testNote);
                        }}
                        className={`h-7 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors border ${
                          nesDuty === duty
                            ? 'bg-sky-500 text-black border-sky-400'
                            : 'bg-[#0b1120] text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        {Math.round(duty * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 16-Step Stepped Triangle Bass DAC */}
                <div className="p-2.5 rounded-lg bg-[#080d16] border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Stepped Triangle Channel (No Filter)
                    </span>
                    <span className="text-sky-400 font-mono font-bold text-[10px]">16-STEP DAC</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                    Generates the un-antialiased stepped staircase wave that gives Castlevania and Mario basslines their distinct punch.
                  </p>
                </div>

                {/* 93-Step Short Loop Noise (Metallic Drums) */}
                <div className="p-2.5 rounded-lg bg-[#080d16] border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Periodic Metallic Noise (93-Step Mode)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNesNoiseLoop('93step')}
                      className={`p-2 rounded-lg text-left cursor-pointer border ${
                        nesNoiseLoop === '93step'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/60'
                          : 'bg-[#0b1120] text-slate-400 border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">93-Step Loop</div>
                      <div className="text-[9px] text-slate-500 font-mono">Crisp metallic hit</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNesNoiseLoop('32767step')}
                      className={`p-2 rounded-lg text-left cursor-pointer border ${
                        nesNoiseLoop === '32767step'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/60'
                          : 'bg-[#0b1120] text-slate-400 border-slate-800'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold">32767-Step</div>
                      <div className="text-[9px] text-slate-500 font-mono">White noise / booms</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: NES Length Counter & Sweep Control */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Counters & Pitch Sweep</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">2A03 Frame Sequencer</span>
                </div>

                {/* Length Counter & Linear Counter */}
                <div className="space-y-2.5 p-3 rounded-xl bg-[#080d16] border border-slate-800">
                  <span className="text-xs font-mono font-bold text-slate-200 block">
                    Length Counter & Frame Sequencer
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                    Clocked at 240Hz / 192Hz for hardware note cuts, gated chiptune arpeggios, and percussive plucks.
                  </p>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {['Unlimited', '1/16 Gate', '1/32 Pluck'].map((mode, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePreview(testNote)}
                        className={`h-7 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors border ${
                          idx === 0
                            ? 'bg-sky-500 text-black border-sky-400'
                            : 'bg-[#0b1120] text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DPCM Delta Modulation Channel */}
                <div className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      DPCM 1-Bit Delta Sampler
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40">
                      33.1 kHz Max
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Sample Rate Frequency (0-15)</span>
                        <span className="text-sky-400 font-bold">15 (33.1 kHz)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        defaultValue="15"
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>Direct 7-Bit DAC Level</span>
                        <span className="text-sky-400 font-bold">64 / 127</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        defaultValue="64"
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* 4. SEGA MEGA DRIVE YAMAHA YM2612 4-OP FM INTERFACE                       */}
          {/* ========================================================================= */}
          {activeSystem === 'megadrive' && (
            <>
              {/* COLUMN 1: YM2612 4-Op FM Algorithms & Operator Matrix */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Activity className="w-3.5 h-3.5" />
                    <span>YM2612 4-Op FM Engine</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Yamaha FM + PSG</span>
                </div>

                {/* Real-time Oscilloscope Monitor */}
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#060a12] h-24 shrink-0 flex items-center justify-center">
                  <canvas
                    ref={oscCanvasRef}
                    width={340}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-black/70 border border-sky-500/30 uppercase">
                    Yamaha YM2612 (Algorithm {mdAlgorithm})
                  </div>
                </div>

                {/* FM Algorithm Selector (0 to 7) */}
                <div className="space-y-1 p-2.5 rounded-lg bg-[#080d16] border border-slate-800">
                  <div className="flex justify-between items-center text-xs font-mono mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      FM Algorithm (0 - 7)
                    </span>
                    <span className="text-sky-400 font-bold">ALG {mdAlgorithm}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((alg) => (
                      <button
                        key={alg}
                        type="button"
                        onClick={() => {
                          setMdAlgorithm(alg);
                          handlePreview(testNote);
                        }}
                        className={`h-6 text-[10px] font-mono font-bold rounded cursor-pointer border ${
                          mdAlgorithm === alg
                            ? 'bg-sky-500 text-black border-sky-400'
                            : 'bg-[#0b1120] text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        ALG {alg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operator 1 Feedback */}
                <div className="p-2.5 rounded-lg bg-[#080d16] border border-slate-800 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Op 1 Feedback Loop</span>
                    <span className="text-sky-400 font-bold">{mdFeedback} / 7</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="7"
                    step="1"
                    value={mdFeedback}
                    onChange={(e) => setMdFeedback(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>

                {/* 4 Operators Multipliers */}
                <div className="p-2.5 rounded-lg bg-[#080d16] border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    4-Operator Multiplier Ratios
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {mdOpMultipliers.map((mult, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-[#0b1120] border border-slate-800 font-mono">
                        <div className="text-[9px] text-slate-500">OP {idx + 1}</div>
                        <div className="text-xs font-bold text-sky-400">{mult}x</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COLUMN 2: YM2612 Operator Parameters & Envelopes */}
              <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Operator Envelopes</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">4-Op FM Modulation</span>
                </div>

                {/* Total Level (TL) & Detune */}
                <div className="space-y-2.5 p-3 rounded-xl bg-[#080d16] border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-slate-200">FM Operator Detune (DT)</span>
                    <span className="text-[10px] font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/30">
                      YM2612 Matrix
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
                    {[1, 2, 3, 4].map((op) => (
                      <div key={op} className="p-2 rounded-lg bg-[#0b1120] border border-slate-800">
                        <span className="text-[9px] text-slate-400 block">OP {op} TL</span>
                        <span className="text-xs font-bold text-sky-300">{op === 4 ? '0 dB' : `${(op * 6)} dB`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* YM2612 Hardware DAC Distortion & Ladder */}
                <div className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      DAC Crossover Distortion
                    </span>
                    <span className="text-[10px] font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/40">
                      Genesis 9-Bit DAC
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>DAC Ladder Harmonic Saturation</span>
                        <span className="text-sky-400 font-bold">Authentic YM2612</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        defaultValue="8"
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* COLUMN 3 (COMMON TO ALL SYSTEMS): Target Slot, Presets & Save              */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800/90 shadow-sm justify-between">
            <div className="space-y-2.5 overflow-hidden flex flex-col flex-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
                  <Save className="w-3.5 h-3.5" />
                  <span>Target Slot & Library</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Slot {targetSlot.toString().padStart(2, '0')}</span>
              </div>

              {/* Target Instrument Slot & Name */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-[#080d16] border border-slate-800">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  <span>Save to Tracker Slot</span>
                  <span className="text-sky-400 font-bold">Slot {targetSlot.toString().padStart(2, '0')}</span>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={instrumentName}
                    onChange={(e) => setInstrumentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        (e.target as HTMLElement).blur();
                      }
                    }}
                    placeholder="Instrument Name"
                    className="w-full h-8 px-2.5 bg-[#0b1120] border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  />

                  {/* Dynamic Tracker Slots Grid Selector (16 or 32 slots) */}
                  <div className={`grid grid-cols-8 gap-1 pt-0.5 ${samples.length > 16 ? 'max-h-[85px] overflow-y-auto custom-scrollbar pr-0.5' : ''}`}>
                    {Array.from({ length: samples.length }).map((_, idx) => {
                      const sample = samples[idx];
                      const isTarget = targetSlot === idx;
                      const hasSound = Boolean(sample?.buffer || sample?.name || sample?.sidConfig);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSlotChange(idx)}
                          className={`h-7 text-[10px] font-mono font-bold rounded cursor-pointer transition-all border flex items-center justify-center relative ${
                            isTarget
                              ? 'bg-sky-500 text-black border-sky-400 shadow-sm font-extrabold z-10 scale-[1.02]'
                              : hasSound
                              ? 'bg-[#0e1626] text-sky-200 border-sky-500/30 hover:border-sky-400 hover:text-white'
                              : 'bg-[#05080f] text-slate-600 border-slate-800 hover:text-slate-400'
                          }`}
                          title={`Slot ${idx.toString().padStart(2, '0')}: ${sample?.name || 'Empty'}`}
                        >
                          <span>{idx.toString().padStart(2, '0')}</span>
                          {hasSound && !isTarget && (
                            <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-sky-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {activeSystem === 'c64' && (
                <div className="grid grid-cols-2 gap-2">
                  {/* Special SID Modulations */}
                  <div className="p-2 rounded-lg bg-[#080d16] border border-slate-800 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                      Modulation
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      <label className="flex items-center justify-between p-1 rounded bg-[#0b1120] border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                        <span className="text-[10px] font-mono text-slate-300">Sync</span>
                        <input
                          type="checkbox"
                          checked={config.hardSync}
                          onChange={(e) => updateConfig({ hardSync: e.target.checked })}
                          className="w-3 h-3 accent-sky-400 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-1 rounded bg-[#0b1120] border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                        <span className="text-[10px] font-mono text-slate-300">Ring</span>
                        <input
                          type="checkbox"
                          checked={config.ringMod}
                          onChange={(e) => updateConfig({ ringMod: e.target.checked })}
                          className="w-3 h-3 accent-sky-400 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Arpeggio Chord Macros */}
                  <div className="p-2 rounded-lg bg-[#080d16] border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Arp</span>
                      <span className="text-sky-400 font-bold">
                        {config.arpMacro ? `[${config.arpMacro.length}]` : 'Off'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-0.5">
                      {[
                        { label: 'Off', macro: undefined },
                        { label: 'Min7', macro: [0, 3, 7, 10] },
                        { label: 'Maj9', macro: [0, 4, 7, 11, 14] },
                        { label: '5th', macro: [0, 7, 12] },
                        { label: 'Sus4', macro: [0, 5, 7, 12] },
                        { label: 'Oct', macro: [0, 12, 24] },
                      ].map((item, idx) => {
                        const isActive = JSON.stringify(config.arpMacro) === JSON.stringify(item.macro);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => updateConfig({ arpMacro: item.macro, arpSpeed: 2 })}
                            className={`h-5 text-[9px] font-mono font-semibold rounded cursor-pointer transition-colors border ${
                              isActive
                                ? 'bg-sky-500/20 text-sky-400 border-sky-500/70'
                                : 'bg-[#0b1120] text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sound Preset Library (Under the instrument slots) */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-[#080d16] border border-slate-800 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono shrink-0">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{currentSystemInfo.name} Sound Library</span>
                  </span>
                  <span className="text-slate-500 font-normal">
                    ({activeSystem === 'c64' ? SID_PRESET_LIBRARY.length : chipPresetsForActiveSys.length} Sounds)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[140px] max-h-[220px]">
                  {activeSystem === 'c64' ? (
                    SID_PRESET_LIBRARY.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`p-2 rounded-lg text-left cursor-pointer transition-all border flex flex-col justify-between ${
                            isSelected
                              ? 'border-sky-500/80 bg-sky-500/15 text-sky-300 shadow-sm'
                              : 'bg-[#0b1120] text-slate-300 border-slate-800/80 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full gap-1">
                            <span className="text-[10px] font-mono font-bold truncate leading-tight">{preset.name}</span>
                            <Volume2 className={`w-2.5 h-2.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-600'}`} />
                          </div>
                          <span className="text-[8.5px] font-mono text-slate-500 line-clamp-1 mt-0.5">
                            [{preset.category}] Base: {preset.baseNote}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    chipPresetsForActiveSys.map((preset) => {
                      const isSelected = selectedChipPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyChipPreset(preset)}
                          className={`p-2 rounded-lg text-left cursor-pointer transition-all border flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'border-sky-500/80 bg-sky-500/15 text-sky-300 shadow-sm'
                              : 'bg-[#0b1120] text-slate-300 border-slate-800/80 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full gap-1">
                            <span className="text-[10px] font-mono font-bold truncate">{preset.name}</span>
                            <Volume2 className={`w-2.5 h-2.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                          </div>
                          <span className="text-[8.5px] font-mono text-slate-500 line-clamp-1">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: Audition and Save in Slot */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => handlePreview(testNote)}
                className="h-9 px-2 sm:px-3 text-[11px] sm:text-xs font-mono font-bold rounded-lg cursor-pointer bg-[#0e1626] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap min-w-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="whitespace-nowrap">Audition Note</span>
              </button>

              <button
                type="button"
                onClick={() => handleBakeToSlot(targetSlot)}
                className="h-9 px-2 sm:px-3 text-[11px] sm:text-xs font-mono font-extrabold rounded-lg cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400 flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap min-w-0"
              >
                <Save className="w-3.5 h-3.5 shrink-0 text-black" />
                <span className="whitespace-nowrap">Save in Slot {targetSlot.toString().padStart(2, '0')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom 2-Octave Audition Keyboard Strip */}
        <div className="px-5 py-2.5 bg-[#080d16] border-t border-slate-800 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>Audition Keyboard</span>
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                (Play with your computer keyboard or click the piano keys)
              </span>
              {isMidiConnected ? (
                <span className="text-[10px] text-sky-400 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  MIDI Connected
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                  MIDI Standby
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Keyboard Layout Selector */}
              <div className="flex items-center gap-1 p-0.5 bg-[#05080f] rounded-lg border border-slate-800">
                {(['QWERTZ', 'QWERTY', 'AZERTY', 'AUTO'] as KeyboardLayout[]).map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => handleLayoutSelect(layout)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${
                      currentLayout === layout
                        ? 'bg-sky-500 text-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {layout}
                  </button>
                ))}
              </div>

              {/* Octave Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveOctave((o) => Math.max(1, o - 1))}
                  className="w-6 h-6 rounded bg-[#0e1626] hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                  title="Lower Octave (-)"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold text-sky-400 min-w-[75px] text-center">
                  Octave {activeOctave} (C-{activeOctave} to C-{activeOctave + 2})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveOctave((o) => Math.min(6, o + 1))}
                  className="w-6 h-6 rounded bg-[#0e1626] hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                  title="Higher Octave (+)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Visual 2-Octave Piano Keys */}
          <div className="relative flex items-stretch h-16 w-full select-none overflow-x-auto custom-scrollbar pt-1 pb-0.5">
            {Array.from({ length: 15 }).map((_, whiteIdx) => {
              const whiteKeyNoteOffsets = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
              const noteOffset = whiteKeyNoteOffsets[whiteIdx];
              const baseMidi = 12 * (activeOctave + 1);
              const midiNote = baseMidi + noteOffset;
              const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
              const noteName = `${noteNames[midiNote % 12]}-${Math.floor(midiNote / 12) - 1}`;
              const isPlaying = activePlayingNote === midiNote;

              // Computer keyboard hint
              const keyHints: Record<KeyboardLayout, string[]> = {
                QWERTZ: ['Y', 'X', 'C', 'V', 'B', 'N', 'M', 'Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I'],
                QWERTY: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I'],
                AZERTY: ['W', 'X', 'C', 'V', 'B', 'N', ',', 'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I'],
                AUTO: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I'],
              };
              const keyHint = keyHints[currentLayout]?.[whiteIdx] || '';

              return (
                <div
                  key={`white-${whiteIdx}`}
                  onClick={() => handlePreview(midiNote)}
                  className={`flex-1 min-w-[28px] border-r border-b border-slate-300 rounded-b flex flex-col justify-between items-center pb-1 pt-0.5 cursor-pointer transition-colors shadow-sm ${
                    isPlaying ? 'bg-sky-300 text-black' : 'bg-slate-100 hover:bg-white text-slate-800'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold opacity-60">{keyHint}</span>
                  <span className="text-[9px] font-mono font-bold">{noteName}</span>
                </div>
              );
            })}

            {/* Black Keys Overlay */}
            {[
              { pos: 0, offset: 1, hint: 'S' },
              { pos: 1, offset: 3, hint: 'D' },
              { pos: 3, offset: 6, hint: 'G' },
              { pos: 4, offset: 8, hint: 'H' },
              { pos: 5, offset: 10, hint: 'J' },
              { pos: 7, offset: 13, hint: '2' },
              { pos: 8, offset: 15, hint: '3' },
              { pos: 10, offset: 18, hint: '5' },
              { pos: 11, offset: 20, hint: '6' },
              { pos: 12, offset: 22, hint: '7' },
            ].map((blackKey, bIdx) => {
              const baseMidi = 12 * (activeOctave + 1);
              const midiNote = baseMidi + blackKey.offset;
              const isPlaying = activePlayingNote === midiNote;
              const leftPercent = ((blackKey.pos + 0.65) / 15) * 100;

              return (
                <div
                  key={`black-${bIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(midiNote);
                  }}
                  style={{ left: `${leftPercent}%` }}
                  className={`absolute top-0 w-[4.5%] h-10 rounded-b z-10 flex flex-col items-center justify-end pb-1 cursor-pointer transition-colors shadow-md border border-slate-900 ${
                    isPlaying ? 'bg-sky-500 text-black' : 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-400'
                  }`}
                >
                  <span className="text-[8px] font-mono font-bold">{blackKey.hint}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved Success Toast PopUp (Bottom-Right, matching Backup PopUp design) */}
        <AnimatePresence>
          {bakedSuccessToast && (
            <motion.div
              key="save-success-toast"
              initial={{ y: 120, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ 
                y: 120, 
                opacity: 0, 
                scale: 0.92,
                transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] } 
              }}
              transition={{ 
                type: 'spring',
                damping: 22,
                stiffness: 260,
                mass: 0.8
              }}
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[300] w-[calc(100vw-2rem)] sm:w-[360px] max-w-sm pointer-events-auto select-none"
            >
              {/* 3x Attention Glowing Aura */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.85, 0.15, 0.85, 0.15, 0.85, 0],
                  scale: [0.98, 1.03, 1.0, 1.03, 1.0, 1.03, 1.0]
                }}
                transition={{ duration: 2.0, times: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1], ease: 'easeInOut' }}
                className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400 opacity-60 blur-md pointer-events-none"
              />

              <div className="relative overflow-hidden rounded-xl border border-emerald-500/50 bg-[#0b1322]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(16,185,129,0.25)] p-3.5 text-white">
                {/* Top Glowing Gradient Line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-90" />

                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* 3x Blinking Ping Dot */}
                    <motion.span 
                      animate={{ scale: [1, 1.5, 1, 1.5, 1, 1.5, 1] }}
                      transition={{ duration: 1.8, times: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1] }}
                      className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 shadow-[0_0_10px_#34d399]" 
                    />
                    <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 truncate font-mono flex items-center gap-1">
                      <Save className="w-3 h-3 text-emerald-400" />
                      {bakedSuccessToast.title || 'Instrument Saved'}
                    </span>
                    {bakedSuccessToast.slot !== undefined && (
                      <span className="text-[10px] text-sky-300 font-mono font-bold px-1.5 py-0.2 bg-sky-950/80 rounded border border-sky-500/40">
                        Slot {bakedSuccessToast.slot.toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setBakedSuccessToast(null)}
                    className="p-1 -mr-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded transition-colors cursor-pointer"
                    title="Schließen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content Body */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0e1726] border border-emerald-500/40 flex items-center justify-center shrink-0 p-1 shadow-inner">
                    <img 
                      src={bakedSuccessToast.chipIcon || currentSystemInfo.icon} 
                      alt={bakedSuccessToast.chipLabel || currentSystemInfo.name}
                      className="w-full h-full object-contain filter drop-shadow"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-100 truncate font-mono">
                      "{bakedSuccessToast.message}"
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate font-mono">
                      <span className="text-emerald-400 font-semibold">{bakedSuccessToast.chipLabel}</span>
                      <span>•</span>
                      <span className="text-slate-400">{bakedSuccessToast.subtext}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>

        {/* Save Pack Modal Sub-Dialog */}
        {isSavePackModalOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsSavePackModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-xl p-5 shadow-2xl space-y-4 text-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Save {currentSystemInfo.name} Soundbank
                </h3>
                <button
                  onClick={() => setIsSavePackModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Pack Name</label>
                  <input
                    type="text"
                    value={packNameInput}
                    onChange={(e) => setPackNameInput(e.target.value)}
                    placeholder="e.g. MyRetroPack"
                    className="w-full h-8 px-2.5 bg-[#0b1120] border border-slate-700 rounded text-xs font-mono text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                  {packNameError && (
                    <span className="text-[10px] text-rose-400 font-mono mt-1 block">{packNameError}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Author</label>
                  <input
                    type="text"
                    value={packAuthorInput}
                    onChange={(e) => setPackAuthorInput(e.target.value)}
                    placeholder="Your Name / Handle"
                    className="w-full h-8 px-2.5 bg-[#0b1120] border border-slate-700 rounded text-xs font-mono text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Description</label>
                  <input
                    type="text"
                    value={packDescInput}
                    onChange={(e) => setPackDescInput(e.target.value)}
                    placeholder="Soundbank description"
                    className="w-full h-8 px-2.5 bg-[#0b1120] border border-slate-700 rounded text-xs font-mono text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSavePackModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono font-semibold rounded bg-[#080d16] hover:bg-slate-800 text-slate-300 border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSavePack}
                  className="px-4 py-1.5 text-xs font-mono font-bold rounded bg-sky-500 hover:bg-sky-400 text-black border border-sky-400 shadow-sm"
                >
                  Save & Download
                </button>
              </div>
            </div>
          </div>
        )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
