/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-Precision Audio DSP & Sample Manipulation Suite for SYN-Editor
 * Provides offline processing for Echo, Phaser, Chorus/Flanger, Entrauschen (Noise Reduction),
 * Robot Voice / Metallic Ring-Modulator, Fade Curves, and Sample Merging / Sequential Concatenation.
 */

// Helper to clone or create an AudioBuffer
export function createEmptyBuffer(
  ctx: BaseAudioContext | AudioContext,
  numberOfChannels: number,
  length: number,
  sampleRate: number
): AudioBuffer {
  return ctx.createBuffer(
    Math.max(1, numberOfChannels),
    Math.max(1, length),
    sampleRate || 44100
  );
}

export function duplicateAudioBuffer(
  ctx: BaseAudioContext | AudioContext,
  src: AudioBuffer
): AudioBuffer {
  const dest = createEmptyBuffer(ctx, src.numberOfChannels, src.length, src.sampleRate);
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    dest.getChannelData(ch).set(src.getChannelData(ch));
  }
  return dest;
}

// ---------------------------------------------------------------------------
// 1. ECHO / STEREO PING-PONG DELAY
// ---------------------------------------------------------------------------
export interface EchoParams {
  delayTimeMs: number;       // 10 to 1500 ms
  feedback: number;          // 0 to 0.90 (0% to 90%)
  wetMix: number;            // 0 to 1.0 (0% to 100%)
  dryMix: number;            // 0 to 1.0
  dampingHz: number;         // High-frequency damping, e.g. 1000 to 20000 Hz
  pingPong: boolean;         // Alternates stereo bounce between L and R
}

export function applyEchoDsp(
  ctx: BaseAudioContext | AudioContext,
  sourceBuffer: AudioBuffer,
  params: EchoParams,
  selection?: { start: number; end: number } | null
): AudioBuffer {
  const { delayTimeMs, feedback, wetMix, dryMix, dampingHz, pingPong } = params;
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  
  // Calculate delay in samples
  const delaySamples = Math.max(1, Math.round((delayTimeMs / 1000) * sampleRate));
  
  // Calculate tail extension length if applying to full buffer
  const isFullBuffer = !selection;
  const tailSamples = isFullBuffer && feedback > 0.05 ? Math.min(sampleRate * 4, Math.round(delaySamples * (1 / (1 - Math.min(0.85, feedback))) * 1.5)) : 0;
  const totalLength = sourceBuffer.length + tailSamples;

  const outChannels = Math.max(numChannels, pingPong ? 2 : 1);
  const resultBuffer = createEmptyBuffer(ctx, outChannels, totalLength, sampleRate);

  const startSample = selection ? Math.min(selection.start, selection.end) : 0;
  const endSample = selection ? Math.max(selection.start, selection.end) : sourceBuffer.length;

  // Damping one-pole filter coefficient: y[n] = y[n-1] + alpha * (x[n] - y[n-1])
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * Math.max(200, Math.min(20000, dampingHz)));
  const alpha = dt / (rc + dt);

  for (let ch = 0; ch < outChannels; ch++) {
    const inCh = Math.min(ch, numChannels - 1);
    const srcData = sourceBuffer.getChannelData(inCh);
    const dstData = resultBuffer.getChannelData(ch);

    // Copy original dry signal
    for (let i = 0; i < sourceBuffer.length; i++) {
      if (i >= startSample && i < endSample) {
        dstData[i] = srcData[i] * dryMix;
      } else {
        dstData[i] = srcData[i];
      }
    }

    // Delay buffer line
    const delayBuffer = new Float32Array(delaySamples + 1);
    let delayWriteIdx = 0;
    let filterState = 0;

    const channelDelayOffset = pingPong && ch === 1 ? Math.floor(delaySamples / 2) : 0;

    for (let i = startSample; i < totalLength; i++) {
      const srcSample = i < endSample ? srcData[i] : 0;

      // Read from delay line with ping-pong offset
      const readIdx = (delayWriteIdx - delaySamples + channelDelayOffset + delayBuffer.length) % delayBuffer.length;
      let delayedVal = delayBuffer[readIdx];

      // Apply lowpass damping filter
      filterState = filterState + alpha * (delayedVal - filterState);
      delayedVal = filterState;

      // Feed into destination
      if (i >= startSample + delaySamples / 2 || i < sourceBuffer.length) {
        dstData[i] += delayedVal * wetMix;
      }

      // Write back with feedback
      delayBuffer[delayWriteIdx] = srcSample + delayedVal * feedback;
      delayWriteIdx = (delayWriteIdx + 1) % delayBuffer.length;
    }
  }

  return resultBuffer;
}

