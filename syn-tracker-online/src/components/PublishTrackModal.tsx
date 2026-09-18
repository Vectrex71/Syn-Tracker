/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Youtube, 
  Check, 
  AlertCircle,
  Radio,
  Disc,
  Play
} from 'lucide-react';
import { TrackerSong, RetroChipSystem } from '../types';
import { useAuth } from '../context/AuthContext';
import { publishTrackToHub, extractYouTubeId } from '../lib/firebase';
import { CdCoverPicker } from './CdCoverPicker';

interface PublishTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: TrackerSong | null;
  activeChipSystem?: RetroChipSystem | null;
  onSuccess?: (trackId: string) => void;
  onRequireAuth?: () => void;
  onOpenCoverDesigner?: () => void;
  initialAlbumTitle?: string;
  initialAlbumCover?: string;
}

export type PublishMode = 'visualizer';

const SYSTEM_NAMES: Record<string, string> = {
  amiga: 'Commodore Amiga (Paula)',
  c64: 'Commodore 64 (MOS SID)',
  gameboy: 'Nintendo Game Boy (DMG)',
  megadrive: 'Sega Mega Drive (YM2612)',
  nes: 'Nintendo NES (2A03)',
  trk: 'SYN-Tracker Studio',
};

const SYSTEM_ICONS: Record<string, string> = {
  amiga: '/Icon_A500.png',
  c64: '/C64.png',
  gameboy: '/GB.png',
  megadrive: '/Megadrive.png',
  nes: '/NES.png',
  trk: '/Icon_TRK.png',
};

const SYSTEM_OPTIONS: { id: RetroChipSystem; label: string; icon: string }[] = [
  { id: 'amiga', label: 'Amiga', icon: '/Icon_A500.png' },
  { id: 'c64', label: 'C64 SID', icon: '/C64.png' },
  { id: 'trk', label: 'SYN-Tracker', icon: '/Icon_TRK.png' },
  { id: 'megadrive', label: 'Mega Drive', icon: '/Megadrive.png' },
  { id: 'gameboy', label: 'Game Boy', icon: '/GB.png' },
  { id: 'nes', label: 'NES', icon: '/NES.png' },
];

