/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Disc, Play, Pause, SkipForward, Radio as RadioIcon } from 'lucide-react';
import { PublishedTrack, extractYouTubeId, incrementTrackPlays, getPublicHubTracks } from '../lib/firebase';

interface CommunityRadioWidgetProps {
  tracks: PublishedTrack[];
  onClose: () => void;
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

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const CommunityRadioWidget: React.FC<CommunityRadioWidgetProps> = ({
  tracks,
  onClose
}) => {
  const [internalTracks, setInternalTracks] = useState<PublishedTrack[]>(tracks);

  // If parent hasn't loaded tracks yet, fetch immediately so playback starts without delay
  useEffect(() => {
    if (tracks.length > 0) {
      setInternalTracks(tracks);
    } else {
      getPublicHubTracks(50)
        .then((fetched) => {
          if (fetched && fetched.length > 0) {
            setInternalTracks(fetched);
          }
        })
        .catch((err) => console.warn('[Community Radio] Preload error:', err));
    }
  }, [tracks]);

  // Filter only playable tracks with YouTube audio
  const playableTracks = internalTracks.filter((t) =>
    Boolean(t.youtubeVideoId || extractYouTubeId(t.youtubeUrl))
  );

  const [queue, setQueue] = useState<PublishedTrack[]>(() => shuffleArray(playableTracks));
  const [queueIndex, setQueueIndex] = useState<number>(0);

  // When playableTracks becomes available after initial load, populate queue
  useEffect(() => {
    if (queue.length === 0 && playableTracks.length > 0) {
      setQueue(shuffleArray(playableTracks));
    }
  }, [playableTracks, queue.length]);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const hasActuallyPlayedRef = useRef<boolean>(false);
  const lastAdvanceTimeRef = useRef<number>(0);

  const currentTrack = queue[queueIndex] || playableTracks[0];

  const effectiveVideoId = currentTrack
    ? currentTrack.youtubeVideoId || extractYouTubeId(currentTrack.youtubeUrl) || ''
    : '';

  const effectiveVideoIdRef = useRef<string>(effectiveVideoId);
  effectiveVideoIdRef.current = effectiveVideoId;

  // Advance to next random song in queue, reshuffling if at end
  const playNextRandomSong = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceTimeRef.current < 2500) return;
    lastAdvanceTimeRef.current = now;
    hasActuallyPlayedRef.current = false;

