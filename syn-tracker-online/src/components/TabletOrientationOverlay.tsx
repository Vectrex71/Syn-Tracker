/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RotateCcw, Monitor, AlertTriangle, Disc } from 'lucide-react';

export const TabletOrientationOverlay: React.FC = () => {
  const [isTabletPortrait, setIsTabletPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      // Check if device is tablet/iPad size in portrait mode
      const isTabletWidth = width >= 600 && width <= 1050;
      const isTouchOrTablet = 
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        /iPad|Android|Tablet/i.test(navigator.userAgent) ||
        (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

      const detected = isPortrait && (isTabletWidth || (isTouchOrTablet && width < 1050));
      setIsTabletPortrait(detected);
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isTabletPortrait) {
    return null;
  }

  return (
    <aside 
      aria-label="Tablet Orientation Required"
      className="fixed inset-0 z-[99999] bg-[#05080f]/95 backdrop-blur-2xl flex items-center justify-center p-6 select-none animate-fade-in"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[110px]" />
        <div className="w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[90px] -translate-y-20" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#0e1623] border border-[#23354d] rounded-2xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col items-center text-center">
        {/* Animated Rotating Device Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#172335] to-[#0c1420] border border-[#2e4360] flex items-center justify-center shadow-lg shadow-amber-950/40">
            {/* Tablet outline with animated rotation indicator */}
            <div className="relative flex items-center justify-center">
              {/* Vertical Tablet silhouette */}
              <div className="w-9 h-14 rounded-md border-2 border-slate-400/60 bg-[#070b10] flex items-center justify-center relative">
                <div className="w-1.5 h-0.5 bg-slate-500/60 rounded-full absolute top-1" />
                <Disc className="w-4 h-4 text-amber-400 animate-spin-slow opacity-90" />
                <div className="w-1 h-1 bg-slate-500/60 rounded-full absolute bottom-1" />
              </div>

              {/* Rotating Arrow Overlay */}
              <div className="absolute -top-2 -right-3 text-amber-400 animate-pulse">
                <RotateCcw className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
          </div>

          <div className="absolute -bottom-2 -right-2 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full p-1.5 shadow-md">
            <Monitor className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 mb-3 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Landscape Orientation Required
        </span>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mb-2">
          Please Rotate Tablet to Landscape
        </h2>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
          SYN-Tracker is a comprehensive digital audio workstation and multi-track tracker. Navigating the pattern matrix, tracks 01–16, and instrument toolbars requires <strong className="text-amber-300 font-semibold">Landscape Orientation</strong>. Portrait mode is not supported.
        </p>

        {/* Feature Highlights Required */}
        <div className="w-full grid grid-cols-2 gap-2 text-left mb-6 font-mono text-[11px]">
          <div className="p-2.5 rounded-lg bg-[#070b12]/80 border border-[#1b283b] flex items-center gap-2 text-slate-300">
            <span className="text-sky-400 font-bold">●</span>
            <span>Full Pattern Matrix</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070b12]/80 border border-[#1b283b] flex items-center gap-2 text-slate-300">
            <span className="text-amber-400 font-bold">●</span>
            <span>Instrument &amp; DSP FX</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070b12]/80 border border-[#1b283b] flex items-center gap-2 text-slate-300">
            <span className="text-emerald-400 font-bold">●</span>
            <span>Tempo &amp; Stepper</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070b12]/80 border border-[#1b283b] flex items-center gap-2 text-slate-300">
            <span className="text-violet-400 font-bold">●</span>
            <span>Save &amp; Export Hub</span>
          </div>
        </div>

        {/* Mandatory Action Notice - No bypass button */}
        <div className="w-full py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-center gap-2.5 shadow-inner">
          <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 animate-spin-slow" />
          <span className="font-semibold">Rotate device 90° to continue</span>
        </div>
      </div>
    </aside>
  );
};