// ---------------------------------------------------------------------------
// 2. MULTI-STAGE ANALOG PHASER & CHORUS / FLANGER
// ---------------------------------------------------------------------------
export interface PhaserParams {
  stages: number;          // 4, 6, 8, 12 stages
  rateHz: number;          // 0.05 to 10.0 Hz LFO speed
  depthHz: number;         // 100 to 4000 Hz sweep depth
  baseFreqHz: number;      // 200 to 2000 Hz base frequency
  feedback: number;        // -0.85 to +0.85
  wetMix: number;          // 0 to 1.0
  stereoPhaseDeg: number;  // 0 to 180 degrees (quadrature stereo width)
}

export function applyPhaserDsp(
  ctx: BaseAudioContext | AudioContext,
  sourceBuffer: AudioBuffer,
  params: PhaserParams,
  selection?: { start: number; end: number } | null
): AudioBuffer {
  const { stages, rateHz, depthHz, baseFreqHz, feedback, wetMix, stereoPhaseDeg } = params;
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const resultBuffer = duplicateAudioBuffer(ctx, sourceBuffer);

  const startSample = selection ? Math.min(selection.start, selection.end) : 0;
  const endSample = selection ? Math.max(selection.start, selection.end) : sourceBuffer.length;

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const dstData = resultBuffer.getChannelData(ch);

    // Initialize allpass filter memory: [stage][2]
    const allpassMem = new Float32Array(stages);
    const allpassInMem = new Float32Array(stages);
    let fbState = 0;

    const channelPhaseOffset = (ch * (stereoPhaseDeg * Math.PI / 180));

    for (let i = startSample; i < endSample; i++) {
      const dryVal = srcData[i];

      // LFO calculation: sinusoidal modulation
      const t = (i - startSample) / sampleRate;
      const lfo = 0.5 * (1 + Math.sin(2 * Math.PI * rateHz * t + channelPhaseOffset));
      const currentCutoff = Math.max(50, Math.min(sampleRate * 0.45, baseFreqHz + lfo * depthHz));

      // Calculate 1st order allpass coefficient: a1 = (tan(pi*fc/fs) - 1) / (tan(pi*fc/fs) + 1)
      const omega = Math.tan((Math.PI * currentCutoff) / sampleRate);
      const a1 = (omega - 1) / (omega + 1);

      // Input with feedback loop
      let stageInput = dryVal + fbState * feedback;

      for (let s = 0; s < stages; s++) {
        // Allpass 1st order difference equation: y[n] = a1 * x[n] + x[n-1] - a1 * y[n-1]
        const stageOutput = a1 * stageInput + allpassInMem[s] - a1 * allpassMem[s];
        allpassInMem[s] = stageInput;
        allpassMem[s] = stageOutput;
        stageInput = stageOutput;
      }

      fbState = stageInput;

      // Mix wet allpass phase-shifted signal with dry
      dstData[i] = dryVal * (1 - wetMix * 0.5) + stageInput * wetMix * 0.7;
    }
  }

  return resultBuffer;
}

// ---------------------------------------------------------------------------
// 3. ENTRAUSCHEN / SPECTRAL NOISE REDUCTION & DYNAMIC DE-HISS
// ---------------------------------------------------------------------------
export interface DenoiseParams {
  thresholdDb: number;       // -80 to -10 dB noise floor threshold
  reductionAmountDb: number; // 6 to 48 dB of noise attenuation
  hissCutoffHz: number;      // 3000 to 18000 Hz high-frequency de-hiss
  attackMs: number;          // 1 to 50 ms
  releaseMs: number;         // 20 to 300 ms
}

