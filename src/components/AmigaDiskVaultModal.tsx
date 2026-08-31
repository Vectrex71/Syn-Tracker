/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Disc, 
  Search, 
  Play, 
  Square, 
  Download, 
  Layers, 
  Check, 
  Volume2, 
  X, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Keyboard,
  Sliders,
  Music,
  HardDrive,
  Save
} from 'lucide-react';
import { TrackerSample, KeyboardLayout } from '../types';
import { saveSampleData } from '../lib/indexedDB';
import { arrayBufferToBase64 } from '../utils/modFormat';
import { decodeAudioBufferSafe } from '../utils/audioDecoder';

// Colorful Amiga 3.5" Floppy Disk PNG images
const DISK_COLOR_IMAGES = [
  '/Disk_Blue.png',
  '/Disk_Rot.png',
  '/Disk_Gruen.png',
  '/Disk_Lila.png',
  '/Disk_Turk.png',
  '/Disk_Braun.png',
  '/Disk_Beige.png',
];

// Deterministic pseudo-random floppy color distribution per disk
export const getFloppyDiskImage = (diskId: string, index?: number): string => {
  if (typeof index === 'number') {
    return DISK_COLOR_IMAGES[index % DISK_COLOR_IMAGES.length];
  }
  const numMatch = diskId.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    return DISK_COLOR_IMAGES[(num - 1 + DISK_COLOR_IMAGES.length) % DISK_COLOR_IMAGES.length];
  }
  let hash = 0;
  for (let i = 0; i < diskId.length; i++) {
    hash = (hash * 31 + diskId.charCodeAt(i)) % DISK_COLOR_IMAGES.length;
  }
  return DISK_COLOR_IMAGES[Math.abs(hash) % DISK_COLOR_IMAGES.length];
};

interface STDiskInfo {
  id: string;
  name: string;
  count: number;
  samples: string[];
}

interface AmigaDiskVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples?: TrackerSample[];
  selectedSlotIndex: number;
  totalSlots: number;
  audioCtx: AudioContext | null;
  keyboardLayout?: KeyboardLayout;
  onSelectSample?: (index: number) => void;
  onLoadSampleToSlot: (slotIndex: number, sample: TrackerSample) => void;
  onBatchLoadSamples?: (startIndex: number, samples: TrackerSample[]) => void;
  onPlayPreview?: (midiNote: number, sample: TrackerSample) => void;
}

// Piano mappings per keyboard layout for Live Audition (matching SidSynthModal)
const PIANO_MAPS: Record<KeyboardLayout, { lower: Record<string, number>; upper: Record<string, number> }> = {
  QWERTZ: {
    lower: {
      y: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11, ',': 12,
    },
    upper: {
      q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20, z: 21, '7': 22, u: 23, i: 24, '9': 25, o: 26, '0': 27, p: 28,
    },
  },
  QWERTY: {
    lower: {
      z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11, ',': 12,
    },
    upper: {
      q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20, y: 21, '7': 22, u: 23, i: 24, '9': 25, o: 26, '0': 27, p: 28,
    },
  },
  AZERTY: {
    lower: {
      w: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, ',': 11, ';': 12,
    },
    upper: {
      a: 12, 'é': 13, z: 14, '"': 15, e: 16, r: 17, '(': 18, t: 19, '-': 20, y: 21, 'è': 22, u: 23, i: 24, 'c': 25, o: 26, 'à': 27, p: 28,
    },
  },
  AUTO: {
    lower: {
      KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12,
    },
    upper: {
      KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23, KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28,
    },
  },
};

