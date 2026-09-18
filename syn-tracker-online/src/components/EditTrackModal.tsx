/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Check,
  AlertCircle,
  Youtube,
  Radio,
  Music,
  Disc,
  Info
} from 'lucide-react';
import { PublishedTrack, updatePublishedTrack, extractYouTubeId } from '../lib/firebase';
import { TrackerSong, RetroChipSystem } from '../types';
import { CdCoverPicker } from './CdCoverPicker';

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: PublishedTrack | null;
  song?: TrackerSong | null;
  onSuccess?: (updatedTrack: PublishedTrack) => void;
  onOpenCoverDesigner?: () => void;
}

const SYSTEM_OPTIONS: { id: RetroChipSystem; label: string; icon: string }[] = [
  { id: 'amiga', label: 'Amiga', icon: '/Icon_A500.png' },
  { id: 'c64', label: 'C64 SID', icon: '/C64.png' },
  { id: 'trk', label: 'SYN-Tracker', icon: '/Icon_TRK.png' },
  { id: 'megadrive', label: 'Mega Drive', icon: '/Megadrive.png' },
  { id: 'gameboy', label: 'Game Boy', icon: '/GB.png' },
  { id: 'nes', label: 'NES', icon: '/NES.png' },
];

const SYSTEM_NAMES: Record<string, string> = {
  amiga: 'Commodore Amiga (Paula)',
  c64: 'Commodore 64 (MOS SID)',
  gameboy: 'Nintendo Game Boy (DMG)',
  megadrive: 'Sega Mega Drive (YM2612)',
  nes: 'Nintendo NES (2A03)',
  trk: 'SYN-Tracker Studio',
};

export const EditTrackModal: React.FC<EditTrackModalProps> = ({
  isOpen,
  onClose,
  track,
  song,
  onSuccess,
  onOpenCoverDesigner,
}) => {
  const [title, setTitle] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumCover, setAlbumCover] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<RetroChipSystem>('amiga');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [coverArt, setCoverArt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when track opens
  useEffect(() => {
    if (track && isOpen) {
      setTitle(track.title || '');
      setAlbumTitle(track.albumTitle || '');
      setAlbumCover(track.albumCover || '');
      setTrackNumber(track.trackNumber != null ? String(track.trackNumber) : '');
      setDescription(track.description || '');
      setSelectedSystem((track.system as RetroChipSystem) || 'amiga');
      setYoutubeUrl(track.youtubeUrl || '');
      setCoverArt(track.coverArt || '');
      setError(null);
      setSavedSuccess(false);
    }
  }, [track, isOpen]);

  if (!isOpen || !track) return null;

  const ytId = extractYouTubeId(youtubeUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Track title is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const youtubeVideoId = extractYouTubeId(youtubeUrl) || '';
      const systemName = SYSTEM_NAMES[selectedSystem] || 'SYN-Tracker';

      const updates: Partial<PublishedTrack> = {
        title: title.trim(),
        albumTitle: albumTitle.trim() || undefined,
        albumCover: albumCover || undefined,
        trackNumber: trackNumber ? Number(trackNumber) : undefined,
        description: description.trim(),
        system: selectedSystem,
        systemName,
        youtubeUrl: youtubeUrl.trim(),
        youtubeVideoId,
        coverArt: coverArt || '',
      };

      await updatePublishedTrack(track.id, updates);

      const updatedTrack: PublishedTrack = {
        ...track,
        ...updates,
      };

      setSavedSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(updatedTrack);
        onClose();
        setSavedSuccess(false);
      }, 1000);
    } catch (err: any) {
      console.error('Update track error:', err);
      setError(err.message || 'Failed to update track.');
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
          className="relative w-full max-w-2xl bg-[#0b1017] border border-sky-500/30 rounded-2xl p-6 text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Top Gradient Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Disc className="w-5 h-5 text-sky-400" />
              <span>Edit Published Track</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Update track details, liner notes, and CD cover artwork.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Track updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Track Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title..."
                className="w-full bg-[#101724] border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                required
              />
            </div>

            {/* Album / Release Grouping */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-500/30 space-y-3.5 shadow-lg">
              <div>
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Disc className="w-4 h-4 text-sky-400" />
                  <span>Album &amp; Discography Settings</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assign this song to an album. In your profile discography, only the album is displayed until clicked!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Album / Collection Title
                  </label>
                  <input
                    type="text"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="e.g. My Works, Synth Legends Vol. 1..."
                    className="w-full bg-[#0c131f] border border-slate-700 focus:border-sky-400 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Track # in Album
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full bg-[#0c131f] border border-slate-700 focus:border-sky-400 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
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

            {/* Retro Chip System */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Retro Sound Chip / Target System
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SYSTEM_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedSystem(opt.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedSystem === opt.id
                        ? 'bg-sky-500/20 border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    <img src={opt.icon} alt={opt.label} className="w-6 h-6 object-contain mb-1" />
                    <span className="text-[10px] font-semibold text-slate-200">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Story / Liner Notes (FULL, UNTRUNCATED) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Track Description / Musician Liner Notes
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {description.length} characters
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell listeners the story behind this track, hardware or samples used, inspiration, release year, or shoutouts to the demoscene..."
                rows={4}
                className="w-full bg-[#101724] border border-slate-700 focus:border-sky-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors resize-y leading-relaxed"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Your full description will be visible to listeners in the Hub and in your portfolio without being cut off.
              </p>
            </div>

            {/* CD Cover Art Picker */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <CdCoverPicker
                currentCoverUrl={coverArt}
                song={song}
                onSelectCover={(url) => setCoverArt(url)}
                onOpenCoverDesigner={onOpenCoverDesigner}
                label="Individual Song Cover Artwork (Unique to this individual song)"
              />
            </div>

            {/* YouTube Video URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-rose-400" />
                <span>YouTube Visualizer Video URL</span>
                <span className="text-[10px] text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                className="w-full bg-[#101724] border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
              {ytId && (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <Check className="w-3.5 h-3.5 text-rose-400" />
                  <span>Valid YouTube Video ID: <code className="font-mono text-white">{ytId}</code></span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || savedSuccess}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
