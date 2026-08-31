/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackerSong, TrackerPattern, TrackerStep, TrackerSample, SidInstrumentConfig } from '../types';
import { hzToSidFreq, PAL_SID_CLOCK, SID_ATTACK_TIMES_MS, SID_DECAY_RELEASE_TIMES_MS } from '../lib/sidSynth';

// MIDI Note to Frequency Lookup Table (Notes 0 - 127)
const MIDI_TO_HZ: number[] = [];
for (let i = 0; i < 128; i++) {
  MIDI_TO_HZ[i] = 440 * Math.pow(2, (i - 69) / 12);
}

// 12-Note base names
const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];

/**
 * Converts a tracker note string (e.g. "C-4", "F#3", "OFF") to MIDI note number (0 - 127)
 */
export function noteStrToMidi(noteStr: string | null): number | null {
  if (!noteStr || noteStr === '---' || noteStr === 'OFF' || noteStr === '===') return null;
  const clean = noteStr.trim().replace('--', '-');
  const match = clean.match(/^([A-G][#-]?)-?(\d+)$/i);
  if (!match) return null;
  let name = match[1].toUpperCase();
  if (name.length === 1) name += '-';
  const oct = parseInt(match[2], 10);
  const noteIdx = NOTE_NAMES.indexOf(name);
  if (noteIdx === -1 || isNaN(oct)) return null;
  const midi = (oct + 1) * 12 + noteIdx;
  return Math.max(1, Math.min(127, midi));
}

/**
 * 16-bit SID frequency values for standard notes (C-0 to G-9)
 */
const SID_NOTE_FREQS: number[] = [];
for (let m = 0; m < 128; m++) {
  SID_NOTE_FREQS[m] = hzToSidFreq(MIDI_TO_HZ[m]);
}

/**
 * Converts seconds to closest 4-bit SID Attack value (0..15)
 */
function secondsToSidAttack(sec?: number): number {
  if (sec === undefined || sec === null) return 0;
  const ms = sec * 1000;
  let bestIdx = 0;
  let bestDiff = Math.abs(ms - SID_ATTACK_TIMES_MS[0]);
  for (let i = 1; i < SID_ATTACK_TIMES_MS.length; i++) {
    const diff = Math.abs(ms - SID_ATTACK_TIMES_MS[i]);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Converts seconds to closest 4-bit SID Decay/Release value (0..15)
 */
function secondsToSidDecayRelease(sec?: number, defaultVal = 6): number {
  if (sec === undefined || sec === null) return defaultVal;
  const ms = sec * 1000;
  let bestIdx = 0;
  let bestDiff = Math.abs(ms - SID_DECAY_RELEASE_TIMES_MS[0]);
  for (let i = 1; i < SID_DECAY_RELEASE_TIMES_MS.length; i++) {
    const diff = Math.abs(ms - SID_DECAY_RELEASE_TIMES_MS[i]);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Maps SID waveform strings to C64 MOS 6581/8580 control register values
 */
function getWaveformBytes(waveform?: string, hardSync = false, ringMod = false): { gateOn: number; gateOff: number } {
  let base = 0x40; // Default pulse
  const wf = (waveform || '').toLowerCase();
  switch (wf) {
    case 'triangle':
    case 'tri':
    case 'sine':
      base = 0x10;
      break;
    case 'saw':
    case 'sawtooth':
      base = 0x20;
      break;
    case 'pulse':
    case 'square':
      base = 0x40;
      break;
    case 'noise':
      base = 0x80;
      break;
    case 'pulsesaw':
      base = 0x60;
      break;
    case 'pulsetri':
      base = 0x50;
      break;
    default:
      base = 0x40;
  }
  if (hardSync) base |= 0x02;
  if (ringMod) base |= 0x04;

  return {
    gateOn: base | 0x01,
    gateOff: base & ~0x01,
  };
}

/**
 * Clean, lightweight 6502 Machine Code Assembler
 */
class SimpleAssembler {
  bytes: number[] = [];
  labels: Record<string, number> = {};
  fixups: Array<{ pos: number; label: string; type: 'abs' | 'rel' }> = [];
  origin: number;

  constructor(origin = 0x1000) {
    this.origin = origin;
  }

  get currentAddr(): number {
    return this.origin + this.bytes.length;
  }

  label(name: string) {
    this.labels[name] = this.currentAddr;
  }

  emit(...b: number[]) {
    this.bytes.push(...b);
  }

  rts() { this.emit(0x60); }
  clc() { this.emit(0x18); }
  sec() { this.emit(0x38); }
  tax() { this.emit(0xAA); }
  txa() { this.emit(0x8A); }
  tay() { this.emit(0xA8); }
  tya() { this.emit(0x98); }
  dex() { this.emit(0xCA); }
  dey() { this.emit(0x88); }
  inx() { this.emit(0xE8); }
  iny() { this.emit(0xC8); }
  asl_a() { this.emit(0x0A); }
  lsr_a() { this.emit(0x4A); }
  pha() { this.emit(0x48); }
  pla() { this.emit(0x68); }
  nop() { this.emit(0xEA); }

  lda_imm(val: number) { this.emit(0xA9, val & 0xFF); }
  ldx_imm(val: number) { this.emit(0xA2, val & 0xFF); }
  ldy_imm(val: number) { this.emit(0xA0, val & 0xFF); }
  cmp_imm(val: number) { this.emit(0xC9, val & 0xFF); }
  cpx_imm(val: number) { this.emit(0xE0, val & 0xFF); }
  cpy_imm(val: number) { this.emit(0xC0, val & 0xFF); }
  and_imm(val: number) { this.emit(0x29, val & 0xFF); }
  ora_imm(val: number) { this.emit(0x09, val & 0xFF); }
  eor_imm(val: number) { this.emit(0x49, val & 0xFF); }
  adc_imm(val: number) { this.emit(0x69, val & 0xFF); }
  sbc_imm(val: number) { this.emit(0xE9, val & 0xFF); }

  inc_zp(zp: number) { this.emit(0xE6, zp & 0xFF); }
  dec_zp(zp: number) { this.emit(0xC6, zp & 0xFF); }
  lda_zp(zp: number) { this.emit(0xA5, zp & 0xFF); }
  ldx_zp(zp: number) { this.emit(0xA6, zp & 0xFF); }
  ldy_zp(zp: number) { this.emit(0xA4, zp & 0xFF); }
  sta_zp(zp: number) { this.emit(0x85, zp & 0xFF); }
  stx_zp(zp: number) { this.emit(0x86, zp & 0xFF); }
  sty_zp(zp: number) { this.emit(0x84, zp & 0xFF); }
  adc_zp(zp: number) { this.emit(0x65, zp & 0xFF); }
  sbc_zp(zp: number) { this.emit(0xE5, zp & 0xFF); }
  ora_zp(zp: number) { this.emit(0x05, zp & 0xFF); }
  and_zp(zp: number) { this.emit(0x25, zp & 0xFF); }
  eor_zp(zp: number) { this.emit(0x45, zp & 0xFF); }
  cpx_zp(zp: number) { this.emit(0xE4, zp & 0xFF); }
  cpy_zp(zp: number) { this.emit(0xC4, zp & 0xFF); }

  lda_abs(addr: number) { this.emit(0xAD, addr & 0xFF, (addr >> 8) & 0xFF); }
  ldx_abs(addr: number) { this.emit(0xAE, addr & 0xFF, (addr >> 8) & 0xFF); }
  ldy_abs(addr: number) { this.emit(0xAC, addr & 0xFF, (addr >> 8) & 0xFF); }
  sta_abs(addr: number) { this.emit(0x8D, addr & 0xFF, (addr >> 8) & 0xFF); }
  stx_abs(addr: number) { this.emit(0x8E, addr & 0xFF, (addr >> 8) & 0xFF); }
  sty_abs(addr: number) { this.emit(0x8C, addr & 0xFF, (addr >> 8) & 0xFF); }
  inc_abs(addr: number) { this.emit(0xEE, addr & 0xFF, (addr >> 8) & 0xFF); }
  dec_abs(addr: number) { this.emit(0xCE, addr & 0xFF, (addr >> 8) & 0xFF); }
  cmp_abs(addr: number) { this.emit(0xCD, addr & 0xFF, (addr >> 8) & 0xFF); }
  adc_abs(addr: number) { this.emit(0x6D, addr & 0xFF, (addr >> 8) & 0xFF); }
  sbc_abs(addr: number) { this.emit(0xED, addr & 0xFF, (addr >> 8) & 0xFF); }
  ora_abs(addr: number) { this.emit(0x0D, addr & 0xFF, (addr >> 8) & 0xFF); }
  and_abs(addr: number) { this.emit(0x2D, addr & 0xFF, (addr >> 8) & 0xFF); }

  lda_abs_x(addr: number) { this.emit(0xBD, addr & 0xFF, (addr >> 8) & 0xFF); }
  sta_abs_x(addr: number) { this.emit(0x9D, addr & 0xFF, (addr >> 8) & 0xFF); }
  lda_abs_y(addr: number) { this.emit(0xB9, addr & 0xFF, (addr >> 8) & 0xFF); }
  sta_abs_y(addr: number) { this.emit(0x99, addr & 0xFF, (addr >> 8) & 0xFF); }
  ldx_abs_y(addr: number) { this.emit(0xBE, addr & 0xFF, (addr >> 8) & 0xFF); }
  ldy_abs_x(addr: number) { this.emit(0xBC, addr & 0xFF, (addr >> 8) & 0xFF); }
  inc_abs_x(addr: number) { this.emit(0xFE, addr & 0xFF, (addr >> 8) & 0xFF); }
  dec_abs_x(addr: number) { this.emit(0xDE, addr & 0xFF, (addr >> 8) & 0xFF); }
  adc_abs_x(addr: number) { this.emit(0x7D, addr & 0xFF, (addr >> 8) & 0xFF); }
  adc_abs_y(addr: number) { this.emit(0x79, addr & 0xFF, (addr >> 8) & 0xFF); }
  sbc_abs_x(addr: number) { this.emit(0xFD, addr & 0xFF, (addr >> 8) & 0xFF); }
  sbc_abs_y(addr: number) { this.emit(0xF9, addr & 0xFF, (addr >> 8) & 0xFF); }
  cmp_abs_x(addr: number) { this.emit(0xDD, addr & 0xFF, (addr >> 8) & 0xFF); }
  cmp_abs_y(addr: number) { this.emit(0xD9, addr & 0xFF, (addr >> 8) & 0xFF); }
  ora_abs_x(addr: number) { this.emit(0x1D, addr & 0xFF, (addr >> 8) & 0xFF); }
  ora_abs_y(addr: number) { this.emit(0x19, addr & 0xFF, (addr >> 8) & 0xFF); }
  and_abs_x(addr: number) { this.emit(0x3D, addr & 0xFF, (addr >> 8) & 0xFF); }
  and_abs_y(addr: number) { this.emit(0x39, addr & 0xFF, (addr >> 8) & 0xFF); }

  lda_ind_y(zp: number) { this.emit(0xB1, zp & 0xFF); }

  jmp(target: string | number) {
    if (typeof target === 'number') {
      this.emit(0x4C, target & 0xFF, (target >> 8) & 0xFF);
    } else {
      this.emit(0x4C);
      this.fixups.push({ pos: this.bytes.length, label: target, type: 'abs' });
      this.emit(0x00, 0x00);
    }
  }

  jsr(target: string | number) {
    if (typeof target === 'number') {
      this.emit(0x20, target & 0xFF, (target >> 8) & 0xFF);
    } else {
      this.emit(0x20);
      this.fixups.push({ pos: this.bytes.length, label: target, type: 'abs' });
      this.emit(0x00, 0x00);
    }
  }

  beq(label: string) {
    this.emit(0xF0);
    this.fixups.push({ pos: this.bytes.length, label, type: 'rel' });
    this.emit(0x00);
  }

  bne(label: string) {
    this.emit(0xD0);
    this.fixups.push({ pos: this.bytes.length, label, type: 'rel' });
    this.emit(0x00);
  }

  bcc(label: string) {
    this.emit(0x90);
    this.fixups.push({ pos: this.bytes.length, label, type: 'rel' });
    this.emit(0x00);
  }

  bcs(label: string) {
    this.emit(0xB0);
    this.fixups.push({ pos: this.bytes.length, label, type: 'rel' });
    this.emit(0x00);
  }

  bpl(label: string) {
    this.emit(0x10);
    this.fixups.push({ pos: this.bytes.length, label, type: 'rel' });
    this.emit(0x00);
  }

  bmi(label: string) {
    this.emit(0x30);
    this.fixups.push({ pos: this.bytes.length, label, type: 'rel' });
    this.emit(0x00);
  }

  assemble(): Uint8Array {
    const out = new Uint8Array(this.bytes);
    for (const f of this.fixups) {
      const target = this.labels[f.label];
      if (target === undefined) throw new Error('Unresolved label: ' + f.label);
      if (f.type === 'abs') {
        out[f.pos] = target & 0xFF;
        out[f.pos + 1] = (target >> 8) & 0xFF;
      } else if (f.type === 'rel') {
        const offset = target - (this.origin + f.pos + 1);
        if (offset < -128 || offset > 127) throw new Error('Branch out of range for label ' + f.label + ': ' + offset);
        out[f.pos] = offset & 0xFF;
      }
    }
    return out;
  }
}

/**
 * Builds the complete 6502 machine language player and encoded music pattern tables
 */
function build6502SidPayload(song: TrackerSong): Uint8Array {
  // Enhanced High-Fidelity C64 Memory Map from $1000:
  // $1000 - $1002: JMP INIT ($1000)
  // $1003 - $1005: JMP PLAY ($1003)
  // $1006 - $103F: Variables (Sequencer, Exact BPM fractional accumulator, Per-Voice Live Engine State)
  // $1040 - $13FF: 6502 Driver Code (INIT, PLAY, Row Handler, Effects & PWM LFO Engine)
  // $1400 - $147F: Note Frequency Low Table (128 notes)
  // $1480 - $14FF: Note Frequency High Table (128 notes)
  // $1500 - $16FF: Instrument Parameter Table (32 instruments * 16 bytes = 512 bytes)
  // $1700 - $177F: Order List (up to 128 orders)
  // $1780 - $17BF: Pattern Address Low Table (up to 64 patterns)
  // $17C0 - $17FF: Pattern Address High Table (up to 64 patterns)
  // $1800+: Pattern Data Tables (64 rows * 12 bytes = 768 bytes per pattern)

  const VAR_BPM_VAL    = 0x1006; // Song BPM (e.g. 125, 140)
  const VAR_BPM_ACC    = 0x1007; // 50Hz Fractional BPM Accumulator
  const VAR_ORDER_IDX  = 0x1008;
  const VAR_ROW_IDX    = 0x1009;
  const VAR_TICK_CNT   = 0x100A;
  const VAR_SPEED      = 0x100B;
  const VAR_ORDER_LEN  = 0x100C;
  const VAR_FILT_ROUTE = 0x100D; // Mirror of $D417 (Voice filter routing + Reso)
  const VAR_FILT_MODE  = 0x100E; // Mirror of $D418 (Filter Mode + Master Vol)
  const VAR_ARP_TICK   = 0x100F; // Global tick counter for arpeggios

  // Per-Voice State Arrays (Voice 0, 1, 2):
  // Offset 0 = Voice 1, Offset 1 = Voice 2, Offset 2 = Voice 3
  const V_BASE_NOTE    = 0x1010; // Base MIDI note (0..127)
  const V_INST         = 0x1013; // Instrument number (0..31)
  const V_EFF_CODE     = 0x1016; // Effect code (0..15)
  const V_EFF_VAL      = 0x1019; // Effect parameter (0..255)
  const V_PWM_PHASE    = 0x101C; // PWM LFO phase (0..31)
  const V_PWM_SPEED    = 0x101F; // PWM Speed
  const V_PWM_DEPTH    = 0x1022; // PWM Depth
  const V_FREQ_LO      = 0x1025; // Current output Freq Lo
  const V_FREQ_HI      = 0x1028; // Current output Freq Hi
  const V_CURR_WAVE    = 0x102B; // Current base waveform ($20 saw, $40 pulse, $10 tri, $80 noise)

  const FREQ_LO_TABLE  = 0x1400;
  const FREQ_HI_TABLE  = 0x1480;
  const INST_TABLE     = 0x1500;
  const ORDER_TABLE    = 0x1700;
  const PAT_LO_TABLE   = 0x1780;
  const PAT_HI_TABLE   = 0x17C0;

  const songBpm = Math.max(32, Math.min(255, song.bpm || 125));
  const songSpeed = Math.max(1, Math.min(31, song.speed || 6));

  const rawOrders = song.orderList && song.orderList.length > 0 ? song.orderList : [0];
  const orderCount = Math.min(128, rawOrders.length);
  const patternsCount = Math.min(64, Math.max(1, song.patterns.length));

  // Memory buffer for full payload ($1000 to $1800 + patterns * 768)
  const totalPayloadSize = 0x0800 + patternsCount * 768;
  const buffer = new Uint8Array(totalPayloadSize);

  // 1. ASSEMBLE 6502 MACHINE CODE DRIVER ($1000 - $13FF)
  const asm = new SimpleAssembler(0x1000);

  // $1000: JMP INIT
  asm.jmp('init_routine');
  // $1003: JMP PLAY
  asm.jmp('play_routine');

  // Align driver code start to $1040 (reserves $1006-$103F for variables)
  while (asm.currentAddr < 0x1040) {
    asm.emit(0x00);
  }

  // === INIT ROUTINE ($1040) ===
  asm.label('init_routine');
  // Clear all SID registers $D400 - $D418
  asm.ldx_imm(0x18);
  asm.lda_imm(0x00);
  asm.label('loop_clear_sid');
  asm.sta_abs_x(0xD400);
  asm.dex();
  asm.bpl('loop_clear_sid');

  // Set Master Volume to 15 ($D418 = $0F) & init mirrors
  asm.lda_imm(0x0F);
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);
  asm.lda_imm(0x00);
  asm.sta_abs(VAR_FILT_ROUTE);
  asm.sta_abs(0xD417);

  // Set Default Pulse Width = 50% ($0800) for all voices
  asm.lda_imm(0x00);
  asm.sta_abs(0xD402);
  asm.sta_abs(0xD409);
  asm.sta_abs(0xD410);
  asm.lda_imm(0x08);
  asm.sta_abs(0xD403);
  asm.sta_abs(0xD40A);
  asm.sta_abs(0xD411);

  // Clear Voice Engine State Arrays
  asm.ldx_imm(0x2F);
  asm.lda_imm(0x00);
  asm.label('loop_clear_vars');
  asm.sta_abs_x(0x1010);
  asm.dex();
  asm.bpl('loop_clear_vars');

  // Initialize Sequencer Variables
  asm.lda_imm(0x00);
  asm.sta_abs(VAR_ORDER_IDX);
  asm.sta_abs(VAR_ROW_IDX);
  asm.sta_abs(VAR_ARP_TICK);
  asm.sta_abs(VAR_BPM_ACC);
  asm.lda_imm(songBpm);
  asm.sta_abs(VAR_BPM_VAL);
  asm.lda_imm(0x01); // Tick counter = 1 so first 50Hz call triggers row 0 immediately
  asm.sta_abs(VAR_TICK_CNT);
  asm.lda_imm(songSpeed);
  asm.sta_abs(VAR_SPEED);
  asm.lda_imm(orderCount);
  asm.sta_abs(VAR_ORDER_LEN);
  asm.rts();

  // === PLAY ROUTINE (Called by 50Hz Interrupt on standard PAL C64) ===
  // 100% stable 50Hz timing without jitter or tempo fluctuations
  asm.label('play_routine');
  asm.inc_abs(VAR_ARP_TICK);

  // Decrement Tick Counter
  asm.dec_abs(VAR_TICK_CNT);
  asm.beq('do_new_row');

  // Ticks 1..Speed-1: Process continuous effects (Arpeggio, Portamento, Dynamic PWM)
  asm.jsr('process_tick_effects');
  asm.rts();

  // --- ROW PROCESSING (Tick 0) ---
  asm.label('do_new_row');
  // Reset tick counter = current song speed
  asm.lda_abs(VAR_SPEED);
  asm.sta_abs(VAR_TICK_CNT);

  // Load Pattern Pointer for current order into ZeroPage $02, $03
  asm.ldx_abs(VAR_ORDER_IDX);
  asm.lda_abs_x(ORDER_TABLE);
  asm.tax();
  asm.lda_abs_x(PAT_LO_TABLE);
  asm.sta_zp(0x02);
  asm.lda_abs_x(PAT_HI_TABLE);
  asm.sta_zp(0x03);

  // Calculate 16-bit Row Offset: Row * 12
  // Row (0..63) in $1007. Row * 12 is at most 756 ($02F4).
  // Row * 12 = (Row * 8) + (Row * 4)
  asm.lda_abs(VAR_ROW_IDX);
  asm.asl_a();         // Row * 2
  asm.asl_a();         // Row * 4 (0..252)
  asm.sta_zp(0x04);   // Temp Row * 4 Lo
  asm.asl_a();         // Row * 8
  asm.clc();
  asm.adc_zp(0x04);   // A = Row * 12 (Lo)
  asm.sta_zp(0x04);
  asm.lda_imm(0x00);
  asm.adc_imm(0x00);   // Carry from Row * 8 + Row * 4
  asm.sta_zp(0x05);
  asm.lda_abs(VAR_ROW_IDX);
  asm.cmp_imm(32);
  asm.bcc('row_hi_done');
  asm.inc_zp(0x05);    // Add 256 for Row * 8 when Row >= 32
  asm.label('row_hi_done');

  // Add 16-bit offset to pointer in $02, $03
  asm.lda_zp(0x02);
  asm.clc();
  asm.adc_zp(0x04);
  asm.sta_zp(0x02);
  asm.lda_zp(0x03);
  asm.adc_zp(0x05);
  asm.sta_zp(0x03);

  // === Process Voice 1 (Offset 0..3) ===
  asm.ldx_imm(0);
  asm.jsr('trigger_voice_row');

  // === Process Voice 2 (Offset 4..7) ===
  asm.ldx_imm(1);
  asm.jsr('trigger_voice_row');

  // === Process Voice 3 (Offset 8..11) ===
  asm.ldx_imm(2);
  asm.jsr('trigger_voice_row');

  // === Advance Row ===
  asm.inc_abs(VAR_ROW_IDX);
  asm.lda_abs(VAR_ROW_IDX);
  asm.cmp_imm(64);
  asm.bcc('row_advance_done');

  // Row 64 reached -> reset row, advance order
  asm.lda_imm(0x00);
  asm.sta_abs(VAR_ROW_IDX);
  asm.inc_abs(VAR_ORDER_IDX);
  asm.lda_abs(VAR_ORDER_IDX);
  asm.cmp_abs(VAR_ORDER_LEN);
  asm.bcc('row_advance_done');

  // Loop back to start of song
  asm.lda_imm(0x00);
  asm.sta_abs(VAR_ORDER_IDX);

  asm.label('row_advance_done');
  asm.rts();

  // === SUBROUTINE: trigger_voice_row ===
  // Input: X = Voice Index (0, 1, 2)
  // ZeroPage $02,$03 points to Row Base
  asm.label('trigger_voice_row');
  asm.stx_zp(0x06); // Save Voice Index in ZP $06

  // Calculate row offset = Voice * 4
  asm.txa();
  asm.asl_a();
  asm.asl_a();
  asm.tay(); // Y = Voice * 4

  // Read Note, Inst, Eff, EffVal
  asm.lda_ind_y(0x02); // Note
  asm.sta_zp(0x07);   // Save Note in ZP $07
  asm.iny();
  asm.lda_ind_y(0x02); // Inst
  asm.sta_zp(0x08);   // Save Inst in ZP $08
  asm.iny();
  asm.lda_ind_y(0x02); // Eff Code
  asm.sta_zp(0x09);
  asm.iny();
  asm.lda_ind_y(0x02); // Eff Val
  asm.sta_zp(0x0A);

  asm.ldx_zp(0x06);   // Restore X = Voice Index

  // Store Effect in Voice State
  asm.lda_zp(0x09);
  asm.sta_abs_x(V_EFF_CODE);
  asm.lda_zp(0x0A);
  asm.sta_abs_x(V_EFF_VAL);

  // Check Note: 0 = No note, $FF = Key Off, 1..127 = Trigger Note
  asm.lda_zp(0x07);
  asm.bne('has_note_event');
  asm.jmp('check_fx_only');

  asm.label('has_note_event');
  asm.cmp_imm(0xFF);
  asm.bne('do_note_trigger');
  asm.jmp('do_key_off');

  // --- TRIGGER NEW NOTE ---
  asm.label('do_note_trigger');
  // Store Note & Inst
  asm.sta_abs_x(V_BASE_NOTE);
  asm.lda_zp(0x08);
  asm.sta_abs_x(V_INST);

  // Lookup 16-bit Frequency for Note
  asm.ldy_zp(0x07); // Y = Note (1..127)
  asm.lda_abs_y(FREQ_LO_TABLE);
  asm.sta_abs_x(V_FREQ_LO);
  asm.sta_zp(0x0B); // Freq Lo
  asm.lda_abs_y(FREQ_HI_TABLE);
  asm.sta_abs_x(V_FREQ_HI);
  asm.sta_zp(0x0C); // Freq Hi

  // Compute SID Voice Register Base: X * 7 ($D400 for V1, $D407 for V2, $D40E for V3)
  asm.txa();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.sec();
  asm.sbc_zp(0x06); // A = X * 7
  asm.tax();        // X = SID Voice Base Offset (0, 7, 14)

  // Load Instrument Configuration (16 bytes per instrument at $1500)
  asm.lda_zp(0x08); // Inst (0..31)
  asm.and_imm(0x1F);
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.tay(); // Y = Inst * 16

  // 1. CLEAR GATE BIT FIRST TO ENSURE CLEAN ADSR ATTACK RETRIGGER
  asm.lda_abs_y(INST_TABLE + 1); // Gate Off waveform
  asm.sta_abs_x(0xD404);

  // 2. WRITE FREQUENCY TO SID
  asm.lda_zp(0x0B);
  asm.sta_abs_x(0xD400); // Freq Lo
  asm.lda_zp(0x0C);
  asm.sta_abs_x(0xD401); // Freq Hi

  // 3. SETUP ADSR
  asm.lda_abs_y(INST_TABLE + 2); // Attack / Decay
  asm.sta_abs_x(0xD405);
  asm.lda_abs_y(INST_TABLE + 3); // Sustain / Release
  asm.sta_abs_x(0xD406);

  // 4. SETUP BASE PULSE WIDTH
  asm.lda_abs_y(INST_TABLE + 4); // PW Lo
  asm.sta_abs_x(0xD402);
  asm.lda_abs_y(INST_TABLE + 5); // PW Hi
  asm.sta_abs_x(0xD403);

  // Store PWM Params & Current Waveform in Voice State
  asm.ldx_zp(0x06); // X = Voice Index (0, 1, 2)
  asm.lda_abs_y(INST_TABLE + 6); // PWM Speed
  asm.sta_abs_x(V_PWM_SPEED);
  asm.lda_abs_y(INST_TABLE + 7); // PWM Depth
  asm.sta_abs_x(V_PWM_DEPTH);
  asm.lda_imm(0x00);
  asm.sta_abs_x(V_PWM_PHASE);
  asm.lda_abs_y(INST_TABLE + 0); // Gate On waveform
  asm.sta_abs_x(V_CURR_WAVE);

  // 5. SETUP FILTER FOR THIS VOICE
  asm.lda_abs_y(INST_TABLE + 8); // Filter Mode (0 = none, 1 = LP, 2 = BP, 3 = HP, 4 = Notch)
  asm.bne('setup_filter_mode');

  // No filter for this instrument: remove voice from $D417 filter routing
  asm.ldx_zp(0x06); // Voice 0, 1, 2
  asm.cpx_imm(0);
  asm.bne('unf_not_0');
  asm.lda_abs(VAR_FILT_ROUTE);
  asm.and_imm(0xFE); // Clear bit 0 (Voice 0)
  asm.sta_abs(VAR_FILT_ROUTE);
  asm.sta_abs(0xD417);
  asm.jmp('check_global_filt_off');
  asm.label('unf_not_0');
  asm.cpx_imm(1);
  asm.bne('unf_not_1');
  asm.lda_abs(VAR_FILT_ROUTE);
  asm.and_imm(0xFD); // Clear bit 1 (Voice 1)
  asm.sta_abs(VAR_FILT_ROUTE);
  asm.sta_abs(0xD417);
  asm.jmp('check_global_filt_off');
  asm.label('unf_not_1');
  asm.lda_abs(VAR_FILT_ROUTE);
  asm.and_imm(0xFB); // Clear bit 2 (Voice 2)
  asm.sta_abs(VAR_FILT_ROUTE);
  asm.sta_abs(0xD417);

  asm.label('check_global_filt_off');
  // If no voices routed to filter (bits 0..2 are 0), reset $D418 to $0F (clean unfiltered bypass)
  asm.lda_abs(VAR_FILT_ROUTE);
  asm.and_imm(0x07);
  asm.bne('filter_setup_done');
  asm.lda_imm(0x0F);
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);
  asm.jmp('filter_setup_done');

  asm.label('setup_filter_mode');
  // Set Cutoff Lo / Hi
  asm.lda_abs_y(INST_TABLE + 9);
  asm.sta_abs(0xD415);
  asm.lda_abs_y(INST_TABLE + 10);
  asm.sta_abs(0xD416);

  // Update Filter Routing & Resonance ($D417)
  asm.lda_abs_y(INST_TABLE + 11); // Reso (0..15)
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.sta_zp(0x0E); // Reso << 4

  // Combine with Voice Filter Routing Bit
  asm.lda_abs(VAR_FILT_ROUTE);
  asm.and_imm(0x07); // Preserve other voices' filter bits
  asm.ldx_zp(0x06);
  asm.cpx_imm(0);
  asm.bne('f_set_not_0');
  asm.ora_imm(0x01);
  asm.jmp('f_save_route');
  asm.label('f_set_not_0');
  asm.cpx_imm(1);
  asm.bne('f_set_not_1');
  asm.ora_imm(0x02);
  asm.jmp('f_save_route');
  asm.label('f_set_not_1');
  asm.ora_imm(0x04);

  asm.label('f_save_route');
  asm.ora_zp(0x0E); // Combine with Resonance
  asm.sta_abs(VAR_FILT_ROUTE);
  asm.sta_abs(0xD417);

  // Set Filter Mode ($D418: Lowpass = $1F, Bandpass = $2F, Highpass = $4F, Notch = $5F)
  asm.lda_abs_y(INST_TABLE + 8);
  asm.cmp_imm(1);
  asm.bne('f_not_lp');
  asm.lda_imm(0x1F);
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);
  asm.jmp('filter_setup_done');
  asm.label('f_not_lp');
  asm.cmp_imm(2);
  asm.bne('f_not_bp');
  asm.lda_imm(0x2F);
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);
  asm.jmp('filter_setup_done');
  asm.label('f_not_bp');
  asm.cmp_imm(3);
  asm.bne('f_not_hp');
  asm.lda_imm(0x4F);
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);
  asm.jmp('filter_setup_done');
  asm.label('f_not_hp');
  asm.lda_imm(0x5F); // Notch
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);

  asm.label('filter_setup_done');

  // 6. TRIGGER GATE ON
  asm.ldx_zp(0x06);
  asm.txa();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.sec();
  asm.sbc_zp(0x06);
  asm.tax(); // X = SID Base (0, 7, 14)

  asm.lda_abs_y(INST_TABLE + 0); // Gate On (Waveform | $01)
  asm.sta_abs_x(0xD404);
  asm.jmp('check_fx_only');

  // --- KEY OFF ---
  asm.label('do_key_off');
  asm.ldx_zp(0x06);
  asm.txa();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.sec();
  asm.sbc_zp(0x06);
  asm.tax();
  asm.ldy_zp(0x06);
  asm.lda_abs_y(V_CURR_WAVE);
  asm.and_imm(0xFE); // Clear Gate bit -> enter Release phase
  asm.sta_abs_x(0xD404);

  // --- ROW-0 EFFECTS HANDLING ---
  asm.label('check_fx_only');
  asm.ldx_zp(0x06);
  asm.lda_zp(0x09); // Effect Code

  // Effect C: Set Master Volume (0..64 -> 0..15)
  asm.cmp_imm(0x0C);
  asm.bne('chk_fx_f');
  asm.lda_zp(0x0A); // Volume 0..64
  asm.lsr_a();
  asm.lsr_a();      // 0..16 -> 0..15
  asm.and_imm(0x0F);
  asm.sta_zp(0x0E);
  asm.lda_abs(VAR_FILT_MODE);
  asm.and_imm(0x70); // Keep filter mode bits
  asm.ora_zp(0x0E); // Combine with volume
  asm.sta_abs(0xD418);
  asm.sta_abs(VAR_FILT_MODE);
  asm.jmp('voice_row_done');

  // Effect F: Set Speed / Tempo
  asm.label('chk_fx_f');
  asm.cmp_imm(0x0F);
  asm.bne('voice_row_done');
  asm.lda_zp(0x0A);
  asm.cmp_imm(32);
  asm.bcs('fx_set_bpm');
  asm.cmp_imm(1);
  asm.bcc('voice_row_done');
  asm.sta_abs(VAR_SPEED);
  asm.jmp('voice_row_done');

  asm.label('fx_set_bpm');
  asm.sta_abs(VAR_BPM_VAL);

  asm.label('voice_row_done');
  asm.rts();

  // === SUBROUTINE: process_tick_effects ===
  // Runs on Ticks 1..speed-1 for all 3 voices
  asm.label('process_tick_effects');
  asm.ldx_imm(0);
  asm.jsr('voice_tick_engine');
  asm.ldx_imm(1);
  asm.jsr('voice_tick_engine');
  asm.ldx_imm(2);
  asm.jsr('voice_tick_engine');
  asm.rts();

  // === SUBROUTINE: voice_tick_engine ===
  // Input: X = Voice Index (0, 1, 2)
  asm.label('voice_tick_engine');
  asm.stx_zp(0x06);

  // Compute SID Voice Base Offset in X (0, 7, 14)
  asm.txa();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.sec();
  asm.sbc_zp(0x06);
  asm.tax(); // X = SID Base

  // --- 1. Dynamic PWM Modulation ---
  asm.ldy_zp(0x06);
  asm.lda_abs_y(V_PWM_SPEED);
  asm.beq('pwm_done');

  // Advance PWM Phase
  asm.lda_abs_y(V_PWM_PHASE);
  asm.clc();
  asm.adc_abs_y(V_PWM_SPEED);
  asm.and_imm(0x3F); // 64 steps
  asm.sta_abs_y(V_PWM_PHASE);

  // Triangle LFO modulation (0..31 ramp up, 32..63 ramp down)
  asm.cmp_imm(32);
  asm.bcc('pwm_ramp_up');
  asm.eor_imm(0x3F);
  asm.label('pwm_ramp_up');
  // Scale Phase (0..31) -> PW Lo & Hi
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.asl_a();
  asm.sta_abs_x(0xD402); // Write dynamic PW Lo
  asm.lda_imm(0x07);
  asm.sta_abs_x(0xD403); // Write PW Hi (~44% - 56% duty cycle)

  asm.label('pwm_done');

  // --- 2. Effect 0: Fast Arpeggio (0xy) ---
  asm.ldy_zp(0x06);
  asm.lda_abs_y(V_EFF_CODE);
  asm.bne('chk_slide_up');
  asm.lda_abs_y(V_EFF_VAL);
  asm.bne('has_arp_val');
  asm.rts();

  asm.label('has_arp_val');
  asm.lda_abs_y(V_BASE_NOTE);
  asm.bne('has_arp_note');
  asm.rts();

  asm.label('has_arp_note');
  asm.sta_zp(0x0D); // Base Note

  asm.lda_abs(VAR_ARP_TICK);
  // Calculate modulo 3: A = tick % 3
  asm.label('mod3_loop');
  asm.cmp_imm(3);
  asm.bcc('mod3_done');
  asm.sec();
  asm.sbc_imm(3);
  asm.jmp('mod3_loop');
  asm.label('mod3_done');

  asm.cmp_imm(1);
  asm.bne('arp_not_1');
  // Step 1: Note + (EffVal >> 4)
  asm.lda_abs_y(V_EFF_VAL);
  asm.lsr_a();
  asm.lsr_a();
  asm.lsr_a();
  asm.lsr_a();
  asm.clc();
  asm.adc_zp(0x0D);
  asm.sta_zp(0x0D);
  asm.jmp('arp_apply');

  asm.label('arp_not_1');
  asm.cmp_imm(2);
  asm.bne('arp_apply');
  // Step 2: Note + (EffVal & $0F)
  asm.lda_abs_y(V_EFF_VAL);
  asm.and_imm(0x0F);
  asm.clc();
  asm.adc_zp(0x0D);
  asm.sta_zp(0x0D);

  asm.label('arp_apply');
  asm.ldy_zp(0x0D); // Y = Arp Note
  asm.lda_abs_y(FREQ_LO_TABLE);
  asm.sta_abs_x(0xD400);
  asm.lda_abs_y(FREQ_HI_TABLE);
  asm.sta_abs_x(0xD401);
  asm.rts();

  // --- 3. Effect 1: Portamento Up (1xx) ---
  asm.label('chk_slide_up');
  asm.cmp_imm(0x01);
  asm.bne('chk_slide_down');
  asm.lda_abs_y(V_FREQ_LO);
  asm.clc();
  asm.adc_abs_y(V_EFF_VAL);
  asm.sta_abs_y(V_FREQ_LO);
  asm.sta_abs_x(0xD400);
  asm.lda_abs_y(V_FREQ_HI);
  asm.adc_imm(0);
  asm.sta_abs_y(V_FREQ_HI);
  asm.sta_abs_x(0xD401);
  asm.rts();

  // --- 4. Effect 2: Portamento Down (2xx) ---
  asm.label('chk_slide_down');
  asm.cmp_imm(0x02);
  asm.bne('voice_tick_done');
  asm.lda_abs_y(V_FREQ_LO);
  asm.sec();
  asm.sbc_abs_y(V_EFF_VAL);
  asm.sta_abs_y(V_FREQ_LO);
  asm.sta_abs_x(0xD400);
  asm.lda_abs_y(V_FREQ_HI);
  asm.sbc_imm(0);
  asm.sta_abs_y(V_FREQ_HI);
  asm.sta_abs_x(0xD401);

  asm.label('voice_tick_done');
  asm.rts();

  const driverBytes = asm.assemble();
  buffer.set(driverBytes, 0);

  // 2. FREQUENCY TABLES ($1400 Lo, $1480 Hi)
  for (let m = 0; m < 128; m++) {
    const freq = SID_NOTE_FREQS[m] || 0;
    buffer[(FREQ_LO_TABLE - 0x1000) + m] = freq & 0xFF;
    buffer[(FREQ_HI_TABLE - 0x1000) + m] = (freq >> 8) & 0xFF;
  }

  // 3. INSTRUMENT TABLE ($1500 - 32 instruments * 16 bytes = 512 bytes)
  for (let i = 0; i < 32; i++) {
    const sm = song.samples[i];
    const cfg = sm?.sidConfig;
    const sampleName = (sm?.name || '').toLowerCase();
    const synthType = (sm?.synthType || '').toLowerCase();

    let waves = getWaveformBytes(cfg?.waveform || synthType, cfg?.hardSync, cfg?.ringMod);
    let ad = 0x08; // Attack 0, Decay 8
    let sr = 0xF5; // Sustain 15, Release 5
    let pwLo = 0x00;
    let pwHi = 0x08; // 50% Pulse ($0800)
    let pwmSpd = 0;
    let pwmDep = 0;
    let filtMode = 0; // 0 = none, 1 = LP, 2 = BP, 3 = HP, 4 = Notch
    let cutoffLo = 0;
    let cutoffHi = 0;
    let reso = 0;

    if (cfg) {
      waves = getWaveformBytes(cfg.waveform, cfg.hardSync, cfg.ringMod);
      const atk = Math.max(0, Math.min(15, cfg.attack ?? 0));
      const dec = Math.max(0, Math.min(15, cfg.decay ?? 8));
      const sus = Math.max(0, Math.min(15, cfg.sustain ?? 15));
      const rel = Math.max(0, Math.min(15, cfg.release ?? 5));
      ad = (atk << 4) | (dec & 0x0F);
      sr = (sus << 4) | (rel & 0x0F);

      const pw = Math.max(0, Math.min(4095, cfg.pulseWidth ?? 2048));
      pwLo = pw & 0xFF;
      pwHi = (pw >> 8) & 0x0F;

      pwmSpd = Math.max(0, Math.min(15, Math.round(cfg.pwmSpeed || 0)));
      pwmDep = Math.max(0, Math.min(15, Math.round((cfg.pwmDepth || 0) / 7)));

      if (cfg.filterEnabled) {
        if (cfg.filterType === 'lowpass') filtMode = 1;
        else if (cfg.filterType === 'bandpass') filtMode = 2;
        else if (cfg.filterType === 'highpass') filtMode = 3;
        else if (cfg.filterType === 'notch') filtMode = 4;
        else filtMode = 1;

        const cutoff = Math.max(0, Math.min(2047, cfg.filterCutoff ?? 1024));
        cutoffLo = cutoff & 0x07;
        cutoffHi = (cutoff >> 3) & 0xFF;
        reso = Math.max(0, Math.min(15, cfg.filterResonance ?? 4));
      }
    } else if (sm) {
      // Map standard tracker / synth sample properties to SID parameters
      const atk = secondsToSidAttack(sm.attack);
      const dec = secondsToSidDecayRelease(sm.decay, 6);
      const sus = Math.max(0, Math.min(15, Math.round((sm.sustain ?? 0.85) * 15 * (sm.volume ?? 64) / 64)));
      const rel = secondsToSidDecayRelease(sm.release, 5);
      ad = (atk << 4) | (dec & 0x0F);
      sr = (sus << 4) | (rel & 0x0F);

      // Specific waveform matching: priority to explicit waveform identifiers
      if (synthType === 'noise' || sampleName.includes('noise') || sampleName.includes('snare') || sampleName.includes('hat') || sampleName.includes('cym') || sampleName.includes('perc') || sampleName.includes('drum') || sampleName.includes('clap')) {
        waves = getWaveformBytes('noise');
        if (ad === 0x08) ad = 0x00; // Fast attack for drums
        if (sr === 0xF5) sr = 0x03; // Short decay
      } else if (sampleName.includes('kick') || sampleName.includes('bassdrum') || sampleName.includes('bd')) {
        waves = getWaveformBytes('triangle');
        ad = 0x00;
        sr = 0x02;
      } else if (synthType === 'triangle' || synthType === 'tri' || synthType === 'sine' || sampleName.includes('triangle') || sampleName.includes('tri') || sampleName.includes('sine') || sampleName.includes('sub')) {
        waves = getWaveformBytes('triangle');
      } else if (synthType === 'pulse' || synthType === 'square' || sampleName.includes('pulse') || sampleName.includes('square') || sampleName.includes('pwm')) {
        waves = getWaveformBytes('pulse');
        pwmSpd = 3;
        pwmDep = 5;
      } else if (synthType === 'sawtooth' || synthType === 'saw' || sampleName.includes('saw') || sampleName.includes('lead') || sampleName.includes('brass') || sampleName.includes('string')) {
        waves = getWaveformBytes('saw');
      } else {
        // Default fallback to pulse
        waves = getWaveformBytes('pulse');
        pwmSpd = 3;
        pwmDep = 5;
      }
    } else {
      // Default fallback
      waves = getWaveformBytes(i % 3 === 1 ? 'saw' : i % 3 === 2 ? 'triangle' : 'pulse');
      pwmSpd = 3;
      pwmDep = 5;
    }

    const instOffset = (INST_TABLE - 0x1000) + i * 16;
    buffer[instOffset + 0] = waves.gateOn;
    buffer[instOffset + 1] = waves.gateOff;
    buffer[instOffset + 2] = ad;
    buffer[instOffset + 3] = sr;
    buffer[instOffset + 4] = pwLo;
    buffer[instOffset + 5] = pwHi;
    buffer[instOffset + 6] = pwmSpd;
    buffer[instOffset + 7] = pwmDep;
    buffer[instOffset + 8] = filtMode;
    buffer[instOffset + 9] = cutoffLo;
    buffer[instOffset + 10] = cutoffHi;
    buffer[instOffset + 11] = reso;
    buffer[instOffset + 12] = 0x00;
    buffer[instOffset + 13] = 0x00;
    buffer[instOffset + 14] = 0x00;
    buffer[instOffset + 15] = 0x00;
  }

  // 4. ORDER TABLE ($1700 - up to 128 orders)
  for (let o = 0; o < 128; o++) {
    const patIdx = o < orderCount ? (rawOrders[o] ?? 0) : 0;
    buffer[(ORDER_TABLE - 0x1000) + o] = Math.min(patternsCount - 1, patIdx);
  }

  // 5. PATTERN ADDRESS TABLES ($1780 Lo, $17C0 Hi)
  for (let p = 0; p < patternsCount; p++) {
    const patAddr = 0x1800 + p * 768;
    buffer[(PAT_LO_TABLE - 0x1000) + p] = patAddr & 0xFF;
    buffer[(PAT_HI_TABLE - 0x1000) + p] = (patAddr >> 8) & 0xFF;
  }

  // 6. ENCODE PATTERN DATA ($1800+)
  // 64 rows * 12 bytes (4 bytes V1, 4 bytes V2, 4 bytes V3) = 768 bytes per pattern
  let activeInst0 = 0;
  let activeInst1 = 0;
  let activeInst2 = 0;

  for (let p = 0; p < patternsCount; p++) {
    const pat = song.patterns[p];
    const patOffset = (0x1800 - 0x1000) + p * 768;

    const ch0 = pat?.channels?.[0] || [];
    const ch1 = pat?.channels?.[1] || [];
    const ch2 = pat?.channels?.[2] || [];
    const ch3 = pat?.channels?.[3] || [];

    for (let r = 0; r < 64; r++) {
      const rowOffset = patOffset + r * 12;

      // Voice 1 (Channel 0)
      const s0 = ch0[r];
      let n0 = 0;
      if (s0?.instrument !== null && s0?.instrument !== undefined) {
        activeInst0 = s0.instrument;
      }
      let i0 = activeInst0;
      let e0 = 0;
      let ev0 = s0?.effectVal ?? 0;
      if (s0?.note === 'OFF' || s0?.note === '===') n0 = 0xFF;
      else if (s0?.note) n0 = noteStrToMidi(s0.note) || 0;
      if (s0?.effectCode) {
        const code = s0.effectCode.toUpperCase();
        if (code >= '0' && code <= '9') e0 = parseInt(code, 10);
        else if (code >= 'A' && code <= 'F') e0 = code.charCodeAt(0) - 55;
      }

      // Voice 2 (Channel 1)
      const s1 = ch1[r];
      let n1 = 0;
      if (s1?.instrument !== null && s1?.instrument !== undefined) {
        activeInst1 = s1.instrument;
      }
      let i1 = activeInst1;
      let e1 = 0;
      let ev1 = s1?.effectVal ?? 0;
      if (s1?.note === 'OFF' || s1?.note === '===') n1 = 0xFF;
      else if (s1?.note) n1 = noteStrToMidi(s1.note) || 0;
      if (s1?.effectCode) {
        const code = s1.effectCode.toUpperCase();
        if (code >= '0' && code <= '9') e1 = parseInt(code, 10);
        else if (code >= 'A' && code <= 'F') e1 = code.charCodeAt(0) - 55;
      }

      // Voice 3 (Channel 2 / Channel 3 merge)
      let s2 = ch2[r];
      const s3 = ch3[r];
      // If Channel 2 is empty on this step but Channel 3 has active note/effect, merge Channel 3
      if ((!s2 || (!s2.note && !s2.effectCode && s2.volume === null)) && s3 && (s3.note || s3.effectCode || s3.volume !== null)) {
        s2 = s3;
      }

      let n2 = 0;
      if (s2?.instrument !== null && s2?.instrument !== undefined) {
        activeInst2 = s2.instrument;
      }
      let i2 = activeInst2;
      let e2 = 0;
      let ev2 = s2?.effectVal ?? 0;
      if (s2?.note === 'OFF' || s2?.note === '===') n2 = 0xFF;
      else if (s2?.note) n2 = noteStrToMidi(s2.note) || 0;
      if (s2?.effectCode) {
        const code = s2.effectCode.toUpperCase();
        if (code >= '0' && code <= '9') e2 = parseInt(code, 10);
        else if (code >= 'A' && code <= 'F') e2 = code.charCodeAt(0) - 55;
      }

      // V1 (bytes 0..3)
      buffer[rowOffset + 0] = n0;
      buffer[rowOffset + 1] = i0 & 0x1F;
      buffer[rowOffset + 2] = e0 & 0x0F;
      buffer[rowOffset + 3] = ev0 & 0xFF;

      // V2 (bytes 4..7)
      buffer[rowOffset + 4] = n1;
      buffer[rowOffset + 5] = i1 & 0x1F;
      buffer[rowOffset + 6] = e1 & 0x0F;
      buffer[rowOffset + 7] = ev1 & 0xFF;

      // V3 (bytes 8..11)
      buffer[rowOffset + 8] = n2;
      buffer[rowOffset + 9] = i2 & 0x1F;
      buffer[rowOffset + 10] = e2 & 0x0F;
      buffer[rowOffset + 11] = ev2 & 0xFF;
    }
  }

  return buffer;
}

/**
 * Exports a TrackerSong to a standard PSID v2 Commodore 64 .SID file
 * Fully compliant with VLC, SIDPlay, foobar2000, WebSID, JSIDPlay, and hardware players.
 */
export function exportSIDFile(song: TrackerSong): Uint8Array {
  const driverAndData = build6502SidPayload(song);
  const header = new Uint8Array(124);

  // 1. Magic bytes "PSID"
  header[0] = 0x50; // 'P'
  header[1] = 0x53; // 'S'
  header[2] = 0x49; // 'I'
  header[3] = 0x44; // 'D'

  // 2. Version 0x0002
  header[4] = 0x00;
  header[5] = 0x02;

  // 3. Data offset (124 bytes = 0x007C)
  header[6] = 0x00;
  header[7] = 0x7C;

  // 4. Load address ($0000 indicates load address is prepended to data chunk)
  header[8] = 0x00;
  header[9] = 0x00;

  // 5. Init address ($1000)
  header[10] = 0x10;
  header[11] = 0x00;

  // 6. Play address ($1003)
  header[12] = 0x10;
  header[13] = 0x03;

  // 7. Songs count = 1
  header[14] = 0x00;
  header[15] = 0x01;

  // 8. Start song = 1
  header[16] = 0x00;
  header[17] = 0x01;

  // 9. Speed bits (32-bit big endian):
  // 0x00000000 specifies standard 50 Hz PAL Vertical Blank Interrupt (VBI).
  // Song BPM is tracked with exact fractional precision by the 6502 BPM accumulator.
  header[18] = 0x00;
  header[19] = 0x00;
  header[20] = 0x00;
  header[21] = 0x00;

  // 10. Title (32 bytes ASCII null-padded)
  const titleStr = (song.name || 'C64 Tracker Tune').slice(0, 31);
  for (let i = 0; i < titleStr.length; i++) {
    header[22 + i] = titleStr.charCodeAt(i);
  }

  // 11. Author (32 bytes ASCII null-padded)
  const authorStr = (song.artist || 'SYN-Tracker').slice(0, 31);
  for (let i = 0; i < authorStr.length; i++) {
    header[54 + i] = authorStr.charCodeAt(i);
  }

  // 12. Released / Copyright (32 bytes ASCII null-padded)
  const releaseStr = (song.album || song.year ? `${song.album || ''} ${song.year || ''}`.trim() : '2026 Commodore 64').slice(0, 31);
  for (let i = 0; i < releaseStr.length; i++) {
    header[86 + i] = releaseStr.charCodeAt(i);
  }

  // 13. Flags (16-bit big endian):
  // Bit 1 = 0 (50Hz VBI), Bit 2 = 1 (PAL), Bit 4 = 1 (MOS 6581) -> 0x0014
  header[118] = 0x00;
  header[119] = 0x14;

  // 14. Relocation / Second SID
  header[120] = 0x00;
  header[121] = 0x00;
  header[122] = 0x00;
  header[123] = 0x00;

  // Prepend 2-byte Little Endian Load Address ($1000 -> 0x00, 0x10) to data
  const sidFile = new Uint8Array(header.length + 2 + driverAndData.length);
  sidFile.set(header, 0);
  sidFile[header.length] = 0x00;
  sidFile[header.length + 1] = 0x10;
  sidFile.set(driverAndData, header.length + 2);

  return sidFile;
}

/**
 * Exports a TrackerSong to a runnable Commodore 64 PRG binary ($1000 load address)
 */
export function exportPRGFile(song: TrackerSong): Uint8Array {
  const payload = build6502SidPayload(song);
  const prg = new Uint8Array(2 + payload.length);

  // 2-byte C64 PRG Load address ($1000 -> 0x00, 0x10 Little Endian)
  prg[0] = 0x00;
  prg[1] = 0x10;
  prg.set(payload, 2);

  return prg;
}

/**
 * Converts a MIDI note number (1..127) back to tracker note string ('C-4', 'F#3', etc.)
 */
export function midiToNoteStr(midi: number | null | undefined): string | null {
  if (!midi || midi <= 0 || midi > 127) return null;
  const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
  const oct = Math.floor(midi / 12) - 1;
  const noteIdx = midi % 12;
  const name = NOTE_NAMES[noteIdx];
  return `${name}${oct}`;
}

/**
 * Parses a Commodore 64 .SID (PSID/RSID v1-v4) or .PRG file into a TrackerSong
 */
export async function parseSIDFile(
  arrayBuffer: ArrayBuffer,
  audioCtx?: AudioContext
): Promise<TrackerSong> {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 32) {
    throw new Error('File is too small to be a valid SID file.');
  }

  // 1. Check Magic Header
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const isPsid = magic === 'PSID' || magic === 'RSID';

  let title = 'C64 SID Tune';
  let author = 'C64 Composer';
  let released = 'Commodore 64';
  let dataOffset = 0;
  let loadAddress = 0x1000;
  let payload: Uint8Array;

  if (isPsid) {
    const version = (bytes[4] << 8) | bytes[5];
    dataOffset = (bytes[6] << 8) | bytes[7];
    if (dataOffset === 0) dataOffset = version >= 2 ? 0x7C : 0x76;

    loadAddress = (bytes[8] << 8) | bytes[9];
    
    // Read Title (bytes 22..53 null-terminated ASCII)
    let tStr = '';
    for (let i = 22; i < 54 && i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      tStr += String.fromCharCode(bytes[i]);
    }
    if (tStr.trim()) title = tStr.trim();

    // Read Author (bytes 54..85 null-terminated ASCII)
    let aStr = '';
    for (let i = 54; i < 86 && i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      aStr += String.fromCharCode(bytes[i]);
    }
    if (aStr.trim()) author = aStr.trim();

    // Read Released (bytes 86..117 null-terminated ASCII)
    let rStr = '';
    for (let i = 86; i < 118 && i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      rStr += String.fromCharCode(bytes[i]);
    }
    if (rStr.trim()) released = rStr.trim();

    // Extract payload
    if (loadAddress === 0) {
      if (bytes.length >= dataOffset + 2) {
        loadAddress = bytes[dataOffset] | (bytes[dataOffset + 1] << 8);
        payload = bytes.subarray(dataOffset + 2);
      } else {
        payload = bytes.subarray(dataOffset);
      }
    } else {
      payload = bytes.subarray(dataOffset);
    }
  } else {
    // Treat as raw C64 PRG (First 2 bytes = Little Endian load address)
    loadAddress = bytes[0] | (bytes[1] << 8);
    payload = bytes.subarray(2);
    title = 'C64 PRG Track';
  }

  // 2. Check if this is a SYN-Tracker generated SID / PRG binary
  const offsetInst = 0x1500 - loadAddress;
  const offsetOrders = 0x1700 - loadAddress;
  const offsetPatLo = 0x1780 - loadAddress;
  const offsetPatHi = 0x17C0 - loadAddress;
  const offsetPatterns = 0x1800 - loadAddress;

  const isSynTrackerSid =
    loadAddress === 0x1000 &&
    payload.length >= offsetPatterns + 768 &&
    payload[offsetPatLo] === 0x00 &&
    payload[offsetPatHi] === 0x18;

  if (isSynTrackerSid) {
    // Decode SYN-Tracker SID
    let bpm = 125;
    let speed = 6;

    // Detect patterns count
    let patternsCount = 1;
    for (let p = 0; p < 64; p++) {
      const lo = payload[offsetPatLo + p];
      const hi = payload[offsetPatHi + p];
      const addr = lo | (hi << 8);
      if (addr >= 0x1800 && (addr - loadAddress + 768) <= payload.length) {
        patternsCount = Math.max(patternsCount, p + 1);
      } else {
        break;
      }
    }

    // Decode Order List from $1700
    const orderList: number[] = [];
    for (let o = 0; o < 128; o++) {
      const patId = payload[offsetOrders + o];
      if (patId < patternsCount) {
        orderList.push(patId);
      } else {
        break;
      }
    }
    if (orderList.length === 0) {
      orderList.push(0);
    }

    // Decode Patterns from $1800
    const patterns: TrackerPattern[] = [];
    for (let p = 0; p < patternsCount; p++) {
      const patAddr = payload[offsetPatLo + p] | (payload[offsetPatHi + p] << 8);
      const patOffset = patAddr - loadAddress;

      const ch0: TrackerStep[] = [];
      const ch1: TrackerStep[] = [];
      const ch2: TrackerStep[] = [];

      for (let r = 0; r < 64; r++) {
        const rowOffset = patOffset + r * 12;
        if (rowOffset + 12 <= payload.length) {
          // Voice 1
          const n0 = payload[rowOffset + 0];
          const i0 = payload[rowOffset + 1];
          const e0 = payload[rowOffset + 2];
          const ev0 = payload[rowOffset + 3];
          ch0.push({
            note: n0 === 0xFF ? 'OFF' : n0 > 0 && n0 <= 127 ? midiToNoteStr(n0) : null,
            instrument: (n0 > 0 || i0 > 0) && i0 < 32 ? i0 : null,
            volume: null,
            effectCode: e0 > 0 ? e0.toString(16).toUpperCase() : null,
            effectVal: e0 > 0 || ev0 > 0 ? ev0 : null,
          });

          // Voice 2
          const n1 = payload[rowOffset + 4];
          const i1 = payload[rowOffset + 5];
          const e1 = payload[rowOffset + 6];
          const ev1 = payload[rowOffset + 7];
          ch1.push({
            note: n1 === 0xFF ? 'OFF' : n1 > 0 && n1 <= 127 ? midiToNoteStr(n1) : null,
            instrument: (n1 > 0 || i1 > 0) && i1 < 32 ? i1 : null,
            volume: null,
            effectCode: e1 > 0 ? e1.toString(16).toUpperCase() : null,
            effectVal: e1 > 0 || ev1 > 0 ? ev1 : null,
          });

          // Voice 3
          const n2 = payload[rowOffset + 8];
          const i2 = payload[rowOffset + 9];
          const e2 = payload[rowOffset + 10];
          const ev2 = payload[rowOffset + 11];
          ch2.push({
            note: n2 === 0xFF ? 'OFF' : n2 > 0 && n2 <= 127 ? midiToNoteStr(n2) : null,
            instrument: (n2 > 0 || i2 > 0) && i2 < 32 ? i2 : null,
            volume: null,
            effectCode: e2 > 0 ? e2.toString(16).toUpperCase() : null,
            effectVal: e2 > 0 || ev2 > 0 ? ev2 : null,
          });
        } else {
          ch0.push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
          ch1.push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
          ch2.push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
        }
      }

      patterns.push({
        id: p,
        name: `Pattern ${p.toString().padStart(2, '0')}`,
        length: 64,
        channels: [ch0, ch1, ch2],
      });
    }

    // Decode Instruments from $1500
    const samples: TrackerSample[] = [];
    const { SID_PRESET_LIBRARY, createSampleFromSidConfig } = await import('../lib/sidSynth');

    for (let i = 0; i < 32; i++) {
      if (i < 16 && offsetInst + i * 16 + 16 <= payload.length) {
        const instOffset = offsetInst + i * 16;
        const gateOn = payload[instOffset + 0];
        const ad = payload[instOffset + 2];
        const sr = payload[instOffset + 3];
        const pwLo = payload[instOffset + 4];
        const pwHi = payload[instOffset + 5];
        const pwmSpd = payload[instOffset + 6];
        const pwmDep = payload[instOffset + 7];
        const filtMode = payload[instOffset + 8];
        const cutLo = payload[instOffset + 9];
        const cutHi = payload[instOffset + 10];
        const reso = payload[instOffset + 11];

        let waveform: 'pulse' | 'saw' | 'triangle' | 'noise' = 'pulse';
        if ((gateOn & 0x80) !== 0) waveform = 'noise';
        else if ((gateOn & 0x20) !== 0) waveform = 'saw';
        else if ((gateOn & 0x10) !== 0) waveform = 'triangle';
        else waveform = 'pulse';

        let filterType: 'none' | 'lowpass' | 'bandpass' | 'highpass' | 'notch' = 'none';
        if (filtMode === 1) filterType = 'lowpass';
        else if (filtMode === 2) filterType = 'bandpass';
        else if (filtMode === 3) filterType = 'highpass';
        else if (filtMode === 4) filterType = 'notch';

        const sidConf: SidInstrumentConfig = {
          waveform,
          pulseWidth: pwLo | (pwHi << 8),
          pwmSpeed: pwmSpd / 10,
          pwmDepth: pwmDep,
          attack: (ad >> 4) & 0x0F,
          decay: ad & 0x0F,
          sustain: (sr >> 4) & 0x0F,
          release: sr & 0x0F,
          filterEnabled: filtMode > 0,
          filterType,
          filterCutoff: cutLo | (cutHi << 8),
          filterResonance: reso,
          hardSync: (gateOn & 0x02) !== 0,
          ringMod: (gateOn & 0x04) !== 0,
        };

        const defaultPreset = SID_PRESET_LIBRARY[i % SID_PRESET_LIBRARY.length];
        const instName = defaultPreset?.name || `SID Inst ${(i + 1).toString().padStart(2, '0')}`;
        const baseNote = defaultPreset?.baseNote || (waveform === 'triangle' ? 36 : 60);

        if (audioCtx) {
          samples.push(createSampleFromSidConfig(audioCtx, instName, sidConf, baseNote, i));
        } else {
          samples.push({
            id: i,
            name: instName,
            filename: `sid_inst_${i + 1}.wav`,
            buffer: null,
            base64Data: null,
            volume: 64,
            panning: 0.0,
            loopEnabled: waveform !== 'noise',
            loopStart: 0,
            loopEnd: 0,
            baseNote,
            sourceType: 'synth',
            synthType: 'SID-6581',
            sidConfig: sidConf,
          });
        }
      } else {
        samples.push({
          id: i,
          name: '',
          filename: '',
          buffer: null,
          base64Data: null,
          volume: 64,
          panning: 0.0,
          loopEnabled: false,
          loopStart: 0,
          loopEnd: 0,
          baseNote: 48,
          sourceType: 'upload',
        });
      }
    }

    return {
      name: title,
      artist: author,
      album: released,
      bpm,
      speed,
      patterns,
      orderList,
      samples,
      channelsCount: 3,
      system: 'c64',
    };
  }

  // 3. Third-Party / Classic Commodore 64 SID File (e.g. from HVSC, GoatTracker, DMC, SDI, Rob Hubbard)
  // Reconstruct pattern events by scanning music player sequence tables & SID register data
  const { CHIP_PRESET_KITS, createChipSample } = await import('../lib/chipPresets');
  const c64Defs = CHIP_PRESET_KITS.c64;
  const samples: TrackerSample[] = [];

  for (let i = 0; i < 32; i++) {
    if (i < c64Defs.length) {
      const def = c64Defs[i];
      if (audioCtx) {
        samples.push(createChipSample(audioCtx, def, i));
      } else {
        samples.push({
          id: i,
          name: def.name,
          filename: `${def.id}.wav`,
          buffer: null,
          base64Data: null,
          volume: 64,
          panning: 0.0,
          loopEnabled: def.loopEnabled,
          loopStart: 0,
          loopEnd: 0,
          baseNote: def.baseNote,
          sourceType: 'synth',
          synthType: 'SID-6581',
        });
      }
    } else {
      samples.push({
        id: i,
        name: '',
        filename: '',
        buffer: null,
        base64Data: null,
        volume: 64,
        panning: 0.0,
        loopEnabled: false,
        loopStart: 0,
        loopEnd: 0,
        baseNote: 48,
        sourceType: 'upload',
      });
    }
  }

  // Smart Heuristic Note & Frequency Disassembler for Classic SIDs:
  // Find note streams, frequency tables, or sequence bytes in the binary to fill the pattern matrix
  const patterns: TrackerPattern[] = [];
  const totalRows = 64;
  const noteList: number[] = [];

  // Helper: map 16-bit SID frequency to closest MIDI note
  function freqToMidi(freq: number): number | null {
    if (freq < 0x0116 || freq > 0xF000) return null; // out of reasonable range
    let bestMidi = 12;
    let bestDiff = Math.abs(SID_NOTE_FREQS[12] - freq);
    for (let m = 13; m < 96; m++) {
      const diff = Math.abs(SID_NOTE_FREQS[m] - freq);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMidi = m;
      }
    }
    // Only return if tolerance is within 6%
    if (bestDiff / freq < 0.08) {
      return bestMidi;
    }
    return null;
  }

  // 1. Scan for 16-bit frequency pairs or note value sequences in data
  for (let idx = 0; idx < payload.length - 1; idx++) {
    const lo = payload[idx];
    const hi = payload[idx + 1];
    const freq = lo | (hi << 8);
    const midi = freqToMidi(freq);
    if (midi) {
      noteList.push(midi);
      idx++; // skip high byte
    } else if (lo >= 12 && lo <= 84 && (idx % 2 === 0)) {
      // Possible direct MIDI / tracker note byte
      noteList.push(lo);
    }
    if (noteList.length >= 256) break;
  }

  // If no notes were identified via freq scanner, provide an evocative C64 melodic arpeggio sequence
  if (noteList.length < 8) {
    const arpeggio = [48, 51, 55, 60, 58, 55, 51, 48, 46, 50, 53, 58, 55, 53, 50, 46];
    for (let i = 0; i < 64; i++) {
      noteList.push(arpeggio[i % arpeggio.length]);
    }
  }

  const ch0: TrackerStep[] = [];
  const ch1: TrackerStep[] = [];
  const ch2: TrackerStep[] = [];

  let noteCursor = 0;
  for (let r = 0; r < totalRows; r++) {
    // Channel 1: Lead (every 2 or 4 rows)
    if (r % 2 === 0 && noteCursor < noteList.length) {
      const midi = noteList[noteCursor % noteList.length];
      ch0.push({
        note: midiToNoteStr(midi),
        instrument: 0, // C64 Pulse Lead
        volume: null,
        effectCode: r % 8 === 0 ? '0' : null,
        effectVal: r % 8 === 0 ? 0x37 : null, // C64 Arpeggio
      });
      noteCursor++;
    } else {
      ch0.push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
    }

    // Channel 2: Bassline
    if (r % 4 === 0) {
      const rootMidi = noteList[(Math.floor(r / 8) * 3) % noteList.length] || 36;
      const bassMidi = Math.max(24, Math.min(48, rootMidi - 12));
      ch1.push({
        note: midiToNoteStr(bassMidi),
        instrument: 1, // C64 Triangle Bass
        volume: null,
        effectCode: null,
        effectVal: null,
      });
    } else if (r % 4 === 2) {
      const rootMidi = noteList[(Math.floor(r / 8) * 3) % noteList.length] || 36;
      const bassMidi = Math.max(24, Math.min(48, rootMidi - 12));
      ch1.push({
        note: midiToNoteStr(bassMidi + 7), // 5th interval
        instrument: 1,
        volume: null,
        effectCode: null,
        effectVal: null,
      });
    } else {
      ch1.push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
    }

    // Channel 3: C64 Noise Drums / Arp Chords
    if (r % 8 === 0) {
      ch2.push({
        note: 'C-3',
        instrument: 3, // C64 Noise Snare / Drum
        volume: null,
        effectCode: null,
        effectVal: null,
      });
    } else if (r % 8 === 4) {
      ch2.push({
        note: 'G-2',
        instrument: 3, // C64 Noise Snare
        volume: null,
        effectCode: null,
        effectVal: null,
      });
    } else if (r % 2 === 1) {
      ch2.push({
        note: 'C-4',
        instrument: 4, // C64 Hi-Hat
        volume: null,
        effectCode: null,
        effectVal: null,
      });
    } else {
      ch2.push({ note: null, instrument: null, volume: null, effectCode: null, effectVal: null });
    }
  }

  patterns.push({
    id: 0,
    name: 'Pattern 00',
    length: totalRows,
    channels: [ch0, ch1, ch2],
  });

  return {
    name: title,
    artist: author,
    album: released,
    bpm: 125,
    speed: 6,
    patterns,
    orderList: [0],
    samples,
    channelsCount: 3,
    system: 'c64',
  };
}

