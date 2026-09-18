/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle, 
  Disc, 
  X, 
  Tv, 
  ListMusic, 
  Maximize2,
  Minimize2,
  AlertTriangle
} from 'lucide-react';
import { PublishedTrack, extractYouTubeId } from '../lib/firebase';

export interface JukeboxAlbum {
  id?: string;
  title: string;
  coverArt?: string;
  authorName?: string;
  authorUsername?: string;
  tracks: PublishedTrack[];
}

interface RetroJukeboxDockProps {
  album: JukeboxAlbum | null;
  currentIndex: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectTrack: (index: number) => void;
  onClose: () => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  isRepeat: boolean;
  onToggleRepeat: () => void;
  onTrackEnded: () => void;
  containerMaxWidth?: string;
}

// Global YouTube Iframe API Loader (Singleton)
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not found'));
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve((window as any).YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const existing = document.getElementById('youtube-iframe-api-script');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    const prevReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      resolve((window as any).YT);
    };

    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(interval);
        resolve((window as any).YT);
      }
    }, 100);
  });
  return ytApiPromise;
}

const formatSeconds = (sec: number) => {
  if (isNaN(sec) || sec <= 0) return '00:00';
  const mins = Math.floor(sec / 60);
  const remainder = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const RetroJukeboxDock: React.FC<RetroJukeboxDockProps> = ({
  album,
  currentIndex,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onSelectTrack,
  onClose,
  isShuffle,
  onToggleShuffle,
  isRepeat,
  onToggleRepeat,
  onTrackEnded,
  containerMaxWidth = 'max-w-5xl'
}) => {
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(true);
  const [isTracklistOpen, setIsTracklistOpen] = useState<boolean>(false);
  const [videoSize, setVideoSize] = useState<'large' | 'cinema'>('large');

  // Playback progress & duration in seconds
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const hasActuallyPlayedRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);
  const lastAdvanceTimeRef = useRef<number>(0);

  // Store latest callbacks in refs to prevent re-instantiating player
  const onTrackEndedRef = useRef(onTrackEnded);
  onTrackEndedRef.current = onTrackEnded;

  const onPlayPauseRef = useRef(onPlayPause);
  onPlayPauseRef.current = onPlayPause;

  if (!album || album.tracks.length === 0) return null;

  const currentTrack = album.tracks[currentIndex] || album.tracks[0];
  const totalTracks = album.tracks.length;
  const coverImage = currentTrack.coverArt || album.coverArt || album.tracks[0]?.coverArt || '';

  // Extract effective YouTube Video ID
  const effectiveVideoId = 
    currentTrack.youtubeVideoId || 
    extractYouTubeId(currentTrack.youtubeUrl) || 
    '';

  // Safe debounce for track-ended transition
  const handleSongEnded = useCallback(() => {
    const now = Date.now();
    // Enforce minimum 4 seconds between any auto-advances to eliminate loops
    if (now - lastAdvanceTimeRef.current < 4000) {
      return;
    }
    lastAdvanceTimeRef.current = now;
    hasActuallyPlayedRef.current = false;
    console.log('[Jukebox] Track ended naturally. Advancing to next track.');
    onTrackEndedRef.current();
  }, []);

  // 1. Initialize Official YouTube Iframe API Player ONCE
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeIframeApi().then((YT) => {
      if (isCancelled || !containerRef.current) return;
      if (ytPlayerRef.current) return; // Already initialized

      try {
        const player = new YT.Player(containerRef.current, {
          width: '100%',
          height: '100%',
          videoId: effectiveVideoId || undefined,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return;
              ytPlayerRef.current = event.target;
              setIsPlayerReady(true);
              setPlaybackError(null);
              // Start playing smoothly on initial user action
              try {
                event.target.playVideo();
              } catch {}
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              // YouTube Player States:
              // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
              if (event.data === 1) { // PLAYING
                hasActuallyPlayedRef.current = true;
                consecutiveErrorsRef.current = 0;
                setPlaybackError(null);
              } else if (event.data === 0) { // ENDED
                // Strictly only advance if the track actually played!
                if (hasActuallyPlayedRef.current) {
                  handleSongEnded();
                }
              }
            },
            onError: (err: any) => {
              if (isCancelled) return;
              console.warn('[Jukebox] YouTube Player error event:', err.data);
              hasActuallyPlayedRef.current = false;
              consecutiveErrorsRef.current += 1;

              // Do NOT rapidly loop on errors!
              if (consecutiveErrorsRef.current >= 3) {
                setPlaybackError('Multiple videos could not be embedded. Please select another song.');
              } else {
                setPlaybackError('This video cannot be played embedded.');
              }
            }
          }
        });
      } catch (err) {
        console.error('[Jukebox] Failed to create YT.Player instance:', err);
      }
    });

    return () => {
      isCancelled = true;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, []); // Run once on mount

  // 2. Seamless Track Switching: Call player.loadVideoById without reloading the iframe
  useEffect(() => {
    if (!effectiveVideoId) {
      setPlaybackError('No YouTube video ID available for this track.');
      return;
    }

    setPlaybackError(null);
    hasActuallyPlayedRef.current = false;
    setCurrentProgress(0);
    setTrackDuration(0);

    if (ytPlayerRef.current && isPlayerReady) {
      try {
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(effectiveVideoId, 0);
          if (isPlaying) {
            ytPlayerRef.current.playVideo();
          }
        }
      } catch (err) {
        console.warn('[Jukebox] loadVideoById error:', err);
      }
    }
  }, [effectiveVideoId, isPlayerReady]);

  // 3. Synchronize Play / Pause controls
  useEffect(() => {
    if (!ytPlayerRef.current || !isPlayerReady) return;

    try {
      const state = ytPlayerRef.current.getPlayerState?.();
      if (isPlaying && state !== 1 && state !== 3) {
        ytPlayerRef.current.playVideo?.();
      } else if (!isPlaying && state === 1) {
        ytPlayerRef.current.pauseVideo?.();
      }
    } catch {}
  }, [isPlaying, isPlayerReady]);

  // 4. Time and Progress Polling (smooth 500ms intervals, zero spam)
  useEffect(() => {
    if (!isPlayerReady) return;

    const interval = setInterval(() => {
      try {
        if (ytPlayerRef.current) {
          const state = ytPlayerRef.current.getPlayerState?.();
          if (state === 1) { // Only update while playing
            const curTime = ytPlayerRef.current.getCurrentTime?.();
            const dur = ytPlayerRef.current.getDuration?.();

            if (typeof curTime === 'number' && !isNaN(curTime)) {
              setCurrentProgress(curTime);
            }
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setTrackDuration(dur);
            }
          }
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [isPlayerReady]);

  // 5. Seek bar interaction
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (trackDuration <= 0 || !ytPlayerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = fraction * trackDuration;

    try {
      ytPlayerRef.current.seekTo(targetSeconds, true);
      setCurrentProgress(targetSeconds);
    } catch {}
  };

  const progressPercent = trackDuration > 0 
    ? Math.min(100, Math.max(0, (currentProgress / trackDuration) * 100))
    : 0;

  const videoContainerMaxWidth = videoSize === 'cinema' ? 'max-w-6xl' : 'max-w-4xl';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[120] pointer-events-none flex flex-col items-center select-none">
      <div className={`w-full ${containerMaxWidth} mx-auto px-4 sm:px-6 pb-3 sm:pb-4 pointer-events-auto flex flex-col items-center`}>
        
        {/* Video Drawer */}
        <div
          className={`w-full mb-2 transition-all duration-300 ${
            isVideoOpen 
              ? 'block opacity-100 max-h-[85vh]' 
              : 'h-0 max-h-0 opacity-0 pointer-events-none overflow-hidden m-0 p-0 border-0'
          }`}
        >
          <div className="w-full rounded-2xl overflow-hidden bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl">
            {/* Drawer Top Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2 min-w-0">
                <Tv className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-white truncate max-w-[220px] sm:max-w-md">
                  {currentTrack.title}
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 truncate hidden sm:inline">{album.title}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Size Toggle */}
                <button
                  type="button"
                  onClick={() => setVideoSize(videoSize === 'large' ? 'cinema' : 'large')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title={videoSize === 'large' ? 'Enlarge Video' : 'Standard Size'}
                >
                  {videoSize === 'large' ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Hide Video */}
                <button
                  type="button"
                  onClick={() => setIsVideoOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Minimize Video"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Error Notification Bar if embedding blocked */}
            {playbackError && (
              <div className="px-4 py-2 bg-amber-950/80 border-b border-amber-600/40 text-amber-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{playbackError}</span>
                </div>
                <button
                  type="button"
                  onClick={onNext}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shrink-0 cursor-pointer transition-colors"
                >
                  Next Track ▶
                </button>
              </div>
            )}

            {/* Dedicated YouTube Player Mount Slot */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              <div ref={containerRef} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Floating Tracklist Drawer */}
        <AnimatePresence>
          {isTracklistOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl mb-2 rounded-2xl overflow-hidden bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl max-h-72 flex flex-col"
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-white">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-slate-400" />
                  <span>Playlist ({totalTracks})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTracklistOpen(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-y-auto p-1.5 space-y-0.5">
                {album.tracks.map((t, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTrack(idx);
                        setIsTracklistOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-800 text-white font-medium'
                          : 'hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 font-mono text-[11px] shrink-0 text-center ${isCurrent ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
                          {isCurrent ? '▶' : String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 truncate">
                          <p className="truncate">{t.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{t.systemName || t.system || 'Track'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Player Dock Bar */}
        <div className="w-full rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-slate-200 overflow-hidden">
          
          {/* Top Edge Progress Bar with Seek Capability */}
          {trackDuration > 0 && (
            <div 
              className="w-full h-1 bg-slate-800 hover:h-1.5 transition-all cursor-pointer relative group"
              onClick={handleSeek}
              title={`${formatSeconds(currentProgress)} / ${formatSeconds(trackDuration)}`}
            >
              <div 
                className="h-full bg-sky-400 group-hover:bg-sky-300 transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3">
            {/* Left: Album Cover & Track Metadata */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <Disc className="w-6 h-6 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Title & info */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">
                  {currentTrack.title}
                </h4>

                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  <span>{currentTrack.authorName || album.title}</span>
                  <span className="text-slate-600 mx-1.5">•</span>
                  <span className="font-mono text-slate-400">
                    {formatSeconds(currentProgress)} / {formatSeconds(trackDuration)}
                  </span>
                </p>
              </div>
            </div>

            {/* Center: Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Shuffle */}
              <button
                type="button"
                onClick={onToggleShuffle}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isShuffle 
                    ? 'text-sky-400 bg-sky-500/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={isShuffle ? 'Shuffle an' : 'Shuffle aus'}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Previous */}
              <button
                type="button"
                onClick={onPrev}
                className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                title="Vorheriger Track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              {/* Play / Pause */}
              <button
                type="button"
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full bg-white text-slate-950 hover:bg-slate-200 flex items-center justify-center transition-transform active:scale-95 shadow-md cursor-pointer shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                type="button"
                onClick={onNext}
                className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              {/* Repeat */}
              <button
                type="button"
                onClick={onToggleRepeat}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isRepeat 
                    ? 'text-sky-400 bg-sky-500/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={isRepeat ? 'Repeat On' : 'Repeat Off'}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Toggle Video, Toggle Tracklist, and Close */}
            <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-slate-800">
              {/* Video Toggle */}
              {effectiveVideoId && (
                <button
                  type="button"
                  onClick={() => setIsVideoOpen(!isVideoOpen)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isVideoOpen
                      ? 'text-sky-400 bg-sky-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title={isVideoOpen ? 'Hide Video' : 'Show Video'}
                >
                  <Tv className="w-4 h-4" />
                </button>
              )}

              {/* Playlist toggle */}
              <button
                type="button"
                onClick={() => setIsTracklistOpen(!isTracklistOpen)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isTracklistOpen
                    ? 'text-sky-400 bg-sky-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="Playlist"
              >
                <ListMusic className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
