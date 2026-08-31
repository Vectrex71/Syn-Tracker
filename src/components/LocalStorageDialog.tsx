/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Trash, 
  FileText, 
  Download, 
  HardDrive, 
  Upload, 
  FolderOpen, 
  Database, 
  Layers, 
  Music, 
  Info, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { listLocalSongs, deleteLocalSong, getStorageDetails, loadLocalSong, clearAllLocalData, getAutoSaveSession, clearAutoSaveSession, AUTOSAVE_BACKUP_KEY } from '../lib/indexedDB';
import { LocalSavedSongMeta, TrackerSong } from '../types';
import { Zap, RotateCcw } from 'lucide-react';

interface LocalStorageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentSongName: string;
  onSave: (name: string) => Promise<void>;
  onLoad: (id: string) => Promise<void>;
  onOpenDiskFile?: (file: File) => void;
  onSaveDiskFile?: () => void;
}

export const LocalStorageDialog: React.FC<LocalStorageDialogProps> = ({
  isOpen,
  onClose,
  currentSongName,
  onSave,
  onLoad,
  onOpenDiskFile,
  onSaveDiskFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'manager' | 'inspector'>('manager');
  const [songName, setSongName] = useState(currentSongName);
  const [localSongs, setLocalSongs] = useState<LocalSavedSongMeta[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspector State
  const [storageStats, setStorageStats] = useState<{
    songCount: number;
    sampleCount: number;
    quotaEstimate: { usage: number; quota: number; usagePercent: number } | null;
  } | null>(null);
  const [selectedSongDetail, setSelectedSongDetail] = useState<{
    id: string;
    name: string;
    raw: any;
    sizeKb: number;
  } | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [autoSaveSession, setAutoSaveSession] = useState<{
    id: string;
    name: string;
    updatedAt: string;
    patternCount: number;
    channelsCount: number;
    system?: string;
    songData: any;
  } | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchSongs = async () => {
    setIsLoadingList(true);
    try {
      const songs = await listLocalSongs();
      setLocalSongs(songs);
      
      // Check emergency auto-backup
      const autoSave = await getAutoSaveSession();
      if (autoSave && autoSave.songData) {
        setAutoSaveSession({
          id: autoSave.id,
          name: autoSave.name || autoSave.songData?.name || 'Unsaved Jam Session',
          updatedAt: autoSave.updatedAt,
          patternCount: autoSave.songData?.patterns?.length || 0,
          channelsCount: autoSave.songData?.channelsCount || 4,
          system: autoSave.system || autoSave.songData?.system,
          songData: autoSave.songData,
        });
      } else {
        setAutoSaveSession(null);
      }

      const details = await getStorageDetails();
      setStorageStats({
        songCount: details.songCount,
        sampleCount: details.sampleCount,
        quotaEstimate: details.quotaEstimate,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSongName(currentSongName);
      setSelectedSongDetail(null);
      fetchSongs();
    }
  }, [isOpen, currentSongName]);

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songName.trim()) return;
    setIsSubmitting(true);
    try {
      await onSave(songName.trim());
      await fetchSongs();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save song locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoad = async (id: string) => {
    try {
      await onLoad(id);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to load song.');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, name?: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Song from Cache?',
      message: `Are you sure you want to delete "${name || 'this song'}" from your browser's IndexedDB storage?`,
      confirmText: 'Delete Song',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteLocalSong(id);
          if (selectedSongDetail?.id === id) {
            setSelectedSongDetail(null);
          }
          await fetchSongs();
          showNotification('Song deleted from browser cache.');
        } catch (err) {
          console.error(err);
          showNotification('Failed to delete song.');
        }
      },
    });
  };

  const handleInspectSong = async (id: string, name: string) => {
    try {
      const rawData = await loadLocalSong(id);
      const jsonString = JSON.stringify(rawData);
      const sizeKb = Math.round((new Blob([jsonString]).size / 1024) * 10) / 10;
      setSelectedSongDetail({
        id,
        name,
        raw: rawData,
        sizeKb,
      });
    } catch (err) {
      console.error('Failed to inspect song:', err);
    }
  };

  const handleExportSongAsTrk = (songData: any, songTitle: string) => {
    try {
      const jsonStr = JSON.stringify(songData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (songTitle || 'song').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}.trk`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification(`Exported "${safeName}.trk" to downloads.`);
    } catch (e) {
      console.error(e);
      showNotification('Could not export song file.');
    }
  };

  const handleClearAllStorage = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear ProTracker Cache?',
      message: 'This will delete all saved songs and cached audio samples from your browser IndexedDB. (Your desktop files and other websites are NOT affected).',
      confirmText: 'Clear Tracker Cache',
      danger: true,
      onConfirm: async () => {
        setIsClearingAll(true);
        try {
          await clearAllLocalData();
          setSelectedSongDetail(null);
          await fetchSongs();
          showNotification('Browser cache cleared successfully.');
        } catch (err) {
          console.error('Error clearing storage:', err);
          showNotification('Failed to clear storage.');
        } finally {
          setIsClearingAll(false);
        }
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onOpenDiskFile) {
      onOpenDiskFile(file);
      onClose();
    }
    if (e.target) e.target.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="local-storage-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
          onClick={onClose}
        >
          <motion.div 
            key="local-storage-dialog-card"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 15, opacity: 0, transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] } }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="bg-[#11161d] border border-[#273547] w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#cbd5e1]"
            onClick={(e) => e.stopPropagation()}
          >
        
        {/* Header */}
        <div className="bg-[#161d27] border-b border-[#212b38] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-[#0e1724] border border-[#26374a] text-[#38bdf8]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#f8fafc] uppercase tracking-wider flex items-center gap-2">
                <span>Storage & Cache Explorer</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 font-mono">
                  Browser Vault
                </span>
              </div>
              <p className="text-[10px] text-[#64748b]">Persistent Browser Client-Side Storage</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex bg-[#0b1016] p-0.5 rounded-lg border border-[#1e2733] text-[11px] font-semibold">
              <button
                onClick={() => setActiveTab('manager')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'manager' 
                    ? 'bg-[#1e2c3d] text-[#38bdf8] shadow-sm' 
                    : 'text-[#64748b] hover:text-[#cbd5e1]'
                }`}
              >
                Project Manager
              </button>
              <button
                onClick={() => {
                  setActiveTab('inspector');
                  fetchSongs();
                }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'inspector' 
                    ? 'bg-[#1e2c3d] text-[#38bdf8] shadow-sm' 
                    : 'text-[#64748b] hover:text-[#cbd5e1]'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Cache Inspector</span>
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 hover:bg-[#1f2b3b] rounded text-[#64748b] hover:text-white transition-all cursor-pointer ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        {activeTab === 'manager' ? (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            
            {/* Quick Disk / Desktop Actions */}
            <div className="bg-[#0c1015] p-3 rounded-lg border border-[#1e2733] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Local Computer / Drive (PC, Mac, Linux, ChromeOS)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3 rounded-md bg-[#16202c] hover:bg-[#1f2d3d] border border-[#26374a] text-xs font-semibold text-[#38bdf8] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  title="Open .MOD, .TRK, .SID, .PRG, or .JSON from Desktop / File Explorer"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Open from Disk</span>
                </button>
                {onSaveDiskFile && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveDiskFile();
                      onClose();
                    }}
                    className="h-8 px-3 rounded-md bg-[#16202c] hover:bg-[#1f2d3d] border border-[#26374a] text-xs font-semibold text-[#34d399] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    title="Download full project file (.trk) to Desktop"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save to Disk (.trk)</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mod,.trk,.json,.syn,.sid,.prg,.psid,.rsid,audio/mod,audio/prs.sid,application/json,application/octet-stream,*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Save form */}
            <form onSubmit={handleSaveSubmit} className="space-y-2 bg-[#0c1015] p-3.5 rounded-lg border border-[#1e2733]">
              <h3 className="text-[10px] text-[#64748b] font-bold uppercase">Save Current Song to Browser Cache</h3>
              <div className="flex gap-2">
                <input
                  id="input-local-song-name"
                  type="text"
                  placeholder="Enter song name..."
                  value={songName}
                  onChange={(e) => setSongName(e.target.value)}
                  maxLength={32}
                  className="bg-[#141b24] border border-[#212b38] text-[#f1f5f9] px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#38bdf8] flex-1 font-medium"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !songName.trim()}
                  className="h-8 px-4 font-semibold text-xs rounded-lg flex items-center gap-1.5 disabled:opacity-40 cursor-pointer aqua-gloss aqua-blue"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </form>

            {/* Auto-Save Emergency Recovery Section */}
            <div className="rounded-lg border border-[#38bdf8]/30 bg-[#0c141f] p-3 shadow-[0_0_15px_rgba(56,189,248,0.06)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#38bdf8]">
                  <Zap className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse" />
                  <span>Automatisches Session-Backup (Notfall-Wiederherstellung)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#34d399]/20 text-[#34d399] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block animate-ping" />
                  Auto-Save Aktiv
                </span>
              </div>

              {autoSaveSession ? (
                <div className="mt-2 flex items-center justify-between bg-[#101b29] p-2.5 rounded-md border border-[#1e3046]">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#f8fafc] truncate">
                      "{autoSaveSession.name}"
                    </div>
                    <div className="text-[10px] text-[#94a3b8] mt-0.5">
                      Gesichert: {new Date(autoSaveSession.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({new Date(autoSaveSession.updatedAt).toLocaleDateString()}) • {autoSaveSession.channelsCount} Spuren • {autoSaveSession.patternCount} Patterns
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleLoad(AUTOSAVE_BACKUP_KEY)}
                      className="px-3 py-1 bg-gradient-to-r from-[#38bdf8] to-[#34d399] text-[#0f172a] font-bold text-xs rounded shadow-sm hover:brightness-110 flex items-center gap-1 cursor-pointer"
                      title="Restore auto-save backup"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await clearAutoSaveSession();
                        await fetchSongs();
                        showNotification('Auto-save backup deleted.');
                      }}
                      className="p-1 hover:bg-[#f43f5e]/15 text-[#64748b] hover:text-[#f43f5e] rounded transition-colors cursor-pointer"
                      title="Delete auto-backup"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#64748b] mt-1">
                  Your tracker project is continuously auto-saved to your browser storage while editing to prevent accidental data loss.
                </p>
              )}
            </div>

            {/* List Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] text-[#64748b] font-bold uppercase">Saved Browser Songs ({localSongs.length})</h3>
                <button 
                  onClick={fetchSongs} 
                  className="text-[10px] text-[#38bdf8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>
              
              {isLoadingList ? (
                <div className="text-center py-6 text-[#64748b] text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                  <span>Accessing storage...</span>
                </div>
              ) : localSongs.length === 0 ? (
                <div className="text-center py-6 text-[#64748b] text-xs border border-dashed border-[#1e2733] rounded-lg">
                  No songs stored in browser yet. Save above or export to disk.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {localSongs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => handleLoad(song.id)}
                      className="group flex items-center justify-between p-2.5 rounded-lg bg-[#0c1015] hover:bg-[#141b24] border border-[#1e2733] hover:border-[#38bdf8]/40 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#38bdf8]" />
                        <div>
                          <div className="text-xs text-[#f1f5f9] font-bold">{song.name}</div>
                          <div className="text-[9px] text-[#64748b] font-bold uppercase mt-0.5">
                            {new Date(song.updatedAt).toLocaleDateString()} {new Date(song.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {song.channelsCount} Channels • {song.patternCount} Patterns
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectSong(song.id, song.name);
                            setActiveTab('inspector');
                          }}
                          className="p-1.5 rounded bg-[#16202c] hover:bg-[#1f2d3d] text-[#64748b] hover:text-[#38bdf8] transition-colors"
                          title="Inspect Details in Cache Inspector"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoad(song.id);
                          }}
                          className="px-2.5 py-1 rounded text-[#38bdf8] text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer aqua-gloss aqua-dark"
                          title="Load Song"
                        >
                          <Download className="w-3 h-3 text-[#38bdf8]" />
                          <span className="text-[#38bdf8]">LOAD</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, song.id, song.name)}
                          className="p-1 rounded hover:bg-[#3b1219] text-[#64748b] hover:text-[#f43f5e] transition-all cursor-pointer"
                          title="Delete song"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Cache Inspector Tab */
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            
            {/* Storage Quota & Overview Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg bg-[#0c1015] border border-[#1e2733] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#64748b] text-[10px] uppercase font-bold">
                  <span>Saved Songs</span>
                  <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                </div>
                <div className="mt-1">
                  <div className="text-xl font-bold font-mono text-[#f8fafc]">{storageStats?.songCount || 0}</div>
                  <span className="text-[10px] text-[#64748b]">Local Song Vault</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0c1015] border border-[#1e2733] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#64748b] text-[10px] uppercase font-bold">
                  <span>Cached Audio Samples</span>
                  <Music className="w-3.5 h-3.5 text-[#34d399]" />
                </div>
                <div className="mt-1">
                  <div className="text-xl font-bold font-mono text-[#f8fafc]">{storageStats?.sampleCount || 0}</div>
                  <span className="text-[10px] text-[#64748b]">Cached PCM Buffers</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0c1015] border border-[#1e2733] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#64748b] text-[10px] uppercase font-bold">
                  <span>Browser Storage Quota</span>
                  <Database className="w-3.5 h-3.5 text-[#c084fc]" />
                </div>
                <div className="mt-1">
                  <div className="text-sm font-bold font-mono text-[#f8fafc]">
                    {storageStats?.quotaEstimate ? formatBytes(storageStats.quotaEstimate.usage) : '~0 KB'}
                  </div>
                  <span className="text-[10px] text-[#64748b]">
                    {storageStats?.quotaEstimate && storageStats.quotaEstimate.quota > 0 
                      ? `of ${formatBytes(storageStats.quotaEstimate.quota)} total quota` 
                      : 'Local persistent storage'}
                  </span>
                </div>
              </div>
            </div>

            {/* List & Detail Explorer */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Left Column: List of items */}
              <div className="md:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[#64748b] font-bold uppercase">
                  <span>Saved Projects ({localSongs.length})</span>
                  <button onClick={fetchSongs} className="hover:text-[#38bdf8] flex items-center gap-1 cursor-pointer">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {localSongs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#64748b] border border-dashed border-[#1e2733] rounded-lg">
                      No stored records found.
                    </div>
                  ) : (
                    localSongs.map((song) => {
                      const isSelected = selectedSongDetail?.id === song.id;
                      return (
                        <div
                          key={song.id}
                          onClick={() => handleInspectSong(song.id, song.name)}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-[#152336] border-[#38bdf8] text-[#f8fafc]' 
                              : 'bg-[#0c1015] border-[#1e2733] text-[#94a3b8] hover:bg-[#121923] hover:text-[#cbd5e1]'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="text-xs font-bold truncate">{song.name}</div>
                            <div className="text-[9px] font-mono text-[#64748b]">ID: {song.id.slice(0, 14)}...</div>
                          </div>
                          <Eye className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Song inspection & preview */}
              <div className="md:col-span-7 bg-[#0c1015] border border-[#1e2733] rounded-lg p-3 flex flex-col justify-between min-h-[220px]">
                {selectedSongDetail ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1e2733]">
                      <div>
                        <div className="text-xs font-bold text-[#f8fafc]">{selectedSongDetail.name}</div>
                        <div className="text-[9px] font-mono text-[#38bdf8]">
                          Payload Size: ~{selectedSongDetail.sizeKb} KB (includes embedded Base64 Audio)
                        </div>
                      </div>
                      <button
                        onClick={() => handleExportSongAsTrk(selectedSongDetail.raw, selectedSongDetail.name)}
                        className="px-2 py-1 rounded bg-[#1e2c3d] hover:bg-[#283b52] text-[#38bdf8] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Download as standalone .trk file"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export .trk</span>
                      </button>
                    </div>

                    {/* Breakdown details */}
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                      <div className="bg-[#121923] p-1.5 rounded border border-[#1e2733]">
                        <span className="text-[#64748b] block text-[8px] uppercase">Speed / BPM</span>
                        <span className="font-bold text-[#f8fafc]">
                          {selectedSongDetail.raw.speed || 6} / {selectedSongDetail.raw.bpm || 125}
                        </span>
                      </div>
                      <div className="bg-[#121923] p-1.5 rounded border border-[#1e2733]">
                        <span className="text-[#64748b] block text-[8px] uppercase">Channels</span>
                        <span className="font-bold text-[#38bdf8]">
                          {selectedSongDetail.raw.channelsCount || 4} CH
                        </span>
                      </div>
                      <div className="bg-[#121923] p-1.5 rounded border border-[#1e2733]">
                        <span className="text-[#64748b] block text-[8px] uppercase">Patterns</span>
                        <span className="font-bold text-[#34d399]">
                          {selectedSongDetail.raw.patterns?.length || 0}
                        </span>
                      </div>
                    </div>

                    {/* Samples in this song */}
                    <div>
                      <span className="text-[9px] text-[#64748b] uppercase font-bold block mb-1">
                        Embedded Samples ({selectedSongDetail.raw.samples?.filter((s: any) => s.audioBufferBase64 || s.url)?.length || 0} active)
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-[65px] overflow-y-auto custom-scrollbar">
                        {selectedSongDetail.raw.samples?.map((s: any, idx: number) => {
                          const hasData = !!(s.audioBufferBase64 || s.url);
                          return (
                            <span
                              key={idx}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                                hasData 
                                  ? 'bg-[#152336] border-[#25384d] text-[#38bdf8]' 
                                  : 'bg-[#10141b] border-[#18202b] text-[#475569]'
                              }`}
                            >
                              {(idx + 1).toString(16).toUpperCase()}: {s.name || 'Empty'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Load Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleLoad(selectedSongDetail.id)}
                        className="w-full py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Load "{selectedSongDetail.name}" into Tracker</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 text-[#64748b] space-y-1">
                    <Info className="w-6 h-6 text-[#38bdf8]/40 mb-1" />
                    <span className="text-xs font-semibold text-[#94a3b8]">Select a Song on the Left</span>
                    <p className="text-[10px] max-w-[200px]">Click any stored song to inspect embedded samples, file size, patterns, and structure.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Storage Management / Reset */}
            <div className="pt-2 border-t border-[#1e2733] flex items-center justify-between">
              <div className="text-[10px] text-[#64748b]">
                <span>Data is saved locally inside your browser's IndexedDB database.</span>
              </div>
              <button
                type="button"
                onClick={handleClearAllStorage}
                disabled={isClearingAll || localSongs.length === 0}
                className="px-2.5 py-1 rounded bg-[#2b1218] hover:bg-[#43141e] border border-[#521c27] text-[#f43f5e] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
              >
                <Trash className="w-3 h-3" />
                <span>{isClearingAll ? 'Clearing...' : 'Clear All Browser Cache'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1e2c3d] border border-[#38bdf8] text-[#f8fafc] px-4 py-2 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 z-[60] animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#38bdf8]" />
            <span>{notification}</span>
          </div>
        )}

        {/* Custom Confirmation Modal (No browser alert/confirm blocking) */}
        {confirmModal && confirmModal.isOpen && (
          <div className="absolute inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#141b24] border border-[#2c3d52] w-full max-w-sm rounded-xl p-4 shadow-2xl space-y-3 animate-scale-in text-[#cbd5e1]">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${confirmModal.danger ? 'bg-[#3b1219] text-[#f43f5e]' : 'bg-[#152336] text-[#38bdf8]'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f8fafc]">{confirmModal.title}</h3>
                  <span className="text-[10px] text-[#64748b]">Confirmation required</span>
                </div>
              </div>

              <p className="text-xs text-[#94a3b8] leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212b38]">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#1a2330] hover:bg-[#253244] text-xs font-medium text-[#94a3b8] hover:text-[#f8fafc] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(null);
                    action();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    confirmModal.danger 
                      ? 'bg-[#e11d48] hover:bg-[#be123c] text-white shadow-lg shadow-[#e11d48]/20' 
                      : 'bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a]'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};

