/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  updateProfile,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { firebaseConfig } from './firebaseConfig';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export type SupporterTier = 'monthly' | 'yearly' | 'lifetime' | 'supporter' | 'vip' | 'early_pioneer' | 'vip_backer' | 'patron' | null;

/**
 * Checks if a profile has active PRO status (monthly, yearly, lifetime, or any supporter tier)
 */
export function isProUser(profile: MusicianProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.isSupporter) return true;
  const tier = profile.supporterTier;
  if (tier && ['monthly', 'yearly', 'lifetime', 'supporter', 'vip', 'vip_backer', 'early_pioneer', 'patron'].includes(tier)) {
    return true;
  }
  return false;
}

export interface MusicianProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  headerAccent?: string;
  isSupporter: boolean;
  supporterTier?: SupporterTier;
  supporterSince?: string | null;
  freeProExportsUsed?: number;
  website?: string;
  youtubeChannel?: string;
  youtubeUrl?: string;
  bandcampUrl?: string;
  soundCloudUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttachedTrackFile {
  name: string;
  sizeBytes: number;
  format: 'mod' | 'sid' | 'trk' | 'prg' | 'gbs' | 'vgm' | 'nsf' | 'json';
  system?: string;
  dataUrl?: string;
  dataBase64?: string;
  remixRole?: 'original' | 'remix' | 'stems' | 'bonus';
  description?: string;
}

export interface PublishedTrack {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorIsSupporter?: boolean;
  authorSupporterTier?: SupporterTier;
  title: string;
  system: 'amiga' | 'c64' | 'gameboy' | 'megadrive' | 'nes' | 'trk';
  systemName: string;
  description?: string;
  bpm?: number;
  speed?: number;
  channelsCount?: number;
  format: 'mod' | 'sid' | 'trk' | 'prg' | 'json' | string;
  trackType?: 'tracker' | 'visualizer' | 'files' | 'hybrid';
  albumTitle?: string;
  albumCover?: string;
  trackNumber?: number;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  coverArt?: string;
  songDataJson?: string; // serialized TrackerSong
  attachedFiles?: AttachedTrackFile[];
  playCount: number;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  commentCount?: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TrackComment {
  id: string;
  trackId: string;
  authorUid: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorIsSupporter?: boolean;
  authorSupporterTier?: SupporterTier;
  content: string;
  createdAt: string;
}

// Utility: extract 11-char YouTube ID from any YouTube URL
export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Fetch a musician profile by user UID
 */
export async function getMusicianProfile(uid: string): Promise<MusicianProfile | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as MusicianProfile;
    }
    return null;
  } catch (err) {
    console.error('Error getting musician profile:', err);
    return null;
  }
}

/**
 * Fetch a musician profile by unique username handle (for portfolio sharing)
 */
export async function getMusicianProfileByUsername(username: string): Promise<MusicianProfile | null> {
  try {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    const lookupRef = doc(db, 'usernames', cleanUsername);
    const lookupSnap = await getDoc(lookupRef);
    if (lookupSnap.exists()) {
      const uid = lookupSnap.data().uid;
      return await getMusicianProfile(uid);
    }
    return null;
  } catch (err) {
    console.error('Error getting musician profile by username:', err);
    return null;
  }
}

/**
 * Strips all `undefined` values recursively from an object before saving to Firestore,
 * preventing the "Unsupported field value: undefined" error in setDoc().
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

/**
 * Create or update a musician profile
 */
