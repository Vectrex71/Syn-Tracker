/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Share2, 
  ExternalLink, 
  Play, 
  Pause, 
  Square, 
  Youtube, 
  Disc, 
  Sparkles, 
  Award, 
  Heart, 
  Check, 
  Copy, 
  Edit3, 
  Trash2, 
  Globe, 
  Link2,
  ArrowLeft,
  Sliders,
  Music,
  Radio,
  Volume2,
  Camera,
  Download,
  Upload,
  Video,
  FileCode,
  Flame,
  TrendingUp,
  Search,
  Filter,
  Users,
  Compass,
  Headphones,
  Plus,
  PlusCircle,
  HelpCircle,
  Clock,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FolderPlus,
  Layers,
  X,
  MessageSquare,
  Bookmark,
  Home,
  Hash,
  MoreHorizontal
} from 'lucide-react';
import { 
  MusicianProfile, 
  PublishedTrack, 
  AttachedTrackFile,
  getMusicianProfile,
  getMusicianProfileByUsername, 
  getMusicianTracks, 
  getPublicHubTracks,
  deletePublishedTrack,
  incrementTrackPlays,
  updateAlbumDetailsAcrossTracks,
  getPublishedTrackById,
  extractYouTubeId
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { TrackerSong, RetroChipSystem } from '../types';
import { AudioEngine } from '../lib/audioEngine';
import { rebuildAudioBuffers } from '../utils/audioUtils';
import { TrackVoteButtons } from './TrackVoteButtons';
import { EditTrackModal } from './EditTrackModal';
import { CdCoverPicker } from './CdCoverPicker';
import { TrackCommentsDrawer } from './TrackCommentsDrawer';
import { RetroJukeboxDock, JukeboxAlbum } from './RetroJukeboxDock';
import { CommunityRadioWidget } from './CommunityRadioWidget';

interface MusicianProfileViewProps {
  targetUsername?: string; // If viewing another user's portfolio or empty for self
  initialMode?: 'landing' | 'feed' | 'hub' | 'portfolio';
  initialTrackId?: string | null;
  initialAlbumTitle?: string | null;
  refreshTrigger?: number;
  onBackToStudio: () => void;
  onOpenEditProfile: () => void;
  onOpenPublishTrack?: (albumContext?: { albumTitle?: string; albumCover?: string }) => void;
  onLoadSongIntoTracker?: (song: TrackerSong) => void;
  onOpenCoverDesigner?: () => void;
  onOpenAuth?: () => void;
  song?: TrackerSong | null;
  fromLanding?: boolean;
  isCommunityRadioActive?: boolean;
  onToggleCommunityRadio?: () => void;
}

const SYSTEM_ICONS: Record<string, string> = {
  amiga: '/Icon_A500.png',
  c64: '/C64.png',
  gameboy: '/GB.png',
  megadrive: '/Megadrive.png',
  nes: '/NES.png',
  trk: '/Icon_TRK.png',
};

const SYSTEM_NAMES: Record<string, string> = {
  amiga: 'Commodore Amiga (Paula)',
  c64: 'Commodore 64 (MOS SID)',
  gameboy: 'Game Boy (DMG)',
  megadrive: 'Mega Drive (YM2612)',
  nes: 'Nintendo NES (2A03)',
  trk: 'SYN-Tracker Studio',
};

type ViewMode = 'landing' | 'feed' | 'portfolio';
type SortOption = 'newest' | 'top_voted' | 'most_played';

/**
 * Normalizes external URLs for profile website & social links:
 * - Strips any trailing slash (e.g. www.Syn-Tracker.online/ -> www.Syn-Tracker.online)
 * - Includes http:// or https:// so clicking does not open a relative path or cause routing errors
 * - Corrects common prefix typos like http// or https//
 */
export function formatExternalUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (/^http\/+/i.test(clean)) {
    clean = clean.replace(/^http\/+/i, 'http://');
  } else if (/^https\/+/i.test(clean)) {
    clean = clean.replace(/^https\/+/i, 'https://');
  } else if (/^http:\/([^\/])/i.test(clean)) {
    clean = clean.replace(/^http:\/([^\/])/i, 'http://$1');
  } else if (/^https:\/([^\/])/i.test(clean)) {
    clean = clean.replace(/^https:\/([^\/])/i, 'https://$1');
  } else if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean.replace(/\/+$/, '');
}

/**
 * Parses plain text containing web links (http, https, www, or domain URLs)
 * and renders them as clickable links that open in a new browser tab with rel="noopener noreferrer".
 * Ensures http:// is included in the clickable link and strips trailing slashes ("/")
 * so links like www.Syn-Tracker.online/ open cleanly as www.Syn-Tracker.online without error.
 */
