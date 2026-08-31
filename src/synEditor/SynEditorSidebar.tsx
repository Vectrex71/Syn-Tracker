/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sliders,
  Sparkles,
  Waves,
  Disc,
  Clock,
  Layers,
  Zap,
  Volume2,
  VolumeX,
  Radio,
  RefreshCw,
  Plus,
  Play,
  Check,
  Scissors,
  Upload,
} from 'lucide-react';
import { TrackerSample } from '../types';
import { FadeCurve, FadeType, MergeMode } from '../utils/sampleEditorDsp';

export type SynEditorTab =
  | 'dsp_rack'
  | 'modulation'
  | 'voice_transform'
  | 'merge_fusion'
  | 'fades_retro'
  | 'generator';

interface SynEditorSidebarProps {
  activeTab: SynEditorTab;
  setActiveTab: (tab: SynEditorTab) => void;
  samples: TrackerSample[];
  activeSlot: number;

  // 1. EQ & Dynamics
  eqLow: number;
  setEqLow: (v: number) => void;
  eqLowMid: number;
  setEqLowMid: (v: number) => void;
  eqMid: number;
  setEqMid: (v: number) => void;
  eqHighMid: number;
  setEqHighMid: (v: number) => void;
  eqHigh: number;
  setEqHigh: (v: number) => void;
  onApplyEQ: () => void;

  normTargetDb: number;
  setNormTargetDb: (v: number) => void;
  onApplyNormalize: () => void;

  compThreshold: number;
  setCompThreshold: (v: number) => void;
  compRatio: number;
  setCompRatio: (v: number) => void;
  onApplyCompressor: () => void;

  // 2. Reverb & Echo
  reverbSize: number;
  setReverbSize: (v: number) => void;
  reverbMix: number;
  setReverbMix: (v: number) => void;
  onApplyReverb: () => void;

  echoDelayMs: number;
  setEchoDelayMs: (v: number) => void;
  echoFeedback: number;
  setEchoFeedback: (v: number) => void;
  echoWetMix: number;
  setEchoWetMix: (v: number) => void;
  echoDampingHz: number;
  setEchoDampingHz: (v: number) => void;
  echoPingPong: boolean;
  setEchoPingPong: (v: boolean) => void;
  onApplyEcho: () => void;

  // 3. Modulation: Phaser & Flanger
  phaserStages: number;
  setPhaserStages: (v: number) => void;
  phaserRateHz: number;
  setPhaserRateHz: (v: number) => void;
  phaserDepthHz: number;
  setPhaserDepthHz: (v: number) => void;
  phaserFeedback: number;
  setPhaserFeedback: (v: number) => void;
  phaserWetMix: number;
  setPhaserWetMix: (v: number) => void;
  phaserStereoPhase: number;
  setPhaserStereoPhase: (v: number) => void;
  onApplyPhaser: () => void;

  // 4. Voice Transformation & Entrauschen
  robotCarrierFreq: number;
  setRobotCarrierFreq: (v: number) => void;
  robotCarrierWave: 'sine' | 'square' | 'sawtooth' | 'pulse';
  setRobotCarrierWave: (v: 'sine' | 'square' | 'sawtooth' | 'pulse') => void;
  robotRingModDepth: number;
  setRobotRingModDepth: (v: number) => void;
  robotResonance: number;
  setRobotResonance: (v: number) => void;
  robotBitCrush: number;
  setRobotBitCrush: (v: number) => void;
  robotWetMix: number;
  setRobotWetMix: (v: number) => void;
  onApplyRobotVoice: () => void;

  denoiseThresholdDb: number;
  setDenoiseThresholdDb: (v: number) => void;
  denoiseReductionDb: number;
  setDenoiseReductionDb: (v: number) => void;
  denoiseHissCutoffHz: number;
  setDenoiseHissCutoffHz: (v: number) => void;
  onApplyDenoise: () => void;

  onApplyVocalRemover: () => void;

  pitchSemitones: number;
  setPitchSemitones: (v: number) => void;
  timeStretchFactor: number;
  setTimeStretchFactor: (v: number) => void;
  onApplyPitchTime: () => void;