export async function saveMusicianProfile(
  uid: string, 
  profileData: Partial<MusicianProfile>
): Promise<MusicianProfile> {
  const userRef = doc(db, 'users', uid);
  const existing = await getMusicianProfile(uid);

  // Normalize username
  const rawUsername = profileData.username || existing?.username || `user_${uid.slice(0, 6)}`;
  const cleanUsername = rawUsername.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');

  const now = new Date().toISOString();
  const merged: MusicianProfile = {
    uid,
    email: profileData.email || existing?.email || '',
    username: cleanUsername,
    displayName: profileData.displayName || existing?.displayName || cleanUsername,
    bio: profileData.bio ?? existing?.bio ?? '',
    avatarUrl: profileData.avatarUrl ?? existing?.avatarUrl ?? '',
    bannerUrl: profileData.bannerUrl ?? existing?.bannerUrl ?? '',
    headerAccent: profileData.headerAccent ?? existing?.headerAccent ?? '#38bdf8',
    isSupporter: profileData.isSupporter ?? existing?.isSupporter ?? false,
    supporterTier: profileData.supporterTier ?? existing?.supporterTier ?? null,
    supporterSince: profileData.supporterSince ?? existing?.supporterSince ?? null,
    freeProExportsUsed: profileData.freeProExportsUsed !== undefined ? profileData.freeProExportsUsed : (existing?.freeProExportsUsed ?? 0),
    website: profileData.website ?? existing?.website ?? '',
    youtubeChannel: profileData.youtubeChannel ?? existing?.youtubeChannel ?? '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const cleanData = sanitizeForFirestore(merged);
  await setDoc(userRef, cleanData, { merge: true });

  // Update username lookup registry
  try {
    if (existing?.username && existing.username !== cleanUsername) {
      try {
        await deleteDoc(doc(db, 'usernames', existing.username));
      } catch {
        // ignore if not present
      }
    }
    const usernameRef = doc(db, 'usernames', cleanUsername);
    await setDoc(usernameRef, { uid, updatedAt: now });
  } catch (e) {
    console.warn('Could not register username lookup:', e);
  }

  return merged;
}

/**
 * Publish a track to the musician's portfolio and the public hub
 */
export async function publishTrackToHub(
  track: Omit<PublishedTrack, 'id' | 'createdAt' | 'playCount'>
): Promise<PublishedTrack> {
  const trackId = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const youtubeVideoId = extractYouTubeId(track.youtubeUrl) || '';

  const rawTrack: Record<string, any> = {
    ...track,
    id: trackId,
    description: track.description?.trim() || '',
    youtubeUrl: track.youtubeUrl?.trim() || '',
    youtubeVideoId: youtubeVideoId || '',
    coverArt: track.coverArt || '',
    authorIsSupporter: Boolean(track.authorIsSupporter),
    playCount: 0,
    upvotes: 0,
    downvotes: 0,
    score: 0,
    createdAt: now,
  };

  const cleanTrack = sanitizeForFirestore(rawTrack) as PublishedTrack;

  const trackRef = doc(db, 'tracks', trackId);
  await setDoc(trackRef, cleanTrack);
  return cleanTrack;
}

/**
 * Fetch a single published track by its ID
 */
export async function getPublishedTrackById(trackId: string): Promise<PublishedTrack | null> {
  try {
    const trackRef = doc(db, 'tracks', trackId);
    const snap = await getDoc(trackRef);
    if (!snap.exists()) return null;
    return snap.data() as PublishedTrack;
  } catch (err) {
    console.error('Error fetching track by ID:', err);
    return null;
  }
}

/**
 * Update a published track document (title, description, coverArt, system, youtubeUrl, attachedFiles, etc.)
 */
export async function updatePublishedTrack(
  trackId: string,
  updates: Partial<PublishedTrack>
): Promise<void> {
  const trackRef = doc(db, 'tracks', trackId);
  const now = new Date().toISOString();
  const cleanUpdates = sanitizeForFirestore({
    ...updates,
    updatedAt: now,
  });
  await updateDoc(trackRef, cleanUpdates);
}

/**
 * Updates album title and/or album cover artwork across all tracks belonging to an album
 */
export async function updateAlbumDetailsAcrossTracks(
  authorUid: string,
  oldAlbumTitle: string,
  newAlbumTitle: string,
  newAlbumCover?: string
): Promise<void> {
  try {
    const q = query(
      collection(db, 'tracks'),
      where('authorUid', '==', authorUid),
      where('albumTitle', '==', oldAlbumTitle)
    );
    const snap = await getDocs(q);
    const now = new Date().toISOString();
    const updatePromises = snap.docs.map((d) => {
      const updates: any = {
        albumTitle: newAlbumTitle.trim(),
        updatedAt: now,
      };
      if (newAlbumCover !== undefined) {
        updates.albumCover = newAlbumCover;
      }
      return updateDoc(doc(db, 'tracks', d.id), updates);
    });
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Error updating album across tracks:', err);
    throw err;
  }
}

/**
 * Vote on a track (up, down, or clear)
 */
export async function voteOnTrack(
  trackId: string,
  voteType: 'up' | 'down' | 'none',
  previousVote: 'up' | 'down' | 'none' = 'none',
  userId?: string
): Promise<{ upvotes: number; downvotes: number; score: number }> {
  const trackRef = doc(db, 'tracks', trackId);
  
  // Calculate deltas
  let upDelta = 0;
  let downDelta = 0;

  if (previousVote === 'up') upDelta -= 1;
  if (previousVote === 'down') downDelta -= 1;

  if (voteType === 'up') upDelta += 1;
  if (voteType === 'down') downDelta += 1;

  // Read current track to apply updates cleanly
  const snap = await getDoc(trackRef);
  const current = snap.exists() ? (snap.data() as PublishedTrack) : null;
  const currentUp = current?.upvotes || 0;
  const currentDown = current?.downvotes || 0;

  const newUp = Math.max(0, currentUp + upDelta);
  const newDown = Math.max(0, currentDown + downDelta);
  const newScore = newUp - newDown;

  try {
    await updateDoc(trackRef, {
      upvotes: newUp,
      downvotes: newDown,
      score: newScore,
    });

    if (userId) {
      const voteDocRef = doc(db, 'tracks', trackId, 'votes', userId);
      if (voteType === 'none') {
        await deleteDoc(voteDocRef).catch(() => {});
      } else {
        await setDoc(voteDocRef, {
          vote: voteType,
          userId,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('Failed to persist vote in Firestore, cached locally:', err);
  }

  return { upvotes: newUp, downvotes: newDown, score: newScore };
}

/**
 * Fetch all tracks by a specific musician UID
 */
export async function getMusicianTracks(authorUid: string): Promise<PublishedTrack[]> {
  try {
    const q = query(
      collection(db, 'tracks'), 
      where('authorUid', '==', authorUid)
    );
    const snap = await getDocs(q);
    const tracks: PublishedTrack[] = [];
    snap.forEach((d) => tracks.push(d.data() as PublishedTrack));
    // Sort descending by date
    return tracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching musician tracks:', err);
    return [];
  }
}

/**
 * Fetch latest community tracks for the Hub feed
 */
export async function getPublicHubTracks(limitCount: number = 30): Promise<PublishedTrack[]> {
  try {
    const q = query(
      collection(db, 'tracks'),
      where('isPublic', '==', true),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const tracks: PublishedTrack[] = [];
    snap.forEach((d) => tracks.push(d.data() as PublishedTrack));
    return tracks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching hub tracks:', err);
    return [];
  }
}

/**
 * Delete a published track
 */
export async function deletePublishedTrack(trackId: string): Promise<void> {
  const trackRef = doc(db, 'tracks', trackId);
  await deleteDoc(trackRef);
}

/**
 * Increment play count for a track
 */
export async function incrementTrackPlays(trackId: string, currentCount: number): Promise<void> {
  try {
    const trackRef = doc(db, 'tracks', trackId);
    await updateDoc(trackRef, { playCount: (currentCount || 0) + 1 });
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Compress, square-crop, and format any avatar image client-side.
 * Produces an optimized JPEG Data URL (~20-40KB) that is instantly renderable.
 */
export async function compressAndCropAvatar(file: File, targetSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Only image files (PNG, JPG, WEBP, GIF, SVG) are supported.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image. Please try another image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // Crop center square
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(e.target?.result as string);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve(compressedDataUrl);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress, square-crop, and format any CD Cover artwork client-side.
 * Produces an optimized JPEG Data URL (512x512) ready for storage and CD jewel display.
 */
export async function compressAndCropCoverImage(file: File, targetSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Only image files (PNG, JPG, WEBP, GIF, SVG) are supported.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read cover image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode cover image. Please try another image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // Crop center square
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(e.target?.result as string);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.86);
          resolve(compressedDataUrl);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a musician avatar image.
 * Uses fast client-side compression to square avatar format (256x256).
 * Seamlessly stores in Firebase Storage if available, or falls back to optimized data URL.
 */
export async function uploadMusicianAvatar(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (PNG, JPG, WEBP, GIF, SVG) are allowed for avatars.');
  }

  // 1. Instantly compress and crop client-side (<50ms)
  const compressedDataUrl = await compressAndCropAvatar(file, 256);
  if (onProgress) onProgress(60);

  // 2. Attempt Firebase Storage upload with a 3.5s timeout safeguard
  try {
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = ['png', 'jpg', 'jpeg', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const filePath = `avatars/${uid}/avatar_${Date.now()}.${cleanExt}`;
    const sRef = storageRef(storage, filePath);

    const uploadPromise = new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(sRef, file, {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          ownerUid: uid,
          uploadedAt: new Date().toISOString(),
        },
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.round(60 + (snapshot.bytesTransferred / snapshot.totalBytes) * 40);
            if (onProgress) onProgress(progress);
          }
        },
        (error) => {
          console.warn('[Storage] Upload task failed, falling back to compressed avatar:', error.message);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    // 3.5s timeout safeguard against infinite network hang
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 3500);
    });

    const finalUrl = await Promise.race([uploadPromise, timeoutPromise]);
    if (onProgress) onProgress(100);
    return finalUrl;
  } catch {
    // If Storage is not enabled or times out, safely return the high-quality compressed data URL
    if (onProgress) onProgress(100);
    return compressedDataUrl;
  }
}

/**
 * Compress and crop a banner image client-side (1200x400 landscape).
 */
export async function compressAndCropBanner(file: File, targetWidth = 1200, targetHeight = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Only image files (PNG, JPG, WEBP, GIF) are supported.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image. Please try another image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // Crop center 3:1 aspect ratio
          const targetRatio = targetWidth / targetHeight;
          let srcW = width;
          let srcH = height;
          let srcX = 0;
          let srcY = 0;

          if (width / height > targetRatio) {
            srcW = Math.round(height * targetRatio);
            srcX = Math.round((width - srcW) / 2);
          } else {
            srcH = Math.round(width / targetRatio);
            srcY = Math.round((height - srcH) / 2);
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(e.target?.result as string);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedDataUrl);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a musician banner image.
 */
export async function uploadMusicianBanner(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (PNG, JPG, WEBP, GIF) are allowed for banners.');
  }

  const compressedDataUrl = await compressAndCropBanner(file, 1200, 400);
  if (onProgress) onProgress(60);

  try {
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = ['png', 'jpg', 'jpeg', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const filePath = `banners/${uid}/banner_${Date.now()}.${cleanExt}`;
    const sRef = storageRef(storage, filePath);

    const uploadPromise = new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(sRef, file, {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          ownerUid: uid,
          uploadedAt: new Date().toISOString(),
        },
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.round(60 + (snapshot.bytesTransferred / snapshot.totalBytes) * 40);
            if (onProgress) onProgress(progress);
          }
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Firebase Storage upload timed out')), 3500);
    });

    const finalUrl = await Promise.race([uploadPromise, timeoutPromise]);
    if (onProgress) onProgress(100);
    return finalUrl;
  } catch {
    if (onProgress) onProgress(100);
    return compressedDataUrl;
  }
}

/**
 * Real-time subscription to comments for a specific track
 */
export function subscribeTrackComments(
  trackId: string,
  callback: (comments: TrackComment[]) => void
): () => void {
  const commentsRef = collection(db, 'tracks', trackId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const comments: TrackComment[] = [];
      snapshot.forEach((docSnap) => {
        comments.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<TrackComment, 'id'>)
        });
      });
      callback(comments);
    },
    (err) => {
      console.error('Error in comments listener:', err);
    }
  );
}

/**
 * Add a new comment to a track
 */
export async function addTrackComment(
  trackId: string,
  userProfile: MusicianProfile,
  content: string,
  currentCommentCount?: number
): Promise<TrackComment> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error('Comment content cannot be empty');
  }

  const commentsRef = collection(db, 'tracks', trackId, 'comments');
  const commentDocRef = doc(commentsRef);
  const now = new Date().toISOString();

  const commentData: Omit<TrackComment, 'id'> = {
    trackId,
    authorUid: userProfile.uid,
    authorUsername: userProfile.username,
    authorName: userProfile.displayName || userProfile.username,
    authorAvatarUrl: userProfile.avatarUrl || '',
    authorIsSupporter: Boolean(userProfile.isSupporter),
    authorSupporterTier: userProfile.supporterTier || null,
    content: cleanContent,
    createdAt: now
  };

  await setDoc(commentDocRef, commentData);

  // Increment track's comment count
  try {
    const trackRef = doc(db, 'tracks', trackId);
    await updateDoc(trackRef, {
      commentCount: (currentCommentCount || 0) + 1
    });
  } catch (err) {
    console.warn('Failed to update commentCount on track document:', err);
  }

  return {
    id: commentDocRef.id,
    ...commentData
  };
}

/**
 * Delete a comment from a track
 */
export async function deleteTrackComment(
  trackId: string,
  commentId: string,
  currentCommentCount?: number
): Promise<void> {
  const commentRef = doc(db, 'tracks', trackId, 'comments', commentId);
  await deleteDoc(commentRef);

  if (typeof currentCommentCount === 'number' && currentCommentCount > 0) {
    try {
      const trackRef = doc(db, 'tracks', trackId);
      await updateDoc(trackRef, {
        commentCount: Math.max(0, currentCommentCount - 1)
      });
    } catch (err) {
      console.warn('Failed to decrement commentCount on track document:', err);
    }
  }
}


