/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import {
  Palette,
  X,
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Sliders,
  Type,
  Layers,
  Disc,
  Disc2,
  Maximize2,
  Trash2,
  Upload,
  Radio,
  Tv,
  Gamepad2,
  Orbit,
  LayoutGrid,
  Sun,
  Coffee,
  Disc3,
  Bookmark,
  Plus,
  Save,
  FolderHeart,
  Calendar,
  Undo2,
  Redo2,
  Move,
  RotateCcw,
  ZoomIn,
  RotateCw,
  SlidersHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Package,
  ChevronDown,
  FolderArchive,
} from 'lucide-react';
import { TrackerSong, RetroChipSystem } from '../types';
import { PersonaSwitcher, AppPersona } from './PersonaSwitcher';

export type CoverPresetTheme =
  | 'amiga_copper'
  | 'synthwave_outrun'
  | 'c64_sid'
  | 'vinyl_record'
  | 'minimal_modern'
  | 'arcade_pixel'
  | 'cosmic_nebula';

export interface GoogleFontOption {
  id: string;
  name: string;
  category: string;
  fontFamily: string;
  sample: string;
}

export const GOOGLE_FONTS_LIST: GoogleFontOption[] = [
  { id: 'orbitron', name: 'Orbitron', category: 'Sci-Fi / Tracker HUD', fontFamily: "'Orbitron', sans-serif", sample: '16-BIT TRACKER' },
  { id: 'press_start', name: 'Press Start 2P', category: '8-Bit Chiptune', fontFamily: "'Press Start 2P', monospace", sample: 'STAGE 1' },
  { id: 'vt323', name: 'VT323', category: 'CRT BBS Terminal', fontFamily: "'VT323', monospace", sample: 'SYS: READY' },
  { id: 'rubik_glitch', name: 'Rubik Glitch', category: 'Cyber Glitch', fontFamily: "'Rubik Glitch', cursive", sample: 'GLITCH_V2' },
  { id: 'permanent_marker', name: 'Permanent Marker', category: 'Cassette Tape Pen', fontFamily: "'Permanent Marker', cursive", sample: 'MIXTAPE #99' },
  { id: 'monoton', name: 'Monoton', category: '80s Disco Neon', fontFamily: "'Monoton', cursive", sample: 'SYNTHWAVE' },
  { id: 'audiowide', name: 'Audiowide', category: 'Techno Demoscene', fontFamily: "'Audiowide', cursive", sample: 'FUTURE SOUND' },
  { id: 'righteous', name: 'Righteous', category: 'Retro 80s Wave', fontFamily: "'Righteous', cursive", sample: 'NIGHT RUNNER' },
  { id: 'cinzel', name: 'Cinzel', category: 'Cinematic Classical', fontFamily: "'Cinzel', serif", sample: 'ORCHESTRAL' },
  { id: 'syne', name: 'Syne', category: 'Swiss Avant-Garde', fontFamily: "'Syne', sans-serif", sample: 'MINIMAL ART' },
  { id: 'space_mono', name: 'Space Mono', category: 'Tracker Monospace', fontFamily: "'Space Mono', monospace", sample: 'CH_01 | BPM 128' },
  { id: 'inter', name: 'Inter Heavy', category: 'Modern Clean', fontFamily: "'Inter', sans-serif", sample: 'STUDIO MASTER' },
];

export interface CustomCoverPreset {
  id: string;
  name: string;
  createdAt: number;
  thumbnail: string;
  presetTheme: CoverPresetTheme;
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  badgeText: string;
  catalogNum: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  fontArchetype: 'pixel' | 'cyber' | 'clean' | 'display' | 'bold';
  textAlignment: 'center' | 'bottom-left' | 'top-left' | 'split';
  selectedFont?: string;
  titleFontSize?: number;
  artistFontSize?: number;
  textOffsetX?: number;
  textOffsetY?: number;
  textRotation?: number;
  letterSpacing?: number;
  textGlowIntensity?: number;
  isTitleUppercase?: boolean;
  scanlinesIntensity: number;
  vignetteIntensity: number;
  showVinylWear: boolean;
  showCassetteFrame?: boolean;
  showBoingBall: boolean;
  showBarcode: boolean;
  showGridFloor: boolean;
  uploadedImageUrl: string | null;
  imageBrightness: number;
  imageContrast: number;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  imageFitMode?: 'cover' | 'contain';
  imageOpacity?: number;
  imageBlur?: number;
  boingBallX?: number;
  boingBallY?: number;
  boingBallScale?: number;
}

export interface CoverStateSnapshot {
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  badgeText: string;
  catalogNum: string;
  presetTheme: CoverPresetTheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  fontArchetype: 'pixel' | 'cyber' | 'clean' | 'display' | 'bold';
  textAlignment: 'center' | 'bottom-left' | 'top-left' | 'split';
  selectedFont: string;
  titleFontSize: number;
  artistFontSize: number;
  textOffsetX: number;
  textOffsetY: number;
  textRotation: number;
  letterSpacing: number;
  textGlowIntensity: number;
  isTitleUppercase: boolean;
  scanlinesIntensity: number;
  vignetteIntensity: number;
  showVinylWear: boolean;
  showCassetteFrame?: boolean;
  showBoingBall: boolean;
  showBarcode: boolean;
  showGridFloor: boolean;
  uploadedImageUrl: string | null;
  imageBrightness: number;
  imageContrast: number;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  imageRotation: number;
  imageFitMode: 'cover' | 'contain';
  imageOpacity: number;
  imageBlur: number;
  boingBallX: number;
  boingBallY: number;
  boingBallScale: number;
}

const CUSTOM_COVERS_STORAGE_KEY = 'syn_tracker_custom_covers_v1';

interface CoverDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: TrackerSong;
  onUpdateSong: (updated: Partial<TrackerSong>) => void;
  onShowToast: (msg: string) => void;
  activeChipSystem?: RetroChipSystem | null;
  onSelectPersona?: (persona: AppPersona) => void;
  onOpenSupport?: () => void;
  showSupportButton?: boolean;
}

