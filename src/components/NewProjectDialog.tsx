/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Cpu, 
  ChevronRight,
  Disc
} from 'lucide-react';
import { ChipKitType } from '../lib/chipPresets';

export type NewProjectTemplate = 'empty' | 'amiga' | ChipKitType;

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NewProjectTemplate) => void;
}

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const projectTemplates: {
    id: NewProjectTemplate;
    title: string;
    badge: string;
    badgeColor: string;
    description: string;
    imageSrc?: string;
    fallbackIcon?: React.ReactNode;
    accentColor: string;
  }[] = [
    {
      id: 'empty',
      title: 'SYN-Tracker Format (.TRK)',
      badge: '16-TRK / 32-INST',
      badgeColor: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
      description: 'Flagship 16-track workstation with 32 instrument slots, horizontal scrolling, DSP FX rack, and WAV/MP3 studio rendering.',
      imageSrc: '/Icon_TRK.png',
      fallbackIcon: <Disc className="w-6 h-6 text-[#38bdf8]" />,
      accentColor: '#38bdf8',
    },
    {
      id: 'amiga',
      title: 'Commodore Amiga 500',
      badge: '4-CH .MOD (31-INST)',
      badgeColor: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
      description: 'Authentic Paula 8364 8-bit sound architecture, hardware lowpass crunch, hard stereo panning (switchable to 8 tracks) and 31 sample slots.',
      imageSrc: '/Icon_A500.png',
      fallbackIcon: <Disc className="w-6 h-6 text-[#38bdf8]" />,
      accentColor: '#38bdf8',
    },
    {
      id: 'c64',
      title: 'Commodore 64 (SID)',
      badge: '3-CH SID',
      badgeColor: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
      description: 'MOS SID 6581/8580: 3 hardware voice channels, Dynamic PWM leads, Rob Hubbard arps, filter bass & 16 chip instruments.',
      imageSrc: '/C64.png',
      fallbackIcon: <Cpu className="w-10 h-10 text-[#38bdf8]" />,
      accentColor: '#38bdf8',
    },
    {
      id: 'gameboy',
      title: 'Nintendo GameBoy',
      badge: '4-CH DMG',
      badgeColor: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
      description: 'DMG LR35902 APU: 4 hardware channels (Pulse 1, Pulse 2, Wave, Noise) & 16 custom chiptune instruments.',
      imageSrc: '/GB.png',
      accentColor: '#38bdf8',
    },
    {
      id: 'megadrive',
      title: 'Sega Mega Drive / Genesis',
      badge: '4-CH FM/PSG',
      badgeColor: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
      description: 'Yamaha YM2612 FM + PSG: 4-track chiptune workstation with 16 authentic 16-bit synth instruments.',
      imageSrc: '/Megadrive.png',
      accentColor: '#38bdf8',
    },
    {
      id: 'nes',
      title: 'NES / Famicom',
      badge: '4-CH 2A03',
      badgeColor: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30',
      description: 'Ricoh 2A03: 4 hardware channels (Pulse 1, Pulse 2, Triangle, Noise) with 16 vintage 8-bit instruments.',
      imageSrc: '/NES.png',
      accentColor: '#38bdf8',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="new-project-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none overflow-y-auto"
          onClick={onClose}
        >
          <motion.div 
            key="new-project-dialog-card"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 15, opacity: 0, transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="bg-[#0b1017] border border-[#223044] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col text-[#cbd5e1] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#1c293a] flex items-center justify-between bg-[#0e1520]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#172232] border border-[#2b3d56] flex items-center justify-center text-[#38bdf8] shadow-inner">
              <Plus className="w-4 h-4 text-[#38bdf8]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#f8fafc] font-display flex items-center gap-2">
                <span>Start New Project</span>
              </h2>
              <p className="text-[11px] text-[#94a3b8]">
                Select a blank project or initialize a 16-instrument vintage retro sound system
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748b] hover:text-[#f8fafc] hover:bg-[#1b2636] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Selection List */}
        <div className="p-3 sm:p-3.5 overflow-y-auto custom-scrollbar space-y-2 max-h-[72vh]">
          {projectTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className="group w-full p-2.5 sm:p-3 rounded-lg bg-[#101722] hover:bg-[#141f2e] border border-[#1e2c3e] hover:border-[#38bdf8]/50 text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 shadow-sm hover:shadow-[0_0_15px_rgba(56,189,248,0.08)] relative overflow-hidden"
            >
              {/* Left side: Icon, title, badge & description */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] flex items-center justify-center shrink-0 p-1 bg-[#090e15]/60 rounded-lg border border-[#1b2636]">
                  {template.imageSrc ? (
                    <img 
                      src={template.imageSrc} 
                      alt={template.title} 
                      className="w-full h-full object-contain drop-shadow-md group-hover:scale-108 transition-transform duration-200 filter contrast-110" 
                      onError={(e) => {
                        // If specific image isn't available, show fallback icon
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`fallback-icon items-center justify-center ${template.imageSrc ? 'hidden' : 'flex'}`}
                  >
                    {template.fallbackIcon}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm sm:text-[15px] font-bold text-[#f8fafc] group-hover:text-[#38bdf8] transition-colors font-display truncate">
                      {template.title}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${template.badgeColor}`}>
                      {template.badge}
                    </span>
                  </div>

                  <p className="text-xs text-[#94a3b8] leading-relaxed line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Right side: Action CTA */}
              <div className="shrink-0 flex items-center">
                <div className="px-2.5 py-1.5 rounded-md bg-[#182638] group-hover:bg-[#38bdf8] group-hover:text-[#04121d] text-[#38bdf8] text-[11px] font-bold font-display flex items-center gap-1 transition-all shadow-sm">
                  <span>Select</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2 border-t border-[#1c293a] bg-[#090e15] flex items-center justify-between text-[11px] text-[#64748b]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
            <span>Sound system presets load 16 ready-to-play instruments.</span>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded hover:bg-[#16202e] text-[#94a3b8] hover:text-[#f8fafc] text-xs font-medium cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
