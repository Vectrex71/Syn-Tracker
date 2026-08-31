/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  Square,
  Repeat,
  Scissors,
  Copy,
  Clipboard,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Mic,
  MicOff,
  Sliders,
  Sparkles,
  Zap,
  Check,
  Disc,
  Clock,
  Waves,
  Coffee,
  Layers,
} from 'lucide-react';
import { TrackerSample, RetroChipSystem } from '../types';
import { decodeAudioBufferSafe } from '../utils/audioDecoder';
import { audioBufferToWavBlob, audioBufferToMp3Blob } from '../utils/audioExporter';
import { PersonaSwitcher, AppPersona } from './PersonaSwitcher';
import {
  applyEchoDsp,
  applyPhaserDsp,
  applyDenoiseDsp,
  applyRobotVoiceDsp,
  applyFadeCurveDsp,
  mergeAudioBuffers,
  FadeType,
  FadeCurve,
  MergeMode,
  duplicateAudioBuffer,
  createEmptyBuffer,
} from '../utils/sampleEditorDsp';
import { SynEditorSidebar, SynEditorTab } from '../synEditor/SynEditorSidebar';
import { SynEditorWaveform } from '../synEditor/SynEditorWaveform';

interface SynEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: TrackerSample[];
  selectedSampleIndex: number;
  audioCtx?: AudioContext | null;
  activeChipSystem?: RetroChipSystem | null;
  onUpdateSample: (index: number, sample: TrackerSample) => void;
  onPlayPreview?: (noteMidi: number, sample?: TrackerSample) => void;
  onShowToast?: (msg: string) => void;
  onSwitchPersona?: (persona: AppPersona) => void;
  onOpenSupport?: () => void;
  showSupportButton?: boolean;
}

interface SelectionRange {
  start: number;
  end: number;
}

interface AudioHistoryItem {
  buffer: AudioBuffer;
  description: string;
  loopPoints?: { start: number; end: number };
}

// Clone AudioBuffer safely
function cloneAudioBuffer(ctx: AudioContext | BaseAudioContext, src: AudioBuffer): AudioBuffer {
  const dst = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    dst.copyToChannel(src.getChannelData(ch), ch);
  }
  return dst;
}

