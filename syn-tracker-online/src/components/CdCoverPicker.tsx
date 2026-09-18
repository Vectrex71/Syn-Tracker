/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Disc, 
  Upload, 
  Palette, 
  Trash2, 
  Check, 
  Sparkles, 
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { TrackerSong } from '../types';
import { compressAndCropCoverImage } from '../lib/firebase';

interface CdCoverPickerProps {
  currentCoverUrl?: string;
  song?: TrackerSong | null;
  onSelectCover: (coverUrl: string) => void;
  onOpenCoverDesigner?: () => void;
  label?: string;
}

const CUSTOM_COVERS_STORAGE_KEY = 'syn_tracker_custom_covers_v1';

export const CdCoverPicker: React.FC<CdCoverPickerProps> = ({
  currentCoverUrl,
  song,
  onSelectCover,
  onOpenCoverDesigner,
  label = 'CD Cover Artwork',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedDesignerCovers, setSavedDesignerCovers] = useState<Array<{ id: string; name: string; thumbnail: string }>>([]);

  // Load covers created in the CD Cover Designer
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_COVERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedDesignerCovers(
            parsed
              .filter((c: any) => c && c.thumbnail)
              .map((c: any) => ({
                id: c.id || String(Math.random()),
                name: c.name || c.title || 'Custom Cover',
                thumbnail: c.thumbnail,
              }))
          );
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const compressedDataUrl = await compressAndCropCoverImage(file, 600);
      onSelectCover(compressedDataUrl);
    } catch (err: any) {
      console.error('Cover upload error:', err);
      setUploadError(err.message || 'Failed to process image file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const compressedDataUrl = await compressAndCropCoverImage(file, 600);
      onSelectCover(compressedDataUrl);
    } catch (err: any) {
      console.error('Cover drop error:', err);
      setUploadError(err.message || 'Failed to process image file.');
    } finally {
      setIsUploading(false);
    }
  };

  const hasCurrentSongCover = Boolean(song?.coverArt && song.coverArt.startsWith('data:'));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Disc className="w-3.5 h-3.5 text-sky-400" />
          <span>{label}</span>
          <span className="text-[10px] text-slate-500 font-normal">(Optional, 1:1 Square)</span>
        </label>
        {currentCoverUrl && (
          <button
            type="button"
            onClick={() => onSelectCover('')}
            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
            title="Remove cover artwork"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Cover</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
        {/* Left: Square CD Cover Preview with Jewel Case Gloss Effect */}
        <div className="sm:col-span-4 flex flex-col items-center">
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-36 h-36 rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all cursor-pointer group shadow-xl bg-slate-950 ${
              currentCoverUrl 
                ? 'border-sky-500/50 hover:border-sky-400 shadow-sky-950/40' 
                : 'border-dashed border-slate-700 hover:border-sky-400/60 hover:bg-slate-900/60'
            }`}
            title="Click or drop an image to set cover"
          >
            {currentCoverUrl ? (
              <>
                <img 
                  src={currentCoverUrl} 
                  alt="CD Cover" 
                  className="w-full h-full object-cover select-none"
                />
                {/* CD Jewel Case spine line & glass sheen */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/40 via-transparent to-white/20" />
                <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-black/60 to-transparent border-r border-white/15" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Replace</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center text-slate-500 group-hover:text-slate-300 transition-colors">
                <Disc className="w-8 h-8 mb-1.5 opacity-60 group-hover:rotate-45 transition-transform duration-500 text-sky-400" />
                <span className="text-[11px] font-medium leading-tight">Click to Upload Cover</span>
                <span className="text-[9px] text-slate-500 mt-0.5">PNG, JPG, WEBP</span>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Cover Source Options */}
        <div className="sm:col-span-8 flex flex-col gap-2.5">
          {/* Option A: Direct File Upload */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 hover:text-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Image</span>
            </button>

            {onOpenCoverDesigner && (
              <button
                type="button"
                onClick={onOpenCoverDesigner}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Open CD Cover Studio</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadError && (
            <p className="text-[11px] text-rose-400">{uploadError}</p>
          )}

          {/* Option B: Quick import from Active Song Cover */}
          {hasCurrentSongCover && song?.coverArt !== currentCoverUrl && (
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img 
                  src={song?.coverArt} 
                  alt="Studio Cover" 
                  className="w-8 h-8 rounded object-cover shrink-0 border border-slate-600"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">Current Song Cover</div>
                  <div className="text-[10px] text-slate-400">Baked from CD Cover Studio</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectCover(song!.coverArt!)}
                className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shrink-0 cursor-pointer transition-all"
              >
                Use This
              </button>
            </div>
          )}

          {/* Option C: Saved Covers from CD Cover Designer Library */}
          {savedDesignerCovers.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Saved CD Cover Presets ({savedDesignerCovers.length})</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {savedDesignerCovers.map((c) => {
                  const isSelected = currentCoverUrl === c.thumbnail;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCover(c.thumbnail)}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer group shadow-sm ${
                        isSelected 
                          ? 'border-sky-400 ring-2 ring-sky-400/40' 
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                      title={`Select "${c.name}"`}
                    >
                      <img src={c.thumbnail} alt={c.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-500/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
