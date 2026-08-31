/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lightweight pure-TypeScript ID3v2.3 Tag Writer with APIC (Attached Picture / Album Art) support.
 * Compatible with all modern media players, Spotify, Apple Music, VLC, Winamp, Android & iOS.
 */

export interface ID3TagData {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  comment?: string;
  image?: {
    mimeType: string;
    data: Uint8Array;
    description?: string;
  };
}

// Convert data URL (e.g. data:image/png;base64,...) to mimeType and Uint8Array
export function parseDataUrlImage(dataUrl: string): { mimeType: string; data: Uint8Array } | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.substring(0, commaIdx);
    const base64Data = dataUrl.substring(commaIdx + 1).trim().replace(/\s/g, '');
    const match = header.match(/data:(.*?);base64/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const binary = window.atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { mimeType, data: bytes };
  } catch (e) {
    console.error('Error decoding image data URL for ID3:', e);
    return null;
  }
}

// Encode number as 4-byte Synchsafe integer (7 bits per byte)
function encodeSynchsafe(num: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = (num >> 21) & 0x7f;
  bytes[1] = (num >> 14) & 0x7f;
  bytes[2] = (num >> 7) & 0x7f;
  bytes[3] = num & 0x7f;
  return bytes;
}

// Build standard ID3v2.3 text frame (e.g. TIT2, TPE1, TALB, TYER, TCON)
function buildTextFrame(frameId: string, text: string): Uint8Array | null {
  if (!text) return null;
  // Convert UTF-8 text to bytes with ISO-8859-1 (0x00) or UTF-16 with BOM (0x01)
  // For maximum compatibility, use UTF-16 LE with BOM (0x01 + 0xFF, 0xFE)
  const isAscii = /^[\x00-\x7F]*$/.test(text);
  
  let frameData: Uint8Array;
  if (isAscii) {
    // ISO-8859-1 encoding: 1 byte prefix (0x00) + ascii chars
    frameData = new Uint8Array(1 + text.length);
    frameData[0] = 0x00;
    for (let i = 0; i < text.length; i++) {
      frameData[1 + i] = text.charCodeAt(i) & 0xff;
    }
  } else {
    // UTF-16LE with BOM
    const charLen = text.length;
    frameData = new Uint8Array(1 + 2 + charLen * 2);
    frameData[0] = 0x01; // UTF-16 encoding flag
    frameData[1] = 0xff; // BOM LE
    frameData[2] = 0xfe;
    for (let i = 0; i < charLen; i++) {
      const code = text.charCodeAt(i);
      frameData[3 + i * 2] = code & 0xff;
      frameData[4 + i * 2] = (code >> 8) & 0xff;
    }
  }

  const frameSize = frameData.length;
  const frameHeader = new Uint8Array(10);
  // Frame ID (4 ASCII chars)
  for (let i = 0; i < 4; i++) {
    frameHeader[i] = frameId.charCodeAt(i);
  }
  // Frame Size in ID3v2.3 is standard 32-bit big endian integer
  frameHeader[4] = (frameSize >> 24) & 0xff;
  frameHeader[5] = (frameSize >> 16) & 0xff;
  frameHeader[6] = (frameSize >> 8) & 0xff;
  frameHeader[7] = frameSize & 0xff;
  // Flags (2 bytes: 0x00, 0x00)
  frameHeader[8] = 0x00;
  frameHeader[9] = 0x00;

  const result = new Uint8Array(10 + frameSize);
  result.set(frameHeader, 0);
  result.set(frameData, 10);
  return result;
}

