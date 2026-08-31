/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  BookOpen, 
  Disc,
  Sliders,
  Sparkles,
  FileCode,
  Music
} from 'lucide-react';

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
}

interface Step {
  stepNumber: string;
  tag: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onOpenHelp,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Keyboard navigation inside tutorial (ESC to close, Left/Right for steps)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const steps: Step[] = [
    {
      stepNumber: '01',
      tag: 'Overview',
      title: 'Welcome to SYN-Tracker Studio',
      subtitle: 'Modern Web Audio workstation with authentic 90s chiptune & tracker heritage.',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p className="text-slate-200">
            <strong className="text-white font-mono">SYN-Tracker</strong> combines the lightning-fast speed of classic retro trackers (ProTracker, FastTracker II) with a modern, zero-latency Web Audio DSP engine.
          </p>

          {/* Structured Visual Spec Matrix */}
          <div className="bg-[#080d15] border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Audio Core Engine</span>
              <span className="text-sky-400 font-semibold">Web Audio 32-Bit Float DSP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="space-y-1 bg-[#0e1622] p-2.5 rounded-lg border border-slate-800/60">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-sky-400" />
                  <span>4 to 16 Channels</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Full polyphony: From authentic 4-channel Amiga PAULA to 16 stereo tracks for dense modern arrangements.
                </p>
              </div>

              <div className="space-y-1 bg-[#0e1622] p-2.5 rounded-lg border border-slate-800/60">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Offline & Local</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Complete import/export for standard Amiga <span className="font-mono text-sky-300">.MOD</span> files and native multi-sample <span className="font-mono text-emerald-300">.TRK</span> studio projects.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c1420] border border-sky-950 flex items-start gap-2.5 text-[11px] text-slate-300">
            <span className="text-sky-400 font-mono font-bold mt-0.5">TIP:</span>
            <span>Navigate through this Quick Tour using arrow keys or the buttons below to learn essential keyboard shortcuts and studio workflows.</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '02',
      tag: 'Pattern Grid',
      title: 'The Vertical Pattern Grid',
      subtitle: 'Music flows vertically down row by row from 00 to 63.',
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Unlike horizontal timeline DAWs, tracker music arranges vertically in a <strong className="text-white">top-to-bottom matrix</strong>. Each row represents a rhythmic step:
          </p>

          {/* Interactive Pattern Mockup Display */}
          <div className="bg-[#070b12] border border-slate-800 rounded-xl p-3 font-mono text-xs overflow-hidden shadow-inner">
            <div className="text-[10px] text-slate-500 pb-2 border-b border-slate-800/80 flex items-center justify-between">
              <span>TRACK 01 [LEAD]</span>
              <span className="text-sky-400">[NOTE] [SMP] [FX]</span>
            </div>
            
            <div className="divide-y divide-slate-900/60 mt-1">
              <div className="py-1 px-1.5 flex items-center justify-between bg-sky-950/40 rounded text-slate-200 border-l-2 border-sky-400">
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-amber-400 font-bold">00</span>
                  <span className="text-sky-400 font-bold tracking-wider">C-4</span>
                  <span className="text-emerald-400 font-semibold">01</span>
                  <span className="text-rose-400 font-semibold">C40</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">Note C-4, Sample 1, Full Volume</span>
              </div>

              <div className="py-1 px-1.5 flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-600">01</span>
                  <span className="text-slate-600">---</span>
                  <span className="text-slate-700">--</span>
                  <span className="text-slate-700">000</span>
                </div>
                <span className="text-[10px] text-slate-600 font-sans hidden sm:inline">Sustain / Decay phase</span>
              </div>

              <div className="py-1 px-1.5 flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-amber-400/80 font-bold">04</span>
                  <span className="text-sky-400 font-bold tracking-wider">G-4</span>
                  <span className="text-emerald-400 font-semibold">01</span>
                  <span className="text-slate-600">000</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">Next melody step</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e1622] border border-slate-800 flex items-center gap-3 text-[11px]">
            <div className="p-1.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50">
              <Play className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-white font-mono">SPACEBAR:</strong> Toggles playback anywhere in the studio. Use Arrow keys to navigate cells.
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '03',
      tag: 'Live Recording',
      title: 'Note Entry & Virtual Piano Keyboard',
      subtitle: 'Your computer keyboard turns into an expressive 2-octave synthesizer.',
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Press the red <strong className="text-rose-400 font-mono uppercase">EDIT</strong> button at the top (or <strong className="text-white font-mono">ESC</strong>) to toggle live recording mode:
          </p>

          {/* Virtual Keyboard Map Container */}
          <div className="bg-[#080d15] border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div>
              <div className="text-[11px] font-mono text-sky-400 font-bold mb-1.5 flex items-center justify-between">
                <span>Lower Octave (C-2 to B-2)</span>
                <span className="text-[10px] text-slate-500 font-normal">QWERTY / QWERTZ / AZERTY</span>
              </div>
              <div className="grid grid-cols-7 gap-1 font-mono text-center text-[10px]">
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-sky-300 font-bold"><span className="text-slate-500 block text-[9px]">Z / Y</span>C-2</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-slate-300"><span className="text-slate-500 block text-[9px]">S</span>C#2</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-sky-300 font-bold"><span className="text-slate-500 block text-[9px]">X</span>D-2</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-slate-300"><span className="text-slate-500 block text-[9px]">D</span>D#2</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-sky-300 font-bold"><span className="text-slate-500 block text-[9px]">C</span>E-2</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-sky-300 font-bold"><span className="text-slate-500 block text-[9px]">V</span>F-2</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-sky-300 font-bold"><span className="text-slate-500 block text-[9px]">B</span>G-2</div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-amber-400 font-bold mb-1.5">
                <span>Upper Octave (C-3 to C-4)</span>
              </div>
              <div className="grid grid-cols-7 gap-1 font-mono text-center text-[10px]">
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-amber-300 font-bold"><span className="text-slate-500 block text-[9px]">Q</span>C-3</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-slate-300"><span className="text-slate-500 block text-[9px]">2</span>C#3</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-amber-300 font-bold"><span className="text-slate-500 block text-[9px]">W</span>D-3</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-slate-300"><span className="text-slate-500 block text-[9px]">3</span>D#3</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-amber-300 font-bold"><span className="text-slate-500 block text-[9px]">E</span>E-3</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-amber-300 font-bold"><span className="text-slate-500 block text-[9px]">R</span>F-3</div>
                <div className="bg-[#121b27] border border-slate-700 py-1.5 rounded text-amber-300 font-bold"><span className="text-slate-500 block text-[9px]">T</span>G-3</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span><strong className="text-white">Delete / Backspace:</strong> Clear Note</span>
            <span><strong className="text-white">F5 / F6 / F8:</strong> Play / Loop / Stop</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '04',
      tag: 'Sound Design',
      title: 'Sample Editor & Synthesis',
      subtitle: 'Slice audio waveforms, set zero-crossing loops, or synthesize custom chiptunes.',
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            At the bottom of the studio screen, you will find the dedicated <strong className="text-white">Sample Waveform Editor</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#080d15] border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs font-mono">
                <Sliders className="w-3.5 h-3.5" />
                <span>Waveform Slicing</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Zoom into waveforms, select regions to crop/trim, and configure forward or ping-pong loop points with automatic zero-crossing snapping.
              </p>
            </div>

            <div className="bg-[#080d15] border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sky-400 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chiptune Synthesizer</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Generate authentic 8-bit Sawtooth, Pulse/Square, Triangle, and 12-bit filtered Vintage Amiga Paula tones in real time.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e1622] border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
            <span>Supports up to <strong>31 Instrument Slots</strong> (Sample 01 to 1F).</span>
            <span className="text-sky-400 font-mono">WAV / MP3 / IFF / MOD</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '05',
      tag: 'Master DSP & Save',
      title: 'Master FX Rack & Export',
      subtitle: '3-band parametric EQ, ping-pong delay, tube saturation, and file exports.',
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Shape and polish your production with the integrated master bus DSP effect chain:
          </p>

          <div className="bg-[#080d15] border border-slate-800 rounded-xl p-3.5 space-y-2.5 font-mono text-[11px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-white font-semibold">1. Parametric 3-Band EQ</span>
              <span className="text-slate-400">Low / Mid / High Shelving</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-white font-semibold">2. Stereo Ping-Pong Delay</span>
              <span className="text-slate-400">BPM-synchronized cross-feedback</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-white font-semibold">3. Warm Tube Saturation & Limiter</span>
              <span className="text-slate-400">Analog warmth & 0dB ceiling</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#0e1622] border border-slate-800">
              <span className="text-sky-400 font-mono font-bold block mb-0.5">.MOD Export</span>
              <p className="text-[10px] text-slate-400 font-sans">Compatible with real hardware Amiga 500/1200 ProTracker floppy disks.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0e1622] border border-slate-800">
              <span className="text-emerald-400 font-mono font-bold block mb-0.5">.TRK Studio Project</span>
              <p className="text-[10px] text-slate-400 font-sans">Stores 16 channels, all custom samples, and master DSP parameters.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '06',
      tag: 'Ready to Create',
      title: "You're Ready to Make Music!",
      subtitle: 'The comprehensive reference manual is accessible anytime via the (?) button.',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0c1420] border border-sky-500/40 flex items-center justify-center text-sky-400 mx-auto shadow-[0_0_25px_rgba(56,189,248,0.25)]">
            <Music className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-sm font-bold text-white font-mono">Full Effect Commands & Technical Guides</h4>
            <p className="text-xs text-slate-400">
              Looking for Arpeggios (<span className="font-mono text-sky-300">0xy</span>), Portamento (<span className="font-mono text-sky-300">3xx</span>), or Volume Slides (<span className="font-mono text-sky-300">Axy</span>)? Explore the in-depth user reference manual anytime:
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              className="px-4 py-2 rounded-xl bg-[#141e2e] hover:bg-[#1a293e] border border-sky-500/40 text-sky-300 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Open User Manual (?)</span>
            </button>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="onboarding-tutorial-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
          onClick={onClose}
        >
          <motion.div 
            key="onboarding-tutorial-content"
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
            className="w-full max-w-xl min-h-[490px] bg-[#070c14] border border-sky-500/40 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(56,189,248,0.25)] text-[#e2e8f0]"
          >
            
            {/* Header with clean title & glowing icon */}
            <div className="h-14 bg-[#0c1422] border-b border-sky-500/30 px-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-950/90 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0">
                  <Disc className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight font-mono">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              {step.content}
            </div>

            {/* Footer Navigation */}
            <div className="bg-[#0c1422] border-t border-sky-500/30 px-6 py-3.5 flex items-center justify-between shrink-0">
              {/* Progress Indicators */}
              <div className="flex items-center gap-1.5">
                {steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === currentStep 
                        ? 'w-6 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]' 
                        : 'w-2 bg-slate-800 hover:bg-slate-700'
                    }`}
                    title={`Jump to step ${s.stepNumber} (${s.tag})`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2.5">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-3.5 py-1.5 rounded-lg bg-[#141e2e] hover:bg-[#1a293e] border border-slate-700/80 text-xs font-mono font-medium text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-black font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(56,189,248,0.4)] active:scale-95"
                >
                  <span>{currentStep === steps.length - 1 ? 'Start Studio' : 'Next Step'}</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