export function applyDenoiseDsp(
  ctx: BaseAudioContext | AudioContext,
  sourceBuffer: AudioBuffer,
  params: DenoiseParams,
  selection?: { start: number; end: number } | null
): AudioBuffer {
  const { thresholdDb, reductionAmountDb, hissCutoffHz, attackMs, releaseMs } = params;
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const resultBuffer = duplicateAudioBuffer(ctx, sourceBuffer);

  const startSample = selection ? Math.min(selection.start, selection.end) : 0;
  const endSample = selection ? Math.max(selection.start, selection.end) : sourceBuffer.length;

  const threshLinear = Math.pow(10, thresholdDb / 20);
  const minGainLinear = Math.pow(10, -reductionAmountDb / 20);

  // Attack and release coefficients
  const attackCoeff = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const releaseCoeff = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));

  // High-frequency hiss attenuation filter (2nd order Butterworth lowpass)
  const f0 = Math.min(sampleRate * 0.45, Math.max(1000, hissCutoffHz));
  const q = 0.707;
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const alphaHiss = Math.sin(w0) / (2 * q);
  const cosw0 = Math.cos(w0);

  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alphaHiss;
  const a1 = -2 * cosw0;
  const a2 = 1 - alphaHiss;

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const dstData = resultBuffer.getChannelData(ch);

    let env = 0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = startSample; i < endSample; i++) {
      const sample = srcData[i];
      const absVal = Math.abs(sample);

      // Envelope follower with soft knee
      if (absVal > env) {
        env = attackCoeff * env + (1 - attackCoeff) * absVal;
      } else {
        env = releaseCoeff * env + (1 - releaseCoeff) * absVal;
      }

      // Compute dynamic gain gate
      let gain = 1.0;
      if (env < threshLinear) {
        // Below noise threshold: apply smooth attenuation curve
        const ratio = Math.max(0, env / Math.max(1e-6, threshLinear));
        gain = minGainLinear + (1 - minGainLinear) * (ratio * ratio);
      }

      // High-frequency hiss filter
      const filtered = nb0 * sample + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
      x2 = x1;
      x1 = sample;
      y2 = y1;
      y1 = filtered;

      // Blend filtered de-hissed signal based on gate gain
      const gatedSample = (sample * 0.6 + filtered * 0.4) * gain;
      dstData[i] = gatedSample;
    }
  }

  return resultBuffer;
}

// ---------------------------------------------------------------------------
// 4. ROBOTERSTIMME / ROBOT VOICE & METALLIC RING MODULATOR
// ---------------------------------------------------------------------------
export interface RobotVoiceParams {
  carrierFreqHz: number;     // 30 to 800 Hz (e.g. 50Hz Dalek, 120Hz Cyberman, 440Hz Robot)
  carrierWave: 'sine' | 'square' | 'sawtooth' | 'pulse';
  ringModDepth: number;      // 0 to 100%
  metallicResonance: number; // 0 to 100% (Comb filter delay feedback)
  formantBitCrush: number;   // 4 to 16 bits quantization
  wetMix: number;            // 0 to 1.0
}

export function applyRobotVoiceDsp(
  ctx: BaseAudioContext | AudioContext,
  sourceBuffer: AudioBuffer,
  params: RobotVoiceParams,
  selection?: { start: number; end: number } | null
): AudioBuffer {
  const { carrierFreqHz, carrierWave, ringModDepth, metallicResonance, formantBitCrush, wetMix } = params;
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const resultBuffer = duplicateAudioBuffer(ctx, sourceBuffer);

  const startSample = selection ? Math.min(selection.start, selection.end) : 0;
  const endSample = selection ? Math.max(selection.start, selection.end) : sourceBuffer.length;

  // Short comb delay for robotic metallic resonance (2ms to 12ms)
  const combDelaySamples = Math.max(4, Math.round((sampleRate / Math.max(50, carrierFreqHz * 1.8))));
  const combBuffer = new Float32Array(combDelaySamples + 1);
  let combIdx = 0;

  // Bit quantization step
  const quantizeSteps = Math.pow(2, formantBitCrush - 1);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const dstData = resultBuffer.getChannelData(ch);
    let carrierPhase = 0;
    const phaseInc = (2 * Math.PI * carrierFreqHz) / sampleRate;

    for (let i = startSample; i < endSample; i++) {
      const dryVal = srcData[i];

      // 1. Generate carrier wave
      let carrier = 0;
      switch (carrierWave) {
        case 'sine':
          carrier = Math.sin(carrierPhase);
          break;
        case 'square':
          carrier = Math.sin(carrierPhase) >= 0 ? 1 : -1;
          break;
        case 'sawtooth':
          carrier = 2 * ((carrierPhase / (2 * Math.PI)) % 1) - 1;
          break;
        case 'pulse':
          carrier = ((carrierPhase / (2 * Math.PI)) % 1) < 0.25 ? 1 : -1;
          break;
      }
      carrierPhase += phaseInc;
      if (carrierPhase > 2 * Math.PI) carrierPhase -= 2 * Math.PI;

      // 2. Ring modulation
      const modDepthNorm = ringModDepth / 100;
      const ringModulated = dryVal * (1 - modDepthNorm + modDepthNorm * carrier);

      // 3. Metallic comb resonator
      const resNorm = (metallicResonance / 100) * 0.75;
      const readIdx = (combIdx - combDelaySamples + combBuffer.length) % combBuffer.length;
      const combDelayed = combBuffer[readIdx];
      const combOut = ringModulated + combDelayed * resNorm;
      combBuffer[combIdx] = combOut;
      combIdx = (combIdx + 1) % combBuffer.length;

      // 4. Robotic bit quantization / formant grit
      let crushed = combOut;
      if (formantBitCrush < 16) {
        crushed = Math.round(crushed * quantizeSteps) / quantizeSteps;
      }

      // 5. Wet/dry blend
      dstData[i] = dryVal * (1 - wetMix) + crushed * wetMix;
    }
  }

  return resultBuffer;
}