// Build standard ID3v2.3 APIC (Attached Picture / Cover Art) frame
function buildApicFrame(image: { mimeType: string; data: Uint8Array; description?: string }): Uint8Array {
  const mimeBytes = [];
  const mime = image.mimeType || 'image/jpeg';
  for (let i = 0; i < mime.length; i++) {
    mimeBytes.push(mime.charCodeAt(i));
  }
  mimeBytes.push(0x00); // null terminator

  const pictureType = 0x03; // 0x03 = Cover (front)
  const descriptionBytes = [0x00]; // empty description terminated with null byte

  const headerPartLen = 1 + mimeBytes.length + 1 + descriptionBytes.length; // encoding byte (0x00) + mime + picType + desc
  const frameSize = headerPartLen + image.data.length;

  const frameHeader = new Uint8Array(10);
  // 'APIC'
  frameHeader[0] = 0x41; // 'A'
  frameHeader[1] = 0x50; // 'P'
  frameHeader[2] = 0x49; // 'I'
  frameHeader[3] = 0x43; // 'C'

  frameHeader[4] = (frameSize >> 24) & 0xff;
  frameHeader[5] = (frameSize >> 16) & 0xff;
  frameHeader[6] = (frameSize >> 8) & 0xff;
  frameHeader[7] = frameSize & 0xff;
  frameHeader[8] = 0x00;
  frameHeader[9] = 0x00;

  const result = new Uint8Array(10 + frameSize);
  result.set(frameHeader, 0);

  let offset = 10;
  result[offset++] = 0x00; // ISO-8859-1 text encoding for MIME & description

  for (let i = 0; i < mimeBytes.length; i++) {
    result[offset++] = mimeBytes[i];
  }

  result[offset++] = pictureType;

  for (let i = 0; i < descriptionBytes.length; i++) {
    result[offset++] = descriptionBytes[i];
  }

  result.set(image.data, offset);
  return result;
}

/**
 * Creates an ID3v2.3 tag header & frames byte array to prepend to an MP3 file
 */
export function createId3v2Tag(tag: ID3TagData): Uint8Array {
  const frames: Uint8Array[] = [];

  if (tag.title) {
    const f = buildTextFrame('TIT2', tag.title);
    if (f) frames.push(f);
  }
  if (tag.artist) {
    const f = buildTextFrame('TPE1', tag.artist);
    if (f) frames.push(f);
  }
  if (tag.album) {
    const f = buildTextFrame('TALB', tag.album);
    if (f) frames.push(f);
  }
  if (tag.year) {
    const f = buildTextFrame('TYER', tag.year);
    if (f) frames.push(f);
  }
  if (tag.genre) {
    const f = buildTextFrame('TCON', tag.genre);
    if (f) frames.push(f);
  }
  if (tag.image && tag.image.data && tag.image.data.length > 0) {
    const apic = buildApicFrame(tag.image);
    frames.push(apic);
  }

  // Calculate total frames size
  let totalFramesSize = 0;
  for (const f of frames) {
    totalFramesSize += f.length;
  }

  // ID3v2.3 10-byte header
  const id3Header = new Uint8Array(10);
  id3Header[0] = 0x49; // 'I'
  id3Header[1] = 0x44; // 'D'
  id3Header[2] = 0x33; // '3'
  id3Header[3] = 0x03; // version 2.3
  id3Header[4] = 0x00; // revision 0
  id3Header[5] = 0x00; // flags

  const synchsafe = encodeSynchsafe(totalFramesSize);
  id3Header.set(synchsafe, 6);

  const fullTag = new Uint8Array(10 + totalFramesSize);
  fullTag.set(id3Header, 0);

  let offset = 10;
  for (const f of frames) {
    fullTag.set(f, offset);
    offset += f.length;
  }

  return fullTag;
}

/**
 * Attach ID3v2.3 tag (including APIC album cover) directly to an MP3 Blob
 */
export async function attachId3v2ToMp3Blob(mp3Blob: Blob, tag: ID3TagData): Promise<Blob> {
  const tagBytes = createId3v2Tag(tag);
  const mp3ArrayBuffer = await mp3Blob.arrayBuffer();
  
  // Combine [ID3 Tag] + [MP3 audio frames]
  const combined = new Blob([tagBytes, mp3ArrayBuffer], { type: 'audio/mp3' });
  return combined;
}
