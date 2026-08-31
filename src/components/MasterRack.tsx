/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Sliders, Volume2, X } from 'lucide-react';
import { audioEngine, MasterFxSettings } from '../lib/audioEngine';

interface MasterRackProps {
  isOpen: boolean;
  isPlaying: boolean;
  onClose: () => void;
}

export const MasterRack: React.FC<MasterRackProps> = ({
  isOpen,
  isPlaying,
  onClose,
}) => {
  const scopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fx, setFx] = useState<MasterFxSettings>({ ...audioEngine.fxSettings });
  const [scopeMode, setScopeMode] = useState<'wave' | 'spectrum'>('spectrum');

  // Sync state changes with audio engine
  const updateFx = (updated: Partial<MasterFxSettings>) => {
    setFx((prev) => {
      const next = { ...prev, ...updated };
      audioEngine.updateMasterFx(updated);
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) {
      audioEngine.init();
      setFx({ ...audioEngine.fxSettings });
    }
  }, [isOpen]);

  // Real-time Oscilloscope & Spectrum Visualizer
  useEffect(() => {
    let animId: number;
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      // Clear background
      ctx.fillStyle = '#080c10';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let x = 20; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 15; y < height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (!audioEngine.analyser) return;

      const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#38bdf8';

      if (scopeMode === 'spectrum') {
        const bufferLength = audioEngine.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioEngine.analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height - 4);

          ctx.fillStyle = themeColor;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
          if (x > width) break;
        }
      } else {
        // Oscilloscope Waveform Mode
        const bufferLength = audioEngine.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        audioEngine.analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = themeColor;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, scopeMode]);

  if (!isOpen) return null;

  return (
    <div className="rounded-lg p-3.5 select-none glass-panel text-[#cbd5e1] mb-3">
      {/* Rack Title Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#18222e]/80 text-[#38bdf8] flex items-center justify-center border border-[#2b3a4d]">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold tracking-wide text-xs uppercase text-[#f1f5f9]">
              MASTER HARDWARE RACK & FX BUS
            </h3>
            <p className="text-[10px] text-[#64748b]">
              Stereo Echo • Room Reverb • Resonant Filter • Amiga Paula Saturation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Mode Switcher */}
          <div className="flex items-center bg-[#0a0e14]/70 p-0.5 rounded-md border border-white/10 text-[11px] gap-1">
            <button
              onClick={() => setScopeMode('spectrum')}
              className={`h-6 px-2.5 rounded font-medium cursor-pointer aqua-gloss ${
                scopeMode === 'spectrum' ? 'aqua-blue' : 'aqua-dark'
              }`}
            >
              Spectrum
            </button>
            <button
              onClick={() => setScopeMode('wave')}
              className={`h-6 px-2.5 rounded font-medium cursor-pointer aqua-gloss ${
                scopeMode === 'wave' ? 'aqua-blue' : 'aqua-dark'
              }`}
            >
              Oscilloscope
            </button>
          </div>

          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center cursor-pointer aqua-gloss aqua-dark text-[#94a3b8] hover:text-white"
            title="Close FX Rack"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rack Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
        
        {/* Module 1: Live Hardware Scope */}
        <div className="p-2.5 rounded border border-white/10 bg-[#0a0e14]/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#94a3b8]">MASTER SCOPE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          </div>
          <canvas
            ref={scopeCanvasRef}
            width={220}
            height={80}
            className="w-full h-[80px] rounded block border border-white/10"
          />
          <div className="flex justify-between text-[9px] text-[#64748b] mt-1">
            <span>20 Hz</span>
            <span>1 kHz</span>
            <span>20 kHz</span>
          </div>
        </div>

        {/* Module 2: Stereo Echo / Delay */}
        <div className="p-3 rounded border border-white/10 bg-[#0e131a]/60 backdrop-blur-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              STEREO DELAY
            </span>
            <input
              type="checkbox"
              checked={fx.delayEnabled}
              onChange={(e) => updateFx({ delayEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#38bdf8] rounded cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>TIME</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.delayTime * 1000)}ms</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.025}
                disabled={!fx.delayEnabled}
                value={fx.delayTime}
                onChange={(e) => updateFx({ delayTime: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>FEEDBACK</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.delayFeedback * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.85}
                step={0.05}
                disabled={!fx.delayEnabled}
                value={fx.delayFeedback}
                onChange={(e) => updateFx({ delayFeedback: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>WET MIX</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.delayWet * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.05}
                disabled={!fx.delayEnabled}
                value={fx.delayWet}
                onChange={(e) => updateFx({ delayWet: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>
          </div>
        </div>

        {/* Module 3: Studio Reverb */}
        <div className="p-3 rounded border border-white/10 bg-[#0e131a]/60 backdrop-blur-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              SPACE REVERB
            </span>
            <input
              type="checkbox"
              checked={fx.reverbEnabled}
              onChange={(e) => updateFx({ reverbEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#38bdf8] rounded cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>ROOM SIZE</span>
                <span className="font-bold text-[#f1f5f9]">{fx.reverbSize.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4.5}
                step={0.25}
                disabled={!fx.reverbEnabled}
                value={fx.reverbSize}
                onChange={(e) => updateFx({ reverbSize: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>WET MIX</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.reverbWet * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.05}
                disabled={!fx.reverbEnabled}
                value={fx.reverbWet}
                onChange={(e) => updateFx({ reverbWet: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>
          </div>
        </div>

        {/* Module 4: Resonant Analog Filter */}
        <div className="p-3 rounded border border-white/10 bg-[#0e131a]/60 backdrop-blur-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              RESONANT FILTER
            </span>
            <input
              type="checkbox"
              checked={fx.filterEnabled}
              onChange={(e) => updateFx({ filterEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#38bdf8] rounded cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
              {(['lowpass', 'bandpass', 'highpass'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => updateFx({ filterType: type })}
                  className={`py-0.5 rounded uppercase cursor-pointer transition-colors ${
                    fx.filterType === type
                      ? 'bg-[#38bdf8] text-[#0f172a] font-bold'
                      : 'bg-[#151c26] text-[#64748b] hover:text-white'
                  }`}
                >
                  {type === 'lowpass' ? 'LP' : type === 'bandpass' ? 'BP' : 'HP'}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>CUTOFF</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.filterCutoff)} Hz</span>
              </div>
              <input
                type="range"
                min={200}
                max={18000}
                step={100}
                disabled={!fx.filterEnabled}
                value={fx.filterCutoff}
                onChange={(e) => updateFx({ filterCutoff: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>RESONANCE</span>
                <span className="font-bold text-[#f1f5f9]">{fx.filterResonance.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={12}
                step={0.1}
                disabled={!fx.filterEnabled}
                value={fx.filterResonance}
                onChange={(e) => updateFx({ filterResonance: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>
          </div>
        </div>

        {/* Module 5: Amiga Paula & Master Output */}
        <div className="p-3 rounded border border-white/10 bg-[#0e131a]/60 backdrop-blur-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              AMIGA PAULA & MASTER
            </span>
            <Volume2 className="w-3.5 h-3.5 text-[#38bdf8]" />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>STEREO SEPARATION</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.stereoWidth * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.05}
                value={fx.stereoWidth}
                onChange={(e) => updateFx({ stereoWidth: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>PAULA SATURATION</span>
                <span className="font-bold text-[#f1f5f9]">{fx.saturationDrive}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={fx.saturationDrive}
                onChange={(e) => {
                  const drive = parseInt(e.target.value, 10);
                  updateFx({ saturationDrive: drive, saturationEnabled: drive > 0 });
                  audioEngine.updateSaturationCurve(drive);
                }}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-[#64748b] mb-0.5">
                <span>MASTER GAIN</span>
                <span className="font-bold text-[#f1f5f9]">{Math.round(fx.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.02}
                value={fx.masterVolume}
                onChange={(e) => updateFx({ masterVolume: parseFloat(e.target.value) })}
                className="w-full accent-[#38bdf8] h-1.5 bg-[#1e2733] rounded"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
