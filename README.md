# 🎛️ SYN Tracker — Web-Based Audio Workstation & Chiptune Tracker

> **Notice:** This repository is published exclusively as a **personal portfolio project and technological showcase** demonstrating modern browser-based Web Audio DSP, real-time ProTracker pattern sequencing, waveform sample slicing, and multi-format audio engineering.  
> *It is provided as a read-only showcase. Issues and Pull Requests are disabled.*

---

## 🌟 Overview & Live Demo

**SYN Tracker** brings classic 4-channel soundtracker workflow and retro chiptune aesthetics directly into the modern web browser. Powered by the Web Audio API, it delivers sample-accurate playback, live DSP filtering, Amiga period table pitch calculations, and binary `.MOD` file parsing/exporting without requiring external plugins or downloads.

---

## ✨ Key Features

- 🎹 **Classic 4-Channel Tracker Grid:**
  - Standard ProTracker hexadecimal effect commands (Arpeggio, Portamento, Vibrato, Sample Offset, Volume Slides, Filter Cuts).
  - Keyboard-driven workflow with Amiga-accurate note and period math.
- 💾 **Deep Format Compatibility & Binary I/O:**
  - **ProTracker `.MOD` & OctaMED `.MED` Support:** Bit-level Amiga binary format reading and writing supporting 4, 8, and up to 16 channels (MMD0/MMD1/MMD2).
  - **Multi-Format Audio Export:** High-quality WAV, MP3 with embedded ID3 artwork tags, and isolated Channel Stems (ZIP).
  - **C64 SID & PRG Support:** Direct Commodore 64 SID player & executable PRG compilation.
- 📦 **Massive Sound Library (~10,000 Samples):**
  - Integrated vintage ST-Disk sample library indexed and searchable directly in the browser.
- ✂️ **Built-in Waveform Editor & Sampler:**
  - Real-time visual waveform display, region slicing, reverse, normalize, low-pass/high-pass filtering, and direct microphone sampling.
- 🎨 **Retro UI & Visual Identity:**
  - Customizable vintage CRT display themes, oscilloscope, and 60 FPS real-time audio visualizer.
- ⚡ **Local Persistence:**
  - IndexedDB storage for local song saving, instant recall, and sample caching.

---

## 🛠️ Tech Stack & Architecture

- **Core Engine:** TypeScript, Web Audio API, Canvas 2D (Oscilloscope & Waveforms)
- **Framework & UI:** React, Tailwind CSS, Lucide Icons
- **Audio Processing:** Custom Period-Math & DSP Filter Chains, `lamejs` for MP3 encoding
- **Build System:** Vite

---

## 🚀 Running Locally

If you wish to run the showcase locally on your machine:

```bash
# 1. Clone the repository
git clone https://github.com/Vectrex71/Syn-Tracker.git
cd Syn-Tracker

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License & Attribution

All rights reserved © 2024–2026.  
Created by **Jürg Wüthrich (Vectrex71)**. Built as an interactive portfolio exploration in browser audio engineering.