    setQueueIndex((prevIndex) => {
      if (prevIndex + 1 < queue.length) {
        return prevIndex + 1;
      } else {
        // Reshuffle for continuous infinite radio
        setQueue(shuffleArray(playableTracks));
        return 0;
      }
    });
  }, [queue.length, playableTracks]);

  // Track playcount increment
  useEffect(() => {
    if (currentTrack?.id) {
      incrementTrackPlays(currentTrack.id, currentTrack.playCount || 0).catch(() => {});
    }
  }, [currentTrack?.id]);

  // Initialize background YouTube player once - retries safely until container is ready
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeIframeApi().then((YT) => {
      if (isCancelled) return;

      const initPlayer = () => {
        if (isCancelled || ytPlayerRef.current) return;
        if (!containerRef.current) {
          setTimeout(initPlayer, 60);
          return;
        }

        try {
          const player = new YT.Player(containerRef.current, {
            width: '200',
            height: '200',
            videoId: effectiveVideoIdRef.current || undefined,
            playerVars: {
              autoplay: 1,
              controls: 0,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1,
              origin: typeof window !== 'undefined' ? window.location.origin : undefined
            },
            events: {
              onReady: (event: any) => {
                if (isCancelled) return;
                ytPlayerRef.current = event.target;
                setIsPlayerReady(true);
                try {
                  event.target.unMute();
                  event.target.setVolume(100);
                  const vid = effectiveVideoIdRef.current;
                  if (vid) {
                    event.target.loadVideoById(vid, 0);
                    event.target.playVideo();
                    setIsPlaying(true);
                  }
                } catch (e) {
                  console.warn('[Community Radio] onReady play error:', e);
                }
              },
              onStateChange: (event: any) => {
                if (isCancelled) return;
                // 1: Playing, 2: Paused, 0: Ended
                if (event.data === 1) {
                  setIsPlaying(true);
                  hasActuallyPlayedRef.current = true;
                } else if (event.data === 2) {
                  setIsPlaying(false);
                } else if (event.data === 0) {
                  if (hasActuallyPlayedRef.current) {
                    playNextRandomSong();
                  }
                }
              },
              onError: (err: any) => {
                if (isCancelled) return;
                console.warn('[Community Radio] YouTube error:', err.data);
                // Video cannot be embedded or restricted, skip to next track
                setTimeout(() => {
                  if (!isCancelled) playNextRandomSong();
                }, 1000);
              }
            }
          });
        } catch (err) {
          console.error('[Community Radio] Player init error:', err);
        }
      };

      initPlayer();
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
  }, [playNextRandomSong]);

  // When effectiveVideoId changes, load and play immediately
  useEffect(() => {
    if (!effectiveVideoId) return;
    hasActuallyPlayedRef.current = false;
    setCurrentTime(0);
    setDuration(0);

    if (ytPlayerRef.current && isPlayerReady) {
      try {
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(effectiveVideoId, 0);
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(100);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch (err) {
        console.warn('[Community Radio] loadVideoById error:', err);
      }
    }
  }, [effectiveVideoId, isPlayerReady]);

  // Track progress polling (500ms)
  useEffect(() => {
    if (!isPlayerReady) return;

    const interval = setInterval(() => {
      try {
        if (ytPlayerRef.current) {
          const state = ytPlayerRef.current.getPlayerState?.();
          if (state === 1) {
            const cur = ytPlayerRef.current.getCurrentTime?.();
            const dur = ytPlayerRef.current.getDuration?.();
            if (typeof cur === 'number' && !isNaN(cur)) setCurrentTime(cur);
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) setDuration(dur);
          }
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [isPlayerReady]);

  const togglePlayPause = () => {
    if (!ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('[Community Radio] togglePlayPause error:', err);
    }
  };

  const coverImage = currentTrack?.coverArt || '';

  return (
    <>
      {/* Hidden background player element - kept mounted at all times so API can initialize on first click */}
      <div
        style={{
          position: 'fixed',
          bottom: '0px',
          right: '0px',
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -1
        }}
        aria-hidden="true"
      >
        <div ref={containerRef} />
      </div>

      {/* Floating bottom-left Radio Card */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-4 z-[130] select-none"
        >
          <div className="relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl bg-[#090d16]/95 border border-[#1e293b] shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(56,189,248,0.15)] backdrop-blur-2xl text-slate-200 min-w-[320px] sm:min-w-[390px] max-w-[460px]">
            {/* Cyan corner accent pill */}
            <div className="absolute top-0 left-4 w-6 h-0.5 bg-sky-400 rounded-b-sm shadow-[0_0_8px_rgba(56,189,248,0.8)]" />

            {/* Square cover artwork or spinning vinyl */}
            <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={currentTrack?.title || 'Community Track'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <Disc className={`w-6 h-6 ${isPlaying ? 'animate-spin-slow text-sky-400' : 'text-slate-500'}`} />
                </div>
              )}
              {/* Radio Tag */}
              <div className="absolute bottom-1 right-1 px-1 py-0.2 text-[8px] font-mono font-bold uppercase rounded bg-black/85 text-amber-300 border border-amber-500/40">
                Radio
              </div>
            </div>

            {/* Track info & time (Artist, Title, Full mm:ss / mm:ss without truncation) */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-[220px] leading-tight">
                  {currentTrack ? currentTrack.title : 'Connecting to station...'}
                </h4>
                {isPlaying && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xs text-slate-400 font-sans truncate max-w-[130px] sm:max-w-[180px]">
                  {currentTrack?.authorName || 'Community Artist'}
                </span>

                {/* DEDICATED TIME PILL - shrink-0 & whitespace-nowrap guarantees time is NEVER truncated */}
                <span className="text-[11px] font-mono text-sky-300 font-semibold tabular-nums bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/60 shrink-0 whitespace-nowrap shadow-inner">
                  {formatSeconds(currentTime)} / {formatSeconds(duration)}
                </span>
              </div>
            </div>

            {/* Controls: Play/Pause, Next Track, Close */}
            <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800/80">
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title={isPlaying ? 'Pause Radio' : 'Play Radio'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={playNextRandomSong}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-0.5"
                title="Close Radio"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