export const SynEditorModal: React.FC<SynEditorModalProps> = ({
  isOpen,
  onClose,
  samples,
  selectedSampleIndex,
  audioCtx: propAudioCtx,
  onUpdateSample,
  onPlayPreview,
  onShowToast,
  onSwitchPersona,
  onOpenSupport,
  showSupportButton = true,
}) => {
  // Active selected tracker slot in the editor
  const [activeSlot, setActiveSlot] = useState<number>(selectedSampleIndex || 0);

  // Audio Buffers & History Stack
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [sampleName, setSampleName] = useState<string>('Sample');
  const [history, setHistory] = useState<AudioHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Transport & Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopPlayback, setIsLoopPlayback] = useState<boolean>(false);
  const [playheadFrame, setPlayheadFrame] = useState<number>(0);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartOffsetRef = useRef<number>(0);
  const playbackAnimFrameRef = useRef<number | null>(null);

  // Selection & Zoom
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [clipboard, setClipboard] = useState<AudioBuffer | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [scrollOffset, setScrollOffset] = useState<number>(0);

  // Loop Boundaries
  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(0);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);

  // Live Microphone Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);

  // Audio Meters (Hardware Real-Time VU Meter)
  const [meterLevels, setMeterLevels] = useState<{ leftPeak: number; rightPeak: number; isClipping: boolean }>({
    leftPeak: 0,
    rightPeak: 0,
    isClipping: false,
  });
  const meterAnimFrameRef = useRef<number | null>(null);
  const meterAnalyserLRef = useRef<AnalyserNode | null>(null);
  const meterAnalyserRRef = useRef<AnalyserNode | null>(null);

  // UI Panels & Sidebar Tabs
  const [activeTab, setActiveTab] = useState<SynEditorTab>('dsp_rack');
  const [viewMode, setViewMode] = useState<'waveform' | 'stereo'>('waveform');

  // DSP Parameters
  // 1. 5-Band Parametric EQ
  const [eqLow, setEqLow] = useState<number>(0);
  const [eqLowMid, setEqLowMid] = useState<number>(0);
  const [eqMid, setEqMid] = useState<number>(0);
  const [eqHighMid, setEqHighMid] = useState<number>(0);
  const [eqHigh, setEqHigh] = useState<number>(0);

  // 2. Dynamics & Compressor
  const [normTargetDb, setNormTargetDb] = useState<number>(-0.1);
  const [compThreshold, setCompThreshold] = useState<number>(-18);
  const [compRatio, setCompRatio] = useState<number>(4);

  // 3. Reverb & Echo
  const [reverbSize, setReverbSize] = useState<number>(40);
  const [reverbMix, setReverbMix] = useState<number>(25);
  const [echoDelayMs, setEchoDelayMs] = useState<number>(280);
  const [echoFeedback, setEchoFeedback] = useState<number>(0.35);
  const [echoWetMix, setEchoWetMix] = useState<number>(0.35);
  const [echoDampingHz, setEchoDampingHz] = useState<number>(4500);
  const [echoPingPong, setEchoPingPong] = useState<boolean>(true);

  // 4. Modulation: Phaser
  const [phaserStages, setPhaserStages] = useState<number>(6);
  const [phaserRateHz, setPhaserRateHz] = useState<number>(0.4);
  const [phaserDepthHz, setPhaserDepthHz] = useState<number>(1400);
  const [phaserFeedback, setPhaserFeedback] = useState<number>(0.45);
  const [phaserWetMix, setPhaserWetMix] = useState<number>(0.5);
  const [phaserStereoPhase, setPhaserStereoPhase] = useState<number>(90);

  // 5. Voice Transformation & Roboter & Denoise
  const [robotCarrierFreq, setRobotCarrierFreq] = useState<number>(110);
  const [robotCarrierWave, setRobotCarrierWave] = useState<'sine' | 'square' | 'sawtooth' | 'pulse'>('sine');
  const [robotRingModDepth, setRobotRingModDepth] = useState<number>(85);
  const [robotResonance, setRobotResonance] = useState<number>(40);
  const [robotBitCrush, setRobotBitCrush] = useState<number>(12);
  const [robotWetMix, setRobotWetMix] = useState<number>(0.85);

  const [denoiseThresholdDb, setDenoiseThresholdDb] = useState<number>(-48);
  const [denoiseReductionDb, setDenoiseReductionDb] = useState<number>(18);
  const [denoiseHissCutoffHz, setDenoiseHissCutoffHz] = useState<number>(10000);

  const [pitchSemitones, setPitchSemitones] = useState<number>(0);
  const [timeStretchFactor, setTimeStretchFactor] = useState<number>(100);

  // 6. Sample Merger & Fusion Studio
  const [mergeSlotB, setMergeSlotB] = useState<number>(1);
  const [mergeMode, setMergeMode] = useState<MergeMode>('mix');
  const [mergeGainA, setMergeGainA] = useState<number>(1.0);
  const [mergeGainB, setMergeGainB] = useState<number>(0.8);
  const [mergeCrossfadeMs, setMergeCrossfadeMs] = useState<number>(60);
  const [mergeSilenceGapMs, setMergeSilenceGapMs] = useState<number>(0);
  const [secondSampleBuffer, setSecondSampleBuffer] = useState<AudioBuffer | null>(null);
  const [secondSampleFileName, setSecondSampleFileName] = useState<string | null>(null);

  // 7. Retro Paula & Lo-Fi
  const [amigaQuantizeBits, setAmigaQuantizeBits] = useState<number>(8);
  const [amigaLedFilter, setAmigaLedFilter] = useState<boolean>(true);
  const [bitcrushBits, setBitcrushBits] = useState<number>(8);
  const [sampleRateReduce, setSampleRateReduce] = useState<number>(16000);
  const [saturationDrive, setSaturationDrive] = useState<number>(0);

  // 8. Generators
  const [genWaveType, setGenWaveType] = useState<'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise' | 'pulse'>('sawtooth');
  const [genFrequency, setGenFrequency] = useState<number>(440);
  const [genDurationSec, setGenDurationSec] = useState<number>(1.0);
  const [genChirpStart, setGenChirpStart] = useState<number>(120);
  const [genChirpEnd, setGenChirpEnd] = useState<number>(4000);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get or Create Audio Context
  const getAudioContext = useCallback((): AudioContext => {
    if (propAudioCtx && propAudioCtx.state !== 'closed') return propAudioCtx;
    const w = window as unknown as { __syn_editor_ctx?: AudioContext; AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext };
    if (!w.__syn_editor_ctx || w.__syn_editor_ctx.state === 'closed') {
      w.__syn_editor_ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 44100,
      });
    }
    if (w.__syn_editor_ctx.state === 'suspended') {
      w.__syn_editor_ctx.resume();
    }
    return w.__syn_editor_ctx;
  }, [propAudioCtx]);

  // Load sample from tracker slot
  const loadSampleFromSlot = useCallback(
    async (slotIndex: number) => {
      const targetSample = samples[slotIndex];
      if (!targetSample) return;

      setSampleName(targetSample.name || `Sample_${slotIndex.toString().padStart(2, '0')}`);
      setLoopStart(targetSample.loopStart || 0);
      setLoopEnd(targetSample.loopLength ? (targetSample.loopStart || 0) + targetSample.loopLength : 0);
      setLoopEnabled(targetSample.loopType !== 'none' && (targetSample.loopLength || 0) > 2);
      setSelection(null);
      setPlayheadFrame(0);

      const ctx = getAudioContext();

      if (targetSample.buffer) {
        const cloned = cloneAudioBuffer(ctx, targetSample.buffer);
        setCurrentBuffer(cloned);
        setHistory([{ buffer: cloned, description: 'Initial Sample' }]);
        setHistoryIndex(0);
      } else if (targetSample.base64Data) {
        try {
          const binaryStr = atob(targetSample.base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const decoded = await decodeAudioBufferSafe(bytes.buffer, ctx);
          setCurrentBuffer(decoded.buffer);
          setHistory([{ buffer: decoded.buffer, description: 'Decoded Base64' }]);
          setHistoryIndex(0);
        } catch (e) {
          console.error('Error decoding sample base64 data:', e);
        }
      } else {
        const emptyBuf = ctx.createBuffer(1, 44100, 44100);
        setCurrentBuffer(emptyBuf);
        setHistory([{ buffer: emptyBuf, description: 'Empty Scratchpad' }]);
        setHistoryIndex(0);
      }
    },
    [samples, getAudioContext]
  );

  // Sync slot change on open
  useEffect(() => {
    if (isOpen) {
      setActiveSlot(selectedSampleIndex);
      loadSampleFromSlot(selectedSampleIndex);
    } else {
      stopPlayback();
    }
  }, [isOpen, selectedSampleIndex, loadSampleFromSlot]);

  // When slot selector dropdown changes
  useEffect(() => {
    if (isOpen) {
      loadSampleFromSlot(activeSlot);
    }
  }, [activeSlot]);

  // Push new state to undo/redo history stack
  const pushHistory = (newBuffer: AudioBuffer, description: string, loopPoints?: { start: number; end: number }) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { buffer: newBuffer, description, loopPoints }];
    });
    setHistoryIndex((prev) => prev + 1);
    setCurrentBuffer(newBuffer);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentBuffer(target.buffer);
      if (target.loopPoints) {
        setLoopStart(target.loopPoints.start);
        setLoopEnd(target.loopPoints.end);
      }
      onShowToast?.(`Undo: ${target.description}`);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentBuffer(target.buffer);
      if (target.loopPoints) {
        setLoopStart(target.loopPoints.start);
        setLoopEnd(target.loopPoints.end);
      }
      onShowToast?.(`Redo: ${target.description}`);
    }
  };

  // Audio Playback Transport
  const stopPlayback = useCallback(() => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {}
      activeSourceRef.current = null;
    }
    if (playbackAnimFrameRef.current) {
      cancelAnimationFrame(playbackAnimFrameRef.current);
      playbackAnimFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!currentBuffer) return;
    stopPlayback();

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = currentBuffer;

    const splitter = ctx.createChannelSplitter(2);
    const analyserL = ctx.createAnalyser();
    const analyserR = ctx.createAnalyser();
    analyserL.fftSize = 256;
    analyserR.fftSize = 256;

    source.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, Math.min(1, currentBuffer.numberOfChannels - 1));
    source.connect(ctx.destination);

    meterAnalyserLRef.current = analyserL;
    meterAnalyserRRef.current = analyserR;

    let startOffset = 0;
    let playDuration: number | undefined = undefined;

    if (selection) {
      const selStart = Math.min(selection.start, selection.end);
      const selEnd = Math.max(selection.start, selection.end);
      startOffset = selStart / currentBuffer.sampleRate;
      playDuration = (selEnd - selStart) / currentBuffer.sampleRate;
    } else if (loopEnabled && loopEnd > loopStart) {
      source.loop = isLoopPlayback;
      source.loopStart = loopStart / currentBuffer.sampleRate;
      source.loopEnd = loopEnd / currentBuffer.sampleRate;
    } else {
      source.loop = isLoopPlayback;
    }

    playbackStartTimeRef.current = ctx.currentTime;
    playbackStartOffsetRef.current = startOffset;

    if (playDuration !== undefined && !isLoopPlayback) {
      source.start(0, startOffset, playDuration);
    } else {
      source.start(0, startOffset);
    }

    activeSourceRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      if (activeSourceRef.current === source) {
        setIsPlaying(false);
        setPlayheadFrame(0);
      }
    };

    const updatePlayhead = () => {
      if (!activeSourceRef.current) return;
      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const currentSec = playbackStartOffsetRef.current + elapsed;
      const curFrame = Math.floor(currentSec * currentBuffer.sampleRate);

      if (curFrame >= currentBuffer.length && !isLoopPlayback) {
        setPlayheadFrame(0);
        setIsPlaying(false);
        return;
      }

      setPlayheadFrame(curFrame % currentBuffer.length);
      playbackAnimFrameRef.current = requestAnimationFrame(updatePlayhead);
    };
    playbackAnimFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [currentBuffer, selection, loopEnabled, loopStart, loopEnd, isLoopPlayback, getAudioContext, stopPlayback]);

  // VU Meter Loop
  useEffect(() => {
    let animId: number;
    const lData = new Uint8Array(128);
    const rData = new Uint8Array(128);

    const updateMeters = () => {
      if (isPlaying && meterAnalyserLRef.current && meterAnalyserRRef.current) {
        meterAnalyserLRef.current.getByteTimeDomainData(lData);
        meterAnalyserRRef.current.getByteTimeDomainData(rData);

        let maxL = 0;
        let maxR = 0;
        for (let i = 0; i < 128; i++) {
          const valL = Math.abs((lData[i] - 128) / 128);
          const valR = Math.abs((rData[i] - 128) / 128);
          if (valL > maxL) maxL = valL;
          if (valR > maxR) maxR = valR;
        }

        setMeterLevels({
          leftPeak: maxL,
          rightPeak: maxR,
          isClipping: maxL >= 0.98 || maxR >= 0.98,
        });
      } else {
        setMeterLevels({ leftPeak: 0, rightPeak: 0, isClipping: false });
      }
      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Save / Apply Sample back to tracker slot
  const handleApplyToSlot = () => {
    if (!currentBuffer) return;
    try {
      const updatedSample: TrackerSample = {
        ...samples[activeSlot],
        name: sampleName || `Sample_${activeSlot.toString().padStart(2, '0')}`,
        buffer: currentBuffer,
        length: currentBuffer.length,
        loopType: loopEnabled ? 'forward' : 'none',
        loopStart: loopEnabled ? loopStart : 0,
        loopLength: loopEnabled ? Math.max(0, loopEnd - loopStart) : 0,
        volume: samples[activeSlot]?.volume ?? 64,
        fineTune: samples[activeSlot]?.fineTune ?? 0,
        baseNote: samples[activeSlot]?.baseNote ?? 36,
      };

      onUpdateSample(activeSlot, updatedSample);
      onShowToast?.(`Applied to Slot ${activeSlot.toString().padStart(2, '0')}: "${updatedSample.name}"`);

      if (onPlayPreview) {
        onPlayPreview(updatedSample.baseNote || 36, updatedSample);
      }
    } catch (err) {
      console.error('Error applying sample to slot:', err);
      onShowToast?.('Error saving sample to slot.');
    }
  };

  // Export WAV
  const handleExportWav = () => {
    if (!currentBuffer) return;
    const blob = audioBufferToWavBlob(currentBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sampleName.replace(/[^a-z0-9_-]/gi, '_') || 'syn_sample'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast?.(`Exported WAV (${(blob.size / 1024).toFixed(1)} KB)`);
  };

  // Export MP3
  const handleExportMp3 = async () => {
    if (!currentBuffer) return;
    try {
      onShowToast?.('Encoding MP3...');
      const blob = await audioBufferToMp3Blob(currentBuffer, 192);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sampleName.replace(/[^a-z0-9_-]/gi, '_') || 'syn_sample'}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast?.(`Exported MP3 (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error('MP3 export failed:', e);
      onShowToast?.('Failed to encode MP3.');
    }
  };

  // Import Audio File
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ctx = getAudioContext();
      const arrayBuf = await file.arrayBuffer();
      const decoded = await decodeAudioBufferSafe(arrayBuf, ctx);
      const audioBuf = decoded.buffer;

      const newName = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
      setSampleName(newName);
      setLoopStart(decoded.loopStart ?? 0);
      setLoopEnd(decoded.loopEnd ?? audioBuf.length);
      setLoopEnabled(decoded.loopEnabled ?? false);
      setSelection(null);
      setPlayheadFrame(0);

      pushHistory(audioBuf, `Import ${file.name}`, {
        start: decoded.loopStart ?? 0,
        end: decoded.loopEnd ?? audioBuf.length,
      });

      onShowToast?.(`Imported "${file.name}" (${(audioBuf.duration).toFixed(2)}s)`);
    } catch (err) {
      console.error('Error importing audio file:', err);
      onShowToast?.('Could not decode audio file.');
    }
    if (e.target) e.target.value = '';
  };

  // Toggle Live Microphone Recording
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      setRecordingSeconds(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const arrayBuf = await audioBlob.arrayBuffer();
        const ctx = getAudioContext();
        try {
          const decodedBuf = await ctx.decodeAudioData(arrayBuf);
          pushHistory(decodedBuf, 'Microphone Recording');
          setSampleName(`Mic_${new Date().toLocaleTimeString().replace(/:/g, '')}`);
          onShowToast?.(`Recorded ${(decodedBuf.duration).toFixed(2)}s of audio.`);
        } catch (e) {
          console.error('Error decoding recording:', e);
          onShowToast?.('Failed to decode recorded audio.');
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      recordIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 0.1);
      }, 100);
      onShowToast?.('Recording live audio...');
    } catch (err) {
      console.error('Microphone access error:', err);
      onShowToast?.('Microphone permission denied or unavailable.');
    }
  };

  // Wave Action Tools
  // 1. Trim
  const handleTrim = () => {
    if (!currentBuffer || !selection) return;
    const ctx = getAudioContext();
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const newLen = Math.max(64, end - start);

    const newBuf = ctx.createBuffer(currentBuffer.numberOfChannels, newLen, currentBuffer.sampleRate);
    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const src = currentBuffer.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      for (let i = 0; i < newLen; i++) {
        dst[i] = src[start + i] || 0;
      }
    }

    setSelection(null);
    pushHistory(newBuf, 'Trim Selection', { start: 0, end: newLen });
    onShowToast?.('Trimmed audio to selection.');
  };

  // 2. Delete
  const handleDeleteSelection = () => {
    if (!currentBuffer || !selection) return;
    const ctx = getAudioContext();
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const removeLen = end - start;
    const newLen = Math.max(64, currentBuffer.length - removeLen);

    const newBuf = ctx.createBuffer(currentBuffer.numberOfChannels, newLen, currentBuffer.sampleRate);
    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const src = currentBuffer.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);
      dst.set(src.subarray(0, start), 0);
      dst.set(src.subarray(end), start);
    }

    setSelection(null);
    pushHistory(newBuf, 'Delete Region');
    onShowToast?.('Deleted selected region.');
  };

  // 3. Cut
  const handleCut = () => {
    if (!currentBuffer || !selection) return;
    const ctx = getAudioContext();
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const cutLen = end - start;

    const clipBuf = ctx.createBuffer(currentBuffer.numberOfChannels, cutLen, currentBuffer.sampleRate);
    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const src = currentBuffer.getChannelData(ch);
      const dst = clipBuf.getChannelData(ch);
      for (let i = 0; i < cutLen; i++) {
        dst[i] = src[start + i] || 0;
      }
    }
    setClipboard(clipBuf);
    handleDeleteSelection();
    onShowToast?.('Cut selection to clipboard.');
  };

  // 4. Copy
  const handleCopy = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const start = selection ? Math.min(selection.start, selection.end) : 0;
    const end = selection ? Math.max(selection.start, selection.end) : currentBuffer.length;
    const copyLen = end - start;

    const clipBuf = ctx.createBuffer(currentBuffer.numberOfChannels, copyLen, currentBuffer.sampleRate);
    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const src = currentBuffer.getChannelData(ch);
      const dst = clipBuf.getChannelData(ch);
      for (let i = 0; i < copyLen; i++) {
        dst[i] = src[start + i] || 0;
      }
    }
    setClipboard(clipBuf);
    onShowToast?.(`Copied ${(copyLen / currentBuffer.sampleRate).toFixed(2)}s to clipboard.`);
  };

  // 5. Paste
  const handlePaste = () => {
    if (!currentBuffer || !clipboard) return;
    const ctx = getAudioContext();
    const insertPos = selection ? Math.min(selection.start, selection.end) : playheadFrame;
    const newLen = currentBuffer.length + clipboard.length;

    const newBuf = ctx.createBuffer(currentBuffer.numberOfChannels, newLen, currentBuffer.sampleRate);
    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const src = currentBuffer.getChannelData(ch);
      const clip = clipboard.getChannelData(Math.min(ch, clipboard.numberOfChannels - 1));
      const dst = newBuf.getChannelData(ch);

      dst.set(src.subarray(0, insertPos), 0);
      dst.set(clip, insertPos);
      dst.set(src.subarray(insertPos), insertPos + clip.length);
    }

    setSelection(null);
    pushHistory(newBuf, 'Paste Audio');
    onShowToast?.('Pasted audio from clipboard.');
  };

  // 6. Silence
  const handleSilence = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const start = selection ? Math.min(selection.start, selection.end) : 0;
    const end = selection ? Math.max(selection.start, selection.end) : currentBuffer.length;

    const newBuf = cloneAudioBuffer(ctx, currentBuffer);
    for (let ch = 0; ch < newBuf.numberOfChannels; ch++) {
      const data = newBuf.getChannelData(ch);
      for (let i = start; i < end; i++) {
        data[i] = 0;
      }
    }

    pushHistory(newBuf, 'Silence Region');
    onShowToast?.('Silenced audio region.');
  };

  // 7. Reverse
  const handleReverse = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const start = selection ? Math.min(selection.start, selection.end) : 0;
    const end = selection ? Math.max(selection.start, selection.end) : currentBuffer.length;
    const len = end - start;

    const newBuf = cloneAudioBuffer(ctx, currentBuffer);
    for (let ch = 0; ch < newBuf.numberOfChannels; ch++) {
      const data = newBuf.getChannelData(ch);
      const temp = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        temp[i] = data[start + i];
      }
      for (let i = 0; i < len; i++) {
        data[start + i] = temp[len - 1 - i];
      }
    }

    pushHistory(newBuf, 'Reverse Audio');
    onShowToast?.('Reversed audio.');
  };

  // 8. Snap Zero-Crossings
  const handleSnapZeroCrossings = () => {
    if (!currentBuffer || !selection) return;
    const data = currentBuffer.getChannelData(0);
    const findZero = (target: number) => {
      let best = target;
      let minVal = Math.abs(data[target] || 0);
      for (let i = 1; i < 256; i++) {
        const left = target - i;
        if (left >= 0 && Math.abs(data[left]) < minVal) {
          minVal = Math.abs(data[left]);
          best = left;
          if (minVal < 0.001) break;
        }
        const right = target + i;
        if (right < data.length && Math.abs(data[right]) < minVal) {
          minVal = Math.abs(data[right]);
          best = right;
          if (minVal < 0.001) break;
        }
      }
      return best;
    };

    const sStart = Math.min(selection.start, selection.end);
    const sEnd = Math.max(selection.start, selection.end);
    const newStart = findZero(sStart);
    const newEnd = findZero(sEnd);

    setSelection({ start: newStart, end: newEnd });
    onShowToast?.('Snapped selection to zero-crossings (anti-click).');
  };

  // DSP HANDLERS
  // 1. EQ
  const handleApplyEQ = async () => {
    if (!currentBuffer) return;
    try {
      const offlineCtx = new OfflineAudioContext(
        currentBuffer.numberOfChannels,
        currentBuffer.length,
        currentBuffer.sampleRate
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = currentBuffer;

      const lowShelf = offlineCtx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 80;
      lowShelf.gain.value = eqLow;

      const lowMid = offlineCtx.createBiquadFilter();
      lowMid.type = 'peaking';
      lowMid.frequency.value = 350;
      lowMid.Q.value = 1.0;
      lowMid.gain.value = eqLowMid;

      const mid = offlineCtx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1.0;
      mid.gain.value = eqMid;

      const highMid = offlineCtx.createBiquadFilter();
      highMid.type = 'peaking';
      highMid.frequency.value = 3500;
      highMid.Q.value = 1.0;
      highMid.gain.value = eqHighMid;

      const highShelf = offlineCtx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 10000;
      highShelf.gain.value = eqHigh;

      source.connect(lowShelf);
      lowShelf.connect(lowMid);
      lowMid.connect(mid);
      mid.connect(highMid);
      highMid.connect(highShelf);
      highShelf.connect(offlineCtx.destination);

      source.start(0);
      const rendered = await offlineCtx.startRendering();
      pushHistory(rendered, 'Parametric 5-Band EQ');
      onShowToast?.('Applied 5-band parametric EQ.');
    } catch (e) {
      console.error('EQ processing error:', e);
    }
  };

  // 2. Normalize
  const handleApplyNormalize = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    let maxPeak = 0;
    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const data = currentBuffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal > maxPeak) maxPeak = absVal;
      }
    }

    if (maxPeak === 0) return;
    const targetLinear = Math.pow(10, normTargetDb / 20);
    const multiplier = targetLinear / maxPeak;

    const newBuf = cloneAudioBuffer(ctx, currentBuffer);
    for (let ch = 0; ch < newBuf.numberOfChannels; ch++) {
      const data = newBuf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        data[i] *= multiplier;
      }
    }

    pushHistory(newBuf, `Normalize to ${normTargetDb}dB`);
    onShowToast?.(`Normalized to ${normTargetDb}dB.`);
  };

  // 3. Compressor
  const handleApplyCompressor = async () => {
    if (!currentBuffer) return;
    try {
      const offlineCtx = new OfflineAudioContext(
        currentBuffer.numberOfChannels,
        currentBuffer.length,
        currentBuffer.sampleRate
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = currentBuffer;

      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = compThreshold;
      comp.ratio.value = compRatio;
      comp.knee.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;

      source.connect(comp);
      comp.connect(offlineCtx.destination);
      source.start(0);

      const rendered = await offlineCtx.startRendering();
      pushHistory(rendered, 'Smart Compressor');
      onShowToast?.('Applied dynamics compressor.');
    } catch (e) {
      console.error('Compressor error:', e);
    }
  };

  // 4. Reverb
  const handleApplyReverb = async () => {
    if (!currentBuffer) return;
    try {
      const offlineCtx = new OfflineAudioContext(
        currentBuffer.numberOfChannels,
        currentBuffer.length,
        currentBuffer.sampleRate
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = currentBuffer;

      // Synthetic impulse response for algorithmic reverb
      const length = Math.floor(offlineCtx.sampleRate * (reverbSize / 35));
      const impulse = offlineCtx.createBuffer(2, length, offlineCtx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const decay = Math.exp(-i / (offlineCtx.sampleRate * (reverbSize / 80)));
          channelData[i] = ((Math.random() * 2 - 1) * decay);
        }
      }

      const convolver = offlineCtx.createConvolver();
      convolver.buffer = impulse;

      const wetGain = offlineCtx.createGain();
      wetGain.gain.value = reverbMix / 100;
      const dryGain = offlineCtx.createGain();
      dryGain.gain.value = 1.0 - (reverbMix / 200);

      source.connect(dryGain);
      source.connect(convolver);
      convolver.connect(wetGain);

      dryGain.connect(offlineCtx.destination);
      wetGain.connect(offlineCtx.destination);

      source.start(0);
      const rendered = await offlineCtx.startRendering();
      pushHistory(rendered, 'Studio Reverb');
      onShowToast?.('Applied studio reverb.');
    } catch (e) {
      console.error('Reverb error:', e);
    }
  };

  // 5. Echo / Delay DSP
  const handleApplyEcho = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const processed = applyEchoDsp(
      ctx,
      currentBuffer,
      {
        delayTimeMs: echoDelayMs,
        feedback: echoFeedback,
        wetMix: echoWetMix,
        dryMix: 1.0,
        dampingHz: echoDampingHz,
        pingPong: echoPingPong,
      },
      selection
    );
    pushHistory(processed, 'Stereo Echo / Delay');
    onShowToast?.('Applied stereo echo & ping-pong delay.');
  };

  // 6. Phaser DSP
  const handleApplyPhaser = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const processed = applyPhaserDsp(
      ctx,
      currentBuffer,
      {
        stages: phaserStages,
        rateHz: phaserRateHz,
        depthHz: phaserDepthHz,
        baseFreqHz: 400,
        feedback: phaserFeedback,
        wetMix: phaserWetMix,
        stereoPhaseDeg: phaserStereoPhase,
      },
      selection
    );
    pushHistory(processed, `${phaserStages}-Stage Analog Phaser`);
    onShowToast?.(`Applied ${phaserStages}-stage analog phaser.`);
  };

  // 7. Robot Voice & Ring Modulator DSP
  const handleApplyRobotVoice = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const processed = applyRobotVoiceDsp(
      ctx,
      currentBuffer,
      {
        carrierFreqHz: robotCarrierFreq,
        carrierWave: robotCarrierWave,
        ringModDepth: robotRingModDepth,
        metallicResonance: robotResonance,
        formantBitCrush: robotBitCrush,
        wetMix: robotWetMix,
      },
      selection
    );
    pushHistory(processed, 'Cyber Robot Voice');
    onShowToast?.('Applied cybernetic robot voice & ring-modulator.');
  };

  // 8. Entrauschen & De-Hiss DSP
  const handleApplyDenoise = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const processed = applyDenoiseDsp(
      ctx,
      currentBuffer,
      {
        thresholdDb: denoiseThresholdDb,
        reductionAmountDb: denoiseReductionDb,
        hissCutoffHz: denoiseHissCutoffHz,
        attackMs: 5,
        releaseMs: 60,
      },
      selection
    );
    pushHistory(processed, 'Spectral Denoise / De-Hiss');
    onShowToast?.('Applied spectral noise reduction & de-hiss.');
  };

  // 9. Center Vocal Remover (L-R Phase Subtraction)
  const handleApplyVocalRemover = () => {
    if (!currentBuffer || currentBuffer.numberOfChannels < 2) {
      onShowToast?.('Vocal remover requires a stereo sample.');
      return;
    }
    const ctx = getAudioContext();
    const newBuf = ctx.createBuffer(2, currentBuffer.length, currentBuffer.sampleRate);
    const left = currentBuffer.getChannelData(0);
    const right = currentBuffer.getChannelData(1);
    const dstL = newBuf.getChannelData(0);
    const dstR = newBuf.getChannelData(1);

    for (let i = 0; i < currentBuffer.length; i++) {
      const diff = (left[i] - right[i]) * 0.707;
      dstL[i] = diff;
      dstR[i] = -diff;
    }

    pushHistory(newBuf, 'Center Vocal Remover');
    onShowToast?.('Removed center vocals (L-R phase cancellation).');
  };

  // 10. Pitch & Speed Time Stretch
  const handleApplyPitchTime = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const pitchRatio = Math.pow(2, pitchSemitones / 12);
    const speedRatio = timeStretchFactor / 100;
    const totalRatio = pitchRatio * speedRatio;

    const newLength = Math.max(64, Math.round(currentBuffer.length / totalRatio));
    const newBuf = ctx.createBuffer(currentBuffer.numberOfChannels, newLength, currentBuffer.sampleRate);

    for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
      const src = currentBuffer.getChannelData(ch);
      const dst = newBuf.getChannelData(ch);

      for (let i = 0; i < newLength; i++) {
        const srcPos = i * totalRatio;
        const idx0 = Math.floor(srcPos);
        const idx1 = Math.min(src.length - 1, idx0 + 1);
        const frac = srcPos - idx0;
        dst[i] = src[idx0] * (1 - frac) + (src[idx1] || 0) * frac;
      }
    }

    pushHistory(newBuf, `Pitch (${pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}st)`);
    onShowToast?.(`Applied pitch shift (${pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} semitones).`);
  };

  // 11. Sample Merger & Fusion
  const handleImportSecondSampleForMerge = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ctx = getAudioContext();
      const arrayBuf = await file.arrayBuffer();
      const decoded = await decodeAudioBufferSafe(arrayBuf, ctx);
      setSecondSampleBuffer(decoded.buffer);
      setSecondSampleFileName(file.name);
      setMergeSlotB(-1);
      onShowToast?.(`Loaded 2nd sample: "${file.name}"`);
    } catch (e) {
      console.error('Error importing 2nd sample:', e);
      onShowToast?.('Failed to load 2nd sample.');
    }
  };

  const handleApplyMerge = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();

    let bufferB: AudioBuffer | null = null;
    if (mergeSlotB === -1 && secondSampleBuffer) {
      bufferB = secondSampleBuffer;
    } else if (samples[mergeSlotB]?.buffer) {
      bufferB = samples[mergeSlotB].buffer;
    }

    if (!bufferB) {
      onShowToast?.('Please select a valid 2nd sample slot or import an audio file.');
      return;
    }

    const merged = mergeAudioBuffers(ctx, currentBuffer, bufferB, {
      mode: mergeMode,
      bufferAWeight: mergeGainA,
      bufferBWeight: mergeGainB,
      crossfadeDurationMs: mergeCrossfadeMs,
      silenceGapMs: mergeSilenceGapMs,
    });

    pushHistory(merged, `Merge Sample (${mergeMode})`);
    onShowToast?.(`Merged samples using "${mergeMode}" mode.`);
  };

  // 12. Fade Curves
  const handleApplyFade = (type: FadeType, curve: FadeCurve) => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const processed = applyFadeCurveDsp(ctx, currentBuffer, type, curve, selection);
    pushHistory(processed, `Fade ${type === 'in' ? 'In' : 'Out'} (${curve})`);
    onShowToast?.(`Applied Fade ${type === 'in' ? 'In' : 'Out'} (${curve}).`);
  };

  // 13. Phase Invert
  const handleInvert = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const start = selection ? Math.min(selection.start, selection.end) : 0;
    const end = selection ? Math.max(selection.start, selection.end) : currentBuffer.length;

    const newBuf = cloneAudioBuffer(ctx, currentBuffer);
    for (let ch = 0; ch < newBuf.numberOfChannels; ch++) {
      const data = newBuf.getChannelData(ch);
      for (let i = start; i < end; i++) {
        data[i] = -data[i];
      }
    }

    pushHistory(newBuf, 'Invert Phase');
    onShowToast?.('Inverted audio phase (180° polarity flip).');
  };

  // 14. Amiga Paula 8364 Sound Chip DAC & LED Filter
  const handleApplyAmigaPaula = async () => {
    if (!currentBuffer) return;
    try {
      const offlineCtx = new OfflineAudioContext(
        currentBuffer.numberOfChannels,
        currentBuffer.length,
        currentBuffer.sampleRate
      );

      const quantizeLevels = Math.pow(2, amigaQuantizeBits - 1);
      const bitcrushedBuf = offlineCtx.createBuffer(
        currentBuffer.numberOfChannels,
        currentBuffer.length,
        currentBuffer.sampleRate
      );

      for (let ch = 0; ch < currentBuffer.numberOfChannels; ch++) {
        const src = currentBuffer.getChannelData(ch);
        const dst = bitcrushedBuf.getChannelData(ch);
        for (let i = 0; i < src.length; i++) {
          dst[i] = Math.round(src[i] * quantizeLevels) / quantizeLevels;
        }
      }

      const source = offlineCtx.createBufferSource();
      source.buffer = bitcrushedBuf;

      if (amigaLedFilter) {
        const lowpass = offlineCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 4400;
        lowpass.Q.value = 0.707;
        source.connect(lowpass);
        lowpass.connect(offlineCtx.destination);
      } else {
        source.connect(offlineCtx.destination);
      }

      source.start(0);
      const rendered = await offlineCtx.startRendering();
      pushHistory(rendered, `Amiga Paula (${amigaQuantizeBits}-Bit${amigaLedFilter ? ' + LED' : ''})`);
      onShowToast?.(`Processed audio with Amiga Paula 8364 (${amigaQuantizeBits}-bit).`);
    } catch (e) {
      console.error('Amiga Paula error:', e);
    }
  };

  // 15. Lo-Fi Bitcrush & Drive
  const handleApplyBitcrush = () => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const newBuf = cloneAudioBuffer(ctx, currentBuffer);
    const quantizeLevels = Math.pow(2, bitcrushBits - 1);
    const holdPeriod = Math.max(1, Math.round(currentBuffer.sampleRate / sampleRateReduce));
    const driveNorm = 1 + (saturationDrive / 25);

    for (let ch = 0; ch < newBuf.numberOfChannels; ch++) {
      const data = newBuf.getChannelData(ch);
      let heldSample = 0;

      for (let i = 0; i < data.length; i++) {
        if (i % holdPeriod === 0) {
          let s = data[i] * driveNorm;
          if (saturationDrive > 0) {
            s = Math.tanh(s);
          }
          heldSample = Math.round(s * quantizeLevels) / quantizeLevels;
        }
        data[i] = heldSample;
      }
    }

    pushHistory(newBuf, `Bitcrush (${bitcrushBits}-Bit @ ${(sampleRateReduce / 1000).toFixed(0)}kHz)`);
    onShowToast?.(`Applied Bitcrush (${bitcrushBits}-Bit @ ${(sampleRateReduce / 1000).toFixed(0)}kHz).`);
  };

  // 16. Tone Generator
  const handleGenerateSynthTone = () => {
    const ctx = getAudioContext();
    const sampleRate = 44100;
    const totalSamples = Math.floor(sampleRate * genDurationSec);
    const newBuf = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = newBuf.getChannelData(0);

    const phaseInc = (2 * Math.PI * genFrequency) / sampleRate;
    let phase = 0;

    for (let i = 0; i < totalSamples; i++) {
      let val = 0;
      switch (genWaveType) {
        case 'sine':
          val = Math.sin(phase);
          break;
        case 'square':
          val = Math.sin(phase) >= 0 ? 0.75 : -0.75;
          break;
        case 'sawtooth':
          val = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
          break;
        case 'triangle':
          val = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
          break;
        case 'noise':
          val = (Math.random() * 2 - 1) * 0.75;
          break;
        case 'pulse':
          val = ((phase / (2 * Math.PI)) % 1) < 0.25 ? 0.75 : -0.75;
          break;
      }
      phase += phaseInc;
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

      // Soft fade at edges to prevent pop clicks
      const edge = Math.min(i, totalSamples - 1 - i);
      const edgeGain = Math.min(1.0, edge / 128);
      data[i] = val * edgeGain * 0.8;
    }

    setSampleName(`Tone_${genWaveType}_${genFrequency}Hz`);
    setLoopStart(0);
    setLoopEnd(totalSamples);
    setLoopEnabled(true);
    pushHistory(newBuf, `Generate ${genWaveType} ${genFrequency}Hz`);
    onShowToast?.(`Generated ${genWaveType} tone @ ${genFrequency}Hz (${genDurationSec}s).`);
  };

  // 17. Chirp Sweep Generator
  const handleGenerateChirp = () => {
    const ctx = getAudioContext();
    const sampleRate = 44100;
    const duration = 0.5;
    const totalSamples = Math.floor(sampleRate * duration);
    const newBuf = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = newBuf.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / totalSamples;
      const curFreq = genChirpStart + t * (genChirpEnd - genChirpStart);
      const phaseInc = (2 * Math.PI * curFreq) / sampleRate;
      phase += phaseInc;

      const edge = Math.min(i, totalSamples - 1 - i);
      const edgeGain = Math.min(1.0, edge / 64);
      data[i] = Math.sin(phase) * edgeGain * 0.85;
    }

    setSampleName(`Chirp_${genChirpStart}-${genChirpEnd}Hz`);
    setLoopStart(0);
    setLoopEnd(totalSamples);
    setLoopEnabled(false);
    pushHistory(newBuf, `Chirp Sweep ${genChirpStart}-${genChirpEnd}Hz`);
    onShowToast?.(`Generated Chirp Sweep (${genChirpStart}Hz ➔ ${genChirpEnd}Hz).`);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (isPlaying) stopPlayback();
        else startPlayback();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
      } else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        if (currentBuffer) {
          e.preventDefault();
          e.stopPropagation();
          setSelection({ start: 0, end: currentBuffer.length });
          onShowToast?.(`Selected all ${currentBuffer.length} samples (${(currentBuffer.duration).toFixed(3)}s).`);
        }
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleCopy();
      } else if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleCut();
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        handlePaste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteSelection();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isPlaying) stopPlayback();
        else onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, selection, currentBuffer, onShowToast, startPlayback, stopPlayback, handleUndo, handleRedo, handleCopy, handleCut, handlePaste, handleDeleteSelection, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      key="syn-editor-fullscreen-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#445166] flex flex-col text-slate-100 font-sans overflow-hidden select-none"
    >
          {/* Ambient subtle vignette overlay */}
          <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

          {/* 1. TOP WORKSTATION HEADER */}
          <motion.header
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -70, opacity: 0, transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
            className="relative z-50 px-3 py-1.5 flex items-center justify-between gap-2.5 select-none glass-panel-header text-[#cbd5e1] shrink-0 min-w-max"
          >
            {/* LEFT GROUP: Branding & Persona Switcher */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 shrink-0">
                <div
                  className="w-8 h-8 rounded-lg bg-[#141d27]/70 backdrop-blur-sm border border-[#27364a]/80 flex items-center justify-center shrink-0 shadow-inner text-sky-400"
                  title="SYN-Editor Audio & DSP FX Studio"
                >
                  <Waves className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 leading-none">
                    <span className="font-bold tracking-tight text-sm text-[#f8fafc] font-display">
                      SYN-EDITOR
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono font-bold truncate text-sky-400">
                    Slot {activeSlot.toString().padStart(2, '0')}: {sampleName || 'Empty'}
                  </div>
                </div>
              </div>

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {/* Persona Switcher */}
              <PersonaSwitcher
                activePersona="editor"
                onSelectPersona={(persona) => {
                  if (persona === 'tracker') {
                    onClose();
                  } else if (persona === 'visualizer') {
                    if (onSwitchPersona) onSwitchPersona('visualizer');
                    else onClose();
                  } else if (persona === 'cover') {
                    if (onSwitchPersona) onSwitchPersona('cover');
                    else onClose();
                  }
                }}
                showLabels={true}
              />

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {/* Main Transport Console (PLAY, STOP, LOOP, MIC REC, UNDO, REDO) - Exactly matching Tracker Console */}
              <div className="flex items-center gap-1 bg-[#070b10]/65 backdrop-blur-sm p-1 rounded-lg border border-[#1a2536]/80">
                <button
                  id="syn-header-btn-play"
                  onClick={isPlaying ? stopPlayback : startPlayback}
                  className={`h-7 px-3.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss ${
                    isPlaying 
                      ? 'aqua-amber' 
                      : 'aqua-dark hover:border-[#1b5e47] text-[#e2e8f0]'
                  }`}
                  title="Play / Pause Sample (Spacebar)"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current shrink-0 text-[#fbbf24]" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current shrink-0 text-[#34d399]" />
                  )}
                  <span className={isPlaying ? 'text-[#fbbf24]' : 'text-[#e2e8f0]'}>
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </span>
                </button>

                <button
                  id="syn-header-btn-stop"
                  onClick={stopPlayback}
                  className="h-7 px-3 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss aqua-dark hover:border-[#5c1f2d] text-[#e2e8f0]"
                  title="Stop (Spacebar)"
                >
                  <Square className="w-3 h-3 fill-current shrink-0 text-[#f43f5e]" />
                  <span>STOP</span>
                </button>

                {/* Continuous Loop Playback Button */}
                <button
                  id="syn-header-btn-loop"
                  onClick={() => setIsLoopPlayback(!isLoopPlayback)}
                  className={`h-7 px-3 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss transition-all ${
                    isLoopPlayback 
                      ? 'aqua-blue ring-1 ring-sky-400/40 text-[#38bdf8]' 
                      : 'aqua-dark text-[#94a3b8] hover:text-[#e2e8f0]'
                  }`}
                  title={isLoopPlayback ? 'Loop Playback: ACTIVE (loops continuously)' : 'Loop Playback: OFF (plays once)'}
                >
                  <Repeat className={`w-3.5 h-3.5 shrink-0 ${isLoopPlayback ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
                  <span className={isLoopPlayback ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}>
                    LOOP
                  </span>
                </button>

                {/* Microphone Live Recording */}
                <button
                  id="syn-header-btn-record"
                  onClick={handleToggleRecord}
                  className={`h-7 px-3 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss ${
                    isRecording 
                      ? 'aqua-red animate-pulse ring-1 ring-rose-400/40 text-[#fb7185]' 
                      : 'aqua-dark text-[#94a3b8] hover:text-white'
                  }`}
                  title="Record Live Audio from Microphone"
                >
                  {isRecording ? (
                    <MicOff className="w-3.5 h-3.5 shrink-0 text-[#fb7185]" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 shrink-0 text-[#fb7185]" />
                  )}
                  <span className={isRecording ? 'text-[#fb7185]' : 'text-[#94a3b8]'}>
                    {isRecording ? `● REC ${recordingSeconds.toFixed(1)}s` : 'MIC REC'}
                  </span>
                </button>

                <div className="h-4 w-[1px] bg-[#1a2636] mx-0.5" />

                {/* History Undo / Redo */}
                <button
                  id="syn-header-btn-undo"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                    historyIndex > 0 ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                  }`}
                  title="Undo Sample Edit (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Undo</span>
                </button>

                <button
                  id="syn-header-btn-redo"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                    historyIndex < history.length - 1 ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                  }`}
                  title="Redo Sample Edit (Ctrl+Y / Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Redo</span>
                </button>
              </div>

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {/* Slot Selector & Sample Name */}
              <div className="flex items-center gap-1.5 bg-[#070b10]/65 backdrop-blur-sm p-1 rounded-lg border border-[#1a2536]/80">
                <div className="flex items-center gap-1 bg-[#101824] px-2 py-0.5 rounded border border-[#223348] text-xs">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">SLOT:</span>
                  <select
                    value={activeSlot}
                    onChange={(e) => setActiveSlot(Number(e.target.value))}
                    className="bg-transparent text-xs font-mono font-bold text-sky-300 focus:outline-none cursor-pointer"
                  >
                    {samples.map((s, idx) => (
                      <option key={idx} value={idx} className="bg-[#0c121b] text-slate-200">
                        {idx.toString().padStart(2, '0')}: {s.name || 'Empty'} {s.buffer ? '●' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="Sample Name..."
                  className="bg-[#101824] border border-[#223348] text-xs font-mono font-bold text-white px-2 py-0.5 rounded focus:outline-none focus:border-sky-500 w-24 sm:w-32"
                  maxLength={24}
                />

                <button
                  onClick={handleApplyToSlot}
                  className="aqua-gloss aqua-green h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Apply edited audio into tracker sample slot"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply</span>
                </button>
              </div>
            </div>

            {/* RIGHT GROUP: Import/Export, Support & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aqua-gloss aqua-theme h-7 px-2 rounded flex items-center gap-1 cursor-pointer font-bold text-xs"
                title="Import Audio File (.WAV, .MP3, .AIFF, .OGG, .FLAC, .IFF)"
              >
                <Upload className="w-3 h-3" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={handleExportWav}
                className="aqua-gloss aqua-blue h-7 px-2 rounded flex items-center gap-1 cursor-pointer font-mono font-bold text-xs"
                title="Export 16-Bit PCM WAV"
              >
                <Download className="w-3 h-3" />
                <span>WAV</span>
              </button>

              <button
                onClick={handleExportMp3}
                className="aqua-gloss aqua-blue h-7 px-2 rounded flex items-center gap-1 cursor-pointer font-mono font-bold text-xs"
                title="Export 192kbps MP3"
              >
                <Download className="w-3 h-3" />
                <span>MP3</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.aiff,.aif,.ogg,.flac,.iff,.8svx"
                className="hidden"
                onChange={handleImportFile}
              />

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {showSupportButton && (
                onOpenSupport ? (
                  <button
                    onClick={onOpenSupport}
                    className="h-7 px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer border border-amber-500/40 hover:border-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 font-mono text-xs font-bold transition-all shadow-[0_0_10px_rgba(251,191,36,0.12)] hidden sm:flex"
                    title="Support SYN-Tracker & Buy Me a Coffee"
                  >
                    <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Support</span>
                  </button>
                ) : (
                  <a
                    href="https://buymeacoffee.com/hj_wuethrich"
                    target="_blank"
                    rel="noreferrer"
                    className="h-7 px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer border border-amber-500/40 hover:border-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 font-mono text-xs font-bold transition-all shadow-[0_0_10px_rgba(251,191,36,0.12)] hidden sm:flex"
                    title="Support SYN-Tracker & Buy Me a Coffee"
                  >
                    <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Support</span>
                  </a>
                )
              )}

              <button
                onClick={onClose}
                className="aqua-gloss aqua-dark h-7 w-7 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer border border-[#27364a]/80"
                title="Exit SYN-Editor (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.header>

          {/* 2. MAIN BODY: SPLIT VIEW (LEFT SIDEBAR CONTROLS, RIGHT HIGH-RES WAVEFORM STAGE) */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0 p-3 gap-2.5">
            {/* LEFT SIDEBAR: DSP, PHASER, ROBOT VOICE, MERGER & RETRO TOOLS (5 COLS) */}
            <motion.div
              initial={{ x: '-100%', opacity: 0, scale: 0.96 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: '-100%', opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-[#0b1018]/85 backdrop-blur-md border border-[#1e2d42] rounded-xl p-3 flex flex-col shadow-2xl overflow-hidden min-h-0"
            >
              <SynEditorSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                samples={samples}
                activeSlot={activeSlot}
                eqLow={eqLow} setEqLow={setEqLow}
                eqLowMid={eqLowMid} setEqLowMid={setEqLowMid}
                eqMid={eqMid} setEqMid={setEqMid}
                eqHighMid={eqHighMid} setEqHighMid={setEqHighMid}
                eqHigh={eqHigh} setEqHigh={setEqHigh}
                onApplyEQ={handleApplyEQ}
                normTargetDb={normTargetDb} setNormTargetDb={setNormTargetDb}
                onApplyNormalize={handleApplyNormalize}
                compThreshold={compThreshold} setCompThreshold={setCompThreshold}
                compRatio={compRatio} setCompRatio={setCompRatio}
                onApplyCompressor={handleApplyCompressor}
                reverbSize={reverbSize} setReverbSize={setReverbSize}
                reverbMix={reverbMix} setReverbMix={setReverbMix}
                onApplyReverb={handleApplyReverb}
                echoDelayMs={echoDelayMs} setEchoDelayMs={setEchoDelayMs}
                echoFeedback={echoFeedback} setEchoFeedback={setEchoFeedback}
                echoWetMix={echoWetMix} setEchoWetMix={setEchoWetMix}
                echoDampingHz={echoDampingHz} setEchoDampingHz={setEchoDampingHz}
                echoPingPong={echoPingPong} setEchoPingPong={setEchoPingPong}
                onApplyEcho={handleApplyEcho}
                phaserStages={phaserStages} setPhaserStages={setPhaserStages}
                phaserRateHz={phaserRateHz} setPhaserRateHz={setPhaserRateHz}
                phaserDepthHz={phaserDepthHz} setPhaserDepthHz={setPhaserDepthHz}
                phaserFeedback={phaserFeedback} setPhaserFeedback={setPhaserFeedback}
                phaserWetMix={phaserWetMix} setPhaserWetMix={setPhaserWetMix}
                phaserStereoPhase={phaserStereoPhase} setPhaserStereoPhase={setPhaserStereoPhase}
                onApplyPhaser={handleApplyPhaser}
                robotCarrierFreq={robotCarrierFreq} setRobotCarrierFreq={setRobotCarrierFreq}
                robotCarrierWave={robotCarrierWave} setRobotCarrierWave={setRobotCarrierWave}
                robotRingModDepth={robotRingModDepth} setRobotRingModDepth={setRobotRingModDepth}
                robotResonance={robotResonance} setRobotResonance={setRobotResonance}
                robotBitCrush={robotBitCrush} setRobotBitCrush={setRobotBitCrush}
                robotWetMix={robotWetMix} setRobotWetMix={setRobotWetMix}
                onApplyRobotVoice={handleApplyRobotVoice}
                denoiseThresholdDb={denoiseThresholdDb} setDenoiseThresholdDb={setDenoiseThresholdDb}
                denoiseReductionDb={denoiseReductionDb} setDenoiseReductionDb={setDenoiseReductionDb}
                denoiseHissCutoffHz={denoiseHissCutoffHz} setDenoiseHissCutoffHz={setDenoiseHissCutoffHz}
                onApplyDenoise={handleApplyDenoise}
                onApplyVocalRemover={handleApplyVocalRemover}
                pitchSemitones={pitchSemitones} setPitchSemitones={setPitchSemitones}
                timeStretchFactor={timeStretchFactor} setTimeStretchFactor={setTimeStretchFactor}
                onApplyPitchTime={handleApplyPitchTime}
                mergeSlotB={mergeSlotB} setMergeSlotB={setMergeSlotB}
                mergeMode={mergeMode} setMergeMode={setMergeMode}
                mergeGainA={mergeGainA} setMergeGainA={setMergeGainA}
                mergeGainB={mergeGainB} setMergeGainB={setMergeGainB}
                mergeCrossfadeMs={mergeCrossfadeMs} setMergeCrossfadeMs={setMergeCrossfadeMs}
                mergeSilenceGapMs={mergeSilenceGapMs} setMergeSilenceGapMs={setMergeSilenceGapMs}
                onApplyMerge={handleApplyMerge}
                onImportSecondSampleForMerge={handleImportSecondSampleForMerge}
                secondSampleFileName={secondSampleFileName}
                onApplyFade={handleApplyFade}
                onInvertPhase={handleInvert}
                amigaQuantizeBits={amigaQuantizeBits} setAmigaQuantizeBits={setAmigaQuantizeBits}
                amigaLedFilter={amigaLedFilter} setAmigaLedFilter={setAmigaLedFilter}
                onApplyAmigaPaula={handleApplyAmigaPaula}
                bitcrushBits={bitcrushBits} setBitcrushBits={setBitcrushBits}
                sampleRateReduce={sampleRateReduce} setSampleRateReduce={setSampleRateReduce}
                saturationDrive={saturationDrive} setSaturationDrive={setSaturationDrive}
                onApplyBitcrush={handleApplyBitcrush}
                genWaveType={genWaveType} setGenWaveType={setGenWaveType}
                genFrequency={genFrequency} setGenFrequency={setGenFrequency}
                genDurationSec={genDurationSec} setGenDurationSec={setGenDurationSec}
                onGenerateTone={handleGenerateSynthTone}
                genChirpStart={genChirpStart} setGenChirpStart={setGenChirpStart}
                genChirpEnd={genChirpEnd} setGenChirpEnd={setGenChirpEnd}
                onGenerateChirp={handleGenerateChirp}
              />
            </motion.div>

            {/* RIGHT MAIN AREA: HIGH-PRECISION WAVEFORM STAGE & TRANSPORT (7 COLS) */}
            <motion.div
              initial={{ x: '100%', opacity: 0, scale: 0.96 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: '100%', opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
              className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 bg-[#0b1018]/85 backdrop-blur-md border border-[#1e2d42] rounded-xl p-3 flex flex-col shadow-2xl overflow-hidden min-h-0"
            >
              <SynEditorWaveform
                currentBuffer={currentBuffer}
                selection={selection}
                setSelection={setSelection}
                loopStart={loopStart}
                setLoopStart={setLoopStart}
                loopEnd={loopEnd}
                setLoopEnd={setLoopEnd}
                loopEnabled={loopEnabled}
                setLoopEnabled={setLoopEnabled}
                isPlaying={isPlaying}
                isLoopPlayback={isLoopPlayback}
                setIsLoopPlayback={setIsLoopPlayback}
                onStartPlayback={startPlayback}
                onStopPlayback={stopPlayback}
                playheadFrame={playheadFrame}
                meterLevels={meterLevels}
                viewMode={viewMode}
                setViewMode={setViewMode}
                zoom={zoom}
                setZoom={setZoom}
                scrollOffset={scrollOffset}
                setScrollOffset={setScrollOffset}
                onCut={handleCut}
                onCopy={handleCopy}
                onPaste={handlePaste}
                onDeleteSelection={handleDeleteSelection}
                onTrim={handleTrim}
                onSilence={handleSilence}
                onReverse={handleReverse}
                onSnapZeroCrossings={handleSnapZeroCrossings}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                hasClipboard={clipboard !== null}
                isRecording={isRecording}
                recordingSeconds={recordingSeconds}
                onToggleRecord={handleToggleRecord}
              />
            </motion.div>
          </div>
        </motion.div>
  );
};