// ---------------------------------------------------------------------------
// 5. FADE IN & FADE OUT WITH MULTIPLE CURVES
// ---------------------------------------------------------------------------
export type FadeType = 'in' | 'out';
export type FadeCurve = 'linear' | 'exponential' | 'scurve' | 'logarithmic';

export function applyFadeCurveDsp(
  ctx: BaseAudioContext | AudioContext,
  sourceBuffer: AudioBuffer,
  type: FadeType,
  curve: FadeCurve,
  selection?: { start: number; end: number } | null
): AudioBuffer {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const resultBuffer = duplicateAudioBuffer(ctx, sourceBuffer);

  const startSample = selection ? Math.min(selection.start, selection.end) : 0;
  const endSample = selection ? Math.max(selection.start, selection.end) : sourceBuffer.length;
  const fadeLength = Math.max(1, endSample - startSample);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const dstData = resultBuffer.getChannelData(ch);

    for (let i = 0; i < fadeLength; i++) {
      const t = i / fadeLength; // 0.0 to 1.0
      let factor = 0;

      switch (curve) {
        case 'linear':
          factor = t;
          break;
        case 'exponential':
          factor = Math.pow(t, 2.2);
          break;
        case 'scurve':
          // Smoothstep Hermite S-Curve: 3t^2 - 2t^3
          factor = t * t * (3 - 2 * t);
          break;
        case 'logarithmic':
          factor = Math.log10(1 + 9 * t);
          break;
      }

      const gain = type === 'in' ? factor : 1.0 - factor;
      dstData[startSample + i] = srcData[startSample + i] * gain;
    }
  }

  return resultBuffer;
}

// ---------------------------------------------------------------------------
// 6. SAMPLE MERGER & CONCATENATION (SAMPLE FUSION STUDIO)
// ---------------------------------------------------------------------------
export type MergeMode = 'mix' | 'append_sequential' | 'prepend_sequential' | 'crossfade_morph';

export interface MergeParams {
  mode: MergeMode;
  bufferAWeight: number;      // 0 to 1.0 (gain for primary sample)
  bufferBWeight: number;      // 0 to 1.0 (gain for secondary sample)
  crossfadeDurationMs: number;// 0 to 1000 ms crossfade time
  silenceGapMs: number;       // 0 to 2000 ms pause between samples in sequential mode
}