export const PublishTrackModal: React.FC<PublishTrackModalProps> = ({
  isOpen,
  onClose,
  song,
  activeChipSystem,
  onSuccess,
  onRequireAuth,
  onOpenCoverDesigner,
  initialAlbumTitle,
  initialAlbumCover,
}) => {
  const { currentUser, profile } = useAuth();

  const [selectedSystem, setSelectedSystem] = useState<RetroChipSystem>(
    (activeChipSystem || song?.system || 'amiga') as RetroChipSystem
  );
  const [title, setTitle] = useState(song?.name && song.name !== 'Untitled Retro Track' ? song.name : '');
  const [albumTitle, setAlbumTitle] = useState(initialAlbumTitle || '');
  const [albumCover, setAlbumCover] = useState(initialAlbumCover || '');
  const [songCover, setSongCover] = useState(song?.coverArt || '');
  const [trackNumber, setTrackNumber] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialAlbumTitle !== undefined) setAlbumTitle(initialAlbumTitle);
      if (initialAlbumCover !== undefined) setAlbumCover(initialAlbumCover);
      if (song?.coverArt) setSongCover(song.coverArt);
      if (song?.name && song.name !== 'Untitled Retro Track') setTitle(song.name);
      setError(null);
      setPublishedSuccess(false);
    }
  }, [isOpen, initialAlbumTitle, initialAlbumCover, song]);

  if (!isOpen) return null;

  const currentSys = selectedSystem;
  const sysIcon = SYSTEM_ICONS[currentSys] || '/Icon_TRK.png';
  const sysName = SYSTEM_NAMES[currentSys] || 'SYN-Tracker';

  const ytId = extractYouTubeId(youtubeUrl);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profile) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for your track.');
      return;
    }

    if (!youtubeUrl.trim() || !ytId) {
      setError('Please provide a valid YouTube video URL (e.g. https://youtu.be/... or https://www.youtube.com/watch?v=...).');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const published = await publishTrackToHub({
        authorUid: currentUser.uid,
        authorUsername: profile.username,
        authorName: profile.displayName || profile.username,
        authorAvatarUrl: profile.avatarUrl || '',
        authorIsSupporter: Boolean(profile.isSupporter),
        authorSupporterTier: profile.supporterTier || (profile.isSupporter ? 'vip' : null),
        title: title.trim(),
        albumTitle: albumTitle.trim() || undefined,
        albumCover: albumCover || undefined,
        trackNumber: trackNumber ? Number(trackNumber) : undefined,
        system: currentSys,
        systemName: sysName,
        description: description.trim(),
        format: 'visualizer',
        trackType: 'visualizer',
        youtubeUrl: youtubeUrl.trim(),
        youtubeVideoId: ytId,
        coverArt: songCover || albumCover || song?.coverArt || '',
        isPublic: true,
      });

      setPublishedSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(published.id);
        onClose();
        setPublishedSuccess(false);
      }, 1200);
    } catch (err: any) {
      console.error('Publish error:', err);
      setError(err.message || 'Failed to publish track.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[#0b1017] border border-sky-500/30 rounded-2xl p-6 text-slate-100 shadow-2xl overflow-hidden my-auto"
        >
          {/* Top Gradient Header */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-400" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-2 shadow-inner shrink-0">
              <img 
                src={sysIcon} 
                alt={sysName} 
                className="w-full h-full object-contain filter drop-shadow" 
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Publish Track</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-semibold flex items-center gap-1">
                  <Youtube className="w-3 h-3 text-rose-500" />
                  YouTube Video
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Published to your Musician Hub &amp; automatically to the Community Feed
              </p>
            </div>
          </div>

          {!currentUser ? (
            <div className="text-center py-6 px-4 bg-slate-900/60 rounded-xl border border-slate-800">
              <Radio className="w-10 h-10 text-sky-400 mx-auto mb-3 opacity-90" />
              <h3 className="text-base font-semibold text-white mb-1">
                Musician Account Required
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                Sign in for free to publish tracks to your personal retro portfolio and get shareable links.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onRequireAuth) onRequireAuth();
                }}
                className="py-2.5 px-5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg text-xs shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
              >
                Sign in for free
              </button>
            </div>
          ) : publishedSuccess ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Track successfully published!</h3>
              <p className="text-xs text-slate-400 mt-1">Now live on your public musician portfolio.</p>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-4">
              {/* YouTube-powered notice banner */}
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
                <Youtube className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-white">Direct YouTube Streaming: </span>
                  Embed your music video or rendered visualizer link. All streaming bandwidth is powered by YouTube with instant playback!
                </div>
              </div>

              {/* Generic Form Error */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Track Title */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Track Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Chiptune Hit / Retro Anthem..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* YouTube Video URL input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5 text-rose-500" />
                    <span>YouTube Video Link *</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Video Player</span>
                </div>
                <input
                  type="url"
                  required
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-rose-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                />

                {/* YouTube Preview Card if valid ID parsed */}
                {ytId && (
                  <div className="mt-2 p-2.5 bg-slate-900/80 border border-rose-500/30 rounded-xl flex items-center gap-3">
                    <div className="w-24 aspect-video rounded-lg overflow-hidden bg-black relative shrink-0 shadow">
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt="YouTube Video Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white drop-shadow" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Video detected
                      </span>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">Video ID: {ytId}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Album & Discography Pack */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-sky-500/30 space-y-3 shadow-lg">
                <div>
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Disc className="w-4 h-4 text-sky-400" />
                    <span>Album &amp; Discography Pack (Optional)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pack this song into an album. In your profile discography, only the album is displayed until clicked!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Album / Collection Title
                    </label>
                    <input
                      type="text"
                      value={albumTitle}
                      onChange={(e) => setAlbumTitle(e.target.value)}
                      placeholder="e.g. My Works, Retro Synthwave Vol. 1..."
                      className="w-full bg-[#0c131f] border border-slate-700 focus:border-sky-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Track # in Album
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={trackNumber}
                      onChange={(e) => setTrackNumber(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full bg-[#0c131f] border border-slate-700 focus:border-sky-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Album Cover Art Picker */}
                <div className="pt-2 border-t border-slate-800">
                  <CdCoverPicker
                    currentCoverUrl={albumCover}
                    song={song}
                    onSelectCover={(url) => setAlbumCover(url)}
                    onOpenCoverDesigner={onOpenCoverDesigner}
                    label="Album Cover Artwork (Shown on the Album card in Discography)"
                  />
                </div>
              </div>

              {/* Individual Song Cover Art Picker */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <CdCoverPicker
                  currentCoverUrl={songCover}
                  song={song}
                  onSelectCover={(url) => setSongCover(url)}
                  onOpenCoverDesigner={onOpenCoverDesigner}
                  label="Individual Song Cover Artwork (Unique to this individual song)"
                />
              </div>

              {/* Sound System / Chip Preset selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Sound Chip / Retro System</span>
                  <span className="text-[10px] text-sky-400 font-mono">{sysName}</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SYSTEM_OPTIONS.map((opt) => {
                    const isSelected = selectedSystem === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedSystem(opt.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-sky-400 bg-sky-500/20 shadow-md shadow-sky-500/20 text-white font-bold'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title={opt.label}
                      >
                        <img src={opt.icon} alt={opt.label} className="w-6 h-6 object-contain" />
                        <span className="text-[10px] truncate w-full text-center">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description / Liner Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description / Liner Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Backstory, sound chips used, inspiration, or credits..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              {/* Automatic Community Feed Sync Notice */}
              <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-200">
                <Radio className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Automatic Feed Sync</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      1x Post = Live Everywhere
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Every track appears automatically in your personal <strong>Musician Hub</strong> (portfolio) AND in the shared <strong>Community Feed</strong> for all musicians. No double-posting required!
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-semibold rounded-lg shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Publish Video Track to Portfolio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