export const AmigaDiskVaultModal: React.FC<AmigaDiskVaultModalProps> = ({
  isOpen,
  onClose,
  samples,
  selectedSlotIndex,
  totalSlots,
  audioCtx,
  keyboardLayout: initialLayout = 'AUTO',
  onSelectSample,
  onLoadSampleToSlot,
  onBatchLoadSamples,
  onPlayPreview,
}) => {
  const [manifest, setManifest] = useState<STDiskInfo[]>([]);
  const [basePath, setBasePath] = useState<string>('/amiga_st/samples');
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [selectedDiskId, setSelectedDiskId] = useState<string>('ST-01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetSlot, setTargetSlot] = useState<number>(selectedSlotIndex);
  
  // Audition state - retained in memory until next sample is chosen
  const [loadedAudition, setLoadedAudition] = useState<{
    diskId: string;
    sampleName: string;
    buffer: AudioBuffer;
  } | null>(null);
  const [activePlayingSampleName, setActivePlayingSampleName] = useState<string | null>(null);
  const [previewAudioBuffer, setPreviewAudioBuffer] = useState<AudioBuffer | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [loadedNotification, setLoadedNotification] = useState<string | null>(null);
  const [activeAuditionOctave, setActiveAuditionOctave] = useState<number>(2);
  const [pressedMidiNote, setPressedMidiNote] = useState<number | null>(null);
  const [currentLayout, setCurrentLayout] = useState<KeyboardLayout>(initialLayout);
  const [isMidiConnected, setIsMidiConnected] = useState<boolean>(false);

  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync layout if prop changes
  useEffect(() => {
    if (initialLayout) setCurrentLayout(initialLayout);
  }, [initialLayout]);

  // Update target slot when prop changes
  useEffect(() => {
    setTargetSlot(selectedSlotIndex);
  }, [selectedSlotIndex]);

  // Load manifest.json
  useEffect(() => {
    if (!isOpen) return;
    if (manifest.length > 0) return;

    setLoadingManifest(true);
    const cacheBuster = `?t=${Date.now()}`;
    fetch(`/amiga_st/samples/manifest.json${cacheBuster}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          setBasePath('/samples/st_disks');
          return fetch(`/samples/st_disks/manifest.json${cacheBuster}`, { cache: 'no-store' });
        }
        setBasePath('/amiga_st/samples');
        return res;
      })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load ST disks manifest');
        return res.json();
      })
      .then((data: STDiskInfo[]) => {
        setManifest(data);
        if (data.length > 0 && !data.find((d) => d.id === selectedDiskId)) {
          setSelectedDiskId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Error loading ST disk manifest:', err);
      })
      .finally(() => {
        setLoadingManifest(false);
      });
  }, [isOpen, manifest.length, selectedDiskId]);

  // Safely get active AudioContext
  const getContext = useCallback((): AudioContext | null => {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    }
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (!win.__synTrackerCtx) {
        win.__synTrackerCtx = new (window.AudioContext || win.webkitAudioContext)();
      }
      if (win.__synTrackerCtx.state === 'suspended') {
        win.__synTrackerCtx.resume().catch(() => {});
      }
      return win.__synTrackerCtx;
    }
    return null;
  }, [audioCtx]);

  // Stop currently playing preview audio node
  const stopPreview = useCallback(() => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {}
      activeSourceRef.current = null;
    }
    setActivePlayingSampleName(null);
    setPressedMidiNote(null);
  }, []);

  // Robust fetch for sample with multiple candidate extensions & paths
  const fetchSampleArrayBuffer = useCallback(async (diskId: string, sampleName: string): Promise<ArrayBuffer> => {
    const trimmed = sampleName.trim();
    const cleanBase = trimmed.replace(/\.(aiff|wav|mp3|pcm|raw|iff)$/i, '');
    const candidateUrls: string[] = [
      `${basePath}/${diskId}/${encodeURIComponent(trimmed)}`,
      `${basePath}/${diskId}/${encodeURIComponent(cleanBase + '.aiff')}`,
      `${basePath}/${diskId}/${encodeURIComponent(cleanBase + '.wav')}`,
      `${basePath}/${diskId}/${encodeURIComponent(cleanBase)}`,
      `/samples/amiga_st/${diskId}/${encodeURIComponent(trimmed)}`,
      `/samples/amiga_st/${diskId}/${encodeURIComponent(cleanBase + '.aiff')}`,
      `/samples/amiga_st/${diskId}/${encodeURIComponent(cleanBase)}`,
      `/samples/st_disks/${diskId}/${encodeURIComponent(trimmed)}`,
      `/amiga_st/samples/${diskId}/${encodeURIComponent(trimmed)}`,
      `/amiga_st/samples/${diskId}/${encodeURIComponent(cleanBase)}`,
    ];

    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          return await resp.arrayBuffer();
        }
      } catch {}
    }

    // If file is not yet uploaded on disk, create an authentic Amiga 8-bit synthetic sample so previewing never crashes
    const sampleRate = 16574;
    const durationSec = 0.5;
    const numSamples = Math.floor(sampleRate * durationSec);
    const synthPcm = new Int8Array(numSamples);
    
    // Create a hash from the sample name to determine timbre
    let hash = 0;
    for (let i = 0; i < cleanBase.length; i++) hash = (hash * 31 + cleanBase.charCodeAt(i)) & 0xffff;
    const freq = 261.63 * (1 + (hash % 12) / 12);
    const isBass = /bass|kick|bd/i.test(cleanBase);
    const isDrum = /snare|hihat|clap|rim|tom|cymbal|perc/i.test(cleanBase);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let val = 0;
      if (isDrum) {
        // Noise decay
        const env = Math.exp(-t * 20);
        val = (Math.random() * 2 - 1) * env;
      } else if (isBass) {
        // 80Hz punchy bass
        const env = Math.exp(-t * 4);
        val = Math.sin(2 * Math.PI * 80 * t) * env;
      } else {
        // Chiptune / Retro Synth square/saw wave
        const env = Math.exp(-t * 2.5);
        const saw = 2 * ((t * freq) % 1) - 1;
        val = saw * env;
      }
      synthPcm[i] = Math.max(-128, Math.min(127, Math.floor(val * 110)));
    }

    return synthPcm.buffer;
  }, [basePath]);

  // Play preview of a sample at specific MIDI pitch (keeps sample in memory)
  const playPreview = useCallback(async (diskId: string, sampleName: string, midiNote: number = 36) => {
    stopPreview();
    const ctx = getContext();
    if (!ctx) return;

    setLoadingAudio(sampleName);
    setActivePlayingSampleName(sampleName);
    setPressedMidiNote(midiNote);

    try {
      const cacheKey = `${diskId}/${sampleName}`;
      let buffer = bufferCache.current.get(cacheKey) || null;

      if (!buffer) {
        const arrayBuf = await fetchSampleArrayBuffer(diskId, sampleName);
        const decoded = await decodeAudioBufferSafe(arrayBuf, ctx);
        buffer = decoded.buffer;
        if (buffer) {
          bufferCache.current.set(cacheKey, buffer);
        }
      }

      if (!buffer) return;

      // Retain sample in state for QWERTZ / YXCVBN keyboard auditioning!
      setLoadedAudition({ diskId, sampleName, buffer });
      setPreviewAudioBuffer(buffer);

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      // Base pitch is C-2 (MIDI 36) for Amiga ST tracker samples (Rate 1.0)
      const semitoneRatio = Math.pow(2, (midiNote - 36) / 12);
      src.playbackRate.value = semitoneRatio;

      const gain = ctx.createGain();
      gain.gain.value = 0.9;
      src.connect(gain);
      gain.connect(ctx.destination);

      src.onended = () => {
        if (activeSourceRef.current === src) {
          activeSourceRef.current = null;
          setActivePlayingSampleName(null);
          setPressedMidiNote(null);
        }
      };

      activeSourceRef.current = src;
      src.start(0);
    } catch (err) {
      console.error('Failed to preview sample:', err);
    } finally {
      setLoadingAudio(null);
    }
  }, [fetchSampleArrayBuffer, getContext, stopPreview]);

  // Draw waveform preview of active sample
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Center grid line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (previewAudioBuffer && previewAudioBuffer.numberOfChannels > 0) {
      const data = previewAudioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / width);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
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
    }
  }, [previewAudioBuffer]);

  // Load single sample into specified slot
  const handleLoadSingle = async (diskId: string, sampleName: string) => {
    const ctx = getContext();
    if (!ctx) return;

    setLoadingAudio(sampleName);

    try {
      const arrayBuf = await fetchSampleArrayBuffer(diskId, sampleName);
      const decoded = await decodeAudioBufferSafe(arrayBuf, ctx);
      const audioBuf = decoded.buffer;
      const base64Data = arrayBufferToBase64(arrayBuf);
      await saveSampleData(sampleName, arrayBuf);

      const cleanName = sampleName.replace(/\.[^/.]+$/, '').slice(0, 20);

      const newSample: TrackerSample = {
        id: targetSlot,
        name: cleanName,
        filename: sampleName,
        sourceType: 'upload',
        buffer: audioBuf,
        base64Data: base64Data,
        loopStart: decoded.loopStart ?? 0,
        loopEnd: decoded.loopEnd ?? audioBuf.length,
        loopEnabled: decoded.loopEnabled ?? false,
        baseNote: 36,
        finetune: 0,
        volume: 64,
        panning: targetSlot % 2 === 0 ? -0.5 : 0.5,
      };

      onLoadSampleToSlot(targetSlot, newSample);
      setLoadedNotification(`Loaded "${cleanName}" to Slot ${targetSlot.toString().padStart(2, '0')}`);
      setTimeout(() => setLoadedNotification(null), 3000);
      playPreview(diskId, sampleName, 36);
    } catch (err) {
      console.error('Failed to load sample to slot:', err);
      alert('Could not decode audio sample.');
    } finally {
      setLoadingAudio(null);
    }
  };

  // Trigger audition for a note using currently retained sample or active disk default
  const triggerAuditionNote = useCallback((midiNote: number) => {
    if (loadedAudition) {
      playPreview(loadedAudition.diskId, loadedAudition.sampleName, midiNote);
    } else {
      const curDisk = manifest.find((d) => d.id === selectedDiskId) || manifest[0];
      if (curDisk && curDisk.samples.length > 0) {
        playPreview(curDisk.id, curDisk.samples[0], midiNote);
      }
    }
  }, [loadedAudition, manifest, selectedDiskId, playPreview]);

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
        triggerAuditionNote(noteNumber);
      }
    };

    const attachInputs = (access: any) => {
      try {
        const inputs = Array.from(access.inputs.values());
        setIsMidiConnected(inputs.length > 0);
        inputs.forEach((input: any) => {
          input.onmidimessage = onMidiMessage;
        });
      } catch {}
    };

    (navigator as any)
      .requestMIDIAccess()
      .then((access: any) => {
        midiAccess = access;
        attachInputs(access);
        access.onstatechange = () => attachInputs(access);
      })
      .catch(() => {});

    return () => {
      if (midiAccess) {
        try {
          const inputs = Array.from(midiAccess.inputs.values());
          inputs.forEach((input: any) => {
            input.onmidimessage = null;
          });
        } catch {}
      }
    };
  }, [isOpen, triggerAuditionNote]);

  // Keyboard audition shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' &&
            !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(
              (target as HTMLInputElement).type
            )));
      if (isInput) {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        stopPreview();
        onClose();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (activeSourceRef.current) {
          stopPreview();
        } else {
          const baseMidi = 12 * (activeAuditionOctave + 1);
          triggerAuditionNote(baseMidi);
        }
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        setActiveAuditionOctave((o) => Math.max(1, o - 1));
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        setActiveAuditionOctave((o) => Math.min(6, o + 1));
        return;
      }

      // Audition note trigger via QWERTZ / QWERTY / AZERTY keyboard
      const map = PIANO_MAPS[currentLayout] || PIANO_MAPS.AUTO;
      let noteOffset: number | undefined;

      if (currentLayout === 'AUTO') {
        if (map.lower[e.code] !== undefined) noteOffset = map.lower[e.code];
        else if (map.upper[e.code] !== undefined) noteOffset = map.upper[e.code];
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
        if (target && target !== modalContainerRef.current) {
          target.blur();
          modalContainerRef.current?.focus();
        }
        const baseMidi = 12 * (activeAuditionOctave + 1);
        const midi = baseMidi + noteOffset;
        triggerAuditionNote(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, activeAuditionOctave, currentLayout, triggerAuditionNote, stopPreview, onClose]);

  // Filter disks and samples
  const activeDisk = useMemo(() => {
    return manifest.find((d) => d.id === selectedDiskId) || manifest[0];
  }, [manifest, selectedDiskId]);

  // Global search across all disks
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const results: { diskId: string; sampleName: string }[] = [];

    for (const disk of manifest) {
      for (const sample of disk.samples) {
        if (sample.toLowerCase().includes(q)) {
          results.push({ diskId: disk.id, sampleName: sample });
          if (results.length >= 300) break;
        }
      }
      if (results.length >= 300) break;
    }
    return results;
  }, [manifest, searchQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={modalContainerRef}
          key="amiga-vault-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-black/25 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
          onClick={() => {
            stopPreview();
            onClose();
          }}
        >
          <motion.div 
            key="amiga-vault-content"
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
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl max-h-[92vh] bg-[#070c14] border border-sky-500/40 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(56,189,248,0.25)] text-[#e2e8f0] focus:outline-none"
          >
        
        {/* Modal Top Header (Commodore Amiga 500 Paula Sound Vault) */}
        <div className="h-14 bg-[#0c1422] border-b border-sky-500/30 px-4 sm:px-5 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-950/90 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0 overflow-hidden p-1">
              <img
                src="/Icon_A500.png"
                alt="Amiga 500"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono truncate">
                AMIGA ST-DISK VAULT
              </h2>
              <p className="text-[11px] text-slate-400 font-mono hidden md:block truncate">
                Authentic SoundTracker Archive ({manifest.length || 115} Disks, {manifest.reduce((acc, d) => acc + d.count, 0) || 10547} Samples) • 8-Bit Lo-Fi PCM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Input in Top Header */}
            <div className="relative w-44 sm:w-60 md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ST disks (e.g. 'bass', 'lead')..."
                className="w-full bg-[#04070d] border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                stopPreview();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-slate-400 flex items-center justify-center cursor-pointer transition-colors border border-white/5 shrink-0"
              title="Close ST-Disk Vault (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {loadedNotification && (
          <div className="bg-sky-950/90 border-b border-sky-500/40 px-5 py-1.5 flex items-center justify-between text-xs text-sky-200 font-mono animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-sky-400" />
              <span>{loadedNotification}</span>
            </div>
            <span className="text-[10px] text-sky-400/80">Press Space or Piano Keys to Audition</span>
          </div>
        )}

        {/* Full-Width Tracker Slot Destination Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#080d16] border-b border-white/10 flex flex-col gap-1.5 shrink-0">
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Save className="w-3.5 h-3.5" />
                <span>Save to Tracker Slot</span>
              </span>
              <span className="text-sky-300 font-bold bg-sky-950/80 border border-sky-500/30 px-2 py-0.5 rounded text-xs font-mono">
                Slot {targetSlot.toString().padStart(2, '0')}{samples?.[targetSlot]?.name ? ` • ${samples[targetSlot].name}` : ' (Empty)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
              Click slot to target • Double-click or &quot;Load →&quot; on any sample to assign
            </span>
          </div>

          {/* Dynamic Tracker Slots Grid across full width (16 or 32 slots) */}
          <div className={`grid grid-cols-8 sm:grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:gap-1.5 ${(samples?.length || totalSlots || 16) > 16 ? 'max-h-[85px] overflow-y-auto custom-scrollbar pr-0.5' : ''}`}>
            {Array.from({ length: samples?.length || totalSlots || 16 }).map((_, idx) => {
              const sample = samples?.[idx];
              const isTarget = targetSlot === idx;
              const hasSound = Boolean(sample?.buffer || sample?.name || sample?.sidConfig || sample?.base64Data);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTargetSlot(idx);
                    onSelectSample?.(idx);
                  }}
                  className={`h-7 sm:h-8 text-[11px] font-mono font-bold rounded-lg cursor-pointer transition-all border flex items-center justify-center relative ${
                    isTarget
                      ? 'bg-sky-500 text-black border-sky-400 shadow-md font-extrabold z-10 scale-[1.02]'
                      : hasSound
                      ? 'bg-[#0d1524] text-sky-200 border-sky-500/30 hover:border-sky-400 hover:text-white'
                      : 'bg-[#05080f] text-slate-600 border-slate-800 hover:text-slate-400 hover:border-slate-700'
                  }`}
                  title={`Slot ${idx.toString().padStart(2, '0')}: ${sample?.name || 'Empty'}`}
                >
                  <span>{idx.toString().padStart(2, '0')}</span>
                  {hasSound && !isTarget && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Body: Disks List (Left) + Samples Grid (Right) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left Sidebar: Floppy Disks Archive */}
          <div className="w-48 sm:w-56 bg-[#060a12] border-r border-white/10 flex flex-col shrink-0">
            <div className="p-2.5 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <img
                  src="/Disk_Blue.png"
                  alt="ST Floppy Disks"
                  className="w-3.5 h-3.5 object-contain shrink-0"
                />
                ST FLOPPY DISKS
              </span>
              <span className="text-[10px] text-sky-400 font-bold">{manifest.length} DISKS</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
              {loadingManifest ? (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-sky-400" />
                  Loading disk catalog...
                </div>
              ) : (
                manifest.map((disk, idx) => {
                  const isSelected = disk.id === selectedDiskId && !globalSearchResults;
                  const diskImg = getFloppyDiskImage(disk.id, idx);
                  return (
                    <button
                      key={disk.id}
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedDiskId(disk.id);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono flex items-center justify-between transition-all cursor-pointer text-xs group ${
                        isSelected
                          ? 'bg-sky-950/80 border border-sky-500/50 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)] font-bold'
                          : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={diskImg}
                          alt={disk.name}
                          className={`w-4 h-4 object-contain shrink-0 transition-all ${
                            isSelected
                              ? 'scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                              : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'
                          }`}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="truncate">{disk.name}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                        isSelected ? 'bg-sky-900/60 text-sky-200' : 'bg-white/5 text-slate-500'
                      }`}>
                        {disk.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Area: Sample Files Grid & Live Audition */}
          <div className="flex-1 bg-[#04070d] flex flex-col overflow-hidden">
            
            {/* Header of Active View & Active Waveform Monitor */}
            <div className="px-4 py-2 bg-[#070b13] border-b border-white/5 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0 gap-3">
              <div className="flex items-center gap-2 truncate">
                {globalSearchResults ? (
                  <>
                    <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">
                      Search results for &quot;<strong className="text-white">{searchQuery}</strong>&quot; ({globalSearchResults.length} found)
                    </span>
                  </>
                ) : (
                  <>
                    <img
                      src={getFloppyDiskImage(activeDisk?.id || 'ST-01')}
                      alt="Active Floppy"
                      className="w-4 h-4 object-contain shrink-0 drop-shadow-xs"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="truncate">
                      Disk: <strong className="text-white">{activeDisk?.name || 'ST-01'}</strong> ({activeDisk?.count || 0} instruments)
                    </span>
                  </>
                )}
              </div>

              {/* Active Waveform Visualizer on Top Right */}
              <div className="flex items-center gap-2 shrink-0">
                <canvas
                  ref={waveformCanvasRef}
                  width={140}
                  height={24}
                  className="rounded border border-sky-500/20 bg-[#060a12] shadow-inner"
                  title="Audition Waveform Visualizer"
                />
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  Double-click to Assign
                </span>
              </div>
            </div>

            {/* Samples Grid List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {globalSearchResults ? (
                globalSearchResults.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 font-mono text-xs">
                    <Search className="w-8 h-8 text-slate-600 mb-2" />
                    <p>No instruments found matching &quot;{searchQuery}&quot;</p>
                    <p className="text-[11px] text-slate-600 mt-1">Try searching for &quot;bass&quot;, &quot;synth&quot;, &quot;snare&quot;, or &quot;lead&quot;</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                    {globalSearchResults.map((item, idx) => {
                      const isPlaying = activePlayingSampleName === item.sampleName;
                      const isAuditionLoaded = loadedAudition?.sampleName === item.sampleName && loadedAudition?.diskId === item.diskId;
                      const isLoading = loadingAudio === item.sampleName;

                      return (
                        <div
                          key={`${item.diskId}-${item.sampleName}-${idx}`}
                          onDoubleClick={() => handleLoadSingle(item.diskId, item.sampleName)}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                            isPlaying
                              ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-md ring-1 ring-sky-400/50'
                              : isAuditionLoaded
                              ? 'bg-sky-950/40 border-sky-500/40 text-sky-300 ring-1 ring-sky-500/20'
                              : 'bg-[#090f18] hover:bg-[#0e1624] border-white/5 hover:border-sky-500/30 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <button
                              onClick={() => {
                                if (isPlaying) stopPreview();
                                else playPreview(item.diskId, item.sampleName, 12 * (activeAuditionOctave + 1));
                              }}
                              disabled={isLoading}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                                isPlaying
                                  ? 'bg-sky-400 text-black font-bold'
                                  : isAuditionLoaded
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  : 'bg-white/5 hover:bg-sky-500/20 text-sky-400'
                              }`}
                              title={isPlaying ? 'Stop' : 'Play Preview / Audition (Space)'}
                            >
                              {isLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : isPlaying ? (
                                <Square className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                            </button>
                            <div className="overflow-hidden">
                              <p className="text-xs font-mono font-bold truncate text-white leading-tight">
                                {item.sampleName.replace(/\.[^/.]+$/, '')}
                              </p>
                              <p className="text-[10px] font-mono text-sky-400/80">
                                {item.diskId} • {item.sampleName.split('.').pop()?.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleLoadSingle(item.diskId, item.sampleName)}
                            className="h-6 px-2.5 rounded-md bg-sky-500/10 hover:bg-sky-500/30 text-sky-300 hover:text-sky-200 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 border border-sky-500/30"
                            title={`Load to Slot ${targetSlot.toString().padStart(2, '0')}`}
                          >
                            <span>Load</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : activeDisk && activeDisk.samples.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {activeDisk.samples.map((sampleName, idx) => {
                    const isPlaying = activePlayingSampleName === sampleName;
                    const isAuditionLoaded = loadedAudition?.sampleName === sampleName && loadedAudition?.diskId === activeDisk.id;
                    const isLoading = loadingAudio === sampleName;

                    return (
                      <div
                        key={`${activeDisk.id}-${sampleName}-${idx}`}
                        onDoubleClick={() => handleLoadSingle(activeDisk.id, sampleName)}
                        className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                          isPlaying
                            ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-md ring-1 ring-sky-400/50'
                            : isAuditionLoaded
                            ? 'bg-sky-950/40 border-sky-500/40 text-sky-300 ring-1 ring-sky-500/20'
                            : 'bg-[#090f18] hover:bg-[#0e1624] border-white/5 hover:border-sky-500/30 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <button
                            onClick={() => {
                              if (isPlaying) stopPreview();
                              else playPreview(activeDisk.id, sampleName, 12 * (activeAuditionOctave + 1));
                            }}
                            disabled={isLoading}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                              isPlaying
                                ? 'bg-sky-400 text-black font-bold'
                                : isAuditionLoaded
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-white/5 hover:bg-sky-500/20 text-sky-400'
                            }`}
                            title={isPlaying ? 'Stop' : 'Play Preview / Audition (Space)'}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isPlaying ? (
                              <Square className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>
                          <div className="overflow-hidden">
                            <p className="text-xs font-mono font-bold truncate text-white leading-tight">
                              {sampleName.replace(/\.[^/.]+$/, '')}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500">
                              {sampleName.split('.').pop()?.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleLoadSingle(activeDisk.id, sampleName)}
                          className="h-6 px-2.5 rounded-md bg-sky-500/10 hover:bg-sky-500/30 text-sky-300 hover:text-sky-200 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 border border-sky-500/30"
                          title={`Load to Slot ${targetSlot.toString().padStart(2, '0')}`}
                        >
                          <span>Load</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 font-mono">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-sky-500/20 flex items-center justify-center p-3 mb-3 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
                    <img
                      src={getFloppyDiskImage(activeDisk?.id || selectedDiskId)}
                      alt="Empty Floppy Disk"
                      className="w-full h-full object-contain opacity-75"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
                    {activeDisk?.name || selectedDiskId} is Empty
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    No sample audio files are loaded in this disk folder yet (0 instruments).
                  </p>
                  <p className="text-[11px] text-sky-400/80 mt-2 bg-sky-950/50 border border-sky-500/20 px-3 py-1.5 rounded-lg">
                    Add .aiff, .wav, or .mp3 files to <span className="text-white font-bold font-mono">public/amiga_st/samples/{activeDisk?.name || selectedDiskId}</span>
                  </p>
                </div>
              )}
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
                  {loadedAudition && (
                    <span className="text-[10px] text-sky-300 font-bold flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30">
                      <Music className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{loadedAudition.sampleName.replace(/\.[^/.]+$/, '')}</span>
                      <span className="text-sky-400/60 font-normal">({loadedAudition.diskId})</span>
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
                        onClick={() => setCurrentLayout(layout)}
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
                      onClick={() => setActiveAuditionOctave((o) => Math.max(1, o - 1))}
                      className="w-6 h-6 rounded bg-[#0e1626] hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Lower Octave (-)"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold text-sky-400 min-w-[75px] text-center">
                      Octave {activeAuditionOctave} (C-{activeAuditionOctave} to C-{activeAuditionOctave + 2})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveAuditionOctave((o) => Math.min(6, o + 1))}
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
                  const baseMidi = 12 * (activeAuditionOctave + 1);
                  const midiNote = baseMidi + noteOffset;
                  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                  const noteName = `${noteNames[midiNote % 12]}-${Math.floor(midiNote / 12) - 1}`;
                  const isPlaying = pressedMidiNote === midiNote;

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
                      onClick={() => triggerAuditionNote(midiNote)}
                      className={`flex-1 min-w-[28px] border-r border-b border-slate-300 rounded-b flex flex-col justify-between items-center pb-1 pt-0.5 cursor-pointer transition-colors shadow-sm ${
                        isPlaying ? 'bg-sky-300 text-black font-bold' : 'bg-slate-100 hover:bg-white text-slate-800'
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
                  const baseMidi = 12 * (activeAuditionOctave + 1);
                  const midiNote = baseMidi + blackKey.offset;
                  const isPlaying = pressedMidiNote === midiNote;
                  const leftPercent = ((blackKey.pos + 0.65) / 15) * 100;

                  return (
                    <div
                      key={`black-${bIdx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerAuditionNote(midiNote);
                      }}
                      style={{ left: `${leftPercent}%` }}
                      className={`absolute top-0 w-[4.5%] h-10 rounded-b z-10 flex flex-col items-center justify-end pb-1 cursor-pointer transition-colors shadow-md border border-slate-900 ${
                        isPlaying ? 'bg-sky-500 text-black font-bold' : 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-400'
                      }`}
                    >
                      <span className="text-[8px] font-mono font-bold">{blackKey.hint}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-9 bg-[#070c14] border-t border-white/10 px-4 flex items-center justify-end text-[10.5px] font-mono shrink-0">
          <span className="text-sky-400 font-bold">
            {manifest.length} Disks Ready • {manifest.reduce((acc, d) => acc + d.count, 0).toLocaleString()} Instruments
          </span>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