  // 5. Sample Merger & Fusion Studio
  mergeSlotB: number;
  setMergeSlotB: (slot: number) => void;
  mergeMode: MergeMode;
  setMergeMode: (mode: MergeMode) => void;
  mergeGainA: number;
  setMergeGainA: (v: number) => void;
  mergeGainB: number;
  setMergeGainB: (v: number) => void;
  mergeCrossfadeMs: number;
  setMergeCrossfadeMs: (v: number) => void;
  mergeSilenceGapMs: number;
  setMergeSilenceGapMs: (v: number) => void;
  onApplyMerge: () => void;
  onImportSecondSampleForMerge: (e: React.ChangeEvent<HTMLInputElement>) => void;
  secondSampleFileName?: string | null;

  // 6. Fades & Retro Paula
  onApplyFade: (type: FadeType, curve: FadeCurve) => void;
  onInvertPhase: () => void;

  amigaQuantizeBits: number;
  setAmigaQuantizeBits: (v: number) => void;
  amigaLedFilter: boolean;
  setAmigaLedFilter: (v: boolean) => void;
  onApplyAmigaPaula: () => void;

  bitcrushBits: number;
  setBitcrushBits: (v: number) => void;
  sampleRateReduce: number;
  setSampleRateReduce: (v: number) => void;
  saturationDrive: number;
  setSaturationDrive: (v: number) => void;
  onApplyBitcrush: () => void;

