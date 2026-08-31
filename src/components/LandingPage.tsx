/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Disc, 
  Film, 
  Sliders, 
  Scissors, 
  MonitorPlay, 
  Sparkles, 
  Upload, 
  Play, 
  Pause,
  ArrowRight, 
  Radio, 
  Layers,
  ChevronLeft,
  ChevronRight,
  Coffee,
  ExternalLink,
  Copy,
  Check,
  QrCode
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onOpenVisualizer?: () => void;
  onLoadDemo?: () => void;
  onSelectChipKit?: (formatOrKitId: string) => void;
  onStartTutorial?: () => void;
  onOpenSupport?: () => void;
}

interface SoundSystem {
  id: string;
  name: string;
  chip: string;
  channels: string;
  description: string;
  imageSrc: string;
}

interface SynthSlide {
  id: string;
  chipId: string;
  name: string;
  badge: string;
  tag: string;
  chipIcon: string;
  imgSrc: string;
  description: string;
  specs: string[];
}

const SYNTH_SLIDES: SynthSlide[] = [
  {
    id: 'c64',
    chipId: 'c64',
    name: 'C64 MOS SID Synthesizer',
    badge: 'Commodore 64',
    tag: 'MOS 6581 / 8580 SID',
    chipIcon: '/C64.png',
    imgSrc: '/SID-Synth.png',
    description: 'Analog PWM pulse width modulation, resonant multimode filter with Lowpass, Bandpass & Highpass curves, ring modulation & ultra-fast arpeggio speeds.',
    specs: ['3 Analog SID Voices', 'Resonant Filter (LP/BP/HP)', 'Hard Sync & Ring Mod', 'Ultra-fast Speed 1-3 Arps'],
  },
  {
    id: 'amiga',
    chipId: 'amiga',
    name: 'Amiga Floppy Disk Sample Vault',
    badge: 'Commodore Amiga',
    tag: 'ST-01..ST-115 Vault',
    chipIcon: '/Icon_A500.png',
    imgSrc: '/ST-Disks.png',
    description: 'Explore 115 original ST floppy disks with 10,547+ authentic 8-bit sample instruments directly in your browser with 4.4 kHz lowpass filter, signature Amiga LED audio curve and direct tracker audition.',
    specs: ['115 ST Disks (10,547+ Samples)', '4.4 kHz Hardware Filter', 'Authentic 8-Bit Amiga Tone', 'Quick-Load Disk Browser'],
  },
  {
    id: 'gameboy',
    chipId: 'gameboy',
    name: 'Game Boy DMG Sound Engine',
    badge: 'Nintendo Game Boy',
    tag: 'Sharp LR35902 DMG',
    chipIcon: '/GB.png',
    imgSrc: '/GB-Synth.png',
    description: 'Custom 4-bit Wave RAM wavetables with interactive editor, hardware pitch sweep & 7/15-bit LFSR pseudo-random noise generators.',
    specs: ['4-Bit Wave RAM Synth', 'Hardware Pitch Sweeps', '7 & 15-bit LFSR Noise', 'Stereo Panning Matrix'],
  },
  {
    id: 'megadrive',
    chipId: 'megadrive',
    name: 'Genesis YM2612 FM Synthesizer',
    badge: 'Sega Mega Drive',
    tag: 'Yamaha YM2612 + PSG',
    chipIcon: '/Megadrive.png',
    imgSrc: '/MegaDrive-Synth.png',
    description: '4-operator FM synthesis, 8 routing algorithms, operator feedback, frequency multipliers & signature crunchy Genesis DAC tone.',
    specs: ['4-Operator FM Engine', '8 Routing Algorithms', 'Feedback & Multipliers', 'Crisp 9-Bit DAC Tone'],
  },
  {
    id: 'nes',
    chipId: 'nes',
    name: 'NES Ricoh 2A03 APU',
    badge: 'Nintendo NES',
    tag: 'Ricoh 2A03 APU',
    chipIcon: '/NES.png',
    imgSrc: '/NES-Synth.png',
    description: 'Raw hardware pulse duty cycles, un-interpolated stepped triangle bass waves & DPCM delta-modulation sample channel.',
    specs: ['Dual Duty-Cycle Pulses', 'Stepped Triangle Bass', 'DPCM Sample Playback', 'NES Pitch Envelopes'],
  },
];

