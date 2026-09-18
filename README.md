# 🎹 SYN-Tracker Online

> **Web-based Retro Chiptune Tracker & Music Production Workstation**  
> *Completely Free · No Subscription · 100% In-Browser*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF.svg)](https://vitejs.dev/)
[![Bluesky](https://img.shields.io/badge/Bluesky-@hj--wuethrich.bsky.social-0285FF.svg)](https://bsky.app/profile/hj-wuethrich.bsky.social)

**SYN-Tracker** is a powerful, fully-featured retro music workstation running directly in the browser. It combines the tactile workflow of classic tracker software (like ProTracker, FastTracker II, MilkyTracker, and DefleMask) with modern WebAudio DSP synthesis, video visualizers, and versatile export options.

---

## ✨ Features

- 🎛️ **Retro Chip Emulation & Sound Engines:**
  - **Commodore 64 (MOS SID 6581 / 8580):** Multi-waveforms, hard sync, ring modulation, and resonant analog filters.
  - **Nintendo Game Boy (LR35902):** Pulse 1/2 with pitch sweep, 4-bit custom wave RAM, and noise generator.
  - **NES (Ricoh 2A03):** Dual pulse channels, triangle bass channel, noise, and DPCM sample playback.
  - **Sega Mega Drive / Genesis (Yamaha YM2612 & SN76489):** 4-operator FM synthesis and classic PSG tone generation.
  - **Commodore Amiga (Paula 8364):** 4-channel 8-bit PCM sampler with hardware interpolation and Amiga audio filters.
  - **Arcade / ZX Spectrum (AY-3-8910 / YM2149) & Atari (POKEY):** Authentic square-wave and poly-noise generators.

- 🎼 **Professional Tracker Sequencer:**
  - Classic pattern editor with customizable highlight intervals, order list, and per-channel solo/mute.
  - Full tracker effect command set (Arpeggio, Portamento, Vibrato, Filter Cutoff, Retrigger, Volume Slides, Sample Offset).
  - Multi-level Undo/Redo history, transpose tools, and block copy/paste.

- 🎚️ **Integrated Synth & Instrument Editor:**
  - Custom ADSR envelopes, LFO modulators, wavetables, and macros.
  - Built-in sample editor with trim, normalize, reverse, pitch tuning, and loop-point tools.

- 🎥 **Visualizer Studio & Video Export:**
  - Generate retro-styled music videos for your tracks directly inside your browser.
  - Multiple visualizer themes: Oscilloscope, Neon Tunnel, Starfield, Aurora Waves, Cyber City, and Hyperspace.
  - Export HD video in multiple aspect ratios (16:9 for YouTube/Desktop, 9:16 for Reels/TikTok, or 1:1 for Instagram).

- 🎨 **Retro Cover Designer:**
  - Create pixel-perfect physical media art for your releases (3.5" Floppy Disk, Cassette Tape, and CD Jewel Case mockups).

- 💾 **Comprehensive Export & Import Options:**
  - **Audio formats:** WAV, MP3, OGG, FLAC, and unmixed multi-track stems.
  - **Chiptune formats:** SID, PRG (Commodore 64), and Amiga MOD.
  - **Project files:** JSON tracker format for instant saving, offline storage, and sharing.

- 🔒 **100% Free & Private:**
  - No sign-ups or accounts required, no hidden paywalls, no recurring subscriptions.
  - All composition, audio processing, and video rendering happen entirely in your local browser sandbox.

---

## 🚀 Quick Start / Local Installation

SYN-Tracker is built with **React**, **TypeScript**, and **Vite**.

### Prerequisites:
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- npm, pnpm, or yarn

### 1. Clone the repository:
```bash
git clone https://github.com/Vectrex71/Syn-Tracker.git
cd Syn-Tracker
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` (or the port specified in your terminal output).

### 4. Build for production:
```bash
npm run build
```
The optimized, static production bundle will be generated in the `dist/` directory.

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Stop playback |
| `Enter` | Toggle Edit / Record mode |
| `F5` / `F6` | Play current pattern from start / from cursor |
| `F7` / `F8` | Play entire song from start / Stop |
| `Page Up` / `Page Down` | Jump 16 lines up / down |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
| `Ctrl + C` / `Ctrl + V` | Copy / Paste pattern block |
| `/` and `*` (Numpad) | Shift octave down / up |

---

## 🛠️ Tech Stack

- **Frontend Framework:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Audio & DSP:** Web Audio API, Custom WebAssembly/AudioWorklet Chiptune Synths
- **Video Rendering:** HTML5 Canvas, MediaBunny Video Encoder
- **Build Tooling:** Vite, ESLint

---

## 👤 Author & Community

Created by **Jürg Wüthrich (Vectrex71)**  
- **GitHub:** [@Vectrex71](https://github.com/Vectrex71)
- **Bluesky:** [@hj-wuethrich.bsky.social](https://bsky.app/profile/hj-wuethrich.bsky.social)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software.
