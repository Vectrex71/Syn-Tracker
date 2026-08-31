/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { audioEngine } from '../lib/audioEngine';

interface TrackSpectrumMeterProps {
  channelIndex: number;
  isMuted?: boolean;
  isSelected?: boolean;
  isPlaying?: boolean;
  className?: string;
}

// Pre-allocated static buffers to avoid GC pressure
const NUM_BARS = 8;
const SEGMENT_HEIGHT = 2.5;
const SEGMENT_GAP = 1;
const TOTAL_PITCH = SEGMENT_HEIGHT + SEGMENT_GAP;

export const TrackSpectrumMeter: React.FC<TrackSpectrumMeterProps> = React.memo(({
  channelIndex,
  isMuted = false,
  isSelected = false,
  isPlaying = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({ width: 0, height: 0, dpr: 1 });
  const peaksRef = useRef<number[]>(new Array(NUM_BARS).fill(0));
  const peakHoldRef = useRef<number[]>(new Array(NUM_BARS).fill(0));
  const currentLevelsRef = useRef<number[]>(new Array(NUM_BARS).fill(0));
  const idleFramesRef = useRef<number>(0);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(32));

  // Measure canvas dimensions safely with ResizeObserver (Zero layout thrashing during rAF)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number | null = null;
    const updateSize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        if (width > 0 && height > 0) {
          sizeRef.current = { width, height, dpr };
          if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
          }
        }
      });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    const freqData = freqDataRef.current;

    const drawIdle = (width: number, height: number, dpr: number) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const gap = 1.5;
      const totalGaps = (NUM_BARS - 1) * gap;
      const barWidth = Math.max(2, (width - totalGaps) / NUM_BARS);
      const numSegments = Math.max(1, Math.floor(height / TOTAL_PITCH));

      for (let i = 0; i < NUM_BARS; i++) {
        const x = i * (barWidth + gap);
        for (let seg = 0; seg < numSegments; seg++) {
          const segY = height - (seg + 1) * TOTAL_PITCH;
          ctx.fillStyle = isMuted ? 'rgba(15, 23, 42, 0.4)' : isSelected ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(x, segY, barWidth, SEGMENT_HEIGHT);
        }
      }

      if (isMuted) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.fillRect(0, height - 1.5, width, 1.5);
      }

      ctx.restore();
    };

    const render = () => {
      if (!isRunning) return;

      const { width, height, dpr } = sizeRef.current;
      if (width <= 0 || height <= 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Check audio activity
      audioEngine.getChannelFrequencyData(channelIndex, freqData);

      let maxVal = 0;
      for (let b = 0; b < 16; b++) {
        if (freqData[b] > maxVal) maxVal = freqData[b];
      }

      // If stopped or muted or totally silent, handle idle sleep
      if (isMuted || (!isPlaying && maxVal === 0)) {
        idleFramesRef.current++;
        if (idleFramesRef.current <= 5) {
          drawIdle(width, height, dpr);
        }
        if (idleFramesRef.current > 15 && !isPlaying) {
          // Sleep animation until props or audio changes
          return;
        }
        animId = requestAnimationFrame(render);
        return;
      }

      idleFramesRef.current = 0;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const gap = 1.5;
      const totalGaps = (NUM_BARS - 1) * gap;
      const barWidth = Math.max(2, (width - totalGaps) / NUM_BARS);
      const numSegments = Math.max(1, Math.floor(height / TOTAL_PITCH));

      for (let i = 0; i < NUM_BARS; i++) {
        const binStart = Math.floor(Math.pow(i / NUM_BARS, 1.3) * 16);
        const binEnd = Math.min(31, binStart + 2);
        
        let sum = 0;
        let count = 0;
        for (let b = binStart; b <= binEnd; b++) {
          sum += freqData[b] || 0;
          count++;
        }
        const avg = count > 0 ? sum / count : 0;

        let targetLevel = 0;
        if (avg > 0) {
          targetLevel = Math.pow(avg / 255, 0.72) * height;
        }

        const prevLevel = currentLevelsRef.current[i] || 0;
        if (targetLevel > prevLevel) {
          currentLevelsRef.current[i] = targetLevel;
        } else {
          currentLevelsRef.current[i] = Math.max(0, prevLevel - (height * 0.12 + 1.0));
        }

        const barHeight = currentLevelsRef.current[i];

        // Peak Hold Gravity Falloff
        if (barHeight >= (peaksRef.current[i] || 0)) {
          peaksRef.current[i] = barHeight;
          peakHoldRef.current[i] = 10;
        } else {
          if (peakHoldRef.current[i] > 0) {
            peakHoldRef.current[i]--;
          } else {
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - 1.5);
          }
        }

        const peakVal = peaksRef.current[i] || 0;
        const x = i * (barWidth + gap);

        // Draw dark background segments
        for (let seg = 0; seg < numSegments; seg++) {
          const segY = height - (seg + 1) * TOTAL_PITCH;
          ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(x, segY, barWidth, SEGMENT_HEIGHT);
        }

        // Draw active LED segments
        const activeSegments = Math.round((barHeight / height) * numSegments);

        for (let seg = 0; seg < activeSegments; seg++) {
          const segY = height - (seg + 1) * TOTAL_PITCH;
          const progress = seg / numSegments;

          let segColor = '#0284c7';
          if (progress > 0.3) segColor = '#38bdf8';
          if (progress > 0.6) segColor = '#34d399';
          if (progress > 0.8) segColor = '#fbbf24';
          if (progress > 0.9) segColor = '#f43f5e';

          ctx.fillStyle = segColor;
          ctx.fillRect(x, segY, barWidth, SEGMENT_HEIGHT);
        }

        // Draw Peak-Hold Indicator
        if (peakVal > 2) {
          const peakY = Math.max(0, height - peakVal);
          const progress = peakVal / height;

          let peakColor = '#38bdf8';
          if (progress > 0.5) peakColor = '#34d399';
          if (progress > 0.75) peakColor = '#fbbf24';
          if (progress > 0.9) peakColor = '#fb7185';

          ctx.fillStyle = peakColor;
          ctx.fillRect(x, Math.floor(peakY), barWidth, 1.5);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [channelIndex, isMuted, isSelected, isPlaying]);

  return (
    <div className={`w-full h-full min-h-[16px] min-w-0 flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', minWidth: 0, display: 'block' }}
        className="w-full h-full block pointer-events-none select-none"
      />
    </div>
  );
});
