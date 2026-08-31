/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  X, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Sparkles, 
  Save, 
  Trash2, 
  Ratio, 
  Sliders, 
  Palette, 
  Layers, 
  Film, 
  Image as ImageIcon, 
  Type, 
  Coffee, 
  Check, 
  RefreshCw,
  Monitor,
  Smartphone,
  Square,
  Repeat,
  Flame,
  Volume2,
  Clock,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileAudio,
  Music,
  ArrowLeft,
  Disc,
  Activity,
  Zap,
  Radio,
  Eye,
  Compass,
  Box,
  SlidersHorizontal,
  Sun,
  Wand2,
  Waves,
  Shuffle,
  Grid3X3,
  Move3d,
  Orbit,
  Target,
  RotateCw,
  Loader2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react';
import { TrackerSong } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { PersonaSwitcher, AppPersona } from './PersonaSwitcher';
import { renderSongToAudioBuffer } from '../utils/audioExporter';
import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  CanvasSource,
  AudioBufferSource,
} from 'mediabunny';

export type AspectRatioType = '16:9' | '9:16' | '1:1';
export type BackgroundType = 'grid' | 'starfield' | 'orbs' | 'phyllotaxis' | 'neon_tunnel' | 'aurora_waves' | 'cyber_city' | 'hyperspace' | 'solid' | 'custom_image';
export type VisualizerType = 'spectrum' | 'waveform' | 'pulsing' | 'radial' | 'bursts' | 'spiro' | 'wave_circle' | 'vector_ball' | 'poly_sphere' | 'cyber_hud' | 'laser_show' | 'dancing_cubes' | '3d_cube_eqs' | 'floating_3d_cubes' | 'mirror_spectrum' | 'liquid_blob';
export type EffectType = 'none' | 'copperbars' | 'checkerboard' | 'matrix' | 'starlines' | 'flower_of_life' | 'plasma' | 'audio_fire' | 'sparkles_emitter';
export type StarDirectionType = 'down' | 'up' | 'left' | 'right' | 'forward_3d' | 'vortex';
export type ScrollerColorType = 'rainbow' | 'cyan_pink' | 'matrix' | 'gold';
export type ScrollerMotionType = 'linear' | 'sine' | 'bounce' | 'zigzag' | 'wobble' | 'spiral_3d' | 'glitch_hop';
export type CopperThemeType = 'rainbow' | 'cyan_pink' | 'fire' | 'gold' | 'matrix';
export type LaserOriginType = 'top_center' | 'bottom_center' | 'center_burst' | 'dual_corners' | 'oscillating';
export type LaserPatternType = 'fan_sweep' | 'cross_fire' | 'tunnel_vortex' | 'chaotic_disco' | 'strobe_pulse';
export type LaserColorThemeType = 'rainbow' | 'cyan_pink' | 'emerald' | 'amber' | 'cyber_violet' | 'ice_blue' | 'ruby_red' | 'gold';
export type CubesArrangementType = 'random' | 'orbit_ring' | 'grid_matrix' | 'helix_spiral' | 'cluster';
export type CubesRenderStyleType = 'wireframe' | 'shaded_glass' | 'solid_neon' | 'dots_vertices';

export interface VisualizerPreset {
  id: string;
  name: string;
  aspectRatio: AspectRatioType;
  background: BackgroundType;
  bgColor1: string;
  bgColor2: string;
  visualizer: VisualizerType;
  primaryColor: string;
  secondaryColor: string;
  effect: EffectType;
  scanlines: boolean;
  vhsNoise: boolean;
  vignette: boolean;
  crtGlitch: boolean;
  artistName: string;
  songTitle: string;
  showTextOverlay: boolean;
  textPosition: 'bottom' | 'top' | 'center';
  logoDataUrl: string | null;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoScale: number;
  logoOpacity: number;
  bgImageDataUrl: string | null;
  bgImageFit?: 'cover' | 'contain' | 'original' | 'stretch';
  bgImageScale?: number;
  bgImageXPercent?: number;
  bgImageYPercent?: number;
  bgImageOpacity?: number;
  bgImageBlur?: number;
  bgImageBassPulse?: boolean;
  bgImageAutoFitSafe?: boolean;
  logoAutoFitSafe?: boolean;
  createdAt: number;
  // Extended configuration options
  activeBackgrounds?: BackgroundType[];
  activeVisualizers?: VisualizerType[];
  activeEffects?: EffectType[];
  showTimerOverlay?: boolean;
  timerXPercent?: number;
  timerYPercent?: number;
  timerSize?: number;
  timerStyle?: 'elapsed_total' | 'elapsed_only' | 'countdown';
  timerColorStyle?: 'primary' | 'cyan' | 'amber' | 'green' | 'white';
  starDirection?: StarDirectionType;
  starSpeed?: number;
  starCount?: number;
  starRotation?: number;
  showScrollerText?: boolean;
  scrollerText?: string;
  scrollerSpeed?: number;
  scrollerFontSize?: number;
  scrollerYPos?: number;
  scrollerSineBounce?: boolean;
  scrollerMotionMode?: ScrollerMotionType;
  scrollerAmplitude?: number;
  scrollerFrequency?: number;
  scrollerGlow?: number;
  scrollerBackdrop?: boolean;
  scrollerColorStyle?: ScrollerColorType;
  copperBarCount?: number;
  copperBarHeight?: number;
  copperBarSpeed?: number;
  copperBarAngle?: number;
  copperBarYPos?: number;
  copperColorTheme?: CopperThemeType;
  logoXPercent?: number;
  logoYPercent?: number;
  logoBassPulse?: boolean;
  textXPercent?: number;
  textYPercent?: number;
  textSize?: number;
  orbColor1?: string;
  orbColor2?: string;
  orbSize?: number;
  orbSpeed?: number;
  orbSoundPulse?: boolean;
  radialRadius?: number;
  radialBarHeight?: number;
  radialBarCount?: number;
  radialArcAngle?: number;
  radialXPercent?: number;
  radialYPercent?: number;
  radialMirror?: boolean;
  sphereRadius?: number;
  sphereXPercent?: number;
  sphereYPercent?: number;
  sphereSoundSens?: number;
  sphereRings?: number;
  sphereRotSpeed?: number;
  sphereStyle?: 'wireframe' | 'dots' | 'rings';
  matrixSpeed?: number;
  matrixDensity?: number;
  matrixFontSize?: number;
  matrixColorTheme?: 'green' | 'cyan' | 'red' | 'gold';
  gridHorizonY?: number;
  gridSpeed?: number;
  gridDensity?: number;
  gridColor?: string;
  gridHorizonGlowColor?: string;
  gridBassPulse?: boolean;
  phylloSize?: number;
  phylloCount?: number;
  phylloColorTheme?: string;
  phylloXPercent?: number;
  phylloYPercent?: number;
  phylloRotSpeed?: number;
  phylloRotate?: boolean;
  phylloSoundPulse?: boolean;
  // Master Juice & New FX settings
  audioGain?: number;
  bassShake?: number;
  colorCycleSpeed?: number;
  bloomGlow?: number;
  chromaticAberration?: number;
  kaleidoscope?: boolean;
  kaleidoscopeSegments?: number;
  tunnelSpeed?: number;
  tunnelSegments?: number;
  laserCount?: number;
  laserOrigin?: LaserOriginType;
  laserSpeed?: number;
  laserBeamWidth?: number;
  laserSpread?: number;
  laserPattern?: LaserPatternType;
  laserSoundSens?: number;
  laserColorTheme?: LaserColorThemeType;
  laserCenterGlow?: boolean;
  plasmaSpeed?: number;
  fireIntensity?: number;
  auroraSpeed?: number;
  auroraDensity?: number;
  citySpeed?: number;
  hudRadius?: number;
  cubesCount?: number;
  cubeEqHeightScale?: number;
  cubeEqIsometricAngle?: number;
  cubeEqGap?: number;
  cubeEqColorStyle?: string;
  cubeEqPositionX?: number;
  cubeEqPositionY?: number;
  // 3D Floating Cosmic Cubes
  floatingCubesCount?: number;
  floatingCubesArrangement?: CubesArrangementType;
  floatingCubesSeed?: number;
  floatingCubesOffsetX?: number;
  floatingCubesOffsetY?: number;
  floatingCubesOffsetZ?: number;
  floatingCubesSpreadX?: number;
  floatingCubesSpreadY?: number;
  floatingCubesSpreadZ?: number;
  floatingCubesRotSpeedX?: number;
  floatingCubesRotSpeedY?: number;
  floatingCubesRotSpeedZ?: number;
  floatingCubesSize?: number;
  floatingCubesStyle?: CubesRenderStyleType;
  floatingCubesAudioReactive?: boolean;
  blobTentacles?: number;
  bgGradientAngle?: number;
  bgGradientType?: 'linear' | 'radial';
}

export const BUILTIN_DEMO_PRESETS: VisualizerPreset[] = [
  {
    id: 'syn_classic_blue',
    name: '💎 SYN-Tracker Classic Blue (16:9)',
    aspectRatio: '16:9',
    background: 'grid',
    activeBackgrounds: ['grid'],
    bgColor1: '#040711',
    bgColor2: '#0b1a2f',
    visualizer: 'mirror_spectrum',
    activeVisualizers: ['mirror_spectrum'],
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    effect: 'none',
    activeEffects: [],
    scanlines: true,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'SYN-TRACKER',
    songTitle: 'BACK ON TRACK',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 22,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.5,
    bassShake: 0,
    bloomGlow: 25,
    chromaticAberration: 0,
    gridColor: '#38bdf8',
    gridHorizonGlowColor: '#0284c7',
    gridBassPulse: true,
    showScrollerText: true,
    scrollerText: '+++ SYN-TRACKER AUDIO ENGINE // 60 FPS STEREO VISUALIZER // RETRO SOUND STUDIO +++',
    scrollerColorStyle: 'cyan_pink',
    scrollerSpeed: 2,
    scrollerFontSize: 24,
    scrollerYPos: 93,
    scrollerSineBounce: true,
    scrollerAmplitude: 14,
  },
  {
    id: 'cyberpunk_city',
    name: '🌆 Cyberpunk Neon City (16:9)',
    aspectRatio: '16:9',
    background: 'cyber_city',
    activeBackgrounds: ['cyber_city'],
    bgColor1: '#050714',
    bgColor2: '#190a28',
    visualizer: 'cyber_hud',
    activeVisualizers: ['cyber_hud'],
    primaryColor: '#38bdf8',
    secondaryColor: '#0ea5e9',
    effect: 'none',
    activeEffects: [],
    scanlines: true,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'SYN-TRACKER',
    songTitle: 'NEON METROPOLIS',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 22,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.5,
    bassShake: 0,
    bloomGlow: 25,
    chromaticAberration: 0,
    showScrollerText: true,
    scrollerText: '+++ NEON DRIFTER // NIGHT CITY 2088 // AMIGA SYNTH ENGINE +++',
    scrollerColorStyle: 'cyan_pink',
    scrollerSpeed: 2,
    scrollerFontSize: 24,
    scrollerYPos: 93,
    scrollerSineBounce: true,
    scrollerAmplitude: 14,
  },
  {
    id: 'hyperspace_warp',
    name: '🚀 Hyperspace Warp 9 (9:16 Shorts)',
    aspectRatio: '9:16',
    background: 'hyperspace',
    activeBackgrounds: ['hyperspace'],
    bgColor1: '#020208',
    bgColor2: '#0b001a',
    visualizer: 'poly_sphere',
    activeVisualizers: ['vector_ball'],
    primaryColor: '#a855f7',
    secondaryColor: '#38bdf8',
    effect: 'none',
    activeEffects: [],
    scanlines: false,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'DEEP SPACE EXPLORER',
    songTitle: 'WARP CORE OVERDRIVE',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 20,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.5,
    bassShake: 0,
    bloomGlow: 25,
    chromaticAberration: 0,
    showScrollerText: true,
    scrollerText: '+++ TRAVERSING HYPERSPACE SECTOR 7G +++ FULL AUDIO SPECTRUM LOCK +++',
    scrollerColorStyle: 'rainbow',
    scrollerSpeed: 2.5,
    scrollerFontSize: 26,
    scrollerYPos: 94,
    scrollerSineBounce: true,
    scrollerAmplitude: 16,
  },
  {
    id: 'underground_rave',
    name: '⚡ Underground Rave 150BPM (1:1)',
    aspectRatio: '1:1',
    background: 'neon_tunnel',
    activeBackgrounds: ['neon_tunnel'],
    bgColor1: '#080005',
    bgColor2: '#1a0010',
    visualizer: 'laser_show',
    activeVisualizers: ['laser_show'],
    primaryColor: '#ec4899',
    secondaryColor: '#22c55e',
    effect: 'none',
    activeEffects: [],
    scanlines: true,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'RAVE GENERATOR',
    songTitle: 'ACID OVERLOAD',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 20,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.6,
    bassShake: 0,
    bloomGlow: 30,
    chromaticAberration: 0,
    showScrollerText: true,
    scrollerText: '+++ BASS CANNON ACTIVATED // 150 BPM // HARDCORE ACID TRACKER +++',
    scrollerColorStyle: 'cyan_pink',
    scrollerSpeed: 2.5,
    scrollerFontSize: 24,
    scrollerYPos: 92,
    scrollerSineBounce: true,
    scrollerAmplitude: 14,
  },
  {
    id: 'amiga_demoscene',
    name: '💾 Amiga Demoscene 1991',
    aspectRatio: '16:9',
    background: 'solid',
    activeBackgrounds: ['solid'],
    bgColor1: '#000000',
    bgColor2: '#0f051d',
    visualizer: 'waveform',
    activeVisualizers: ['waveform'],
    primaryColor: '#fbbf24',
    secondaryColor: '#f43f5e',
    effect: 'copperbars',
    activeEffects: ['copperbars'],
    scanlines: true,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'AMIGA SOUNDTRACKER',
    songTitle: 'STATE OF THE ART',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 22,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.4,
    bassShake: 0,
    bloomGlow: 20,
    chromaticAberration: 0,
    showScrollerText: true,
    scrollerText: '+++ GREETS TO SILENTS, CRIONICS, RED SECTORS, RAZOR 1911, FAIRLIGHT, FUTURE CREW +++',
    scrollerColorStyle: 'rainbow',
    scrollerSpeed: 2,
    scrollerFontSize: 26,
    scrollerYPos: 92,
    scrollerSineBounce: true,
    scrollerAmplitude: 14,
  },
  {
    id: 'cosmic_aurora',
    name: '🌌 Cosmic Aurora Dream',
    aspectRatio: '16:9',
    background: 'aurora_waves',
    activeBackgrounds: ['aurora_waves'],
    bgColor1: '#020b14',
    bgColor2: '#091e2b',
    visualizer: 'liquid_blob',
    activeVisualizers: ['liquid_blob'],
    primaryColor: '#34d399',
    secondaryColor: '#38bdf8',
    effect: 'none',
    activeEffects: [],
    scanlines: false,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'CHILLWAVE LABS',
    songTitle: 'NORTHERN LIGHTS',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 22,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.4,
    bassShake: 0,
    bloomGlow: 25,
    chromaticAberration: 0,
    showScrollerText: true,
    scrollerText: '+++ SERENITY IN CHIPTUNE // AMBIENT VECTORS // FLOWING FREQUENCIES +++',
    scrollerColorStyle: 'matrix',
    scrollerSpeed: 2,
    scrollerFontSize: 22,
    scrollerYPos: 93,
    scrollerSineBounce: true,
    scrollerAmplitude: 12,
  },
  {
    id: 'matrix_cyberdeck',
    name: '👾 Matrix Cyberdeck',
    aspectRatio: '16:9',
    background: 'solid',
    activeBackgrounds: ['solid'],
    bgColor1: '#000803',
    bgColor2: '#001407',
    visualizer: '3d_cube_eqs',
    activeVisualizers: ['3d_cube_eqs'],
    primaryColor: '#10b981',
    secondaryColor: '#34d399',
    effect: 'matrix',
    activeEffects: ['matrix'],
    scanlines: true,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'OPERATOR',
    songTitle: 'NEURAL CONSTRUCT',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 22,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.5,
    bassShake: 0,
    bloomGlow: 20,
    chromaticAberration: 0,
    matrixColorTheme: 'green',
    showScrollerText: true,
    scrollerText: '+++ SYSTEM OVERRIDE // DECRYPTING CIPHER // ACCESS GRANTED +++',
    scrollerColorStyle: 'matrix',
    scrollerSpeed: 2.2,
    scrollerFontSize: 22,
    scrollerYPos: 93,
    scrollerSineBounce: false,
    scrollerMotionMode: 'linear',
  },
  {
    id: 'floating_cosmic_cubes',
    name: '🧊 3D Cosmic Space Cubes',
    aspectRatio: '16:9',
    background: 'starfield',
    activeBackgrounds: ['starfield'],
    bgColor1: '#030712',
    bgColor2: '#0b1329',
    visualizer: 'floating_3d_cubes',
    activeVisualizers: ['floating_3d_cubes'],
    primaryColor: '#38bdf8',
    secondaryColor: '#c084fc',
    effect: 'none',
    activeEffects: [],
    scanlines: false,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'SYN-TRACKER 3D',
    songTitle: 'DIMENSIONAL DRIFT',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 18,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.6,
    bassShake: 5,
    bloomGlow: 35,
    chromaticAberration: 15,
    floatingCubesCount: 20,
    floatingCubesArrangement: 'random',
    floatingCubesStyle: 'shaded_glass',
    floatingCubesSize: 36,
    floatingCubesRotSpeedX: 3,
    floatingCubesRotSpeedY: 4,
    floatingCubesRotSpeedZ: 2,
    floatingCubesAudioReactive: true,
    showScrollerText: true,
    scrollerText: '+++ 3D FLOATING COSMIC CUBES // REALTIME PERSPECTIVE PROJECTION // BASS REACTIVE +++',
    scrollerColorStyle: 'rainbow',
    scrollerMotionMode: 'bounce',
    scrollerAmplitude: 16,
    scrollerSpeed: 2,
    scrollerFontSize: 24,
    scrollerYPos: 93,
  },
  {
    id: 'laser_rave_concert',
    name: '⚡ Laser Rave Arena',
    aspectRatio: '16:9',
    background: 'neon_tunnel',
    activeBackgrounds: ['neon_tunnel'],
    bgColor1: '#02040a',
    bgColor2: '#100520',
    visualizer: 'laser_show',
    activeVisualizers: ['laser_show'],
    primaryColor: '#f43f5e',
    secondaryColor: '#38bdf8',
    effect: 'sparkles_emitter',
    activeEffects: ['sparkles_emitter'],
    scanlines: true,
    vhsNoise: false,
    vignette: true,
    crtGlitch: false,
    artistName: 'RAVE MASTER',
    songTitle: 'NEON BEAM OVERDRIVE',
    showTextOverlay: true,
    textPosition: 'top',
    textXPercent: 50,
    textYPercent: 18,
    logoDataUrl: null,
    logoPosition: 'top-right',
    logoScale: 100,
    logoOpacity: 80,
    bgImageDataUrl: null,
    createdAt: Date.now(),
    audioGain: 1.8,
    bassShake: 12,
    bloomGlow: 40,
    laserCount: 16,
    laserOrigin: 'center_burst',
    laserPattern: 'fan_sweep',
    laserSpeed: 6,
    laserBeamWidth: 5,
    laserSpread: 120,
    laserSoundSens: 80,
    laserColorTheme: 'rainbow',
    laserCenterGlow: true,
    showScrollerText: true,
    scrollerText: '+++ LASER ARENA // STROBE SHOCKWAVE // MAXIMUM BASS INTENSITY +++',
    scrollerColorStyle: 'rainbow',
    scrollerMotionMode: 'glitch_hop',
    scrollerAmplitude: 18,
    scrollerSpeed: 2.2,
    scrollerFontSize: 26,
    scrollerYPos: 93,
  }
];

const DEFAULT_PRESET: VisualizerPreset = BUILTIN_DEMO_PRESETS[0];

interface VisualizerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: TrackerSong;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onShowToast?: (msg: string) => void;
  onOpenLocalFile?: (file: File) => void;
  onSwitchPersona?: (persona: AppPersona) => void;
  onOpenSupport?: () => void;
  showSupportButton?: boolean;
}

const LOCAL_STORAGE_PRESETS_KEY = 'syntracker_visualizer_presets_v1';

