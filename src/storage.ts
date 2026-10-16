import { AudioVersion, CachedAudioMeta, PanelProfile, TrackButtonConfig } from './types';
import { DEFAULT_PROFILES } from './defaultData';

const DB_NAME = 'AudioPanelOfflineDB';
const DB_VERSION = 1;
const STORE_BLOBS = 'audio_blobs';
const PROFILES_STORAGE_KEY = 'audio_panel_profiles_v1';
const ACTIVE_PROFILE_KEY = 'audio_panel_active_profile_v1';

interface StoredBlobRecord {
  versionId: string;
  blob: Blob;
  sourceType: 'local' | 'cloud' | 'bundled_cache';
  fileName: string;
  size: number;
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'versionId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function normalizeAudioBlob(rawBlob: Blob, fileName: string): Promise<Blob> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.mpeg') || lower.endsWith('.mpg') || lower.endsWith('.mp3') || rawBlob.type === 'video/mpeg' || !rawBlob.type) {
    const buffer = await rawBlob.arrayBuffer();
    return new Blob([buffer], { type: 'audio/mpeg' });
  }
  return rawBlob;
}

export async function saveAudioBlobToDB(
  versionId: string,
  rawBlob: Blob,
  sourceType: 'local' | 'cloud' | 'bundled_cache',
  fileName: string
): Promise<CachedAudioMeta> {
  const normalizedBlob = await normalizeAudioBlob(rawBlob, fileName);
  const db = await openDatabase();
  const record: StoredBlobRecord = {
    versionId,
    blob: normalizedBlob,
    sourceType,
    fileName,
    size: normalizedBlob.size,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve({
        versionId: record.versionId,
        sourceType: record.sourceType,
        fileName: record.fileName,
        size: record.size,
        updatedAt: record.updatedAt
      });
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAudioBlobFromDB(versionId: string): Promise<StoredBlobRecord | null> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(versionId);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as StoredBlobRecord) || null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function getAllCachedAudioMeta(): Promise<Record<string, CachedAudioMeta>> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const map: Record<string, CachedAudioMeta> = {};
        const list = (req.result as StoredBlobRecord[]) || [];
        for (const item of list) {
          map[item.versionId] = {
            versionId: item.versionId,
            sourceType: item.sourceType,
            fileName: item.fileName,
            size: item.size,
            updatedAt: item.updatedAt
          };
        }
        resolve(map);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return {};
  }
}

export async function deleteAudioBlobFromDB(versionId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    store.delete(versionId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearAllAudioBlobsInDB(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    store.clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export function extractGoogleDriveFileId(inputUrlOrId: string): string | null {
  const trimmed = inputUrlOrId.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    return trimmed;
  }
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{20,45})/);
  if (matchFileD) return matchFileD[1];
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,45})/);
  if (matchIdParam) return matchIdParam[1];
  return null;
}

export async function downloadAndCacheAudioVersion(
  version: AudioVersion,
  customUrlInput?: string
): Promise<CachedAudioMeta> {
  const candidateUrls: { url: string; sourceType: 'cloud' | 'bundled_cache'; labelName: string }[] = [];

  if (customUrlInput && customUrlInput.trim()) {
    const gdriveId = extractGoogleDriveFileId(customUrlInput);
    if (gdriveId) {
      candidateUrls.push({
        url: `https://drive.google.com/uc?export=download&id=${gdriveId}`,
        sourceType: 'cloud',
        labelName: version.originalFileName || `${version.id}.mp3`
      });
    } else {
      candidateUrls.push({
        url: customUrlInput.trim(),
        sourceType: 'cloud',
        labelName: customUrlInput.split('/').pop()?.split('?')[0] || version.originalFileName
      });
    }
  }

  if (version.bundledUrl) {
    candidateUrls.push({
      url: version.bundledUrl,
      sourceType: 'bundled_cache',
      labelName: version.originalFileName
    });
  }

  let lastError: Error | null = null;
  for (const candidate of candidateUrls) {
    try {
      const response = await fetch(candidate.url, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      if (blob.size < 512) {
        throw new Error('下載之音檔內容過小或無效');
      }
      return await saveAudioBlobToDB(version.id, blob, candidate.sourceType, candidate.labelName);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('無法下載音檔，請確認網路連線或改用手機本地選檔匯入');
}

export function matchLocalFileToVersion(
  fileName: string,
  tracks: TrackButtonConfig[]
): { track: TrackButtonConfig; version: AudioVersion } | null {
  const cleanName = fileName.trim().toLowerCase();
  const baseNoExt = cleanName.replace(/\.(mpeg|mpg|mp3|wav|m4a|ogg|aac|flac)$/i, '');

  // 1. Exact or substring match on originalFileName
  for (const track of tracks) {
    for (const ver of track.versions) {
      const origLower = ver.originalFileName.toLowerCase();
      const origNoExt = origLower.replace(/\.(mpeg|mpg|mp3|wav|m4a|ogg|aac|flac)$/i, '');
      if (cleanName === origLower || baseNoExt === origNoExt) {
        return { track, version: ver };
      }
    }
  }

  // 2. Prefix code matching (e.g. 01A_, 01B_, 01_, 05C_)
  const prefixMatch = baseNoExt.match(/^(\d{2})([abc])?[_\-\s]/i);
  if (prefixMatch) {
    const trackCode = prefixMatch[1];
    const letter = (prefixMatch[2] || '').toUpperCase();
    const targetTrack = tracks.find((t) => t.code === trackCode);
    if (targetTrack) {
      if (targetTrack.code === '05') {
        const idx = letter === 'B' ? 1 : letter === 'C' ? 2 : 0;
        const ver = targetTrack.versions[idx] || targetTrack.versions[0];
        if (ver) return { track: targetTrack, version: ver };
      } else {
        const idx = letter === 'A' ? 1 : letter === 'B' ? 2 : 0;
        const ver = targetTrack.versions[idx] || targetTrack.versions[0];
        if (ver) return { track: targetTrack, version: ver };
      }
    }
  }

  return null;
}

export function loadSavedProfiles(): { profiles: PanelProfile[]; activeProfileId: string } {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PanelProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validActive = parsed.some((p) => p.id === activeId) ? activeId! : parsed[0].id;
        return { profiles: parsed, activeProfileId: validActive };
      }
    }
  } catch {
    // Fallback to defaults
  }
  return {
    profiles: DEFAULT_PROFILES,
    activeProfileId: DEFAULT_PROFILES[0].id
  };
}

export function saveProfilesToLocal(profiles: PanelProfile[], activeProfileId: string): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  } catch {
    // Ignore storage quota errors on metadata
  }
}
