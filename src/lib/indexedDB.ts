/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'BrowserMusicTrackerDB';
const DB_VERSION = 2;

export function openTrackerDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store songs: { id: string (or autoincrement), name: string, songData: TrackerSongJSON, updatedAt: string }
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }

      // Store cached audio buffers: { filename: string, data: ArrayBuffer }
      if (!db.objectStoreNames.contains('samples')) {
        db.createObjectStore('samples', { keyPath: 'filename' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const AUTOSAVE_BACKUP_KEY = '__autosave_emergency_backup__';

export async function saveLocalSong(id: string, name: string, songData: any, system?: string | null): Promise<void> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    const item = {
      id,
      name,
      songData,
      system: system || songData?.system || null,
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveAutoSaveSession(songData: any, system?: string | null): Promise<void> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    const item = {
      id: AUTOSAVE_BACKUP_KEY,
      name: songData.name || 'Unsaved Jam Session',
      songData,
      system: system || songData?.system || null,
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAutoSaveSession(): Promise<{ id: string; name: string; songData: any; updatedAt: string; system?: string } | null> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const request = store.get(AUTOSAVE_BACKUP_KEY);
    
    request.onsuccess = () => {
      if (request.result && request.result.songData) {
        resolve(request.result);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
}

export async function clearAutoSaveSession(): Promise<void> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    const request = store.delete(AUTOSAVE_BACKUP_KEY);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalSong(id: string): Promise<any> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const request = store.get(id);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.songData);
      } else {
        reject(new Error(`Song with ID ${id} not found`));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function listLocalSongs(): Promise<any[]> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const list = (request.result || [])
        .filter(item => item.id !== AUTOSAVE_BACKUP_KEY)
        .map(item => ({
          id: item.id,
          name: item.name,
          updatedAt: item.updatedAt,
          patternCount: item.songData?.patterns?.length || 0,
          channelsCount: item.songData?.channelsCount || 4,
        }));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLocalSong(id: string): Promise<void> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveSampleData(filename: string, data: ArrayBuffer): Promise<void> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('samples', 'readwrite');
    const store = tx.objectStore('samples');
    const request = store.put({ filename, data });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSampleData(filename: string): Promise<ArrayBuffer | null> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('samples', 'readonly');
    const store = tx.objectStore('samples');
    const request = store.get(filename);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getStorageDetails(): Promise<{
  songCount: number;
  sampleCount: number;
  quotaEstimate: { usage: number; quota: number; usagePercent: number } | null;
  songs: any[];
}> {
  const db = await openTrackerDB();
  const songs = await listLocalSongs();
  
  // Get sample count
  const sampleCount = await new Promise<number>((resolve) => {
    try {
      const tx = db.transaction('samples', 'readonly');
      const store = tx.objectStore('samples');
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });

  // Get quota estimate from navigator.storage if available
  let quotaEstimate: { usage: number; quota: number; usagePercent: number } | null = null;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const usage = est.usage || 0;
      const quota = est.quota || 0;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
      quotaEstimate = { usage, quota, usagePercent };
    } catch (e) {
      console.warn('Storage estimate unavailable', e);
    }
  }

  return {
    songCount: songs.length,
    sampleCount,
    quotaEstimate,
    songs,
  };
}

export async function clearAllLocalData(): Promise<void> {
  const db = await openTrackerDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['songs', 'samples'], 'readwrite');
      tx.objectStore('songs').clear();
      tx.objectStore('samples').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
  });
}

