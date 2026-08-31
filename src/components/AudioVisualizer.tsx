/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../lib/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barsCount?: number;
  theme?: 'dark' | 'light';
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barsCount = 24,
  theme = 'dark',
  className = '',
}) => {
  const isLight = theme === 'light';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const freqData = new Uint8Array(64);

    // Initialize peaks
    if (peaksRef.current.length !== barsCount) {
      peaksRef.current = new Array(barsCount).fill(0);
    }

    const render = () => {
      animId = requestAnimationFrame(render);

      // Get real frequency data from audio engine
      audioEngine.getFrequencyData(freqData);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const totalBars = barsCount;
      const gap = 2;
      const barWidth = (width - gap * (totalBars - 1)) / totalBars;

      // Draw subtle horizontal DB scale grid lines
      ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.6)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = height / 4; y < height; y += height / 4) {
        ctx.beginPath();
        ctx.moveTo(0, Math.floor(y));
        ctx.lineTo(width, Math.floor(y));
        ctx.stroke();
      }

      for (let i = 0; i < totalBars; i++) {
        // Map bar index to exponential frequency curve for audio realism
        const binIndex = Math.floor(Math.pow(i / totalBars, 1.2) * 32);
        const val = freqData[binIndex] || 0;

        const normalizedHeight = val > 0 ? Math.max(2, (val / 255) * height) : 0;
        const x = i * (barWidth + gap);
        const y = height - normalizedHeight;

        // Track peak drop logic
        if (normalizedHeight > peaksRef.current[i]) {
          peaksRef.current[i] = normalizedHeight;
        } else {
          peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.5);
        }

        if (normalizedHeight > 0) {
          // Color gradient: sky bottom -> cyan mid -> amber top -> rose peak
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          if (isLight) {
            grad.addColorStop(0, '#0284c7'); // Sky
            grad.addColorStop(0.5, '#0891b2'); // Cyan
            grad.addColorStop(0.85, '#d97706'); // Amber
            grad.addColorStop(1, '#e11d48'); // Rose
          } else {
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(0.5, '#06b6d4');
            grad.addColorStop(0.85, '#f59e0b');
            grad.addColorStop(1, '#f43f5e');
          }

          ctx.fillStyle = grad;
          ctx.fillRect(x, Math.max(0, y), barWidth, normalizedHeight);
        }

        // Falling Peak Cap LED line
        if (peaksRef.current[i] > 1) {
          const peakY = height - peaksRef.current[i];
          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.fillRect(x, Math.max(0, peakY - 1.5), barWidth, 1.5);
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, barsCount, isLight]);

  return (
    <div className={`flex items-center gap-2.5 border px-3 py-1.5 rounded-lg transition-all shadow-sm ${
      isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#0a0a0a] border-[#222]'
    } ${className}`}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between text-[9px] font-mono font-bold tracking-widest uppercase">
          <span className={isLight ? 'text-sky-700' : 'text-sky-400'}>SPECTRUM</span>
          <span className={`text-[8px] font-normal w-10 text-right ${isLight ? 'text-slate-400' : 'text-gray-600'}`}>
            {isPlaying ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={220}
          height={32}
          className="rounded-sm block"
          title="Audio Frequency Spectrum Visualizer"
        />
      </div>
    </div>
  );
};
