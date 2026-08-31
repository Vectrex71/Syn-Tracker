/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Disc } from 'lucide-react';

interface MobileUnsupportedScreenProps {
  onBackToLanding?: () => void;
}

export function isSmartphoneDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Explicitly check for phones vs tablets
  const isPhoneUA = /iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (/Android/i.test(ua) && /Mobile/i.test(ua));
  
  // iPads and large tablets have screen width >= 768px or maxTouchPoints with large screen
  const isSmallScreen = window.innerWidth < 768 && (window.innerHeight > window.innerWidth || window.innerWidth < 640);

  return isPhoneUA || isSmallScreen;
}

export const MobileUnsupportedScreen: React.FC<MobileUnsupportedScreenProps> = ({ onBackToLanding }) => {
  return (
    <div className="fixed inset-0 z-[9999] text-slate-200 flex flex-col justify-between overflow-y-auto font-sans p-5 select-none bg-[#445166]">
      {/* Studio Wallpaper Background with exact same s/w/grau/blau luminosity color toning */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-65 mix-blend-luminosity filter brightness-95 contrast-105"
        style={{ 
          backgroundImage: `url('/Studiopaper.jpeg')`
        }}
      />

      {/* Ambient subtle vignette overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#141d27]/90 backdrop-blur-sm border border-[#27364a]/80 flex items-center justify-center shrink-0 shadow-inner text-sky-400">
            <Disc className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white font-mono text-sm leading-none block">SYN-TRACKER</span>
            <span className="text-[10px] text-slate-400 font-mono">Desktop Studio</span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-500/30">
          Mobile Gate
        </span>
      </header>

      {/* Main Content Box */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto py-6 flex flex-col items-center text-center">
        {/* Graphic */}
        <div className="mb-5 flex flex-col items-center">
          <div className="p-2.5 rounded-2xl bg-[#0c131f]/90 border border-slate-800/90 shadow-2xl backdrop-blur-sm overflow-hidden">
            <img
              src="/Smombie.png"
              alt="Smartphone usage not supported"
              className="w-48 sm:w-56 max-w-[75vw] h-auto object-contain rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="mt-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-500/30">
            Keyboard & Desktop Required
          </span>
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-bold text-white mb-1.5 tracking-tight">
          Studio Optimized for Desktop & Keyboard
        </h1>
        
        {/* Subtitle */}
        <p className="text-xs text-slate-400 font-mono mb-4 leading-relaxed">
          SYN-Tracker is a full-featured audio workstation and chiptune tracker.
        </p>

        {/* Friendly explanation card */}
        <div className="w-full bg-[#0c131f]/85 border border-slate-800/90 backdrop-blur-sm rounded-xl p-4 text-left text-xs leading-relaxed space-y-3 mb-5 shadow-lg">
          <p className="text-slate-300">
            The 16-channel pattern matrix sequencing, master DSP effect racks, and tracker note entry require a larger screen and physical keyboard shortcuts.
          </p>

          <div className="pt-2.5 border-t border-white/10 space-y-1 text-slate-400 text-[11px] font-mono">
            <div className="text-white font-semibold mb-1">Recommended Devices:</div>
            <div>• Desktop PC / Mac / Linux / Laptop / Chromebook</div>
            <div>• Tablets with physical keyboard (iPad, Galaxy Tab, Surface)</div>
          </div>
        </div>

        {/* Action Button: Return to Landing Page */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="w-full py-3 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            ← Return to Landing Page
          </button>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full max-w-md mx-auto pt-4 pb-1 border-t border-white/10 flex items-center justify-center">
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
      </footer>
    </div>
  );
};