export const VisualizerStudioModal: React.FC<VisualizerStudioModalProps> = ({
  isOpen,
  onClose,
  song,
  isPlaying,
  onPlay,
  onPause,
  onShowToast,
  onOpenLocalFile,
  onSwitchPersona,
  onOpenSupport,
  showSupportButton = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Standalone Fullscreen Window State
  const [isFullscreenWindow, setIsFullscreenWindow] = useState<boolean>(false);

  // Custom Audio Track Import & Playback State (Standalone Mode)
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [customAudioName, setCustomAudioName] = useState<string>('');
  const [isCustomAudioPlaying, setIsCustomAudioPlaying] = useState<boolean>(false);
  const [customAudioTime, setCustomAudioTime] = useState<number>(0);
  const [customAudioDuration, setCustomAudioDuration] = useState<number>(0);
  const [customAudioLoop, setCustomAudioLoop] = useState<boolean>(true);

  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const customAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const customAudioInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to ensure WebAudio context & MediaElementSource are properly connected to the visualizer analyser
  const ensureCustomAudioSource = () => {
    const audioEl = customAudioRef.current;
    if (!audioEl) return null;

    const ctx = audioEngine.getOrCreateContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!customAudioSourceRef.current) {
      try {
        const source = ctx.createMediaElementSource(audioEl);
        customAudioSourceRef.current = source;

        // Route through masterGain so the visualizer analyser & fx bus receive the audio signal
        if (audioEngine.masterGain) {
          source.connect(audioEngine.masterGain);
        } else if (audioEngine.analyser) {
          source.connect(audioEngine.analyser);
        } else {
          source.connect(ctx.destination);
        }
      } catch (e) {
        console.warn('Custom audio source connect notice:', e);
      }
    }
    return ctx;
  };

  // Connect custom audio element to audioEngine WebAudio Analyser whenever URL changes
  useEffect(() => {
    if (!customAudioUrl || !customAudioRef.current) return;
    ensureCustomAudioSource();
  }, [customAudioUrl]);

  // Handle audio/module file selection (MP3, WAV, TRK, SID, MOD, etc.)
  const handleCustomAudioUpload = async (file: File) => {
    if (!file) return;
    const lower = file.name.toLowerCase();

    // Check if it's a tracker project or mod / sid file
    if (
      lower.endsWith('.mod') ||
      lower.endsWith('.trk') ||
      lower.endsWith('.syn') ||
      lower.endsWith('.json') ||
      lower.endsWith('.sid')
    ) {
      if (onOpenLocalFile) {
        handleClearCustomAudio();
        await onOpenLocalFile(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setSongTitle(cleanName);
        if (onShowToast) onShowToast(`Loaded Tracker Song: ${file.name}`);
        return;
      }
    }

    // Audio stream file (MP3, WAV, FLAC, OGG, M4A, etc.)
    const url = URL.createObjectURL(file);
    if (customAudioUrl) {
      URL.revokeObjectURL(customAudioUrl);
    }
    setCustomAudioFile(file);
    setCustomAudioUrl(url);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setCustomAudioName(file.name);
    setSongTitle(cleanName);
    setIsCustomAudioPlaying(false);
    setCustomAudioTime(0);

    if (customAudioRef.current) {
      customAudioRef.current.src = url;
      customAudioRef.current.load();
    }
    ensureCustomAudioSource();
    if (onShowToast) onShowToast(`Loaded audio track: ${file.name}`);
  };

  const handleClearCustomAudio = () => {
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.src = '';
    }
    if (customAudioUrl) {
      URL.revokeObjectURL(customAudioUrl);
    }
    setCustomAudioFile(null);
    setCustomAudioUrl(null);
    setCustomAudioName('');
    setIsCustomAudioPlaying(false);
    setSongTitle(song.name || 'Retro Track');
    if (onShowToast) onShowToast('Switched back to Tracker Song');
  };

  const toggleCustomAudioPlay = () => {
    if (!customAudioRef.current || !customAudioUrl) return;
    if (isCustomAudioPlaying) {
      customAudioRef.current.pause();
      setIsCustomAudioPlaying(false);
    } else {
      if (isPlaying) {
        onPause();
      }
      const ctx = ensureCustomAudioSource();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      customAudioRef.current.play().then(() => {
        setIsCustomAudioPlaying(true);
      }).catch(err => {
        console.error('Audio playback error:', err);
      });
    }
  };

  const handleTrackerPlayToggle = () => {
    if (customAudioRef.current && isCustomAudioPlaying) {
      customAudioRef.current.pause();
      setIsCustomAudioPlaying(false);
    }
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  // Sparkles Emitter Particle Pool Ref
  const sparklesParticlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>>([]);

  // Active Preset & Multi-Layer Editing State
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [activeBackgrounds, setActiveBackgrounds] = useState<BackgroundType[]>(['grid']);
  const [bgColor1, setBgColor1] = useState<string>('#040711');
  const [bgColor2, setBgColor2] = useState<string>('#0b1a2f');
  const [bgGradientAngle, setBgGradientAngle] = useState<number>(90);
  const [bgGradientType, setBgGradientType] = useState<'linear' | 'radial'>('linear');
  const [activeVisualizers, setActiveVisualizers] = useState<VisualizerType[]>(['mirror_spectrum']);
  const [primaryColor, setPrimaryColor] = useState<string>('#38bdf8');
  const [secondaryColor, setSecondaryColor] = useState<string>('#0284c7');
  const [activeEffects, setActiveEffects] = useState<EffectType[]>([]);
  const [scanlines, setScanlines] = useState<boolean>(true);
  const [vhsNoise, setVhsNoise] = useState<boolean>(false);
  const [vignette, setVignette] = useState<boolean>(true);
  const [crtGlitch, setCrtGlitch] = useState<boolean>(false);

  // Master Juice & Audio Reactivity State
  const [audioGain, setAudioGain] = useState<number>(1.5);
  const [bassShake, setBassShake] = useState<number>(0);
  const [colorCycleSpeed, setColorCycleSpeed] = useState<number>(0);
  const [bloomGlow, setBloomGlow] = useState<number>(25);
  const [chromaticAberration, setChromaticAberration] = useState<number>(0);
  const [kaleidoscope, setKaleidoscope] = useState<boolean>(false);
  const [kaleidoscopeSegments, setKaleidoscopeSegments] = useState<number>(6);

  // Neon Tunnel Background State
  const [tunnelSpeed, setTunnelSpeed] = useState<number>(4);
  const [tunnelSegments, setTunnelSegments] = useState<number>(8);

  // Aurora Waves Background State
  const [auroraSpeed, setAuroraSpeed] = useState<number>(3);
  const [auroraDensity, setAuroraDensity] = useState<number>(5);

  // Cyber City Background State
  const [citySpeed, setCitySpeed] = useState<number>(3);

  // Cyber HUD Visualizer State
  const [hudRadius, setHudRadius] = useState<number>(26);

  // Laser Show Visualizer State
  const [laserCount, setLaserCount] = useState<number>(8);
  const [laserOrigin, setLaserOrigin] = useState<LaserOriginType>('top_center');
  const [laserSpeed, setLaserSpeed] = useState<number>(4);
  const [laserBeamWidth, setLaserBeamWidth] = useState<number>(4);
  const [laserSpread, setLaserSpread] = useState<number>(90);
  const [laserPattern, setLaserPattern] = useState<LaserPatternType>('fan_sweep');
  const [laserSoundSens, setLaserSoundSens] = useState<number>(65);
  const [laserColorTheme, setLaserColorTheme] = useState<LaserColorThemeType>('cyan_pink');
  const [laserCenterGlow, setLaserCenterGlow] = useState<boolean>(true);

  // 3D Cube EQs Visualizer State (formerly dancing_cubes)
  const [cubesCount, setCubesCount] = useState<number>(16);
  const [cubeEqHeightScale, setCubeEqHeightScale] = useState<number>(65);
  const [cubeEqIsometricAngle, setCubeEqIsometricAngle] = useState<number>(35);
  const [cubeEqGap, setCubeEqGap] = useState<number>(2);
  const [cubeEqColorStyle, setCubeEqColorStyle] = useState<string>('primary_secondary');
  const [cubeEqPositionX, setCubeEqPositionX] = useState<number>(50);
  const [cubeEqPositionY, setCubeEqPositionY] = useState<number>(70);

  // 3D Floating Cosmic Space Cubes State
  const [floatingCubesCount, setFloatingCubesCount] = useState<number>(16);
  const [floatingCubesArrangement, setFloatingCubesArrangement] = useState<CubesArrangementType>('random');
  const [floatingCubesSeed, setFloatingCubesSeed] = useState<number>(1337);
  const [floatingCubesOffsetX, setFloatingCubesOffsetX] = useState<number>(0);
  const [floatingCubesOffsetY, setFloatingCubesOffsetY] = useState<number>(0);
  const [floatingCubesOffsetZ, setFloatingCubesOffsetZ] = useState<number>(0);
  const [floatingCubesSpreadX, setFloatingCubesSpreadX] = useState<number>(60);
  const [floatingCubesSpreadY, setFloatingCubesSpreadY] = useState<number>(50);
  const [floatingCubesSpreadZ, setFloatingCubesSpreadZ] = useState<number>(60);
  const [floatingCubesRotSpeedX, setFloatingCubesRotSpeedX] = useState<number>(3);
  const [floatingCubesRotSpeedY, setFloatingCubesRotSpeedY] = useState<number>(4);
  const [floatingCubesRotSpeedZ, setFloatingCubesRotSpeedZ] = useState<number>(2);
  const [floatingCubesSize, setFloatingCubesSize] = useState<number>(32);
  const [floatingCubesStyle, setFloatingCubesStyle] = useState<CubesRenderStyleType>('shaded_glass');
  const [floatingCubesAudioReactive, setFloatingCubesAudioReactive] = useState<boolean>(true);

  // Liquid Blob Visualizer State
  const [blobTentacles, setBlobTentacles] = useState<number>(6);

  // Plasma Effect State
  const [plasmaSpeed, setPlasmaSpeed] = useState<number>(3);

  // Audio Flames Effect State
  const [fireIntensity, setFireIntensity] = useState<number>(60);

  // Toggle Handlers for Multi-Layering
  const toggleBackground = (bgType: BackgroundType) => {
    setActiveBackgrounds(prev => {
      if (prev.includes(bgType)) {
        return prev.filter(b => b !== bgType);
      } else {
        return [...prev, bgType];
      }
    });
  };

  const toggleVisualizer = (visType: VisualizerType) => {
    setActiveVisualizers(prev => {
      if (prev.includes(visType)) {
        return prev.filter(v => v !== visType);
      } else {
        return [...prev, visType];
      }
    });
  };

  const toggleEffect = (effType: EffectType) => {
    if (effType === 'none') {
      setActiveEffects([]);
      return;
    }
    setActiveEffects(prev => {
      if (prev.includes(effType)) {
        return prev.filter(e => e !== effType);
      } else {
        return [...prev, effType];
      }
    });
  };

  // Timer Overlay State
  const [showTimerOverlay, setShowTimerOverlay] = useState<boolean>(true);
  const [timerXPercent, setTimerXPercent] = useState<number>(12);
  const [timerYPercent, setTimerYPercent] = useState<number>(8);
  const [timerSize, setTimerSize] = useState<number>(20);
  const [timerStyle, setTimerStyle] = useState<'elapsed_total' | 'elapsed_only' | 'countdown'>('elapsed_total');
  const [timerColorStyle, setTimerColorStyle] = useState<'primary' | 'cyan' | 'amber' | 'green' | 'white'>('primary');

  // Text & Logo Branding
  const [artistName, setArtistName] = useState<string>('SYN-Tracker User');
  const [songTitle, setSongTitle] = useState<string>(song.name || 'Retro Track');
  const [showTextOverlay, setShowTextOverlay] = useState<boolean>(true);
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center'>('bottom');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [logoScale, setLogoScale] = useState<number>(100);
  const [logoOpacity, setLogoOpacity] = useState<number>(80);
  const [bgImageDataUrl, setBgImageDataUrl] = useState<string | null>(null);
  const [bgImageFit, setBgImageFit] = useState<'cover' | 'contain' | 'original' | 'stretch'>('cover');
  const [bgImageScale, setBgImageScale] = useState<number>(100);
  const [bgImageXPercent, setBgImageXPercent] = useState<number>(50);
  const [bgImageYPercent, setBgImageYPercent] = useState<number>(50);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(100);
  const [bgImageBlur, setBgImageBlur] = useState<number>(0);
  const [bgImageBassPulse, setBgImageBassPulse] = useState<boolean>(false);
  const [bgImageAutoFitSafe, setBgImageAutoFitSafe] = useState<boolean>(true);
  const [logoAutoFitSafe, setLogoAutoFitSafe] = useState<boolean>(true);

  // Advanced FX & Position Customizations
  const [starDirection, setStarDirection] = useState<StarDirectionType>('down');
  const [starSpeed, setStarSpeed] = useState<number>(3);
  const [starCount, setStarCount] = useState<number>(120);
  const [starRotation, setStarRotation] = useState<number>(0);

  // 360° Radial Bar Customizations
  const [radialRadius, setRadialRadius] = useState<number>(22);
  const [radialBarHeight, setRadialBarHeight] = useState<number>(80);
  const [radialBarCount, setRadialBarCount] = useState<number>(64);
  const [radialArcAngle, setRadialArcAngle] = useState<number>(360);
  const [radialXPercent, setRadialXPercent] = useState<number>(50);
  const [radialYPercent, setRadialYPercent] = useState<number>(50);
  const [radialMirror, setRadialMirror] = useState<boolean>(true);

  // 3D Vector Sphere Customizations
  const [sphereRadius, setSphereRadius] = useState<number>(22);
  const [sphereXPercent, setSphereXPercent] = useState<number>(50);
  const [sphereYPercent, setSphereYPercent] = useState<number>(50);
  const [sphereSoundSens, setSphereSoundSens] = useState<number>(60);
  const [sphereRings, setSphereRings] = useState<number>(12);
  const [sphereRotSpeed, setSphereRotSpeed] = useState<number>(4);
  const [sphereStyle, setSphereStyle] = useState<'wireframe' | 'dots' | 'rings'>('wireframe');

  // Glowing Orbs Customizations
  const [orbColor1, setOrbColor1] = useState<string>('#38bdf8');
  const [orbColor2, setOrbColor2] = useState<string>('#ec4899');
  const [orbSize, setOrbSize] = useState<number>(160);
  const [orbSpeed, setOrbSpeed] = useState<number>(4);
  const [orbSoundPulse, setOrbSoundPulse] = useState<boolean>(true);

  // Matrix Rain Customizations
  const [matrixSpeed, setMatrixSpeed] = useState<number>(5);
  const [matrixDensity, setMatrixDensity] = useState<number>(35);
  const [matrixFontSize, setMatrixFontSize] = useState<number>(13);
  const [matrixColorTheme, setMatrixColorTheme] = useState<'green' | 'cyan' | 'red' | 'gold'>('green');

  // Synth Grid Customizations
  const [gridHorizonY, setGridHorizonY] = useState<number>(60);
  const [gridSpeed, setGridSpeed] = useState<number>(3);
  const [gridDensity, setGridDensity] = useState<number>(24);
  const [gridColor, setGridColor] = useState<string>('#38bdf8');
  const [gridHorizonGlowColor, setGridHorizonGlowColor] = useState<string>('#ec4899');
  const [gridBassPulse, setGridBassPulse] = useState<boolean>(true);

  // Phyllotaxis Spiral Customizations
  const [phylloSize, setPhylloSize] = useState<number>(16);
  const [phylloCount, setPhylloCount] = useState<number>(180);
  const [phylloColorTheme, setPhylloColorTheme] = useState<string>('primary_secondary');
  const [phylloXPercent, setPhylloXPercent] = useState<number>(50);
  const [phylloYPercent, setPhylloYPercent] = useState<number>(50);
  const [phylloRotSpeed, setPhylloRotSpeed] = useState<number>(2);
  const [phylloRotate, setPhylloRotate] = useState<boolean>(true);
  const [phylloSoundPulse, setPhylloSoundPulse] = useState<boolean>(true);

  const [showScrollerText, setShowScrollerText] = useState<boolean>(true);
  const [scrollerText, setScrollerText] = useState<string>('+++ SYN-TRACKER CHIPTUNE DEMO STUDIO +++ GREETS TO AMIGA PROTRACKER & COMMODORE 64 SCENE +++ LIKE & SUBSCRIBE +++');
  const [scrollerSpeed, setScrollerSpeed] = useState<number>(2);
  const [scrollerFontSize, setScrollerFontSize] = useState<number>(24);
  const [scrollerYPos, setScrollerYPos] = useState<number>(93);
  const [scrollerSineBounce, setScrollerSineBounce] = useState<boolean>(true);
  const [scrollerMotionMode, setScrollerMotionMode] = useState<ScrollerMotionType>('bounce');
  const [scrollerAmplitude, setScrollerAmplitude] = useState<number>(14);
  const [scrollerFrequency, setScrollerFrequency] = useState<number>(4);
  const [scrollerGlow, setScrollerGlow] = useState<number>(35);
  const [scrollerBackdrop, setScrollerBackdrop] = useState<boolean>(false);
  const [scrollerColorStyle, setScrollerColorStyle] = useState<ScrollerColorType>('rainbow');

  const [copperBarCount, setCopperBarCount] = useState<number>(8);
  const [copperBarHeight, setCopperBarHeight] = useState<number>(8);
  const [copperBarSpeed, setCopperBarSpeed] = useState<number>(4);
  const [copperBarAngle, setCopperBarAngle] = useState<number>(0);
  const [copperBarYPos, setCopperBarYPos] = useState<number>(20);
  const [copperColorTheme, setCopperColorTheme] = useState<CopperThemeType>('rainbow');

  const [logoXPercent, setLogoXPercent] = useState<number>(85);
  const [logoYPercent, setLogoYPercent] = useState<number>(15);
  const [logoBassPulse, setLogoBassPulse] = useState<boolean>(true);
  const [textXPercent, setTextXPercent] = useState<number>(50);
  const [textYPercent, setTextYPercent] = useState<number>(82);
  const [textSize, setTextSize] = useState<number>(26);

  // Preset Management
  const [savedPresets, setSavedPresets] = useState<VisualizerPreset[]>([]);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Active Tab in Controls Panel (Default to 'ratio' / Backgrounds)
  const [activeTab, setActiveTab] = useState<'presets' | 'ratio' | 'visualizer' | 'juice' | 'effects' | 'scroller' | 'branding'>('ratio');

  // Video Recording Options & Automation State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordFromStart, setRecordFromStart] = useState<boolean>(true);
  const [autoStopAtEnd, setAutoStopAtEnd] = useState<boolean>(true);
  const [targetFps, setTargetFps] = useState<number>(60);
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('webm');
  
  // Offline HQ Master Render States
  const [isMasterRendering, setIsMasterRendering] = useState<boolean>(false);
  const isMasterRenderingRef = useRef<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<{
    phase: string;
    frame: number;
    totalFrames: number;
    percent: number;
  }>({ phase: '', frame: 0, totalFrames: 0, percent: 0 });
  const cancelRenderRef = useRef<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderFrameRef = useRef<((overrideAudio?: any) => void) | null>(null);

  // Check browser MP4 support
  const isMp4Supported = React.useMemo(() => {
    if (typeof MediaRecorder === 'undefined') return false;
    return (
      MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2') ||
      MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ||
      MediaRecorder.isTypeSupported('video/mp4')
    );
  }, []);

  // Calculate estimated song duration for recorder automation
  const estimatedSongDurationSeconds = React.useMemo(() => {
    if (!song || !song.orderList || song.orderList.length === 0) return 0;
    const bpm = song.bpm || 125;
    const speed = song.speed || 6;
    const secondsPerRow = (speed * 2.5) / bpm;

    let totalRows = 0;
    song.orderList.forEach((patId) => {
      const pat = song.patterns.find((p) => p.id === patId);
      totalRows += pat ? pat.length : 64;
    });

    return Math.round(totalRows * secondsPerRow);
  }, [song]);

  const formattedSongDuration = React.useMemo(() => {
    const mins = Math.floor(estimatedSongDurationSeconds / 60);
    const secs = estimatedSongDurationSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [estimatedSongDurationSeconds]);

  // Image elements for Canvas rendering
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  // Load Presets from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PRESETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPresets(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load visualizer presets', e);
    }
  }, []);

  // Update song title when song prop changes
  useEffect(() => {
    if (song.name) {
      setSongTitle(song.name);
    }
  }, [song.name]);

  // Load image objects when data URLs change
  useEffect(() => {
    if (logoDataUrl) {
      const img = new Image();
      img.src = logoDataUrl;
      img.onload = () => {
        logoImgRef.current = img;
      };
    } else {
      logoImgRef.current = null;
    }
  }, [logoDataUrl]);

  useEffect(() => {
    if (bgImageDataUrl) {
      const img = new Image();
      img.src = bgImageDataUrl;
      img.onload = () => {
        bgImgRef.current = img;
      };
    } else {
      bgImgRef.current = null;
    }
  }, [bgImageDataUrl]);

  // Handle Preset Save
  const handleSavePreset = () => {
    const nameToSave = presetNameInput.trim() || `Preset ${aspectRatio} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const newPreset: VisualizerPreset = {
      id: 'preset_' + Date.now(),
      name: nameToSave,
      aspectRatio,
      background: activeBackgrounds[0] || 'grid',
      activeBackgrounds,
      bgColor1,
      bgColor2,
      bgGradientAngle,
      bgGradientType,
      visualizer: activeVisualizers[0] || 'spectrum',
      activeVisualizers,
      primaryColor,
      secondaryColor,
      effect: activeEffects[0] || 'none',
      activeEffects,
      scanlines,
      vhsNoise,
      vignette,
      crtGlitch,
      artistName,
      songTitle,
      showTextOverlay,
      textPosition,
      logoDataUrl,
      logoPosition,
      logoScale,
      logoOpacity,
      bgImageDataUrl,
      bgImageFit,
      bgImageScale,
      bgImageXPercent,
      bgImageYPercent,
      bgImageOpacity,
      bgImageBlur,
      bgImageBassPulse,
      bgImageAutoFitSafe,
      logoAutoFitSafe,
      createdAt: Date.now(),
      showTimerOverlay,
      timerXPercent,
      timerYPercent,
      timerSize,
      timerStyle,
      timerColorStyle,
      starDirection,
      starSpeed,
      starCount,
      starRotation,
      showScrollerText,
      scrollerText,
      scrollerSpeed,
      scrollerFontSize,
      scrollerYPos,
      scrollerSineBounce,
      scrollerMotionMode,
      scrollerAmplitude,
      scrollerFrequency,
      scrollerGlow,
      scrollerBackdrop,
      scrollerColorStyle,
      copperBarCount,
      copperBarHeight,
      copperBarSpeed,
      copperBarAngle,
      copperBarYPos,
      copperColorTheme,
      logoXPercent,
      logoYPercent,
      logoBassPulse,
      textXPercent,
      textYPercent,
      textSize,
      orbColor1,
      orbColor2,
      orbSize,
      orbSpeed,
      orbSoundPulse,
      radialRadius,
      radialBarHeight,
      radialBarCount,
      radialArcAngle,
      radialXPercent,
      radialYPercent,
      radialMirror,
      sphereRadius,
      sphereXPercent,
      sphereYPercent,
      sphereSoundSens,
      sphereRings,
      sphereRotSpeed,
      sphereStyle,
      matrixSpeed,
      matrixDensity,
      matrixFontSize,
      matrixColorTheme,
      gridHorizonY,
      gridSpeed,
      gridDensity,
      gridColor,
      gridHorizonGlowColor,
      gridBassPulse,
      phylloSize,
      phylloCount,
      phylloColorTheme,
      phylloXPercent,
      phylloYPercent,
      phylloRotSpeed,
      phylloRotate,
      phylloSoundPulse,
      audioGain,
      bassShake,
      colorCycleSpeed,
      bloomGlow,
      chromaticAberration,
      kaleidoscope,
      kaleidoscopeSegments,
      tunnelSpeed,
      tunnelSegments,
      laserCount,
      laserOrigin,
      laserSpeed,
      laserBeamWidth,
      laserSpread,
      laserPattern,
      laserSoundSens,
      laserColorTheme,
      laserCenterGlow,
      plasmaSpeed,
      fireIntensity,
      auroraSpeed,
      auroraDensity,
      citySpeed,
      hudRadius,
      cubesCount,
      cubeEqHeightScale,
      cubeEqIsometricAngle,
      cubeEqGap,
      cubeEqColorStyle,
      cubeEqPositionX,
      cubeEqPositionY,
      floatingCubesCount,
      floatingCubesArrangement,
      floatingCubesSeed,
      floatingCubesOffsetX,
      floatingCubesOffsetY,
      floatingCubesOffsetZ,
      floatingCubesSpreadX,
      floatingCubesSpreadY,
      floatingCubesSpreadZ,
      floatingCubesRotSpeedX,
      floatingCubesRotSpeedY,
      floatingCubesRotSpeedZ,
      floatingCubesSize,
      floatingCubesStyle,
      floatingCubesAudioReactive,
      blobTentacles,
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
      onShowToast(`Saved preset "${nameToSave}" in LocalStorage!`);
      setPresetNameInput('');
      setSelectedPresetId(newPreset.id);
    } catch (e) {
      onShowToast('Error saving preset to LocalStorage.');
    }
  };

  // Handle Load Preset
  const handleLoadPreset = (preset: VisualizerPreset) => {
    setAspectRatio(preset.aspectRatio);
    if (preset.activeBackgrounds && preset.activeBackgrounds.length > 0) {
      setActiveBackgrounds(preset.activeBackgrounds);
    } else if (preset.background) {
      setActiveBackgrounds([preset.background]);
    }
    setBgColor1(preset.bgColor1);
    setBgColor2(preset.bgColor2);
    if (preset.bgGradientAngle !== undefined) setBgGradientAngle(preset.bgGradientAngle);
    if (preset.bgGradientType) setBgGradientType(preset.bgGradientType);
    if (preset.activeVisualizers && preset.activeVisualizers.length > 0) {
      setActiveVisualizers(preset.activeVisualizers);
    } else if (preset.visualizer) {
      setActiveVisualizers([preset.visualizer]);
    }
    setPrimaryColor(preset.primaryColor);
    setSecondaryColor(preset.secondaryColor);
    if (preset.activeEffects) {
      setActiveEffects(preset.activeEffects);
    } else if (preset.effect && preset.effect !== 'none') {
      setActiveEffects([preset.effect]);
    } else {
      setActiveEffects([]);
    }
    setScanlines(preset.scanlines);
    setVhsNoise(preset.vhsNoise);
    setVignette(preset.vignette);
    setCrtGlitch(preset.crtGlitch);
    setArtistName(preset.artistName);
    setSongTitle(preset.songTitle);
    setShowTextOverlay(preset.showTextOverlay);
    setTextPosition(preset.textPosition);
    if (preset.showTimerOverlay !== undefined) setShowTimerOverlay(preset.showTimerOverlay);
    if (preset.timerXPercent !== undefined) setTimerXPercent(preset.timerXPercent);
    if (preset.timerYPercent !== undefined) setTimerYPercent(preset.timerYPercent);
    if (preset.timerSize !== undefined) setTimerSize(preset.timerSize);
    if (preset.timerStyle) setTimerStyle(preset.timerStyle);
    if (preset.timerColorStyle) setTimerColorStyle(preset.timerColorStyle);
    setLogoDataUrl(preset.logoDataUrl);
    setLogoPosition(preset.logoPosition);
    setLogoScale(preset.logoScale);
    setLogoOpacity(preset.logoOpacity);
    setBgImageDataUrl(preset.bgImageDataUrl);
    if (preset.bgImageFit) setBgImageFit(preset.bgImageFit);
    if (preset.bgImageScale !== undefined) setBgImageScale(preset.bgImageScale);
    if (preset.bgImageXPercent !== undefined) setBgImageXPercent(preset.bgImageXPercent);
    if (preset.bgImageYPercent !== undefined) setBgImageYPercent(preset.bgImageYPercent);
    if (preset.bgImageOpacity !== undefined) setBgImageOpacity(preset.bgImageOpacity);
    if (preset.bgImageBlur !== undefined) setBgImageBlur(preset.bgImageBlur);
    if (preset.bgImageBassPulse !== undefined) setBgImageBassPulse(preset.bgImageBassPulse);
    if (preset.bgImageAutoFitSafe !== undefined) setBgImageAutoFitSafe(preset.bgImageAutoFitSafe);
    if (preset.logoAutoFitSafe !== undefined) setLogoAutoFitSafe(preset.logoAutoFitSafe);

    if (preset.starDirection) setStarDirection(preset.starDirection);
    if (preset.starSpeed !== undefined) setStarSpeed(preset.starSpeed);
    if (preset.starCount !== undefined) setStarCount(preset.starCount);
    if (preset.starRotation !== undefined) setStarRotation(preset.starRotation);

    if (preset.showScrollerText !== undefined) setShowScrollerText(preset.showScrollerText);
    if (preset.scrollerText !== undefined) setScrollerText(preset.scrollerText);
    if (preset.scrollerSpeed !== undefined) setScrollerSpeed(preset.scrollerSpeed);
    if (preset.scrollerFontSize !== undefined) setScrollerFontSize(preset.scrollerFontSize);
    if (preset.scrollerYPos !== undefined) setScrollerYPos(preset.scrollerYPos);
    if (preset.scrollerSineBounce !== undefined) setScrollerSineBounce(preset.scrollerSineBounce);
    if (preset.scrollerMotionMode) setScrollerMotionMode(preset.scrollerMotionMode);
    if (preset.scrollerAmplitude !== undefined) setScrollerAmplitude(preset.scrollerAmplitude);
    if (preset.scrollerFrequency !== undefined) setScrollerFrequency(preset.scrollerFrequency);
    if (preset.scrollerGlow !== undefined) setScrollerGlow(preset.scrollerGlow);
    if (preset.scrollerBackdrop !== undefined) setScrollerBackdrop(preset.scrollerBackdrop);
    if (preset.scrollerColorStyle) setScrollerColorStyle(preset.scrollerColorStyle);

    if (preset.copperBarCount !== undefined) setCopperBarCount(preset.copperBarCount);
    if (preset.copperBarHeight !== undefined) setCopperBarHeight(preset.copperBarHeight);
    if (preset.copperBarSpeed !== undefined) setCopperBarSpeed(preset.copperBarSpeed);
    if (preset.copperBarAngle !== undefined) setCopperBarAngle(preset.copperBarAngle);
    if (preset.copperBarYPos !== undefined) setCopperBarYPos(preset.copperBarYPos);
    if (preset.copperColorTheme) setCopperColorTheme(preset.copperColorTheme);

    if (preset.logoXPercent !== undefined) setLogoXPercent(preset.logoXPercent);
    if (preset.logoYPercent !== undefined) setLogoYPercent(preset.logoYPercent);
    if (preset.logoBassPulse !== undefined) setLogoBassPulse(preset.logoBassPulse);
    if (preset.textXPercent !== undefined) setTextXPercent(preset.textXPercent);
    if (preset.textYPercent !== undefined) setTextYPercent(preset.textYPercent);
    if (preset.textSize !== undefined) setTextSize(preset.textSize);

    if (preset.orbColor1) setOrbColor1(preset.orbColor1);
    if (preset.orbColor2) setOrbColor2(preset.orbColor2);
    if (preset.orbSize !== undefined) setOrbSize(preset.orbSize);
    if (preset.orbSpeed !== undefined) setOrbSpeed(preset.orbSpeed);
    if (preset.orbSoundPulse !== undefined) setOrbSoundPulse(preset.orbSoundPulse);

    if (preset.radialRadius !== undefined) setRadialRadius(preset.radialRadius);
    if (preset.radialBarHeight !== undefined) setRadialBarHeight(preset.radialBarHeight);
    if (preset.radialBarCount !== undefined) setRadialBarCount(preset.radialBarCount);
    if (preset.radialArcAngle !== undefined) setRadialArcAngle(preset.radialArcAngle);
    if (preset.radialXPercent !== undefined) setRadialXPercent(preset.radialXPercent);
    if (preset.radialYPercent !== undefined) setRadialYPercent(preset.radialYPercent);
    if (preset.radialMirror !== undefined) setRadialMirror(preset.radialMirror);

    if (preset.sphereRadius !== undefined) setSphereRadius(preset.sphereRadius);
    if (preset.sphereXPercent !== undefined) setSphereXPercent(preset.sphereXPercent);
    if (preset.sphereYPercent !== undefined) setSphereYPercent(preset.sphereYPercent);
    if (preset.sphereSoundSens !== undefined) setSphereSoundSens(preset.sphereSoundSens);
    if (preset.sphereRings !== undefined) setSphereRings(preset.sphereRings);
    if (preset.sphereRotSpeed !== undefined) setSphereRotSpeed(preset.sphereRotSpeed);
    if (preset.sphereStyle) setSphereStyle(preset.sphereStyle);

    if (preset.matrixSpeed !== undefined) setMatrixSpeed(preset.matrixSpeed);
    if (preset.matrixDensity !== undefined) setMatrixDensity(preset.matrixDensity);
    if (preset.matrixFontSize !== undefined) setMatrixFontSize(preset.matrixFontSize);
    if (preset.matrixColorTheme) setMatrixColorTheme(preset.matrixColorTheme);

    if (preset.gridHorizonY !== undefined) setGridHorizonY(preset.gridHorizonY);
    if (preset.gridSpeed !== undefined) setGridSpeed(preset.gridSpeed);
    if (preset.gridDensity !== undefined) setGridDensity(preset.gridDensity);
    if (preset.gridColor) setGridColor(preset.gridColor);
    if (preset.gridHorizonGlowColor) setGridHorizonGlowColor(preset.gridHorizonGlowColor);
    if (preset.gridBassPulse !== undefined) setGridBassPulse(preset.gridBassPulse);

    if (preset.phylloSize !== undefined) setPhylloSize(preset.phylloSize);
    if (preset.phylloCount !== undefined) setPhylloCount(preset.phylloCount);
    if (preset.phylloColorTheme) setPhylloColorTheme(preset.phylloColorTheme);
    if (preset.phylloXPercent !== undefined) setPhylloXPercent(preset.phylloXPercent);
    if (preset.phylloYPercent !== undefined) setPhylloYPercent(preset.phylloYPercent);
    if (preset.phylloRotSpeed !== undefined) setPhylloRotSpeed(preset.phylloRotSpeed);
    if (preset.phylloRotate !== undefined) setPhylloRotate(preset.phylloRotate);
    if (preset.phylloSoundPulse !== undefined) setPhylloSoundPulse(preset.phylloSoundPulse);

    if (preset.audioGain !== undefined) setAudioGain(preset.audioGain);
    if (preset.bassShake !== undefined) setBassShake(preset.bassShake);
    if (preset.colorCycleSpeed !== undefined) setColorCycleSpeed(preset.colorCycleSpeed);
    if (preset.bloomGlow !== undefined) setBloomGlow(preset.bloomGlow);
    if (preset.chromaticAberration !== undefined) setChromaticAberration(preset.chromaticAberration);
    if (preset.kaleidoscope !== undefined) setKaleidoscope(preset.kaleidoscope);
    if (preset.kaleidoscopeSegments !== undefined) setKaleidoscopeSegments(preset.kaleidoscopeSegments);

    if (preset.tunnelSpeed !== undefined) setTunnelSpeed(preset.tunnelSpeed);
    if (preset.tunnelSegments !== undefined) setTunnelSegments(preset.tunnelSegments);
    if (preset.laserCount !== undefined) setLaserCount(preset.laserCount);
    if (preset.laserOrigin) setLaserOrigin(preset.laserOrigin);
    if (preset.laserSpeed !== undefined) setLaserSpeed(preset.laserSpeed);
    if (preset.laserBeamWidth !== undefined) setLaserBeamWidth(preset.laserBeamWidth);
    if (preset.laserSpread !== undefined) setLaserSpread(preset.laserSpread);
    if (preset.laserPattern) setLaserPattern(preset.laserPattern);
    if (preset.laserSoundSens !== undefined) setLaserSoundSens(preset.laserSoundSens);
    if (preset.laserColorTheme) setLaserColorTheme(preset.laserColorTheme);
    if (preset.laserCenterGlow !== undefined) setLaserCenterGlow(preset.laserCenterGlow);
    if (preset.plasmaSpeed !== undefined) setPlasmaSpeed(preset.plasmaSpeed);
    if (preset.fireIntensity !== undefined) setFireIntensity(preset.fireIntensity);
    if (preset.auroraSpeed !== undefined) setAuroraSpeed(preset.auroraSpeed);
    if (preset.auroraDensity !== undefined) setAuroraDensity(preset.auroraDensity);
    if (preset.citySpeed !== undefined) setCitySpeed(preset.citySpeed);
    if (preset.hudRadius !== undefined) setHudRadius(preset.hudRadius);
    if (preset.cubesCount !== undefined) setCubesCount(preset.cubesCount);
    if (preset.cubeEqHeightScale !== undefined) setCubeEqHeightScale(preset.cubeEqHeightScale);
    if (preset.cubeEqIsometricAngle !== undefined) setCubeEqIsometricAngle(preset.cubeEqIsometricAngle);
    if (preset.cubeEqGap !== undefined) setCubeEqGap(preset.cubeEqGap);
    if (preset.cubeEqColorStyle) setCubeEqColorStyle(preset.cubeEqColorStyle);
    if (preset.cubeEqPositionX !== undefined) setCubeEqPositionX(preset.cubeEqPositionX);
    if (preset.cubeEqPositionY !== undefined) setCubeEqPositionY(preset.cubeEqPositionY);

    if (preset.floatingCubesCount !== undefined) setFloatingCubesCount(preset.floatingCubesCount);
    if (preset.floatingCubesArrangement) setFloatingCubesArrangement(preset.floatingCubesArrangement);
    if (preset.floatingCubesSeed !== undefined) setFloatingCubesSeed(preset.floatingCubesSeed);
    if (preset.floatingCubesOffsetX !== undefined) setFloatingCubesOffsetX(preset.floatingCubesOffsetX);
    if (preset.floatingCubesOffsetY !== undefined) setFloatingCubesOffsetY(preset.floatingCubesOffsetY);
    if (preset.floatingCubesOffsetZ !== undefined) setFloatingCubesOffsetZ(preset.floatingCubesOffsetZ);
    if (preset.floatingCubesSpreadX !== undefined) setFloatingCubesSpreadX(preset.floatingCubesSpreadX);
    if (preset.floatingCubesSpreadY !== undefined) setFloatingCubesSpreadY(preset.floatingCubesSpreadY);
    if (preset.floatingCubesSpreadZ !== undefined) setFloatingCubesSpreadZ(preset.floatingCubesSpreadZ);
    if (preset.floatingCubesRotSpeedX !== undefined) setFloatingCubesRotSpeedX(preset.floatingCubesRotSpeedX);
    if (preset.floatingCubesRotSpeedY !== undefined) setFloatingCubesRotSpeedY(preset.floatingCubesRotSpeedY);
    if (preset.floatingCubesRotSpeedZ !== undefined) setFloatingCubesRotSpeedZ(preset.floatingCubesRotSpeedZ);
    if (preset.floatingCubesSize !== undefined) setFloatingCubesSize(preset.floatingCubesSize);
    if (preset.floatingCubesStyle) setFloatingCubesStyle(preset.floatingCubesStyle);
    if (preset.floatingCubesAudioReactive !== undefined) setFloatingCubesAudioReactive(preset.floatingCubesAudioReactive);

    if (preset.blobTentacles !== undefined) setBlobTentacles(preset.blobTentacles);

    setSelectedPresetId(preset.id);
    onShowToast(`Loaded preset "${preset.name}"!`);
  };

  // Visualizer Undo / Redo History State
  const [visHistory, setVisHistory] = useState<Partial<VisualizerPreset>[]>([]);
  const [visHistoryIndex, setVisHistoryIndex] = useState<number>(-1);
  const isVisUndoingRedoingRef = useRef<boolean>(false);
  const visRecordTimeoutRef = useRef<any>(null);

  const getVisualizerSnapshot = useCallback((): Partial<VisualizerPreset> => {
    return {
      aspectRatio,
      activeBackgrounds: [...activeBackgrounds],
      bgColor1,
      bgColor2,
      bgGradientAngle,
      bgGradientType,
      activeVisualizers: [...activeVisualizers],
      primaryColor,
      secondaryColor,
      activeEffects: [...activeEffects],
      scanlines,
      vhsNoise,
      vignette,
      crtGlitch,
      artistName,
      songTitle,
      showTextOverlay,
      textPosition,
      showTimerOverlay,
      timerXPercent,
      timerYPercent,
      timerSize,
      timerStyle,
      timerColorStyle,
      logoDataUrl,
      logoPosition,
      logoScale,
      logoOpacity,
      bgImageDataUrl,
      bgImageFit,
      bgImageScale,
      bgImageXPercent,
      bgImageYPercent,
      bgImageOpacity,
      bgImageBlur,
      bgImageBassPulse,
      bgImageAutoFitSafe,
      logoAutoFitSafe,
      starDirection,
      starSpeed,
      starCount,
      starRotation,
      showScrollerText,
      scrollerText,
      scrollerSpeed,
      scrollerFontSize,
      scrollerYPos,
      scrollerSineBounce,
      scrollerMotionMode,
      scrollerAmplitude,
      scrollerFrequency,
      scrollerGlow,
      scrollerBackdrop,
      scrollerColorStyle,
      copperBarCount,
      copperBarHeight,
      copperBarSpeed,
      copperBarAngle,
      copperBarYPos,
      copperColorTheme,
      logoXPercent,
      logoYPercent,
      logoBassPulse,
      textXPercent,
      textYPercent,
      textSize,
      orbColor1,
      orbColor2,
      orbSize,
      orbSpeed,
      orbSoundPulse,
      radialRadius,
      radialBarHeight,
      radialBarCount,
      radialArcAngle,
      radialXPercent,
      radialYPercent,
      radialMirror,
      sphereRadius,
      sphereXPercent,
      sphereYPercent,
      sphereSoundSens,
      sphereRings,
      sphereRotSpeed,
      sphereStyle,
      matrixSpeed,
      matrixDensity,
      matrixFontSize,
      matrixColorTheme,
      gridHorizonY,
      gridSpeed,
      gridDensity,
      gridColor,
      gridHorizonGlowColor,
      gridBassPulse,
      phylloSize,
      phylloCount,
      phylloColorTheme,
      phylloXPercent,
      phylloYPercent,
      phylloRotSpeed,
      phylloRotate,
      phylloSoundPulse,
      audioGain,
      bassShake,
      colorCycleSpeed,
      bloomGlow,
      chromaticAberration,
      kaleidoscope,
      kaleidoscopeSegments,
      tunnelSpeed,
      tunnelSegments,
      laserCount,
      laserOrigin,
      laserSpeed,
      laserBeamWidth,
      laserSpread,
      laserPattern,
      laserSoundSens,
      laserColorTheme,
      laserCenterGlow,
      plasmaSpeed,
      fireIntensity,
      auroraSpeed,
      auroraDensity,
      citySpeed,
      hudRadius,
      cubesCount,
      cubeEqHeightScale,
      cubeEqIsometricAngle,
      cubeEqGap,
      cubeEqColorStyle,
      cubeEqPositionX,
      cubeEqPositionY,
      floatingCubesCount,
      floatingCubesArrangement,
      floatingCubesSeed,
      floatingCubesOffsetX,
      floatingCubesOffsetY,
      floatingCubesOffsetZ,
      floatingCubesSpreadX,
      floatingCubesSpreadY,
      floatingCubesSpreadZ,
      floatingCubesRotSpeedX,
      floatingCubesRotSpeedY,
      floatingCubesRotSpeedZ,
      floatingCubesSize,
      floatingCubesStyle,
      floatingCubesAudioReactive,
      blobTentacles,
    };
  }, [
    aspectRatio,
    activeBackgrounds,
    bgColor1,
    bgColor2,
    bgGradientAngle,
    bgGradientType,
    activeVisualizers,
    primaryColor,
    secondaryColor,
    activeEffects,
    scanlines,
    vhsNoise,
    vignette,
    crtGlitch,
    artistName,
    songTitle,
    showTextOverlay,
    textPosition,
    showTimerOverlay,
    timerXPercent,
    timerYPercent,
    timerSize,
    timerStyle,
    timerColorStyle,
    logoDataUrl,
    logoPosition,
    logoScale,
    logoOpacity,
    bgImageDataUrl,
    bgImageFit,
    bgImageScale,
    bgImageXPercent,
    bgImageYPercent,
    bgImageOpacity,
    bgImageBlur,
    bgImageBassPulse,
    starDirection,
    starSpeed,
    starCount,
    starRotation,
    showScrollerText,
    scrollerText,
    scrollerSpeed,
    scrollerFontSize,
    scrollerYPos,
    scrollerSineBounce,
    scrollerMotionMode,
    scrollerAmplitude,
    scrollerFrequency,
    scrollerGlow,
    scrollerBackdrop,
    scrollerColorStyle,
    copperBarCount,
    copperBarHeight,
    copperBarSpeed,
    copperBarAngle,
    copperBarYPos,
    copperColorTheme,
    logoXPercent,
    logoYPercent,
    logoBassPulse,
    textXPercent,
    textYPercent,
    textSize,
    orbColor1,
    orbColor2,
    orbSize,
    orbSpeed,
    orbSoundPulse,
    radialRadius,
    radialBarHeight,
    radialBarCount,
    radialArcAngle,
    radialXPercent,
    radialYPercent,
    radialMirror,
    sphereRadius,
    sphereXPercent,
    sphereYPercent,
    sphereSoundSens,
    sphereRings,
    sphereRotSpeed,
    sphereStyle,
    matrixSpeed,
    matrixDensity,
    matrixFontSize,
    matrixColorTheme,
    gridHorizonY,
    gridSpeed,
    gridDensity,
    gridColor,
    gridHorizonGlowColor,
    gridBassPulse,
    phylloSize,
    phylloCount,
    phylloColorTheme,
    phylloXPercent,
    phylloYPercent,
    phylloRotSpeed,
    phylloRotate,
    phylloSoundPulse,
    audioGain,
    bassShake,
    colorCycleSpeed,
    bloomGlow,
    chromaticAberration,
    kaleidoscope,
    kaleidoscopeSegments,
    tunnelSpeed,
    tunnelSegments,
    laserCount,
    laserOrigin,
    laserSpeed,
    laserBeamWidth,
    laserSpread,
    laserPattern,
    laserSoundSens,
    laserColorTheme,
    laserCenterGlow,
    plasmaSpeed,
    fireIntensity,
    auroraSpeed,
    auroraDensity,
    citySpeed,
    hudRadius,
    cubesCount,
    cubeEqHeightScale,
    cubeEqIsometricAngle,
    cubeEqGap,
    cubeEqColorStyle,
    cubeEqPositionX,
    cubeEqPositionY,
    floatingCubesCount,
    floatingCubesArrangement,
    floatingCubesSeed,
    floatingCubesOffsetX,
    floatingCubesOffsetY,
    floatingCubesOffsetZ,
    floatingCubesSpreadX,
    floatingCubesSpreadY,
    floatingCubesSpreadZ,
    floatingCubesRotSpeedX,
    floatingCubesRotSpeedY,
    floatingCubesRotSpeedZ,
    floatingCubesSize,
    floatingCubesStyle,
    floatingCubesAudioReactive,
    blobTentacles,
  ]);

  const applyVisualizerSnapshot = useCallback((snap: Partial<VisualizerPreset>) => {
    isVisUndoingRedoingRef.current = true;
    if (snap.aspectRatio) setAspectRatio(snap.aspectRatio);
    if (snap.activeBackgrounds) setActiveBackgrounds(snap.activeBackgrounds);
    if (snap.bgColor1) setBgColor1(snap.bgColor1);
    if (snap.bgColor2) setBgColor2(snap.bgColor2);
    if (snap.bgGradientAngle !== undefined) setBgGradientAngle(snap.bgGradientAngle);
    if (snap.bgGradientType) setBgGradientType(snap.bgGradientType);
    if (snap.activeVisualizers) setActiveVisualizers(snap.activeVisualizers);
    if (snap.primaryColor) setPrimaryColor(snap.primaryColor);
    if (snap.secondaryColor) setSecondaryColor(snap.secondaryColor);
    if (snap.activeEffects) setActiveEffects(snap.activeEffects);
    if (snap.scanlines !== undefined) setScanlines(snap.scanlines);
    if (snap.vhsNoise !== undefined) setVhsNoise(snap.vhsNoise);
    if (snap.vignette !== undefined) setVignette(snap.vignette);
    if (snap.crtGlitch !== undefined) setCrtGlitch(snap.crtGlitch);
    if (snap.artistName !== undefined) setArtistName(snap.artistName);
    if (snap.songTitle !== undefined) setSongTitle(snap.songTitle);
    if (snap.showTextOverlay !== undefined) setShowTextOverlay(snap.showTextOverlay);
    if (snap.textPosition) setTextPosition(snap.textPosition);
    if (snap.showTimerOverlay !== undefined) setShowTimerOverlay(snap.showTimerOverlay);
    if (snap.timerXPercent !== undefined) setTimerXPercent(snap.timerXPercent);
    if (snap.timerYPercent !== undefined) setTimerYPercent(snap.timerYPercent);
    if (snap.timerSize !== undefined) setTimerSize(snap.timerSize);
    if (snap.timerStyle) setTimerStyle(snap.timerStyle);
    if (snap.timerColorStyle) setTimerColorStyle(snap.timerColorStyle);
    if (snap.logoDataUrl !== undefined) setLogoDataUrl(snap.logoDataUrl);
    if (snap.logoPosition) setLogoPosition(snap.logoPosition);
    if (snap.logoScale !== undefined) setLogoScale(snap.logoScale);
    if (snap.logoOpacity !== undefined) setLogoOpacity(snap.logoOpacity);
    if (snap.bgImageDataUrl !== undefined) setBgImageDataUrl(snap.bgImageDataUrl);
    if (snap.bgImageFit) setBgImageFit(snap.bgImageFit);
    if (snap.bgImageScale !== undefined) setBgImageScale(snap.bgImageScale);
    if (snap.bgImageXPercent !== undefined) setBgImageXPercent(snap.bgImageXPercent);
    if (snap.bgImageYPercent !== undefined) setBgImageYPercent(snap.bgImageYPercent);
    if (snap.bgImageOpacity !== undefined) setBgImageOpacity(snap.bgImageOpacity);
    if (snap.bgImageBlur !== undefined) setBgImageBlur(snap.bgImageBlur);
    if (snap.bgImageBassPulse !== undefined) setBgImageBassPulse(snap.bgImageBassPulse);
    if (snap.bgImageAutoFitSafe !== undefined) setBgImageAutoFitSafe(snap.bgImageAutoFitSafe);
    if (snap.logoAutoFitSafe !== undefined) setLogoAutoFitSafe(snap.logoAutoFitSafe);

    if (snap.starDirection) setStarDirection(snap.starDirection);
    if (snap.starSpeed !== undefined) setStarSpeed(snap.starSpeed);
    if (snap.starCount !== undefined) setStarCount(snap.starCount);
    if (snap.starRotation !== undefined) setStarRotation(snap.starRotation);

    if (snap.showScrollerText !== undefined) setShowScrollerText(snap.showScrollerText);
    if (snap.scrollerText !== undefined) setScrollerText(snap.scrollerText);
    if (snap.scrollerSpeed !== undefined) setScrollerSpeed(snap.scrollerSpeed);
    if (snap.scrollerFontSize !== undefined) setScrollerFontSize(snap.scrollerFontSize);
    if (snap.scrollerYPos !== undefined) setScrollerYPos(snap.scrollerYPos);
    if (snap.scrollerSineBounce !== undefined) setScrollerSineBounce(snap.scrollerSineBounce);
    if (snap.scrollerMotionMode) setScrollerMotionMode(snap.scrollerMotionMode);
    if (snap.scrollerAmplitude !== undefined) setScrollerAmplitude(snap.scrollerAmplitude);
    if (snap.scrollerFrequency !== undefined) setScrollerFrequency(snap.scrollerFrequency);
    if (snap.scrollerGlow !== undefined) setScrollerGlow(snap.scrollerGlow);
    if (snap.scrollerBackdrop !== undefined) setScrollerBackdrop(snap.scrollerBackdrop);
    if (snap.scrollerColorStyle) setScrollerColorStyle(snap.scrollerColorStyle);

    if (snap.copperBarCount !== undefined) setCopperBarCount(snap.copperBarCount);
    if (snap.copperBarHeight !== undefined) setCopperBarHeight(snap.copperBarHeight);
    if (snap.copperBarSpeed !== undefined) setCopperBarSpeed(snap.copperBarSpeed);
    if (snap.copperBarAngle !== undefined) setCopperBarAngle(snap.copperBarAngle);
    if (snap.copperBarYPos !== undefined) setCopperBarYPos(snap.copperBarYPos);
    if (snap.copperColorTheme) setCopperColorTheme(snap.copperColorTheme);

    if (snap.logoXPercent !== undefined) setLogoXPercent(snap.logoXPercent);
    if (snap.logoYPercent !== undefined) setLogoYPercent(snap.logoYPercent);
    if (snap.logoBassPulse !== undefined) setLogoBassPulse(snap.logoBassPulse);
    if (snap.textXPercent !== undefined) setTextXPercent(snap.textXPercent);
    if (snap.textYPercent !== undefined) setTextYPercent(snap.textYPercent);
    if (snap.textSize !== undefined) setTextSize(snap.textSize);

    if (snap.orbColor1) setOrbColor1(snap.orbColor1);
    if (snap.orbColor2) setOrbColor2(snap.orbColor2);
    if (snap.orbSize !== undefined) setOrbSize(snap.orbSize);
    if (snap.orbSpeed !== undefined) setOrbSpeed(snap.orbSpeed);
    if (snap.orbSoundPulse !== undefined) setOrbSoundPulse(snap.orbSoundPulse);

    if (snap.radialRadius !== undefined) setRadialRadius(snap.radialRadius);
    if (snap.radialBarHeight !== undefined) setRadialBarHeight(snap.radialBarHeight);
    if (snap.radialBarCount !== undefined) setRadialBarCount(snap.radialBarCount);
    if (snap.radialArcAngle !== undefined) setRadialArcAngle(snap.radialArcAngle);
    if (snap.radialXPercent !== undefined) setRadialXPercent(snap.radialXPercent);
    if (snap.radialYPercent !== undefined) setRadialYPercent(snap.radialYPercent);
    if (snap.radialMirror !== undefined) setRadialMirror(snap.radialMirror);

    if (snap.sphereRadius !== undefined) setSphereRadius(snap.sphereRadius);
    if (snap.sphereXPercent !== undefined) setSphereXPercent(snap.sphereXPercent);
    if (snap.sphereYPercent !== undefined) setSphereYPercent(snap.sphereYPercent);
    if (snap.sphereSoundSens !== undefined) setSphereSoundSens(snap.sphereSoundSens);
    if (snap.sphereRings !== undefined) setSphereRings(snap.sphereRings);
    if (snap.sphereRotSpeed !== undefined) setSphereRotSpeed(snap.sphereRotSpeed);
    if (snap.sphereStyle) setSphereStyle(snap.sphereStyle);

    if (snap.matrixSpeed !== undefined) setMatrixSpeed(snap.matrixSpeed);
    if (snap.matrixDensity !== undefined) setMatrixDensity(snap.matrixDensity);
    if (snap.matrixFontSize !== undefined) setMatrixFontSize(snap.matrixFontSize);
    if (snap.matrixColorTheme) setMatrixColorTheme(snap.matrixColorTheme);

    if (snap.gridHorizonY !== undefined) setGridHorizonY(snap.gridHorizonY);
    if (snap.gridSpeed !== undefined) setGridSpeed(snap.gridSpeed);
    if (snap.gridDensity !== undefined) setGridDensity(snap.gridDensity);
    if (snap.gridColor) setGridColor(snap.gridColor);
    if (snap.gridHorizonGlowColor) setGridHorizonGlowColor(snap.gridHorizonGlowColor);
    if (snap.gridBassPulse !== undefined) setGridBassPulse(snap.gridBassPulse);

    if (snap.phylloSize !== undefined) setPhylloSize(snap.phylloSize);
    if (snap.phylloCount !== undefined) setPhylloCount(snap.phylloCount);
    if (snap.phylloColorTheme) setPhylloColorTheme(snap.phylloColorTheme);
    if (snap.phylloXPercent !== undefined) setPhylloXPercent(snap.phylloXPercent);
    if (snap.phylloYPercent !== undefined) setPhylloYPercent(snap.phylloYPercent);
    if (snap.phylloRotSpeed !== undefined) setPhylloRotSpeed(snap.phylloRotSpeed);
    if (snap.phylloRotate !== undefined) setPhylloRotate(snap.phylloRotate);
    if (snap.phylloSoundPulse !== undefined) setPhylloSoundPulse(snap.phylloSoundPulse);

    if (snap.audioGain !== undefined) setAudioGain(snap.audioGain);
    if (snap.bassShake !== undefined) setBassShake(snap.bassShake);
    if (snap.colorCycleSpeed !== undefined) setColorCycleSpeed(snap.colorCycleSpeed);
    if (snap.bloomGlow !== undefined) setBloomGlow(snap.bloomGlow);
    if (snap.chromaticAberration !== undefined) setChromaticAberration(snap.chromaticAberration);
    if (snap.kaleidoscope !== undefined) setKaleidoscope(snap.kaleidoscope);
    if (snap.kaleidoscopeSegments !== undefined) setKaleidoscopeSegments(snap.kaleidoscopeSegments);

    if (snap.tunnelSpeed !== undefined) setTunnelSpeed(snap.tunnelSpeed);
    if (snap.tunnelSegments !== undefined) setTunnelSegments(snap.tunnelSegments);
    if (snap.laserCount !== undefined) setLaserCount(snap.laserCount);
    if (snap.laserOrigin) setLaserOrigin(snap.laserOrigin);
    if (snap.laserSpeed !== undefined) setLaserSpeed(snap.laserSpeed);
    if (snap.laserBeamWidth !== undefined) setLaserBeamWidth(snap.laserBeamWidth);
    if (snap.laserSpread !== undefined) setLaserSpread(snap.laserSpread);
    if (snap.laserPattern) setLaserPattern(snap.laserPattern);
    if (snap.laserSoundSens !== undefined) setLaserSoundSens(snap.laserSoundSens);
    if (snap.laserColorTheme) setLaserColorTheme(snap.laserColorTheme);
    if (snap.laserCenterGlow !== undefined) setLaserCenterGlow(snap.laserCenterGlow);
    if (snap.plasmaSpeed !== undefined) setPlasmaSpeed(snap.plasmaSpeed);
    if (snap.fireIntensity !== undefined) setFireIntensity(snap.fireIntensity);
    if (snap.auroraSpeed !== undefined) setAuroraSpeed(snap.auroraSpeed);
    if (snap.auroraDensity !== undefined) setAuroraDensity(snap.auroraDensity);
    if (snap.citySpeed !== undefined) setCitySpeed(snap.citySpeed);
    if (snap.hudRadius !== undefined) setHudRadius(snap.hudRadius);
    if (snap.cubesCount !== undefined) setCubesCount(snap.cubesCount);
    if (snap.cubeEqHeightScale !== undefined) setCubeEqHeightScale(snap.cubeEqHeightScale);
    if (snap.cubeEqIsometricAngle !== undefined) setCubeEqIsometricAngle(snap.cubeEqIsometricAngle);
    if (snap.cubeEqGap !== undefined) setCubeEqGap(snap.cubeEqGap);
    if (snap.cubeEqColorStyle) setCubeEqColorStyle(snap.cubeEqColorStyle);
    if (snap.cubeEqPositionX !== undefined) setCubeEqPositionX(snap.cubeEqPositionX);
    if (snap.cubeEqPositionY !== undefined) setCubeEqPositionY(snap.cubeEqPositionY);

    if (snap.floatingCubesCount !== undefined) setFloatingCubesCount(snap.floatingCubesCount);
    if (snap.floatingCubesArrangement) setFloatingCubesArrangement(snap.floatingCubesArrangement);
    if (snap.floatingCubesSeed !== undefined) setFloatingCubesSeed(snap.floatingCubesSeed);
    if (snap.floatingCubesOffsetX !== undefined) setFloatingCubesOffsetX(snap.floatingCubesOffsetX);
    if (snap.floatingCubesOffsetY !== undefined) setFloatingCubesOffsetY(snap.floatingCubesOffsetY);
    if (snap.floatingCubesOffsetZ !== undefined) setFloatingCubesOffsetZ(snap.floatingCubesOffsetZ);
    if (snap.floatingCubesSpreadX !== undefined) setFloatingCubesSpreadX(snap.floatingCubesSpreadX);
    if (snap.floatingCubesSpreadY !== undefined) setFloatingCubesSpreadY(snap.floatingCubesSpreadY);
    if (snap.floatingCubesSpreadZ !== undefined) setFloatingCubesSpreadZ(snap.floatingCubesSpreadZ);
    if (snap.floatingCubesRotSpeedX !== undefined) setFloatingCubesRotSpeedX(snap.floatingCubesRotSpeedX);
    if (snap.floatingCubesRotSpeedY !== undefined) setFloatingCubesRotSpeedY(snap.floatingCubesRotSpeedY);
    if (snap.floatingCubesRotSpeedZ !== undefined) setFloatingCubesRotSpeedZ(snap.floatingCubesRotSpeedZ);
    if (snap.floatingCubesSize !== undefined) setFloatingCubesSize(snap.floatingCubesSize);
    if (snap.floatingCubesStyle) setFloatingCubesStyle(snap.floatingCubesStyle);
    if (snap.floatingCubesAudioReactive !== undefined) setFloatingCubesAudioReactive(snap.floatingCubesAudioReactive);
    if (snap.blobTentacles !== undefined) setBlobTentacles(snap.blobTentacles);

    setTimeout(() => {
      isVisUndoingRedoingRef.current = false;
    }, 50);
  }, []);

  // Track visualizer changes into history stack
  useEffect(() => {
    if (!isOpen) return;
    if (isVisUndoingRedoingRef.current) return;

    if (visRecordTimeoutRef.current) {
      clearTimeout(visRecordTimeoutRef.current);
    }

    visRecordTimeoutRef.current = setTimeout(() => {
      const snap = getVisualizerSnapshot();
      setVisHistory((prev) => {
        const truncated = visHistoryIndex >= 0 ? prev.slice(0, visHistoryIndex + 1) : [];
        if (truncated.length > 0) {
          const last = truncated[truncated.length - 1];
          if (JSON.stringify(last) === JSON.stringify(snap)) {
            return prev;
          }
        }
        const updated = [...truncated, snap].slice(-30);
        setVisHistoryIndex(updated.length - 1);
        return updated;
      });
    }, 180);

    return () => {
      if (visRecordTimeoutRef.current) clearTimeout(visRecordTimeoutRef.current);
    };
  }, [isOpen, getVisualizerSnapshot, visHistoryIndex]);

  const handleVisUndo = useCallback(() => {
    if (visHistoryIndex > 0) {
      const targetIdx = visHistoryIndex - 1;
      setVisHistoryIndex(targetIdx);
      applyVisualizerSnapshot(visHistory[targetIdx]);
    }
  }, [visHistoryIndex, visHistory, applyVisualizerSnapshot]);

  const handleVisRedo = useCallback(() => {
    if (visHistoryIndex < visHistory.length - 1) {
      const targetIdx = visHistoryIndex + 1;
      setVisHistoryIndex(targetIdx);
      applyVisualizerSnapshot(visHistory[targetIdx]);
    }
  }, [visHistoryIndex, visHistory, applyVisualizerSnapshot]);

  // Keyboard shortcut listener for Visualizer Undo (Ctrl+Z) / Redo (Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleVisRedo();
        } else {
          handleVisUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleVisRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleVisUndo, handleVisRedo]);

  // Handle Delete Preset
  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
      onShowToast('Preset deleted.');
      if (selectedPresetId === id) setSelectedPresetId('');
    } catch (e) {}
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoDataUrl(ev.target?.result as string);
      onShowToast('Custom logo uploaded!');
    };
    reader.readAsDataURL(file);
  };

  // Handle BG Image Upload
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBgImageDataUrl(ev.target?.result as string);
      if (!activeBackgrounds.includes('custom_image')) {
        setActiveBackgrounds((prev) => [...prev, 'custom_image']);
      }
      onShowToast('Background image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  // Canvas Dimensions based on Aspect Ratio
  const getCanvasDimensions = (): { width: number; height: number } => {
    if (aspectRatio === '9:16') {
      return { width: 720, height: 1280 };
    } else if (aspectRatio === '1:1') {
      return { width: 720, height: 720 };
    } else {
      return { width: 1280, height: 720 };
    }
  };

  // Realtime Parameters Ref to guarantee instant reactivity on all sliders and buttons without restarting loop
  const paramsRef = useRef<any>({});
  paramsRef.current = {
    aspectRatio,
    activeBackgrounds,
    bgColor1,
    bgColor2,
    bgGradientAngle,
    bgGradientType,
    activeVisualizers,
    primaryColor,
    secondaryColor,
    activeEffects,
    scanlines,
    vhsNoise,
    vignette,
    crtGlitch,
    artistName,
    songTitle,
    showTextOverlay,
    textPosition,
    logoPosition,
    logoScale,
    logoOpacity,
    bgImageFit,
    bgImageScale,
    bgImageXPercent,
    bgImageYPercent,
    bgImageOpacity,
    bgImageBlur,
    bgImageBassPulse,
    bgImageAutoFitSafe,
    logoAutoFitSafe,
    starDirection,
    starSpeed,
    starCount,
    starRotation,
    showScrollerText,
    scrollerText,
    scrollerSpeed,
    scrollerFontSize,
    scrollerYPos,
    scrollerSineBounce,
    scrollerMotionMode,
    scrollerAmplitude,
    scrollerFrequency,
    scrollerGlow,
    scrollerBackdrop,
    scrollerColorStyle,
    copperBarCount,
    copperBarHeight,
    copperBarSpeed,
    copperBarAngle,
    copperBarYPos,
    copperColorTheme,
    logoXPercent,
    logoYPercent,
    logoBassPulse,
    textXPercent,
    textYPercent,
    textSize,
    showTimerOverlay,
    timerXPercent,
    timerYPercent,
    timerSize,
    timerStyle,
    timerColorStyle,
    estimatedSongDurationSeconds,
    recordingTime,
    isRecording,
    isPlaying,
    orbColor1,
    orbColor2,
    orbSize,
    orbSpeed,
    orbSoundPulse,
    radialRadius,
    radialBarHeight,
    radialBarCount,
    radialArcAngle,
    radialXPercent,
    radialYPercent,
    radialMirror,
    sphereRadius,
    sphereXPercent,
    sphereYPercent,
    sphereSoundSens,
    sphereRings,
    sphereRotSpeed,
    sphereStyle,
    matrixSpeed,
    matrixDensity,
    matrixFontSize,
    matrixColorTheme,
    gridHorizonY,
    gridSpeed,
    gridDensity,
    gridColor,
    gridHorizonGlowColor,
    gridBassPulse,
    phylloSize,
    phylloCount,
    phylloColorTheme,
    phylloXPercent,
    phylloYPercent,
    phylloRotSpeed,
    phylloRotate,
    phylloSoundPulse,
    audioGain,
    bassShake,
    colorCycleSpeed,
    bloomGlow,
    chromaticAberration,
    kaleidoscope,
    kaleidoscopeSegments,
    tunnelSpeed,
    tunnelSegments,
    laserCount,
    laserOrigin,
    laserSpeed,
    laserBeamWidth,
    laserSpread,
    laserPattern,
    laserSoundSens,
    laserColorTheme,
    laserCenterGlow,
    cubesCount,
    cubeEqHeightScale,
    cubeEqIsometricAngle,
    cubeEqGap,
    cubeEqColorStyle,
    cubeEqPositionX,
    cubeEqPositionY,
    floatingCubesCount,
    floatingCubesArrangement,
    floatingCubesSeed,
    floatingCubesOffsetX,
    floatingCubesOffsetY,
    floatingCubesOffsetZ,
    floatingCubesSpreadX,
    floatingCubesSpreadY,
    floatingCubesSpreadZ,
    floatingCubesRotSpeedX,
    floatingCubesRotSpeedY,
    floatingCubesRotSpeedZ,
    floatingCubesSize,
    floatingCubesStyle,
    floatingCubesAudioReactive,
    blobTentacles,
    plasmaSpeed,
    fireIntensity,
    auroraSpeed,
    auroraDensity,
    citySpeed,
    hudRadius,
  };

  // Canvas Render Animation Loop
  useEffect(() => {
    if (!isOpen) return;

    let liveFrameCount = 0;
    let lastTimestamp = performance.now();
    let smoothTime = 0;
    let smoothBass = 0;
    const renderFrame = (overrideAudio?: { freq: Uint8Array; wave: Uint8Array; time: number; frame: number; bass: number; dt: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!overrideAudio) {
        const { width: prevW, height: prevH } = getCanvasDimensions();
        if (canvas.width !== prevW || canvas.height !== prevH) {
          canvas.width = prevW;
          canvas.height = prevH;
        }
      }

      const width = canvas.width;
      const height = canvas.height;

      const p = paramsRef.current;
      const {
        activeBackgrounds,
        bgColor1,
        bgColor2,
        bgGradientAngle = 90,
        bgGradientType = 'linear',
        activeVisualizers,
        primaryColor,
        secondaryColor,
        activeEffects,
        scanlines,
        vhsNoise,
        vignette,
        crtGlitch,
        artistName,
        songTitle,
        showTextOverlay,
        textPosition,
        logoPosition,
        logoScale,
        logoOpacity,
        bgImageFit = 'cover',
        bgImageScale = 100,
        bgImageXPercent = 50,
        bgImageYPercent = 50,
        bgImageOpacity = 100,
        bgImageBlur = 0,
        bgImageBassPulse = false,
        starDirection,
        starSpeed,
        starCount,
        starRotation,
        showScrollerText,
        scrollerText,
        scrollerSpeed,
        scrollerFontSize,
        scrollerYPos,
        scrollerSineBounce,
        scrollerMotionMode,
        scrollerAmplitude,
        scrollerFrequency,
        scrollerGlow,
        scrollerBackdrop,
        scrollerColorStyle,
        copperBarCount,
        copperBarHeight,
        copperBarSpeed,
        copperBarAngle,
        copperBarYPos,
        copperColorTheme,
        logoXPercent,
        logoYPercent,
        logoBassPulse,
        textXPercent,
        textYPercent,
        textSize,
        showTimerOverlay,
        timerXPercent,
        timerYPercent,
        timerSize,
        timerStyle,
        timerColorStyle,
        estimatedSongDurationSeconds,
        recordingTime,
        isRecording,
        isPlaying,
        orbColor1,
        orbColor2,
        orbSize,
        orbSpeed,
        orbSoundPulse,
        radialRadius,
        radialBarHeight,
        radialBarCount,
        radialArcAngle,
        radialXPercent,
        radialYPercent,
        radialMirror,
        sphereRadius,
        sphereXPercent,
        sphereYPercent,
        sphereSoundSens,
        sphereRings,
        sphereRotSpeed,
        sphereStyle,
        matrixSpeed,
        matrixDensity,
        matrixFontSize,
        matrixColorTheme,
        gridHorizonY,
        gridSpeed,
        gridDensity,
        gridColor,
        gridHorizonGlowColor,
        gridBassPulse,
        phylloSize,
        phylloCount,
        phylloColorTheme,
        phylloXPercent,
        phylloYPercent,
        phylloRotSpeed,
        phylloRotate,
        phylloSoundPulse,
        audioGain,
        bassShake,
        colorCycleSpeed,
        bloomGlow,
        chromaticAberration,
        kaleidoscope,
        kaleidoscopeSegments,
        tunnelSpeed,
        tunnelSegments,
        laserCount,
        laserOrigin,
        laserSpeed,
        laserBeamWidth,
        laserSpread,
        laserPattern,
        laserSoundSens,
        laserColorTheme,
        laserCenterGlow,
        cubesCount,
        cubeEqHeightScale,
        cubeEqIsometricAngle,
        cubeEqGap,
        cubeEqColorStyle,
        cubeEqPositionX,
        cubeEqPositionY,
        floatingCubesCount,
        floatingCubesArrangement,
        floatingCubesSeed,
        floatingCubesOffsetX,
        floatingCubesOffsetY,
        floatingCubesOffsetZ,
        floatingCubesSpreadX,
        floatingCubesSpreadY,
        floatingCubesSpreadZ,
        floatingCubesRotSpeedX,
        floatingCubesRotSpeedY,
        floatingCubesRotSpeedZ,
        floatingCubesSize,
        floatingCubesStyle,
        floatingCubesAudioReactive,
        blobTentacles,
        plasmaSpeed,
        fireIntensity,
        auroraSpeed,
        auroraDensity,
        citySpeed,
        hudRadius,
      } = p;

      let dt = 1 / 60;
      let time = 0;
      let frameCount = 0;

      if (overrideAudio) {
        dt = overrideAudio.dt;
        frameCount = overrideAudio.frame;
        time = overrideAudio.time;
      } else {
        const now = performance.now();
        const rawDt = (now - lastTimestamp) / 1000;
        lastTimestamp = now;
        // Clamp delta time to avoid huge jumps on frame drops while maintaining smooth 60fps physics
        dt = Math.min(0.05, Math.max(0.001, rawDt));
        smoothTime += dt;
        liveFrameCount++;
        frameCount = liveFrameCount;
        time = smoothTime * 1.8;
      }

      // Get audio FFT data (use override if offline master rendering, otherwise real-time)
      const frequencyData = overrideAudio ? overrideAudio.freq : audioEngine.getFrequencyData();
      const waveData = overrideAudio ? overrideAudio.wave : audioEngine.getWaveformData();

      // Calculate average audio level / bass energy with audioGain & fluid interpolation
      let scaledBass = 0;
      if (overrideAudio) {
        scaledBass = overrideAudio.bass;
      } else {
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
          bassSum += frequencyData[i] || 0;
        }
        const rawBass = (bassSum / 10) / 255; // 0..1
        const targetBass = Math.min(1, rawBass * (audioGain || 1.6));
        smoothBass += (targetBass - smoothBass) * Math.min(1, dt * 24);
        scaledBass = smoothBass;
      }
      const bassEnergy = scaledBass;
      const pulseScale = 1 + scaledBass * 0.22;

      // Dynamic Color Cycle (Disco RGB)
      const curPrimaryColor = colorCycleSpeed > 0 ? `hsl(${((frameCount * colorCycleSpeed * 3) % 360)}, 100%, 60%)` : primaryColor;
      const curSecondaryColor = colorCycleSpeed > 0 ? `hsl(${((frameCount * colorCycleSpeed * 3 + 130) % 360)}, 100%, 60%)` : secondaryColor;

      // Always reset context transformation, blend mode, and clear full canvas bounds cleanly
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Base solid gradient background fill - supports full 360° rotation and radial mode
      let baseGrad: CanvasGradient;
      if (bgGradientType === 'radial') {
        const maxR = Math.hypot(width, height) * 0.55;
        baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        baseGrad.addColorStop(0, bgColor2);
        baseGrad.addColorStop(1, bgColor1);
      } else {
        const rad = (((bgGradientAngle !== undefined ? bgGradientAngle : 90)) * Math.PI) / 180;
        const halfDiag = Math.hypot(width, height) / 2;
        const x1 = cx - Math.cos(rad) * halfDiag;
        const y1 = cy - Math.sin(rad) * halfDiag;
        const x2 = cx + Math.cos(rad) * halfDiag;
        const y2 = cy + Math.sin(rad) * halfDiag;
        baseGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        baseGrad.addColorStop(0, bgColor1);
        baseGrad.addColorStop(1, bgColor2);
      }
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();

      // Subtle, smooth camera pulse ONLY if enabled by user (> 0) on peak bass beats
      if (bassShake > 0 && scaledBass > 0.65) {
        const shakePunch = (bassShake / 100) * (scaledBass - 0.65) * 4;
        const sx = Math.sin(frameCount * 0.8) * (shakePunch * 0.6);
        const sy = Math.cos(frameCount * 1.1) * shakePunch;
        ctx.translate(sx, sy);
      }

      // Render each active background layer sequentially
      for (const bgType of activeBackgrounds) {
        if (bgType === 'grid') {
          // Horizon 3D Grid with perspective lines reaching all screen borders
          const horizonY = height * (gridHorizonY / 100);
          ctx.strokeStyle = gridColor || curPrimaryColor;
          ctx.globalAlpha = gridBassPulse ? Math.min(1, 0.35 + scaledBass * 0.5) : 0.6;
          ctx.lineWidth = 1.5;

          const cols = gridDensity;
          for (let i = 0; i <= cols; i++) {
            const xBottom = width * (i / cols);
            const dx = xBottom - cx;
            const scale = (height + 200 - horizonY) / Math.max(1, height - horizonY);
            ctx.beginPath();
            ctx.moveTo(cx, horizonY);
            ctx.lineTo(cx + dx * scale, height + 200);
            ctx.stroke();
          }

          const sideCount = Math.floor(cols * 1.2);
          for (let k = 1; k <= sideCount; k++) {
            const progress = Math.pow(k / sideCount, 1.8);
            const yEdge = horizonY + (height - horizonY) * progress;
            const dy = yEdge - horizonY;

            const leftScale = (width + cx) / Math.max(1, cx);
            ctx.beginPath();
            ctx.moveTo(cx, horizonY);
            ctx.lineTo(-width, horizonY + dy * leftScale);
            ctx.stroke();

            const rightScale = (width * 2 - cx) / Math.max(1, width - cx);
            ctx.beginPath();
            ctx.moveTo(cx, horizonY);
            ctx.lineTo(width * 2, horizonY + dy * rightScale);
            ctx.stroke();
          }

          if (gridSpeed > 0 || gridDensity > 0) {
            const numGridLines = 15;
            const gridOffset = (frameCount * (gridSpeed || 3) * 0.02) % 1;
            for (let k = 0; k < numGridLines; k++) {
              const progress = Math.pow((k + gridOffset) / numGridLines, 2.5);
              const perspectiveY = horizonY + progress * (height - horizonY);
              if (perspectiveY <= height && perspectiveY >= horizonY) {
                ctx.beginPath();
                ctx.moveTo(0, perspectiveY);
                ctx.lineTo(width, perspectiveY);
                ctx.stroke();
              }
            }
          }
          ctx.globalAlpha = 1;

          const horizonGrad = ctx.createLinearGradient(0, horizonY - 12, 0, horizonY + 12);
          horizonGrad.addColorStop(0, 'transparent');
          horizonGrad.addColorStop(0.5, gridHorizonGlowColor || curSecondaryColor);
          horizonGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = horizonGrad;
          ctx.fillRect(0, horizonY - 12, width, 24);

        } else if (bgType === 'starfield') {
          ctx.save();
          if (starRotation !== 0) {
            ctx.translate(cx, cy);
            ctx.rotate((starRotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }

          ctx.fillStyle = curPrimaryColor;
          const numStars = starCount;

          for (let i = 0; i < numStars; i++) {
            const seedX = Math.sin(i * 127.1 + i * 3.1) * 0.5 + 0.5;
            const seedY = Math.cos(i * 311.7 + i * 1.7) * 0.5 + 0.5;
            const starSpeedMult = (1 + (i % 5) * 0.5) * (starSpeed / 3);

            let starX = seedX * width;
            let starY = seedY * height;

            if (starDirection === 'down') {
              starY = (seedY * height + frameCount * starSpeedMult * 2) % height;
            } else if (starDirection === 'up') {
              starY = (((seedY * height - frameCount * starSpeedMult * 2) % height) + height) % height;
            } else if (starDirection === 'left') {
              starX = (((seedX * width - frameCount * starSpeedMult * 2) % width) + width) % width;
            } else if (starDirection === 'right') {
              starX = (seedX * width + frameCount * starSpeedMult * 2) % width;
            } else if (starDirection === 'forward_3d') {
              const z = (((i * 17 + frameCount * starSpeed * 2) % 1000) / 1000);
              const scale = 1 / (1.01 - z);
              starX = cx + (seedX - 0.5) * width * scale * 0.5;
              starY = cy + (seedY - 0.5) * height * scale * 0.5;
            } else if (starDirection === 'vortex') {
              const maxRadius = Math.hypot(width, height) * 0.72;
              const dist = Math.sqrt(seedX) * maxRadius;
              const angle = seedY * Math.PI * 2 + time * 0.6 * (starSpeed / 3) + (dist / maxRadius) * Math.PI * 1.5;
              starX = cx + Math.cos(angle) * dist;
              starY = cy + Math.sin(angle) * dist;
            }

            const starSize = (i % 3) + 1 + scaledBass * (i % 2) * 2;
            ctx.beginPath();
            ctx.arc(starX, starY, Math.max(0.5, starSize), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

        } else if (bgType === 'neon_tunnel') {
          ctx.save();
          ctx.translate(cx, cy);
          const segs = tunnelSegments || 8;
          const tSpeed = tunnelSpeed || 4;
          const rot = time * 0.4 + scaledBass * 0.5;
          const rings = 14;
          for (let r = 0; r < rings; r++) {
            const depth = ((r * 80 + frameCount * tSpeed * 3) % 1000) / 1000;
            const ringRadius = Math.pow(depth, 2.2) * (Math.max(width, height) * 0.85);
            const alpha = Math.min(1, depth * 1.5) * (0.3 + scaledBass * 0.7);
            ctx.strokeStyle = r % 2 === 0 ? curPrimaryColor : curSecondaryColor;
            ctx.lineWidth = 1.5 + depth * 3 + scaledBass * 2;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = curPrimaryColor;
            ctx.shadowBlur = depth * 16;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
              const theta = (s / segs) * Math.PI * 2 + rot + (1 - depth) * 1.5;
              const px = Math.cos(theta) * ringRadius;
              const py = Math.sin(theta) * ringRadius;
              if (s === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();

        } else if (bgType === 'aurora_waves') {
          ctx.save();
          const numCurtains = auroraDensity || 5;
          const aSpeed = auroraSpeed || 3;
          for (let c = 0; c < numCurtains; c++) {
            const cTime = time * (aSpeed * 0.3) + c * 1.2;
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.35 + c * 0.08, c % 2 === 0 ? '#10b981' : curPrimaryColor);
            grad.addColorStop(0.7, curSecondaryColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.28 + scaledBass * 0.22;
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 15) {
              const normX = x / width;
              const audioW = (frequencyData[Math.floor(normX * 32)] || 0) / 255;
              const waveY = height * 0.45 + Math.sin(normX * 6 + cTime) * (height * 0.18) + Math.cos(normX * 12 - cTime * 0.8) * (height * 0.08) - audioW * (height * 0.2);
              ctx.lineTo(x, waveY);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

        } else if (bgType === 'cyber_city') {
          ctx.save();
          const sunY = height * 0.42;
          const sunR = Math.min(width, height) * 0.22 * (1 + scaledBass * 0.08);
          const numSunSlices = 8;

          // Sliced synthwave sun with soft clipped horizontal bands (no black box artifacts)
          for (let s = 0; s < numSunSlices; s++) {
            const normTop = s / numSunSlices;
            const normBottom = (s + 0.72) / numSunSlices;
            const yTop = sunY - sunR + normTop * (sunR * 2);
            const yBottom = sunY - sunR + normBottom * (sunR * 2);
            const sliceH = yBottom - yTop;
            if (yTop >= sunY + sunR) continue;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, sunY, sunR, Math.PI, 0, false);
            ctx.clip();

            const sunGrad = ctx.createLinearGradient(cx, sunY - sunR, cx, sunY + sunR);
            sunGrad.addColorStop(0, '#fde047');
            sunGrad.addColorStop(0.5, '#f43f5e');
            sunGrad.addColorStop(1, '#a855f7');
            ctx.fillStyle = sunGrad;
            ctx.fillRect(cx - sunR, yTop, sunR * 2, sliceH);
            ctx.restore();
          }

          // Smooth scrolling deterministic skyline with solid horizon ground
          const horizonY = height * 0.65;
          const bWidth = Math.max(26, width / 26);
          const cSpeed = citySpeed || 3;
          const totalCityScroll = frameCount * cSpeed * 0.6;
          const firstCol = Math.floor(totalCityScroll / bWidth);
          const subOffset = totalCityScroll % bWidth;
          const numCols = Math.ceil(width / bWidth) + 3;

          for (let i = -1; i <= numCols; i++) {
            const colIndex = firstCol + i;
            const hash = Math.abs(Math.sin(colIndex * 713.17 + 23.45) * 43758.5453) % 1;
            const bHeight = 60 + hash * (height * 0.32) + (scaledBass > 0.45 ? scaledBass * 16 * (hash > 0.5 ? 1 : 0) : 0);
            const bx = i * bWidth - subOffset;
            const by = horizonY - bHeight;

            // Building silhouette bounded to horizon ground
            ctx.fillStyle = '#070b18';
            ctx.fillRect(bx, by, bWidth - 2, bHeight);
            ctx.strokeStyle = curPrimaryColor;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.55;
            ctx.strokeRect(bx, by, bWidth - 2, bHeight);

            // Windows
            ctx.fillStyle = (colIndex % 3 === 0) ? curSecondaryColor : '#38bdf8';
            ctx.globalAlpha = 0.75;
            for (let wy = by + 8; wy < horizonY - 8; wy += 14) {
              if (Math.sin(colIndex * 13 + wy * 7) > 0) {
                ctx.fillRect(bx + 4, wy, Math.max(2, bWidth * 0.32), 5);
              }
            }
          }

          // Glowing Horizon Ground Line & Base Floor
          ctx.save();
          const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
          groundGrad.addColorStop(0, '#090d1f');
          groundGrad.addColorStop(0.4, '#04060f');
          groundGrad.addColorStop(1, '#020308');
          ctx.fillStyle = groundGrad;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(0, horizonY, width, height - horizonY);

          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          ctx.lineTo(width, horizonY);
          ctx.strokeStyle = curPrimaryColor;
          ctx.lineWidth = 2;
          ctx.shadowColor = curPrimaryColor;
          ctx.shadowBlur = 12;
          ctx.globalAlpha = 0.85;
          ctx.stroke();
          ctx.restore();

          ctx.restore();

        } else if (bgType === 'hyperspace') {
          ctx.save();
          ctx.translate(cx, cy);
          const numStreaks = 180;
          for (let i = 0; i < numStreaks; i++) {
            const angle = (i / numStreaks) * Math.PI * 2 + Math.sin(i * 99) * 0.2;
            const speed = (2 + (i % 5)) * (starSpeed || 3);
            const z = ((i * 37 + frameCount * speed * 2) % 1000) / 1000;
            const r1 = Math.pow(z, 2.5) * (Math.max(width, height) * 0.9);
            const r2 = r1 + Math.max(10, (15 + scaledBass * 45) * z * 4);
            const alpha = Math.min(1, z * 1.8);
            
            ctx.strokeStyle = i % 3 === 0 ? curPrimaryColor : i % 3 === 1 ? curSecondaryColor : '#ffffff';
            ctx.lineWidth = Math.max(1, z * 4 + scaledBass * 2);
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
            ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
            ctx.stroke();
          }
          ctx.restore();

        } else if (bgType === 'orbs') {
          const orb1X = width * 0.3 + Math.sin(time * (orbSpeed * 0.2)) * 100;
          const orb1Y = height * 0.4 + Math.cos(time * (orbSpeed * 0.15)) * 80;
          const orb1R = orbSize * (orbSoundPulse ? pulseScale : 1);

          const radGrad1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, orb1R);
          radGrad1.addColorStop(0, orbColor1);
          radGrad1.addColorStop(1, 'transparent');
          ctx.fillStyle = radGrad1;
          ctx.beginPath();
          ctx.arc(orb1X, orb1Y, orb1R, 0, Math.PI * 2);
          ctx.fill();

          const orb2X = width * 0.7 + Math.cos(time * (orbSpeed * 0.18)) * 120;
          const orb2Y = height * 0.6 + Math.sin(time * (orbSpeed * 0.22)) * 90;
          const orb2R = (orbSize * 1.1) * (orbSoundPulse ? pulseScale : 1);

          const radGrad2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, orb2R);
          radGrad2.addColorStop(0, orbColor2);
          radGrad2.addColorStop(1, 'transparent');
          ctx.fillStyle = radGrad2;
          ctx.beginPath();
          ctx.arc(orb2X, orb2Y, orb2R, 0, Math.PI * 2);
          ctx.fill();

        } else if (bgType === 'phyllotaxis') {
          const phylloCX = width * (phylloXPercent / 100);
          const phylloCY = height * (phylloYPercent / 100);
          const numDots = phylloCount;
          const goldenAngle = 137.5 * (Math.PI / 180);
          const rotAngle = phylloRotate ? time * (phylloRotSpeed * 0.1) : 0;

          for (let i = 0; i < numDots; i++) {
            const r = Math.sqrt(i) * phylloSize * (phylloSoundPulse ? pulseScale : 1);
            const theta = i * goldenAngle + rotAngle;
            const x = phylloCX + r * Math.cos(theta);
            const y = phylloCY + r * Math.sin(theta);
            const dotSize = Math.max(1, 3 + (frequencyData[i % 32] || 0) * 0.03 * (phylloSoundPulse ? 1 : 0.2));

            if (phylloColorTheme === 'rainbow') {
              ctx.fillStyle = `hsl(${(i * 5 + frameCount * 2) % 360}, 100%, 65%)`;
            } else if (phylloColorTheme === 'cyan_pink') {
              ctx.fillStyle = i % 2 === 0 ? curPrimaryColor : curSecondaryColor;
            } else if (phylloColorTheme === 'gold') {
              ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#f59e0b';
            } else if (phylloColorTheme === 'green') {
              ctx.fillStyle = i % 2 === 0 ? '#34d399' : '#10b981';
            } else if (phylloColorTheme === 'fire') {
              const pal = ['#ef4444', '#f97316', '#fbbf24', '#fef08a'];
              ctx.fillStyle = pal[i % pal.length];
            } else {
              ctx.fillStyle = i % 2 === 0 ? curPrimaryColor : curSecondaryColor;
            }

            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
          }

        } else if (bgType === 'custom_image' && bgImgRef.current) {
          const img = bgImgRef.current;
          const natW = img.naturalWidth || img.width;
          const natH = img.naturalHeight || img.height;

          if (natW > 0 && natH > 0) {
            ctx.save();
            const imgAspect = natW / natH;
            const canvasAspect = width / height;

            let baseW = width;
            let baseH = height;

            if (bgImageFit === 'contain') {
              const scaleFactor = Math.min(width / natW, height / natH);
              baseW = natW * scaleFactor;
              baseH = natH * scaleFactor;
            } else if (bgImageFit === 'original') {
              // Scale relative to 720p base so size is consistent across 16:9, 9:16, and 1:1
              const scaleRef = Math.min(width, height) / 720;
              baseW = natW * scaleRef;
              baseH = natH * scaleRef;
            } else if (bgImageFit === 'stretch') {
              baseW = width;
              baseH = height;
            } else {
              // 'cover'
              if (bgImageScale === 100 && bgImageXPercent === 50 && bgImageYPercent === 50) {
                // Fullscreen background wallpaper fill
                if (canvasAspect > imgAspect) {
                  baseW = width;
                  baseH = width / imgAspect;
                } else {
                  baseH = height;
                  baseW = height * imgAspect;
                }
              } else {
                // Scaled or positioned graphic / watermark: reference smallest viewport dimension
                // so switching to 9:16 or 1:1 does not inflate or distort its visual size
                const refDim = Math.min(width, height);
                if (imgAspect >= 1) {
                  baseW = refDim;
                  baseH = refDim / imgAspect;
                } else {
                  baseH = refDim;
                  baseW = refDim * imgAspect;
                }
              }
            }

            const bassScale = bgImageBassPulse ? (1 + scaledBass * 0.08) : 1;
            const finalW = baseW * (bgImageScale / 100) * bassScale;
            const finalH = baseH * (bgImageScale / 100) * bassScale;

            let drawX = width * (bgImageXPercent / 100) - finalW / 2;
            let drawY = height * (bgImageYPercent / 100) - finalH / 2;

            // Auto Safe-Area Edge Clamping: Ensure image stays inside visible frame
            // and never gets cut off when switching between 16:9, 9:16, and 1:1
            if (bgImageAutoFitSafe !== false) {
              if (finalW <= width) {
                drawX = Math.max(12, Math.min(width - finalW - 12, drawX));
              }
              if (finalH <= height) {
                drawY = Math.max(12, Math.min(height - finalH - 12, drawY));
              }
            }

            ctx.globalAlpha = Math.max(0, Math.min(1, bgImageOpacity / 100));

            if (bgImageBlur > 0) {
              ctx.filter = `blur(${bgImageBlur}px)`;
            }

            ctx.drawImage(img, drawX, drawY, finalW, finalH);
            ctx.restore();
          }
        }
      }

      // --- 2. DRAW RETRO EFFECTS LAYERS ---
      for (const effType of activeEffects) {
        if (effType === 'copperbars') {
          ctx.save();
          const numBars = copperBarCount;
          const barHeight = copperBarHeight;
          const centerY = height * (copperBarYPos / 100);
          const startY = centerY + Math.sin(time * (copperBarSpeed * 0.4)) * (height * 0.08);

          let colorPal = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];
          if (copperColorTheme === 'cyan_pink') {
            colorPal = ['#06b6d4', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#ec4899', '#f43f5e'];
          } else if (copperColorTheme === 'fire') {
            colorPal = ['#7f1d1d', '#991b1b', '#dc2626', '#ef4444', '#f97316', '#f59e0b', '#fef08a'];
          } else if (copperColorTheme === 'gold') {
            colorPal = ['#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fef08a'];
          } else if (copperColorTheme === 'matrix') {
            colorPal = ['#064e3b', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
          }

          ctx.translate(cx, startY);
          if (copperBarAngle !== 0) {
            ctx.rotate((copperBarAngle * Math.PI) / 180);
          }

          ctx.globalAlpha = 0.75;
          for (let i = 0; i < numBars; i++) {
            const yOffset = (i - numBars / 2) * (barHeight + 2);
            ctx.fillStyle = colorPal[i % colorPal.length];
            ctx.fillRect(-width, yOffset, width * 2, barHeight);
          }
          ctx.restore();

        } else if (effType === 'matrix') {
          ctx.save();
          const cols = matrixDensity;
          const colWidth = width / cols;
          ctx.font = `bold ${matrixFontSize}px monospace`;
          ctx.textBaseline = 'top';

          for (let c = 0; c < cols; c++) {
            const x = c * colWidth;
            const speed = (1 + ((c * 7) % 5) * 0.3) * matrixSpeed;
            const headY = (frameCount * speed * 2 + c * 83) % (height + 300) - 80;
            const trailLen = 12 + (c % 8);

            for (let t = 0; t < trailLen; t++) {
              const y = headY - t * (matrixFontSize * 0.95);
              if (y > -20 && y < height + 20) {
                const charCode = 0x30a0 + ((c * 17 + t * 5 + Math.floor(frameCount / 4)) % 96);
                const char = String.fromCharCode(charCode);

                if (t === 0) {
                  ctx.fillStyle = '#ffffff';
                  ctx.shadowColor = matrixColorTheme === 'green' ? '#10b981' : matrixColorTheme === 'cyan' ? '#38bdf8' : matrixColorTheme === 'red' ? '#ef4444' : '#fbbf24';
                  ctx.shadowBlur = 8;
                } else {
                  const alpha = Math.max(0.12, 1 - t / trailLen);
                  ctx.globalAlpha = alpha;
                  ctx.shadowBlur = 0;
                  if (matrixColorTheme === 'green') ctx.fillStyle = '#10b981';
                  else if (matrixColorTheme === 'cyan') ctx.fillStyle = '#38bdf8';
                  else if (matrixColorTheme === 'red') ctx.fillStyle = '#f43f5e';
                  else ctx.fillStyle = '#fbbf24';
                }
                ctx.fillText(char, x, y);
                ctx.globalAlpha = 1.0;
              }
            }
          }
          ctx.restore();

        } else if (effType === 'plasma') {
          ctx.save();
          const pSpeed = plasmaSpeed || 3;
          const blockSize = 16;
          const pCols = Math.ceil(width / blockSize);
          const pRows = Math.ceil(height / blockSize);
          ctx.globalAlpha = 0.45;

          for (let x = 0; x < pCols; x += 2) {
            for (let y = 0; y < pRows; y += 2) {
              const v = Math.sin(x * 0.15 + time * pSpeed * 0.3) +
                        Math.sin(y * 0.15 + time * pSpeed * 0.2) +
                        Math.sin((x + y) * 0.1 + time * pSpeed * 0.25) +
                        Math.sin(Math.sqrt(x * x + y * y) * 0.12 - time * pSpeed * 0.3);
              const hue = ((v + 4) * 45 + frameCount * 2) % 360;
              ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
              ctx.fillRect(x * blockSize, y * blockSize, blockSize * 2, blockSize * 2);
            }
          }
          ctx.restore();

        } else if (effType === 'audio_fire') {
          ctx.save();
          const intensity = fireIntensity || 60;
          const fireCols = 36;
          const colW = width / fireCols;
          const fireHeightMax = height * (intensity / 100) * 0.7 * (0.5 + scaledBass * 0.8);

          for (let i = 0; i < fireCols; i++) {
            const val = (frequencyData[i % 32] || 0) / 255;
            const fHeight = val * fireHeightMax + Math.sin(time * 5 + i) * 20;
            const fx = i * colW;
            const fy = height - fHeight;

            const fireGrad = ctx.createLinearGradient(0, height, 0, fy);
            fireGrad.addColorStop(0, '#ffffff');
            fireGrad.addColorStop(0.2, '#fde047');
            fireGrad.addColorStop(0.5, '#f97316');
            fireGrad.addColorStop(0.85, '#dc2626');
            fireGrad.addColorStop(1, 'transparent');

            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.moveTo(fx, height);
            ctx.lineTo(fx + colW * 0.5, fy);
            ctx.lineTo(fx + colW, height);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

        } else if (effType === 'sparkles_emitter') {
          ctx.save();
          if (scaledBass > 0.35) {
            const spawnCount = Math.floor(scaledBass * 6);
            for (let s = 0; s < spawnCount; s++) {
              sparklesParticlesRef.current.push({
                x: cx + (Math.random() - 0.5) * (width * 0.5),
                y: cy + (Math.random() - 0.5) * (height * 0.4),
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                life: 1,
                maxLife: 30 + Math.random() * 20,
                color: Math.random() > 0.5 ? curPrimaryColor : curSecondaryColor,
                size: 3 + Math.random() * 5 + scaledBass * 3,
              });
            }
          }

          sparklesParticlesRef.current = sparklesParticlesRef.current.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= 1 / p.maxLife;

            if (p.life > 0) {
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.life;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
              ctx.fill();
              return true;
            }
            return false;
          });
          ctx.restore();
        }
      }

      // --- 3. DRAW VISUALIZER LAYERS ---
      ctx.save();
      for (const visType of activeVisualizers) {
        if (visType === 'spectrum') {
          const barCount = 48;
          const barWidth = (width * 0.75) / barCount;
          const startX = (width - barCount * barWidth) / 2;
          const bottomY = height * 0.72;

          for (let i = 0; i < barCount; i++) {
            const val = (frequencyData[i * 2] || 0) / 255;
            const barH = val * (height * 0.32) * (1 + scaledBass * 0.3);
            const x = startX + i * barWidth;
            const y = bottomY - barH;

            const barGrad = ctx.createLinearGradient(0, bottomY, 0, bottomY - height * 0.32);
            barGrad.addColorStop(0, curPrimaryColor);
            barGrad.addColorStop(1, curSecondaryColor);
            ctx.fillStyle = barGrad;
            ctx.fillRect(x + 2, y, barWidth - 4, barH);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 2, y - 3, barWidth - 4, 2);
          }

        } else if (visType === 'cyber_hud') {
          ctx.save();
          ctx.translate(cx, cy);
          const hudR = Math.min(width, height) * (hudRadius / 100) * pulseScale;
          const rotTime = time * 0.8;

          ctx.strokeStyle = curPrimaryColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = curPrimaryColor;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, hudR, 0, Math.PI * 2);
          ctx.stroke();

          const sweepAngle = rotTime * 1.8;
          const sweepGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, hudR);
          sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
          sweepGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = sweepGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, hudR, sweepAngle, sweepAngle + Math.PI * 0.35);
          ctx.closePath();
          ctx.fill();

          const ticks = 48;
          for (let t = 0; t < ticks; t++) {
            const tAngle = (t / ticks) * Math.PI * 2 - rotTime * 0.2;
            const freqVal = (frequencyData[t % 32] || 0) / 255;
            const tLen = 6 + freqVal * (hudR * 0.38) * (1 + scaledBass * 0.5);
            const x1 = Math.cos(tAngle) * (hudR - 4);
            const y1 = Math.sin(tAngle) * (hudR - 4);
            const x2 = Math.cos(tAngle) * (hudR + tLen);
            const y2 = Math.sin(tAngle) * (hudR + tLen);

            ctx.strokeStyle = freqVal > 0.4 ? curSecondaryColor : curPrimaryColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }

          ctx.strokeStyle = curSecondaryColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-hudR * 1.2, 0); ctx.lineTo(-hudR * 0.8, 0);
          ctx.moveTo(hudR * 0.8, 0); ctx.lineTo(hudR * 1.2, 0);
          ctx.moveTo(0, -hudR * 1.2); ctx.lineTo(0, -hudR * 0.8);
          ctx.moveTo(0, hudR * 0.8); ctx.lineTo(0, hudR * 1.2);
          ctx.stroke();

          ctx.fillStyle = curPrimaryColor;
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`SYS.AUDIO // ${Math.round(scaledBass * 100)}%`, 0, -hudR * 0.35);
          ctx.fillText(`FREQ // ${frequencyData[0] || 0} Hz`, 0, hudR * 0.35);
          ctx.restore();

        } else if (visType === 'laser_show') {
          ctx.save();
          const numLasers = laserCount || 8;
          const speedFactor = (laserSpeed || 4) * 0.5;
          const sens = (laserSoundSens || 65) / 100;
          const spreadRad = ((laserSpread || 90) / 180) * Math.PI;

          // Emitter position based on laserOrigin
          let emitterX = cx;
          let emitterY = height * 0.12;
          if (laserOrigin === 'bottom_center') {
            emitterY = height * 0.92;
          } else if (laserOrigin === 'center_burst') {
            emitterY = cy;
          } else if (laserOrigin === 'oscillating') {
            emitterX = cx + Math.sin(time * speedFactor * 0.7) * (width * 0.38);
            emitterY = height * 0.14;
          }

          for (let l = 0; l < numLasers; l++) {
            const laserNorm = numLasers > 1 ? l / (numLasers - 1) : 0.5;
            let currentEmitterX = emitterX;
            let currentEmitterY = emitterY;

            if (laserOrigin === 'dual_corners') {
              currentEmitterX = l % 2 === 0 ? width * 0.12 : width * 0.88;
              currentEmitterY = height * 0.12;
            }

            // Beam target angle based on laserPattern
            let targetAngle = 0;
            const freqVal = (frequencyData[(l * 3) % 32] || 0) / 255;
            const bassKick = scaledBass * sens;

            if (laserPattern === 'fan_sweep') {
              const sweepPhase = Math.sin(time * speedFactor + l * 0.25) * (spreadRad * 0.35);
              const baseAngle = (laserOrigin === 'bottom_center' ? -Math.PI * 0.5 : Math.PI * 0.5) - (spreadRad * 0.5) + laserNorm * spreadRad;
              targetAngle = baseAngle + sweepPhase;
            } else if (laserPattern === 'cross_fire') {
              const isOdd = l % 2 === 1;
              const dir = isOdd ? 1 : -1;
              const sweep = Math.sin(time * speedFactor * 1.2 + l * 0.3) * (spreadRad * 0.45) * dir;
              const baseAngle = (laserOrigin === 'bottom_center' ? -Math.PI * 0.5 : Math.PI * 0.5) + sweep;
              targetAngle = baseAngle;
            } else if (laserPattern === 'tunnel_vortex') {
              targetAngle = time * speedFactor * 0.8 + (l / numLasers) * Math.PI * 2;
            } else if (laserPattern === 'chaotic_disco') {
              targetAngle = (l * 1.618033 + time * speedFactor * 1.4 + freqVal * 1.2) * Math.PI;
            } else if (laserPattern === 'strobe_pulse') {
              const pulseStep = Math.floor(time * speedFactor * 4) % numLasers;
              targetAngle = (laserOrigin === 'bottom_center' ? -Math.PI * 0.5 : Math.PI * 0.5) - (spreadRad * 0.5) + laserNorm * spreadRad;
              if (pulseStep !== l && scaledBass < 0.4) continue;
            }

            const beamReach = Math.max(width, height) * (0.8 + freqVal * 0.5 + bassKick * 0.3);
            const targetX = currentEmitterX + Math.cos(targetAngle) * beamReach;
            const targetY = currentEmitterY + Math.sin(targetAngle) * beamReach;

            // Color calculation based on laserColorTheme
            let laserColor = curPrimaryColor;
            if (laserColorTheme === 'rainbow') {
              laserColor = `hsl(${(l * (360 / numLasers) + frameCount * 4) % 360}, 100%, 60%)`;
            } else if (laserColorTheme === 'cyan_pink') {
              laserColor = l % 2 === 0 ? curPrimaryColor : curSecondaryColor;
            } else if (laserColorTheme === 'emerald') {
              laserColor = '#10b981';
            } else if (laserColorTheme === 'amber') {
              laserColor = '#f59e0b';
            } else if (laserColorTheme === 'cyber_violet') {
              laserColor = '#a855f7';
            } else if (laserColorTheme === 'ice_blue') {
              laserColor = '#38bdf8';
            } else if (laserColorTheme === 'ruby_red') {
              laserColor = '#f43f5e';
            } else if (laserColorTheme === 'gold') {
              laserColor = '#fbbf24';
            }

            const currentBeamWidth = (laserBeamWidth || 4) + freqVal * 6 + bassKick * 5;

            // Main neon laser glow
            ctx.strokeStyle = laserColor;
            ctx.lineWidth = currentBeamWidth;
            ctx.shadowColor = laserColor;
            ctx.shadowBlur = 18 + bassKick * 14;
            ctx.globalAlpha = Math.min(1.0, 0.65 + freqVal * 0.35 + bassKick * 0.2);
            ctx.beginPath();
            ctx.moveTo(currentEmitterX, currentEmitterY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Core intense white laser beam
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.5, currentBeamWidth * 0.3);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.moveTo(currentEmitterX, currentEmitterY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Laser target impact flare
            ctx.fillStyle = laserColor;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 4 + freqVal * 8 + bassKick * 6, 0, Math.PI * 2);
            ctx.fill();
          }

          // Center emitter glowing orb if enabled
          if (laserCenterGlow) {
            const glowR = 12 + scaledBass * 18;
            const glowGrad = ctx.createRadialGradient(emitterX, emitterY, 2, emitterX, emitterY, glowR * 2);
            glowGrad.addColorStop(0, '#ffffff');
            glowGrad.addColorStop(0.3, curPrimaryColor);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(emitterX, emitterY, glowR * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

        } else if (visType === 'dancing_cubes' || visType === '3d_cube_eqs') {
          // 3D Cube EQs (Isometric Equalizer Pillars)
          ctx.save();
          const numCubes = cubesCount || 16;
          const gap = cubeEqGap !== undefined ? cubeEqGap : 2;
          const cubeW = Math.max(8, Math.min(52, ((width * 0.82) / numCubes) - gap));
          const totalW = numCubes * (cubeW + gap);
          const posX = (cubeEqPositionX !== undefined ? cubeEqPositionX : 50) / 100;
          const posY = (cubeEqPositionY !== undefined ? cubeEqPositionY : 70) / 100;
          const startX = width * posX - totalW / 2;
          const baseY = height * posY;
          const hScale = (cubeEqHeightScale || 65) / 100;
          const slantAngle = ((cubeEqIsometricAngle || 35) / 100) * 0.65;

          for (let c = 0; c < numCubes; c++) {
            const val = (frequencyData[Math.floor((c / numCubes) * 32)] || 0) / 255;
            const cubeH = Math.max(10, val * (height * 0.45) * hScale * (1 + scaledBass * 0.4));
            const cxPos = startX + c * (cubeW + gap) + cubeW * 0.5;
            const isoX = cxPos;
            const isoY = baseY - cubeH;
            const sideOffset = cubeW * slantAngle;

            let topColor = curPrimaryColor;
            let leftColor = 'rgba(15, 23, 42, 0.9)';
            let rightColor = curSecondaryColor;

            if (cubeEqColorStyle === 'rainbow') {
              const hue = (c * (360 / numCubes) + frameCount * 2) % 360;
              topColor = `hsl(${hue}, 100%, 65%)`;
              rightColor = `hsl(${hue}, 90%, 45%)`;
              leftColor = `hsl(${hue}, 80%, 20%)`;
            } else if (cubeEqColorStyle === 'cyan_pink') {
              topColor = c % 2 === 0 ? '#38bdf8' : '#ec4899';
              rightColor = c % 2 === 0 ? '#0284c7' : '#be185d';
              leftColor = 'rgba(10, 15, 30, 0.92)';
            } else if (cubeEqColorStyle === 'matrix') {
              topColor = '#34d399';
              rightColor = '#059669';
              leftColor = '#022c22';
            }

            // Top Diamond Face
            ctx.fillStyle = topColor;
            ctx.beginPath();
            ctx.moveTo(isoX, isoY - sideOffset);
            ctx.lineTo(isoX + cubeW * 0.5, isoY - sideOffset * 0.5);
            ctx.lineTo(isoX, isoY);
            ctx.lineTo(isoX - cubeW * 0.5, isoY - sideOffset * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Left Shaded Face
            ctx.fillStyle = leftColor;
            ctx.beginPath();
            ctx.moveTo(isoX - cubeW * 0.5, isoY - sideOffset * 0.5);
            ctx.lineTo(isoX, isoY);
            ctx.lineTo(isoX, isoY + cubeH);
            ctx.lineTo(isoX - cubeW * 0.5, isoY + cubeH - sideOffset * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = topColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Right Accent Face
            ctx.fillStyle = rightColor;
            ctx.beginPath();
            ctx.moveTo(isoX, isoY);
            ctx.lineTo(isoX + cubeW * 0.5, isoY - sideOffset * 0.5);
            ctx.lineTo(isoX + cubeW * 0.5, isoY + cubeH - sideOffset * 0.5);
            ctx.lineTo(isoX, isoY + cubeH);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = rightColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.restore();

        } else if (visType === 'floating_3d_cubes') {
          // --- 3D FLOATING COSMIC CUBES (Real 3D Perspective Canvas Engine) ---
          ctx.save();
          const numCubes = floatingCubesCount || 16;
          const spreadXFactor = (floatingCubesSpreadX || 60) / 50;
          const spreadYFactor = (floatingCubesSpreadY || 50) / 50;
          const spreadZFactor = (floatingCubesSpreadZ || 60) / 50;
          const style = floatingCubesStyle || 'shaded_glass';
          const seed = floatingCubesSeed || 1337;

          // Unit Cube Vertices [-1, 1]
          const unitVertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
          ];

          // 6 Faces (vertex indices) and Nominal Normals
          const cubeFaces = [
            { v: [0, 1, 2, 3], norm: [0, 0, -1] },
            { v: [5, 4, 7, 6], norm: [0, 0, 1] },
            { v: [4, 0, 3, 7], norm: [-1, 0, 0] },
            { v: [1, 5, 6, 2], norm: [1, 0, 0] },
            { v: [4, 5, 1, 0], norm: [0, -1, 0] },
            { v: [3, 2, 6, 7], norm: [0, 1, 0] }
          ];

          // Light source direction vector (normalized)
          const lightDir = [0.408, -0.707, 0.577];

          // Compute 3D Positions and Render Objects for Sorting
          interface RenderCubeItem {
            centerZ: number;
            screenCX: number;
            screenCY: number;
            faces: Array<{
              screenPts: Array<{ x: number; y: number }>;
              avgZ: number;
              light: number;
              faceIndex: number;
            }>;
            vertices2D: Array<{ x: number; y: number }>;
            color: string;
            accentColor: string;
          }

          const renderCubes: RenderCubeItem[] = [];

          for (let c = 0; c < numCubes; c++) {
            let wx = 0, wy = 0, wz = 0;

            if (floatingCubesArrangement === 'random') {
              const s1 = Math.sin(seed * 7.1 + c * 37.7) * 10000;
              const r1 = s1 - Math.floor(s1);
              const s2 = Math.sin(seed * 11.3 + c * 59.3) * 10000;
              const r2 = s2 - Math.floor(s2);
              const s3 = Math.sin(seed * 19.7 + c * 83.1) * 10000;
              const r3 = s3 - Math.floor(s3);
              wx = (r1 - 0.5) * (width * 0.85) * spreadXFactor;
              wy = (r2 - 0.5) * (height * 0.75) * spreadYFactor;
              wz = (r3 - 0.5) * 550 * spreadZFactor;
            } else if (floatingCubesArrangement === 'orbit_ring') {
              const ringAngle = (c / numCubes) * Math.PI * 2 + time * (floatingCubesRotSpeedY * 0.15);
              const ringRad = (Math.min(width, height) * 0.35) * spreadXFactor;
              wx = Math.cos(ringAngle) * ringRad;
              wy = Math.sin(ringAngle * 2) * (ringRad * 0.3) * spreadYFactor;
              wz = Math.sin(ringAngle) * ringRad * spreadZFactor;
            } else if (floatingCubesArrangement === 'grid_matrix') {
              const side = Math.ceil(Math.cbrt(numCubes));
              const gx = (c % side) - (side - 1) * 0.5;
              const gy = (Math.floor(c / side) % side) - (side - 1) * 0.5;
              const gz = Math.floor(c / (side * side)) - (side - 1) * 0.5;
              wx = gx * (width * 0.22) * spreadXFactor;
              wy = gy * (height * 0.22) * spreadYFactor;
              wz = gz * 220 * spreadZFactor;
            } else if (floatingCubesArrangement === 'helix_spiral') {
              const helixT = (c / (numCubes || 1));
              const helixAngle = helixT * Math.PI * 4 + time * (floatingCubesRotSpeedY * 0.2);
              const helixR = (width * 0.25) * spreadXFactor;
              wx = Math.cos(helixAngle) * helixR;
              wy = (helixT - 0.5) * (height * 0.75) * spreadYFactor;
              wz = Math.sin(helixAngle) * helixR * spreadZFactor;
            } else if (floatingCubesArrangement === 'cluster') {
              const clAngle = c * 2.39996 + time * 0.15;
              const clR = Math.sqrt((c + 1) / numCubes) * (width * 0.32) * spreadXFactor;
              wx = Math.cos(clAngle) * clR;
              wy = Math.sin(clAngle * 1.4) * clR * spreadYFactor;
              wz = Math.sin(clAngle * 0.8) * 280 * spreadZFactor;
            }

            // Apply Group 3D Offsets
            wx += ((floatingCubesOffsetX || 0) / 100) * (width * 0.5);
            wy += ((floatingCubesOffsetY || 0) / 100) * (height * 0.5);
            wz += ((floatingCubesOffsetZ || 0) / 100) * 450;

            const freqVal = (frequencyData[c % 32] || 0) / 255;
            const cubeSize = (floatingCubesSize || 32) * (floatingCubesAudioReactive ? (1 + freqVal * 0.7 + scaledBass * 0.4) : 1);

            // Euler Rotations
            const rx = time * (floatingCubesRotSpeedX * 0.3) + c * 0.35 + (floatingCubesAudioReactive ? scaledBass * 0.6 : 0);
            const ry = time * (floatingCubesRotSpeedY * 0.4) + c * 0.45;
            const rz = time * (floatingCubesRotSpeedZ * 0.2) + c * 0.25;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            // Rotate Vertices & Project
            const projectedVertices: Array<{ x: number; y: number; z: number }> = [];
            const cameraDist = 800;
            const fov = 750;

            for (let v = 0; v < unitVertices.length; v++) {
              const [vx0, vy0, vz0] = unitVertices[v];
              const lx = vx0 * cubeSize * 0.5;
              const ly = vy0 * cubeSize * 0.5;
              const lz = vz0 * cubeSize * 0.5;

              // Rotate locally
              const y1 = ly * cosX - lz * sinX;
              const z1 = ly * sinX + lz * cosX;
              const x2 = lx * cosY + z1 * sinY;
              const z2 = -lx * sinY + z1 * cosY;
              const x3 = x2 * cosZ - y1 * sinZ;
              const y3 = x2 * sinZ + y1 * cosZ;

              // World Space Coordinates
              const worldX = wx + x3;
              const worldY = wy + y3;
              const worldZ = wz + z2;

              const depth = cameraDist + worldZ;
              const safeDepth = depth > 30 ? depth : 30;
              const scale = fov / safeDepth;

              projectedVertices.push({
                x: cx + worldX * scale,
                y: cy + worldY * scale,
                z: worldZ
              });
            }

            const cubeCenterDepth = wz;
            const screenCenterScale = fov / (cameraDist + wz > 30 ? cameraDist + wz : 30);
            const screenCX = cx + wx * screenCenterScale;
            const screenCY = cy + wy * screenCenterScale;

            const cubeColor = (c % 2 === 0 ? curPrimaryColor : curSecondaryColor);
            const accentColor = (c % 2 === 0 ? curSecondaryColor : curPrimaryColor);

            // Compute Face Polygons with Rotated Normals
            const faceItems = [];
            for (let f = 0; f < cubeFaces.length; f++) {
              const face = cubeFaces[f];
              const [nx0, ny0, nz0] = face.norm;

              // Rotate normal vector
              const ny1 = ny0 * cosX - nz0 * sinX;
              const nz1 = ny0 * sinX + nz0 * cosX;
              const nx2 = nx0 * cosY + nz1 * sinY;
              const nz2 = -nx0 * sinY + nz1 * cosY;
              const nx3 = nx2 * cosZ - ny1 * sinZ;
              const ny3 = nx2 * sinZ + ny1 * cosZ;

              // Backface culling: if normal points away in camera space (nz2 < 0)
              if (nz2 < -0.15 && style !== 'wireframe') continue;

              const dot = Math.max(0.15, nx3 * lightDir[0] + ny3 * lightDir[1] + nz2 * lightDir[2]);
              const pts = face.v.map(vIdx => projectedVertices[vIdx]);
              const avgZ = pts.reduce((sum, p) => sum + p.z, 0) / 4;

              faceItems.push({
                screenPts: pts,
                avgZ,
                light: dot,
                faceIndex: f
              });
            }

            // Sort faces back-to-front
            faceItems.sort((a, b) => a.avgZ - b.avgZ);

            renderCubes.push({
              centerZ: cubeCenterDepth,
              screenCX,
              screenCY,
              faces: faceItems,
              vertices2D: projectedVertices,
              color: cubeColor,
              accentColor
            });
          }

          // Sort All Cubes by Depth (Deepest to Front)
          renderCubes.sort((a, b) => a.centerZ - b.centerZ);

          // Draw All 3D Cubes
          for (const item of renderCubes) {
            if (style === 'wireframe') {
              ctx.strokeStyle = item.color;
              ctx.lineWidth = 1.8;
              ctx.shadowColor = item.color;
              ctx.shadowBlur = 10;

              // 12 Wireframe Edges
              const edges = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7]
              ];

              ctx.beginPath();
              for (const [v1, v2] of edges) {
                const p1 = item.vertices2D[v1];
                const p2 = item.vertices2D[v2];
                if (p1 && p2) {
                  ctx.moveTo(p1.x, p1.y);
                  ctx.lineTo(p2.x, p2.y);
                }
              }
              ctx.stroke();

              // Glowing corner vertices
              ctx.fillStyle = '#ffffff';
              for (const p of item.vertices2D) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
              }

            } else if (style === 'dots_vertices') {
              ctx.fillStyle = item.color;
              ctx.shadowColor = item.color;
              ctx.shadowBlur = 12;
              for (const p of item.vertices2D) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
              }

            } else {
              // Shaded Glass or Solid Neon Faces
              for (const face of item.faces) {
                const alpha = style === 'shaded_glass' ? 0.65 : 0.92;
                ctx.fillStyle = item.color;
                ctx.globalAlpha = Math.min(1.0, alpha * (0.4 + face.light * 0.7));

                ctx.beginPath();
                ctx.moveTo(face.screenPts[0].x, face.screenPts[0].y);
                for (let i = 1; i < face.screenPts.length; i++) {
                  ctx.lineTo(face.screenPts[i].x, face.screenPts[i].y);
                }
                ctx.closePath();
                ctx.fill();

                // High-contrast neon edge borders
                ctx.strokeStyle = style === 'shaded_glass' ? '#ffffff' : item.accentColor;
                ctx.lineWidth = 1.4;
                ctx.globalAlpha = 0.9;
                ctx.shadowColor = item.color;
                ctx.shadowBlur = 8;
                ctx.stroke();
              }
              ctx.globalAlpha = 1.0;
            }
          }
          ctx.restore();

        } else if (visType === 'mirror_spectrum') {
          ctx.save();
          const bars = 48;
          const barW = (width * 0.85) / bars;
          const startX = (width - bars * barW) / 2;

          for (let i = 0; i < bars; i++) {
            const val = (frequencyData[i * 2] || 0) / 255;
            const barH = val * (height * 0.24) * (1 + scaledBass * 0.5);
            const x = startX + i * barW;

            const grad = ctx.createLinearGradient(0, cy - barH, 0, cy + barH);
            grad.addColorStop(0, curSecondaryColor);
            grad.addColorStop(0.5, curPrimaryColor);
            grad.addColorStop(1, curSecondaryColor);
            ctx.fillStyle = grad;

            ctx.fillRect(x + 1, cy - barH, barW - 2, barH);
            ctx.fillRect(x + 1, cy, barW - 2, barH);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 1, cy - barH - 2, barW - 2, 2);
            ctx.fillRect(x + 1, cy + barH, barW - 2, 2);
          }
          ctx.restore();

        } else if (visType === 'liquid_blob') {
          ctx.save();
          ctx.translate(cx, cy);
          const tentacles = blobTentacles || 6;
          const baseBlobR = Math.min(width, height) * 0.2 * pulseScale;
          const numBlobPoints = tentacles * 8;

          const blobGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, baseBlobR * 1.5);
          blobGrad.addColorStop(0, curPrimaryColor);
          blobGrad.addColorStop(0.7, curSecondaryColor);
          blobGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = blobGrad;
          ctx.strokeStyle = curPrimaryColor;
          ctx.lineWidth = 3;
          ctx.shadowColor = curPrimaryColor;
          ctx.shadowBlur = 18;

          ctx.beginPath();
          for (let p = 0; p <= numBlobPoints; p++) {
            const angle = (p / numBlobPoints) * Math.PI * 2;
            const freqIdx = Math.floor((p / numBlobPoints) * 32);
            const freqVal = (frequencyData[freqIdx] || 0) / 255;
            const wobble = Math.sin(angle * tentacles + time * 3) * (baseBlobR * 0.25) + freqVal * (baseBlobR * 0.45);
            const r = baseBlobR + wobble;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();

        } else if (visType === 'waveform') {
          ctx.lineWidth = 4;
          ctx.strokeStyle = curPrimaryColor;
          ctx.shadowColor = curPrimaryColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();

          const sliceWidth = width / waveData.length;
          let x = 0;
          for (let i = 0; i < waveData.length; i++) {
            const v = (waveData[i] || 128) / 128.0;
            const y = cy + (v - 1) * (height * 0.25);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();

        } else if (visType === 'pulsing' || visType === 'wave_circle') {
          const baseRadius = Math.min(width, height) * 0.18 * pulseScale;
          ctx.lineWidth = 5;
          ctx.strokeStyle = curSecondaryColor;
          ctx.shadowColor = curSecondaryColor;
          ctx.shadowBlur = 18;

          ctx.beginPath();
          const points = 64;
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const audioVal = (frequencyData[i % frequencyData.length] || 0) / 255;
            const r = baseRadius + (visType === 'wave_circle' ? audioVal * 40 : 0);
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

        } else if (visType === 'radial') {
          const radCX = width * (radialXPercent / 100);
          const radCY = height * (radialYPercent / 100);
          const baseRadius = Math.min(width, height) * (radialRadius / 100);
          const points = radialBarCount;
          const totalAngle = (radialArcAngle / 360) * Math.PI * 2;
          const startAngle = -Math.PI / 2 - (totalAngle - Math.PI * 2) / 2;

          const barLineWidth = Math.max(1.5, Math.min(6, (baseRadius * totalAngle) / points));
          ctx.lineWidth = barLineWidth;

          for (let i = 0; i < points; i++) {
            const angle = startAngle + (i / points) * totalAngle;
            let freqIndex: number;
            if (radialMirror) {
              const half = points / 2;
              const distFromCenter = Math.abs((i % half) - half / 2);
              freqIndex = Math.floor((distFromCenter / (half / 2)) * 48);
            } else {
              freqIndex = Math.floor((i / points) * 64);
            }

            const val = (frequencyData[freqIndex % frequencyData.length] || 0) / 255;
            const lineLen = val * (radialBarHeight * 1.2) * pulseScale;

            const x1 = radCX + Math.cos(angle) * baseRadius;
            const y1 = radCY + Math.sin(angle) * baseRadius;
            const x2 = radCX + Math.cos(angle) * (baseRadius + lineLen);
            const y2 = radCY + Math.sin(angle) * (baseRadius + lineLen);

            const barGrad = ctx.createLinearGradient(x1, y1, x2, y2);
            barGrad.addColorStop(0, curPrimaryColor);
            barGrad.addColorStop(1, curSecondaryColor);
            ctx.strokeStyle = barGrad;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            if (val > 0.15) {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(x2, y2, Math.max(1.5, barLineWidth * 0.6), 0, Math.PI * 2);
              ctx.fill();
            }
          }

        } else if (visType === 'vector_ball' || visType === 'poly_sphere') {
          const sphCX = width * (sphereXPercent / 100);
          const sphCY = height * (sphereYPercent / 100);
          const audioPulse = 1 + scaledBass * (sphereSoundSens / 100) * 0.6;
          const baseSphereR = Math.min(width, height) * (sphereRadius / 100) * audioPulse;
          const rings = sphereRings;
          const rotAngle = time * (sphereRotSpeed * 0.3);

          ctx.save();
          ctx.translate(sphCX, sphCY);

          for (let r = 0; r < rings; r++) {
            const normR = r / rings - 0.5;
            const ringR = Math.max(2, Math.cos(normR * Math.PI) * baseSphereR);
            const ringY = normR * baseSphereR * 1.8;

            ctx.save();
            ctx.translate(0, ringY);
            ctx.rotate(rotAngle + r * 0.15);

            ctx.strokeStyle = r % 2 === 0 ? curPrimaryColor : curSecondaryColor;
            ctx.lineWidth = 1.5 + scaledBass * (sphereSoundSens / 100);
            ctx.shadowColor = curPrimaryColor;
            ctx.shadowBlur = 8;

            if (sphereStyle === 'dots') {
              const numDots = 16;
              for (let d = 0; d < numDots; d++) {
                const dotAngle = (d / numDots) * Math.PI * 2 + rotAngle;
                const dx = Math.cos(dotAngle) * ringR;
                const dy = Math.sin(dotAngle) * ringR * 0.35;
                ctx.fillStyle = curPrimaryColor;
                ctx.beginPath();
                ctx.arc(dx, dy, 2 + scaledBass * 2, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              ctx.beginPath();
              ctx.ellipse(0, 0, ringR, ringR * 0.35, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }

          for (let m = 0; m < 4; m++) {
            const mAngle = rotAngle + (m * Math.PI) / 4;
            ctx.save();
            ctx.rotate(mAngle);
            ctx.strokeStyle = curSecondaryColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, baseSphereR * 0.4, baseSphereR * 0.9, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore();
        }
      }
      ctx.restore();

      // --- 4. RETRO DEMOSCENE LAUFSCHRIFT SCROLLER ---
      if (showScrollerText && scrollerText.trim().length > 0) {
        ctx.save();
        ctx.font = `900 ${scrollerFontSize}px "Courier New", "Lucida Console", "Consolas", monospace`;
        ctx.textBaseline = 'middle';

        const paddedText = scrollerText.trim() + '    ***    ';
        const textMetrics = ctx.measureText(paddedText);
        const textWidth = textMetrics.width;
        const blockW = textWidth > 0 ? textWidth : width;

        // Smooth and pleasant reading speed: scrollerSpeed scaled smoothly (multiplier 1.0)
        const scrollDist = (frameCount * (scrollerSpeed || 2) * 1.0) % blockW;
        const baseY = height * (scrollerYPos / 100);
        const startX = -scrollDist;
        const mode = scrollerMotionMode || (scrollerSineBounce ? 'sine' : 'linear');
        const amp = (scrollerAmplitude || 14);
        const freq = (scrollerFrequency || 35) / 50;
        const glowBlur = (scrollerGlow || 12);
        const outlineWidth = Math.max(3, scrollerFontSize * 0.16);

        // Optional stylish semi-transparent backdrop bar
        if (scrollerBackdrop) {
          const barPad = scrollerFontSize * 0.9;
          const bgGrad = ctx.createLinearGradient(0, baseY - barPad, 0, baseY + barPad);
          bgGrad.addColorStop(0, 'rgba(10, 15, 29, 0)');
          bgGrad.addColorStop(0.2, 'rgba(10, 15, 29, 0.85)');
          bgGrad.addColorStop(0.8, 'rgba(10, 15, 29, 0.85)');
          bgGrad.addColorStop(1, 'rgba(10, 15, 29, 0)');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, baseY - barPad, width, barPad * 2);

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, baseY - barPad); ctx.lineTo(width, baseY - barPad);
          ctx.moveTo(0, baseY + barPad); ctx.lineTo(width, baseY + barPad);
          ctx.stroke();
        }

        for (let bx = startX; bx < width + blockW; bx += blockW) {
          if (mode !== 'linear') {
            let charX = bx;
            for (let i = 0; i < paddedText.length; i++) {
              const char = paddedText[i];
              const charW = ctx.measureText(char).width;

              if (charX + charW > -20 && charX < width + 20) {
                let charOffsetY = 0;
                let charScale = 1;

                if (mode === 'sine') {
                  charOffsetY = Math.sin(time * 2.5 * freq + (charX / 80)) * amp;
                } else if (mode === 'bounce') {
                  // Authentic chiptune bouncing physics curve - smooth and gentle
                  const bouncePhase = (time * 3 * freq + (charX / 75)) % Math.PI;
                  charOffsetY = -Math.abs(Math.sin(bouncePhase)) * amp * 1.2 + (amp * 0.2);
                } else if (mode === 'zigzag') {
                  // Triangular zigzag
                  const zigPhase = ((time * 2.5 * freq + (charX / 60)) % 2) - 1;
                  charOffsetY = (1 - 2 * Math.abs(zigPhase)) * amp;
                } else if (mode === 'wobble') {
                  // Compound wobble wave
                  charOffsetY = (Math.sin(time * 2.5 * freq + charX * 0.025) + Math.cos(time * 4 * freq + charX * 0.04) * 0.4) * amp;
                } else if (mode === 'spiral_3d') {
                  const spiralPhase = time * 2.5 * freq + (charX / 90);
                  charOffsetY = Math.sin(spiralPhase) * amp;
                  charScale = 0.9 + Math.cos(spiralPhase) * 0.25;
                } else if (mode === 'glitch_hop') {
                  const hopPhase = Math.sin(time * 4.5 * freq + (i * 0.35));
                  const isBassKick = scaledBass > 0.45;
                  charOffsetY = (hopPhase > 0.45 ? -amp * 0.8 : 0) + (isKick => isKick ? (Math.random() - 0.5) * amp * 0.5 : 0)(isBassKick);
                }

                // Color calculation
                let charColor = curPrimaryColor;
                if (scrollerColorStyle === 'rainbow') {
                  charColor = `hsl(${Math.abs((charX * 0.5) + frameCount * 2) % 360}, 100%, 65%)`;
                } else if (scrollerColorStyle === 'cyan_pink') {
                  charColor = i % 2 === 0 ? curPrimaryColor : curSecondaryColor;
                } else if (scrollerColorStyle === 'matrix') {
                  charColor = '#34d399';
                } else if (scrollerColorStyle === 'gold') {
                  charColor = '#fbbf24';
                }

                ctx.save();
                if (charScale !== 1) {
                  ctx.font = `900 ${Math.round(scrollerFontSize * charScale)}px "Courier New", "Lucida Console", "Consolas", monospace`;
                }

                const drawY = baseY + charOffsetY;

                // High-contrast deep black outline for pristine readability against any backdrop
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
                ctx.lineWidth = outlineWidth;
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.strokeText(char, charX, drawY);

                // Main vibrant fill with glow
                ctx.fillStyle = charColor;
                ctx.shadowColor = charColor;
                ctx.shadowBlur = glowBlur;
                ctx.fillText(char, charX, drawY);

                // Subtle glossy highlight on top half of letter
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 0.45;
                ctx.fillText(char, charX, drawY - 1);
                ctx.restore();
              }
              charX += charW;
            }
          } else {
            // Linear sleek smooth marquee
            let textFillStyle: string | CanvasGradient = curPrimaryColor;
            if (scrollerColorStyle === 'rainbow') {
              const textGrad = ctx.createLinearGradient(bx, 0, bx + blockW, 0);
              textGrad.addColorStop(0, '#ef4444');
              textGrad.addColorStop(0.2, '#f97316');
              textGrad.addColorStop(0.4, '#eab308');
              textGrad.addColorStop(0.6, '#22c55e');
              textGrad.addColorStop(0.8, '#38bdf8');
              textGrad.addColorStop(1, '#a855f7');
              textFillStyle = textGrad;
            } else if (scrollerColorStyle === 'matrix') {
              textFillStyle = '#34d399';
            } else if (scrollerColorStyle === 'gold') {
              textFillStyle = '#fbbf24';
            }

            // High-contrast deep black outline for linear mode
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
            ctx.lineWidth = outlineWidth;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(paddedText, bx, baseY);

            ctx.fillStyle = textFillStyle;
            ctx.shadowColor = curPrimaryColor;
            ctx.shadowBlur = glowBlur;
            ctx.fillText(paddedText, bx, baseY);
          }
        }
        ctx.restore();
      }

      // --- 5. BRANDING OVERLAYS (Logo & Song Text) ---
      ctx.save();
      if (showTextOverlay && (artistName || songTitle)) {
        const tx = width * (textXPercent / 100);
        const ty = height * (textYPercent / 100);

        ctx.textAlign = 'center';
        ctx.font = `bold ${textSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 12;
        ctx.fillText(songTitle, tx, ty);

        if (artistName) {
          ctx.font = `500 ${Math.round(textSize * 0.65)}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = curPrimaryColor;
          ctx.fillText(artistName.toUpperCase(), tx, ty + textSize + 2);
        }
      }

      if (logoImgRef.current) {
        const img = logoImgRef.current;
        const bassPulseScale = logoBassPulse ? (1 + scaledBass * 0.25) : 1;
        const refScale = Math.min(width, height) / 720;
        const scale = (logoScale / 100) * 0.25 * refScale * bassPulseScale;
        const imgW = img.width * scale;
        const imgH = img.height * scale;

        let lx = width * (logoXPercent / 100) - imgW / 2;
        let ly = height * (logoYPercent / 100) - imgH / 2;

        // Auto Safe-Area Edge Clamping: Ensure logo stays inside visible frame on ratio switch
        if (logoAutoFitSafe !== false) {
          if (imgW <= width) {
            lx = Math.max(12, Math.min(width - imgW - 12, lx));
          }
          if (imgH <= height) {
            ly = Math.max(12, Math.min(height - imgH - 12, ly));
          }
        }

        ctx.globalAlpha = logoOpacity / 100;
        ctx.drawImage(img, lx, ly, imgW, imgH);
        ctx.globalAlpha = 1.0;
      }

      // Duration Timer Overlay
      if (showTimerOverlay) {
        const tx = width * (timerXPercent / 100);
        const ty = height * (timerYPercent / 100);

        let currentSec = 0;
        let totalSec = estimatedSongDurationSeconds || 0;

        if (overrideAudio) {
          currentSec = overrideAudio.time / 1.8;
          totalSec = Math.round(estimatedSongDurationSeconds || totalSec);
        } else if (isCustomAudioPlaying && customAudioRef.current) {
          currentSec = customAudioRef.current.currentTime || 0;
          totalSec = Math.round(customAudioRef.current.duration || totalSec);
        } else if (isRecording) {
          currentSec = recordingTime;
        } else if (isPlaying && song && song.orderList && song.orderList.length > 0) {
          const bpm = song.bpm || 125;
          const speed = song.speed || 6;
          const secondsPerRow = (speed * 2.5) / bpm;

          let playedRows = 0;
          const curOrder = Math.min(
            Math.max(0, audioEngine.currentPlayingOrderIndex ?? 0),
            song.orderList.length - 1
          );
          const curLine = Math.max(0, audioEngine.currentPlayingLineIndex ?? 0);

          for (let o = 0; o < curOrder; o++) {
            const patId = song.orderList[o];
            const pat = song.patterns.find((p) => p.id === patId);
            playedRows += pat ? pat.length : 64;
          }
          playedRows += curLine;
          currentSec = playedRows * secondsPerRow;
        } else {
          currentSec = 0;
        }

        const fmt = (s: number) => {
          const rounded = Math.floor(Math.max(0, s));
          const m = Math.floor(rounded / 60);
          const sec = Math.floor(rounded % 60);
          return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        };

        let timerText = '';
        if (timerStyle === 'elapsed_total') {
          timerText = `${fmt(currentSec)} / ${fmt(totalSec)}`;
        } else if (timerStyle === 'elapsed_only') {
          timerText = fmt(currentSec);
        } else if (timerStyle === 'countdown') {
          timerText = `-${fmt(Math.max(0, totalSec - currentSec))}`;
        }

        ctx.font = `bold ${timerSize}px "Courier New", monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const textMetrics = ctx.measureText(timerText);
        const textWidth = textMetrics.width;
        const paddingX = Math.round(timerSize * 0.4);
        const paddingY = Math.round(timerSize * 0.25);

        ctx.fillStyle = 'rgba(11, 15, 25, 0.75)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;

        const rx = tx - textWidth / 2 - paddingX;
        const ry = ty - timerSize / 2 - paddingY;
        const rw = textWidth + paddingX * 2;
        const rh = timerSize + paddingY * 2;

        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(rx, ry, rw, rh, 6);
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
        ctx.fill();
        ctx.stroke();

        if (timerColorStyle === 'primary') ctx.fillStyle = curPrimaryColor;
        else if (timerColorStyle === 'cyan') ctx.fillStyle = '#38bdf8';
        else if (timerColorStyle === 'amber') ctx.fillStyle = '#fbbf24';
        else if (timerColorStyle === 'green') ctx.fillStyle = '#34d399';
        else ctx.fillStyle = '#ffffff';

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(timerText, tx, ty);
      }
      ctx.restore();

      // --- 6. MASTER JUICE & POST-PROCESSING OVERLAYS ---
      if (bloomGlow > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (bloomGlow / 100) * 0.35;
        const bloomGrad = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.1, cx, cy, Math.max(width, height) * 0.6);
        bloomGrad.addColorStop(0, curPrimaryColor);
        bloomGrad.addColorStop(0.6, curSecondaryColor);
        bloomGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bloomGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (chromaticAberration > 0) {
        const shift = Math.max(1, Math.round((chromaticAberration / 100) * 8 * (1 + scaledBass * 0.3)));
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;
        if (offCanvas.width !== width || offCanvas.height !== height) {
          offCanvas.width = width;
          offCanvas.height = height;
        }
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.clearRect(0, 0, width, height);
          offCtx.drawImage(canvas, 0, 0);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.22;
          ctx.drawImage(offCanvas, shift, 0, width - shift, height, 0, 0, width - shift, height);
          ctx.drawImage(offCanvas, 0, 0, width - shift, height, shift, 0, width - shift, height);
          ctx.restore();
        }
      }

      if (crtGlitch && (Math.random() < 0.08 || scaledBass > 0.8)) {
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;
        if (offCanvas.width !== width || offCanvas.height !== height) {
          offCanvas.width = width;
          offCanvas.height = height;
        }
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.clearRect(0, 0, width, height);
          offCtx.drawImage(canvas, 0, 0);
          ctx.save();
          const glitchY = Math.floor(Math.random() * Math.max(10, height - 30));
          const glitchH = 4 + Math.floor(Math.random() * 18);
          const shiftX = (Math.random() - 0.5) * (18 + scaledBass * 20);
          ctx.drawImage(offCanvas, 0, glitchY, width, glitchH, shiftX, glitchY, width, glitchH);
          ctx.restore();
        }
      }

      if (scanlines) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 2);
        }
        ctx.restore();
      }

      if (vignette) {
        ctx.save();
        const vigGrad = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.4, cx, cy, Math.max(width, height) * 0.7);
        vigGrad.addColorStop(0, 'transparent');
        vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // Guarantee synchronized frame feed to video recorder without dropped async frames
      if (videoTrackRef.current && typeof (videoTrackRef.current as any).requestFrame === 'function') {
        try {
          (videoTrackRef.current as any).requestFrame();
        } catch (e) {}
      }

      if (!cancelRenderRef.current && !isMasterRenderingRef.current) {
        animFrameRef.current = requestAnimationFrame(() => renderFrame());
      }
    };

    renderFrameRef.current = renderFrame;

    if (!isMasterRenderingRef.current) {
      animFrameRef.current = requestAnimationFrame(() => renderFrame());
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    isOpen,
    aspectRatio,
  ]);

  // -------------------------------------------------------------
  // OFFLINE DETERMINISTIC FRAME-BY-FRAME HQ VIDEO RENDERER
  // WebCodecs + Mediabunny: Zero lag, memory backpressure safe, 100% responsive
  // -------------------------------------------------------------
  const handleCancelMasterRender = () => {
    cancelRenderRef.current = true;
    isMasterRenderingRef.current = false;
    setIsMasterRendering(false);
    setRenderProgress({
      phase: 'Cancelling render...',
      frame: 0,
      totalFrames: 0,
      percent: 0,
    });
    onShowToast?.('Video render cancelled.');
  };

  const handleStartMasterRender = async () => {
    if (!song) {
      onShowToast?.('No song loaded to render.');
      return;
    }
    const canvas = canvasRef.current;
    const activeRenderFrame = renderFrameRef.current;
    if (!canvas || !activeRenderFrame) {
      onShowToast?.('Visualizer canvas is not ready.');
      return;
    }

    // Stop live playback
    audioEngine.stop();
    if (isPlaying) {
      onPause();
    }

    cancelRenderRef.current = false;
    isMasterRenderingRef.current = true;
    setIsMasterRendering(true);
    setRenderProgress({
      phase: 'Synthesizing Studio Audio DSP...',
      frame: 0,
      totalFrames: 0,
      percent: 0,
    });

    try {
      // 1. Render Studio Audio to AudioBuffer with true engine FX settings
      const liveFx = audioEngine.getFxSettings ? audioEngine.getFxSettings() : {
        masterVolume: 0.85,
        reverbEnabled: true,
        reverbSize: 2.0,
        reverbWet: 0.2,
        delayEnabled: false,
        delayTime: 0.25,
        delayFeedback: 0.35,
        delayWet: 0.25,
        filterEnabled: false,
        filterType: 'lowpass' as const,
        filterCutoff: 20000,
        filterResonance: 1.0,
        saturationEnabled: false,
        saturationDrive: 0,
        stereoWidth: 0.7,
      };

      const renderedAudioBuffer = await renderSongToAudioBuffer(
        song,
        liveFx,
        (statusMsg) => {
          setRenderProgress((prev) => ({ ...prev, phase: statusMsg }));
        },
        () => cancelRenderRef.current
      );

      if (cancelRenderRef.current) {
        setIsMasterRendering(false);
        return;
      }

      const songDuration = renderedAudioBuffer.duration;
      const fps = targetFps;
      const totalFrames = Math.max(1, Math.ceil(songDuration * fps));
      const sampleRate = renderedAudioBuffer.sampleRate;
      const leftChannel = renderedAudioBuffer.getChannelData(0);
      const rightChannel = renderedAudioBuffer.numberOfChannels > 1 ? renderedAudioBuffer.getChannelData(1) : leftChannel;

      const { width: rawW, height: rawH } = getCanvasDimensions();
      const width = rawW - (rawW % 2);
      const height = rawH - (rawH % 2);
      canvas.width = width;
      canvas.height = height;

      setRenderProgress({
        phase: `Encoding ${totalFrames} frames @ ${fps} FPS...`,
        frame: 0,
        totalFrames,
        percent: 0,
      });

      const hasWebCodecs = typeof (window as any).VideoEncoder !== 'undefined' && typeof (window as any).VideoFrame !== 'undefined';

      if (hasWebCodecs) {
        let actualFormat = exportFormat;
        const target = new BufferTarget();
        let output: Output | null = null;
        let videoSource: CanvasSource | null = null;
        let audioSource: AudioBufferSource | null = null;

        // Balanced high-quality bitrates to keep memory footprint light & encoding fast
        const targetBitrate = fps === 60 ? 5500000 : 3500000;

        // Try setting up encoders for requested format, with fallback to WebM
        if (actualFormat === 'mp4') {
          try {
            const format = new Mp4OutputFormat({ fastStart: 'in-memory' });
            output = new Output({ format, target });
            videoSource = new CanvasSource(canvas, {
              codec: 'avc',
              bitrate: targetBitrate,
            });
            audioSource = new AudioBufferSource({
              codec: 'aac',
              bitrate: 192000,
            });
            output.addVideoTrack(videoSource);
            output.addAudioTrack(audioSource);
            await output.start();
          } catch (err) {
            console.warn('MP4 encoding not supported in this browser, falling back to WebM:', err);
            actualFormat = 'webm';
            output = null;
            videoSource = null;
            audioSource = null;
          }
        }

        if (actualFormat === 'webm' || !output) {
          actualFormat = 'webm';
          const format = new WebMOutputFormat();
          output = new Output({ format, target });
          videoSource = new CanvasSource(canvas, {
            codec: 'vp9',
            bitrate: targetBitrate,
          });
          audioSource = new AudioBufferSource({
            codec: 'opus',
            bitrate: 192000,
          });
          output.addVideoTrack(videoSource);
          output.addAudioTrack(audioSource);
          await output.start();
        }

        // 2. Add full rendered AudioBuffer to the audio track once
        await audioSource!.add(renderedAudioBuffer);
        audioSource!.close();

        // 3. Render and encode Video Frames Deterministically
        const windowSize = 2048;
        const halfWindow = 1024;
        const freqArr = new Uint8Array(64);
        const waveArr = new Uint8Array(64);
        let smoothOfflineBass = 0;
        const dt = 1 / fps;
        const startTimeMs = Date.now();

        for (let f = 0; f < totalFrames; f++) {
          if (cancelRenderRef.current) {
            try {
              await output.cancel();
            } catch (e) {}
            setIsMasterRendering(false);
            return;
          }

          const currentTime = f / fps;
          const currentSampleIndex = Math.floor(currentTime * sampleRate);

          // Extract waveform & frequency bands for canvas visualization
          let localBassSum = 0;
          for (let i = 0; i < 64; i++) {
            const samplePos = currentSampleIndex - halfWindow + Math.floor((i / 64) * windowSize);
            let val = 0;
            if (samplePos >= 0 && samplePos < leftChannel.length) {
              val = (leftChannel[samplePos] + rightChannel[samplePos]) * 0.5;
            }
            waveArr[i] = Math.max(0, Math.min(255, Math.floor(128 + val * 120)));

            let bandEnergy = 0;
            const bandSpan = Math.max(2, Math.floor((i + 1) * 3));
            for (let k = 0; k < bandSpan; k++) {
              const p = currentSampleIndex - (i * 4) - k;
              if (p >= 0 && p < leftChannel.length) {
                bandEnergy += Math.abs(leftChannel[p] + rightChannel[p]) * 0.5;
              }
            }
            const rawEnergy = Math.min(255, Math.floor((bandEnergy / bandSpan) * 380));
            freqArr[i] = rawEnergy;
            if (i < 8) localBassSum += rawEnergy;
          }

          const rawBass = (localBassSum / 8) / 255;
          const targetBass = Math.min(1, rawBass * (paramsRef.current.audioGain || 1.6));
          smoothOfflineBass += (targetBass - smoothOfflineBass) * Math.min(1, dt * 24);

          // Render canvas for exact frame time using active frame renderer
          const renderFn = renderFrameRef.current || activeRenderFrame;
          if (renderFn) {
            renderFn({
              freq: freqArr,
              wave: waveArr,
              time: currentTime * 1.8,
              frame: f,
              bass: smoothOfflineBass,
              dt,
            });
          }

          // Add canvas frame to video track with keyframe intervals
          const isKeyFrame = f % (fps * 2) === 0;
          await videoSource!.add(currentTime, dt, { keyFrame: isKeyFrame });

          // Yield to browser UI & Garbage Collector on every 2 frames, with micro-pause on every 8 frames
          if (f % 2 === 0 || f === totalFrames - 1) {
            const pct = Math.round(((f + 1) / totalFrames) * 100);
            const elapsedSec = (Date.now() - startTimeMs) / 1000;
            const framesPerSec = (f + 1) / (elapsedSec || 1);
            const remainingFrames = totalFrames - (f + 1);
            const remainingSec = Math.ceil(remainingFrames / (framesPerSec || 1));
            const etaMin = Math.floor(remainingSec / 60);
            const etaSec = (remainingSec % 60).toString().padStart(2, '0');

            setRenderProgress({
              phase: `Encoding Frame ${f + 1} of ${totalFrames} (${pct}%) • ETA ~${etaMin}:${etaSec}`,
              frame: f + 1,
              totalFrames,
              percent: pct,
            });

            // Macro-task yield ensures mouse events (Cancel button) and UI repaints process smoothly
            if (f % 8 === 0) {
              await new Promise((r) => setTimeout(r, 4));
            } else {
              await new Promise((r) => setTimeout(r, 0));
            }
          }
        }

        setRenderProgress({
          phase: 'Finalizing Video & Muxing Streams (Almost Done)...',
          frame: totalFrames,
          totalFrames,
          percent: 100,
        });

        videoSource!.close();
        await output.finalize();

        const buffer = target.buffer;
        if (!buffer) {
          throw new Error('Render failed to produce output buffer');
        }

        const finalBlob = new Blob([buffer], {
          type: actualFormat === 'mp4' ? 'video/mp4' : 'video/webm',
        });

        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (songTitle || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${safeName}_${aspectRatio.replace(':', 'x')}_${fps}fps.${actualFormat}`;
        a.click();
        URL.revokeObjectURL(url);

        isMasterRenderingRef.current = false;
        setIsMasterRendering(false);
        onShowToast?.(`Video successfully rendered and saved (${actualFormat.toUpperCase()})!`);
      } else {
        onShowToast?.('WebCodecs is not supported in this browser. Please use Chrome, Edge, or Safari.');
        isMasterRenderingRef.current = false;
        setIsMasterRendering(false);
      }
    } catch (err: any) {
      if (err?.message === 'Render cancelled' || cancelRenderRef.current) {
        // Handled cleanly
      } else {
        console.error('Master render error:', err);
        onShowToast?.(`Rendering failed: ${err?.message || 'Please try again.'}`);
      }
      isMasterRenderingRef.current = false;
      setIsMasterRendering(false);
    } finally {
      isMasterRenderingRef.current = false;
      setIsMasterRendering(false);
      if (renderFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(() => renderFrameRef.current?.());
      }
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      key="visualizer-studio-fullscreen-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#445166] flex flex-col text-slate-100 font-sans overflow-hidden select-none"
    >
          {/* Ambient subtle vignette overlay (Persistent studio lighting) */}
          <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

          {/* APPLICATION TOP HEADER (SYN-TRACKER WORKSTATION STYLE) */}
          <motion.header
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -70, opacity: 0, transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
            className="relative z-50 px-3 py-1.5 flex items-center justify-between gap-2.5 select-none glass-panel-header text-[#cbd5e1] shrink-0 min-w-max"
          >
            {/* LEFT GROUP: Branding & Persona Switcher */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Logo & Title */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div 
                  className="w-8 h-8 rounded-lg bg-[#141d27]/70 backdrop-blur-sm border border-[#27364a]/80 flex items-center justify-center shrink-0 shadow-inner transition-all text-sky-400"
                  title="SYN-Visualizer Video & Demoscene Studio"
                >
                  <Film className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 leading-none">
                    <span className="font-bold tracking-tight text-sm text-[#f8fafc] font-display">
                      SYN-VISUALIZER
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono font-bold tracking-normal truncate text-sky-400">
                    {song?.name || 'Demoscene Video Studio'}
                  </div>
                </div>
              </div>

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {/* Affinity-style Studio Persona Switcher */}
              <PersonaSwitcher
                activePersona="visualizer"
                onSelectPersona={(persona) => {
                  if (persona === 'tracker') {
                    onClose();
                  } else if (persona === 'editor') {
                    if (onSwitchPersona) {
                      onSwitchPersona('editor');
                    } else {
                      onClose();
                    }
                  } else if (persona === 'cover') {
                    if (onSwitchPersona) {
                      onSwitchPersona('cover');
                    } else {
                      onClose();
                    }
                  }
                }}
                showLabels={true}
              />

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {/* Main Transport Console (PLAY, STOP, LOOP) - Consistent with Tracker and SYN-Editor */}
              <div className="flex items-center gap-1 bg-[#070b10]/65 backdrop-blur-sm p-1 rounded-lg border border-[#1a2536]/80">
                <button
                  id="vis-header-btn-play"
                  onClick={() => {
                    if (customAudioUrl) {
                      toggleCustomAudioPlay();
                    } else {
                      handleTrackerPlayToggle();
                    }
                  }}
                  className={`h-7 px-3.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss ${
                    (customAudioUrl ? isCustomAudioPlaying : isPlaying)
                      ? 'aqua-amber' 
                      : 'aqua-dark hover:border-[#1b5e47] text-[#e2e8f0]'
                  }`}
                  title="Play / Pause Audio (Spacebar)"
                >
                  {(customAudioUrl ? isCustomAudioPlaying : isPlaying) ? (
                    <Pause className="w-3.5 h-3.5 fill-current shrink-0 text-[#fbbf24]" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current shrink-0 text-[#34d399]" />
                  )}
                  <span className={(customAudioUrl ? isCustomAudioPlaying : isPlaying) ? 'text-[#fbbf24]' : 'text-[#e2e8f0]'}>
                    {(customAudioUrl ? isCustomAudioPlaying : isPlaying) ? 'PAUSE' : 'PLAY'}
                  </span>
                </button>

                <button
                  id="vis-header-btn-stop"
                  onClick={() => {
                    if (customAudioUrl) {
                      if (customAudioRef.current) {
                        customAudioRef.current.pause();
                        customAudioRef.current.currentTime = 0;
                        setIsCustomAudioPlaying(false);
                      }
                    } else {
                      if (isPlaying) {
                        onPause();
                      }
                    }
                  }}
                  className="h-7 px-3 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss aqua-dark hover:border-[#5c1f2d] text-[#e2e8f0]"
                  title="Stop Playback"
                >
                  <Square className="w-3 h-3 fill-current shrink-0 text-[#f43f5e]" />
                  <span>STOP</span>
                </button>

                {/* Loop Toggle */}
                <button
                  id="vis-header-btn-loop"
                  onClick={() => {
                    if (customAudioUrl) {
                      setCustomAudioLoop(!customAudioLoop);
                    }
                  }}
                  className={`h-7 px-3 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-1.5 cursor-pointer aqua-gloss transition-all ${
                    (customAudioUrl ? customAudioLoop : true)
                      ? 'aqua-blue ring-1 ring-sky-400/40 text-[#38bdf8]' 
                      : 'aqua-dark text-[#94a3b8] hover:text-[#e2e8f0]'
                  }`}
                  title={customAudioUrl ? (customAudioLoop ? 'Audio Loop: ACTIVE' : 'Audio Loop: OFF') : 'Continuous Tracker Visualizer'}
                >
                  <Repeat className={`w-3.5 h-3.5 shrink-0 ${(customAudioUrl ? customAudioLoop : true) ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
                  <span className={(customAudioUrl ? customAudioLoop : true) ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}>
                    LOOP
                  </span>
                </button>
              </div>

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

              {/* Undo / Redo in Header Console - Matching Tracker, SYN-Editor, SYN-Cover */}
              <div className="flex items-center gap-1 bg-[#070b10]/65 backdrop-blur-sm p-1 rounded-lg border border-[#1a2536]/80">
                <button
                  id="vis-header-btn-undo"
                  onClick={handleVisUndo}
                  disabled={visHistoryIndex <= 0}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                    visHistoryIndex > 0 ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                  }`}
                  title="Undo Visualizer Setting (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Undo</span>
                </button>
                <button
                  id="vis-header-btn-redo"
                  onClick={handleVisRedo}
                  disabled={visHistoryIndex >= visHistory.length - 1}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                    visHistoryIndex < visHistory.length - 1 ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                  }`}
                  title="Redo Visualizer Setting (Ctrl+Y / Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Redo</span>
                </button>
              </div>

              <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />
            </div>

            {/* RIGHT GROUP: Support & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Support Coffee Button */}
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

              {/* Close Button */}
              <button
                onClick={onClose}
                className="aqua-gloss aqua-dark h-7 w-7 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer border border-[#27364a]/80"
                title="Exit Visualizer Studio (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.header>

          {/* MAIN BODY: CANVAS PREVIEW + CONTROLS PANEL */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0 p-3 gap-2.5">
          
          {/* LEFT/CENTER: LIVE CANVAS PREVIEW (Flies in dynamically from Left) */}
          <motion.div
            initial={{ x: '-100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '-100%', opacity: 0, scale: 0.95, transition: { duration: 0.34, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="lg:col-span-7 bg-[#0b1018]/85 backdrop-blur-md border border-[#1e2d42] rounded-xl p-3 flex flex-col items-center justify-between shadow-2xl overflow-y-auto"
          >
            
            {/* AUDIO SOURCE & PLAYER BAR */}
            <div className="w-full bg-[#0e1624] border border-[#1e2d42] p-2.5 rounded-xl flex items-center justify-between gap-3 mb-3 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 shrink-0 ${
                  customAudioUrl 
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
                    : 'bg-sky-950/80 border-sky-500/40 text-sky-300'
                }`}>
                  <FileAudio className="w-4 h-4 shrink-0" />
                  <span className="font-mono font-bold text-[10px] tracking-wider uppercase">
                    {customAudioUrl ? 'CUSTOM AUDIO' : 'TRACKER SONG'}
                  </span>
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[240px]">
                    {customAudioUrl ? customAudioName : (song.name || 'Retro Track')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {customAudioUrl ? `${customAudioFile?.size ? (customAudioFile.size / (1024 * 1024)).toFixed(2) : 0} MB MP3/WAV` : `${song.channelsCount || 4} Channels • ${song.bpm || 125} BPM`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {customAudioUrl ? (
                  <>
                    <button
                      onClick={handleClearCustomAudio}
                      className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition cursor-pointer flex items-center gap-1"
                      title="Switch back to Tracker song"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tracker</span>
                    </button>
                    <button
                      onClick={() => customAudioInputRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Import Audio or Track File (MP3, WAV, TRK, SID, MOD)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Import Audio</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => customAudioInputRef.current?.click()}
                    className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Import Audio or Track File (MP3, WAV, TRK, SID, MOD)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Import Audio</span>
                  </button>
                )}

                <input
                  ref={customAudioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.mod,.trk,.sid,.syn,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCustomAudioUpload(file);
                    if (e.target) e.target.value = '';
                  }}
                />
                <audio
                  ref={customAudioRef}
                  src={customAudioUrl || undefined}
                  crossOrigin="anonymous"
                  preload="auto"
                  loop={customAudioLoop}
                  onTimeUpdate={() => {
                    if (customAudioRef.current) {
                      setCustomAudioTime(customAudioRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (customAudioRef.current) {
                      setCustomAudioDuration(customAudioRef.current.duration);
                    }
                  }}
                  onEnded={() => {
                    setIsCustomAudioPlaying(false);
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Aspect Ratio Toolbar */}
            <div className="w-full flex items-center justify-start bg-slate-900/80 border border-slate-800 rounded-xl p-2 mb-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1">
                  <Ratio className="w-3.5 h-3.5" /> Ratio:
                </span>
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    aspectRatio === '16:9'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Landscape (16:9)
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    aspectRatio === '9:16'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Portrait (9:16)
                </button>
                <button
                  onClick={() => setAspectRatio('1:1')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    aspectRatio === '1:1'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" /> Square (1:1)
                </button>
              </div>
            </div>

            {/* CANVAS PREVIEW STAGE - DIRECT & MAXIMIZED WITHOUT NESTED WALLPAPER FRAME */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-[360px] overflow-hidden my-auto p-1">
              <div 
                className="relative shadow-[0_18px_60px_rgba(0,0,0,0.85)] border border-slate-700/80 rounded-xl overflow-hidden bg-black flex items-center justify-center z-10 ring-1 ring-sky-500/20 transition-all duration-300"
                style={{
                  aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '1/1',
                  maxWidth: '100%',
                  maxHeight: aspectRatio === '16:9' ? 'min(720px, calc(100vh - 240px))' : 'min(840px, calc(100vh - 220px))',
                  height: aspectRatio === '16:9' ? 'min(720px, calc(100vh - 240px))' : aspectRatio === '9:16' ? 'min(840px, calc(100vh - 220px))' : 'min(720px, calc(100vh - 220px))',
                  width: 'auto',
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block bg-black"
                />

                {/* OFFLINE MASTER RENDER OVERLAY */}
                {isMasterRendering && (
                  <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg mb-3 relative">
                      <Film className="w-6 h-6 text-sky-400" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-ping" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Exporting Video ({targetFps} FPS HD)</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
                      <p className="text-xs text-sky-300 font-mono">{renderProgress.phase}</p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-full h-3 overflow-hidden p-0.5 mb-2 shadow-inner">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${renderProgress.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-center w-full max-w-md text-[11px] text-slate-400 font-mono mb-3">
                      <span>{renderProgress.percent}% Completed</span>
                    </div>

                    <p className="text-[11px] text-slate-400 max-w-md mb-5 leading-relaxed">
                      Hardware rendering is active with memory backpressure protection. Your video file will download automatically when finished.
                    </p>

                    <button
                      onClick={handleCancelMasterRender}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      Cancel Render
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* VIDEO EXPORT BAR */}
            <div className="w-full mt-3 bg-[#0e1624] border border-[#1e2d42] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-sky-400" /> Video Exporter
                </span>

                {/* Framerate Selection */}
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setTargetFps(60)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      targetFps === 60
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    60 FPS
                  </button>
                  <button
                    onClick={() => setTargetFps(30)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      targetFps === 30
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    30 FPS
                  </button>
                </div>

                {/* Format Selection */}
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setExportFormat('webm')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      exportFormat === 'webm'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    WEBM
                  </button>
                  <button
                    onClick={() => setExportFormat('mp4')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      exportFormat === 'mp4'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    MP4
                  </button>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  <Clock className="w-3 h-3 text-sky-400" />
                  Duration: <span className="text-sky-300 font-bold">{formattedSongDuration}</span>
                </div>
              </div>

              {/* RENDER VIDEO BUTTON */}
              <button
                onClick={handleStartMasterRender}
                disabled={isMasterRendering}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl shadow flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                title="Frame-by-frame offline render for perfect smoothness"
              >
                <Download className="w-4 h-4 text-sky-400" /> Render Video
              </button>
            </div>

          </motion.div>

          {/* RIGHT: CONFIGURATION & PRESET TABS (Flies in dynamically from Right) */}
          <motion.div
            initial={{ x: '100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.95, transition: { duration: 0.34, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="lg:col-span-5 bg-[#0b1018]/85 backdrop-blur-md border border-[#1e2d42] rounded-xl flex flex-col h-full min-h-0 shadow-2xl overflow-hidden"
          >
            
            {/* TAB NAVIGATION HEADER (STICKY PINNED AT TOP) */}
            <div className="p-3.5 pb-2.5 border-b border-[#1e2d42] bg-[#0e1624]/90 shrink-0 z-10">
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('ratio')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    activeTab === 'ratio' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Ratio className="w-3.5 h-3.5" /> Backgrounds
                </button>
                <button
                  onClick={() => setActiveTab('visualizer')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    activeTab === 'visualizer' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Visualizers
                </button>
                <button
                  onClick={() => setActiveTab('juice')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    activeTab === 'juice' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Master FX &amp; Juice
                </button>
                <button
                  onClick={() => setActiveTab('scroller')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    activeTab === 'scroller' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Scroller
                </button>
                <button
                  onClick={() => setActiveTab('branding')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    activeTab === 'branding' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Branding
                </button>
                <button
                  onClick={() => setActiveTab('presets')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    activeTab === 'presets' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" /> Presets ({savedPresets.length})
                </button>
              </div>
            </div>

            {/* SCROLLABLE TAB CONTENTS */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 15, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -15, filter: 'blur(2px)' }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >

            {/* TAB 1: BACKGROUND & STYLE */}
            {activeTab === 'ratio' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 block">Background Layers (Combine Multiple)</label>
                    <span className="text-[10px] text-sky-400 font-mono">Click to toggle on/off</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'grid', label: 'Synth Grid' },
                      { id: 'starfield', label: 'Starfield' },
                      { id: 'neon_tunnel', label: '3D Tunnel' },
                      { id: 'aurora_waves', label: 'Aurora Waves' },
                      { id: 'cyber_city', label: 'Cyber City' },
                      { id: 'orbs', label: 'Glowing Orbs' },
                      { id: 'phyllotaxis', label: 'Phyllotaxis' },
                      { id: 'solid', label: 'Gradient' },
                      { id: 'custom_image', label: 'Custom Image' },
                    ].map((bg) => {
                      const isActive = activeBackgrounds.includes(bg.id as BackgroundType);
                      return (
                        <button
                          key={bg.id}
                          onClick={() => toggleBackground(bg.id as BackgroundType)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center flex items-center justify-center cursor-pointer ${
                            isActive
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm shadow-sky-500/20 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{bg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Background Colors & Gradient Rotation */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-sky-400" /> Canvas Base Gradient Colors
                    </label>
                    <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]">
                      <button
                        onClick={() => setBgGradientType('linear')}
                        className={`px-2 py-0.5 rounded transition cursor-pointer ${bgGradientType === 'linear' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400'}`}
                      >
                        Linear
                      </button>
                      <button
                        onClick={() => setBgGradientType('radial')}
                        className={`px-2 py-0.5 rounded transition cursor-pointer ${bgGradientType === 'radial' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400'}`}
                      >
                        Radial
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Background Color 1</label>
                      <input
                        type="color"
                        value={bgColor1}
                        onChange={(e) => setBgColor1(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Background Color 2</label>
                      <input
                        type="color"
                        value={bgColor2}
                        onChange={(e) => setBgColor2(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                      />
                    </div>
                  </div>

                  {bgGradientType === 'linear' && (
                    <div className="space-y-2 pt-1 border-t border-slate-800/80">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400 flex items-center gap-1">
                            <RotateCw className="w-3 h-3 text-sky-400" /> Gradient Rotation Angle
                          </label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{bgGradientAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={bgGradientAngle}
                          onChange={(e) => setBgGradientAngle(Number(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Quick Angle Presets</label>
                        <div className="grid grid-cols-6 gap-1">
                          {[
                            { angle: 90, label: '⬇ Top-Down' },
                            { angle: 0, label: '➡ L to R' },
                            { angle: 270, label: '⬆ Bottom-Up' },
                            { angle: 180, label: '⬅ R to L' },
                            { angle: 45, label: '↘ Diag TL' },
                            { angle: 135, label: '↙ Diag TR' },
                          ].map((dir) => (
                            <button
                              key={dir.angle}
                              onClick={() => setBgGradientAngle(dir.angle)}
                              className={`py-1 px-0.5 rounded text-[10px] font-medium border text-center transition cursor-pointer truncate ${
                                bgGradientAngle === dir.angle
                                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {dir.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D NEON TUNNEL SPECIFIC CONTROLS */}
                {activeBackgrounds.includes('neon_tunnel') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> 3D Neon Tunnel Parameters
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Tunnel Speed</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{tunnelSpeed}x</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={tunnelSpeed}
                          onChange={(e) => setTunnelSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Polygon Segments</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{tunnelSegments}</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="16"
                          value={tunnelSegments}
                          onChange={(e) => setTunnelSegments(Number(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Tunnel Geometry Shape</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { segs: 3, label: 'Triangle' },
                          { segs: 4, label: 'Square' },
                          { segs: 6, label: 'Hexagon' },
                          { segs: 8, label: 'Octagon' },
                          { segs: 12, label: 'Dodecagon' },
                          { segs: 16, label: 'Circle Ring' },
                        ].map((sh) => (
                          <button
                            key={sh.segs}
                            onClick={() => setTunnelSegments(sh.segs)}
                            className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              tunnelSegments === sh.segs
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sh.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AURORA WAVES SPECIFIC CONTROLS */}
                {activeBackgrounds.includes('aurora_waves') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> Aurora Waves Parameters
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Flow Speed</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{auroraSpeed}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={auroraSpeed}
                          onChange={(e) => setAuroraSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Curtain Density</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{auroraDensity}</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="10"
                          value={auroraDensity}
                          onChange={(e) => setAuroraDensity(Number(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STARFIELD SPECIFIC CONTROLS */}
                {activeBackgrounds.includes('starfield') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> Starfield Effect Configuration
                    </label>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Scroll Direction</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'down', label: 'Scroll Down' },
                          { id: 'up', label: 'Scroll Up' },
                          { id: 'left', label: 'Scroll Left' },
                          { id: 'right', label: 'Scroll Right' },
                          { id: 'forward_3d', label: '3D Warp' },
                          { id: 'vortex', label: 'Vortex Swirl' },
                        ].map((dir) => (
                          <button
                            key={dir.id}
                            onClick={() => setStarDirection(dir.id as StarDirectionType)}
                            className={`py-1 px-1.5 rounded text-[11px] font-medium border text-center transition ${
                              starDirection === dir.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {dir.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Speed ({starSpeed})</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={starSpeed}
                          onChange={(e) => setStarSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Star Count ({starCount})</label>
                        <input
                          type="range"
                          min="30"
                          max="300"
                          step="10"
                          value={starCount}
                          onChange={(e) => setStarCount(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Global Angle Rotation ({starRotation}°)</label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={starRotation}
                        onChange={(e) => setStarRotation(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </div>
                )}

                {/* Glowing Orbs Sub-panel */}
                {activeBackgrounds.includes('orbs') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 block">Glowing Orbs Parameters</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Orb 1 Color</label>
                        <input
                          type="color"
                          value={orbColor1}
                          onChange={(e) => setOrbColor1(e.target.value)}
                          className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Orb 2 Color</label>
                        <input
                          type="color"
                          value={orbColor2}
                          onChange={(e) => setOrbColor2(e.target.value)}
                          className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Orb Radius ({orbSize}px)</label>
                        <input
                          type="range"
                          min="60"
                          max="300"
                          value={orbSize}
                          onChange={(e) => setOrbSize(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Float Speed ({orbSpeed})</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={orbSpeed}
                          onChange={(e) => setOrbSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={orbSoundPulse}
                        onChange={(e) => setOrbSoundPulse(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] text-slate-300 font-semibold">Pulse to Audio Bass</span>
                    </label>
                  </div>
                )}

                {/* Synth Grid Configuration Sub-panel */}
                {activeBackgrounds.includes('grid') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> Synth Grid Configuration
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Grid Line Color</label>
                        <input
                          type="color"
                          value={gridColor}
                          onChange={(e) => setGridColor(e.target.value)}
                          className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Horizon Glow Color</label>
                        <input
                          type="color"
                          value={gridHorizonGlowColor}
                          onChange={(e) => setGridHorizonGlowColor(e.target.value)}
                          className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Horizon ({gridHorizonY}%)</label>
                        <input
                          type="range"
                          min="30"
                          max="80"
                          value={gridHorizonY}
                          onChange={(e) => setGridHorizonY(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Speed ({gridSpeed})</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={gridSpeed}
                          onChange={(e) => setGridSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Density ({gridDensity})</label>
                        <input
                          type="range"
                          min="12"
                          max="48"
                          step="2"
                          value={gridDensity}
                          onChange={(e) => setGridDensity(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={gridBassPulse}
                        onChange={(e) => setGridBassPulse(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] text-slate-300 font-semibold">Pulse Opacity to Audio Bass</span>
                    </label>
                  </div>
                )}

                {/* Phyllotaxis Sub-panel */}
                {activeBackgrounds.includes('phyllotaxis') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> Phyllotaxis Spiral Parameters
                    </label>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Color Palette</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'primary_secondary', label: 'Theme Colors' },
                          { id: 'rainbow', label: 'Rainbow HSL' },
                          { id: 'cyan_pink', label: 'Cyan / Pink' },
                          { id: 'gold', label: 'Gold / Amber' },
                          { id: 'green', label: 'Emerald / Green' },
                          { id: 'fire', label: 'Fire & Flame' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setPhylloColorTheme(theme.id)}
                            className={`py-1 px-1.5 rounded text-[11px] font-medium border text-center transition ${
                              phylloColorTheme === theme.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Scale / Size ({phylloSize}px)</label>
                        <input
                          type="range"
                          min="4"
                          max="36"
                          value={phylloSize}
                          onChange={(e) => setPhylloSize(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Dot Count ({phylloCount})</label>
                        <input
                          type="range"
                          min="40"
                          max="400"
                          step="10"
                          value={phylloCount}
                          onChange={(e) => setPhylloCount(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Position X ({phylloXPercent}%)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={phylloXPercent}
                          onChange={(e) => setPhylloXPercent(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Position Y ({phylloYPercent}%)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={phylloYPercent}
                          onChange={(e) => setPhylloYPercent(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Rot Speed ({phylloRotSpeed})</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          value={phylloRotSpeed}
                          onChange={(e) => setPhylloRotSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={phylloRotate}
                          onChange={(e) => setPhylloRotate(e.target.checked)}
                          className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-slate-300 font-semibold">Enable Rotation</span>
                      </label>

                      <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={phylloSoundPulse}
                          onChange={(e) => setPhylloSoundPulse(e.target.checked)}
                          className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] text-slate-300 font-semibold">Pulse to Audio Bass</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Custom Background Image & Transform Controls */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-sky-400" /> Custom Background Image
                    </label>
                    {bgImageDataUrl && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBgImageFit('cover');
                            setBgImageScale(100);
                            setBgImageXPercent(50);
                            setBgImageYPercent(50);
                            setBgImageOpacity(100);
                            setBgImageBlur(0);
                            onShowToast?.('Image transform reset');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
                          title="Reset scale and position"
                        >
                          <RotateCcw className="w-3 h-3 text-sky-400" /> Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBgImageDataUrl(null);
                            bgImgRef.current = null;
                            setActiveBackgrounds((prev) => prev.filter((b) => b !== 'custom_image'));
                            onShowToast?.('Background image removed');
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer border border-rose-500/30"
                          title="Remove custom image"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" /> Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {!bgImageDataUrl ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBgImageUpload}
                        className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30 cursor-pointer border border-dashed border-slate-700 rounded-lg p-2 bg-slate-950/40"
                      />
                      <p className="text-[10.5px] text-slate-400">
                        Upload any PNG, JPG, or WebP image. Preserves original aspect ratio automatically without distortion.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Thumbnail & File Status */}
                      <div className="flex items-center gap-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                        <div className="w-14 h-10 rounded bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={bgImageDataUrl}
                            alt="Custom Background"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Image Loaded
                            </span>
                            {bgImgRef.current && bgImgRef.current.naturalWidth > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({bgImgRef.current.naturalWidth}×{bgImgRef.current.naturalHeight}px)
                              </span>
                            )}
                          </div>
                          <label className="text-[10.5px] text-sky-400 hover:text-sky-300 cursor-pointer underline decoration-dotted mt-0.5 inline-block">
                            Change Image...
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBgImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Aspect Ratio Fit Mode Selector */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                            <Ratio className="w-3.5 h-3.5 text-sky-400" /> Aspect Ratio &amp; Fit Mode
                          </label>
                          <span className="text-[10px] font-mono text-sky-300 uppercase">
                            {bgImageFit === 'cover' ? 'Cover (No Distortion)' : bgImageFit === 'contain' ? 'Fit Inside (Letterbox)' : bgImageFit === 'original' ? '1:1 Original Size' : 'Stretch Fill'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setBgImageFit('cover')}
                            className={`py-1 rounded font-medium transition cursor-pointer text-center ${
                              bgImageFit === 'cover'
                                ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Fills canvas completely while keeping exact aspect ratio (no distortion)"
                          >
                            Cover
                          </button>
                          <button
                            type="button"
                            onClick={() => setBgImageFit('contain')}
                            className={`py-1 rounded font-medium transition cursor-pointer text-center ${
                              bgImageFit === 'contain'
                                ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Fits entire image inside frame without cropping or distortion"
                          >
                            Contain
                          </button>
                          <button
                            type="button"
                            onClick={() => setBgImageFit('original')}
                            className={`py-1 rounded font-medium transition cursor-pointer text-center ${
                              bgImageFit === 'original'
                                ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="1:1 native pixel dimensions scaled with zoom"
                          >
                            1:1 Native
                          </button>
                          <button
                            type="button"
                            onClick={() => setBgImageFit('stretch')}
                            className={`py-1 rounded font-medium transition cursor-pointer text-center ${
                              bgImageFit === 'stretch'
                                ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Stretch image to exact canvas dimensions"
                          >
                            Stretch
                          </button>
                        </div>
                      </div>

                      {/* Zoom / Scaling Control */}
                      <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                            <ZoomIn className="w-3.5 h-3.5 text-sky-400" /> Zoom &amp; Scale
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setBgImageScale((prev) => Math.max(10, prev - 10))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                              title="Zoom out 10%"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-mono font-bold text-sky-300 w-12 text-center">
                              {bgImageScale}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setBgImageScale((prev) => Math.min(400, prev + 10))}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                              title="Zoom in 10%"
                            >
                              +
                            </button>
                            {bgImageScale !== 100 && (
                              <button
                                type="button"
                                onClick={() => setBgImageScale(100)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-sky-300 transition cursor-pointer ml-1"
                              >
                                100%
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="2"
                          value={bgImageScale}
                          onChange={(e) => setBgImageScale(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>

                      {/* Pan Position X & Y Sliders */}
                      <div className="space-y-2.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                            <Move className="w-3.5 h-3.5 text-sky-400" /> Position &amp; Alignment
                          </label>
                          {(bgImageXPercent !== 50 || bgImageYPercent !== 50) && (
                            <button
                              type="button"
                              onClick={() => {
                                setBgImageXPercent(50);
                                setBgImageYPercent(50);
                              }}
                              className="text-[10px] text-sky-400 hover:text-sky-300 font-mono transition cursor-pointer"
                            >
                              Reset Center (50%, 50%)
                            </button>
                          )}
                        </div>

                        {/* Quick Corner / Alignment Presets */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 block font-medium">Quick Alignment Presets:</span>
                          <div className="grid grid-cols-5 gap-1">
                            <button
                              type="button"
                              onClick={() => { setBgImageXPercent(12); setBgImageYPercent(12); }}
                              className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                                bgImageXPercent <= 20 && bgImageYPercent <= 20
                                  ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                              title="Top-Left (12%, 12%)"
                            >
                              ↖ Top-L
                            </button>
                            <button
                              type="button"
                              onClick={() => { setBgImageXPercent(88); setBgImageYPercent(12); }}
                              className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                                bgImageXPercent >= 80 && bgImageYPercent <= 20
                                  ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                              title="Top-Right (Logo / Watermark) (88%, 12%)"
                            >
                              ↗ Top-R
                            </button>
                            <button
                              type="button"
                              onClick={() => { setBgImageXPercent(50); setBgImageYPercent(50); }}
                              className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                                bgImageXPercent >= 45 && bgImageXPercent <= 55 && bgImageYPercent >= 45 && bgImageYPercent <= 55
                                  ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                              title="Center (50%, 50%)"
                            >
                              ⏺ Center
                            </button>
                            <button
                              type="button"
                              onClick={() => { setBgImageXPercent(12); setBgImageYPercent(88); }}
                              className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                                bgImageXPercent <= 20 && bgImageYPercent >= 80
                                  ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                              title="Bottom-Left (12%, 88%)"
                            >
                              ↙ Bot-L
                            </button>
                            <button
                              type="button"
                              onClick={() => { setBgImageXPercent(88); setBgImageYPercent(88); }}
                              className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                                bgImageXPercent >= 80 && bgImageYPercent >= 80
                                  ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                              title="Bottom-Right (88%, 88%)"
                            >
                              ↘ Bot-R
                            </button>
                          </div>
                        </div>

                        {/* Horizontal X Slider */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-400">Horizontal (X): <span className="text-sky-300 font-mono">{bgImageXPercent}%</span></span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setBgImageXPercent(25)}
                                className="px-1.5 py-0.5 text-[9.5px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                Left
                              </button>
                              <button
                                type="button"
                                onClick={() => setBgImageXPercent(50)}
                                className="px-1.5 py-0.5 text-[9.5px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                Center
                              </button>
                              <button
                                type="button"
                                onClick={() => setBgImageXPercent(75)}
                                className="px-1.5 py-0.5 text-[9.5px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                Right
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-25"
                            max="125"
                            step="1"
                            value={bgImageXPercent}
                            onChange={(e) => setBgImageXPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>

                        {/* Vertical Y Slider */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-[10.5px]">
                            <span className="text-slate-400">Vertical (Y): <span className="text-sky-300 font-mono">{bgImageYPercent}%</span></span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setBgImageYPercent(25)}
                                className="px-1.5 py-0.5 text-[9.5px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                Top
                              </button>
                              <button
                                type="button"
                                onClick={() => setBgImageYPercent(50)}
                                className="px-1.5 py-0.5 text-[9.5px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                Center
                              </button>
                              <button
                                type="button"
                                onClick={() => setBgImageYPercent(75)}
                                className="px-1.5 py-0.5 text-[9.5px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                Bottom
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-25"
                            max="125"
                            step="1"
                            value={bgImageYPercent}
                            onChange={(e) => setBgImageYPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>

                        {/* Auto Safe Area Clamping Toggle */}
                        <div className="pt-1.5 border-t border-slate-800/80">
                          <label className="flex items-start space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={bgImageAutoFitSafe}
                              onChange={(e) => setBgImageAutoFitSafe(e.target.checked)}
                              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5 mt-0.5"
                            />
                            <div>
                              <span className="text-[11px] text-sky-300 font-semibold block">Auto-Safe Aspect Ratio Fitting</span>
                              <span className="text-[10px] text-slate-400 block leading-tight">Automatically keeps the image / logo safely inside the visible screen when switching between 16:9, 9:16, and 1:1.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Opacity, Blur & Audio Pulse */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10.5px] text-slate-400">Opacity ({bgImageOpacity}%)</label>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="100"
                            step="1"
                            value={bgImageOpacity}
                            onChange={(e) => setBgImageOpacity(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10.5px] text-slate-400">Blur ({bgImageBlur}px)</label>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="15"
                            step="1"
                            value={bgImageBlur}
                            onChange={(e) => setBgImageBlur(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={bgImageBassPulse}
                            onChange={(e) => setBgImageBassPulse(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] text-slate-300 font-semibold">Pulse Background Image to Audio Bass</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: VISUALIZER TYPE & FX CUSTOMIZATION */}
            {activeTab === 'visualizer' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 block">Audio-Reactive Visualizers (Combine Multiple)</label>
                    <span className="text-[10px] text-sky-400 font-mono">Click to toggle on/off</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'floating_3d_cubes', label: '3D Cosmic Space Cubes' },
                      { id: 'laser_show', label: 'Laser Concert Show' },
                      { id: 'dancing_cubes', label: '3D Cube EQs' },
                      { id: 'cyber_hud', label: 'Cyber Sci-Fi HUD' },
                      { id: 'liquid_blob', label: 'Liquid Audio Blob' },
                      { id: 'mirror_spectrum', label: 'Mirror Spectrum' },
                      { id: 'spectrum', label: 'Frequency Spectrum' },
                      { id: 'waveform', label: 'Oscilloscope Wave' },
                      { id: 'pulsing', label: 'Pulsing Audio Ring' },
                      { id: 'radial', label: '360° Radial Bars' },
                      { id: 'wave_circle', label: 'Wobbly Wave Circle' },
                      { id: 'vector_ball', label: '3D Vector Sphere' },
                    ].map((vis) => {
                      const isActive = activeVisualizers.includes(vis.id as VisualizerType);
                      return (
                        <button
                          key={vis.id}
                          onClick={() => toggleVisualizer(vis.id as VisualizerType)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center flex items-center justify-center cursor-pointer ${
                            isActive
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm shadow-sky-500/20 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{vis.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary & Secondary Color Pickers */}
                <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Primary Accent</label>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Secondary Accent</label>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full h-8 rounded-lg cursor-pointer bg-slate-800 border border-slate-700"
                    />
                  </div>
                </div>

                {/* 3D FLOATING COSMIC CUBES PARAMETERS */}
                {activeVisualizers.includes('floating_3d_cubes') && (
                  <div className="bg-sky-950/30 p-3.5 rounded-xl border border-sky-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-sky-400" /> 3D Cosmic Space Cubes Configuration
                      </label>
                      <button
                        onClick={() => setFloatingCubesSeed(Math.floor(Math.random() * 99999))}
                        className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-mono font-bold border border-sky-500/40 flex items-center gap-1 transition cursor-pointer"
                        title="Randomize cube positions"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Shuffle 3D
                      </button>
                    </div>

                    {/* Arrangement Presets */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">3D Space Arrangement</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'random', label: 'Cosmic Chaos' },
                          { id: 'orbit_ring', label: '3D Orbit Ring' },
                          { id: 'grid_matrix', label: '3D Matrix Grid' },
                          { id: 'helix_spiral', label: 'Double Helix' },
                          { id: 'cluster', label: 'Center Cluster' },
                        ].map((arr) => (
                          <button
                            key={arr.id}
                            onClick={() => setFloatingCubesArrangement(arr.id as any)}
                            className={`py-1 px-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              floatingCubesArrangement === arr.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {arr.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cube Count & Size */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Cube Count</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{floatingCubesCount}</span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="48"
                          value={floatingCubesCount}
                          onChange={(e) => setFloatingCubesCount(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Cube Size</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{floatingCubesSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="80"
                          value={floatingCubesSize}
                          onChange={(e) => setFloatingCubesSize(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    {/* Group 3D Position Offsets (X, Y, Z) */}
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-sky-300 block">Group 3D Position Offsets (X / Y / Z)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Offset X</span>
                            <span className="font-mono text-sky-400">{floatingCubesOffsetX}%</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={floatingCubesOffsetX}
                            onChange={(e) => setFloatingCubesOffsetX(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Offset Y</span>
                            <span className="font-mono text-sky-400">{floatingCubesOffsetY}%</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={floatingCubesOffsetY}
                            onChange={(e) => setFloatingCubesOffsetY(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Depth Z</span>
                            <span className="font-mono text-sky-400">{floatingCubesOffsetZ}%</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={floatingCubesOffsetZ}
                            onChange={(e) => setFloatingCubesOffsetZ(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3D Spread (X, Y, Z) */}
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-sky-300 block">3D Spread Radius (X / Y / Z)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Spread X</span>
                            <span className="font-mono text-sky-400">{floatingCubesSpreadX}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="150"
                            value={floatingCubesSpreadX}
                            onChange={(e) => setFloatingCubesSpreadX(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Spread Y</span>
                            <span className="font-mono text-sky-400">{floatingCubesSpreadY}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="150"
                            value={floatingCubesSpreadY}
                            onChange={(e) => setFloatingCubesSpreadY(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Spread Z</span>
                            <span className="font-mono text-sky-400">{floatingCubesSpreadZ}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="150"
                            value={floatingCubesSpreadZ}
                            onChange={(e) => setFloatingCubesSpreadZ(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3D Rotation Speeds */}
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-sky-300 block">3D Axis Rotation Speeds (X / Y / Z)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Rot X</span>
                            <span className="font-mono text-sky-400">{floatingCubesRotSpeedX}</span>
                          </div>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            value={floatingCubesRotSpeedX}
                            onChange={(e) => setFloatingCubesRotSpeedX(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Rot Y</span>
                            <span className="font-mono text-sky-400">{floatingCubesRotSpeedY}</span>
                          </div>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            value={floatingCubesRotSpeedY}
                            onChange={(e) => setFloatingCubesRotSpeedY(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Rot Z</span>
                            <span className="font-mono text-sky-400">{floatingCubesRotSpeedZ}</span>
                          </div>
                          <input
                            type="range"
                            min="-10"
                            max="10"
                            value={floatingCubesRotSpeedZ}
                            onChange={(e) => setFloatingCubesRotSpeedZ(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Render Style */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Render Style &amp; Shader</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'shaded_glass', label: 'Shaded 3D Glass' },
                          { id: 'wireframe', label: 'Cyber Wireframe' },
                          { id: 'solid_neon', label: 'Solid Metallic Neon' },
                          { id: 'dots_vertices', label: '3D Point Vertices' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setFloatingCubesStyle(st.id as any)}
                            className={`py-1 px-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              floatingCubesStyle === st.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={floatingCubesAudioReactive}
                        onChange={(e) => setFloatingCubesAudioReactive(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] text-slate-300 font-semibold">Audio Reactive Pulse &amp; Beat Spin</span>
                    </label>
                  </div>
                )}

                {/* LASER CONCERT SHOW PARAMETERS */}
                {activeVisualizers.includes('laser_show') && (
                  <div className="bg-sky-950/30 p-3.5 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-sky-400" /> Laser Concert Show Parameters
                    </label>

                    {/* Origin Emitters */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Laser Origin Emitters</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'top_center', label: 'Top Rig' },
                          { id: 'bottom_center', label: 'Stage Bottom' },
                          { id: 'center_burst', label: 'Center Burst' },
                          { id: 'dual_corners', label: 'Dual DJ Corner' },
                          { id: 'oscillating', label: 'Oscillating Head' },
                        ].map((orig) => (
                          <button
                            key={orig.id}
                            onClick={() => setLaserOrigin(orig.id as any)}
                            className={`py-1 px-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              laserOrigin === orig.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {orig.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Concert Patterns */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Concert Laser Pattern</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'fan_sweep', label: 'Fan Sweep' },
                          { id: 'cross_fire', label: 'Cross Fire X' },
                          { id: 'tunnel_vortex', label: 'Vortex 360°' },
                          { id: 'chaotic_disco', label: 'Chaotic Disco' },
                          { id: 'strobe_pulse', label: 'Strobe Beat' },
                        ].map((pat) => (
                          <button
                            key={pat.id}
                            onClick={() => setLaserPattern(pat.id as any)}
                            className={`py-1 px-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              laserPattern === pat.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {pat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Beams Count & Speed */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Beam Count</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{laserCount}</span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="32"
                          value={laserCount}
                          onChange={(e) => setLaserCount(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Sweep Speed</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{laserSpeed}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={laserSpeed}
                          onChange={(e) => setLaserSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    {/* Beam Width & Spread Aperture */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Beam Width</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{laserBeamWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="14"
                          value={laserBeamWidth}
                          onChange={(e) => setLaserBeamWidth(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Fan Spread</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{laserSpread}°</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="180"
                          value={laserSpread}
                          onChange={(e) => setLaserSpread(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    {/* Sound Reactivity Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-slate-400">Audio Beat Reactivity</label>
                        <span className="text-[11px] font-mono text-sky-400 font-bold">{laserSoundSens}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={laserSoundSens}
                        onChange={(e) => setLaserSoundSens(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    {/* Laser Color Palettes */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Laser Color Theme</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'cyan_pink', label: 'Neon Dual' },
                          { id: 'rainbow', label: 'Rainbow' },
                          { id: 'emerald', label: 'Emerald' },
                          { id: 'amber', label: 'Amber' },
                          { id: 'cyber_violet', label: 'Violet' },
                          { id: 'ice_blue', label: 'Ice Blue' },
                          { id: 'ruby_red', label: 'Ruby Red' },
                          { id: 'gold', label: 'Gold' },
                        ].map((th) => (
                          <button
                            key={th.id}
                            onClick={() => setLaserColorTheme(th.id as any)}
                            className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              laserColorTheme === th.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {th.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={laserCenterGlow}
                        onChange={(e) => setLaserCenterGlow(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] text-slate-300 font-semibold">Glow Emitter Core Spotlight</span>
                    </label>
                  </div>
                )}

                {/* 3D CUBE EQS PARAMETERS */}
                {(activeVisualizers.includes('dancing_cubes') || activeVisualizers.includes('3d_cube_eqs')) && (
                  <div className="bg-sky-950/30 p-3.5 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-sky-400" /> 3D Cube EQs (Isometric Pillars)
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Pillar Count</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{cubesCount}</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="48"
                          value={cubesCount}
                          onChange={(e) => setCubesCount(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Height Scale</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{cubeEqHeightScale}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="150"
                          value={cubeEqHeightScale}
                          onChange={(e) => setCubeEqHeightScale(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Isometric Slant</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{cubeEqIsometricAngle}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={cubeEqIsometricAngle}
                          onChange={(e) => setCubeEqIsometricAngle(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Pillar Gap</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{cubeEqGap}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          value={cubeEqGap}
                          onChange={(e) => setCubeEqGap(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Position X</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{cubeEqPositionX}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={cubeEqPositionX}
                          onChange={(e) => setCubeEqPositionX(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Position Y</label>
                          <span className="text-[11px] font-mono text-sky-400 font-bold">{cubeEqPositionY}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="90"
                          value={cubeEqPositionY}
                          onChange={(e) => setCubeEqPositionY(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Color Palette</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'primary_secondary', label: 'Theme' },
                          { id: 'rainbow', label: 'Rainbow' },
                          { id: 'cyan_pink', label: 'Neon Dual' },
                          { id: 'matrix', label: 'Matrix' },
                        ].map((th) => (
                          <button
                            key={th.id}
                            onClick={() => setCubeEqColorStyle(th.id as any)}
                            className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                              cubeEqColorStyle === th.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {th.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 360 RADIAL BARS PARAMETERS */}
                {activeVisualizers.includes('radial') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> 360° Radial Bars Parameters
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Inner Radius ({radialRadius}%)</label>
                        <input
                          type="range"
                          min="5"
                          max="45"
                          value={radialRadius}
                          onChange={(e) => setRadialRadius(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Max Bar Height ({radialBarHeight})</label>
                        <input
                          type="range"
                          min="20"
                          max="200"
                          value={radialBarHeight}
                          onChange={(e) => setRadialBarHeight(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Position X ({radialXPercent}%)</label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={radialXPercent}
                          onChange={(e) => setRadialXPercent(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Position Y ({radialYPercent}%)</label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={radialYPercent}
                          onChange={(e) => setRadialYPercent(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Arc Coverage ({radialArcAngle}°)</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { angle: 360, label: '360° Full Circle' },
                          { angle: 270, label: '270° Crown' },
                          { angle: 180, label: '180° Half Arc' },
                        ].map((item) => (
                          <button
                            key={item.angle}
                            onClick={() => setRadialArcAngle(item.angle)}
                            className={`py-1 px-1 rounded text-[11px] border font-medium transition ${
                              radialArcAngle === item.angle
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={radialMirror}
                        onChange={(e) => setRadialMirror(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] text-slate-300 font-semibold">Symmetric Frequency Mirroring</span>
                    </label>
                  </div>
                )}

                {/* 3D VECTOR SPHERE PARAMETERS */}
                {(activeVisualizers.includes('vector_ball') || activeVisualizers.includes('poly_sphere')) && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" /> 3D Vector Sphere Parameters
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Base Size ({sphereRadius}%)</label>
                        <input
                          type="range"
                          min="8"
                          max="40"
                          value={sphereRadius}
                          onChange={(e) => setSphereRadius(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Sound Reactivity ({sphereSoundSens}%)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sphereSoundSens}
                          onChange={(e) => setSphereSoundSens(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Ring Count ({sphereRings})</label>
                        <input
                          type="range"
                          min="4"
                          max="24"
                          value={sphereRings}
                          onChange={(e) => setSphereRings(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">3D Rotation Speed ({sphereRotSpeed})</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={sphereRotSpeed}
                          onChange={(e) => setSphereRotSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Position X ({sphereXPercent}%)</label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={sphereXPercent}
                          onChange={(e) => setSphereXPercent(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Position Y ({sphereYPercent}%)</label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={sphereYPercent}
                          onChange={(e) => setSphereYPercent(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Render Style</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'wireframe', label: '3D Wireframe Rings' },
                          { id: 'dots', label: '3D Dot Lattice' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setSphereStyle(st.id as any)}
                            className={`py-1 px-1 rounded text-[11px] border font-medium transition ${
                              sphereStyle === st.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MATRIX RAIN PARAMETERS */}
                {activeEffects.includes('matrix') && (
                  <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30 space-y-3">
                    <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Matrix Digital Rain Parameters
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Fall Speed ({matrixSpeed})</label>
                        <input
                          type="range"
                          min="1"
                          max="12"
                          value={matrixSpeed}
                          onChange={(e) => setMatrixSpeed(Number(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Column Density ({matrixDensity})</label>
                        <input
                          type="range"
                          min="12"
                          max="60"
                          value={matrixDensity}
                          onChange={(e) => setMatrixDensity(Number(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Font Size ({matrixFontSize}px)</label>
                      <input
                        type="range"
                        min="9"
                        max="22"
                        value={matrixFontSize}
                        onChange={(e) => setMatrixFontSize(Number(e.target.value))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Color Palette Theme</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'green', label: 'Matrix' },
                          { id: 'cyan', label: 'Cyber' },
                          { id: 'red', label: 'Red' },
                          { id: 'gold', label: 'Gold' },
                        ].map((th) => (
                          <button
                            key={th.id}
                            onClick={() => setMatrixColorTheme(th.id as any)}
                            className={`py-1 px-1 rounded text-[11px] border font-medium transition ${
                              matrixColorTheme === th.id
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {th.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MASTER FX & JUICE */}
            {activeTab === 'juice' && (
              <div className="space-y-4">
                {/* MASTER REACTIVITY & AUDIO JUICE */}
                <div className="bg-sky-950/20 p-3.5 rounded-xl border border-sky-500/30 space-y-3">
                  <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Master Audio Reactivity &amp; Camera Juice
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-slate-300 font-semibold">Audio Gain Multiplier</label>
                        <span className="text-[11px] font-mono text-sky-400 font-bold">{audioGain.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={audioGain}
                        onChange={(e) => setAudioGain(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-slate-300 font-semibold">Camera Bass Shake</label>
                        <span className="text-[11px] font-mono text-sky-400 font-bold">{bassShake}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={bassShake}
                        onChange={(e) => setBassShake(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] text-slate-300 font-semibold">RGB Color Cycle Speed</label>
                      <span className="text-[11px] font-mono text-sky-400 font-bold">{colorCycleSpeed > 0 ? `${colorCycleSpeed}x` : 'OFF'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={colorCycleSpeed}
                      onChange={(e) => setColorCycleSpeed(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* OPTICAL & POST-PROCESSING FX */}
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" /> Optics &amp; Post-Processing Shader FX
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-slate-400">Neon Bloom Glow</label>
                        <span className="text-[11px] font-mono text-sky-400 font-bold">{bloomGlow}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={bloomGlow}
                        onChange={(e) => setBloomGlow(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-slate-400">Chromatic Aberration</label>
                        <span className="text-[11px] font-mono text-sky-400 font-bold">{chromaticAberration}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={chromaticAberration}
                        onChange={(e) => setChromaticAberration(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition">
                      <input
                        type="checkbox"
                        checked={scanlines}
                        onChange={(e) => setScanlines(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>CRT Scanlines</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition">
                      <input
                        type="checkbox"
                        checked={vignette}
                        onChange={(e) => setVignette(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Cinematic Vignette</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition">
                      <input
                        type="checkbox"
                        checked={crtGlitch}
                        onChange={(e) => setCrtGlitch(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>CRT Glitch Jitter</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition">
                      <input
                        type="checkbox"
                        checked={kaleidoscope}
                        onChange={(e) => setKaleidoscope(e.target.checked)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Kaleidoscope FX</span>
                    </label>
                  </div>

                  {kaleidoscope && (
                    <div className="bg-sky-950/30 p-2.5 rounded-lg border border-sky-500/30">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-sky-300 font-semibold">Kaleidoscope Segments</label>
                        <span className="text-[11px] font-mono text-sky-400 font-bold">{kaleidoscopeSegments}</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="16"
                        step="2"
                        value={kaleidoscopeSegments}
                        onChange={(e) => setKaleidoscopeSegments(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* RETRO & JUICE FX OVERLAYS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Retro &amp; Particle Layers (Multi-Layer)</label>
                    <span className="text-[10px] text-sky-400 font-mono">Toggle to activate</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sparkles_emitter', label: 'Bass Sparkles' },
                      { id: 'copperbars', label: 'Copperbars' },
                      { id: 'matrix', label: 'Matrix Rain' },
                      { id: 'plasma', label: 'Plasma Warp' },
                      { id: 'audio_fire', label: 'Fire Inferno' },
                    ].map((fx) => {
                      const isActive = activeEffects.includes(fx.id as EffectType);
                      return (
                        <button
                          key={fx.id}
                          onClick={() => toggleEffect(fx.id as EffectType)}
                          className={`p-2 rounded-lg border text-xs font-medium transition text-center flex items-center justify-center cursor-pointer ${
                            isActive
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-sm shadow-sky-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <span>{fx.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COPPERBARS CUSTOMIZATION */}
                {activeEffects.includes('copperbars') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 block">Amiga Copperbars Parameters</label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Bar Count ({copperBarCount})</label>
                        <input
                          type="range"
                          min="3"
                          max="20"
                          value={copperBarCount}
                          onChange={(e) => setCopperBarCount(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Bar Height ({copperBarHeight}px)</label>
                        <input
                          type="range"
                          min="2"
                          max="24"
                          value={copperBarHeight}
                          onChange={(e) => setCopperBarHeight(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Movement Speed ({copperBarSpeed})</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={copperBarSpeed}
                          onChange={(e) => setCopperBarSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Tilt Angle ({copperBarAngle}°)</label>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          value={copperBarAngle}
                          onChange={(e) => setCopperBarAngle(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Vertical Y Position ({copperBarYPos}%)</label>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={copperBarYPos}
                        onChange={(e) => setCopperBarYPos(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Color Palette Theme</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'rainbow', label: 'Rainbow' },
                          { id: 'cyan_pink', label: 'Cyan / Pink' },
                          { id: 'fire', label: 'Inferno Fire' },
                          { id: 'gold', label: 'Retro Gold' },
                          { id: 'matrix', label: 'Cyber Green' },
                        ].map((th) => (
                          <button
                            key={th.id}
                            onClick={() => setCopperColorTheme(th.id as CopperThemeType)}
                            className={`py-1 px-1.5 rounded text-[11px] border font-medium transition ${
                              copperColorTheme === th.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {th.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MATRIX RAIN CUSTOMIZATION */}
                {activeEffects.includes('matrix') && (
                  <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-3">
                    <label className="text-xs font-bold text-sky-300 block">Matrix Digital Rain Parameters</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Rain Speed ({matrixSpeed})</label>
                        <input
                          type="range"
                          min="1"
                          max="12"
                          value={matrixSpeed}
                          onChange={(e) => setMatrixSpeed(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Rain Density ({matrixDensity})</label>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={matrixDensity}
                          onChange={(e) => setMatrixDensity(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DEMOSCENE SCROLLER (LAUFSCHRIFT) */}
            {activeTab === 'scroller' && (
              <div className="space-y-4">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sky-400" /> Retro Scroller Laufschrift
                    </label>
                    <input
                      type="checkbox"
                      checked={showScrollerText}
                      onChange={(e) => setShowScrollerText(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {showScrollerText && (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Custom Scroller Text</label>
                        <textarea
                          rows={2}
                          value={scrollerText}
                          onChange={(e) => setScrollerText(e.target.value)}
                          placeholder="Type custom demoscene greets & credits..."
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-sky-200 font-mono focus:outline-none focus:border-sky-500 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Scroll Speed ({scrollerSpeed})</label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={scrollerSpeed}
                            onChange={(e) => setScrollerSpeed(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Font Size ({scrollerFontSize}px)</label>
                          <input
                            type="range"
                            min="14"
                            max="48"
                            value={scrollerFontSize}
                            onChange={(e) => setScrollerFontSize(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Vertical Y Position ({scrollerYPos}%)</label>
                        <input
                          type="range"
                          min="10"
                          max="95"
                          value={scrollerYPos}
                          onChange={(e) => setScrollerYPos(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>

                      {/* MOTION MODES SELECTOR */}
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Motion &amp; Bounce Mode</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'linear', label: 'Classic Smooth' },
                            { id: 'sine', label: 'Sine Wave' },
                            { id: 'bounce', label: 'Chiptune Bounce (Hüpfen)' },
                            { id: 'zigzag', label: 'Zigzag Sawtooth' },
                            { id: 'wobble', label: 'Organic Wobble' },
                            { id: 'spiral_3d', label: '3D Spiral Vortex' },
                            { id: 'glitch_hop', label: 'Glitch Rhythm Hop' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setScrollerMotionMode(m.id as any);
                                setScrollerSineBounce(m.id !== 'linear');
                              }}
                              className={`py-1.5 px-1.5 rounded text-[11px] font-medium border text-center transition cursor-pointer ${
                                scrollerMotionMode === m.id
                                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Amplitude & Frequency Sliders */}
                      {scrollerMotionMode !== 'linear' && (
                        <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-sky-950/20 border border-sky-500/20">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[11px] text-slate-300">Bounce Height</label>
                              <span className="text-[11px] font-mono text-sky-400 font-bold">{scrollerAmplitude}px</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="60"
                              value={scrollerAmplitude}
                              onChange={(e) => setScrollerAmplitude(Number(e.target.value))}
                              className="w-full accent-sky-500"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[11px] text-slate-300">Wave Density</label>
                              <span className="text-[11px] font-mono text-sky-400 font-bold">{scrollerFrequency}</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={scrollerFrequency}
                              onChange={(e) => setScrollerFrequency(Number(e.target.value))}
                              className="w-full accent-sky-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Neon Glow & Backdrop */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] text-slate-400">Neon Text Glow</label>
                            <span className="text-[11px] font-mono text-sky-400 font-bold">{scrollerGlow}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            value={scrollerGlow}
                            onChange={(e) => setScrollerGlow(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div className="flex items-center pt-4">
                          <label className="flex items-center space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={scrollerBackdrop}
                              onChange={(e) => setScrollerBackdrop(e.target.checked)}
                              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5"
                            />
                            <span className="text-[11px] text-slate-300 font-semibold">Tinted Backdrop Ribbon</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Text Color Palette</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'rainbow', label: 'Rainbow' },
                            { id: 'cyan_pink', label: 'Neon Dual' },
                            { id: 'matrix', label: 'Cyber Green' },
                            { id: 'gold', label: 'Chiptune Gold' },
                            { id: 'primary', label: 'Accent Color' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              onClick={() => setScrollerColorStyle(st.id as ScrollerColorType)}
                              className={`py-1 px-1.5 rounded text-[11px] border font-medium transition ${
                                scrollerColorStyle === st.id
                                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: BRANDING & OBJECT POSITIONS */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                {/* Song Title & Artist Overlay */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sky-400" /> Song &amp; Artist Typography
                    </label>
                    <input
                      type="checkbox"
                      checked={showTextOverlay}
                      onChange={(e) => setShowTextOverlay(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {showTextOverlay && (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Song Title</label>
                        <input
                          type="text"
                          value={songTitle}
                          onChange={(e) => setSongTitle(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Artist Name / Channel</label>
                        <input
                          type="text"
                          value={artistName}
                          onChange={(e) => setArtistName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Position X ({textXPercent}%)</label>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={textXPercent}
                            onChange={(e) => setTextXPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Position Y ({textYPercent}%)</label>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={textYPercent}
                            onChange={(e) => setTextYPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Font Size ({textSize}px)</label>
                        <input
                          type="range"
                          min="16"
                          max="48"
                          value={textSize}
                          onChange={(e) => setTextSize(Number(e.target.value))}
                          className="w-full accent-sky-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Custom Watermark Logo Upload */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 block">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Channel Watermark Logo
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30 cursor-pointer"
                  />

                  {logoDataUrl && (
                    <>
                      {/* Quick Corner / Alignment Presets */}
                      <div className="space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-medium">Quick Alignment Presets:</span>
                        <div className="grid grid-cols-5 gap-1">
                          <button
                            type="button"
                            onClick={() => { setLogoXPercent(12); setLogoYPercent(12); }}
                            className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                              logoXPercent <= 20 && logoYPercent <= 20
                                ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                            title="Top-Left (12%, 12%)"
                          >
                            ↖ Top-L
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLogoXPercent(88); setLogoYPercent(12); }}
                            className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                              logoXPercent >= 80 && logoYPercent <= 20
                                ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                            title="Top-Right (Logo / Watermark) (88%, 12%)"
                          >
                            ↗ Top-R
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLogoXPercent(50); setLogoYPercent(50); }}
                            className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                              logoXPercent >= 45 && logoXPercent <= 55 && logoYPercent >= 45 && logoYPercent <= 55
                                ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                            title="Center (50%, 50%)"
                          >
                            ⏺ Center
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLogoXPercent(12); setLogoYPercent(88); }}
                            className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                              logoXPercent <= 20 && logoYPercent >= 80
                                ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                            title="Bottom-Left (12%, 88%)"
                          >
                            ↙ Bot-L
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLogoXPercent(88); setLogoYPercent(88); }}
                            className={`px-1.5 py-1 text-[9.5px] rounded border transition font-medium text-center ${
                              logoXPercent >= 80 && logoYPercent >= 80
                                ? 'bg-sky-500/25 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                            title="Bottom-Right (88%, 88%)"
                          >
                            ↘ Bot-R
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Logo Position X ({logoXPercent}%)</label>
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={logoXPercent}
                            onChange={(e) => setLogoXPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Logo Position Y ({logoYPercent}%)</label>
                          <input
                            type="range"
                            min="5"
                            max="95"
                            value={logoYPercent}
                            onChange={(e) => setLogoYPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Scale ({logoScale}%)</label>
                          <input
                            type="range"
                            min="20"
                            max="200"
                            value={logoScale}
                            onChange={(e) => setLogoScale(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Opacity ({logoOpacity}%)</label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={logoOpacity}
                            onChange={(e) => setLogoOpacity(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <label className="flex items-center space-x-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={logoBassPulse}
                            onChange={(e) => setLogoBassPulse(e.target.checked)}
                            className="rounded border-slate-700 text-sky-500 focus:ring-0"
                          />
                          <span>Bass Pulse Animation</span>
                        </label>

                        <label className="flex items-start space-x-2 text-slate-300 hover:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={logoAutoFitSafe}
                            onChange={(e) => setLogoAutoFitSafe(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5 mt-0.5"
                          />
                          <div>
                            <span className="text-[11px] text-sky-300 font-semibold block">Auto-Safe Aspect Ratio Fitting</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">Automatically keeps the logo safely inside the visible screen without clipping when switching aspect ratios.</span>
                          </div>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                {/* Duration Timer Overlay Options */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" /> Song/Video Duration Timer
                    </label>
                    <input
                      type="checkbox"
                      checked={showTimerOverlay}
                      onChange={(e) => setShowTimerOverlay(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {showTimerOverlay && (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Display Format</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'elapsed_total', label: '00:00 / 03:45' },
                            { id: 'elapsed_only', label: '00:00 (Elapsed)' },
                            { id: 'countdown', label: '-03:45 (Remaining)' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              onClick={() => setTimerStyle(st.id as 'elapsed_total' | 'elapsed_only' | 'countdown')}
                              className={`py-1 px-1.5 rounded text-[11px] border font-medium transition ${
                                timerStyle === st.id
                                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Position X ({timerXPercent}%)</label>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={timerXPercent}
                            onChange={(e) => setTimerXPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Position Y ({timerYPercent}%)</label>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={timerYPercent}
                            onChange={(e) => setTimerYPercent(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Font Size ({timerSize}px)</label>
                          <input
                            type="range"
                            min="12"
                            max="36"
                            value={timerSize}
                            onChange={(e) => setTimerSize(Number(e.target.value))}
                            className="w-full accent-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Color Style</label>
                          <select
                            value={timerColorStyle}
                            onChange={(e) => setTimerColorStyle(e.target.value as any)}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                          >
                            <option value="cyan">Cyan Glow</option>
                            <option value="primary">Primary Accent</option>
                            <option value="amber">Chiptune Amber</option>
                            <option value="green">Cyber Green</option>
                            <option value="white">Pure White</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: LOCALSTORAGE PRESET SAVER */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                {/* Save Current as New Preset */}
                <div className="bg-sky-950/30 p-3 rounded-xl border border-sky-500/30 space-y-2">
                  <label className="text-xs font-bold text-sky-300 block">Save Current Setup as Preset</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. My Shorts Brand 9:16"
                      value={presetNameInput}
                      onChange={(e) => setPresetNameInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={handleSavePreset}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>

                {/* Preset List */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Your Saved Brand Presets</label>
                  {savedPresets.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                      No saved presets in LocalStorage yet. Configure your style and click Save!
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {savedPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                            selectedPresetId === preset.id
                              ? 'bg-sky-500/20 border-sky-500 text-white'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0 mr-2" onClick={() => handleLoadPreset(preset)}>
                            <div className="font-bold text-xs truncate cursor-pointer">{preset.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ratio: {preset.aspectRatio} • {preset.background} • {preset.visualizer}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleLoadPreset(preset)}
                              className="p-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg transition text-[10px] font-bold cursor-pointer"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

        </div>

      </motion.div>
  );
};
