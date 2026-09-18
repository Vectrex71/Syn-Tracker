/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Disc, Waves, Film, Palette } from 'lucide-react';

export type AppPersona = 'tracker' | 'editor' | 'visualizer' | 'cover';

interface PersonaSwitcherProps {
  activePersona: AppPersona;
  onSelectPersona: (persona: AppPersona) => void;
  showLabels?: boolean;
  className?: string;
}

export const PersonaSwitcher: React.FC<PersonaSwitcherProps> = ({
  activePersona,
  onSelectPersona,
  showLabels = false,
  className = '',
}) => {
  const personas: { id: AppPersona; label: string; shortLabel: string; title: string; icon: React.ReactNode }[] = [
    {
      id: 'tracker',
      label: 'SYN-Tracker',
      shortLabel: 'Tracker',
      title: 'SYN-Tracker Persona (Main DAW & Pattern Sequencer)',
      icon: <Disc className={`w-4 h-4 shrink-0 transition-transform ${activePersona === 'tracker' ? 'animate-spin-slow' : 'group-hover:rotate-45'}`} />,
    },
    {
      id: 'editor',
      label: 'SYN-Editor',
      shortLabel: 'Editor',
      title: 'SYN-Editor Persona (Waveform Audio & DSP FX Studio)',
      icon: <Waves className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'visualizer',
      label: 'SYN-Visualizer',
      shortLabel: 'Visualizer',
      title: 'SYN-Visualizer Persona (Video & Demoscene Studio)',
      icon: <Film className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'cover',
      label: 'SYN-Cover',
      shortLabel: 'Cover',
      title: 'SYN-Cover Persona (Cover Art Designer & MP3 ID3 Studio)',
      icon: <Palette className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-lg bg-[#070b10]/80 border border-[#1e2d42] shadow-inner gap-0.5 select-none ${className}`}
      role="tablist"
      aria-label="Studio Personas Switcher"
    >
      {personas.map((p) => {
        const isActive = activePersona === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectPersona(p.id)}
            className={`group relative h-7 px-2 xl:px-2.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isActive
                ? 'aqua-gloss aqua-theme text-white shadow-sm ring-1 ring-sky-400/40 z-10'
                : 'aqua-gloss aqua-dark text-slate-400 hover:text-white hover:border-sky-500/30'
            }`}
            title={p.title}
          >
            {p.icon}
            {showLabels ? (
              <span className="hidden xl:inline font-display tracking-tight text-[11px]">
                {p.shortLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