export function mergeAudioBuffers(
  ctx: BaseAudioContext | AudioContext,
  bufferA: AudioBuffer,
  bufferB: AudioBuffer,
  params: MergeParams
): AudioBuffer {
  const { mode, bufferAWeight, bufferBWeight, crossfadeDurationMs, silenceGapMs } = params;
  const sampleRate = bufferA.sampleRate;
  const numChannels = Math.max(bufferA.numberOfChannels, bufferB.numberOfChannels);

  // Resample bufferB if sample rates differ
  let resampledBufferB = bufferB;
  if (bufferB.sampleRate !== sampleRate) {
    // Basic linear resampling for bufferB
    const ratio = sampleRate / bufferB.sampleRate;
    const newLen = Math.round(bufferB.length * ratio);
    resampledBufferB = createEmptyBuffer(ctx, bufferB.numberOfChannels, newLen, sampleRate);
    for (let ch = 0; ch < bufferB.numberOfChannels; ch++) {
      const src = bufferB.getChannelData(ch);
      const dst = resampledBufferB.getChannelData(ch);
      for (let i = 0; i < newLen; i++) {
        const srcIdx = i / ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(src.length - 1, idx0 + 1);
        const frac = srcIdx - idx0;
        dst[i] = src[idx0] * (1 - frac) + (src[idx1] || 0) * frac;
      }
    }
  }

  const crossfadeSamples = Math.max(0, Math.round((crossfadeDurationMs / 1000) * sampleRate));
  const silenceSamples = Math.max(0, Math.round((silenceGapMs / 1000) * sampleRate));

  if (mode === 'mix') {
    // Overlap / Layer both samples simultaneously
    const maxLength = Math.max(bufferA.length, resampledBufferB.length);
    const result = createEmptyBuffer(ctx, numChannels, maxLength, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const dataA = bufferA.getChannelData(Math.min(ch, bufferA.numberOfChannels - 1));
      const dataB = resampledBufferB.getChannelData(Math.min(ch, resampledBufferB.numberOfChannels - 1));
      const dst = result.getChannelData(ch);

      for (let i = 0; i < maxLength; i++) {
        const valA = (i < bufferA.length ? dataA[i] : 0) * bufferAWeight;
        const valB = (i < resampledBufferB.length ? dataB[i] : 0) * bufferBWeight;
        dst[i] = valA + valB;
      }
    }
    return result;
  }

  if (mode === 'append_sequential') {
    // Append B right after A with crossfade or silence gap
    const overlap = Math.min(crossfadeSamples, Math.min(bufferA.length, resampledBufferB.length));
    const totalLength = bufferA.length + resampledBufferB.length - overlap + silenceSamples;
    const result = createEmptyBuffer(ctx, numChannels, totalLength, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const dataA = bufferA.getChannelData(Math.min(ch, bufferA.numberOfChannels - 1));
      const dataB = resampledBufferB.getChannelData(Math.min(ch, resampledBufferB.numberOfChannels - 1));
      const dst = result.getChannelData(ch);

      // Write Buffer A up to crossfade point
      const aNonOverlapEnd = bufferA.length - overlap;
      for (let i = 0; i < aNonOverlapEnd; i++) {
        dst[i] = dataA[i] * bufferAWeight;
      }

      // Write Crossfade region if overlap > 0
      for (let i = 0; i < overlap; i++) {
        const t = i / Math.max(1, overlap);
        const gainA = (1 - t) * bufferAWeight;
        const gainB = t * bufferBWeight;
        dst[aNonOverlapEnd + i] = dataA[aNonOverlapEnd + i] * gainA + dataB[i] * gainB;
      }

      // Write remaining Buffer B after crossfade and silence gap
      const bStartIdx = aNonOverlapEnd + overlap + silenceSamples;
      for (let i = overlap; i < resampledBufferB.length; i++) {
        dst[bStartIdx + (i - overlap)] = dataB[i] * bufferBWeight;
      }
    }
    return result;
  }

  if (mode === 'prepend_sequential') {
    // Prepend B before A
    const overlap = Math.min(crossfadeSamples, Math.min(bufferA.length, resampledBufferB.length));
    const totalLength = bufferA.length + resampledBufferB.length - overlap + silenceSamples;
    const result = createEmptyBuffer(ctx, numChannels, totalLength, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const dataA = bufferA.getChannelData(Math.min(ch, bufferA.numberOfChannels - 1));
      const dataB = resampledBufferB.getChannelData(Math.min(ch, resampledBufferB.numberOfChannels - 1));
      const dst = result.getChannelData(ch);

      // Write Buffer B
      const bNonOverlapEnd = resampledBufferB.length - overlap;
      for (let i = 0; i < bNonOverlapEnd; i++) {
        dst[i] = dataB[i] * bufferBWeight;
      }

      // Crossfade region
      for (let i = 0; i < overlap; i++) {
        const t = i / Math.max(1, overlap);
        const gainB = (1 - t) * bufferBWeight;
        const gainA = t * bufferAWeight;
        dst[bNonOverlapEnd + i] = dataB[bNonOverlapEnd + i] * gainB + dataA[i] * gainA;
      }

      // Write remaining Buffer A
      const aStartIdx = bNonOverlapEnd + overlap + silenceSamples;
      for (let i = overlap; i < bufferA.length; i++) {
        dst[aStartIdx + (i - overlap)] = dataA[i] * bufferAWeight;
      }
    }
    return result;
  }

  // Crossfade Morph over fixed length
  const targetLength = Math.max(bufferA.length, resampledBufferB.length);
  const result = createEmptyBuffer(ctx, numChannels, targetLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const dataA = bufferA.getChannelData(Math.min(ch, bufferA.numberOfChannels - 1));
    const dataB = resampledBufferB.getChannelData(Math.min(ch, resampledBufferB.numberOfChannels - 1));
    const dst = result.getChannelData(ch);

    for (let i = 0; i < targetLength; i++) {
      const t = i / targetLength;
      // Equal power crossfade
      const gainA = Math.cos(t * 0.5 * Math.PI) * bufferAWeight;
      const gainB = Math.sin(t * 0.5 * Math.PI) * bufferBWeight;
      const valA = i < bufferA.length ? dataA[i] : 0;
      const valB = i < resampledBufferB.length ? dataB[i] : 0;
      dst[i] = valA * gainA + valB * gainB;
    }
  }

  return result;
}