export const CoverDesignerModal: React.FC<CoverDesignerModalProps> = ({
  isOpen,
  onClose,
  song,
  onUpdateSong,
  onShowToast,
  activeChipSystem,
  onSelectPersona,
  onOpenSupport,
  showSupportButton = true,
}) => {
  // Core Metadata States
  const [title, setTitle] = useState(song.name || 'Back on Track');
  const [artist, setArtist] = useState(song.artist || 'SYN-Tracker Music');
  const [album, setAlbum] = useState(song.album || 'Chiptune Anthology Vol. 1');
  const [year, setYear] = useState(song.year || new Date().getFullYear().toString());
  const [genre, setGenre] = useState(song.genre || 'Chiptune / Tracker');
  const [badgeText, setBadgeText] = useState<string>(() => {
    if (activeChipSystem === 'c64') return 'COMMODORE 64 SID';
    if (activeChipSystem === 'amiga') return 'AMIGA 500 PAULA';
    if (activeChipSystem === 'gameboy') return 'GAME BOY DMG-01';
    if (activeChipSystem === 'nes') return 'NES 2A03 RICOH';
    if (activeChipSystem === 'megadrive') return 'MEGA DRIVE YM2612';
    return 'SYN-TRACKER 16-BIT';
  });
  const [catalogNum, setCatalogNum] = useState(`SYN-${Math.floor(100 + Math.random() * 900)}-TRK`);

  // Design & Style Parameters
  const [presetTheme, setPresetTheme] = useState<CoverPresetTheme>('amiga_copper');
  const [primaryColor, setPrimaryColor] = useState('#38bdf8'); // Sky blue
  const [secondaryColor, setSecondaryColor] = useState('#f43f5e'); // Rose
  const [accentColor, setAccentColor] = useState('#fbbf24'); // Amber
  const [bgColor, setBgColor] = useState('#0b1017');

  // Font Archetype, Google Fonts & Layout
  const [fontArchetype, setFontArchetype] = useState<'pixel' | 'cyber' | 'clean' | 'display' | 'bold'>('cyber');
  const [selectedFont, setSelectedFont] = useState<string>('orbitron');
  const [textAlignment, setTextAlignment] = useState<'center' | 'bottom-left' | 'top-left' | 'split'>('bottom-left');
  const [titleFontSize, setTitleFontSize] = useState<number>(0); // 0 = Auto
  const [artistFontSize, setArtistFontSize] = useState<number>(32);
  const [textOffsetX, setTextOffsetX] = useState<number>(0);
  const [textOffsetY, setTextOffsetY] = useState<number>(0);
  const [textRotation, setTextRotation] = useState<number>(0);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textGlowIntensity, setTextGlowIntensity] = useState<number>(16);
  const [isTitleUppercase, setIsTitleUppercase] = useState<boolean>(true);

  // Texture & Effects Overlays
  const [scanlinesIntensity, setScanlinesIntensity] = useState<number>(35);
  const [vignetteIntensity, setVignetteIntensity] = useState<number>(45);
  const [showVinylWear, setShowVinylWear] = useState<boolean>(false);
  const [showBoingBall, setShowBoingBall] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showGridFloor, setShowGridFloor] = useState<boolean>(true);

  // Procedural Elements Fine Position
  const [boingBallX, setBoingBallX] = useState<number>(0);
  const [boingBallY, setBoingBallY] = useState<number>(0);
  const [boingBallScale, setBoingBallScale] = useState<number>(100);

  // Custom User Image Upload & Transformation
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [imageBrightness, setImageBrightness] = useState<number>(100);
  const [imageContrast, setImageContrast] = useState<number>(100);
  const [imageScale, setImageScale] = useState<number>(100);
  const [imageOffsetX, setImageOffsetX] = useState<number>(0);
  const [imageOffsetY, setImageOffsetY] = useState<number>(0);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageFitMode, setImageFitMode] = useState<'cover' | 'contain'>('cover');
  const [imageOpacity, setImageOpacity] = useState<number>(100);
  const [imageBlur, setImageBlur] = useState<number>(0);

  // Mockup view mode (Flat 1:1, Vinyl 12", Audio CD, Cassette Jewel Box)
  const [mockupMode, setMockupMode] = useState<'flat' | 'vinyl' | 'cd' | 'cassette'>('flat');
  const [bakeTargetMode, setBakeTargetMode] = useState<'active' | 'flat'>('active');
  const [isApplying, setIsApplying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Active parameter tab for organized editing
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'typography' | 'artwork' | 'colors'>('presets');

  // Saved Custom Covers Library
  const [customCovers, setCustomCovers] = useState<CustomCoverPreset[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_COVERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveCoverName, setSaveCoverName] = useState<string>('');

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cassetteBandCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const k7ImageRef = useRef<HTMLImageElement | null>(null);
  const [, setK7LoadedState] = useState<boolean>(false);

  // Pre-load /K7.png for canvas baking and mockup overlays
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/K7.png';
    img.onload = () => {
      k7ImageRef.current = img;
      setK7LoadedState(true);
    };
  }, []);

  // Save custom covers to localStorage
  const persistCustomCovers = (list: CustomCoverPreset[]) => {
    setCustomCovers(list);
    try {
      localStorage.setItem(CUSTOM_COVERS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save custom covers to localStorage:', e);
    }
  };

  // Sync with song props on open
  useEffect(() => {
    if (isOpen) {
      setTitle(song.name || 'Back on Track');
      if (song.artist) setArtist(song.artist);
      if (song.album) setAlbum(song.album);
      if (song.year) setYear(song.year);
      if (song.genre) setGenre(song.genre);
      if (song.coverArt && !uploadedImageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setUploadedImage(img);
          setUploadedImageUrl(song.coverArt!);
        };
        img.src = song.coverArt;
      }
    }
  }, [isOpen, song.name, song.artist, song.album, song.year, song.genre, song.coverArt]);

  // History State for Undo / Redo
  const [history, setHistory] = useState<CoverStateSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoingRedoingRef = useRef<boolean>(false);
  const recordTimeoutRef = useRef<any>(null);

  // Capture current state snapshot
  const getCurrentSnapshot = useCallback((): CoverStateSnapshot => {
    return {
      title,
      artist,
      album,
      year,
      genre,
      badgeText,
      catalogNum,
      presetTheme,
      primaryColor,
      secondaryColor,
      accentColor,
      bgColor,
      fontArchetype,
      textAlignment,
      selectedFont,
      titleFontSize,
      artistFontSize,
      textOffsetX,
      textOffsetY,
      textRotation,
      letterSpacing,
      textGlowIntensity,
      isTitleUppercase,
      scanlinesIntensity,
      vignetteIntensity,
      showVinylWear,
      showBoingBall,
      showBarcode,
      showGridFloor,
      uploadedImageUrl,
      imageBrightness,
      imageContrast,
      imageScale,
      imageOffsetX,
      imageOffsetY,
      imageRotation,
      imageFitMode,
      imageOpacity,
      imageBlur,
      boingBallX,
      boingBallY,
      boingBallScale,
    };
  }, [
    title,
    artist,
    album,
    year,
    genre,
    badgeText,
    catalogNum,
    presetTheme,
    primaryColor,
    secondaryColor,
    accentColor,
    bgColor,
    fontArchetype,
    textAlignment,
    selectedFont,
    titleFontSize,
    artistFontSize,
    textOffsetX,
    textOffsetY,
    textRotation,
    letterSpacing,
    textGlowIntensity,
    isTitleUppercase,
    scanlinesIntensity,
    vignetteIntensity,
    showVinylWear,
    showBoingBall,
    showBarcode,
    showGridFloor,
    uploadedImageUrl,
    imageBrightness,
    imageContrast,
    imageScale,
    imageOffsetX,
    imageOffsetY,
    imageRotation,
    imageFitMode,
    imageOpacity,
    imageBlur,
    boingBallX,
    boingBallY,
    boingBallScale,
  ]);

  // Apply a state snapshot
  const applySnapshot = useCallback((snap: CoverStateSnapshot) => {
    isUndoingRedoingRef.current = true;
    setTitle(snap.title);
    setArtist(snap.artist);
    setAlbum(snap.album);
    setYear(snap.year);
    setGenre(snap.genre);
    setBadgeText(snap.badgeText);
    setCatalogNum(snap.catalogNum);
    setPresetTheme(snap.presetTheme);
    setPrimaryColor(snap.primaryColor);
    setSecondaryColor(snap.secondaryColor);
    setAccentColor(snap.accentColor);
    setBgColor(snap.bgColor);
    setFontArchetype(snap.fontArchetype);
    setTextAlignment(snap.textAlignment);
    setSelectedFont(snap.selectedFont || 'orbitron');
    setTitleFontSize(snap.titleFontSize || 0);
    setArtistFontSize(snap.artistFontSize || 32);
    setTextOffsetX(snap.textOffsetX || 0);
    setTextOffsetY(snap.textOffsetY || 0);
    setTextRotation(snap.textRotation || 0);
    setLetterSpacing(snap.letterSpacing || 0);
    setTextGlowIntensity(snap.textGlowIntensity ?? 16);
    setIsTitleUppercase(snap.isTitleUppercase ?? true);
    setScanlinesIntensity(snap.scanlinesIntensity);
    setVignetteIntensity(snap.vignetteIntensity);
    setShowVinylWear(snap.showVinylWear);
    setShowBoingBall(snap.showBoingBall);
    setShowBarcode(snap.showBarcode);
    setShowGridFloor(snap.showGridFloor);
    setImageBrightness(snap.imageBrightness);
    setImageContrast(snap.imageContrast);
    setImageScale(snap.imageScale || 100);
    setImageOffsetX(snap.imageOffsetX || 0);
    setImageOffsetY(snap.imageOffsetY || 0);
    setImageRotation(snap.imageRotation || 0);
    setImageFitMode(snap.imageFitMode || 'cover');
    setImageOpacity(snap.imageOpacity ?? 100);
    setImageBlur(snap.imageBlur || 0);
    setBoingBallX(snap.boingBallX || 0);
    setBoingBallY(snap.boingBallY || 0);
    setBoingBallScale(snap.boingBallScale || 100);

    if (snap.uploadedImageUrl !== uploadedImageUrl) {
      setUploadedImageUrl(snap.uploadedImageUrl);
      if (snap.uploadedImageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setUploadedImage(img);
        img.src = snap.uploadedImageUrl;
      } else {
        setUploadedImage(null);
      }
    }

    setTimeout(() => {
      isUndoingRedoingRef.current = false;
    }, 50);
  }, [uploadedImageUrl]);

  // Push snapshot into history when properties change
  useEffect(() => {
    if (!isOpen) return;
    if (isUndoingRedoingRef.current) return;

    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
    }

    recordTimeoutRef.current = setTimeout(() => {
      const snap = getCurrentSnapshot();
      setHistory((prev) => {
        const truncated = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : [];
        if (truncated.length > 0) {
          const last = truncated[truncated.length - 1];
          if (JSON.stringify(last) === JSON.stringify(snap)) {
            return prev;
          }
        }
        const updated = [...truncated, snap].slice(-30);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    }, 180);

    return () => {
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    };
  }, [isOpen, getCurrentSnapshot, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      setHistoryIndex(targetIdx);
      applySnapshot(history[targetIdx]);
    }
  }, [historyIndex, history, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      setHistoryIndex(targetIdx);
      applySnapshot(history[targetIdx]);
    }
  }, [historyIndex, history, applySnapshot]);

  // Keyboard shortcut listener for Undo (Ctrl+Z) / Redo (Ctrl+Y, Ctrl+Shift+Z) inside Cover Modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  // Handle Preset Theme Changes
  const applyPresetTheme = (theme: CoverPresetTheme) => {
    setPresetTheme(theme);
    switch (theme) {
      case 'amiga_copper':
        setPrimaryColor('#38bdf8');
        setSecondaryColor('#ec4899');
        setAccentColor('#fbbf24');
        setBgColor('#070b12');
        setFontArchetype('pixel');
        setSelectedFont('vt323');
        setTextAlignment('bottom-left');
        setShowBoingBall(true);
        setShowGridFloor(true);
        setShowVinylWear(false);
        setScanlinesIntensity(40);
        break;
      case 'synthwave_outrun':
        setPrimaryColor('#f43f5e');
        setSecondaryColor('#38bdf8');
        setAccentColor('#fbbf24');
        setBgColor('#0a0618');
        setFontArchetype('cyber');
        setSelectedFont('righteous');
        setTextAlignment('center');
        setShowBoingBall(false);
        setShowGridFloor(true);
        setShowVinylWear(false);
        setScanlinesIntensity(25);
        break;
      case 'c64_sid':
        setPrimaryColor('#70a4b2');
        setSecondaryColor('#887ecb');
        setAccentColor('#ffffff');
        setBgColor('#40318d');
        setFontArchetype('pixel');
        setSelectedFont('press_start');
        setTextAlignment('center');
        setShowBoingBall(false);
        setShowGridFloor(false);
        setShowVinylWear(false);
        setScanlinesIntensity(50);
        break;
      case 'vinyl_record':
        setPrimaryColor('#e2e8f0');
        setSecondaryColor('#94a3b8');
        setAccentColor('#38bdf8');
        setBgColor('#0f172a');
        setFontArchetype('display');
        setSelectedFont('cinzel');
        setTextAlignment('bottom-left');
        setShowVinylWear(true);
        setShowBoingBall(false);
        setShowGridFloor(false);
        setScanlinesIntensity(15);
        break;
      case 'minimal_modern':
        // Swiss International Style Poster
        setPrimaryColor('#09090b');
        setSecondaryColor('#dc2626');
        setAccentColor('#2563eb');
        setBgColor('#f4f4f5');
        setFontArchetype('bold');
        setSelectedFont('syne');
        setTextAlignment('top-left');
        setShowBoingBall(false);
        setShowGridFloor(false);
        setShowVinylWear(false);
        setShowBarcode(true);
        setScanlinesIntensity(0);
        setVignetteIntensity(0);
        break;
      case 'arcade_pixel':
        setPrimaryColor('#22c55e');
        setSecondaryColor('#eab308');
        setAccentColor('#ef4444');
        setBgColor('#050505');
        setFontArchetype('pixel');
        setSelectedFont('press_start');
        setTextAlignment('center');
        setShowBoingBall(false);
        setShowGridFloor(true);
        setShowVinylWear(false);
        setScanlinesIntensity(60);
        break;
      case 'cosmic_nebula':
        setPrimaryColor('#a855f7');
        setSecondaryColor('#38bdf8');
        setAccentColor('#f472b6');
        setBgColor('#05020c');
        setFontArchetype('cyber');
        setSelectedFont('audiowide');
        setTextAlignment('center');
        setShowBoingBall(false);
        setShowGridFloor(false);
        setShowVinylWear(false);
        setScanlinesIntensity(20);
        break;
    }
  };

  // Handle Custom Image Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setUploadedImageUrl(dataUrl);
        onShowToast('Custom artwork image uploaded');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Render Canvas Artwork Generator
  const renderCover = useCallback(
    (canvas: HTMLCanvasElement, width = 960, height = 960) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;

      const isSwissTheme = presetTheme === 'minimal_modern' && !uploadedImage;

      // 1. Background Fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // 2. Custom Uploaded Image or Procedural Backgrounds
      if (uploadedImage) {
        ctx.save();
        ctx.filter = `brightness(${imageBrightness}%) contrast(${imageContrast}%)${imageBlur > 0 ? ` blur(${imageBlur}px)` : ''}`;
        ctx.globalAlpha = Math.max(0.05, Math.min(1.0, imageOpacity / 100));

        // Scale to fill square canvas
        const imgAspect = uploadedImage.width / uploadedImage.height;
        let baseW = width;
        let baseH = height;

        if (imageFitMode === 'contain') {
          if (imgAspect > 1) {
            baseW = width;
            baseH = width / imgAspect;
          } else {
            baseH = height;
            baseW = height * imgAspect;
          }
        } else {
          // 'cover' / default
          if (imgAspect > 1) {
            baseW = height * imgAspect;
            baseH = height;
          } else {
            baseH = width / imgAspect;
            baseW = width;
          }
        }

        const finalW = baseW * (imageScale / 100);
        const finalH = baseH * (imageScale / 100);

        // Center + user offsets
        const centerX = width / 2 + imageOffsetX;
        const centerY = height / 2 + imageOffsetY;

        ctx.translate(centerX, centerY);
        if (imageRotation !== 0) {
          ctx.rotate((imageRotation * Math.PI) / 180);
        }

        ctx.drawImage(uploadedImage, -finalW / 2, -finalH / 2, finalW, finalH);
        ctx.restore();

        // Dark gradient tint over image for typography legibility
        const grad = ctx.createLinearGradient(0, height * 0.3, 0, height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(5, 8, 14, 0.88)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Procedural Themes
        if (presetTheme === 'amiga_copper') {
          // Classic Amiga Copper Rainbow Horizon Bars
          const copperGradient = ctx.createLinearGradient(0, 0, 0, height * 0.65);
          copperGradient.addColorStop(0.0, '#040711');
          copperGradient.addColorStop(0.2, '#0c1b33');
          copperGradient.addColorStop(0.4, '#1e3a8a');
          copperGradient.addColorStop(0.55, primaryColor);
          copperGradient.addColorStop(0.7, secondaryColor);
          copperGradient.addColorStop(0.85, accentColor);
          copperGradient.addColorStop(1.0, '#040711');
          ctx.fillStyle = copperGradient;
          ctx.fillRect(0, 0, width, height * 0.65);

          // Horizontal copper glow lines
          for (let i = 0; i < 8; i++) {
            const y = height * 0.45 + i * 16;
            ctx.fillStyle = i % 2 === 0 ? primaryColor : secondaryColor;
            ctx.globalAlpha = 0.4 - i * 0.04;
            ctx.fillRect(0, y, width, 4);
          }
          ctx.globalAlpha = 1.0;
        } else if (presetTheme === 'synthwave_outrun') {
          // Sunset sky
          const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
          skyGrad.addColorStop(0, '#090314');
          skyGrad.addColorStop(0.4, '#240638');
          skyGrad.addColorStop(0.7, '#670b4a');
          skyGrad.addColorStop(1, '#c026d3');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, width, height * 0.6);

          // Sliced Neon Sunset Sun (Clipped cleanly to circular arc)
          const sunX = width / 2;
          const sunY = height * 0.42;
          const sunR = width * 0.22;
          const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
          sunGrad.addColorStop(0, '#fde047');
          sunGrad.addColorStop(0.5, '#f43f5e');
          sunGrad.addColorStop(1, '#9333ea');

          ctx.save();
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
          ctx.clip(); // Cleanly clip both the gradient sun and all horizontal black slice gaps

          ctx.fillStyle = sunGrad;
          ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

          // Slices across bottom half of sun
          ctx.fillStyle = '#0a0618';
          const sliceCount = 9;
          for (let s = 0; s < sliceCount; s++) {
            const sliceY = sunY + (s / sliceCount) * sunR * 0.95;
            const sliceH = 3.5 + s * 3.8;
            ctx.fillRect(sunX - sunR - 10, sliceY, (sunR + 10) * 2, sliceH);
          }
          ctx.restore();
        } else if (presetTheme === 'c64_sid') {
          // C64 Authentic Thick Blue Border & Dark Blue Inner Screen
          const c64BorderWidth = width * 0.12; // Distinctive thick C64 border
          ctx.fillStyle = '#70a4b2'; // C64 Outer Border Light Blue
          ctx.fillRect(0, 0, width, height);

          // Dark blue inner 40-column screen
          ctx.fillStyle = '#40318d';
          ctx.fillRect(c64BorderWidth, c64BorderWidth, width - c64BorderWidth * 2, height - c64BorderWidth * 2);

          // Top C64 System Header properly sized to fit within inner screen
          ctx.fillStyle = '#70a4b2';
          ctx.font = 'bold 15px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('**** COMMODORE 64 64K RAM SYSTEM 38911 BASIC BYTES FREE ****', width / 2, c64BorderWidth + 34);
          ctx.fillText('READY.', width / 2, c64BorderWidth + 58);
        } else if (presetTheme === 'cosmic_nebula') {
          // Deep space starfield
          const nebGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 50, width * 0.5, height * 0.5, width * 0.7);
          nebGrad.addColorStop(0, '#581c87');
          nebGrad.addColorStop(0.3, '#1e1b4b');
          nebGrad.addColorStop(0.7, '#0f172a');
          nebGrad.addColorStop(1, '#030712');
          ctx.fillStyle = nebGrad;
          ctx.fillRect(0, 0, width, height);

          // Stars
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 180; i++) {
            const sx = (Math.sin(i * 99 + 12) * 0.5 + 0.5) * width;
            const sy = (Math.cos(i * 33 + 7) * 0.5 + 0.5) * height;
            const sr = i % 5 === 0 ? 2.5 : 1.2;
            ctx.globalAlpha = 0.3 + (i % 7) * 0.1;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;
        } else if (presetTheme === 'minimal_modern') {
          // Authentic Swiss International Typographic Style (Max Bill / Josef Müller-Brockmann)
          // Crisp clean architecture canvas
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, width, height);

          // Bold structural Swiss Grid divisions
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;

          // Top Header Line
          ctx.beginPath();
          ctx.moveTo(width * 0.08, height * 0.16);
          ctx.lineTo(width * 0.92, height * 0.16);
          ctx.stroke();

          // Middle Horizontal Line separating geometry & info
          ctx.beginPath();
          ctx.moveTo(width * 0.08, height * 0.72);
          ctx.lineTo(width * 0.92, height * 0.72);
          ctx.stroke();

          // Constructivist Swiss Vermilion Circle (Right hemisphere)
          ctx.fillStyle = secondaryColor || '#dc2626';
          ctx.beginPath();
          ctx.arc(width * 0.68, height * 0.44, width * 0.22, 0, Math.PI * 2);
          ctx.fill();

          // Constructivist Cobalt Blue Accent Quadrant (Diagonal lower)
          ctx.fillStyle = accentColor || '#2563eb';
          ctx.beginPath();
          ctx.moveTo(width * 0.52, height * 0.44);
          ctx.arc(width * 0.52, height * 0.44, width * 0.14, 0, Math.PI * 0.5, false);
          ctx.closePath();
          ctx.fill();

          // Small Swiss Cross / Plus Icon
          ctx.fillStyle = '#09090b';
          const crossX = width * 0.88;
          const crossY = height * 0.11;
          const crossS = 18;
          const crossT = 4;
          ctx.fillRect(crossX - crossS / 2, crossY - crossT / 2, crossS, crossT);
          ctx.fillRect(crossX - crossT / 2, crossY - crossS / 2, crossT, crossS);
        } else if (presetTheme === 'arcade_pixel') {
          // Retro arcade grid
          ctx.fillStyle = '#05070a';
          ctx.fillRect(0, 0, width, height);

          // Arcade Neon border
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 10;
          ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
        }
      }

      // 3. 3D Perspective Grid Floor
      if (showGridFloor && !uploadedImage && !isSwissTheme) {
        const horizonY = height * 0.6;
        const gridGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        gridGrad.addColorStop(0, '#0b1320');
        gridGrad.addColorStop(1, '#020408');
        ctx.fillStyle = gridGrad;
        ctx.fillRect(0, horizonY, width, height - horizonY);

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;

        // Horizontal perspective lines
        const numH = 16;
        for (let i = 1; i <= numH; i++) {
          const norm = Math.pow(i / numH, 2.4);
          const y = horizonY + norm * (height - horizonY);
          ctx.globalAlpha = 0.15 + norm * 0.7;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Perspective Rays from center vanishing point
        const numV = 20;
        const vanishX = width / 2;
        for (let i = -numV; i <= numV; i++) {
          const bottomX = vanishX + (i / numV) * width * 1.6;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(vanishX, horizonY);
          ctx.lineTo(bottomX, height);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      // 4. Amiga Boing Ball (3D Checker Ball)
      if (showBoingBall && !uploadedImage && !isSwissTheme) {
        const bx = width * 0.78 + boingBallX;
        const by = height * 0.38 + boingBallY;
        const br = Math.max(10, width * 0.15 * (boingBallScale / 100));

        // Shadow under ball
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(bx, by + br * 1.2, br * 0.9, br * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Ball Sphere
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.clip();

        // White & Red checker segments
        const segments = 12;
        for (let lat = 0; lat < segments; lat++) {
          for (let lon = 0; lon < segments; lon++) {
            const isRed = (lat + lon) % 2 === 0;
            ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
            const y1 = by - br + (lat / segments) * (br * 2);
            const y2 = by - br + ((lat + 1) / segments) * (br * 2);
            const x1 = bx - br + (lon / segments) * (br * 2);
            const x2 = bx - br + ((lon + 1) / segments) * (br * 2);
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          }
        }

        // Specular 3D Lighting Dome
        const sphereShade = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br);
        sphereShade.addColorStop(0, 'rgba(255,255,255,0.7)');
        sphereShade.addColorStop(0.4, 'rgba(255,255,255,0.0)');
        sphereShade.addColorStop(0.9, 'rgba(0,0,0,0.5)');
        sphereShade.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = sphereShade;
        ctx.fillRect(bx - br, by - br, br * 2, br * 2);
        ctx.restore();
      }

      // 5. Hardware Format Badge (Top Right or Top Left)
      ctx.save();
      const badgeY = height * 0.07;
      const badgeX = width * 0.08;

      if (isSwissTheme) {
        // Minimal Swiss Typographic Badge
        ctx.fillStyle = '#09090b';
        ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText.toUpperCase(), badgeX, badgeY + 16);

        // Catalog & Year on the right
        ctx.fillStyle = '#475569';
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${catalogNum} • ${year}`, width * 0.82, badgeY + 16);
      } else {
        ctx.fillStyle = 'rgba(7, 11, 16, 0.85)';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, width * 0.38, 38, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = primaryColor;
        ctx.font = '900 15px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`● ${badgeText}`, badgeX + 14, badgeY + 19);

        // Catalog / Year Stamp
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${catalogNum} • ${year}`, width * 0.92, badgeY + 19);
      }
      ctx.restore();

      // 6. Typography & Titles with Guaranteed Legibility and Custom Transforms
      ctx.save();
      const fontMatch = GOOGLE_FONTS_LIST.find((f) => f.id === selectedFont);
      let fontName = fontMatch ? fontMatch.fontFamily : 'sans-serif';
      if (!fontMatch) {
        if (fontArchetype === 'pixel') fontName = 'monospace';
        else if (fontArchetype === 'cyber') fontName = 'system-ui, sans-serif';
        else if (fontArchetype === 'display') fontName = 'Georgia, serif';
        else if (fontArchetype === 'bold' || isSwissTheme) fontName = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      }

      const displayTitle = isTitleUppercase ? title.toUpperCase() : title;

      if (isSwissTheme) {
        // SWISS MINIMAL POSTER TYPOGRAPHY (Crystal clear black typography with perfect spacing)
        let mainTitleX = width * 0.08 + textOffsetX;
        let mainTitleY = height * 0.28 + textOffsetY;

        ctx.save();
        if (textRotation !== 0) {
          ctx.translate(mainTitleX, mainTitleY);
          ctx.rotate((textRotation * Math.PI) / 180);
          ctx.translate(-mainTitleX, -mainTitleY);
        }

        if ('letterSpacing' in ctx && letterSpacing !== 0) {
          (ctx as any).letterSpacing = `${letterSpacing}px`;
        }

        ctx.fillStyle = primaryColor || '#09090b';
        ctx.textAlign = textAlignment === 'center' ? 'center' : 'left';
        if (textAlignment === 'center') mainTitleX = width / 2 + textOffsetX;

        // Main Title (Swiss heavy font)
        const autoSize = title.length > 20 ? 64 : title.length > 12 ? 76 : 92;
        const fontSize = titleFontSize > 0 ? titleFontSize : autoSize;
        ctx.font = `900 ${fontSize}px ${fontName}`;
        ctx.fillText(displayTitle, mainTitleX, mainTitleY);

        // Artist Name
        ctx.fillStyle = secondaryColor || '#dc2626'; // Swiss red contrast accent
        const artSize = artistFontSize > 0 ? artistFontSize : 36;
        ctx.font = `800 ${artSize}px ${fontName}`;
        ctx.fillText(artist, mainTitleX, mainTitleY + fontSize * 0.6 + 8);
        ctx.restore();

        // Grid 2-Column Info at bottom
        const bottomInfoY = height * 0.79;

        // Col 1: Album & Release
        ctx.fillStyle = '#09090b';
        ctx.font = `800 13px ${fontName}`;
        ctx.fillText('ALBUM / RECORDING', width * 0.08, bottomInfoY);
        ctx.fillStyle = '#475569';
        ctx.font = `500 18px ${fontName}`;
        ctx.fillText(album, width * 0.08, bottomInfoY + 24);

        // Col 2: Genre & Architecture
        ctx.fillStyle = '#09090b';
        ctx.font = `800 13px ${fontName}`;
        ctx.fillText('GENRE & ARCHITECTURE', width * 0.44, bottomInfoY);
        ctx.fillStyle = '#475569';
        ctx.font = `500 18px ${fontName}`;
        ctx.fillText(`${genre} • 16-BIT TRACKER`, width * 0.44, bottomInfoY + 24);
      } else {
        // RETRO, CYBER & CUSTOM THEMES TYPOGRAPHY
        let titleX = width * 0.08 + textOffsetX;
        let titleY = height * 0.78 + textOffsetY;
        let align: CanvasTextAlign = 'left';

        if (textAlignment === 'center') {
          titleX = width / 2 + textOffsetX;
          titleY = height * 0.74 + textOffsetY;
          align = 'center';
        } else if (textAlignment === 'top-left') {
          titleX = width * 0.08 + textOffsetX;
          titleY = height * 0.32 + textOffsetY;
          align = 'left';
        }

        ctx.save();
        if (textRotation !== 0) {
          ctx.translate(titleX, titleY);
          ctx.rotate((textRotation * Math.PI) / 180);
          ctx.translate(-titleX, -titleY);
        }

        if ('letterSpacing' in ctx && letterSpacing !== 0) {
          (ctx as any).letterSpacing = `${letterSpacing}px`;
        }

        ctx.textAlign = align;

        // Glow / Shadow behind text for dark themes
        if (textGlowIntensity > 0) {
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = textGlowIntensity;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = '#ffffff';

        // Main Song Title (Responsive size)
        const autoSize = title.length > 20 ? 54 : title.length > 14 ? 64 : 76;
        const fontSize = titleFontSize > 0 ? titleFontSize : autoSize;
        ctx.font = `900 ${fontSize}px ${fontName}`;
        ctx.fillText(displayTitle, titleX, titleY);

        // Secondary Artist Name
        ctx.shadowBlur = 0;
        ctx.fillStyle = primaryColor;
        const artSize = artistFontSize > 0 ? artistFontSize : 32;
        ctx.font = `700 ${artSize}px ${fontName}`;
        const artistGap = fontSize * 0.55 + 6;
        ctx.fillText(artist, titleX, titleY + (textAlignment === 'top-left' ? 48 : artistGap));

        // Subtitle / Album & Genre
        ctx.fillStyle = '#cbd5e1';
        ctx.font = `500 20px monospace`;
        ctx.fillText(`${album} • ${genre}`, titleX, titleY + (textAlignment === 'top-left' ? 84 : artistGap + 36));
        ctx.restore();
      }

      ctx.restore();

      // 8. Vinyl Sleeve Circular Ring Wear
      if (showVinylWear) {
        ctx.save();
        const vx = width / 2;
        const vy = height / 2;
        const vr = width * 0.42;

        const ringGrad = ctx.createRadialGradient(vx, vy, vr * 0.85, vx, vy, vr * 1.05);
        ringGrad.addColorStop(0, 'rgba(255,255,255,0.0)');
        ringGrad.addColorStop(0.5, isSwissTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.22)');
        ringGrad.addColorStop(1, 'rgba(255,255,255,0.0)');

        ctx.fillStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(vx, vy, vr * 1.05, 0, Math.PI * 2);
        ctx.fill();

        // Edge distressed cardboard frame
        ctx.strokeStyle = isSwissTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, width - 8, height - 8);
        ctx.restore();
      }

      // 9. Barcode / Authenticity Seal
      if (showBarcode) {
        ctx.save();
        const barX = width * 0.82;
        const barY = isSwissTheme ? height * 0.78 : height * 0.86;
        const barW = width * 0.12;
        const barH = 44;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(barX - 6, barY - 6, barW + 12, barH + 18);

        ctx.fillStyle = '#000000';
        const numLines = 24;
        for (let b = 0; b < numLines; b++) {
          const lx = barX + (b / numLines) * barW;
          const lw = b % 3 === 0 ? 3.5 : b % 2 === 0 ? 2 : 1;
          ctx.fillRect(lx, barY, lw, barH);
        }

        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(catalogNum, barX + barW / 2, barY + barH + 8);
        ctx.restore();
      }

      // 10. CRT Scanlines Overlay
      if (scanlinesIntensity > 0 && !isSwissTheme) {
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = (scanlinesIntensity / 100) * 0.45;
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 2);
        }
        ctx.globalAlpha = 1.0;
      }

      // 11. Vignette & Film Noise Overlay
      if (vignetteIntensity > 0 && !isSwissTheme) {
        const vigGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.72);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${(vignetteIntensity / 100) * 0.8})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, width, height);
      }
    },
    [
      presetTheme,
      uploadedImage,
      imageBrightness,
      imageContrast,
      bgColor,
      primaryColor,
      secondaryColor,
      accentColor,
      showGridFloor,
      showBoingBall,
      badgeText,
      catalogNum,
      year,
      fontArchetype,
      textAlignment,
      title,
      artist,
      album,
      genre,
      showVinylWear,
      showBarcode,
      scanlinesIntensity,
      vignetteIntensity,
      selectedFont,
      titleFontSize,
      artistFontSize,
      textOffsetX,
      textOffsetY,
      textRotation,
      letterSpacing,
      textGlowIntensity,
      isTitleUppercase,
      boingBallX,
      boingBallY,
      boingBallScale,
      imageScale,
      imageOffsetX,
      imageOffsetY,
      imageRotation,
      imageFitMode,
      imageOpacity,
      imageBlur,
    ]
  );

  // Helper to ensure K7.png image is fully loaded before baking/exporting
  const ensureK7Image = useCallback(async (): Promise<HTMLImageElement | null> => {
    if (k7ImageRef.current && k7ImageRef.current.complete && k7ImageRef.current.naturalWidth > 0) {
      return k7ImageRef.current;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/K7.png';
      img.onload = () => {
        k7ImageRef.current = img;
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
    });
  }, []);

  // Helper: Render full mockup or flat artwork to any target canvas at any resolution
  const renderMockupToCanvas = useCallback(
    async (mode: 'flat' | 'vinyl' | 'cd' | 'cassette', targetCanvas: HTMLCanvasElement, targetDim = 1200) => {
      // 1. Render base artwork 1:1 at 960x960 to an internal offscreen canvas
      const artCanvas = document.createElement('canvas');
      renderCover(artCanvas, 960, 960);

      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      if (mode === 'flat') {
        targetCanvas.width = targetDim;
        targetCanvas.height = targetDim;
        ctx.clearRect(0, 0, targetDim, targetDim);
        ctx.drawImage(artCanvas, 0, 0, targetDim, targetDim);
        return;
      }

      if (mode === 'vinyl') {
        targetCanvas.width = targetDim;
        targetCanvas.height = targetDim;
        ctx.clearRect(0, 0, targetDim, targetDim);

        // Dark studio background with subtle radial gradient matching UI
        const bgGrad = ctx.createRadialGradient(targetDim / 2, targetDim / 2, targetDim * 0.2, targetDim / 2, targetDim / 2, targetDim * 0.7);
        bgGrad.addColorStop(0, '#131a26');
        bgGrad.addColorStop(1, '#070b10');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, targetDim, targetDim);

        // Proportions 100% matched to on-screen preview (Jacket 86%, Disc 86% peeking out gracefully)
        const jSize = targetDim * 0.86;
        const jX = targetDim * 0.05;
        const jY = (targetDim - jSize) / 2;

        const vSize = targetDim * 0.86;
        const vCenter = { x: targetDim * 0.54, y: targetDim / 2 };

        // 1. Vinyl Drop Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = '#050505';
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Vinyl Disc Body (Dark realistic vinyl sheen)
        const discGrad = ctx.createRadialGradient(vCenter.x, vCenter.y, vSize * 0.08, vCenter.x, vCenter.y, vSize * 0.5);
        discGrad.addColorStop(0, '#181b20');
        discGrad.addColorStop(0.5, '#0a0c10');
        discGrad.addColorStop(1, '#050506');
        ctx.fillStyle = discGrad;
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Conic Light Sheen (Reflecting light across vinyl microgrooves)
        ctx.save();
        const sheenConic = ctx.createConicGradient(0, vCenter.x, vCenter.y);
        sheenConic.addColorStop(0, 'rgba(255,255,255,0.12)');
        sheenConic.addColorStop(0.125, 'rgba(255,255,255,0.01)');
        sheenConic.addColorStop(0.25, 'rgba(255,255,255,0.06)');
        sheenConic.addColorStop(0.375, 'rgba(255,255,255,0.01)');
        sheenConic.addColorStop(0.5, 'rgba(255,255,255,0.12)');
        sheenConic.addColorStop(0.625, 'rgba(255,255,255,0.01)');
        sheenConic.addColorStop(0.75, 'rgba(255,255,255,0.06)');
        sheenConic.addColorStop(0.875, 'rgba(255,255,255,0.01)');
        sheenConic.addColorStop(1, 'rgba(255,255,255,0.12)');
        ctx.fillStyle = sheenConic;
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 4. Concentric Vinyl Sound Grooves (Outer Run-in, Track 1, Gap 1, Track 2, Gap 2, Track 3, Dead wax)
        const outerGrooveRatios = [0.47, 0.455, 0.44, 0.425];
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1.0;
        outerGrooveRatios.forEach((ratio) => {
          ctx.beginPath();
          ctx.arc(vCenter.x, vCenter.y, vSize * ratio, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Track 1 Grooves
        const track1Ratios = [0.41, 0.39, 0.375, 0.36];
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1.1;
        track1Ratios.forEach((ratio) => {
          ctx.beginPath();
          ctx.arc(vCenter.x, vCenter.y, vSize * ratio, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Track Gap 1 Separator
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize * 0.345, 0, Math.PI * 2);
        ctx.stroke();

        // Track 2 Grooves
        const track2Ratios = [0.33, 0.31, 0.29, 0.27];
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1.0;
        track2Ratios.forEach((ratio) => {
          ctx.beginPath();
          ctx.arc(vCenter.x, vCenter.y, vSize * ratio, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Track Gap 2 Separator
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize * 0.255, 0, Math.PI * 2);
        ctx.stroke();

        // Track 3 Grooves (Inner)
        const track3Ratios = [0.24, 0.22, 0.205];
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1.0;
        track3Ratios.forEach((ratio) => {
          ctx.beginPath();
          ctx.arc(vCenter.x, vCenter.y, vSize * ratio, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Dead Wax / Run-out Groove Zone
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize * 0.19, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, vSize * 0.175, 0, Math.PI * 2);
        ctx.stroke();

        // 5. Authentic Matte Dark Vinyl Center Label (Positioned at disc center, safely beneath jacket)
        const labelR = vSize * 0.145;
        ctx.save();
        ctx.fillStyle = '#12161f';
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, labelR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Inner Label Ring
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, labelR - 4, 0, Math.PI * 2);
        ctx.stroke();

        // Center Label Typography
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#38bdf8';
        ctx.font = `900 ${Math.round(labelR * 0.18)}px monospace`;
        ctx.fillText('SYN-TRACKER', vCenter.x, vCenter.y - labelR * 0.52);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(labelR * 0.13)}px monospace`;
        ctx.fillText('33⅓ RPM • STEREO', vCenter.x, vCenter.y - labelR * 0.28);

        // Real Spindle Hole
        const holeR = vSize * 0.032;
        ctx.fillStyle = '#05070a';
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, holeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Spindle center black core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(vCenter.x, vCenter.y, holeR * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Catalog & Side A
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${Math.round(labelR * 0.12)}px monospace`;
        ctx.fillText(catalogNum || 'SYN-430', vCenter.x, vCenter.y + labelR * 0.38);

        ctx.font = `bold ${Math.round(labelR * 0.11)}px monospace`;
        ctx.fillText('SIDE A', vCenter.x, vCenter.y + labelR * 0.62);
        ctx.restore();

        // 6. Front Cardboard Jacket (Z-10, exactly matching screen preview)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 15;
        ctx.shadowOffsetY = 22;
        ctx.beginPath();
        ctx.roundRect(jX, jY, jSize, jSize, 14);
        ctx.clip();
        ctx.drawImage(artCanvas, jX, jY, jSize, jSize);

        // Spine Sheen & Cardboard edge
        const spineGrad = ctx.createLinearGradient(jX, jY, jX + 24, jY);
        spineGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
        spineGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        spineGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = spineGrad;
        ctx.fillRect(jX, jY, 24, jSize);
        ctx.restore();

        // Outer jacket border ring
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(jX, jY, jSize, jSize, 14);
        ctx.stroke();
        return;
      }

      if (mode === 'cd') {
        targetCanvas.width = targetDim;
        targetCanvas.height = targetDim;
        ctx.clearRect(0, 0, targetDim, targetDim);

        // Studio Background
        const bgGrad = ctx.createRadialGradient(targetDim / 2, targetDim / 2, targetDim * 0.2, targetDim / 2, targetDim / 2, targetDim * 0.7);
        bgGrad.addColorStop(0, '#141c2b');
        bgGrad.addColorStop(1, '#070b10');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, targetDim, targetDim);

        // 1. CD Disc protruding to the right (positioned neatly in the vertical center, matching UI)
        const jSize = targetDim * 0.86;
        const jX = targetDim * 0.05;
        const jY = (targetDim - jSize) / 2;

        const cdSize = targetDim * 0.84;
        const cdCenter = { x: targetDim * 0.54, y: targetDim / 2 };

        // Disc Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Base Platinum/Silver Disc Surface
        const cdBaseGrad = ctx.createLinearGradient(cdCenter.x - cdSize / 2, cdCenter.y - cdSize / 2, cdCenter.x + cdSize / 2, cdCenter.y + cdSize / 2);
        cdBaseGrad.addColorStop(0, '#cbd5e1');
        cdBaseGrad.addColorStop(0.5, '#f1f5f9');
        cdBaseGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = cdBaseGrad;
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Disc Rainbow Holographic Iridescent Conic Refractions (Soft authentic pastel prism sheen)
        ctx.save();
        const cdGrad = ctx.createConicGradient(35 * Math.PI / 180, cdCenter.x, cdCenter.y);
        cdGrad.addColorStop(0, 'rgba(239,68,68,0.25)');
        cdGrad.addColorStop(0.1, 'rgba(249,115,22,0.28)');
        cdGrad.addColorStop(0.2, 'rgba(234,179,8,0.30)');
        cdGrad.addColorStop(0.32, 'rgba(34,197,94,0.28)');
        cdGrad.addColorStop(0.43, 'rgba(6,182,212,0.30)');
        cdGrad.addColorStop(0.54, 'rgba(59,130,246,0.28)');
        cdGrad.addColorStop(0.65, 'rgba(168,85,247,0.28)');
        cdGrad.addColorStop(0.76, 'rgba(236,72,153,0.28)');
        cdGrad.addColorStop(1.0, 'rgba(239,68,68,0.25)');
        ctx.fillStyle = cdGrad;
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Gloss Light Streaks
        const glossConic = ctx.createConicGradient(120 * Math.PI / 180, cdCenter.x, cdCenter.y);
        glossConic.addColorStop(0, 'rgba(255,255,255,0.40)');
        glossConic.addColorStop(0.125, 'rgba(255,255,255,0.0)');
        glossConic.addColorStop(0.25, 'rgba(255,255,255,0.25)');
        glossConic.addColorStop(0.375, 'rgba(255,255,255,0.0)');
        glossConic.addColorStop(0.5, 'rgba(255,255,255,0.40)');
        glossConic.addColorStop(0.625, 'rgba(255,255,255,0.0)');
        glossConic.addColorStop(0.75, 'rgba(255,255,255,0.25)');
        glossConic.addColorStop(0.875, 'rgba(255,255,255,0.0)');
        glossConic.addColorStop(1, 'rgba(255,255,255,0.40)');
        ctx.fillStyle = glossConic;
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Concentric Micro-Tracks (Data Pit Spirals - 9 precise rings)
        const microTrackRatios = [0.48, 0.46, 0.435, 0.405, 0.375, 0.34, 0.305, 0.265, 0.235];
        microTrackRatios.forEach((rRatio, idx) => {
          ctx.strokeStyle = idx % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.30)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(cdCenter.x, cdCenter.y, cdSize * rRatio, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Mirror Clamping Ring (Lead-out Zone Transition)
        const mirrorRingGrad = ctx.createLinearGradient(cdCenter.x - cdSize * 0.21, cdCenter.y, cdCenter.x + cdSize * 0.21, cdCenter.y);
        mirrorRingGrad.addColorStop(0, '#e2e8f0');
        mirrorRingGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = mirrorRingGrad;
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize * 0.21, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,116,139,0.7)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Inner Mirror Ring Highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize * 0.185, 0, Math.PI * 2);
        ctx.stroke();

        // Polycarbonate Clear Hub Area
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize * 0.165, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize * 0.125, 0, Math.PI * 2);
        ctx.stroke();

        // Spindle Hole
        ctx.fillStyle = '#070b10';
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(203,213,225,0.8)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Spindle Center Black Core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cdCenter.x, cdCenter.y, cdSize * 0.035, 0, Math.PI * 2);
        ctx.fill();

        // 2. Front Jewel Case & Booklet (Solid cover with glossy transparent overlays, matching UI preview)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 15;
        ctx.shadowOffsetY = 22;

        ctx.beginPath();
        ctx.roundRect(jX, jY, jSize, jSize, 12);
        ctx.clip();
        ctx.drawImage(artCanvas, jX, jY, jSize, jSize);

        // Spine Hinge on Left (Plastic Strip with edge highlight)
        const hingeW = jSize * 0.038;
        const hingeGrad = ctx.createLinearGradient(jX, jY, jX + hingeW, jY);
        hingeGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        hingeGrad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
        hingeGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = hingeGrad;
        ctx.fillRect(jX, jY, hingeW, jSize);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(jX + hingeW, jY);
        ctx.lineTo(jX + hingeW, jY + jSize);
        ctx.stroke();

        // Clear Jewel Case Diagonal Gloss Sheen
        const sheenGrad = ctx.createLinearGradient(jX, jY, jX + jSize, jY + jSize);
        sheenGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
        sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.07)');
        sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(jX, jY, jSize, jSize);

        // Two Booklet Retention Tabs on the right edge
        const tabW = 6;
        const tabH = jSize * 0.06;
        const tab1Y = jY + jSize * 0.26;
        const tab2Y = jY + jSize * 0.74;

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.roundRect(jX + jSize - tabW, tab1Y, tabW, tabH, [4, 0, 0, 4]);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(jX + jSize - tabW, tab2Y, tabW, tabH, [4, 0, 0, 4]);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Jewel Case Rim
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(jX, jY, jSize, jSize, 12);
        ctx.stroke();
        return;
      }

      if (mode === 'cassette') {
        targetCanvas.width = targetDim;
        targetCanvas.height = targetDim;
        ctx.clearRect(0, 0, targetDim, targetDim);

        // Studio Background
        const bgGrad = ctx.createRadialGradient(targetDim / 2, targetDim / 2, targetDim * 0.2, targetDim / 2, targetDim / 2, targetDim * 0.7);
        bgGrad.addColorStop(0, '#131b28');
        bgGrad.addColorStop(1, '#070b10');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, targetDim, targetDim);

        // Ensure K7 image is loaded
        const k7Img = await ensureK7Image();

        // Exact K7 PNG resolution: 1372 x 844 (aspect ratio 1.62559)
        const k7W = 1372;
        const k7H = 844;

        // Render high-res composite Cassette offscreen (1372 x 844)
        const compCanvas = document.createElement('canvas');
        compCanvas.width = k7W;
        compCanvas.height = k7H;
        const compCtx = compCanvas.getContext('2d');

        if (compCtx) {
          // 1. In K7.png, draw cropped artwork ONLY into the inner sticker label boundary (55, 55, 1262, 734)
          compCtx.save();
          compCtx.beginPath();
          compCtx.roundRect(55, 55, 1262, 734, 36);
          compCtx.clip();
          // Crop vertically centered region of 960x960 artwork
          const srcCropY = 176;
          const srcCropH = 608;
          compCtx.drawImage(artCanvas, 0, srcCropY, 960, srcCropH, 55, 55, 1262, 734);
          compCtx.restore();

          // 2. Draw K7.png on top at full 1372x844 resolution
          if (k7Img && k7Img.naturalWidth > 0) {
            compCtx.drawImage(k7Img, 0, 0, k7W, k7H);
          }

          // 3. Draw Ruled Text Layer on top of cream label lines
          const fontMatch = GOOGLE_FONTS_LIST.find((f) => f.id === selectedFont);
          const fontName = fontMatch ? fontMatch.fontFamily : 'sans-serif';

          // Title Line (at 17% height)
          compCtx.fillStyle = '#0f172a';
          compCtx.font = `900 ${Math.round(k7H * 0.038)}px ${fontName}`;
          compCtx.textAlign = 'left';
          compCtx.fillText((title || 'UNTITLED TRACK').toUpperCase(), k7W * 0.23, k7H * 0.175);

          compCtx.fillStyle = '#64748b';
          compCtx.font = `bold ${Math.round(k7H * 0.026)}px monospace`;
          compCtx.textAlign = 'right';
          compCtx.fillText('TYPE II', k7W * 0.79, k7H * 0.175);

          // Artist & Year Line (at 23.5% height)
          compCtx.fillStyle = '#475569';
          compCtx.font = `bold ${Math.round(k7H * 0.032)}px ${fontName}`;
          compCtx.textAlign = 'left';
          compCtx.fillText(artist || 'SYN-Tracker Music', k7W * 0.23, k7H * 0.238);

          compCtx.fillStyle = '#64748b';
          compCtx.font = `bold ${Math.round(k7H * 0.024)}px monospace`;
          compCtx.textAlign = 'right';
          compCtx.fillText(year, k7W * 0.79, k7H * 0.238);
        }

        // Target canvas drawing: Draw composite cassette with deep realistic drop shadow
        const drawW = targetDim * 0.90;
        const drawH = drawW * (k7H / k7W);
        const drawX = (targetDim - drawW) / 2;
        const drawY = (targetDim - drawH) / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.92)';
        ctx.shadowBlur = 50;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 25;
        ctx.drawImage(compCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
        return;
      }
    },
    [renderCover, title, artist, year, catalogNum, selectedFont, ensureK7Image]
  );

  // Redraw whenever parameters or preview mode change
  useEffect(() => {
    if (!isOpen) return;

    // 1. If previewCanvas exists (Flat Master, Vinyl LP, or Audio CD), render directly to it
    if (previewCanvasRef.current) {
      renderCover(previewCanvasRef.current, 960, 960);
    }

    // 2. If cassetteBandCanvas exists (MC Cassette mode), render the artwork to an offscreen canvas and paint the cropped banner
    if (cassetteBandCanvasRef.current) {
      const offscreen = document.createElement('canvas');
      renderCover(offscreen, 960, 960);

      const cCanvas = cassetteBandCanvasRef.current;
      const targetW = 960;
      const targetH = 608;
      cCanvas.width = targetW;
      cCanvas.height = targetH;
      const cCtx = cCanvas.getContext('2d');
      if (cCtx) {
        cCtx.clearRect(0, 0, targetW, targetH);
        // Crop the 960x960 artwork to fit the 960x608 cassette backdrop
        const srcCropY = 176;
        const srcCropH = 608;
        cCtx.drawImage(offscreen, 0, srcCropY, 960, srcCropH, 0, 0, targetW, targetH);
      }
    }
  }, [renderCover, mockupMode, isOpen]);

  // Apply Cover to Current Song & MP3 ID3 Tag (respecting bake target: active mockup or 1:1 flat master)
  const handleApplyToSong = async () => {
    setIsApplying(true);
    try {
      const targetMode = bakeTargetMode === 'flat' ? 'flat' : mockupMode;
      const offscreen = document.createElement('canvas');
      const size = 960;
      await renderMockupToCanvas(targetMode, offscreen, size);
      const dataUrl = offscreen.toDataURL('image/jpeg', 0.92);

      onUpdateSong({
        name: title,
        artist,
        album,
        year,
        genre,
        coverArt: dataUrl,
      });

      const modeLabels: Record<string, string> = {
        flat: 'Flat Master (1:1)',
        vinyl: '12″ Vinyl LP Mockup',
        cd: 'Audio CD Jewel Case Mockup',
        cassette: 'MC Cassette Tape Mockup',
      };

      setTimeout(() => {
        setIsApplying(false);
        onShowToast(`${modeLabels[targetMode]} cover applied to song & ready for MP3 export!`);
      }, 200);
    } catch (err) {
      console.error('Apply cover error:', err);
      setIsApplying(false);
      onShowToast('Error applying cover art.');
    }
  };

  // Download High-Res PNG Cover File (respecting selected format or active mockup)
  const handleDownloadCover = async (modeToDownload?: 'flat' | 'vinyl' | 'cd' | 'cassette') => {
    setIsDownloading(true);
    try {
      const mode = modeToDownload || mockupMode;
      const offscreen = document.createElement('canvas');
      const size = mode === 'flat' ? 960 : 1200;
      await renderMockupToCanvas(mode, offscreen, size);
      const dataUrl = offscreen.toDataURL('image/png');

      const safeName = (title || 'cover').replace(/[^a-zA-Z0-9_-]/g, '_');
      const suffixMap: Record<string, string> = {
        flat: 'Flat_Master_960x960',
        vinyl: 'Vinyl_LP_Mockup_1200x1200',
        cd: 'Audio_CD_Mockup_1200x1200',
        cassette: 'MC_Cassette_Mockup_1200x1200',
      };

      const labelMap: Record<string, string> = {
        flat: 'Flat Master (960×960)',
        vinyl: '12″ Vinyl LP Mockup',
        cd: 'Audio CD Mockup',
        cassette: 'MC Cassette Mockup',
      };

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${safeName}_${suffixMap[mode] || 'Cover'}.png`;
      a.click();
      onShowToast(`Downloaded ${labelMap[mode]} PNG!`);
    } catch (e) {
      console.error('Download cover error:', e);
      onShowToast('Error exporting cover PNG.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download All 4 Formats as a ZIP Package
  const handleDownloadAllFormats = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const safeName = (title || 'cover').replace(/[^a-zA-Z0-9_-]/g, '_');
      const modes: Array<{ mode: 'flat' | 'vinyl' | 'cd' | 'cassette'; filename: string; size: number }> = [
        { mode: 'flat', filename: `${safeName}_01_Flat_Master_960x960.png`, size: 960 },
        { mode: 'vinyl', filename: `${safeName}_02_Vinyl_LP_12inch_Mockup.png`, size: 1200 },
        { mode: 'cd', filename: `${safeName}_03_Audio_CD_JewelCase_Mockup.png`, size: 1200 },
        { mode: 'cassette', filename: `${safeName}_04_MC_Cassette_Tape_Mockup.png`, size: 1200 },
      ];

      for (const item of modes) {
        const offscreen = document.createElement('canvas');
        await renderMockupToCanvas(item.mode, offscreen, item.size);
        const dataUrl = offscreen.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        zip.file(item.filename, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}_All_Cover_Formats.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Downloaded ZIP containing all 4 cover formats!');
    } catch (e) {
      console.error('Download all formats error:', e);
      onShowToast('Error generating ZIP bundle.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Reset Cover
  const handleResetCover = () => {
    setUploadedImage(null);
    setUploadedImageUrl(null);
    applyPresetTheme('amiga_copper');
    onShowToast('Cover designer reset to default theme');
  };

  // Open Save Custom Cover Dialog
  const handleOpenSaveModal = () => {
    setSaveCoverName(`${title || 'Custom Track'} - ${artist || 'Cover'}`);
    setIsSaveModalOpen(true);
  };

  // Confirm Save Custom Cover
  const handleConfirmSaveCustomCover = () => {
    if (!saveCoverName.trim()) {
      onShowToast('Please enter a name for your custom cover.');
      return;
    }

    // Generate small thumbnail for preview library
    let thumb = '';
    if (previewCanvasRef.current) {
      thumb = previewCanvasRef.current.toDataURL('image/jpeg', 0.85);
    }

    const newPreset: CustomCoverPreset = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: saveCoverName.trim(),
      createdAt: Date.now(),
      thumbnail: thumb,
      presetTheme,
      title,
      artist,
      album,
      year,
      genre,
      badgeText,
      catalogNum,
      primaryColor,
      secondaryColor,
      accentColor,
      bgColor,
      fontArchetype,
      textAlignment,
      selectedFont,
      titleFontSize,
      artistFontSize,
      textOffsetX,
      textOffsetY,
      textRotation,
      letterSpacing,
      textGlowIntensity,
      isTitleUppercase,
      scanlinesIntensity,
      vignetteIntensity,
      showVinylWear,
      showBoingBall,
      showBarcode,
      showGridFloor,
      uploadedImageUrl,
      imageBrightness,
      imageContrast,
      imageScale,
      imageOffsetX,
      imageOffsetY,
      imageRotation,
      imageFitMode,
      imageOpacity,
      imageBlur,
      boingBallX,
      boingBallY,
      boingBallScale,
    };

    const updated = [newPreset, ...customCovers];
    persistCustomCovers(updated);
    setIsSaveModalOpen(false);
    onShowToast(`Cover "${newPreset.name}" saved to your custom library!`);
  };

  // Load Custom Cover Preset
  const handleLoadCustomCover = (preset: CustomCoverPreset) => {
    setTitle(preset.title);
    setArtist(preset.artist);
    setAlbum(preset.album);
    setYear(preset.year);
    setGenre(preset.genre);
    setBadgeText(preset.badgeText);
    setCatalogNum(preset.catalogNum);
    setPresetTheme(preset.presetTheme);
    setPrimaryColor(preset.primaryColor);
    setSecondaryColor(preset.secondaryColor);
    setAccentColor(preset.accentColor);
    setBgColor(preset.bgColor);
    setFontArchetype(preset.fontArchetype);
    setTextAlignment(preset.textAlignment);
    if (preset.selectedFont) setSelectedFont(preset.selectedFont);
    if (preset.titleFontSize !== undefined) setTitleFontSize(preset.titleFontSize);
    if (preset.artistFontSize !== undefined) setArtistFontSize(preset.artistFontSize);
    if (preset.textOffsetX !== undefined) setTextOffsetX(preset.textOffsetX);
    if (preset.textOffsetY !== undefined) setTextOffsetY(preset.textOffsetY);
    if (preset.textRotation !== undefined) setTextRotation(preset.textRotation);
    if (preset.letterSpacing !== undefined) setLetterSpacing(preset.letterSpacing);
    if (preset.textGlowIntensity !== undefined) setTextGlowIntensity(preset.textGlowIntensity);
    if (preset.isTitleUppercase !== undefined) setIsTitleUppercase(preset.isTitleUppercase);
    setScanlinesIntensity(preset.scanlinesIntensity);
    setVignetteIntensity(preset.vignetteIntensity);
    setShowVinylWear(preset.showVinylWear);
    setShowBoingBall(preset.showBoingBall);
    setShowBarcode(preset.showBarcode);
    setShowGridFloor(preset.showGridFloor);
    setImageBrightness(preset.imageBrightness ?? 100);
    setImageContrast(preset.imageContrast ?? 100);
    if (preset.imageScale !== undefined) setImageScale(preset.imageScale);
    if (preset.imageOffsetX !== undefined) setImageOffsetX(preset.imageOffsetX);
    if (preset.imageOffsetY !== undefined) setImageOffsetY(preset.imageOffsetY);
    if (preset.imageRotation !== undefined) setImageRotation(preset.imageRotation);
    if (preset.imageFitMode) setImageFitMode(preset.imageFitMode);
    if (preset.imageOpacity !== undefined) setImageOpacity(preset.imageOpacity);
    if (preset.imageBlur !== undefined) setImageBlur(preset.imageBlur);
    if (preset.boingBallX !== undefined) setBoingBallX(preset.boingBallX);
    if (preset.boingBallY !== undefined) setBoingBallY(preset.boingBallY);
    if (preset.boingBallScale !== undefined) setBoingBallScale(preset.boingBallScale);

    if (preset.uploadedImageUrl) {
      setUploadedImageUrl(preset.uploadedImageUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setUploadedImage(img);
      img.src = preset.uploadedImageUrl;
    } else {
      setUploadedImage(null);
      setUploadedImageUrl(null);
    }

    onShowToast(`Custom cover "${preset.name}" loaded`);
  };

  // Delete Custom Cover Preset
  const handleDeleteCustomCover = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = customCovers.filter((c) => c.id !== id);
    persistCustomCovers(updated);
    onShowToast('Custom cover removed from library');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      key="syn-cover-fullscreen-app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#445166] flex flex-col text-slate-100 font-sans overflow-hidden select-none"
    >
        {/* Ambient subtle vignette overlay (Persistent studio lighting matching Tracker workspace) */}
        <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

        {/* Hidden Master Render Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. TOP HEADER (CONSISTENT WORKSTATION HEADER LIKE TRACKER, SYN-EDITOR, SYN-VISUALIZER) */}
        <motion.header
          initial={{ y: -70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -70, opacity: 0, transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] } }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
          className="relative z-50 px-3 py-1.5 flex items-center justify-between gap-2.5 select-none glass-panel-header text-[#cbd5e1] shrink-0 min-w-max"
        >
          {/* LEFT GROUP: Branding, Persona Switcher & Meta Info */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Logo & Title */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div 
                className="w-8 h-8 rounded-lg bg-[#141d27]/70 backdrop-blur-sm border border-[#27364a]/80 flex items-center justify-center shrink-0 shadow-inner transition-all text-sky-400"
                title="SYN-Cover Album Art & ID3 Studio"
              >
                <Palette className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 leading-none">
                  <span className="font-bold tracking-tight text-sm text-[#f8fafc] font-display">
                    SYN-COVER
                  </span>
                </div>
                <div className="text-[10.5px] font-mono font-bold tracking-normal truncate text-sky-400">
                  {song?.name || 'Album Art & ID3 Studio'}
                </div>
              </div>
            </div>

            <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

            <PersonaSwitcher
              activePersona="cover"
              onSelectPersona={(persona) => {
                if (persona === 'tracker') {
                  onClose();
                } else if (onSelectPersona) {
                  onSelectPersona(persona);
                  onClose();
                }
              }}
              showLabels={true}
            />

            <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

            {/* Undo / Redo in Header Console - Matching Tracker, SYN-Editor, SYN-Visualizer */}
            <div className="flex items-center gap-1 bg-[#070b10]/65 backdrop-blur-sm p-1 rounded-lg border border-[#1a2536]/80">
              <button
                id="cover-header-btn-undo"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                  historyIndex > 0 ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                }`}
                title="Undo Cover Design (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Undo</span>
              </button>
              <button
                id="cover-header-btn-redo"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer aqua-gloss ${
                  historyIndex < history.length - 1 ? 'aqua-dark text-[#cbd5e1] hover:text-white' : 'aqua-dark opacity-35 cursor-not-allowed text-[#64748b]'
                }`}
                title="Redo Cover Design (Ctrl+Y / Ctrl+Shift+Z)"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Redo</span>
              </button>
            </div>

            <div className="h-6 w-[1px] hidden sm:block bg-[#1f2c3e]/80" />

            {/* Song Meta / Format Badge */}
            <div className="hidden md:flex items-center gap-2 bg-[#070b10]/65 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#1a2536]/80 text-xs">
              <span className="font-mono font-bold text-sky-400">SONG:</span>
              <span className="font-mono font-bold text-white max-w-[140px] truncate">{title}</span>
              <span className="text-[10px] text-slate-400 font-mono">• {artist}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 ml-1">
                ID3 APIC BAKER
              </span>
            </div>
          </div>

          {/* RIGHT GROUP: Support & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {showSupportButton && (
              onOpenSupport ? (
                <button
                  onClick={onOpenSupport}
                  className="h-7 px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer border border-amber-500/40 hover:border-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 font-mono text-xs font-bold transition-all shadow-[0_0_10px_rgba(251,191,36,0.12)] hidden sm:flex"
                  title="Support SYN-Tracker & Buy Me a Coffee"
                >
                  <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Support</span>
                </button>
              ) : (
                <a
                  href="https://buymeacoffee.com/hj_wuethrich"
                  target="_blank"
                  rel="noreferrer"
                  className="h-7 px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer border border-amber-500/40 hover:border-amber-400 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 font-mono text-xs font-bold transition-all shadow-[0_0_10px_rgba(251,191,36,0.12)] hidden sm:flex"
                  title="Support SYN-Tracker & Buy Me a Coffee"
                >
                  <Coffee className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Support</span>
                </a>
              )
            )}

            <button
              onClick={onClose}
              className="aqua-gloss aqua-dark h-7 w-7 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer border border-[#27364a]/80"
              title="Exit SYN-Cover (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.header>

        {/* 2. MAIN BODY: SPLIT VIEW (LEFT CONTROLS, RIGHT LIVE STAGE) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0 p-3 gap-2.5">
          
          {/* LEFT PANE: DESIGN CONTROLS & METADATA (4-5 COLS) */}
          <motion.div
            initial={{ x: '-100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '-100%', opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 bg-[#0b1018]/85 backdrop-blur-md border border-[#1e2d42] rounded-xl p-3 flex flex-col shadow-2xl overflow-hidden min-h-0"
          >
            {/* Tab Navigation */}
            <div className="flex items-center justify-between border-b border-[#1c293a] pb-2 mb-3 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'presets', label: `Themes & Covers (${customCovers.length})` },
                  { id: 'typography', label: 'ID3 Tags' },
                  { id: 'artwork', label: 'Artwork' },
                  { id: 'colors', label: 'Colors & FX' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`h-7 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all ${
                      activeTab === t.id
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleResetCover}
                className="h-7 px-2.5 rounded-lg border border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400 hover:bg-slate-800 hover:text-slate-200 flex items-center gap-1 cursor-pointer shrink-0 ml-1 transition-all"
                title="Reset designer settings"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* TAB CONTENT (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              
              {/* TAB 1: PRESETS & CUSTOM COVERS */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  {/* Predefined Themes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-200">
                        Artwork Archetype & Demoscene Themes
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">7 curated styles</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'amiga_copper', label: 'Amiga Copper' },
                        { id: 'synthwave_outrun', label: 'Synthwave 80s' },
                        { id: 'c64_sid', label: 'C64 SID' },
                        { id: 'vinyl_record', label: 'Vinyl LP' },
                        { id: 'minimal_modern', label: 'Swiss Minimal' },
                        { id: 'arcade_pixel', label: 'Arcade Pixel' },
                        { id: 'cosmic_nebula', label: 'Space Nebula' },
                      ].map((p) => {
                        const isActive = presetTheme === p.id && !uploadedImage;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setUploadedImage(null);
                              setUploadedImageUrl(null);
                              applyPresetTheme(p.id as CoverPresetTheme);
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition text-center flex items-center justify-center cursor-pointer ${
                              isActive
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm shadow-sky-500/20 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <span>{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Covers Library Section with (+) Button directly below themes */}
                  <div className="pt-2 border-t border-[#1a283a]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <FolderHeart className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-xs font-bold text-slate-200">
                          My Custom Covers
                        </span>
                        <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/40">
                          {customCovers.length}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Stored in browser</span>
                    </div>

                    {/* Grid containing the (+) Add Card followed by custom cover presets */}
                    <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                      {/* (+) Add / Save Current Custom Cover Button Card */}
                      <button
                        type="button"
                        onClick={handleOpenSaveModal}
                        className="p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-sky-500/50 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-sky-400" />
                        <span>Save Custom Cover</span>
                      </button>

                      {/* Saved Custom Cover Cards */}
                      {customCovers.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => handleLoadCustomCover(preset)}
                          className="group relative p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-sky-500/50 transition-all cursor-pointer flex gap-2 items-center shadow-lg"
                        >
                          {/* Thumbnail */}
                          <div className="w-10 h-10 rounded-lg bg-black overflow-hidden border border-white/10 shrink-0 relative shadow-inner">
                            {preset.thumbnail ? (
                              <img
                                src={preset.thumbnail}
                                alt={preset.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-[9px]">
                                1:1
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-slate-200 truncate block group-hover:text-sky-300 transition-colors">
                              {preset.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate block">
                              {preset.title || 'Untitled'}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(preset.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomCover(preset.id, e)}
                            className="opacity-60 hover:opacity-100 p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer shrink-0"
                            title="Delete this custom preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TYPOGRAPHY & ID3 TAGS */}
              {activeTab === 'typography' && (
                <div className="space-y-3">
                  <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-3">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" /> Embedded MP3 ID3 Tags
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Song Title</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          maxLength={40}
                          className="w-full mt-1 px-2.5 py-1.5 bg-[#070b10] border border-[#223348] rounded-lg text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-400"
                          placeholder="Song Title..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Artist Name</label>
                        <input
                          type="text"
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          maxLength={32}
                          className="w-full mt-1 px-2.5 py-1.5 bg-[#070b10] border border-[#223348] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                          placeholder="Artist..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Album / Release</label>
                        <input
                          type="text"
                          value={album}
                          onChange={(e) => setAlbum(e.target.value)}
                          maxLength={40}
                          className="w-full mt-1 px-2.5 py-1.5 bg-[#070b10] border border-[#223348] rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-400"
                          placeholder="Album Title..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Hardware Badge</label>
                        <input
                          type="text"
                          value={badgeText}
                          onChange={(e) => setBadgeText(e.target.value)}
                          maxLength={24}
                          className="w-full mt-1 px-2.5 py-1.5 bg-[#070b10] border border-[#223348] rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-sky-400"
                          placeholder="Badge text..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1a2838]">
                      <div>
                        <label className="text-[9.5px] font-mono text-slate-400 uppercase">Year</label>
                        <input
                          type="text"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          maxLength={4}
                          className="w-full mt-1 px-2 py-1 bg-[#070b10] border border-[#223348] rounded text-xs font-mono text-center text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-mono text-slate-400 uppercase">Genre</label>
                        <input
                          type="text"
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                          maxLength={20}
                          className="w-full mt-1 px-2 py-1 bg-[#070b10] border border-[#223348] rounded text-xs font-mono text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-mono text-slate-400 uppercase">Catalog #</label>
                        <input
                          type="text"
                          value={catalogNum}
                          onChange={(e) => setCatalogNum(e.target.value)}
                          maxLength={14}
                          className="w-full mt-1 px-2 py-1 bg-[#070b10] border border-[#223348] rounded text-xs font-mono text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Google Fonts & Typography Tuning */}
                  <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Google Fonts & Styling
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTextOffsetX(0);
                          setTextOffsetY(0);
                          setTextRotation(0);
                          setTitleFontSize(0);
                          setArtistFontSize(0);
                          setLetterSpacing(0);
                        }}
                        className="text-[10px] font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                        title="Reset all text position and size overrides"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Text
                      </button>
                    </div>

                    {/* Google Font Selector */}
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Google Font Selection</label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar p-1 bg-[#070b10] rounded-lg border border-[#223348]">
                        {GOOGLE_FONTS_LIST.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSelectedFont(f.id)}
                            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                              selectedFont === f.id
                                ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <div className="text-xs truncate" style={{ fontFamily: f.fontFamily }}>
                              {f.name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">{f.category}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Sizes */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Title Size</span>
                          <span>{titleFontSize === 0 ? 'Auto' : `${titleFontSize}px`}</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={110}
                          value={titleFontSize || 64}
                          onChange={(e) => setTitleFontSize(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Artist Size</span>
                          <span>{artistFontSize === 0 ? 'Auto' : `${artistFontSize}px`}</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={54}
                          value={artistFontSize || 32}
                          onChange={(e) => setArtistFontSize(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Text Position Sliders */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Position X</span>
                          <span>{textOffsetX > 0 ? `+${textOffsetX}` : textOffsetX}px</span>
                        </div>
                        <input
                          type="range"
                          min={-200}
                          max={200}
                          value={textOffsetX}
                          onChange={(e) => setTextOffsetX(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Position Y</span>
                          <span>{textOffsetY > 0 ? `+${textOffsetY}` : textOffsetY}px</span>
                        </div>
                        <input
                          type="range"
                          min={-200}
                          max={200}
                          value={textOffsetY}
                          onChange={(e) => setTextOffsetY(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Rotation, Spacing & Glow */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                          <span>Rotation</span>
                          <span>{textRotation}°</span>
                        </div>
                        <input
                          type="range"
                          min={-45}
                          max={45}
                          value={textRotation}
                          onChange={(e) => setTextRotation(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                          <span>Letter Spacing</span>
                          <span>{letterSpacing}px</span>
                        </div>
                        <input
                          type="range"
                          min={-2}
                          max={16}
                          value={letterSpacing}
                          onChange={(e) => setLetterSpacing(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                          <span>Neon Glow</span>
                          <span>{textGlowIntensity}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={50}
                          value={textGlowIntensity}
                          onChange={(e) => setTextGlowIntensity(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Text Alignment & Uppercase switch */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a2838]">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">Text Alignment</label>
                        <select
                          value={textAlignment}
                          onChange={(e) => setTextAlignment(e.target.value as any)}
                          className="w-full bg-[#070b10] border border-[#223348] rounded p-1.5 text-xs font-mono text-sky-300 focus:outline-none"
                        >
                          <option value="bottom-left">Bottom Left (Classic)</option>
                          <option value="center">Centered Poster</option>
                          <option value="top-left">Top Left Header</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => setIsTitleUppercase(!isTitleUppercase)}
                          className={`w-full h-8 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isTitleUppercase
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span>{isTitleUppercase ? '✓ UPPERCASE' : 'Mixed Case'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CUSTOM ARTWORK & PHOTO UPLOAD */}
              {activeTab === 'artwork' && (
                <div className="space-y-3">
                  <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Upload Custom Photo or Logo
                      </span>
                      {uploadedImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImage(null);
                            setUploadedImageUrl(null);
                          }}
                          className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    {!uploadedImage ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-6 px-4 rounded-xl border border-dashed border-[#293d54] hover:border-sky-400 bg-[#0a0f17] hover:bg-[#121b27] flex flex-col items-center justify-center gap-2 text-xs font-mono text-slate-300 transition-all cursor-pointer group"
                      >
                        <Upload className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-white">Click or Drop Artwork File</span>
                        <span className="text-[10px] text-slate-400">PNG, JPG, WEBP • Custom Zoom, Position & Rotate</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 bg-[#070b10] rounded-lg border border-[#1f2d40]">
                          <div className="w-12 h-12 rounded bg-black overflow-hidden border border-white/10 shrink-0">
                            {uploadedImageUrl && (
                              <img src={uploadedImageUrl} alt="Uploaded" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white block truncate">Custom Graphic Active</span>
                            <span className="text-[10px] text-sky-400 font-mono">Image rendered behind typography</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aqua-gloss aqua-dark text-xs px-2 py-1 rounded text-slate-300 cursor-pointer"
                          >
                            Replace
                          </button>
                        </div>

                        {/* Image Scale & Fit Controls */}
                        <div className="bg-[#070b10] p-2.5 rounded-lg border border-[#1e2d42] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                              <Move className="w-3 h-3" /> Image Transform & Sizing
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setImageScale(100);
                                setImageOffsetX(0);
                                setImageOffsetY(0);
                                setImageRotation(0);
                                setImageOpacity(100);
                                setImageBlur(0);
                              }}
                              className="text-[10px] font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                              title="Reset image position & scale"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Center & Reset
                            </button>
                          </div>

                          {/* Scale (Zoom) & Rotation */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>Zoom / Scale</span>
                                <span>{imageScale}%</span>
                              </div>
                              <input
                                type="range"
                                min={25}
                                max={250}
                                value={imageScale}
                                onChange={(e) => setImageScale(parseInt(e.target.value, 10))}
                                className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>Rotation</span>
                                <span>{imageRotation}°</span>
                              </div>
                              <input
                                type="range"
                                min={-180}
                                max={180}
                                value={imageRotation}
                                onChange={(e) => setImageRotation(parseInt(e.target.value, 10))}
                                className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Position Offset X and Y */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>Position X</span>
                                <span>{imageOffsetX > 0 ? `+${imageOffsetX}` : imageOffsetX}px</span>
                              </div>
                              <input
                                type="range"
                                min={-300}
                                max={300}
                                value={imageOffsetX}
                                onChange={(e) => setImageOffsetX(parseInt(e.target.value, 10))}
                                className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                                <span>Position Y</span>
                                <span>{imageOffsetY > 0 ? `+${imageOffsetY}` : imageOffsetY}px</span>
                              </div>
                              <input
                                type="range"
                                min={-300}
                                max={300}
                                value={imageOffsetY}
                                onChange={(e) => setImageOffsetY(parseInt(e.target.value, 10))}
                                className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Fit Mode, Opacity & Blur */}
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#182333]">
                            <div>
                              <label className="text-[9.5px] font-mono text-slate-400 block mb-1">Fit Mode</label>
                              <select
                                value={imageFitMode}
                                onChange={(e) => setImageFitMode(e.target.value as any)}
                                className="w-full bg-[#0e1624] border border-[#223348] rounded p-1 text-[11px] font-mono text-sky-300 focus:outline-none"
                              >
                                <option value="cover">Fill Square (Cover)</option>
                                <option value="contain">Fit Full (Contain)</option>
                              </select>
                            </div>

                            <div>
                              <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                                <span>Opacity</span>
                                <span>{imageOpacity}%</span>
                              </div>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                value={imageOpacity}
                                onChange={(e) => setImageOpacity(parseInt(e.target.value, 10))}
                                className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                                <span>Blur FX</span>
                                <span>{imageBlur}px</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={20}
                                value={imageBlur}
                                onChange={(e) => setImageBlur(parseInt(e.target.value, 10))}
                                className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Brightness & Contrast */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 block mb-1">
                              Brightness ({imageBrightness}%)
                            </label>
                            <input
                              type="range"
                              min={30}
                              max={180}
                              value={imageBrightness}
                              onChange={(e) => setImageBrightness(parseInt(e.target.value, 10))}
                              className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 block mb-1">
                              Contrast ({imageContrast}%)
                            </label>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              value={imageContrast}
                              onChange={(e) => setImageContrast(parseInt(e.target.value, 10))}
                              className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#1a2838]">
                          <button
                            type="button"
                            onClick={handleOpenSaveModal}
                            className="w-full aqua-gloss aqua-sky h-8 rounded-lg text-xs font-mono font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Artwork to Custom Library</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: COLORS & FX */}
              {activeTab === 'colors' && (
                <div className="space-y-3">
                  <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-3">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Color Palette & Accent Tints
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400">Primary</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10.5px] font-mono text-slate-300">{primaryColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400">Secondary</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10.5px] font-mono text-slate-300">{secondaryColor}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-slate-400">Background</label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10.5px] font-mono text-slate-300">{bgColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Geometric Elements Toggles */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#1a2838]">
                      {[
                        { label: '3D Floor', active: showGridFloor, toggle: () => setShowGridFloor(!showGridFloor) },
                        { label: 'Boing Ball', active: showBoingBall, toggle: () => setShowBoingBall(!showBoingBall) },
                        { label: 'Vinyl Ring Wear', active: showVinylWear, toggle: () => setShowVinylWear(!showVinylWear) },
                        { label: 'Barcode', active: showBarcode, toggle: () => setShowBarcode(!showBarcode) },
                      ].map((el, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={el.toggle}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            el.active
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-sm shadow-sky-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {el.active ? '✓ ' : '+ '} {el.label}
                        </button>
                      ))}
                    </div>

                    {/* Boing Ball Position & Scale Controls if active */}
                    {showBoingBall && !uploadedImage && (
                      <div className="bg-[#070b10] p-2.5 rounded-lg border border-[#1e2d42] space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-sky-300">Amiga Boing Ball Position & Scale</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBoingBallX(0);
                              setBoingBallY(0);
                              setBoingBallScale(100);
                            }}
                            className="text-[10px] font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Reset
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                              <span>Pos X</span>
                              <span>{boingBallX > 0 ? `+${boingBallX}` : boingBallX}</span>
                            </div>
                            <input
                              type="range"
                              min={-250}
                              max={250}
                              value={boingBallX}
                              onChange={(e) => setBoingBallX(parseInt(e.target.value, 10))}
                              className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                              <span>Pos Y</span>
                              <span>{boingBallY > 0 ? `+${boingBallY}` : boingBallY}</span>
                            </div>
                            <input
                              type="range"
                              min={-250}
                              max={250}
                              value={boingBallY}
                              onChange={(e) => setBoingBallY(parseInt(e.target.value, 10))}
                              className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9.5px] font-mono text-slate-400 mb-1">
                              <span>Scale</span>
                              <span>{boingBallScale}%</span>
                            </div>
                            <input
                              type="range"
                              min={30}
                              max={200}
                              value={boingBallScale}
                              onChange={(e) => setBoingBallScale(parseInt(e.target.value, 10))}
                              className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vintage Overlays */}
                  <div className="bg-[#0e1624] p-3 rounded-xl border border-[#1e2d42] space-y-3">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" /> CRT Scanlines & Vignette Shading
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>CRT Scanlines</span>
                          <span>{scanlinesIntensity}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={scanlinesIntensity}
                          onChange={(e) => setScanlinesIntensity(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Vignette Falloff</span>
                          <span>{vignetteIntensity}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={vignetteIntensity}
                          onChange={(e) => setVignetteIntensity(parseInt(e.target.value, 10))}
                          className="w-full accent-sky-400 h-1.5 bg-[#1b2838] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>

          {/* RIGHT PANE: LIVE STAGE & MOCKUP PREVIEW (7-8 COLS) */}
          <motion.div
            initial={{ x: '100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="lg:col-span-7 xl:col-span-8 2xl:col-span-8 bg-[#0b1018]/85 backdrop-blur-md border border-[#1e2d42] rounded-xl p-3 flex flex-col items-center justify-between shadow-2xl overflow-hidden min-h-0"
          >
            {/* Stage Mockup Mode Switcher */}
            <div className="w-full bg-[#0e1624] border border-[#1e2d42] p-2 rounded-xl flex items-center justify-between gap-3 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Preview Stage:
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 gap-1">
                  {[
                    { id: 'flat', label: 'Flat Master', desc: '1:1 Cover (MP3 Tag / PNG)', icon: <Maximize2 className="w-3 h-3" /> },
                    { id: 'vinyl', label: 'Vinyl LP', desc: '12″ Schallplatten-Hülle mit Rillen', icon: <Disc className="w-3 h-3" /> },
                    { id: 'cd', label: 'Audio CD', desc: 'CD Jewel Case mit optischer Compact Disc', icon: <Disc2 className="w-3 h-3" /> },
                    { id: 'cassette', label: 'MC Cassette', desc: 'Kompaktkassette mit Artwork & Label', icon: <Disc3 className="w-3 h-3" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMockupMode(m.id as any)}
                      title={m.desc}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        mockupMode === m.id
                          ? 'bg-sky-500/20 border border-sky-500 text-sky-300 font-bold shadow-sm'
                          : 'border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[11px] font-mono text-sky-400/90 font-bold hidden sm:inline">
                {mockupMode === 'flat' && '1:1 Master (960×960 HQ)'}
                {mockupMode === 'vinyl' && '12″ Vinyl Record & Sleeve Mockup'}
                {mockupMode === 'cd' && 'Compact Disc Audio & Jewel Case Mockup'}
                {mockupMode === 'cassette' && 'Authentic Compact Cassette Tape (Type II Chrome)'}
              </span>
            </div>

            {/* Center Canvas Display - Generously Sized with Clean Margins */}
            <div className="relative flex-1 flex items-center justify-center p-2 sm:p-4 w-full h-full min-h-0 overflow-hidden">
              {mockupMode === 'flat' && (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15 w-full max-w-[min(650px,calc(100vh-230px))] max-h-[calc(100vh-230px)] aspect-square flex items-center justify-center transition-all duration-300">
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full object-contain block bg-[#070b10] rounded-xl shadow-2xl"
                  />
                </div>
              )}

              {mockupMode === 'vinyl' && (
                <div className="relative flex items-center justify-center w-full max-w-[min(650px,calc(100vh-230px))] max-h-[calc(100vh-230px)] aspect-square transition-all duration-300">
                  {/* Vinyl Record Disc peeking out with realistic micro-grooves and authentic vinyl sheen */}
                  <div className="absolute -right-4 sm:-right-8 w-[88%] aspect-square rounded-full bg-[#0a0c10] shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-center border border-[#27272a] animate-spin-slow overflow-hidden">
                    {/* Realistic Vinyl Conic Light Sheen (Simulating light reflection across vinyl microgrooves) */}
                    <div 
                      className="absolute inset-0 rounded-full pointer-events-none opacity-40"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(255,255,255,0.12) 0deg, transparent 45deg, rgba(255,255,255,0.06) 90deg, transparent 135deg, rgba(255,255,255,0.12) 180deg, transparent 225deg, rgba(255,255,255,0.06) 270deg, transparent 315deg, rgba(255,255,255,0.12) 360deg)'
                      }}
                    />

                    {/* Concentric Vinyl Sound Grooves (Rillen) - Outer Run-In Zone */}
                    <div className="absolute w-[94%] aspect-square rounded-full border border-white/[0.08]" />
                    <div className="absolute w-[91%] aspect-square rounded-full border border-white/[0.05]" />
                    <div className="absolute w-[88%] aspect-square rounded-full border border-white/[0.09]" />
                    <div className="absolute w-[85%] aspect-square rounded-full border border-white/[0.04]" />

                    {/* Track 1 Sound Grooves (Rillenband 1) */}
                    <div className="absolute w-[82%] aspect-square rounded-full border border-white/[0.07]" />
                    <div className="absolute w-[78%] aspect-square rounded-full border border-white/[0.05]" />
                    <div className="absolute w-[75%] aspect-square rounded-full border border-white/[0.08]" />
                    <div className="absolute w-[72%] aspect-square rounded-full border border-white/[0.04]" />

                    {/* Track Gap Separator (Glattes Zwischenstück) */}
                    <div className="absolute w-[69%] aspect-square rounded-full border border-black/80 bg-black/20" />

                    {/* Track 2 Sound Grooves (Rillenband 2) */}
                    <div className="absolute w-[66%] aspect-square rounded-full border border-white/[0.08]" />
                    <div className="absolute w-[62%] aspect-square rounded-full border border-white/[0.05]" />
                    <div className="absolute w-[58%] aspect-square rounded-full border border-white/[0.07]" />
                    <div className="absolute w-[54%] aspect-square rounded-full border border-white/[0.04]" />

                    {/* Track Gap Separator 2 */}
                    <div className="absolute w-[51%] aspect-square rounded-full border border-black/80 bg-black/20" />

                    {/* Track 3 Sound Grooves (Rillenband 3 - Inner Tracks) */}
                    <div className="absolute w-[48%] aspect-square rounded-full border border-white/[0.08]" />
                    <div className="absolute w-[44%] aspect-square rounded-full border border-white/[0.05]" />
                    <div className="absolute w-[41%] aspect-square rounded-full border border-white/[0.07]" />

                    {/* Dead Wax / Run-out Groove Zone (Auslaufrille) */}
                    <div className="absolute w-[38%] aspect-square rounded-full border border-white/[0.06] bg-[#08090d]" />
                    <div className="absolute w-[35%] aspect-square rounded-full border border-white/[0.04]" />

                    {/* Authentic Matte Dark Vinyl Center Label */}
                    <div className="relative z-10 w-[29%] aspect-square rounded-full bg-[#12161f] border border-[#334155]/80 shadow-inner flex flex-col items-center justify-center text-center p-1.5 ring-1 ring-black">
                      <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none" />
                      
                      <span className="text-[7.5px] font-mono font-black text-sky-400 tracking-wider uppercase leading-tight">
                        SYN-TRACKER
                      </span>
                      <span className="text-[6px] font-mono text-slate-400 font-bold leading-tight">
                        33⅓ RPM • STEREO
                      </span>

                      {/* Real Spindle Hole */}
                      <div className="w-3.5 h-3.5 my-0.5 rounded-full bg-[#05070a] border border-[#475569] shadow-inner flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      </div>

                      <span className="text-[5.5px] font-mono text-slate-400 leading-tight">
                        {catalogNum || 'SYN-430'}
                      </span>
                      <span className="text-[5px] font-mono text-slate-400 leading-tight">
                        SIDE A
                      </span>
                    </div>
                  </div>

                  {/* Front Cardboard Jacket */}
                  <div className="relative z-10 w-[88%] aspect-square rounded-xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full h-full object-contain block bg-[#070b10]"
                    />
                  </div>
                </div>
              )}

              {mockupMode === 'cd' && (
                <div className="relative flex items-center justify-center w-full max-w-[min(650px,calc(100vh-230px))] max-h-[calc(100vh-230px)] aspect-square transition-all duration-300 select-none">
                  {/* Optical Compact Disc peeking out with rainbow holographic refraction & transparent hub (Strictly z-0 behind the jewel case) */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-8 w-[84%] aspect-square rounded-full bg-gradient-to-br from-[#cbd5e1] via-[#f1f5f9] to-[#94a3b8] shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-center border border-slate-300/80 animate-spin-slow overflow-hidden ring-1 ring-white/60 z-0">
                    {/* 1. Holographic Rainbow Iridescent Conic Refractions (Signature CD Prism Light Spectrum) */}
                    <div 
                      className="absolute inset-0 rounded-full pointer-events-none opacity-65 mix-blend-color-dodge"
                      style={{
                        background: 'conic-gradient(from 35deg, rgba(239,68,68,0.4) 0deg, rgba(249,115,22,0.45) 35deg, rgba(234,179,8,0.5) 75deg, rgba(34,197,94,0.45) 115deg, rgba(6,182,212,0.5) 155deg, rgba(59,130,246,0.45) 195deg, rgba(168,85,247,0.45) 235deg, rgba(236,72,153,0.45) 275deg, rgba(239,68,68,0.4) 360deg)'
                      }}
                    />
                    <div 
                      className="absolute inset-0 rounded-full pointer-events-none opacity-50 mix-blend-overlay"
                      style={{
                        background: 'conic-gradient(from 120deg, rgba(255,255,255,0.8) 0deg, transparent 45deg, rgba(255,255,255,0.6) 90deg, transparent 135deg, rgba(255,255,255,0.8) 180deg, transparent 225deg, rgba(255,255,255,0.6) 270deg, transparent 315deg, rgba(255,255,255,0.8) 360deg)'
                      }}
                    />

                    {/* 2. Concentric Micro-Tracks (Data Pit Spirals) */}
                    <div className="absolute w-[96%] aspect-square rounded-full border border-white/60 pointer-events-none" />
                    <div className="absolute w-[92%] aspect-square rounded-full border border-slate-400/30 pointer-events-none" />
                    <div className="absolute w-[87%] aspect-square rounded-full border border-white/30 pointer-events-none" />
                    <div className="absolute w-[81%] aspect-square rounded-full border border-slate-400/25 pointer-events-none" />
                    <div className="absolute w-[75%] aspect-square rounded-full border border-white/30 pointer-events-none" />
                    <div className="absolute w-[68%] aspect-square rounded-full border border-slate-400/25 pointer-events-none" />
                    <div className="absolute w-[61%] aspect-square rounded-full border border-white/35 pointer-events-none" />
                    <div className="absolute w-[53%] aspect-square rounded-full border border-slate-400/30 pointer-events-none" />
                    <div className="absolute w-[47%] aspect-square rounded-full border border-white/30 pointer-events-none" />

                    {/* 3. Silk-Screen Printed Label Overlay on Disc */}
                    <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none">
                      <span className="text-[6.5px] font-mono font-black tracking-widest text-[#0f172a]/90 uppercase leading-none">
                        COMPACT DISC DIGITAL AUDIO
                      </span>
                      <span className="text-[5px] font-mono text-[#334155] font-bold tracking-wider leading-none mt-0.5">
                        STEREO • SYN-TRACKER 16-BIT
                      </span>
                    </div>

                    <div className="absolute bottom-4 inset-x-0 flex flex-col items-center pointer-events-none px-4 text-center">
                      <span className="text-[7.5px] font-mono font-black text-[#0f172a] uppercase tracking-wider truncate max-w-[80%] leading-none">
                        {title || 'UNTITLED'}
                      </span>
                      <span className="text-[5.5px] font-mono text-[#334155] truncate max-w-[80%] leading-none mt-0.5">
                        {artist || 'SYN-Tracker Music'} • {year}
                      </span>
                    </div>

                    {/* 4. Mirror Clamping Ring (Lead-out Zone Transition) */}
                    <div className="absolute w-[42%] aspect-square rounded-full border border-slate-400/70 bg-gradient-to-br from-[#e2e8f0] to-[#cbd5e1] shadow-inner flex items-center justify-center pointer-events-none">
                      <div className="absolute w-[90%] aspect-square rounded-full border border-white/60" />
                    </div>

                    {/* 5. Clear Polycarbonate Center Clamping Hub Area */}
                    <div className="absolute w-[33%] aspect-square rounded-full border-2 border-slate-400/60 bg-[#0f172a]/75 backdrop-blur-xs flex items-center justify-center shadow-inner pointer-events-none">
                      <div className="absolute w-[80%] aspect-square rounded-full border border-white/40" />
                      <div className="absolute w-[60%] aspect-square rounded-full border border-white/30" />
                    </div>

                    {/* 6. Authentic 15mm Center Spindle Hole */}
                    <div className="relative w-[14%] aspect-square rounded-full bg-[#070b10] border-2 border-slate-500/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    </div>
                  </div>

                  {/* Front CD Jewel Case / Booklet with transparent glossy plastic overlays */}
                  <div className="relative z-10 w-[88%] aspect-square rounded-lg overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/25">
                    {/* Left Hinge Spine Plastic Strip */}
                    <div className="absolute left-0 inset-y-0 w-3.5 bg-gradient-to-r from-white/30 via-white/10 to-transparent border-r border-white/20 z-20 pointer-events-none" />

                    {/* Jewel Case Diagonal Gloss Sheen */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.07] to-white/[0.22] pointer-events-none z-20" />

                    {/* Two Booklet Retention Tabs on the right edge */}
                    <div className="absolute right-0 top-[26%] w-1.5 h-4.5 rounded-l bg-black/40 border-l border-white/40 z-20 pointer-events-none shadow-sm" />
                    <div className="absolute right-0 bottom-[26%] w-1.5 h-4.5 rounded-l bg-black/40 border-l border-white/40 z-20 pointer-events-none shadow-sm" />

                    {/* The Live Cover Canvas inside the Jewel Case */}
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full h-full object-contain block bg-[#070b10]"
                    />
                  </div>
                </div>
              )}

              {mockupMode === 'cassette' && (
                <div className="relative flex items-center justify-center w-full max-w-[min(650px,calc(100vh-210px))] aspect-[1372/844] transition-all duration-300 select-none">
                  {/* Underneath: The Live Rendered Artwork Canvas that shines through the transparency of K7.png */}
                  <div className="absolute left-[4%] right-[4%] top-[6.5%] bottom-[6.5%] rounded-[18px] sm:rounded-[24px] overflow-hidden flex items-center justify-center bg-[#101217] shadow-inner">
                    <canvas
                      ref={cassetteBandCanvasRef}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Top Label Ruled Text Layer positioned directly on top of the ruled lines */}
                  <div 
                    className="absolute top-[17.5%] left-[23%] right-[21%] z-20 pointer-events-none flex items-baseline justify-between"
                    style={{ fontFamily: GOOGLE_FONTS_LIST.find((f) => f.id === selectedFont)?.fontFamily || 'sans-serif' }}
                  >
                    <span className="font-black text-[10px] sm:text-[13px] text-[#0f172a] tracking-wider truncate uppercase leading-none">
                      {title || 'UNTITLED TRACK'}
                    </span>
                    <span className="text-[7.5px] sm:text-[9px] font-mono font-bold text-[#64748b] shrink-0 pl-1 leading-none">
                      TYPE II
                    </span>
                  </div>
                  <div 
                    className="absolute top-[23.8%] left-[23%] right-[21%] z-20 pointer-events-none flex items-baseline justify-between"
                    style={{ fontFamily: GOOGLE_FONTS_LIST.find((f) => f.id === selectedFont)?.fontFamily || 'sans-serif' }}
                  >
                    <span className="font-bold text-[8.5px] sm:text-[11px] text-[#475569] truncate leading-none">
                      {artist || 'SYN-Tracker Music'}
                    </span>
                    <span className="text-[7px] sm:text-[8.5px] font-mono text-[#64748b] shrink-0 pl-1 leading-none">
                      {year}
                    </span>
                  </div>

                  {/* High-Resolution Transparent K7.png Cassette Overlay from /public/K7.png */}
                  <img
                    src="/K7.png"
                    alt="K7 MC Cassette"
                    className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)]"
                  />
                </div>
              )}
            </div>

            {/* Bottom Export & Bake Action Suite */}
            <div className="w-full bg-[#0e1624] p-2.5 sm:p-3 rounded-xl border border-[#1e2d42] flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0">
              {/* Bake Target Option */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-400 font-bold">Apply Target:</span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBakeTargetMode('mockup')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      bakeTargetMode === 'mockup'
                        ? 'bg-sky-500/20 border border-sky-500 text-sky-300 font-bold'
                        : 'border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title="Bakes the active visual presentation (Vinyl, CD, Cassette, or Flat) to the song"
                  >
                    Active Mockup ({mockupMode.toUpperCase()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBakeTargetMode('flat')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      bakeTargetMode === 'flat'
                        ? 'bg-sky-500/20 border border-sky-500 text-sky-300 font-bold'
                        : 'border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title="Bakes the clean 1:1 square artwork without 3D mockup borders"
                  >
                    Clean 1:1 Flat
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  className="aqua-gloss aqua-sky h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer text-white shadow-md shadow-sky-500/20"
                  title="Save this cover preset into your custom library"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save Custom</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCover()}
                  disabled={isDownloading}
                  className="aqua-gloss aqua-dark h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer text-slate-200 hover:text-white"
                  title={`Download high-res ${mockupMode.toUpperCase()} PNG file`}
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download {mockupMode.toUpperCase()} PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAllFormats}
                  disabled={isDownloading}
                  className="aqua-gloss aqua-dark h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer text-sky-300 hover:text-white"
                  title="Download all 4 formats (Flat Master, Vinyl LP, Audio CD, MC Cassette) in a single ZIP package"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">All Formats</span>
                  <span>.ZIP</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyToSong}
                  disabled={isApplying}
                  className="aqua-gloss aqua-green h-8 px-3 sm:px-4 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer text-white shadow-md shadow-emerald-500/20"
                  title="Apply cover to current song so it's baked into exported MP3 ID3 tags"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isApplying ? 'Baking...' : 'Apply to Song'}</span>
                </button>
              </div>
            </div>

          </motion.div>

        </div>

        {/* SAVE CUSTOM COVER MODAL DIALOG */}
        <AnimatePresence>
          {isSaveModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsSaveModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0c121c] border border-[#23354b] rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#1c2a3d] pb-3">
                  <div className="flex items-center gap-2 text-sky-400">
                    <FolderHeart className="w-5 h-5" />
                    <span className="font-bold text-white text-sm">Save Custom Cover Preset</span>
                  </div>
                  <button
                    onClick={() => setIsSaveModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">Preset Name</label>
                    <input
                      type="text"
                      value={saveCoverName}
                      onChange={(e) => setSaveCoverName(e.target.value)}
                      placeholder="e.g. Cyber Outrun Theme"
                      className="w-full px-3 py-2 bg-[#070b10] border border-[#23354b] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                      autoFocus
                    />
                  </div>

                  <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                    This will save all colors, typography, background artwork, overlays, and ID3 tags into your personal cover library.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c2a3d]">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="aqua-gloss aqua-dark h-8 px-3 rounded-lg text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSaveCustomCover}
                    className="aqua-gloss aqua-sky h-8 px-4 rounded-lg text-xs font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-500/20"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save Preset</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
  );
};