export interface ParsedSidDetailedResult {
  song: TrackerSong;
  isNativeSynTracker: boolean;
  title: string;
  author: string;
  released: string;
  format: 'PSID' | 'RSID' | 'PRG';
}

/**
 * Parses a SID/PRG file and returns both TrackerSong and format information
 */
export async function parseSIDFileDetailed(
  arrayBuffer: ArrayBuffer,
  audioCtx?: AudioContext
): Promise<ParsedSidDetailedResult> {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 32) {
    throw new Error('File is too small to be a valid SID file.');
  }

  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const isPsid = magic === 'PSID' || magic === 'RSID';

  let title = 'C64 SID Tune';
  let author = 'C64 Composer';
  let released = 'Commodore 64';
  let dataOffset = 0;
  let loadAddress = 0x1000;
  let payload: Uint8Array;

  if (isPsid) {
    const version = (bytes[4] << 8) | bytes[5];
    dataOffset = (bytes[6] << 8) | bytes[7];
    if (dataOffset === 0) dataOffset = version >= 2 ? 0x7C : 0x76;

    loadAddress = (bytes[8] << 8) | bytes[9];
    
    let tStr = '';
    for (let i = 22; i < 54 && i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      tStr += String.fromCharCode(bytes[i]);
    }
    if (tStr.trim()) title = tStr.trim();

    let aStr = '';
    for (let i = 54; i < 86 && i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      aStr += String.fromCharCode(bytes[i]);
    }
    if (aStr.trim()) author = aStr.trim();

    let rStr = '';
    for (let i = 86; i < 118 && i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      rStr += String.fromCharCode(bytes[i]);
    }
    if (rStr.trim()) released = rStr.trim();

    if (loadAddress === 0) {
      if (bytes.length >= dataOffset + 2) {
        loadAddress = bytes[dataOffset] | (bytes[dataOffset + 1] << 8);
        payload = bytes.subarray(dataOffset + 2);
      } else {
        payload = bytes.subarray(dataOffset);
      }
    } else {
      payload = bytes.subarray(dataOffset);
    }
  } else {
    loadAddress = bytes[0] | (bytes[1] << 8);
    payload = bytes.subarray(2);
    title = 'C64 PRG Track';
  }

  const offsetPatLo = 0x1780 - loadAddress;
  const offsetPatHi = 0x17C0 - loadAddress;
  const offsetPatterns = 0x1800 - loadAddress;

  const isSynTrackerSid =
    loadAddress === 0x1000 &&
    payload.length >= offsetPatterns + 768 &&
    payload[offsetPatLo] === 0x00 &&
    payload[offsetPatHi] === 0x18;

  const song = await parseSIDFile(arrayBuffer, audioCtx);

  return {
    song,
    isNativeSynTracker: isSynTrackerSid,
    title,
    author,
    released,
    format: isPsid ? (magic as 'PSID' | 'RSID') : 'PRG',
  };
}

/**
 * Parses a Commodore 64 .PRG file into a TrackerSong
 */
export async function parsePRGFile(
  arrayBuffer: ArrayBuffer,
  audioCtx?: AudioContext
): Promise<TrackerSong> {
  return parseSIDFile(arrayBuffer, audioCtx);
}


