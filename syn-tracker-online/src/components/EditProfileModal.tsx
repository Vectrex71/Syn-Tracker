/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Globe, 
  Youtube, 
  Save, 
  Check, 
  AlertCircle,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { MusicianProfile, uploadMusicianAvatar, uploadMusicianBanner } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MusicianProfile;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const { updateMusicianProfile } = useAuth();
  const [username, setUsername] = useState(profile.username || '');
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [youtubeChannel, setYoutubeChannel] = useState(profile.youtubeChannel || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || '/synth_profile_banner.jpg');
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setError(null);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB (automatically compressed and cropped)
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`Image is ${sizeMb}MB. Please select an image under 10MB.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    try {
      setUploadingAvatar(true);
      setUploadProgress(25);
      const newUrl = await uploadMusicianAvatar(profile.uid, file, (percent) => {
        setUploadProgress(percent);
      });
      setAvatarUrl(newUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process avatar image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerFileProcess = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file for the banner.');
      return;
    }

    try {
      setUploadingBanner(true);
      const newUrl = await uploadMusicianBanner(profile.uid, file);
      setBannerUrl(newUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process banner image.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const cleanUsername = username
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Handle / Username must be at least 3 characters (letters, numbers, _ and -).');
      setSaving(false);
      return;
    }

    try {
      // Clean and normalize website link (remove trailing slashes, ensure protocol)
      let cleanWebsite = website.trim().replace(/\/+$/, '');
      if (cleanWebsite) {
        if (/^http\/+/i.test(cleanWebsite)) {
          cleanWebsite = cleanWebsite.replace(/^http\/+/i, 'http://');
        } else if (/^https\/+/i.test(cleanWebsite)) {
          cleanWebsite = cleanWebsite.replace(/^https\/+/i, 'https://');
        } else if (/^http:\/([^\/])/i.test(cleanWebsite)) {
          cleanWebsite = cleanWebsite.replace(/^http:\/([^\/])/i, 'http://$1');
        } else if (/^https:\/([^\/])/i.test(cleanWebsite)) {
          cleanWebsite = cleanWebsite.replace(/^https:\/([^\/])/i, 'https://$1');
        } else if (!/^https?:\/\//i.test(cleanWebsite)) {
          cleanWebsite = `http://${cleanWebsite}`;
        }
        cleanWebsite = cleanWebsite.replace(/\/+$/, '');
      }

      await updateMusicianProfile({
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        youtubeChannel: youtubeChannel.trim().replace(/\/+$/, ''),
        website: cleanWebsite,
        avatarUrl: avatarUrl.trim(),
        bannerUrl: bannerUrl.trim(),
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0b1017] border border-sky-500/30 rounded-2xl p-6 text-slate-100 shadow-2xl overflow-x-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-amber-400 to-sky-500" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Edit Musician Profile
              </h2>
              <p className="text-xs text-slate-400">
                Customizes your public portfolio &amp; artist card
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Section with automatic square cropping and compression */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Avatar Picture</span>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove avatar</span>
                  </button>
                )}
              </label>

              <div className="flex items-center gap-4">
                {/* Live Avatar Preview */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-sky-500/40 bg-slate-950 flex items-center justify-center shadow-lg shadow-sky-950/50">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-600" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-sky-400 text-[10px] font-bold">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-1" />
                      <span>{uploadProgress}%</span>
                    </div>
                  )}
                </div>

                {/* Dropzone & Upload Button */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                    isDragOver 
                      ? 'border-sky-400 bg-sky-500/10' 
                      : 'border-slate-700/80 hover:border-sky-500/60 hover:bg-slate-800/50 bg-slate-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-200">
                    Upload image to your storage bucket
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Drag &amp; drop or click to browse
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Header Banner Section */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Header Banner Artwork (Fades Right &rarr; Left)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">Live Preview</span>
              </label>

              {/* Banner Live Preview */}
              <div className="relative h-20 sm:h-24 w-full rounded-xl overflow-hidden border border-slate-700/70 bg-[#0c1421] mb-3">
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 22%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.7) 60%, black 85%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 22%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.7) 60%, black 85%)',
                  }}
                >
                  <img
                    src={bannerUrl || '/synth_profile_banner.jpg'}
                    alt="Banner preview"
                    className="w-full h-full object-cover object-right opacity-70"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c1421] via-[#0c1421]/50 to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 left-3 flex items-center gap-2.5 z-10">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                      {displayName || username || 'Musician'}
                    </div>
                    <div className="text-[10px] font-mono text-sky-400">@{username || 'handle'}</div>
                  </div>
                </div>
                {profile.isSupporter && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0b121e]/85 border border-amber-400/40 text-amber-300 text-[9px] font-semibold">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span>Lifetime Backer</span>
                    </span>
                  </div>
                )}
                {uploadingBanner && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center gap-2 text-xs font-mono text-sky-300 z-20">
                    <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span>Processing banner...</span>
                  </div>
                )}
              </div>

              {/* Presets and Custom Upload */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBannerUrl('/synth_profile_banner.jpg')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                    bannerUrl === '/synth_profile_banner.jpg'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Modular Synth
                </button>
                <button
                  type="button"
                  onClick={() => setBannerUrl('/MusicHubBackground.jpg')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                    bannerUrl === '/MusicHubBackground.jpg'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Hub Stage
                </button>
                <button
                  type="button"
                  onClick={() => setBannerUrl('/SynthekDesign.png')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
                    bannerUrl === '/SynthekDesign.png'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Retro Grid
                </button>

                <div className="ml-auto">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBannerFileProcess(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-400 transition-all cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-sky-400" />
                    <span>Upload Custom Banner</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Handle / Musician Username */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Musician Handle / Username</span>
                <span className="text-[10px] font-mono text-sky-400 font-normal">
                  syn-tracker.online/?u={username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || '...'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm font-bold">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. vectrex71"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm font-mono text-white placeholder-slate-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Unique identifier for your public portfolio link and mentions. Letters, numbers, _ and - allowed.
              </p>
            </div>

            {/* Artist / Display Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Artist / Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Hansjuerg Wuethrich"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-sm text-white placeholder-slate-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Shown prominently at the top of your portfolio (e.g. Hansjuerg Wuethrich).
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Biography / Info
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your musical background, favorite chiptune systems (SID, Paula, Yamaha), or current tracker projects..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Youtube className="w-3.5 h-3.5 text-rose-400" />
                  <span>YouTube Channel URL</span>
                </label>
                <input
                  type="url"
                  value={youtubeChannel}
                  onChange={(e) => setYoutubeChannel(e.target.value)}
                  placeholder="https://youtube.com/@your_channel"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Website / Link</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://your-website.com or custom link"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 focus:border-sky-400 rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Profile saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
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
