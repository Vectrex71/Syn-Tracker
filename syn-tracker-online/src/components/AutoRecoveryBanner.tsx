/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { RotateCcw, X, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RetroChipSystem } from '../types';
import { CHIP_ICON_MAP, CHIP_LABEL_MAP } from './HeaderControls';

interface AutoRecoveryBannerProps {
  isOpen: boolean;
  backupMeta: {
    name: string;
    updatedAt: string;
    patternCount: number;
    channelsCount: number;
    system?: RetroChipSystem | null;
  } | null;
  onRestore: () => void;
  onDismiss: () => void;
  onCloseBannerOnly: () => void;
}

// Gentle, high-definition retro notification chime (C6 -> E6 -> G6)
function playRecoveryJingle() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const notes = [
      { freq: 1046.50, time: 0.00, dur: 0.18 }, // C6
      { freq: 1318.51, time: 0.09, dur: 0.20 }, // E6
      { freq: 1567.98, time: 0.18, dur: 0.38 }, // G6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(0.055, now + time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  } catch (e) {
    // Autoplay policy fallback
  }
}

export const AutoRecoveryBanner: React.FC<AutoRecoveryBannerProps> = ({
  isOpen,
  backupMeta,
  onRestore,
  onDismiss,
  onCloseBannerOnly,
}) => {
  const hasPlayedJingleRef = useRef(false);

  // Play subtle jingle and trigger 3x attention pulse when shown
  useEffect(() => {
    if (isOpen && backupMeta && !hasPlayedJingleRef.current) {
      hasPlayedJingleRef.current = true;
      const timer = setTimeout(() => {
        playRecoveryJingle();
      }, 150);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      hasPlayedJingleRef.current = false;
    }
  }, [isOpen, backupMeta]);

  const formattedTime = (() => {
    if (!backupMeta?.updatedAt) return '';
    try {
      const d = new Date(backupMeta.updatedAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  const systemKey = backupMeta?.system || 'trk';
  const chipIcon = CHIP_ICON_MAP[systemKey] || '/Icon_TRK.png';
  const chipLabel = CHIP_LABEL_MAP[systemKey] || 'TRK Studio';

  return (
    <AnimatePresence>
      {isOpen && backupMeta && (
        <motion.div
          key="auto-recovery-toast"
          initial={{ y: 150, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ 
            y: 150, 
            opacity: 0, 
            scale: 0.92,
            transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } 
          }}
          transition={{ 
            type: 'spring',
            damping: 20,
            stiffness: 240,
            mass: 0.85
          }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[250] w-[calc(100vw-2rem)] sm:w-[380px] max-w-sm pointer-events-auto"
        >
          {/* 3x Attention Glowing Aura */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.9, 0.15, 0.9, 0.15, 0.9, 0],
              scale: [0.98, 1.03, 1.0, 1.03, 1.0, 1.03, 1.0]
            }}
            transition={{ duration: 2.2, times: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1], ease: 'easeInOut' }}
            className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#38bdf8] via-[#34d399] to-[#38bdf8] opacity-60 blur-md pointer-events-none"
          />

          <div className="relative overflow-hidden rounded-xl border border-[#38bdf8]/45 bg-[#0b1322]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.2)] p-3.5 text-white select-none">
            {/* Top Glowing Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent opacity-90" />

            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* 3x Blinking Ping Dot */}
                <motion.span 
                  animate={{ scale: [1, 1.5, 1, 1.5, 1, 1.5, 1] }}
                  transition={{ duration: 2.0, times: [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1] }}
                  className="w-2 h-2 rounded-full bg-[#34d399] inline-block shrink-0 shadow-[0_0_10px_#34d399]" 
                />
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#38bdf8] truncate font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                  Auto-Save Backup
                </span>
                {formattedTime && (
                  <span className="text-[10px] text-[#94a3b8] px-1.5 py-0.2 bg-[#1e293b]/80 rounded border border-[#334155]/60 flex items-center gap-1 shrink-0 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {formattedTime}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onCloseBannerOnly}
                className="p-1 -mr-1 text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1e293b] rounded transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#0e1726] border border-[#38bdf8]/35 flex items-center justify-center shrink-0 p-1 shadow-inner">
                <img 
                  src={chipIcon} 
                  alt={chipLabel}
                  className="w-full h-full object-contain filter drop-shadow"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#f8fafc] truncate">
                  "{backupMeta.name || 'Untitled Session'}"
                </div>
                <div className="text-[10px] text-[#94a3b8] flex items-center gap-1 mt-0.5 truncate font-mono">
                  <span className="text-[#38bdf8] font-semibold">{chipLabel}</span>
                  <span>•</span>
                  <span>{backupMeta.channelsCount} Tracks</span>
                  <span>•</span>
                  <span>{backupMeta.patternCount} {backupMeta.patternCount === 1 ? 'Pattern' : 'Patterns'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-[#1e293b]/70">
              <button
                type="button"
                onClick={onDismiss}
                className="px-2.5 py-1 text-[11px] font-medium text-[#94a3b8] hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 rounded transition-colors cursor-pointer"
                title="Discard & delete backup"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={onRestore}
                className="px-3.5 py-1.5 text-[11px] font-bold text-[#09101d] bg-gradient-to-r from-[#38bdf8] to-[#34d399] hover:from-[#7dd3fc] hover:to-[#6ee7b7] rounded-md transition-all shadow-[0_0_16px_rgba(56,189,248,0.4)] hover:scale-[1.03] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