const SOUND_SYSTEMS: SoundSystem[] = [
  {
    id: 'c64',
    name: 'Commodore 64',
    chip: 'MOS 6581 / 8580 SID',
    channels: '3 Voices',
    description: 'Pulse Width Modulation (PWM), resonant analog multimode filter, ring modulation, and fast arpeggios.',
    imageSrc: '/C64.png',
  },
  {
    id: 'amiga',
    name: 'Commodore Amiga',
    chip: 'MOS 8364 Paula',
    channels: '4 / 8 Channels',
    description: 'Authentic 8-bit DMA sound, 4.4 kHz lowpass filter with switchable LED curve, and the complete ST-01..ST-115 disk library (10,547+ instruments).',
    imageSrc: '/Icon_A500.png',
  },
  {
    id: 'gameboy',
    name: 'Nintendo Game Boy',
    chip: 'Sharp LR35902 DMG',
    channels: '4 Channels',
    description: 'Dual pulse generators with sweep, 4-bit Wave RAM wavetable synth, and 7/15-bit LFSR pseudo-random noise.',
    imageSrc: '/GB.png',
  },
  {
    id: 'megadrive',
    name: 'Sega Mega Drive',
    chip: 'Yamaha YM2612 + PSG',
    channels: '4 FM / PSG',
    description: '4-operator FM synthesis, 8 routing algorithms, feedback modulation, and signature gritty Genesis DAC punch.',
    imageSrc: '/Megadrive.png',
  },
  {
    id: 'nes',
    name: 'Nintendo NES',
    chip: 'Ricoh 2A03',
    channels: '4 Channels',
    description: 'Raw hardware pulse channels, non-interpolated stepped triangle bass, and DPCM delta-modulation audio.',
    imageSrc: '/NES.png',
  },
  {
    id: 'trk',
    name: 'SYN-Tracker Extended',
    chip: 'Multi-Engine Polyphonic',
    channels: '16 Tracks',
    description: 'Complete tracker arrangement suite with 16 tracks, 31 instrument slots, master DSP racks, and stereo bus.',
    imageSrc: '/Icon_TRK.png',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onOpenVisualizer,
  onLoadDemo,
  onSelectChipKit,
  onStartTutorial,
  onOpenSupport,
}) => {
  const [activeTab, setActiveTab] = useState<'tracker' | 'chips' | 'dsp' | 'visualizer' | 'shortcuts'>('tracker');
  // Synthesizers Showcase Slideshow State
  const [currentSynthIndex, setCurrentSynthIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const bmcUrl = 'https://buymeacoffee.com/hj_wuethrich';
  const paypalUrl = 'https://paypal.me/HansjuergWuethrich';
  const supportRef = useRef<HTMLDivElement>(null);

  const scrollToSupport = () => {
    if (supportRef.current) {
      supportRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (onOpenSupport) {
      onOpenSupport();
    }
  };

  const handleCopyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoPlaying || isHovered) return;
    const interval = setInterval(() => {
      setSlideDirection('right');
      setCurrentSynthIndex((prev) => (prev + 1) % SYNTH_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isHovered]);

  const activeSlide = SYNTH_SLIDES[currentSynthIndex];

  const handlePrevSlide = () => {
    setSlideDirection('left');
    setCurrentSynthIndex((prev) => (prev - 1 + SYNTH_SLIDES.length) % SYNTH_SLIDES.length);
  };

  const handleNextSlide = () => {
    setSlideDirection('right');
    setCurrentSynthIndex((prev) => (prev + 1) % SYNTH_SLIDES.length);
  };

  const handleSelectSlide = (index: number) => {
    setSlideDirection(index > currentSynthIndex ? 'right' : 'left');
    setCurrentSynthIndex(index);
  };

  return (
    <div
      className="h-full w-full flex flex-col font-sans text-slate-200 relative selection:bg-sky-500/30 selection:text-white overflow-hidden bg-transparent"
    >
      {/* Navigation Header */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -70, opacity: 0, transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
        className="shrink-0 z-50 px-6 sm:px-10 py-3.5 border-b border-white/10 bg-[#0c131f]/80 backdrop-blur-md flex items-center justify-between"
      >
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onStart}>
          <div className="w-8 h-8 rounded-lg bg-[#141d27]/80 backdrop-blur-sm border border-[#27364a]/80 flex items-center justify-center shrink-0 shadow-inner group-hover:border-sky-500/50 transition-all text-sky-400">
            <Disc className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white font-mono block leading-none group-hover:text-sky-300 transition-colors">
              SYN-TRACKER
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Web Audio Chiptune Workstation
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={scrollToSupport}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-mono font-bold text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400/70 rounded-md bg-amber-950/40 hover:bg-amber-900/50 transition-colors cursor-pointer shadow-[0_0_12px_rgba(251,191,36,0.15)]"
            title="Support SYN-Tracker with Buy Me a Coffee or PayPal"
          >
            <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Support</span>
          </button>

          {onStartTutorial && (
            <button
              onClick={() => {
                onStart();
                onStartTutorial();
              }}
              className="hidden md:inline-flex items-center h-8 px-3 text-xs font-mono text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-md bg-[#131b2b]/90 transition-colors cursor-pointer"
            >
              Quick Tour
            </button>
          )}

          {onLoadDemo && (
            <button
              onClick={() => {
                onLoadDemo();
                onStart();
              }}
              className="hidden sm:inline-flex items-center h-8 px-3.5 text-xs font-mono text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-md bg-[#131b2b]/90 transition-colors cursor-pointer"
            >
              Load Demo (Space Debris)
            </button>
          )}

          <button
            onClick={onStart}
            className="inline-flex items-center h-8 px-4 text-xs font-mono font-bold text-black bg-sky-400 hover:bg-sky-300 rounded-md transition-colors cursor-pointer shadow-sm"
          >
            Open Studio
          </button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 70, opacity: 0, scale: 0.98, transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col"
      >
        <main className="relative z-10 flex-1 flex flex-col items-center px-6 sm:px-10 pt-10 pb-16 max-w-6xl mx-auto w-full">
          
          {/* Hero Section */}
          <div className="flex flex-col items-center text-center max-w-3xl mb-12">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
              Authentic Retro Chiptune &amp; Multi-Track Tracker in Your Browser.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Experience the direct sequencing workflow of classic Amiga trackers (ProTracker) combined with genuine sound chip models for C64 SID, Game Boy DMG, NES 2A03, Sega Mega Drive FM, and an integrated <strong>Music Visualizer</strong> to record &amp; upload your music to social media. Zero installation required.
            </p>
          </div>



          {/* Sound System Presets Grid with Hardware Images */}
          {onSelectChipKit && (
            <div className="w-full mb-14">
              {/* Modern Bauchbinde / Section Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-xl bg-[#0c131f]/90 border border-slate-700/60 shadow-lg backdrop-blur-md mb-5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
                <div className="pl-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                      Soundchips & Hardware Systems
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 font-sans mt-0.5">
                    Select a system to launch the studio preconfigured with authentic sounds & channels
                  </p>
                </div>
                <div className="pl-2 sm:pl-0 flex items-center">
                  <span className="text-[11px] font-mono font-semibold text-sky-300 bg-sky-950/70 px-2.5 py-1 rounded-md border border-sky-500/30">
                    6 Systems
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SOUND_SYSTEMS.map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => onSelectChipKit(sys.id)}
                    className="group relative text-left p-4 rounded-xl bg-[#0c131f]/85 hover:bg-[#101a2c]/95 border border-slate-800/90 hover:border-sky-500/50 backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-sky-500/10 min-h-[160px]"
                  >
                    {/* Background System Artwork with Smooth Mouseover Zoom */}
                    <div className="absolute -right-3 -bottom-2 w-36 h-32 pointer-events-none opacity-15 group-hover:opacity-35 transition-all duration-500 ease-out z-0 flex items-center justify-end">
                      <img
                        src={sys.imageSrc}
                        alt={sys.name}
                        className="max-h-full max-w-full object-contain filter drop-shadow-md transform scale-100 group-hover:scale-115 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Foreground Content */}
                    <div className="relative z-10">
                      <div className="mb-2">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors truncate">
                            {sys.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-sky-400">
                          {sys.chip}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300/80 leading-relaxed mb-4 max-w-[85%]">
                        {sys.description}
                      </p>
                    </div>

                    <div className="relative z-10 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {sys.channels}
                      </span>
                      <span className="text-slate-400 group-hover:text-sky-300 flex items-center gap-1.5 transition-colors font-medium">
                        <span>Load Kit</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Studio Previews Showcase (Tracker + 3D Visualizer) - Large Stacked Display with English Explanations */}
          <div className="w-full mb-16 flex flex-col gap-10">
            {/* Card 1: Tracker Workspace Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#080d16] shadow-2xl backdrop-blur-md flex flex-col">
              {/* Header */}
              <div className="px-5 py-3.5 bg-[#0d1422] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                  <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                    SYN-Tracker Studio Workspace &amp; Pattern Matrix
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-sky-300 bg-sky-950/70 border border-sky-500/30 px-2.5 py-0.5 rounded-md">
                    44.1 kHz • 16 Independent Tracks
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2.5 py-0.5 rounded-md">
                    ProTracker / FastTracker Architecture
                  </span>
                </div>
              </div>

              {/* Large Screenshot Stage */}
              <div 
                onClick={onStart}
                className="relative cursor-pointer group bg-[#04070c] overflow-hidden border-b border-slate-800 flex items-center justify-center"
              >
                <img 
                  src="/Screenshot01.png" 
                  alt="SYN-Tracker Studio Pattern Matrix and Audio Workstation"
                  className="w-full h-auto max-h-[600px] object-cover object-top block transition-transform duration-500 group-hover:scale-[1.01]"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/5 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="px-4 py-2 rounded-xl bg-slate-900/90 text-sky-300 font-mono text-xs border border-sky-500/40 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
                    <span>Launch Tracker Workspace</span>
                  </span>
                </div>
              </div>

              {/* Detailed English Description & Feature Highlights */}
              <div className="p-5 sm:p-6 bg-[#0a101b] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <h4 className="text-base font-mono font-bold text-white flex items-center gap-2">
                    <span className="text-sky-400">01.</span>
                    <span>High-Performance 16-Track Chiptune Digital Audio Workstation</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-4xl">
                    The primary production workspace features a classic vertical tracker pattern sequencer clocked to sample-accurate Web Audio DSP. Arrange up to 16 polyphonic tracks with hexadecimal pitch and volume notation, real-time command triggers (arpeggio tables, portamento slides, vibrato LFOs, hardware filter cutoffs), and an integrated 31-slot instrument vault supporting 8-bit PCM samples and hardware synthesizer patches.
                  </p>
                  
                  {/* Feature Highlights Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • 16 Polyphonic Audio Channels
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • Hexadecimal FX Commands (00-FF)
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • 31 Instrument Sample &amp; Synth Library
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • Master Stereo Bus &amp; Hardware FX Rack
                    </span>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <button
                    onClick={onStart}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono font-bold text-xs text-black bg-gradient-to-r from-sky-400 to-sky-300 hover:from-sky-300 hover:to-sky-200 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:shadow-[0_0_25px_rgba(56,189,248,0.55)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Open Tracker Studio</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Visualizer Studio Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#080d16] shadow-2xl backdrop-blur-md flex flex-col">
              {/* Header */}
              <div className="px-5 py-3.5 bg-[#0d1422] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                  <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                    Audiovisual Synthwave Visualizer &amp; 60 FPS Video Studio
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-sky-300 bg-sky-950/70 border border-sky-500/30 px-2.5 py-0.5 rounded-md">
                    60 FPS Video Exporter (.MP4 / .WEBM)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2.5 py-0.5 rounded-md">
                    Audio-Reactive Canvas Engine
                  </span>
                </div>
              </div>

              {/* Large Screenshot Stage */}
              <div 
                onClick={onOpenVisualizer || onStart}
                className="relative cursor-pointer group bg-[#04070c] overflow-hidden border-b border-slate-800 flex items-center justify-center"
              >
                <img 
                  src="/Visualizer.png" 
                  alt="Audiovisual Synthwave Music Visualizer Interface"
                  className="w-full h-auto max-h-[600px] object-cover object-top block transition-transform duration-500 group-hover:scale-[1.01]"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/5 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="px-4 py-2 rounded-xl bg-slate-900/90 text-sky-300 font-mono text-xs border border-sky-500/40 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-sky-400" />
                    <span>Launch Visualizer Studio</span>
                  </span>
                </div>
              </div>

              {/* Detailed English Description & Feature Highlights */}
              <div className="p-5 sm:p-6 bg-[#0a101b] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <h4 className="text-base font-mono font-bold text-white flex items-center gap-2">
                    <span className="text-sky-400">02.</span>
                    <span>Real-Time 3D Wireframe Graphics &amp; Social Video Rendering</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-4xl">
                    Render your music into retro audiovisual animations. Powered by a responsive 3D perspective wireframe grid, FFT multi-band frequency spectrum analyzers, analog oscilloscope waves, stellar starfield particles, and custom demoscene font scrollers. Export full-resolution 60 FPS videos (.MP4 / .WEBM) ready for YouTube, Instagram Reels, and TikTok with one click.
                  </p>
                  
                  {/* Feature Highlights Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • 3D Audio-Reactive Horizon Grid
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • Multi-Band Spectrum &amp; Waveform Oscilloscope
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • Customizable Text Scroller &amp; Studio Logos
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#121c2b] text-sky-200 border border-sky-900/50">
                      • 60 FPS HD MP4/WEBM Video Exporter
                    </span>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  <button
                    onClick={onOpenVisualizer || onStart}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono font-bold text-xs text-black bg-gradient-to-r from-sky-400 to-sky-300 hover:from-sky-300 hover:to-sky-200 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:shadow-[0_0_25px_rgba(56,189,248,0.55)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Open Video Visualizer</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Hardware Synthesizers & Floppy Vault Showcase - Grand Slideshow */}
          <div 
            className="w-full mb-14"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Header with Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-xl bg-[#0c131f]/90 border border-slate-700/60 shadow-lg backdrop-blur-md mb-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
              <div className="pl-2">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span>Hardware Synthesizers &amp; Sound Design Showcase</span>
                </h2>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  Deep sound design control with dedicated chip synthesizer panels &amp; retro disk libraries
                </p>
              </div>
              
              {/* Slideshow Control Indicators */}
              <div className="pl-2 sm:pl-0 flex items-center gap-2">
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 border transition cursor-pointer ${
                    isAutoPlaying 
                      ? 'bg-sky-950/70 text-sky-300 border-sky-500/40 hover:bg-sky-900/60' 
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={isAutoPlaying ? 'Pause automatic slideshow' : 'Resume automatic slideshow'}
                >
                  {isAutoPlaying ? (
                    <>
                      <Pause className="w-3 h-3 text-sky-400" />
                      <span>Auto-Play</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-slate-400" />
                      <span>Paused</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] font-mono font-bold text-sky-300 bg-sky-950/50 px-2.5 py-1 rounded-md border border-sky-500/30">
                  {currentSynthIndex + 1} / {SYNTH_SLIDES.length}
                </span>
              </div>
            </div>

            {/* Quick Navigation Tabs for the 5 Synthesizers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-3">
              {SYNTH_SLIDES.map((slide, idx) => {
                const isActive = idx === currentSynthIndex;
                return (
                  <button
                    key={slide.id}
                    onClick={() => handleSelectSlide(idx)}
                    className={`group relative px-3.5 py-2.5 rounded-xl text-left transition-all duration-300 border cursor-pointer overflow-hidden ${
                      isActive
                        ? 'bg-[#101b2b] border-sky-500/70 shadow-[0_0_15px_rgba(56,189,248,0.2)] ring-1 ring-sky-500/40'
                        : 'bg-[#090e17]/85 border-slate-800/80 hover:border-sky-500/40 hover:bg-[#0d1522]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] z-20" />
                    )}

                    {/* Large Semi-Transparent Background Watermark Icon with Smooth Zoom */}
                    <div className={`absolute -right-2 -bottom-2 w-16 h-14 pointer-events-none ${isActive ? 'opacity-40' : 'opacity-15 group-hover:opacity-35'} transition-all duration-500 ease-out z-0 flex items-center justify-end`}>
                      <img 
                        src={slide.chipIcon} 
                        alt="" 
                        className="max-h-full max-w-full object-contain filter drop-shadow-md transform scale-100 group-hover:scale-110 transition-transform duration-500 ease-out" 
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    </div>

                    {/* Foreground Content */}
                    <div className="relative z-10 min-w-0 pr-4">
                      <div className={`text-[11px] sm:text-xs font-mono font-bold truncate leading-tight ${isActive ? 'text-sky-300' : 'text-white'}`}>
                        {slide.badge}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        {slide.tag}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* GRAND SLIDESHOW STAGE - FULL WIDTH NO BLACK BARS */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-[#070b13] shadow-2xl group">
              {/* Top Accent Line - Pure Sky Blue */}
              <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />

              {/* High-Resolution Full-Bleed Screenshot Stage */}
              <div className="relative w-full aspect-[16/9] min-h-[360px] sm:min-h-[460px] max-h-[640px] bg-[#05080e] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0, scale: 0.99, x: slideDirection === 'right' ? 25 : -25 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.99, x: slideDirection === 'right' ? -25 : 25 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <img 
                      src={activeSlide.imgSrc} 
                      alt={activeSlide.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Left / Right Arrow Navigation Overlays */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevSlide();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/85 hover:bg-sky-950 border border-slate-700/80 hover:border-sky-500/80 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer z-20"
                  title="Previous Synthesizer"
                >
                  <ChevronLeft className="w-5 h-5 text-sky-400" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextSlide();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/85 hover:bg-sky-950 border border-slate-700/80 hover:border-sky-500/80 text-white flex items-center justify-center backdrop-blur-md shadow-xl transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer z-20"
                  title="Next Synthesizer"
                >
                  <ChevronRight className="w-5 h-5 text-sky-400" />
                </button>
              </div>

              {/* SLIDESHOW FOOTER & SPECS PANEL */}
              <div className="p-4 sm:p-5 bg-[#0c131f]/95 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide">
                      {activeSlide.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-950/80 text-sky-300 border border-sky-500/30">
                      {activeSlide.tag}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-3xl">
                    {activeSlide.description}
                  </p>

                  {/* Specs Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {activeSlide.specs.map((spec, sIdx) => (
                      <span 
                        key={sIdx}
                        className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-[#141f2e] text-sky-200 border border-sky-900/40"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons & Pagination Dots */}
                <div className="flex flex-col sm:flex-row md:flex-col items-end gap-3 shrink-0 w-full md:w-auto">
                  {onSelectChipKit && (
                    <button
                      onClick={() => onSelectChipKit(activeSlide.chipId)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono font-bold text-xs text-black bg-gradient-to-r from-sky-400 to-sky-300 hover:from-sky-300 hover:to-sky-200 transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Sliders className="w-4 h-4 text-black" />
                      <span>Launch {activeSlide.badge} in Studio</span>
                      <ArrowRight className="w-3.5 h-3.5 text-black" />
                    </button>
                  )}

                  {/* Dot Indicators */}
                  <div className="flex items-center gap-1.5 self-center md:self-end">
                    {SYNTH_SLIDES.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => handleSelectSlide(dotIdx)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          dotIdx === currentSynthIndex 
                            ? 'w-6 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]' 
                            : 'w-2 bg-slate-700 hover:bg-sky-500/50'
                        }`}
                        title={`Go to slide ${dotIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details Tabs */}
          <div className="w-full mb-10">
            {/* Modern Bauchbinde / Section Banner for Specifications */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-xl bg-[#0c131f]/90 border border-slate-700/60 shadow-lg backdrop-blur-md mb-5 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
              <div className="pl-2">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Workstation Architecture & Features
                </h2>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  Deep technical specifications, tracker engine workflow, and keyboard controls
                </p>
              </div>

              {/* Tab Selector inside the Bauchbinde Header */}
              <div className="pl-2 sm:pl-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar-thin">
                {[
                  { id: 'tracker' as const, label: 'Tracker Workflow' },
                  { id: 'chips' as const, label: 'Synthesis' },
                  { id: 'dsp' as const, label: 'DSP & Filters' },
                  { id: 'visualizer' as const, label: 'Music Visualizer' },
                  { id: 'shortcuts' as const, label: 'Shortcuts' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0c131f]/85 border border-slate-800/90 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                {activeTab === 'tracker' && (
                  <motion.div
                    key="tracker"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5"
                  >
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        Vertical Pattern Matrix
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Precision note entry with centered playhead. Supports 3 to 16 channels with horizontal panning, channel mutes, and smooth scrolling.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        ProTracker Effect Commands
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Full command support: 0xy (Arpeggio), 1xx/2xx (Pitch Slide), 4xy (Vibrato), EDx (Note Delay), ECx (Note Cut), and volume slides.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        .MOD & WAV Master Export
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Export 100% binary-compatible Amiga Soundtracker/ProTracker .MOD files, uncompressed 24-bit master audio WAVs, or separate stem tracks.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'chips' && (
                  <motion.div
                    key="chips"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5"
                  >
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        Amiga Floppy Disk Vault
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Browse and load from 10,547+ original vintage samples across 115 ST floppies (ST-01 to ST-115) directly into 31 instrument slots with instant preview and keyboard audition.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        Real-Time Chip Synthesizers
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        C64 SID, Game Boy DMG, NES 2A03, and Mega Drive FM are synthesized live in the Web Audio graph with complete parameter control.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        Waveform Editor & Looping
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Integrated sample editor for trimming, normalization, sustain loop points, reverse playback, and custom WAV/MP3 drag-and-drop.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'dsp' && (
                  <motion.div
                    key="dsp"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5"
                  >
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        Amiga 4.4 kHz Lowpass Filter
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Accurate modeling of the hardware Butterworth lowpass filter on classic Amiga 500 boards with switchable power LED behavior.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        Master Stereo DSP Rack
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Stereo Ping-Pong Delay with BPM tempo sync, analog tube saturation drive, 3-band parametric EQ, and a transparent brickwall limiter.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5">
                        CRT Oscilloscope & Spectrum
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        60 FPS vector oscilloscope with stereo phase lissajous and real-time FFT frequency spectrum analyzer for precise audio mixing.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'visualizer' && (
                  <motion.div
                    key="visualizer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5"
                  >
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5 flex items-center gap-2">
                        <Film className="w-4 h-4 text-sky-400" />
                        <span>Audio Reactive Canvas</span>
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Real-time 60FPS audio-reactive graphics featuring Synth Grid, Starfields, Glowing Orbs, Phyllotaxis spirals, and copper raster bars.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-sky-400" />
                        <span>Visualize Music for Social Media</span>
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Visualize your tracker songs or import any MP3/WAV track to render video clips ready to upload directly to TikTok, YouTube, or Instagram.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-white mb-1.5 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <span>High-Res Video Recording</span>
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Record fluid HD videos with direct audio capture in 16:9 Landscape, 9:16 Portrait, or 1:1 Square aspect ratios.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'shortcuts' && (
                  <motion.div
                    key="shortcuts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono"
                  >
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">SPACE</div>
                      <div className="text-slate-400 text-[11px]">Play / Stop & Edit Mode</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">QWERTY / QWERTZ</div>
                      <div className="text-slate-400 text-[11px]">2-Octave Piano Keyboard</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">TAB / SHIFT+TAB</div>
                      <div className="text-slate-400 text-[11px]">Next / Previous Track</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">CTRL + Z / Y</div>
                      <div className="text-slate-400 text-[11px]">Multi-Level Undo / Redo</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">F5 / F8</div>
                      <div className="text-slate-400 text-[11px]">Play Song / Stop</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">F6</div>
                      <div className="text-slate-400 text-[11px]">Loop Current Pattern</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">DEL / BACKSPACE</div>
                      <div className="text-slate-400 text-[11px]">Clear Row Note / Value</div>
                    </div>
                    <div className="p-3 rounded bg-[#070c14] border border-slate-800">
                      <div className="text-sky-400 font-bold mb-1">ALT + 1..4</div>
                      <div className="text-slate-400 text-[11px]">Toggle Track Mute</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Dedicated Support & Coffee Section */}
          <div 
            ref={supportRef}
            id="landing-support-section"
            className="w-full mb-12 rounded-2xl bg-gradient-to-b from-[#0e1624] to-[#080d15] border border-amber-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(251,191,36,0.12)] relative overflow-hidden"
          >
            {/* Top Accent Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />

            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-400" />
                <span>Support SYN-Tracker</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-sans mt-1 leading-relaxed">
                SYN-Tracker is 100% free and open-source. If you enjoy the tracker and would like to support the ongoing development of new soundchips and features, feel free to buy me a coffee or send a small tip!
              </p>
            </div>

            {/* Support Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Channel 1: Buy Me a Coffee */}
              <div className="p-5 rounded-xl bg-[#111927] border border-amber-400/30 hover:border-amber-400/60 transition-all flex flex-col justify-between group shadow-lg">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#FFDD00] text-black shadow-sm flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 fill-black" />
                      <span>Buy Me a Coffee</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-mono font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                    Virtual Coffee / Tip
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Quick support via Credit Card, Apple Pay, or Google Pay.
                  </p>
                </div>

                <div className="space-y-2">
                  <a
                    id="landing-bmc-link"
                    href={bmcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#FFDD00] hover:bg-[#ffe53b] text-black font-mono font-bold text-xs flex items-center justify-between transition-all shadow-md active:scale-98 cursor-pointer group"
                  >
                    <span className="truncate">buymeacoffee.com/hj_wuethrich</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" />
                  </a>
                  <button
                    onClick={() => handleCopyLink(bmcUrl, 'bmc')}
                    className="w-full py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink === 'bmc' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Link copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Channel 2: PayPal.Me */}
              <div className="p-5 rounded-xl bg-[#111927] border border-blue-500/30 hover:border-blue-500/60 transition-all flex flex-col justify-between group shadow-lg">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#0070BA] text-white shadow-sm flex items-center gap-1.5">
                      <span className="font-bold">P</span>
                      <span>PayPal.Me</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-mono font-bold text-white mb-1.5 group-hover:text-blue-300 transition-colors">
                    PayPal Direct Tip
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Send any custom amount directly and securely to PayPal.
                  </p>
                </div>

                <div className="space-y-2">
                  <a
                    id="landing-paypal-link"
                    href={paypalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0070BA] hover:bg-[#0086dc] text-white font-mono font-bold text-xs flex items-center justify-between transition-all shadow-md active:scale-98 cursor-pointer group"
                  >
                    <span className="truncate">paypal.me/HansjuergWuethrich</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" />
                  </a>
                  <button
                    onClick={() => handleCopyLink(paypalUrl, 'paypal')}
                    className="w-full py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink === 'paypal' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Link copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Channel 3: PayPal QR Code */}
              <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-300 flex flex-col justify-between items-center text-center shadow-lg">
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1.5 text-slate-900 font-mono font-bold text-xs">
                    <QrCode className="w-4 h-4 text-sky-600" />
                    <span>PayPal QR Code</span>
                  </div>

                  <div className="my-1 flex items-center justify-center">
                    <img 
                      src="/qrcode.png" 
                      alt="PayPal QR Code" 
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain block select-none"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <p className="text-xs text-slate-700 mt-1 font-mono">
                    Scan with smartphone camera or PayPal app
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 bg-[#070b10]/90 backdrop-blur-sm px-6 sm:px-10 py-5 text-xs text-slate-400 font-mono">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">SYN-TRACKER</span>
              <span className="text-slate-600">•</span>
              <span>Web Audio Chiptune Workstation</span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://www.hj-wuethrich.cv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center opacity-80 hover:opacity-100 transition-opacity"
                title="Synthek Design"
              >
                <img
                  src="/SynthekDesign.png"
                  alt="Synthek Design"
                  className="h-3.5 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </a>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};