export function renderLinkifiedText(text: string): React.ReactNode {
  if (!text) return null;

  // Regex matching:
  // 1) URLs starting with http://, https://, http:/, https:/, http//, https// (https?:?\/{1,3}[^\s<>"'`]+)
  // 2) URLs starting with www. (www\.[^\s<>"'`]+)
  // 3) Domain names with common TLDs like .online, .com, .de, .ch, etc.
  const urlRegex = /(https?:?\/{1,3}[^\s<>"'`]+|www\.[^\s<>"'`]+|[a-zA-Z0-9-]+\.(?:com|org|net|io|de|online|app|fm|cc|me|ch|at|uk|fr|info|top|xyz|co|eu)\b[^\s<>"'`]*)/gi;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      elements.push(text.slice(lastIndex, matchIndex));
    }

    let rawUrl = match[0];
    let trailingPunct = '';

    // Strip trailing punctuation that shouldn't belong to the URL (e.g. trailing dot, comma, exclamation, quotes)
    const punctMatch = rawUrl.match(/[.,!?:;)\]>'"]+$/);
    if (punctMatch) {
      trailingPunct = punctMatch[0];
      rawUrl = rawUrl.slice(0, -trailingPunct.length);
    }

    // Strip any trailing slash from the link (e.g. www.Syn-Tracker.online/ -> www.Syn-Tracker.online)
    rawUrl = rawUrl.replace(/\/+$/, '');

    if (rawUrl) {
      // Normalize typos such as http// or https// to include http:// properly
      let normalizedDisplay = rawUrl;
      if (/^http\/+/i.test(normalizedDisplay)) {
        normalizedDisplay = normalizedDisplay.replace(/^http\/+/i, 'http://');
      } else if (/^https\/+/i.test(normalizedDisplay)) {
        normalizedDisplay = normalizedDisplay.replace(/^https\/+/i, 'https://');
      } else if (/^http:\/([^\/])/i.test(normalizedDisplay)) {
        normalizedDisplay = normalizedDisplay.replace(/^http:\/([^\/])/i, 'http://$1');
      } else if (/^https:\/([^\/])/i.test(normalizedDisplay)) {
        normalizedDisplay = normalizedDisplay.replace(/^https:\/([^\/])/i, 'https://$1');
      }

      // Build target href with http:// or https:// and strictly remove any trailing slash
      let href = normalizedDisplay;
      if (!/^https?:\/\//i.test(href)) {
        href = `http://${href}`;
      }
      href = href.replace(/\/+$/, '');
      normalizedDisplay = normalizedDisplay.replace(/\/+$/, '');

      elements.push(
        <a
          key={matchIndex}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 hover:decoration-sky-300 font-medium transition-colors break-all inline-flex items-center gap-1 cursor-pointer"
          title={`Open ${href} in new tab`}
        >
          <span>{normalizedDisplay}</span>
          <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-75" />
        </a>
      );
    }

    if (trailingPunct) {
      elements.push(trailingPunct);
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return <>{elements}</>;
}

export const MusicianProfileView: React.FC<MusicianProfileViewProps> = ({
  targetUsername: initialTargetUsername,
  initialMode,
  initialTrackId,
  initialAlbumTitle,
  refreshTrigger,
  onBackToStudio,
  onOpenEditProfile,
  onOpenPublishTrack,
  onLoadSongIntoTracker,
  onOpenCoverDesigner,
  onOpenAuth,
  song,
  fromLanding = false,
  isCommunityRadioActive: propIsCommunityRadioActive,
  onToggleCommunityRadio,
}) => {
  const { currentUser, profile: authProfile } = useAuth();

  // Mode: 'landing' (landing page), 'feed' (social timeline stream), or 'portfolio' (artist page)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (initialTargetUsername) return 'portfolio';
    if (initialMode === 'landing') return 'landing';
    if (initialMode === 'feed') return 'feed';
    if (initialMode === 'portfolio') return 'portfolio';
    return 'landing';
  });
  const [activeUsername, setActiveUsername] = useState<string | undefined>(
    initialTargetUsername || authProfile?.username
  );

  // Sync mode and username when initial props change
  useEffect(() => {
    if (initialTargetUsername) {
      setActiveUsername(initialTargetUsername);
      setViewMode('portfolio');
    } else if (initialMode) {
      if (initialMode === 'landing') {
        setViewMode('landing');
      } else if (initialMode === 'feed') {
        setViewMode('feed');
      } else {
        setActiveUsername(authProfile?.username);
        setViewMode('portfolio');
      }
    }
  }, [initialTargetUsername, initialMode, authProfile?.username]);

  // Portfolio states
  const [profile, setProfile] = useState<MusicianProfile | null>(null);
  const [portfolioTracks, setPortfolioTracks] = useState<PublishedTrack[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Album-based Discography states
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null);
  const [albumBeingEdited, setAlbumBeingEdited] = useState<{
    oldTitle: string;
    title: string;
    coverArt?: string;
  } | null>(null);
  const [isUpdatingAlbum, setIsUpdatingAlbum] = useState(false);
  const [albumUpdateError, setAlbumUpdateError] = useState<string | null>(null);

  // Hub Community states
  const [hubTracks, setHubTracks] = useState<PublishedTrack[]>([]);
  const [hubLoading, setHubLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystemFilter, setSelectedSystemFilter] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');

  // Track editing state
  const [editingTrack, setEditingTrack] = useState<PublishedTrack | null>(null);

  // Handle ESC key to exit smoothly to Studio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingTrack) {
          setEditingTrack(null);
        } else {
          onBackToStudio();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToStudio, editingTrack]);

  // Descriptions expanded states
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [copiedShareTrackId, setCopiedShareTrackId] = useState<string | null>(null);
  const [sharedHighlightTrackId, setSharedHighlightTrackId] = useState<string | null>(initialTrackId || null);

  // Active playback state
  const [activePlayingTrackId, setActivePlayingTrackId] = useState<string | null>(null);
  const [activeYouTubeTrack, setActiveYouTubeTrack] = useState<PublishedTrack | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activePlaybackLine, setActivePlaybackLine] = useState(0);

  // Comments drawer active track ID
  const [activeCommentsTrackId, setActiveCommentsTrackId] = useState<string | null>(null);

  // Retro Jukebox Auto-Play album state
  const [activeJukeboxAlbum, setActiveJukeboxAlbum] = useState<JukeboxAlbum | null>(null);
  const activeJukeboxAlbumRef = useRef<JukeboxAlbum | null>(null);
  activeJukeboxAlbumRef.current = activeJukeboxAlbum;

  const [jukeboxTrackIndex, setJukeboxTrackIndex] = useState<number>(0);
  const [isJukeboxPlaying, setIsJukeboxPlaying] = useState<boolean>(false);
  const [isJukeboxShuffle, setIsJukeboxShuffle] = useState<boolean>(false);
  const [isJukeboxRepeat, setIsJukeboxRepeat] = useState<boolean>(true);

  // Community Radio state (audio-only, random playback widget at bottom-left)
  const [localCommunityRadioActive, setLocalCommunityRadioActive] = useState<boolean>(false);
  const isCommunityRadioActive = propIsCommunityRadioActive !== undefined ? propIsCommunityRadioActive : localCommunityRadioActive;

  // Auto jump, open album, and play YouTube video when opened via shared URL (?track=... or ?album=...)
  useEffect(() => {
    if (!initialTrackId && !initialAlbumTitle) return;

    let isMounted = true;
    const resolveSharedDestination = async () => {
      if (initialAlbumTitle) {
        setSelectedAlbumKey(initialAlbumTitle);
      }

      if (initialTrackId) {
        setSharedHighlightTrackId(initialTrackId);

        // Check already loaded tracks first
        let track = portfolioTracks.find((t) => t.id === initialTrackId) || 
                    hubTracks.find((t) => t.id === initialTrackId);

        // If not found in current arrays, fetch from Firestore
        if (!track) {
          try {
            track = await getPublishedTrackById(initialTrackId);
          } catch (e) {
            console.error('Error finding shared track:', e);
          }
        }

        if (!track || !isMounted) return;

        // If author is known, switch to author's portfolio
        if (track.authorUsername) {
          setActiveUsername(track.authorUsername);
          setViewMode('portfolio');
        }

        // Open album if in an album, or singles
        if (track.albumTitle) {
          setSelectedAlbumKey(track.albumTitle);
        } else {
          setSelectedAlbumKey('singles');
        }

        // Auto-open YouTube video player
        if (track.youtubeVideoId) {
          setActiveYouTubeTrack(track);
          incrementTrackPlays(track.id, track.playCount || 0).catch(() => {});
        }

        // Smooth scroll to the card
        setTimeout(() => {
          const el = document.getElementById(`track-card-${initialTrackId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);

        // Clear pulse after 5s
        setTimeout(() => {
          if (isMounted) setSharedHighlightTrackId(null);
        }, 5000);
      }
    };

    resolveSharedDestination();

    return () => {
      isMounted = false;
    };
  }, [initialTrackId, initialAlbumTitle, portfolioTracks.length, hubTracks.length]);

  const localAudioEngineRef = useRef<AudioEngine | null>(null);

  // Scroll-driven Background Zoom Effect matching the main landing page
  const scrollContainerRef = useRef<HTMLElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [bgZoom, setBgZoom] = useState<number>(1);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (rafIdRef.current) return;
    const el = e.currentTarget;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!el) return;
      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      const progress = Math.min(1, Math.max(0, el.scrollTop / maxScroll));
      // Subtle organic zoom: 1.0 (at top) to 1.12 (scrolled down), with a smooth ease curve
      const zoom = 1.0 + Math.pow(progress, 0.85) * 0.12;
      setBgZoom(zoom);
    });
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Reset scroll position when switching between views
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [viewMode]);

  // Determine if viewing own portfolio
  const isSelf = !activeUsername || (authProfile && authProfile.username.toLowerCase() === activeUsername.toLowerCase());

  // Load Hub tracks
  const loadHubTracks = async () => {
    setHubLoading(true);
    try {
      const publicTracks = await getPublicHubTracks(100);
      setHubTracks(publicTracks);
    } catch (err) {
      console.error('Error fetching hub tracks:', err);
    } finally {
      setHubLoading(false);
    }
  };

  useEffect(() => {
    loadHubTracks();
  }, [refreshTrigger, viewMode]);

  // Load portfolio when in portfolio view
  useEffect(() => {
    if (viewMode !== 'portfolio') return;

    let isMounted = true;
    const load = async () => {
      setPortfolioLoading(true);
      try {
        let loadedProfile: MusicianProfile | null = null;
        if (isSelf && authProfile) {
          loadedProfile = authProfile;
        } else if (activeUsername) {
          loadedProfile = await getMusicianProfileByUsername(activeUsername);
        } else if (authProfile) {
          loadedProfile = authProfile;
        }

        if (loadedProfile && isMounted) {
          setProfile(loadedProfile);
          const userTracks = await getMusicianTracks(loadedProfile.uid);
          if (isMounted) setPortfolioTracks(userTracks);
        }
      } catch (err) {
        console.error('Error loading portfolio:', err);
      } finally {
        if (isMounted) setPortfolioLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [viewMode, activeUsername, authProfile, isSelf, refreshTrigger]);

  // Author avatar cache for tracks
  const [authorAvatarCache, setAuthorAvatarCache] = useState<Record<string, string>>({});

  // Helper to retrieve author avatar from track, profiles, or cache
  const getAuthorAvatar = (t: PublishedTrack): string | undefined => {
    if (t.authorAvatarUrl) return t.authorAvatarUrl;
    if (profile && (profile.uid === t.authorUid || profile.username?.toLowerCase() === t.authorUsername?.toLowerCase())) {
      if (profile.avatarUrl) return profile.avatarUrl;
    }
    if (authProfile && (authProfile.uid === t.authorUid || authProfile.username?.toLowerCase() === t.authorUsername?.toLowerCase())) {
      if (authProfile.avatarUrl) return authProfile.avatarUrl;
    }
    if (t.authorUid && authorAvatarCache[t.authorUid]) {
      return authorAvatarCache[t.authorUid];
    }
    if (t.authorUsername && authorAvatarCache[t.authorUsername.toLowerCase()]) {
      return authorAvatarCache[t.authorUsername.toLowerCase()];
    }
    return undefined;
  };

  // Prefetch missing author avatars for public tracks
  useEffect(() => {
    const allTracks = [...portfolioTracks, ...hubTracks];
    const uidsToFetch = new Set<string>();
    for (const t of allTracks) {
      if (!t.authorAvatarUrl && t.authorUid && !authorAvatarCache[t.authorUid]) {
        if (authProfile?.uid === t.authorUid && authProfile.avatarUrl) continue;
        if (profile?.uid === t.authorUid && profile.avatarUrl) continue;
        uidsToFetch.add(t.authorUid);
      }
    }

    if (uidsToFetch.size === 0) return;

    let isMounted = true;
    (async () => {
      const newAvatars: Record<string, string> = {};
      for (const uid of Array.from(uidsToFetch).slice(0, 40)) {
        try {
          const p = await getMusicianProfile(uid);
          if (p?.avatarUrl) {
            newAvatars[uid] = p.avatarUrl;
            if (p.username) newAvatars[p.username.toLowerCase()] = p.avatarUrl;
          }
        } catch {
          // ignore network failure
        }
      }
      if (isMounted && Object.keys(newAvatars).length > 0) {
        setAuthorAvatarCache((prev) => ({ ...prev, ...newAvatars }));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [portfolioTracks, hubTracks, authProfile, profile]);

  // Clean up audio on unmount or stop
  const stopActiveAudio = () => {
    if (localAudioEngineRef.current) {
      localAudioEngineRef.current.stop();
      localAudioEngineRef.current = null;
    }
    setIsAudioPlaying(false);
    setActivePlayingTrackId(null);
  };

  const stopCommunityRadioIfPlaying = useCallback(() => {
    if (isCommunityRadioActive) {
      if (onToggleCommunityRadio) {
        onToggleCommunityRadio();
      } else {
        setLocalCommunityRadioActive(false);
      }
    }
  }, [isCommunityRadioActive, onToggleCommunityRadio]);

  useEffect(() => {
    return () => {
      stopActiveAudio();
    };
  }, []);

  const handlePlayTrack = async (track: PublishedTrack) => {
    // If no serialized tracker song, toggle YouTube visualizer
    if (!track.songDataJson) {
      if (track.youtubeVideoId || track.youtubeUrl) {
        setActiveYouTubeTrack(activeYouTubeTrack?.id === track.id ? null : track);
      }
      return;
    }

    // If clicking same track currently playing, pause/stop
    if (activePlayingTrackId === track.id) {
      stopActiveAudio();
      return;
    }

    stopActiveAudio();
    stopCommunityRadioIfPlaying();
    setActivePlayingTrackId(track.id);

    try {
      const parsedSong: TrackerSong = JSON.parse(track.songDataJson);
      const restored = await rebuildAudioBuffers(parsedSong);

      const engine = new AudioEngine();
      engine.init();
      engine.setSong(restored);
      engine.setOnStepTrigger((_order, line) => {
        setActivePlaybackLine(line);
      });
      engine.setOnSongEnd(() => {
        setIsAudioPlaying(false);
        setActivePlayingTrackId(null);
      });

      engine.start(0, 0);
      localAudioEngineRef.current = engine;
      setIsAudioPlaying(true);
      incrementTrackPlays(track.id, track.playCount);
    } catch (err) {
      console.error('Failed to play track in browser:', err);
      setActivePlayingTrackId(null);
    }
  };

  const handleStartJukebox = (
    albumToPlay: { title: string; coverArt?: string; tracks: PublishedTrack[] },
    startIndex = 0
  ) => {
    stopActiveAudio();
    stopCommunityRadioIfPlaying();
    setActiveYouTubeTrack(null);

    const sortedTracks = [...albumToPlay.tracks].sort((a, b) => {
      if (typeof a.trackNumber === 'number' && typeof b.trackNumber === 'number') {
        return a.trackNumber - b.trackNumber;
      }
      return 0;
    });

    const albumObj: JukeboxAlbum = {
      title: albumToPlay.title,
      coverArt: albumToPlay.coverArt || sortedTracks[0]?.coverArt || '',
      tracks: sortedTracks
    };

    setActiveJukeboxAlbum(albumObj);
    const validIdx = startIndex >= 0 && startIndex < sortedTracks.length ? startIndex : 0;
    setJukeboxTrackIndex(validIdx);
    setIsJukeboxPlaying(true);

    const firstTrack = sortedTracks[validIdx] || sortedTracks[0];
    if (firstTrack) {
      incrementTrackPlays(firstTrack.id, firstTrack.playCount || 0).catch(() => {});
    }
  };

  const handleJukeboxNext = useCallback(() => {
    const currentAlbum = activeJukeboxAlbumRef.current;
    if (!currentAlbum || currentAlbum.tracks.length === 0) return;
    const len = currentAlbum.tracks.length;

    setJukeboxTrackIndex((prevIdx) => {
      let nextIdx = prevIdx + 1;
      if (isJukeboxShuffle && len > 1) {
        let rand = Math.floor(Math.random() * len);
        let attempts = 0;
        while (rand === prevIdx && attempts < 10) {
          rand = Math.floor(Math.random() * len);
          attempts++;
        }
        nextIdx = rand;
      } else if (nextIdx >= len) {
        if (isJukeboxRepeat) {
          nextIdx = 0;
        } else {
          setIsJukeboxPlaying(false);
          return prevIdx;
        }
      }

      const nextTrack = currentAlbum.tracks[nextIdx];
      if (nextTrack) {
        incrementTrackPlays(nextTrack.id, nextTrack.playCount || 0).catch(() => {});
      }
      return nextIdx;
    });

    setIsJukeboxPlaying(true);
  }, [isJukeboxShuffle, isJukeboxRepeat]);

  const handleJukeboxPrev = useCallback(() => {
    const currentAlbum = activeJukeboxAlbumRef.current;
    if (!currentAlbum || currentAlbum.tracks.length === 0) return;
    const len = currentAlbum.tracks.length;

    setJukeboxTrackIndex((prevIdx) => {
      let prev = prevIdx - 1;
      if (prev < 0) {
        prev = len - 1;
      }
      const prevTrack = currentAlbum.tracks[prev];
      if (prevTrack) {
        incrementTrackPlays(prevTrack.id, prevTrack.playCount || 0).catch(() => {});
      }
      return prev;
    });

    setIsJukeboxPlaying(true);
  }, []);

  const handleJukeboxTrackEnded = useCallback(() => {
    // Automatically advance to the next track when current video/song ends!
    handleJukeboxNext();
  }, [handleJukeboxNext]);

  // Start Community Radio with all songs from all members in continuous shuffle/auto-play
  const handleToggleRadio = useCallback(() => {
    if (onToggleCommunityRadio) {
      if (!isCommunityRadioActive) {
        stopActiveAudio();
        setActiveJukeboxAlbum(null);
        setIsJukeboxPlaying(false);
        setActiveYouTubeTrack(null);
      }
      onToggleCommunityRadio();
    } else {
      if (isCommunityRadioActive) {
        setLocalCommunityRadioActive(false);
      } else {
        const playable = hubTracks.filter(
          (t) => Boolean(t.youtubeVideoId || extractYouTubeId(t.youtubeUrl))
        );
        if (playable.length === 0) return;
        stopActiveAudio();
        setActiveJukeboxAlbum(null);
        setIsJukeboxPlaying(false);
        setActiveYouTubeTrack(null);
        setLocalCommunityRadioActive(true);
      }
    }
  }, [onToggleCommunityRadio, isCommunityRadioActive, hubTracks]);

  const handleDownloadAttachedFile = (file: AttachedTrackFile) => {
    if (!file.dataBase64) return;
    const a = document.createElement('a');
    a.href = file.dataBase64;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (trackId: string) => {
    if (!window.confirm('Are you sure you want to delete this track from the Musician Hub?')) return;
    try {
      if (activePlayingTrackId === trackId) stopActiveAudio();
      await deletePublishedTrack(trackId);
      setPortfolioTracks((prev) => prev.filter((t) => t.id !== trackId));
      setHubTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err) {
      console.error('Failed to delete track:', err);
    }
  };

  const handleTrackUpdated = (updatedTrack: PublishedTrack) => {
    setPortfolioTracks((prev) =>
      prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t))
    );
    setHubTracks((prev) =>
      prev.map((t) => (t.id === updatedTrack.id ? updatedTrack : t))
    );
    setEditingTrack(null);
  };

  const handleSharePortfolio = () => {
    const url = window.location.origin + `?u=${profile?.username || ''}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const toggleDescriptionExpand = (trackId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [trackId]: !prev[trackId],
    }));
  };

  const navigateToMusician = (username: string) => {
    setActiveUsername(username);
    setViewMode('portfolio');
    stopActiveAudio();
  };

  // Filter and sort Hub tracks
  const filteredHubTracks = useMemo(() => {
    let list = [...hubTracks];

    // Filter by system or visualizer
    if (selectedSystemFilter !== 'all') {
      if (selectedSystemFilter === 'video') {
        list = list.filter((t) => Boolean(t.youtubeVideoId || t.youtubeUrl));
      } else {
        list = list.filter((t) => t.system === selectedSystemFilter);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q) ||
        (t.authorUsername && t.authorUsername.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.systemName && t.systemName.toLowerCase().includes(q))
      );
    }

    // Sort
    if (selectedSort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (selectedSort === 'top_voted') {
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (selectedSort === 'most_played') {
      list.sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
    }

    return list;
  }, [hubTracks, selectedSystemFilter, searchQuery, selectedSort]);

  // Top creators derived from published hub tracks for social sidebar
  const topMusicians = useMemo(() => {
    const map = new Map<
      string,
      {
        username: string;
        name: string;
        avatar?: string;
        isSupporter?: boolean;
        supporterTier?: string;
        trackCount: number;
        totalScore: number;
      }
    >();

    for (const t of hubTracks) {
      const key = t.authorUsername || t.authorName;
      if (!key) continue;
      const existing = map.get(key) || {
        username: t.authorUsername || t.authorName,
        name: t.authorName || t.authorUsername,
        avatar: getAuthorAvatar(t),
        isSupporter: t.authorIsSupporter,
        supporterTier: t.authorSupporterTier,
        trackCount: 0,
        totalScore: 0,
      };
      existing.trackCount += 1;
      existing.totalScore += t.score ?? 0;
      map.set(key, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);
  }, [hubTracks]);

  // Group portfolio tracks by album
  interface AlbumGroup {
    id: string; // albumTitle or '__singles__'
    title: string;
    coverArt?: string;
    isSingleCollection: boolean;
    tracks: PublishedTrack[];
    totalScore: number;
    releaseDate: string;
  }

  const albumGroups = useMemo<AlbumGroup[]>(() => {
    if (!portfolioTracks || portfolioTracks.length === 0) return [];

    const map = new Map<string, PublishedTrack[]>();
    const singles: PublishedTrack[] = [];

    portfolioTracks.forEach((t) => {
      const album = t.albumTitle?.trim();
      if (album) {
        const existing = map.get(album) || [];
        existing.push(t);
        map.set(album, existing);
      } else {
        singles.push(t);
      }
    });

    const groups: AlbumGroup[] = [];

    // Named Albums
    map.forEach((tracks, title) => {
      // Sort tracks within album by trackNumber (if given), then by createdAt
      tracks.sort((a, b) => {
        if (a.trackNumber != null && b.trackNumber != null) {
          return a.trackNumber - b.trackNumber;
        }
        if (a.trackNumber != null) return -1;
        if (b.trackNumber != null) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Find album cover: prioritize albumCover from any track in the album, fallback to first track's coverArt
      const coverArt = tracks.find((t) => t.albumCover)?.albumCover || tracks[0]?.coverArt;
      const totalScore = tracks.reduce((sum, t) => sum + (t.score ?? 0), 0);
      const releaseDate = tracks[0]?.createdAt || '';

      groups.push({
        id: title,
        title,
        coverArt,
        isSingleCollection: false,
        tracks,
        totalScore,
        releaseDate,
      });
    });

    // Standalone Singles & EPs
    if (singles.length > 0) {
      singles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const coverArt = singles[0]?.coverArt;
      const totalScore = singles.reduce((sum, t) => sum + (t.score ?? 0), 0);
      const releaseDate = singles[0]?.createdAt || '';

      groups.push({
        id: '__singles__',
        title: 'Singles & Standalone Releases',
        coverArt,
        isSingleCollection: true,
        tracks: singles,
        totalScore,
        releaseDate,
      });
    }

    return groups;
  }, [portfolioTracks]);

  const handleSaveAlbumDetails = async () => {
    if (!albumBeingEdited || !authProfile) return;
    const newTitle = albumBeingEdited.title.trim();
    if (!newTitle) {
      setAlbumUpdateError('Please enter an album title.');
      return;
    }

    setIsUpdatingAlbum(true);
    setAlbumUpdateError(null);
    try {
      await updateAlbumDetailsAcrossTracks(
        authProfile.uid,
        albumBeingEdited.oldTitle,
        newTitle,
        albumBeingEdited.coverArt
      );

      // Update state locally
      setPortfolioTracks((prev) =>
        prev.map((t) => {
          if (t.albumTitle === albumBeingEdited.oldTitle) {
            return {
              ...t,
              albumTitle: newTitle,
              albumCover: albumBeingEdited.coverArt,
            };
          }
          return t;
        })
      );
      setHubTracks((prev) =>
        prev.map((t) => {
          if (t.authorUid === authProfile.uid && t.albumTitle === albumBeingEdited.oldTitle) {
            return {
              ...t,
              albumTitle: newTitle,
              albumCover: albumBeingEdited.coverArt,
            };
          }
          return t;
        })
      );

      if (selectedAlbumKey === albumBeingEdited.oldTitle) {
        setSelectedAlbumKey(newTitle);
      }

      setAlbumBeingEdited(null);
    } catch (err: any) {
      console.error('Error updating album:', err);
      setAlbumUpdateError(err.message || 'Failed to update album details');
    } finally {
      setIsUpdatingAlbum(false);
    }
  };

  // Render Album Card Component in Portfolio view
  const renderAlbumCard = (album: AlbumGroup) => {
    const coverImage = album.coverArt || album.tracks[0]?.coverArt || '';

    return (
      <div
        key={album.id}
        onClick={() => setSelectedAlbumKey(album.id)}
        className="group relative rounded-2xl bg-[#0c131f]/75 hover:bg-[#0c131f]/90 border border-slate-700/80 hover:border-sky-500/50 backdrop-blur-md transition-all duration-300 shadow-xl hover:shadow-sky-500/10 overflow-hidden cursor-pointer"
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* CD Jewel Case Cover Showcase */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden bg-slate-950 border border-slate-600/80 shadow-2xl group-hover:scale-105 transition-transform duration-300">
              {coverImage ? (
                <>
                  <img
                    src={coverImage}
                    alt={album.title}
                    className="w-full h-full object-cover select-none"
                  />
                  {/* CD Jewel case spine reflection & shine */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/50 via-transparent to-white/20" />
                  <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-black/80 to-transparent border-r border-white/20" />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                  <Disc className="w-10 h-10 text-sky-400 mb-2 drop-shadow group-hover:rotate-45 transition-transform duration-500" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    {album.isSingleCollection ? 'Collection' : 'Album'}
                  </span>
                </div>
              )}

              {/* Track count pill overlay */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-mono font-bold text-white shadow-lg">
                {album.tracks.length} {album.tracks.length === 1 ? 'Track' : 'Tracks'}
              </div>
            </div>

            {/* Album Metadata & Quick Tracklist Preview */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {album.isSingleCollection ? 'STANDALONE RELEASES' : 'ALBUM RELEASE'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {album.tracks.length} {album.tracks.length === 1 ? 'Song' : 'Songs'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono text-xs font-bold">
                  ★ {album.totalScore > 0 ? `+${album.totalScore}` : album.totalScore}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-sky-300 transition-colors leading-tight">
                {album.title}
              </h3>

              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                Click to open album tracklist with individual song covers and music videos.
              </p>

              {/* Sample Track Pills (First 4 songs) */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {album.tracks.slice(0, 4).map((t) => {
                  const tSysKey = (t.system || '').toLowerCase();
                  const tFmtKey = (t.format || '').toLowerCase();
                  const tIcon = SYSTEM_ICONS[tSysKey] || SYSTEM_ICONS[tFmtKey] || (
                    tFmtKey === 'mod' ? '/Icon_A500.png' :
                    tFmtKey === 'sid' || tFmtKey === 'prg' ? '/C64.png' :
                    tFmtKey === 'gbs' ? '/GB.png' :
                    tFmtKey === 'vgm' ? '/Megadrive.png' :
                    tFmtKey === 'nsf' ? '/NES.png' :
                    '/Icon_TRK.png'
                  );
                  return (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-mono"
                    >
                      <img src={tIcon} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                      <span className="truncate max-w-[160px]">{t.title}</span>
                    </span>
                  );
                })}
                {album.tracks.length > 4 && (
                  <span className="text-xs font-mono text-slate-500 self-center">
                    +{album.tracks.length - 4} more
                  </span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartJukebox({
                      title: album.title,
                      coverArt: album.coverArt,
                      tracks: album.tracks
                    }, 0);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/30 flex items-center gap-1.5 cursor-pointer"
                  title="Play full album with automatic track advance"
                >
                  <Disc className="w-3.5 h-3.5 text-white" />
                  <span>Jukebox Auto-Play</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAlbumKey(album.id);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Open Album Tracklist</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {isSelf && !album.isSingleCollection && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAlbumBeingEdited({
                        oldTitle: album.title,
                        title: album.title,
                        coverArt: album.coverArt,
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3 h-3 text-sky-400" />
                    <span>Edit Album Details</span>
                  </button>
                )}

                {isSelf && onOpenPublishTrack && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPublishTrack({
                        albumTitle: album.isSingleCollection ? undefined : album.title,
                        albumCover: album.coverArt,
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3 h-3 text-sky-400" />
                    <span>Add Song</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Track Card Component (Social Media Post tile layout)
  const renderTrackCard = (track: PublishedTrack, showAuthorLink = true) => {
    const isPlayingThis = isAudioPlaying && activePlayingTrackId === track.id;
    const sysKey = (track.system || '').toLowerCase();
    const fmtKey = (track.format || '').toLowerCase();
    const sysIcon = SYSTEM_ICONS[sysKey] || SYSTEM_ICONS[fmtKey] || (
      fmtKey === 'mod' ? '/Icon_A500.png' :
      fmtKey === 'sid' || fmtKey === 'prg' ? '/C64.png' :
      fmtKey === 'gbs' ? '/GB.png' :
      fmtKey === 'vgm' ? '/Megadrive.png' :
      fmtKey === 'nsf' ? '/NES.png' :
      '/Icon_TRK.png'
    );
    const sysName = SYSTEM_NAMES[sysKey] || track.systemName || (
      fmtKey === 'mod' ? 'Amiga ProTracker (MOD)' :
      fmtKey === 'sid' ? 'Commodore 64 (SID)' :
      'Retro Track'
    );
    const isOwner = currentUser && track.authorUid === currentUser.uid;
    const hasYouTube = Boolean(track.youtubeVideoId || track.youtubeUrl);
    const isDescExpanded = Boolean(expandedDescriptions[track.id]);
    const descLength = track.description?.length || 0;
    const isLongDesc = descLength > 280;
    const authorAvatar = getAuthorAvatar(track);

    const isSharedTarget = sharedHighlightTrackId === track.id;

    return (
      <article
        key={track.id}
        id={`track-card-${track.id}`}
        className={`group relative rounded-2xl bg-[#0c131f]/85 hover:bg-[#0c131f]/95 border backdrop-blur-md transition-all duration-200 shadow-xl overflow-hidden ${
          isSharedTarget
            ? 'border-sky-400 ring-2 ring-sky-400/80 shadow-sky-500/20 bg-[#0e1828]/95'
            : isPlayingThis 
            ? 'border-sky-400/90 bg-[#0e1828]/95 shadow-sky-950/70 ring-1 ring-sky-400/40' 
            : 'border-slate-800/90 hover:border-slate-700/90'
        }`}
      >
        <div className="p-3 sm:p-5 w-full max-w-full overflow-hidden">
          <div className="flex items-start gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0">
            {/* Left: Author Avatar (Borderless, slightly enlarged per user request) */}
            {showAuthorLink ? (
              <button
                type="button"
                onClick={() => navigateToMusician(track.authorUsername || track.authorName)}
                className="cursor-pointer shrink-0 mt-0.5 group/avatar"
                title={`Visit ${track.authorName || track.authorUsername}`}
              >
                <div className="relative">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={track.authorName || track.authorUsername}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover select-none shadow-md transition-transform group-hover/avatar:scale-105"
                    />
                  ) : (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  )}
                  {track.authorIsSupporter && (
                    <div 
                      className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#1c1404] border border-amber-400 shadow-md flex items-center justify-center"
                      title={track.authorSupporterTier === 'supporter' ? 'Community Supporter' : 'Gold VIP Supporter'}
                    >
                      {track.authorSupporterTier === 'supporter' ? (
                        <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                      ) : (
                        <Award className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-sm" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <div className="shrink-0 mt-0.5 relative group/format" title={sysName}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center overflow-hidden p-1.5 shadow-md group-hover/format:border-sky-500/50 transition-colors">
                  <img src={sysIcon} alt={sysName} className="w-full h-full object-contain select-none" />
                </div>
                {track.trackNumber != null && (
                  <span className="absolute -bottom-1 -right-1 px-1 min-w-[16px] h-4 rounded bg-sky-950/95 border border-sky-500/60 text-[9px] font-mono font-bold text-sky-300 flex items-center justify-center leading-none shadow">
                    {track.trackNumber < 10 ? `0${track.trackNumber}` : track.trackNumber}
                  </span>
                )}
              </div>
            )}

            {/* Right: Full Post Body */}
            <div className="flex-1 min-w-0">
              {/* Header Row: Author Name / Title, Owner Options */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {showAuthorLink ? (
                    <button
                      type="button"
                      onClick={() => navigateToMusician(track.authorUsername || track.authorName)}
                      className="text-sm sm:text-[15px] font-bold text-white hover:text-sky-300 transition-colors cursor-pointer truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs"
                    >
                      {track.authorName || track.authorUsername}
                    </button>
                  ) : (
                    <span className="text-sm sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-xs">
                      {track.title}
                    </span>
                  )}
                </div>

                {/* Owner Options (Small format icon deleted from here per request) */}
                {isOwner && (
                  <div className="flex items-center gap-0.5 bg-slate-900/80 border border-slate-700/70 rounded-lg p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingTrack(track)}
                      className="p-1 rounded text-sky-400 hover:text-white hover:bg-sky-500/30 transition-all cursor-pointer"
                      title="Edit Track Details & Description"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(track.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                      title="Delete Track"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Post Liner Notes / Status Text (Front and center, like a Tweet / Bluesky Post) */}
              {track.description && (
                <div className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {renderLinkifiedText(
                    isLongDesc && !isDescExpanded
                      ? `${track.description.slice(0, 260)}...`
                      : track.description
                  )}
                  {isLongDesc && (
                    <button
                      type="button"
                      onClick={() => toggleDescriptionExpand(track.id)}
                      className="ml-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isDescExpanded ? 'Show less' : 'Read more'}</span>
                      {isDescExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              )}

              {/* Embedded Media Card: 1:1 Square Cover on top-left, Name beside it, Song below it, plus PLAY button */}
              <div className="mt-3 rounded-2xl overflow-hidden border border-slate-700/70 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  {/* 1:1 Square Cover on the top-left */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-md flex items-center justify-center group/cover">
                    {track.coverArt ? (
                      <img
                        src={track.coverArt}
                        alt={track.title}
                        className="w-full h-full object-cover select-none group-hover/cover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                        <Disc className="w-10 h-10 text-sky-400/50" />
                        <span className="text-[10px] font-mono mt-1 text-slate-400">Cover</span>
                      </div>
                    )}

                    {/* Subtle playing equalizer overlay on cover */}
                    {isPlayingThis && (
                      <div className="absolute inset-0 bg-sky-950/50 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="flex items-end gap-1 h-5">
                          <div className="w-1.5 bg-sky-400 rounded-full animate-bounce h-3" />
                          <div className="w-1.5 bg-sky-300 rounded-full animate-bounce h-5 delay-75" />
                          <div className="w-1.5 bg-sky-400 rounded-full animate-bounce h-3.5 delay-150" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right side: Author name, track title underneath, and play controls */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                    <div>
                      {/* Author name */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <button
                          type="button"
                          onClick={() => navigateToMusician(track.authorUsername || track.authorName)}
                          className="text-sm sm:text-base font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer truncate max-w-[220px]"
                        >
                          {track.authorName || track.authorUsername}
                        </button>
                      </div>

                      {/* Track title underneath */}
                      <h4 className="text-base sm:text-lg font-black text-white leading-tight truncate mt-1">
                        {track.title}
                      </h4>
                      {track.albumTitle && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Disc className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{track.albumTitle}</span>
                        </p>
                      )}
                    </div>

                    {/* Play controls - Sleek modern chiptune/video player controls */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {hasYouTube ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isPlayingThis) {
                              stopActiveAudio();
                            }
                            setActiveYouTubeTrack(activeYouTubeTrack?.id === track.id ? null : track);
                          }}
                          className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm ${
                            activeYouTubeTrack?.id === track.id
                              ? 'bg-rose-500/25 text-rose-200 border border-rose-500/60 shadow-inner'
                              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-400/50'
                          }`}
                          title={activeYouTubeTrack?.id === track.id ? 'Stop' : 'Play'}
                        >
                          {activeYouTubeTrack?.id === track.id ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play</span>
                            </>
                          )}
                        </button>
                      ) : track.songDataJson ? (
                        <button
                          type="button"
                          onClick={() => handlePlayTrack(track)}
                          className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm ${
                            isPlayingThis
                              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-amber-500/20'
                              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 hover:border-sky-400/50'
                          }`}
                          title={isPlayingThis ? 'Stop Audio' : 'Play Track'}
                        >
                          {isPlayingThis ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="hidden sm:inline">Play Track</span>
                              <span className="sm:hidden">Play</span>
                            </>
                          )}
                        </button>
                      ) : null}

                      {/* Audio specs badge */}
                      <div className="hidden xs:flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        {track.channelsCount ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
                            {track.channelsCount} Ch
                          </span>
                        ) : null}
                        {track.bpm ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
                            {track.bpm} BPM
                          </span>
                        ) : null}
                      </div>

                      {/* Attached Stems / Download Files */}
                      {track.attachedFiles && track.attachedFiles.length > 0 && (
                        track.attachedFiles.map((file, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleDownloadAttachedFile(file)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                            title={`Download ${file.name}`}
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-mono text-[11px]">{file.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* YouTube Video Showcase Drawer */}
                {activeYouTubeTrack?.id === track.id && track.youtubeVideoId && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-700/80">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${track.youtubeVideoId}?autoplay=1&rel=0`}
                        title={track.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Social Engagement Footer Row (Sound System / Like / Play count / Share) */}
              <div className="mt-3.5 pt-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/70">
                {/* Retro Sound System Badge */}
                <div className="flex items-center gap-1.5 text-slate-400">
                  <img src={sysIcon} alt={sysName} className="w-3.5 h-3.5 object-contain" />
                  <span className="hidden sm:inline font-mono text-[11px]">{sysName}</span>
                </div>

                {/* Vote / Upvote Heart Counter */}
                <div className="flex items-center">
                  <TrackVoteButtons
                    trackId={track.id}
                    initialScore={track.score ?? 0}
                    initialUpvotes={track.upvotes ?? 0}
                    initialDownvotes={track.downvotes ?? 0}
                    compact
                  />
                </div>

                {/* Play Count */}
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Headphones className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-[11px]">{track.playCount ?? 0} <span className="hidden sm:inline">plays</span></span>
                </div>

                {/* Comments button with counter */}
                <button
                  type="button"
                  onClick={() => setActiveCommentsTrackId(activeCommentsTrackId === track.id ? null : track.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    activeCommentsTrackId === track.id 
                      ? 'text-sky-300 font-bold bg-sky-500/15 border border-sky-500/30' 
                      : 'hover:text-sky-300 text-slate-400 hover:bg-slate-800/40'
                  }`}
                  title={activeCommentsTrackId === track.id ? "Collapse comments" : "View comments"}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="font-mono text-[11px]">{track.commentCount ?? 0}</span>
                  {activeCommentsTrackId === track.id && (
                    <ChevronUp className="w-3 h-3 text-sky-400" />
                  )}
                </button>

                {/* Share Action */}
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?musician=${encodeURIComponent(track.authorUsername || track.authorName)}&track=${encodeURIComponent(track.id)}`;
                    navigator.clipboard.writeText(shareUrl);
                    setCopiedShareTrackId(track.id);
                    setTimeout(() => setCopiedShareTrackId(null), 2000);
                  }}
                  className="flex items-center gap-1.5 hover:text-sky-300 transition-colors cursor-pointer group"
                  title="Copy share link"
                >
                  {copiedShareTrackId === track.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px] font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-slate-400 group-hover:text-sky-300" />
                      <span className="hidden sm:inline font-medium">Share</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-time Comments & Feedback Drawer */}
              <AnimatePresence>
                {activeCommentsTrackId === track.id && (
                  <TrackCommentsDrawer
                    track={track}
                    currentUserProfile={authProfile}
                    onOpenAuth={onOpenAuth}
                    onSelectAuthor={(username) => {
                      setActiveUsername(username);
                      setViewMode('portfolio');
                    }}
                    onClose={() => setActiveCommentsTrackId(null)}
                    onCommentCountChange={(trackId, newCount) => {
                      setPortfolioTracks((prev) =>
                        prev.map((t) => (t.id === trackId ? { ...t, commentCount: newCount } : t))
                      );
                      setHubTracks((prev) =>
                        prev.map((t) => (t.id === trackId ? { ...t, commentCount: newCount } : t))
                      );
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#445166] text-slate-100 overflow-hidden font-sans relative">
      {/* Base Gray Studio Background - Silver Steel (Exact tracker studio tone) */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[#445166]" />

      {/* Studio Wallpaper Layer - Remains beautifully visible across Hub & Feed */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat mix-blend-luminosity filter brightness-95 contrast-105 origin-center will-change-transform opacity-65"
        style={{ 
          backgroundImage: `url('/Studiopaper.jpeg')`,
          transform: `scale(${bgZoom.toFixed(4)})`,
          transition: 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)',
        }}
      />

      {/* Ambient subtle vignette overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

      {/* Atmospheric studio radial glow that breathes in softly behind the feed & community hubs */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000 ease-in-out"
        style={{
          background: 'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(14, 165, 233, 0.12) 0%, rgba(30, 27, 75, 0.08) 50%, transparent 80%)',
          opacity: viewMode === 'feed' ? 1 : 0.45,
        }}
      />

      {/* Top Main Navigation Bar (Slides down from top with deceleration, exits accelerating upwards) */}
      <motion.header 
        initial={{ y: -65, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -70, opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
        className="h-14 bg-[#0a0f18]/85 backdrop-blur-md border-b border-white/10 px-2.5 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 relative w-full max-w-full overflow-hidden"
      >
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-1 sm:gap-1.5 h-7 px-2.5 sm:px-3 rounded-md aqua-gloss aqua-dark border border-[#1e2d42] text-xs font-mono font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Return to Studio (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{fromLanding ? 'Back' : 'Studio'}</span>
          </button>

          <div className="h-4 w-px bg-white/10 shrink-0 hidden xs:block" />

          {/* Mode Tabs - Matching Persona Switcher Hardware Aesthetics */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#070b10]/80 border border-[#1e2d42] shadow-inner gap-0.5 select-none shrink-0">
            <button
              onClick={() => {
                setViewMode('landing');
                stopActiveAudio();
              }}
              title="Musician Hub Landing & Overview"
              className={`group relative h-7 px-2 sm:px-3 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'landing'
                  ? 'aqua-gloss aqua-theme text-white shadow-sm ring-1 ring-sky-400/40 z-10'
                  : 'aqua-gloss aqua-dark text-slate-400 hover:text-white hover:border-sky-500/30'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Hub</span>
            </button>

            <button
              onClick={() => {
                setViewMode('feed');
                stopActiveAudio();
              }}
              title="Social timeline feed for all musicians"
              className={`group relative h-7 px-2 sm:px-3 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'feed'
                  ? 'aqua-gloss aqua-theme text-white shadow-sm ring-1 ring-sky-400/40 z-10'
                  : 'aqua-gloss aqua-dark text-slate-400 hover:text-white hover:border-sky-500/30'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>Feed</span>
            </button>

            <button
              onClick={() => {
                if (authProfile?.username) {
                  setActiveUsername(authProfile.username);
                  setViewMode('portfolio');
                } else if (currentUser) {
                  onOpenEditProfile();
                } else {
                  onOpenAuth?.();
                }
                stopActiveAudio();
              }}
              title="Your Artist Profile & Discography"
              className={`group relative h-7 px-2 sm:px-3 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'portfolio'
                  ? 'aqua-gloss aqua-theme text-white shadow-sm ring-1 ring-sky-400/40 z-10'
                  : 'aqua-gloss aqua-dark text-slate-400 hover:text-white hover:border-sky-500/30'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Profile</span>
            </button>
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={onBackToStudio}
            className="flex items-center justify-center w-7 h-7 rounded-md aqua-gloss aqua-dark border border-[#1e2d42] text-slate-300 hover:text-white transition-all cursor-pointer active:scale-90 shadow-sm shrink-0"
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 w-full max-w-full"
      >
        <AnimatePresence mode="wait">
        {/* =========================================================================
            MODE 1: MUSICIAN HUB (LANDING PAGE)
            ========================================================================= */}
        {viewMode === 'landing' && (
          <motion.div
            key="musician-landing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10"
          >
            {/* Hero Banner with Right-to-Left Fade-out & authentic artwork (Zooms and glides down from top) */}
            <motion.section 
              initial={{ y: -50, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
              className="relative rounded-3xl overflow-hidden bg-[#0c131f]/75 border border-slate-700/80 hover:border-sky-500/40 backdrop-blur-md p-6 sm:p-10 shadow-2xl transition-colors duration-300"
            >
              {/* Background MusicHub Graphic with Right-to-Left Fade-out */}
              <div
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.15) 32%, rgba(0,0,0,0.7) 60%, black 90%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 18%, rgba(0,0,0,0.15) 32%, rgba(0,0,0,0.7) 60%, black 90%)',
                }}
              >
                <img
                  src="/MusicHubBackground.jpg"
                  alt="Musician Hub Background"
                  className="w-full h-full object-cover object-right opacity-75 sm:opacity-90"
                />
              </div>

              {/* Gradient overlays for seamless text readability and edge integration */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0e1726]/90 via-[#0e1726]/75 sm:via-[#0e1726]/40 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05080e]/90 via-transparent to-transparent pointer-events-none" />

              <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-mono font-semibold mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>SYN-TRACKER MUSICIAN HUB</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Where Chiptune Composers &amp; Demoscene Musicians Connect
                </h1>

                <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                  Discover authentic retro tracker music crafted on Commodore Amiga, Commodore 64 SID, 
                  Game Boy, Sega Mega Drive, and NES hardware. Stream YouTube music videos, tune in to Community Radio, 
                  and upvote the greatest compositions.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setViewMode('feed');
                      setSelectedSort('newest');
                      setSelectedSystemFilter('all');
                      stopActiveAudio();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-sky-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    <span>Open Feed</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleRadio}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-xl transition-all cursor-pointer active:scale-95 flex items-center gap-2 ${
                      isCommunityRadioActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-amber-500/20'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-600/20'
                    }`}
                    title={isCommunityRadioActive ? 'Stop Radio' : 'Start Community Radio'}
                  >
                    <Radio className={`w-4 h-4 shrink-0 ${isCommunityRadioActive ? 'text-amber-400' : 'text-slate-950'}`} />
                    <span>{isCommunityRadioActive ? 'Radio Live' : 'Community Radio'}</span>
                  </button>

                  {onOpenPublishTrack && (
                    <button
                      onClick={() => onOpenPublishTrack()}
                      className="px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-200 hover:text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-sky-400" />
                      <span>Publish Track</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (authProfile) {
                        setActiveUsername(authProfile.username);
                        setViewMode('portfolio');
                      } else {
                        onOpenEditProfile();
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-200 hover:text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <User className="w-4 h-4 text-sky-400" />
                    <span>{authProfile ? 'My Portfolio' : 'Claim Your Handle'}</span>
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Feature Showcase: Syntracker Community Radio */}
            <motion.section
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0d1525] via-[#101b2f] to-[#141824] border border-amber-500/30 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <Radio className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Syntracker Community Radio
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      AUDIO ONLY • RANDOM SHUFFLE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Endless community retro stream: Plays chiptune and tracker music on continuous random shuffle as pure audio without video distraction. A discreet floating card remains at the bottom-left as you browse and compose.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleRadio}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2 shrink-0 ${
                  isCommunityRadioActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>{isCommunityRadioActive ? 'Stop Radio' : 'Start Radio'}</span>
              </button>
            </motion.section>

            {/* "How to Participate in the Hub" in 3 Steps (Staggered directional entry) */}
            <section className="space-y-4">
              <motion.div 
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1], delay: 0.10 }}
                className="flex items-center gap-2"
              >
                <Compass className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  How to Participate in the Hub
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Slides in from left */}
                <motion.div 
                  initial={{ x: -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.13 }}
                  className="p-5 sm:p-6 rounded-2xl bg-[#0c131f]/75 hover:bg-[#0c131f]/90 border border-slate-700/80 hover:border-sky-500/50 backdrop-blur-md transition-all duration-300 shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 backdrop-blur-sm flex items-center justify-center text-sky-400 mb-3 group-hover:scale-105 transition-transform">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      1. Stream, Listen &amp; Vote
                    </h3>
                    <p className="text-xs text-slate-300/80 leading-relaxed">
                      Listen to community tracks and YouTube music videos directly in the hub. Upvote your favorite tracks or downvote to curate top charts.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setSelectedSort('top_voted');
                        setViewMode('feed');
                      }}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore top tracks</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>

                {/* Card 2: Flies up from bottom */}
                <motion.div 
                  initial={{ y: 60, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
                  className="p-5 sm:p-6 rounded-2xl bg-[#0c131f]/75 hover:bg-[#0c131f]/90 border border-slate-700/80 hover:border-sky-500/50 backdrop-blur-md transition-all duration-300 shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-sm flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      2. Claim Your Artist Profile
                    </h3>
                    <p className="text-xs text-slate-300/80 leading-relaxed">
                      Register your unique @username handle, showcase your artist bio, custom avatar, banner, and personal website links.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        if (authProfile) {
                          setActiveUsername(authProfile.username);
                          setViewMode('portfolio');
                        } else {
                          onOpenEditProfile();
                        }
                      }}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{authProfile ? 'View your profile' : 'Claim handle now'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>

                {/* Card 3: Slides in from right */}
                <motion.div 
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.19 }}
                  className="p-5 sm:p-6 rounded-2xl bg-[#0c131f]/75 hover:bg-[#0c131f]/90 border border-slate-700/80 hover:border-sky-500/50 backdrop-blur-md transition-all duration-300 shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 backdrop-blur-sm flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                      <Disc className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      3. Share With CD Covers &amp; YouTube Videos
                    </h3>
                    <p className="text-xs text-slate-300/80 leading-relaxed">
                      Publish your music videos with custom CD covers. Every track in your Musician Hub is <strong>automatically synced to the Community Feed</strong> – all musicians discover your releases with zero double-posting!
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => onOpenPublishTrack && onOpenPublishTrack()}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Publish a release</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Sound Chips & Hardware Platforms (Flies in from bottom, decelerating) */}
            <motion.section 
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
              transition={{ duration: 0.60, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Explore by Sound System
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">6 Hardware Platforms</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'amiga',
                    name: 'Commodore Amiga',
                    chip: 'MOS 8364 Paula (4-8 Ch)',
                    desc: 'Authentic 8-bit DMA sound, 4.4 kHz filter with LED curve, ST-01..ST-115 sound libraries.',
                    imageSrc: '/Icon_A500.png',
                  },
                  {
                    id: 'c64',
                    name: 'Commodore 64',
                    chip: 'MOS 6581 / 8580 SID (3 Voices)',
                    desc: 'Pulse width modulation, resonant multimode analog filter, ring mod, fast arpeggios.',
                    imageSrc: '/C64.png',
                  },
                  {
                    id: 'gameboy',
                    name: 'Nintendo Game Boy',
                    chip: 'Sharp LR35902 DMG (4 Ch)',
                    desc: 'Dual pulse sweep generators, 4-bit Wave RAM wavetable synth, pseudo-random noise.',
                    imageSrc: '/GB.png',
                  },
                  {
                    id: 'megadrive',
                    name: 'Sega Mega Drive',
                    chip: 'Yamaha YM2612 + PSG (4 FM)',
                    desc: '4-operator FM synthesis, 8 routing algorithms, crunchy Genesis DAC punch.',
                    imageSrc: '/Megadrive.png',
                  },
                  {
                    id: 'nes',
                    name: 'Nintendo NES',
                    chip: 'Ricoh 2A03 (4 Ch)',
                    desc: 'Raw hardware pulse channels, non-interpolated stepped triangle bass, DPCM delta audio.',
                    imageSrc: '/NES.png',
                  },
                  {
                    id: 'trk',
                    name: 'SYN-Tracker Extended',
                    chip: 'Multi-Engine Polyphonic (16 Trk)',
                    desc: 'Complete tracker arrangement suite with 16 tracks, 31 instrument slots, master DSP racks.',
                    imageSrc: '/Icon_TRK.png',
                  },
                ].map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => {
                      setSelectedSystemFilter(sys.id);
                      setViewMode('feed');
                    }}
                    className="p-4 rounded-2xl bg-[#0c131f]/75 hover:bg-[#0c131f]/95 border border-slate-700/80 hover:border-sky-500/60 backdrop-blur-md transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-lg hover:shadow-sky-500/10 active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:border-sky-400/40 transition-all">
                      <img
                        src={sys.imageSrc}
                        alt={sys.name}
                        className="max-w-full max-h-full object-contain filter drop-shadow"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                        {sys.name}
                      </div>
                      <div className="text-[11px] font-mono text-sky-400/90 mt-0.5">
                        {sys.chip}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {sys.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Direct Call to Action to enter Timeline (Bouncing in smoothly) */}
            <motion.section 
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.54, ease: [0.16, 1, 0.3, 1], delay: 0.26 }}
              className="pt-4 pb-8 flex flex-col items-center justify-center text-center"
            >
              <button
                onClick={() => {
                  setSelectedSort('newest');
                  setSelectedSystemFilter('all');
                  setViewMode('feed');
                }}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-600/25 transition-all cursor-pointer inline-flex items-center gap-2.5 active:scale-95 hover:scale-[1.02]"
              >
                <Radio className="w-4 h-4" />
                <span>Enter Community Feed</span>
              </button>
            </motion.section>
          </motion.div>
        )}

        {/* =========================================================================
            MODE 2: COMMUNITY FEED (DEDICATED SOCIAL MEDIA STREAM)
            ========================================================================= */}
        {viewMode === 'feed' && (
          <motion.div 
            key="community-feed-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-6 overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start w-full max-w-full">
              {/* -------------------------------------------------------------
                  LEFT SIDEBAR: NAVIGATION & USER ACTIONS
                  ------------------------------------------------------------- */}
              <motion.aside 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex flex-col lg:w-56 xl:w-64 shrink-0 gap-3 sm:gap-4"
              >
                {/* User Identity Snippet - Exactly h-[68px] to align perfectly with Center Composer and Right Search */}
                <div 
                  onClick={() => {
                    if (authProfile) {
                      setActiveUsername(authProfile.username);
                      setViewMode('portfolio');
                    } else {
                      onOpenEditProfile();
                    }
                  }}
                  className="h-[68px] px-3.5 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 hover:border-sky-500/50 backdrop-blur-md shadow-xl flex items-center gap-3 cursor-pointer group transition-all shrink-0"
                  title={authProfile ? 'View your Musician Portfolio' : 'Claim your handle'}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {authProfile?.avatarUrl ? (
                        <img
                          src={authProfile.avatarUrl}
                          alt={authProfile.username}
                          className="w-11 h-11 rounded-full object-cover shrink-0 select-none shadow-md group-hover:ring-2 group-hover:ring-sky-400/50 transition-all"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-sky-400 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      {authProfile?.isSupporter && (
                        <div 
                          className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#1c1404] border border-amber-400 shadow-md flex items-center justify-center"
                          title={authProfile.supporterTier === 'supporter' ? 'Community Supporter' : 'Gold VIP Supporter'}
                        >
                          {authProfile.supporterTier === 'supporter' ? (
                            <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                          ) : (
                            <Award className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-sm" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs sm:text-sm truncate leading-tight group-hover:text-sky-300 transition-colors">
                        {authProfile ? authProfile.displayName || authProfile.username : 'Guest Musician'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {authProfile ? `@${authProfile.username}` : 'Claim handle'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Navigation Links */}
                <nav className="p-2 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (authProfile) {
                        setActiveUsername(authProfile.username);
                        setViewMode('portfolio');
                      } else {
                        onOpenEditProfile();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  >
                    <User className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{authProfile ? 'My Hub' : 'Set Up Profile'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSort('newest');
                      setSelectedSystemFilter('all');
                      setSearchQuery('');
                      setViewMode('feed');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'feed' && selectedSort === 'newest' && selectedSystemFilter === 'all' && !searchQuery
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Home className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Feed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSort('top_voted')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSort === 'top_voted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Top Voted Tracks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSort('most_played')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSort === 'most_played'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Headphones className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Most Played</span>
                  </button>

                  {/* Community Radio */}
                  <button
                    type="button"
                    onClick={handleToggleRadio}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCommunityRadioActive
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                    title={isCommunityRadioActive ? 'Stop Community Radio' : 'Start Community Radio'}
                  >
                    <Radio className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{isCommunityRadioActive ? 'Radio Live' : 'Community Radio'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onBackToStudio}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Back to Tracker</span>
                  </button>
                </nav>

                {/* Streamlined Post Track Button */}
                {onOpenPublishTrack && (
                  <button
                    type="button"
                    onClick={() => onOpenPublishTrack()}
                    className="w-full h-9 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-sky-950/40 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                    title="Publish a track to the feed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Post Track</span>
                  </button>
                )}
              </motion.aside>

              {/* -------------------------------------------------------------
                  CENTER COLUMN: TIMELINE STREAM
                  ------------------------------------------------------------- */}
              <motion.main 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 min-w-0 w-full max-w-full flex flex-col gap-3 sm:gap-4 overflow-hidden"
              >
                {/* Mobile-only Header Elements (Identity, Mobile Search, Mobile Filters) */}
                <div className="lg:hidden flex flex-col gap-3 sm:gap-4 w-full">
                  {/* Mobile Identity & Actions Bar (Mobile only, optimized so name & badges have ample space) */}
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center justify-between gap-2 sm:gap-3 w-full max-w-full overflow-hidden">
                  <div
                    onClick={() => {
                      if (authProfile) {
                        setActiveUsername(authProfile.username);
                        setViewMode('portfolio');
                      } else {
                        onOpenEditProfile();
                      }
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                    title={authProfile ? 'View your Musician Portfolio' : 'Set up your profile'}
                  >
                    <div className="relative shrink-0">
                      {authProfile?.avatarUrl ? (
                        <img
                          src={authProfile.avatarUrl}
                          alt={authProfile.username}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shrink-0 select-none shadow-md border border-slate-700/60"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      {authProfile?.isSupporter && (
                        <div 
                          className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#1c1404] border border-amber-400 shadow-md flex items-center justify-center"
                          title={authProfile.supporterTier === 'supporter' ? 'Community Supporter' : 'Gold VIP Supporter'}
                        >
                          {authProfile.supporterTier === 'supporter' ? (
                            <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                          ) : (
                            <Award className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-sm" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Name with ample width and no cut-off */}
                      <div className="font-bold text-white text-xs xs:text-sm sm:text-base leading-snug group-hover:text-sky-300 transition-colors break-words">
                        {authProfile ? (authProfile.displayName || authProfile.username) : 'Guest Musician'}
                      </div>

                      {/* Handle on second line */}
                      {authProfile?.username && (
                        <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          @{authProfile.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Stacked vertically on mobile so the name has maximum horizontal space */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {onOpenPublishTrack && (
                      <button
                        type="button"
                        onClick={() => onOpenPublishTrack()}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-[11px] font-semibold shadow-md shadow-sky-600/30 transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                        title="Publish a track"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Post</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (authProfile) {
                          setActiveUsername(authProfile.username);
                          setViewMode('portfolio');
                        } else {
                          onOpenEditProfile();
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
                      title={authProfile ? 'View Musician Hub' : 'Sign In'}
                    >
                      <User className="w-3 h-3 text-sky-400" />
                      <span>{authProfile ? 'Hub' : 'Sign In'}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Search & Quick Sort Row (Mobile only) */}
                <div className="lg:hidden space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tracks, @handles..."
                      className="w-full bg-[#0c131f]/85 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Mobile Sort Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSort('newest');
                        if (selectedSystemFilter === 'video') setSelectedSystemFilter('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        selectedSort === 'newest' && selectedSystemFilter !== 'video'
                          ? 'bg-sky-500/25 text-sky-300 border border-sky-400/50'
                          : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span className="hidden sm:inline">Newest</span>
                      <span className="sm:hidden">New</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSort('top_voted');
                        if (selectedSystemFilter === 'video') setSelectedSystemFilter('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        selectedSort === 'top_voted' && selectedSystemFilter !== 'video'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                          : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Top Voted</span>
                      <span className="sm:hidden">Top</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSort('most_played');
                        if (selectedSystemFilter === 'video') setSelectedSystemFilter('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                        selectedSort === 'most_played' && selectedSystemFilter !== 'video'
                          ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50'
                          : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Headphones className="w-3 h-3 text-indigo-400" />
                      <span className="hidden sm:inline">Most Played</span>
                      <span className="sm:hidden">Played</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleRadio}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCommunityRadioActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800'
                      }`}
                      title={isCommunityRadioActive ? 'Stop Radio' : 'Start Community Radio'}
                    >
                      <Radio className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">{isCommunityRadioActive ? 'Radio Live' : 'Radio'}</span>
                      <span className="sm:hidden">{isCommunityRadioActive ? 'Live' : 'Radio'}</span>
                    </button>
                  </div>
                </div>
                {/* Horizontal Feeds / System Filter Bar (Visible only on mobile/small screens, hidden on desktop since the right sidebar contains Popular Sound Chips) */}
                <div className="lg:hidden p-1.5 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center gap-1 overflow-x-auto no-scrollbar w-full max-w-full">
                  {[
                    { id: 'all', label: 'All Releases', mobile: 'All' },
                    { id: 'amiga', label: 'Amiga Paula', mobile: 'Amiga', icon: '/Icon_A500.png' },
                    { id: 'c64', label: 'C64 SID', mobile: 'C64', icon: '/C64.png' },
                    { id: 'gameboy', label: 'Game Boy DMG', mobile: 'Game Boy', icon: '/GB.png' },
                    { id: 'megadrive', label: 'Mega Drive YM', mobile: 'Mega Drive', icon: '/Megadrive.png' },
                    { id: 'nes', label: 'NES 2A03', mobile: 'NES', icon: '/NES.png' },
                    { id: 'trk', label: 'SYN-Tracker', mobile: 'Tracker', icon: '/Icon_TRK.png' },
                  ].map((filter) => {
                    const isActive = selectedSystemFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setSelectedSystemFilter(filter.id)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                          isActive
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                        }`}
                      >
                        {filter.icon ? (
                          <img
                            src={filter.icon}
                            alt=""
                            className="w-3.5 h-3.5 object-contain shrink-0 filter drop-shadow select-none"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Hash className="w-3 h-3 opacity-60 shrink-0" />
                        )}
                        <span className="hidden sm:inline">{filter.label}</span>
                        <span className="sm:hidden">{filter.mobile}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

                {/* Quick Composer Bar - Exactly h-[68px] to align perfectly with Left Profile and Right Search */}
                <div className="h-[68px] px-3.5 sm:px-4 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center w-full max-w-full overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenPublishTrack && onOpenPublishTrack()}
                    className="w-full flex-1 min-w-0 text-left px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 hover:border-sky-500/50 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer flex items-center justify-between group shadow-inner"
                  >
                    <span className="truncate text-xs text-slate-300">Share a track, notes, or release...</span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 group-hover:bg-sky-500 text-sky-300 group-hover:text-white text-xs font-bold transition-all shrink-0 ml-2">
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </span>
                  </button>
                </div>

                {/* Active Filter indicator on desktop if a specific sound chip / system is filtered */}
                {selectedSystemFilter !== 'all' && (
                  <div className="hidden lg:flex p-2.5 px-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-xs text-sky-200 items-center justify-between">
                    <span className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400">Filtered:</span>
                      <strong className="text-sky-300 font-sans font-semibold">
                        {SYSTEM_NAMES[selectedSystemFilter] || (selectedSystemFilter === 'video' ? 'Visualizers' : selectedSystemFilter.toUpperCase())}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSystemFilter('all')}
                      className="text-xs text-sky-400 hover:text-white font-mono font-bold cursor-pointer hover:underline"
                    >
                      Reset Filter ✕
                    </button>
                  </div>
                )}

                {/* Active Search / Filter Pill */}
                {searchQuery && (
                  <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-500/40 text-xs text-sky-200 flex items-center justify-between">
                    <span>Showing results for &quot;{searchQuery}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-sky-400 hover:text-white font-bold cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>
                )}

                {/* Tracks Feed Stream */}
                {hubLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-mono">Loading Musician Hub releases...</p>
                  </div>
                ) : filteredHubTracks.length > 0 ? (
                  <div className="space-y-4">
                    {filteredHubTracks.map((track) => renderTrackCard(track, true))}
                  </div>
                ) : (
                  <div className="py-16 text-center rounded-2xl bg-[#0c131f]/75 backdrop-blur-md border border-dashed border-slate-700/80 p-8 shadow-xl">
                    <Disc className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                    <h4 className="text-sm font-bold text-slate-300">No tracks found</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery || selectedSystemFilter !== 'all'
                        ? 'Try clearing filters or searching for something else.'
                        : 'Be the first musician to publish a retro track to the Musician Hub!'}
                    </p>
                    {onOpenPublishTrack && (
                      <button
                        onClick={() => onOpenPublishTrack()}
                        className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Publish Your First Track
                      </button>
                    )}
                  </div>
                )}
              </motion.main>

              {/* -------------------------------------------------------------
                  RIGHT SIDEBAR: SEARCH, SOUND CHIPS & TOP CREATORS
                  ------------------------------------------------------------- */}
              <motion.aside 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="w-72 xl:w-80 shrink-0 hidden lg:flex flex-col gap-3 sm:gap-4"
              >
                {/* Search Bar - Exactly h-[68px] to align perfectly with Left Profile and Center Composer */}
                <div className="h-[68px] px-3.5 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center shrink-0">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tracks, @handles, notes..."
                      className="w-full bg-[#060a12]/80 backdrop-blur-sm border border-slate-700/80 focus:border-sky-400 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Popular Sound Chips / Systems */}
                <div className="p-4 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-sky-400" />
                      <span>Popular Sound Chips</span>
                    </h3>
                    {selectedSystemFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedSystemFilter('all')}
                        className="text-[10px] font-mono text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {[
                      {
                        id: 'amiga',
                        name: 'Commodore Amiga',
                        chip: 'MOS 8364 Paula',
                        imageSrc: '/Icon_A500.png',
                      },
                      {
                        id: 'c64',
                        name: 'Commodore 64',
                        chip: 'MOS 6581 / 8580 SID',
                        imageSrc: '/C64.png',
                      },
                      {
                        id: 'gameboy',
                        name: 'Nintendo Game Boy',
                        chip: 'Sharp LR35902 DMG',
                        imageSrc: '/GB.png',
                      },
                      {
                        id: 'megadrive',
                        name: 'Sega Mega Drive',
                        chip: 'Yamaha YM2612 + PSG',
                        imageSrc: '/Megadrive.png',
                      },
                      {
                        id: 'nes',
                        name: 'Nintendo NES',
                        chip: 'Ricoh 2A03',
                        imageSrc: '/NES.png',
                      },
                      {
                        id: 'trk',
                        name: 'SYN-Tracker Extended',
                        chip: 'Multi-Engine Polyphonic',
                        imageSrc: '/Icon_TRK.png',
                      },
                    ].map((chip) => {
                      const isSelected = selectedSystemFilter === chip.id;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setSelectedSystemFilter(isSelected ? 'all' : chip.id)}
                          className={`group relative w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-md shadow-sky-950/40'
                              : 'hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent'
                          }`}
                        >
                          {/* Foreground: Hardware Image Badge + Chip details */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700/70 p-1 flex items-center justify-center shrink-0 shadow-inner group-hover:border-sky-500/40 transition-colors">
                              <img
                                src={chip.imageSrc}
                                alt={chip.name}
                                className="max-w-full max-h-full object-contain filter drop-shadow select-none group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors truncate leading-tight">
                                {chip.name}
                              </div>
                              <div className="text-[10px] font-mono text-sky-400/90 truncate mt-0.5">
                                {chip.chip}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="shrink-0">
                              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400 animate-pulse block" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Top Musicians Leaderboard */}
                {topMusicians.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#0c131f]/85 border border-slate-700/80 backdrop-blur-md shadow-xl">
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Top Creators</span>
                    </h3>

                    <div className="space-y-2.5">
                      {topMusicians.map((creator) => (
                        <div
                          key={creator.username}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-800/50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => navigateToMusician(creator.username)}
                            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
                          >
                            <div className="relative shrink-0">
                              {creator.avatar ? (
                                <img
                                  src={creator.avatar}
                                  alt={creator.username}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 select-none shadow-sm"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                              {creator.isSupporter && (
                                <div 
                                  className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#1c1404] border border-amber-400 shadow-md flex items-center justify-center"
                                  title={creator.supporterTier === 'supporter' ? 'Community Supporter' : 'Gold VIP Supporter'}
                                >
                                  {creator.supporterTier === 'supporter' ? (
                                    <Heart className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                                  ) : (
                                    <Award className="w-2.5 h-2.5 text-amber-400 fill-amber-400 drop-shadow-sm" />
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                                {creator.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">
                                @{creator.username}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigateToMusician(creator.username)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Notes */}
                <div className="p-3 text-[11px] text-slate-500 leading-relaxed font-mono">
                  <div>SYN-Tracker · Timeless Musician Stream</div>
                  <div className="mt-1">Commodore Amiga · SID · Game Boy · FM</div>
                </div>
              </motion.aside>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            MODE 2: MUSICIAN PORTFOLIO (ARTIST VIEW)
            ========================================================================= */}
        {viewMode === 'portfolio' && (
          <motion.div 
            key="musician-portfolio-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6"
          >
            {portfolioLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono">Loading Musician Portfolio...</p>
              </div>
            ) : profile ? (
              <>
                {/* Artist Profile Card (Slides down from top with deceleration) */}
                <motion.div 
                  initial={{ y: -45, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -35, opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
                  transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
                  className="relative rounded-3xl overflow-hidden bg-[#0c131f]/75 border border-slate-700/80 backdrop-blur-md shadow-2xl group transition-all duration-300"
                >
                  {/* Top-Right Action Icons: YouTube & Link/Website */}
                  <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
                    {(profile.youtubeChannel || profile.youtubeUrl) && (
                      <a
                        href={formatExternalUrl(profile.youtubeChannel || profile.youtubeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-slate-900/85 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/60 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center justify-center group"
                        title="YouTube Channel"
                      >
                        <Youtube className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                      </a>
                    )}

                    {(profile.website || profile.bandcampUrl) && (
                      <a
                        href={formatExternalUrl(profile.website || profile.bandcampUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-slate-900/85 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-slate-700/80 hover:border-sky-500/60 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center justify-center group"
                        title="Website / Link"
                      >
                        <Link2 className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                      </a>
                    )}

                    {profile.soundCloudUrl && (
                      <a
                        href={formatExternalUrl(profile.soundCloudUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-slate-900/85 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/60 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center justify-center group"
                        title="SoundCloud"
                      >
                        <Radio className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      </a>
                    )}
                  </div>

                  {/* Banner background graphic (Right-to-Left fade) - scrolls with page, no mouse tracking */}
                  <div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    style={{
                      maskImage: 'linear-gradient(to right, transparent 0%, transparent 16%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 60%, black 90%)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 16%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 60%, black 90%)',
                    }}
                  >
                    <img
                      src={profile.bannerUrl || '/synth_profile_banner.jpg'}
                      alt="Profile Banner"
                      className="w-full h-full object-cover object-right opacity-75 sm:opacity-85 select-none"
                    />
                  </div>

                  {/* Ambient gradient overlay for seamless contrast and text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0c131f]/95 via-[#0c131f]/75 sm:via-[#0c131f]/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c131f]/90 via-transparent to-transparent pointer-events-none" />

                  {/* Main Header Content: Avatar, Name, Handle */}
                  <div className="p-6 sm:p-8 flex items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                      {/* Avatar with rounded corners matching the design */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900 border-2 border-slate-700/80 shadow-2xl relative shrink-0">
                        <div className="w-full h-full rounded-2xl overflow-hidden">
                          {profile.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={profile.displayName || profile.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <User className="w-12 h-12" />
                            </div>
                          )}
                        </div>
                        {profile.isSupporter && (
                          <div 
                            className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-[#1c1404] border border-amber-400 shadow-md flex items-center justify-center"
                            title={profile.supporterTier === 'supporter' ? 'Community Supporter' : 'Gold VIP Supporter'}
                          >
                            {profile.supporterTier === 'supporter' ? (
                              <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                            ) : (
                              <Award className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-sm" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Name & Handle */}
                      <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                          {profile.displayName || profile.username}
                        </h1>
                        <p className="text-sm text-sky-400 font-mono font-semibold">
                          @{profile.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bio (if present) */}
                  {profile.bio && (
                    <div className="px-6 sm:px-8 pb-4 relative z-10">
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-w-3xl">
                        {renderLinkifiedText(profile.bio)}
                      </p>
                    </div>
                  )}

                  {/* Bottom Bar: Action Icons (First EDIT then SHARE) */}
                  <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 border-t border-slate-800/80 bg-slate-950/50 backdrop-blur-sm flex items-center justify-end text-xs font-medium relative z-10">
                    <div className="flex items-center gap-2">
                      {isSelf && (
                        <button
                          type="button"
                          onClick={onOpenEditProfile}
                          title="Edit Profile"
                          className="w-9 h-9 rounded-xl text-white hover:text-white/80 hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-white/20 hover:border-white/40 shadow-sm"
                        >
                          <Edit3 className="w-4 h-4 text-white" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSharePortfolio}
                        title={copiedShare ? 'Link copied to clipboard!' : 'Share Portfolio'}
                        className="w-9 h-9 rounded-xl text-white hover:text-white/80 hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-white/20 hover:border-white/40 shadow-sm"
                      >
                        {copiedShare ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Tracks / Albums Portfolio Section (Glides up from bottom with deceleration) */}
                <motion.div 
                  initial={{ y: 55, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 40, opacity: 0, transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] } }}
                  transition={{ duration: 0.60, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
                  className="space-y-4"
                >
                  {selectedAlbumKey === null ? (
                    // ALL ALBUMS VIEW
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Disc className="w-5 h-5 text-sky-400" />
                            <span className="hidden sm:inline">Albums &amp; Discography ({albumGroups.length})</span>
                            <span className="sm:hidden">Albums ({albumGroups.length})</span>
                          </h2>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="hidden sm:inline">Click on any album to explore its individual tracks, music videos, and song covers.</span>
                            <span className="sm:hidden">Tap album to view tracks &amp; covers.</span>
                          </p>
                        </div>

                        {isSelf && onOpenPublishTrack && (
                          <button
                            onClick={() => onOpenPublishTrack()}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Publish Track / Album</span>
                            <span className="sm:hidden">+ Track</span>
                          </button>
                        )}
                      </div>

                      {albumGroups.length > 0 ? (
                        <div className="space-y-4">
                          {albumGroups.map(renderAlbumCard)}
                        </div>
                      ) : (
                        <div className="py-16 text-center rounded-2xl bg-[#0c131f]/75 backdrop-blur-md border border-dashed border-slate-700/80 p-8 shadow-xl">
                          <Disc className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                          <h4 className="text-sm font-bold text-slate-300">No tracks or albums published yet</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            {isSelf
                              ? 'You haven\'t published any tracks yet. Click the button below to share your first retro composition with the Musician Hub!'
                              : 'This musician hasn\'t published any tracks to the community yet.'}
                          </p>
                          {isSelf && onOpenPublishTrack && (
                            <button
                              onClick={() => onOpenPublishTrack()}
                              className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              Publish Track Now
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    // SELECTED ALBUM DETAIL VIEW
                    (() => {
                      const currentAlbum = albumGroups.find((g) => g.id === selectedAlbumKey);
                      if (!currentAlbum) {
                        return (
                          <div className="p-8 text-center bg-[#0c131f]/80 rounded-2xl border border-slate-700">
                            <p className="text-sm text-slate-300">Album not found.</p>
                            <button
                              onClick={() => setSelectedAlbumKey(null)}
                              className="mt-3 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-bold"
                            >
                              Back to Discography
                            </button>
                          </div>
                        );
                      }

                      const coverImage = currentAlbum.coverArt || currentAlbum.tracks[0]?.coverArt;

                      return (
                        <div className="space-y-5">
                          {/* Back Button */}
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedAlbumKey(null)}
                              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c131f]/80 hover:bg-slate-800 border border-slate-700/80 text-sky-400 hover:text-sky-300 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-md"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              <span className="hidden sm:inline">Back to All Albums</span>
                              <span className="sm:hidden">All Albums</span>
                            </button>

                            {isSelf && onOpenPublishTrack && (
                              <button
                                onClick={() =>
                                  onOpenPublishTrack({
                                    albumTitle: currentAlbum.isSingleCollection ? undefined : currentAlbum.title,
                                    albumCover: currentAlbum.coverArt,
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Add Track to this Album</span>
                                <span className="sm:hidden">+ Track</span>
                              </button>
                            )}
                          </div>

                          {/* Album Spotlight Banner Card */}
                          <div className="rounded-2xl bg-[#0c131f]/90 border border-sky-500/30 backdrop-blur-md p-6 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                              {/* Album CD Jewel Case */}
                              <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-2xl overflow-hidden bg-slate-950 border border-slate-600/80 shadow-2xl">
                                {coverImage ? (
                                  <>
                                    <img
                                      src={coverImage}
                                      alt={currentAlbum.title}
                                      className="w-full h-full object-cover select-none"
                                    />
                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/50 via-transparent to-white/20" />
                                    <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-r from-black/80 to-transparent border-r border-white/20" />
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-slate-900 to-slate-950">
                                    <Disc className="w-12 h-12 text-sky-400 mb-2" />
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                                      Album Cover
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Album details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/40">
                                    {currentAlbum.isSingleCollection ? 'COLLECTION' : 'ALBUM'}
                                  </span>
                                  <span className="text-xs font-mono text-slate-400">
                                    {currentAlbum.tracks.length} {currentAlbum.tracks.length === 1 ? 'Track' : 'Tracks'}
                                  </span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-xs font-mono text-emerald-400 font-bold">
                                    Score: {currentAlbum.totalScore > 0 ? `+${currentAlbum.totalScore}` : currentAlbum.totalScore}
                                  </span>
                                </div>

                                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                                  {currentAlbum.title}
                                </h2>

                                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                                  By <span className="text-sky-400 font-semibold">@{profile.username}</span>
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleStartJukebox({
                                        title: currentAlbum.title,
                                        coverArt: currentAlbum.coverArt,
                                        tracks: currentAlbum.tracks
                                      }, 0);
                                    }}
                                    className="h-8.5 px-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-semibold transition-all shadow-md shadow-amber-950/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  >
                                    <Disc className="w-3.5 h-3.5 text-white" />
                                    <span className="hidden sm:inline">Play Album Jukebox</span>
                                    <span className="sm:hidden">Play Album</span>
                                  </button>

                                  {isSelf && !currentAlbum.isSingleCollection && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAlbumBeingEdited({
                                          oldTitle: currentAlbum.title,
                                          title: currentAlbum.title,
                                          coverArt: currentAlbum.coverArt,
                                        })
                                      }
                                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5 shadow"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                                      <span className="hidden sm:inline">Edit Album Cover &amp; Title</span>
                                      <span className="sm:hidden">Edit</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Individual Tracks with song-specific covers and visualizers */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pt-2">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <Music className="w-4 h-4 text-sky-400" />
                                <span>Tracklist ({currentAlbum.tracks.length})</span>
                              </h3>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Each track has its own individual cover and visualizer
                              </span>
                            </div>

                            <div className="space-y-4">
                              {currentAlbum.tracks.map((track) => renderTrackCard(track, false))}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </motion.div>
              </>
            ) : isSelf && !authProfile ? (
              <div className="py-20 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-4 shadow-inner">
                  <User className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Your Musician Hub</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Claim your artist handle, organize albums, and showcase your retro chiptunes and tracker tracks in one personal portfolio.
                </p>
                <button
                  onClick={() => {
                    if (currentUser) {
                      onOpenEditProfile();
                    } else {
                      onOpenAuth?.();
                    }
                  }}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-sky-600/30 active:scale-95"
                >
                  {currentUser ? 'Set Up Profile' : 'Sign In / Register'}
                </button>
              </div>
            ) : (
              <div className="py-20 text-center">
                <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">Musician Not Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Could not load profile for @{activeUsername}.
                </p>
                <button
                  onClick={() => setViewMode('feed')}
                  className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Go to Feed
                </button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Edit Track Modal */}
      {editingTrack && (
        <EditTrackModal
          isOpen={Boolean(editingTrack)}
          onClose={() => setEditingTrack(null)}
          track={editingTrack}
          song={song}
          onSuccess={handleTrackUpdated}
          onOpenCoverDesigner={onOpenCoverDesigner}
        />
      )}

      {/* Edit Album Details & Cover Modal */}
      {albumBeingEdited && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#0c131f] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <Disc className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Edit Album Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setAlbumBeingEdited(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {albumUpdateError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  {albumUpdateError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Album Title
                </label>
                <input
                  type="text"
                  value={albumBeingEdited.title}
                  onChange={(e) =>
                    setAlbumBeingEdited((prev) => (prev ? { ...prev, title: e.target.value } : null))
                  }
                  placeholder="e.g. Cyber Voyage LP"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Album Cover Artwork
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  This artwork will represent the album in your discography. Individual tracks can still keep their own song-specific covers.
                </p>
                <CdCoverPicker
                  currentCoverUrl={albumBeingEdited.coverArt}
                  onSelectCover={(cover) =>
                    setAlbumBeingEdited((prev) => (prev ? { ...prev, coverArt: cover } : null))
                  }
                  onOpenCoverDesigner={onOpenCoverDesigner}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAlbumBeingEdited(null)}
                disabled={isUpdatingAlbum}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAlbumDetails}
                disabled={isUpdatingAlbum}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdatingAlbum ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Album Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retro Jukebox Bottom Player Dock */}
      {activeJukeboxAlbum && (
        <RetroJukeboxDock
          album={activeJukeboxAlbum}
          currentIndex={jukeboxTrackIndex}
          isPlaying={isJukeboxPlaying}
          onPlayPause={() => setIsJukeboxPlaying(!isJukeboxPlaying)}
          onNext={handleJukeboxNext}
          onPrev={handleJukeboxPrev}
          onSelectTrack={(idx) => {
            setJukeboxTrackIndex(idx);
            setIsJukeboxPlaying(true);
            const track = activeJukeboxAlbum.tracks[idx];
            if (track) {
              incrementTrackPlays(track.id, track.playCount || 0).catch(() => {});
            }
          }}
          onClose={() => {
            setActiveJukeboxAlbum(null);
            setIsJukeboxPlaying(false);
          }}
          isShuffle={isJukeboxShuffle}
          onToggleShuffle={() => setIsJukeboxShuffle(!isJukeboxShuffle)}
          isRepeat={isJukeboxRepeat}
          onToggleRepeat={() => setIsJukeboxRepeat(!isJukeboxRepeat)}
          onTrackEnded={handleJukeboxTrackEnded}
          containerMaxWidth={viewMode === 'landing' ? 'max-w-6xl' : 'max-w-5xl'}
        />
      )}

      {/* Community Radio: Audio-only Random Shuffle Widget bottom-left (fallback when not mounted at App root) */}
      {isCommunityRadioActive && !onToggleCommunityRadio && (
        <CommunityRadioWidget
          tracks={hubTracks}
          onClose={() => setLocalCommunityRadioActive(false)}
        />
      )}
    </div>
  );
};
