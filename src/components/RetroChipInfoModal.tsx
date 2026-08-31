/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Cpu, 
  Music, 
  Disc, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  HelpCircle,
  Play
} from 'lucide-react';
import { RetroFileInfo, RetroSystemKind } from '../utils/retroChipParsers';

export type SidFileInfo = RetroFileInfo;

interface RetroChipInfoModalProps {
  isOpen: boolean;
  fileInfo: RetroFileInfo | null;
  onClose: () => void;
  onConfirmLoad?: () => void;
  onLoadTemplate?: (system: RetroSystemKind) => void;
}

export const RetroChipInfoModal: React.FC<RetroChipInfoModalProps> = ({
  isOpen,
  fileInfo,
  onClose,
  onConfirmLoad,
  onLoadTemplate,
}) => {
  if (!isOpen || !fileInfo) return null;

  const system = fileInfo.system || 'c64';

  const systemDetails: Record<RetroSystemKind, {
    title: string;
    chipBadge: string;
    description: string;
    classicBadge: string;
    playerVsTrackerTitle: string;
    playerVsTrackerDesc1: string;
    playerVsTrackerDesc2: string;
    features: string[];
    templatePrompt: string;
    templateLinkText: string;
    statusText: string;
    accentColor: string;
  }> = {
    c64: {
      title: 'Commodore 64 SID File Information',
      chipBadge: 'MOS 6581 / 8580',
      description: 'Important details regarding C64 SID formats and tracker playback',
      classicBadge: 'Classic C64 SID (HVSC / Machine Code)',
      playerVsTrackerTitle: 'Dedicated SID Players vs. Music Trackers',
      playerVsTrackerDesc1: 'Classic C64 .SID files (e.g. from the High Voltage SID Collection by Rob Hubbard, Martin Galway, or Chris Hülsbeck) do not contain standard tracker note sheets. Instead, they consist of raw 6502 assembly machine code.',
      playerVsTrackerDesc2: 'Dedicated SID players run a full Commodore 64 CPU emulator in the background to execute that code and pump register values to the chip. A pattern tracker, by contrast, operates on an editable matrix of notes and tracks.',
      features: [
        'Native C64 SID Export: Export compositions as real .SID and .PRG machine code programs for C64 hardware.',
        'Full Project Recall: All SIDs created in SYN-Tracker can be saved, opened, and played back with all 3 channels preserved.',
        'Authentic MOS 6581/8580 Sound: Dynamic Pulse-Width Modulation (PWM), Saw, Triangle, Noise, ADSR and SID resonant filters.',
      ],
      templatePrompt: 'Want to compose your own Commodore 64 Chiptunes?',
      templateLinkText: 'open the 3-channel C64 template with the 16-instrument MOS 6581 sound studio kit →',
      statusText: '3-Channel C64 Hardware Engine Active',
      accentColor: '#38bdf8',
    },
    nes: {
      title: 'NES / Famicom NSF File Information',
      chipBadge: 'Ricoh 2A03 (5-CH APU)',
      description: 'Important details regarding NES NSF music formats and tracker playback',
      classicBadge: 'Classic NES NSF (Ricoh 2A03 Machine Code)',
      playerVsTrackerTitle: 'Dedicated NSF Players vs. Music Trackers',
      playerVsTrackerDesc1: 'Classic Nintendo NES .NSF files (e.g. from Super Mario Bros., Mega Man, or Castlevania) do not contain standard tracker note patterns. Instead, they contain compiled Ricoh 2A03 6502 assembly subroutines.',
      playerVsTrackerDesc2: 'Dedicated NSF players run a virtual NES CPU that triggers the sound driver on every video frame (50Hz/60Hz). SYN-Tracker translates these sessions into an interactive 5-channel tracker environment.',
      features: [
        'Authentic 5-Channel NES Sound: Dual variable pulse channels, 32-step pure triangle bass, 15-bit/7-bit LFSR noise, and DPCM drums.',
        'Interactive Chiptune Tracking: Compose with real Nintendo hardware constraints and authentic chiptune envelopes.',
        'Full Multi-Format Export: Render your NES compositions to studio WAV, MP3, Amiga MOD, and .TRK project files.',
      ],
      templatePrompt: 'Want to compose your own NES / Famicom Chiptunes?',
      templateLinkText: 'open the 5-channel NES template with the 16-instrument Ricoh 2A03 sound studio kit →',
      statusText: '5-Channel NES APU Hardware Engine Active',
      accentColor: '#fb7185',
    },
    gameboy: {
      title: 'Nintendo Game Boy GBS File Information',
      chipBadge: 'Sharp LR35902 APU (4-CH)',
      description: 'Important details regarding Game Boy GBS formats and tracker playback',
      classicBadge: 'Classic Game Boy GBS (LR35902 Binary Code)',
      playerVsTrackerTitle: 'Dedicated GBS Players vs. Music Trackers',
      playerVsTrackerDesc1: 'Classic Game Boy .GBS files (e.g. from Pokémon Red/Blue, Tetris, or Link\'s Awakening) contain Sharp LR35902 (Z80-hybrid) binary execution code rather than linear score sheets.',
      playerVsTrackerDesc2: 'Dedicated Game Boy sound players emulate the portable hardware CPU to execute the ROM sound routines. SYN-Tracker provides an editable pattern grid with authentic DMG-01 hardware synthesis.',
      features: [
        'Authentic 4-Channel DMG-01 Sound: Pulse 1 with hardware frequency sweep, Pulse 2, 4-bit 32-step custom Wave RAM, and LFSR Noise.',
        'True Hardware Emulation: Custom duty cycles (12.5%, 25%, 50%, 75%) and hardware volume envelopes.',
        'Full Multi-Format Export: Export directly to studio WAV, MP3, Amiga MOD, or .TRK session files.',
      ],
      templatePrompt: 'Want to compose your own Game Boy Chiptunes?',
      templateLinkText: 'open the 4-channel Game Boy template with the 16-instrument DMG-01 sound studio kit →',
      statusText: '4-Channel Game Boy DMG-01 Engine Active',
      accentColor: '#4ade80',
    },
    megadrive: {
      title: 'Sega Mega Drive / Genesis VGM File Information',
      chipBadge: 'Yamaha YM2612 FM + SN76489 PSG',
      description: 'Important details regarding Sega VGM stream formats and tracker playback',
      classicBadge: 'Classic Mega Drive VGM (Register Dump Stream)',
      playerVsTrackerTitle: 'Dedicated VGM Players vs. Music Trackers',
      playerVsTrackerDesc1: 'Sega Mega Drive .VGM and .VGZ files (e.g. from Sonic the Hedgehog, Streets of Rage, or Golden Axe) are raw, time-stamped hardware register dumps streaming thousands of direct byte commands.',
      playerVsTrackerDesc2: 'VGM players stream these raw writes to the dual soundchips. A pattern tracker, by contrast, operates on musical notes, instrument patches, and structured channel matrices.',
      features: [
        'Authentic 6-Channel FM Synthesis: 4-Operator Yamaha YM2612 FM synth with 8 algorithms, feedback modulation, and Texas SN76489 PSG.',
        'Rich 16-Bit Genesis Audio: Authentic slap bass, punchy FM drums, gritty brass leads, and crystalline bells.',
        'Full Multi-Format Export: Render your Sega tracks to studio WAV, MP3, Amiga MOD, and multi-track stems.',
      ],
      templatePrompt: 'Want to compose your own Sega Mega Drive Chiptunes?',
      templateLinkText: 'open the 6-channel Mega Drive template with the 16-instrument FM+PSG sound studio kit →',
      statusText: '6-Channel Sega Mega Drive FM Engine Active',
      accentColor: '#c084fc',
    },
  };

  const details = systemDetails[system] || systemDetails.c64;

  return (
    <AnimatePresence>
      <div 
        id="retro-chip-info-modal-backdrop"
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="retro-chip-info-modal-container"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0e1622] border border-[#233549] shadow-2xl overflow-hidden text-[#f1f5f9]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 sm:px-6 py-4 bg-gradient-to-r from-[#141e2e] to-[#0d1522] border-b border-[#233549] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0284c7]/20 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8] shadow-inner">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#f8fafc]">
                    {details.title}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30">
                    {details.chipBadge}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  {details.description}
                </p>
              </div>
            </div>

            <button
              id="retro-chip-info-modal-close-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e2c3e] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 custom-scrollbar text-xs leading-relaxed text-[#cbd5e1]">
            {/* File Info Card */}
            <div className="p-4 rounded-xl bg-[#141f2d] border border-[#243548] space-y-3">
              <div className="flex items-center justify-between border-b border-[#243548] pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#38bdf8] font-bold flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5" /> Detected File
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  fileInfo.isNativeSynTracker 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                }`}>
                  {fileInfo.isNativeSynTracker ? 'SYN-Tracker Native Project' : details.classicBadge}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64748b] block text-[11px]">File Name:</span>
                  <span className="font-mono text-[#f8fafc] font-medium truncate block">
                    {fileInfo.fileName}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Header Title:</span>
                  <span className="font-medium text-[#f8fafc] truncate block">
                    {fileInfo.title || 'Untitled'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Composer / Author:</span>
                  <span className="font-medium text-[#f8fafc] truncate block">
                    {fileInfo.author || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block text-[11px]">Release / System:</span>
                  <span className="font-medium text-[#f8fafc] truncate block">
                    {fileInfo.released || details.chipBadge}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanatory Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#f8fafc] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#38bdf8]" />
                How does {fileInfo.systemName || 'Retro Chip'} support work in SYN-Tracker?
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Left Card */}
                <div className="p-3.5 rounded-xl bg-[#111a26] border border-[#1e2d3d] space-y-2">
                  <div className="flex items-center gap-2 text-[#e2e8f0] font-semibold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{details.playerVsTrackerTitle}</span>
                  </div>
                  <p className="text-[#94a3b8] text-[11.5px] leading-normal">
                    {details.playerVsTrackerDesc1}
                  </p>
                  <p className="text-[#94a3b8] text-[11.5px] leading-normal">
                    {details.playerVsTrackerDesc2}
                  </p>
                </div>

                {/* Right Card */}
                <div className="p-3.5 rounded-xl bg-[#111a26] border border-[#1e2d3d] space-y-2">
                  <div className="flex items-center gap-2 text-[#e2e8f0] font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>What SYN-Tracker provides for you:</span>
                  </div>
                  <ul className="space-y-1.5 text-[11.5px] text-[#94a3b8]">
                    {details.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Template Launch Link Callout */}
            <div className="p-3.5 rounded-xl bg-[#0284c7]/10 border border-[#0284c7]/25 flex items-start gap-3">
              <Sliders className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
              <div className="text-[11.5px] leading-relaxed text-[#cbd5e1]">
                <strong className="text-[#f8fafc] block mb-0.5">{details.templatePrompt}</strong>
                <span>You can </span>
                <button
                  type="button"
                  id="retro-chip-load-template-link"
                  onClick={() => {
                    if (onLoadTemplate) {
                      onLoadTemplate(system);
                      onClose();
                    }
                  }}
                  className="inline font-semibold text-[#38bdf8] hover:text-sky-300 underline underline-offset-2 decoration-[#38bdf8]/60 hover:decoration-sky-300 transition-colors cursor-pointer text-left"
                >
                  {details.templateLinkText}
                </button>
                <span> to start tracking right away!</span>
              </div>
            </div>
          </div>

          {/* Footer Actions: Exactly CANCEL and LOAD ANYWAY */}
          <div className="px-5 sm:px-6 py-3.5 bg-[#0b121c] border-t border-[#233549] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
              <Music className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>{details.statusText}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                id="retro-chip-cancel-btn"
                onClick={onClose}
                className="flex-1 sm:flex-none h-9 px-4 rounded-xl bg-transparent hover:bg-[#1e293b] border border-[#334155] text-xs font-semibold text-[#94a3b8] hover:text-[#f8fafc] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="retro-chip-load-anyway-btn"
                onClick={() => {
                  if (onConfirmLoad) {
                    onConfirmLoad();
                  } else {
                    onClose();
                  }
                }}
                className="flex-1 sm:flex-none h-9 px-5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] hover:from-[#0369a1] hover:to-[#075985] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Load Anyway</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const SidInfoModal = RetroChipInfoModal;