  // 7. Generators
  genWaveType: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise' | 'pulse';
  setGenWaveType: (v: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise' | 'pulse') => void;
  genFrequency: number;
  setGenFrequency: (v: number) => void;
  genDurationSec: number;
  setGenDurationSec: (v: number) => void;
  onGenerateTone: () => void;

  genChirpStart: number;
  setGenChirpStart: (v: number) => void;
  genChirpEnd: number;
  setGenChirpEnd: (v: number) => void;
  onGenerateChirp: () => void;
}

export const SynEditorSidebar: React.FC<SynEditorSidebarProps> = (props) => {
  const {
    activeTab,
    setActiveTab,
    samples,
    activeSlot,
    eqLow, setEqLow, eqLowMid, setEqLowMid, eqMid, setEqMid, eqHighMid, setEqHighMid, eqHigh, setEqHigh, onApplyEQ,
    normTargetDb, setNormTargetDb, onApplyNormalize,
    compThreshold, setCompThreshold, compRatio, setCompRatio, onApplyCompressor,
    reverbSize, setReverbSize, reverbMix, setReverbMix, onApplyReverb,
    echoDelayMs, setEchoDelayMs, echoFeedback, setEchoFeedback, echoWetMix, setEchoWetMix, echoDampingHz, setEchoDampingHz, echoPingPong, setEchoPingPong, onApplyEcho,
    phaserStages, setPhaserStages, phaserRateHz, setPhaserRateHz, phaserDepthHz, setPhaserDepthHz, phaserFeedback, setPhaserFeedback, phaserWetMix, setPhaserWetMix, phaserStereoPhase, setPhaserStereoPhase, onApplyPhaser,
    robotCarrierFreq, setRobotCarrierFreq, robotCarrierWave, setRobotCarrierWave, robotRingModDepth, setRobotRingModDepth, robotResonance, setRobotResonance, robotBitCrush, setRobotBitCrush, robotWetMix, setRobotWetMix, onApplyRobotVoice,
    denoiseThresholdDb, setDenoiseThresholdDb, denoiseReductionDb, setDenoiseReductionDb, denoiseHissCutoffHz, setDenoiseHissCutoffHz, onApplyDenoise,
    onApplyVocalRemover,
    pitchSemitones, setPitchSemitones, timeStretchFactor, setTimeStretchFactor, onApplyPitchTime,
    mergeSlotB, setMergeSlotB, mergeMode, setMergeMode, mergeGainA, setMergeGainA, mergeGainB, setMergeGainB, mergeCrossfadeMs, setMergeCrossfadeMs, mergeSilenceGapMs, setMergeSilenceGapMs, onApplyMerge, onImportSecondSampleForMerge, secondSampleFileName,
    onApplyFade, onInvertPhase,
    amigaQuantizeBits, setAmigaQuantizeBits, amigaLedFilter, setAmigaLedFilter, onApplyAmigaPaula,
    bitcrushBits, setBitcrushBits, sampleRateReduce, setSampleRateReduce, saturationDrive, setSaturationDrive, onApplyBitcrush,
    genWaveType, setGenWaveType, genFrequency, setGenFrequency, genDurationSec, setGenDurationSec, onGenerateTone,
    genChirpStart, setGenChirpStart, genChirpEnd, setGenChirpEnd, onGenerateChirp,
  } = props;

  const tabs: { id: SynEditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dsp_rack', label: 'DSP & Space', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'modulation', label: 'Phaser & Echo', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: 'voice_transform', label: 'Voice & Denoise', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'merge_fusion', label: 'Sample Merger', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'fades_retro', label: 'Fades & 8-Bit', icon: <Disc className="w-3.5 h-3.5" /> },
    { id: 'generator', label: 'Generators', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sidebar Tab Header */}
      <div className="flex items-center gap-1 border-b border-[#1c293a] pb-2 mb-3 shrink-0 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`aqua-gloss h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? 'aqua-theme text-white' : 'aqua-dark text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panel Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3.5 text-xs">
        
        {/* ========================================================================= */}
        {/* TAB 1: DSP & RAUM (EQ, Normalizer, Compressor, Reverb) */}
        {/* ========================================================================= */}
        {activeTab === 'dsp_rack' && (
          <div className="space-y-3">
            {/* 5-Band Parametric EQ */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> 5-Band Parametric Equalizer
                </span>
                <button
                  onClick={onApplyEQ}
                  className="aqua-gloss aqua-green h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Apply EQ
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
                {[
                  { label: '80Hz', val: eqLow, set: setEqLow },
                  { label: '350Hz', val: eqLowMid, set: setEqLowMid },
                  { label: '1kHz', val: eqMid, set: setEqMid },
                  { label: '3.5kHz', val: eqHighMid, set: setEqHighMid },
                  { label: '10kHz', val: eqHigh, set: setEqHigh },
                ].map((band, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 bg-[#090e17] p-1.5 rounded-lg border border-[#162232]">
                    <span className="text-slate-400 text-[9.5px]">{band.label}</span>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="1"
                      value={band.val}
                      onChange={(e) => band.set(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                    <span className={`font-bold text-[10px] ${band.val > 0 ? 'text-sky-400' : band.val < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {band.val > 0 ? `+${band.val}` : band.val}dB
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Normalizer & Headroom */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">Peak Normalizer</span>
                  <span className="text-[10px] text-slate-400 font-mono">Maximale Lautstärke ohne Clipping</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={normTargetDb}
                    onChange={(e) => setNormTargetDb(Number(e.target.value))}
                    className="bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  >
                    <option value="-0.1">-0.1 dB (Full Master)</option>
                    <option value="-0.5">-0.5 dB</option>
                    <option value="-1.0">-1.0 dB (Headroom)</option>
                    <option value="-3.0">-3.0 dB (Soft Track)</option>
                  </select>
                  <button
                    onClick={onApplyNormalize}
                    className="aqua-gloss aqua-green h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Normalize
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Compressor */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono">Smart Mastering Compressor</span>
                <button
                  onClick={onApplyCompressor}
                  className="aqua-gloss aqua-blue h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Compress
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Threshold:</span>
                    <span className="font-bold text-sky-400">{compThreshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="-6"
                    step="1"
                    value={compThreshold}
                    onChange={(e) => setCompThreshold(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Ratio:</span>
                    <span className="font-bold text-sky-400">{compRatio}:1</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="12"
                    step="0.5"
                    value={compRatio}
                    onChange={(e) => setCompRatio(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Studio Reverb */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Studio Reverb & Spatial Acoustics
                </span>
                <button
                  onClick={onApplyReverb}
                  className="aqua-gloss aqua-theme h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Apply Reverb
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Room Size:</span>
                    <span className="font-bold text-sky-400">{reverbSize}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={reverbSize}
                    onChange={(e) => setReverbSize(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Wet Mix:</span>
                    <span className="font-bold text-sky-400">{reverbMix}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={reverbMix}
                    onChange={(e) => setReverbMix(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MODULATION & PHASER & ECHO */}
        {/* ========================================================================= */}
        {activeTab === 'modulation' && (
          <div className="space-y-3">
            {/* Multi-Stage Analog Phaser */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5" /> Analog Multi-Stage Phaser
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Warmes analoges Allpass-Phasing & Sweeps</span>
                </div>
                <button
                  onClick={onApplyPhaser}
                  className="aqua-gloss aqua-green h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Apply Phaser
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Stages (Poles):</span>
                    <span className="font-bold text-sky-400">{phaserStages} Stages</span>
                  </div>
                  <select
                    value={phaserStages}
                    onChange={(e) => setPhaserStages(Number(e.target.value))}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  >
                    <option value="4">4-Stage (Classic Small Stone)</option>
                    <option value="6">6-Stage (Demoscene Deep)</option>
                    <option value="8">8-Stage (Heavy Sweeps)</option>
                    <option value="12">12-Stage (Hyper-Space)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">LFO Rate:</span>
                    <span className="font-bold text-sky-400">{phaserRateHz.toFixed(2)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="6.0"
                    step="0.05"
                    value={phaserRateHz}
                    onChange={(e) => setPhaserRateHz(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Sweep Depth:</span>
                    <span className="font-bold text-sky-400">{phaserDepthHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="3500"
                    step="50"
                    value={phaserDepthHz}
                    onChange={(e) => setPhaserDepthHz(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Feedback:</span>
                    <span className="font-bold text-sky-400">{Math.round(phaserFeedback * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.05"
                    value={phaserFeedback}
                    onChange={(e) => setPhaserFeedback(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Stereo Spread:</span>
                    <span className="font-bold text-sky-400">{phaserStereoPhase}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="15"
                    value={phaserStereoPhase}
                    onChange={(e) => setPhaserStereoPhase(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Wet Mix:</span>
                    <span className="font-bold text-sky-400">{Math.round(phaserWetMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={phaserWetMix}
                    onChange={(e) => setPhaserWetMix(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Stereo Ping-Pong Echo & Delay */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> Stereo Echo / Ping-Pong Delay
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Analoges Band-Echo mit Dämpfung & Stereo-Bounce</span>
                </div>
                <button
                  onClick={onApplyEcho}
                  className="aqua-gloss aqua-amber h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Apply Echo
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Delay Time:</span>
                    <span className="font-bold text-sky-400">{echoDelayMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="1200"
                    step="25"
                    value={echoDelayMs}
                    onChange={(e) => setEchoDelayMs(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Feedback:</span>
                    <span className="font-bold text-sky-400">{Math.round(echoFeedback * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.05"
                    value={echoFeedback}
                    onChange={(e) => setEchoFeedback(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Tape Damping:</span>
                    <span className="font-bold text-sky-400">{echoDampingHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="16000"
                    step="400"
                    value={echoDampingHz}
                    onChange={(e) => setEchoDampingHz(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Wet Mix:</span>
                    <span className="font-bold text-sky-400">{Math.round(echoWetMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={echoWetMix}
                    onChange={(e) => setEchoWetMix(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-[#1c293a] flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={echoPingPong}
                    onChange={(e) => setEchoPingPong(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span className="font-bold text-[11px]">Stereo Ping-Pong Bounce (L ➔ R)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ROBOT VOICE, DENOISE & TRANSFORMATION */}
        {/* ========================================================================= */}
        {activeTab === 'voice_transform' && (
          <div className="space-y-3">
            {/* Robot Voice & Ring Modulator */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Robot Voice & Ring Modulator
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Cybernetic Robotizer, Ring-Mod & Metallic Resonator</span>
                </div>
                <button
                  onClick={onApplyRobotVoice}
                  className="aqua-gloss aqua-theme h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Robot FX
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono text-[11px]">
                <div>
                  <label className="text-slate-400 block mb-1">Carrier Waveform</label>
                  <select
                    value={robotCarrierWave}
                    onChange={(e) => setRobotCarrierWave(e.target.value as any)}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  >
                    <option value="sine">Sine (Dalek / Vintage Ring)</option>
                    <option value="square">Square (8-Bit Robot)</option>
                    <option value="sawtooth">Sawtooth (Cyberman Harsh)</option>
                    <option value="pulse">Pulse (Metallic Vocoder)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Carrier Freq:</span>
                    <span className="font-bold text-sky-400">{robotCarrierFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="800"
                    step="10"
                    value={robotCarrierFreq}
                    onChange={(e) => setRobotCarrierFreq(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Ring Mod Depth:</span>
                    <span className="font-bold text-sky-400">{robotRingModDepth}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={robotRingModDepth}
                    onChange={(e) => setRobotRingModDepth(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Metallic Resonance:</span>
                    <span className="font-bold text-sky-400">{robotResonance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={robotResonance}
                    onChange={(e) => setRobotResonance(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Formant Bitcrush:</span>
                    <span className="font-bold text-sky-400">{robotBitCrush}-Bit</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    step="1"
                    value={robotBitCrush}
                    onChange={(e) => setRobotBitCrush(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Wet Mix:</span>
                    <span className="font-bold text-sky-400">{Math.round(robotWetMix * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={robotWetMix}
                    onChange={(e) => setRobotWetMix(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Noise Reduction & Noise Gate / De-Hiss */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                    <VolumeX className="w-3.5 h-3.5" /> Noise Reduction & Noise Gate / De-Hiss
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Removes microphone noise, tape hiss & hum</span>
                </div>
                <button
                  onClick={onApplyDenoise}
                  className="aqua-gloss aqua-green h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Apply Denoise
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-slate-300 font-mono text-[10.5px]">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Noise Threshold:</span>
                    <span className="font-bold text-sky-400">{denoiseThresholdDb} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-75"
                    max="-15"
                    step="1"
                    value={denoiseThresholdDb}
                    onChange={(e) => setDenoiseThresholdDb(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Denoise Level:</span>
                    <span className="font-bold text-sky-400">{denoiseReductionDb} dB</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="42"
                    step="2"
                    value={denoiseReductionDb}
                    onChange={(e) => setDenoiseReductionDb(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Hiss Lowpass:</span>
                    <span className="font-bold text-sky-400">{(denoiseHissCutoffHz / 1000).toFixed(1)} kHz</span>
                  </div>
                  <input
                    type="range"
                    min="3500"
                    max="18000"
                    step="500"
                    value={denoiseHissCutoffHz}
                    onChange={(e) => setDenoiseHissCutoffHz(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Vocal Remover & Pitch Shift */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Center Vocal Remover</span>
                  <button
                    onClick={onApplyVocalRemover}
                    className="aqua-gloss aqua-theme h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Vocal Cut
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Phase cancellation of center pan to isolate vocals or stems.
                </p>
              </div>

              <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Pitch & Speed</span>
                  <button
                    onClick={onApplyPitchTime}
                    className="aqua-gloss aqua-green h-6 px-2 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Apply Pitch
                  </button>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-slate-400">Semitones:</span>
                  <input
                    type="range"
                    min="-24"
                    max="24"
                    value={pitchSemitones}
                    onChange={(e) => setPitchSemitones(Number(e.target.value))}
                    className="flex-1 accent-sky-500 cursor-pointer h-1.5"
                  />
                  <span className="font-bold text-sky-400 w-8 text-right">{pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SAMPLE MERGE & FUSION STUDIO (ZUSAMMENFÜGEN) */}
        {/* ========================================================================= */}
        {activeTab === 'merge_fusion' && (
          <div className="space-y-3">
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Sample Fusion & Merger Studio
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Kombiniere zwei Samples zu einem neuen Sound (Mischen oder Hintereinander Hängen)
                  </span>
                </div>
                <button
                  onClick={onApplyMerge}
                  className="aqua-gloss aqua-theme h-6 px-3 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Merge &amp; Bake</span>
                </button>
              </div>

              {/* Source A vs Source B Selection */}
              <div className="grid grid-cols-2 gap-3 bg-[#090e17] p-2.5 rounded-lg border border-[#162232]">
                <div>
                  <span className="text-[10px] font-mono font-bold text-sky-400 block mb-1">SAMPLE A (Aktueller Slot {activeSlot.toString().padStart(2, '0')}):</span>
                  <div className="bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1.5 rounded truncate">
                    {samples[activeSlot]?.name || 'Current Active Wave'}
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
                    <span className="text-slate-400">Lautstärke A:</span>
                    <span className="font-bold text-sky-400">{Math.round(mergeGainA * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={mergeGainA}
                    onChange={(e) => setMergeGainA(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 mt-0.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400">SAMPLE B (Zweiter Sound):</span>
                    <label className="aqua-gloss aqua-dark text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 text-slate-300">
                      <Upload className="w-2.5 h-2.5" />
                      <span>Datei</span>
                      <input
                        type="file"
                        accept="audio/*,.wav,.mp3,.iff,.flac"
                        className="hidden"
                        onChange={onImportSecondSampleForMerge}
                      />
                    </label>
                  </div>

                  <select
                    value={mergeSlotB}
                    onChange={(e) => setMergeSlotB(Number(e.target.value))}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1.5 rounded"
                  >
                    {secondSampleFileName && (
                      <option value="-1">📁 Datei: {secondSampleFileName}</option>
                    )}
                    {samples.map((s, idx) => (
                      <option key={idx} value={idx}>
                        Slot {idx.toString().padStart(2, '0')}: {s.name || 'Empty'} {s.buffer ? '●' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
                    <span className="text-slate-400">Lautstärke B:</span>
                    <span className="font-bold text-amber-400">{Math.round(mergeGainB * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={mergeGainB}
                    onChange={(e) => setMergeGainB(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 mt-0.5"
                  />
                </div>
              </div>

              {/* Merge Operation Mode */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200 block">Kombinations-Modus:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { id: 'mix', label: '1. Mix / Layer', desc: 'Parallel überlagern' },
                    { id: 'append_sequential', label: '2. Hintereinander', desc: 'A ➔ B anfügen' },
                    { id: 'prepend_sequential', label: '3. Voranstellen', desc: 'B ➔ A voranstellen' },
                    { id: 'crossfade_morph', label: '4. Morph Crossfade', desc: 'Gleichmäßiges Überblenden' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setMergeMode(mode.id as MergeMode)}
                      className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                        mergeMode === mode.id
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                          : 'bg-[#0e1624] border-[#1e2d42] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-bold text-[11px] text-white">{mode.label}</span>
                      <span className="text-[9.5px] text-slate-400 font-mono">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crossfade / Silence Gap Sliders */}
              {(mergeMode === 'append_sequential' || mergeMode === 'prepend_sequential') && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1c293a] font-mono text-[10.5px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Crossfade Übergang:</span>
                      <span className="font-bold text-sky-400">{mergeCrossfadeMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="10"
                      value={mergeCrossfadeMs}
                      onChange={(e) => setMergeCrossfadeMs(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Pause / Stille Gap:</span>
                      <span className="font-bold text-sky-400">{mergeSilenceGapMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={mergeSilenceGapMs}
                      onChange={(e) => setMergeSilenceGapMs(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FADES & RETRO 8-BIT */}
        {/* ========================================================================= */}
        {activeTab === 'fades_retro' && (
          <div className="space-y-3">
            {/* Fade In & Out Studio */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <span className="font-bold text-sky-300 font-mono block">Fade In / Fade Out Kurven (Sample oder Auswahl)</span>
              
              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
                {/* Fade In */}
                <div className="bg-[#090e17] p-2 rounded-lg border border-[#162232] space-y-1.5">
                  <span className="font-bold text-emerald-400 block">FADE IN (Einblenden):</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onApplyFade('in', 'linear')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      Linear
                    </button>
                    <button
                      onClick={() => onApplyFade('in', 'scurve')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      S-Kurve
                    </button>
                    <button
                      onClick={() => onApplyFade('in', 'exponential')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      Exponentiell
                    </button>
                    <button
                      onClick={() => onApplyFade('in', 'logarithmic')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      Logarithmisch
                    </button>
                  </div>
                </div>

                {/* Fade Out */}
                <div className="bg-[#090e17] p-2 rounded-lg border border-[#162232] space-y-1.5">
                  <span className="font-bold text-rose-400 block">FADE OUT (Ausblenden):</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onApplyFade('out', 'linear')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      Linear
                    </button>
                    <button
                      onClick={() => onApplyFade('out', 'scurve')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      S-Kurve
                    </button>
                    <button
                      onClick={() => onApplyFade('out', 'exponential')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      Exponentiell
                    </button>
                    <button
                      onClick={() => onApplyFade('out', 'logarithmic')}
                      className="aqua-gloss aqua-dark h-6 rounded text-slate-200 cursor-pointer"
                    >
                      Logarithmisch
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  onClick={onInvertPhase}
                  className="aqua-gloss aqua-red h-6 px-3 rounded text-[11px] font-mono cursor-pointer"
                >
                  Phase Invertieren (180° Polarity Flip)
                </button>
              </div>
            </div>

            {/* Amiga Paula 8364 Sound Chip & Lo-Fi Crunch */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5" /> Amiga Paula 8364 DAC &amp; LED Filter
                </span>
                <button
                  onClick={onApplyAmigaPaula}
                  className="aqua-gloss aqua-green h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Process Paula
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10.5px] font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">DAC Bits: {amigaQuantizeBits}-Bit</label>
                  <input
                    type="range"
                    min="4"
                    max="8"
                    step="1"
                    value={amigaQuantizeBits}
                    onChange={(e) => setAmigaQuantizeBits(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Amiga LED Filter</label>
                  <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer mt-1 text-xs">
                    <input
                      type="checkbox"
                      checked={amigaLedFilter}
                      onChange={(e) => setAmigaLedFilter(e.target.checked)}
                      className="accent-sky-500 rounded"
                    />
                    <span>Hardware Lowpass (4.4kHz)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Lo-Fi Bitcrusher & Drive */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono">Lo-Fi Bitcrusher &amp; Overdrive</span>
                <button
                  onClick={onApplyBitcrush}
                  className="aqua-gloss aqua-blue h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Bitcrush
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-slate-400 block mb-1">Bits: {bitcrushBits}</span>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={bitcrushBits}
                    onChange={(e) => setBitcrushBits(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Rate: {(sampleRateReduce / 1000).toFixed(0)}kHz</span>
                  <input
                    type="range"
                    min="2000"
                    max="32000"
                    step="1000"
                    value={sampleRateReduce}
                    onChange={(e) => setSampleRateReduce(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Drive: {saturationDrive}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturationDrive}
                    onChange={(e) => setSaturationDrive(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: WAVEFORM GENERATORS */}
        {/* ========================================================================= */}
        {activeTab === 'generator' && (
          <div className="space-y-3">
            {/* Tone Generator */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Waveform Tone Generator
                </span>
                <button
                  onClick={onGenerateTone}
                  className="aqua-gloss aqua-green h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Generate
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10.5px] font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Wellenform</label>
                  <select
                    value={genWaveType}
                    onChange={(e) => setGenWaveType(e.target.value as any)}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  >
                    <option value="sine">Sine</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="triangle">Triangle</option>
                    <option value="noise">White Noise</option>
                    <option value="pulse">Pulse (25%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Freq ({genFrequency}Hz)</label>
                  <input
                    type="number"
                    min="20"
                    max="20000"
                    value={genFrequency}
                    onChange={(e) => setGenFrequency(Number(e.target.value))}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Dauer ({genDurationSec}s)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={genDurationSec}
                    onChange={(e) => setGenDurationSec(Number(e.target.value))}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Chirp Sweep Generator */}
            <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Demoscene Chirp Sweep
                </span>
                <button
                  onClick={onGenerateChirp}
                  className="aqua-gloss aqua-blue h-6 px-2.5 rounded text-[11px] font-bold cursor-pointer"
                >
                  Generate Chirp
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10.5px] font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Start Freq ({genChirpStart}Hz)</label>
                  <input
                    type="number"
                    min="20"
                    max="10000"
                    value={genChirpStart}
                    onChange={(e) => setGenChirpStart(Number(e.target.value))}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">End Freq ({genChirpEnd}Hz)</label>
                  <input
                    type="number"
                    min="20"
                    max="20000"
                    value={genChirpEnd}
                    onChange={(e) => setGenChirpEnd(Number(e.target.value))}
                    className="w-full bg-[#141f2e] border border-[#223348] text-xs font-mono text-white px-2 py-1 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
