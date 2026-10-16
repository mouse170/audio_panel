import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Layers,
  Lock,
  Pause,
  Play,
  Repeat,
  Settings,
  SlidersHorizontal,
  Unlock
} from 'lucide-react';
import {
  AudioVersion,
  ButtonColorTheme,
  CachedAudioMeta,
  PanelProfile,
  TrackButtonConfig
} from './types';
import { APP_VERSION, cloneTracks, DEFAULT_PROFILES } from './defaultData';
import {
  clearAllAudioBlobsInDB,
  deleteAudioBlobFromDB,
  downloadAndCacheAudioVersion,
  getAllCachedAudioMeta,
  getAudioBlobFromDB,
  loadSavedProfiles,
  matchLocalFileToVersion,
  saveAudioBlobToDB,
  saveProfilesToLocal
} from './storage';
import { TrackLongPressSheet } from './components/TrackLongPressSheet';
import { ConfigAndCloudModal } from './components/ConfigAndCloudModal';

/* Cohesive single-hue Material Design 3 Light Blue tonal hierarchy */
const M3_ACCENT_STYLES: Record<
  ButtonColorTheme,
  {
    codeBadge: string;
    chipStyle: string;
  }
> = {
  blue: {
    codeBadge: 'bg-primary text-on-primary',
    chipStyle: 'bg-primary-fixed/85 text-on-primary-fixed border-primary/20'
  },
  cyan: {
    codeBadge: 'bg-tertiary text-on-tertiary',
    chipStyle: 'bg-tertiary-fixed/85 text-on-tertiary-fixed border-tertiary/20'
  },
  emerald: {
    codeBadge: 'bg-tertiary-container text-on-tertiary-container',
    chipStyle: 'bg-tertiary-fixed/85 text-on-tertiary-fixed border-tertiary/20'
  },
  amber: {
    codeBadge: 'bg-secondary text-on-secondary',
    chipStyle: 'bg-secondary-container/90 text-on-secondary-container border-secondary/20'
  },
  purple: {
    codeBadge: 'bg-primary-container text-on-primary-container',
    chipStyle: 'bg-primary-fixed/85 text-on-primary-fixed border-primary/20'
  },
  rose: {
    codeBadge: 'bg-on-primary-fixed-variant text-on-primary',
    chipStyle: 'bg-primary-fixed text-on-primary-fixed border-primary/30'
  }
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const App: React.FC = () => {
  const initialData = useMemo(() => loadSavedProfiles(), []);
  const [profiles, setProfiles] = useState<PanelProfile[]>(initialData.profiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(initialData.activeProfileId);
  const [cachedMetaMap, setCachedMetaMap] = useState<Record<string, CachedAudioMeta>>({});
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [, setPlayingVersionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Modals state
  const [longPressTrackId, setLongPressTrackId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Persistent DOM Audio Element & ObjectURL & WakeLock Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isLoopingRef = useRef<boolean>(isLooping);

  useEffect(() => {
    isLoopingRef.current = isLooping;
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Long press gesture refs
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId]
  );

  const visibleTracks = useMemo(
    () => activeProfile.tracks.filter((t) => t.visible),
    [activeProfile]
  );

  const selectedModalTrack = useMemo(
    () => activeProfile.tracks.find((t) => t.id === longPressTrackId) || null,
    [activeProfile, longPressTrackId]
  );

  useEffect(() => {
    saveProfilesToLocal(profiles, activeProfileId);
  }, [profiles, activeProfileId]);

  useEffect(() => {
    getAllCachedAudioMeta().then(setCachedMetaMap);
  }, []);

  // Screen Wake Lock management
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        // Ignore if battery saver blocks wakeLock
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && playingTrackId) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playingTrackId, requestWakeLock]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
    releaseWakeLock();
    setPlayingTrackId(null);
    setPlayingVersionId(null);
    setCurrentTime(0);
    setDuration(0);
  }, [releaseWakeLock]);

  const updateMediaSession = useCallback(
    (track: TrackButtonConfig, version: AudioVersion) => {
      if (!('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${track.code}. ${track.title}（${version.shortBadge}）`,
          artist: track.subtitle,
          album: activeProfile.name,
          artwork: [
            {
              src: new URL('./favicon.png', window.location.href).href,
              sizes: '256x256',
              type: 'image/png'
            }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', async () => {
          if (audioRef.current) {
            await audioRef.current.play();
            navigator.mediaSession.playbackState = 'playing';
          }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          stopPlayback();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stopPlayback();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (audioRef.current && details.seekTime !== undefined) {
            audioRef.current.currentTime = details.seekTime;
          }
        });
      } catch {
        // Ignore unsupported mediaSession actions
      }
    },
    [activeProfile.name, stopPlayback]
  );

  const startPlayback = useCallback(
    async (track: TrackButtonConfig, forceVersionIndex?: number) => {
      setPlaybackError(null);
      const verIdx =
        forceVersionIndex !== undefined ? forceVersionIndex : track.activeVersionIndex;
      const version = track.versions[verIdx] || track.versions[0];
      if (!version) return;

      const audio = audioRef.current;
      if (!audio) return;

      audio.pause();
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }

      try {
        let playSrc = version.bundledUrl;
        const cachedRecord = await getAudioBlobFromDB(version.id);
        if (cachedRecord && cachedRecord.blob) {
          const objUrl = URL.createObjectURL(cachedRecord.blob);
          activeObjectUrlRef.current = objUrl;
          playSrc = objUrl;
        } else if (version.customRemoteUrl && !version.bundledUrl) {
          playSrc = version.customRemoteUrl;
        }

        if (!playSrc) {
          throw new Error(`尚未為「${track.title} (${version.shortBadge})」綁定音檔`);
        }

        audio.loop = isLoopingRef.current;
        audio.src = playSrc;
        audio.currentTime = 0;

        setPlayingTrackId(track.id);
        setPlayingVersionId(version.id);

        await audio.play();
        updateMediaSession(track, version);
        requestWakeLock();
      } catch (err) {
        stopPlayback();
        setPlaybackError(
          `無法播放音檔：${err instanceof Error ? err.message : '請長按按鈕檢查音源設定'}`
        );
      }
    },
    [requestWakeLock, stopPlayback, updateMediaSession]
  );

  const handleAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime || 0);
  };

  const handleAudioLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
  };

  const handleAudioEnded = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isLoopingRef.current) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        stopPlayback();
      });
    } else {
      stopPlayback();
    }
  };

  const handleAudioError = () => {
    if (!playingTrackId) return;
    setPlaybackError('音檔載入失敗，請長按按鈕切換版本或重新快取音檔。');
    stopPlayback();
  };

  const updateCurrentProfile = useCallback(
    (updater: (prof: PanelProfile) => PanelProfile) => {
      setProfiles((prev) =>
        prev.map((p) => (p.id === activeProfile.id ? updater(p) : p))
      );
    },
    [activeProfile.id]
  );

  const handleGlobalVersionSwitch = (slotIdx: number) => {
    navigator.vibrate?.(20);
    updateCurrentProfile((prof) => ({
      ...prof,
      globalSlotIndex: slotIdx,
      tracks: prof.tracks.map((t) => ({
        ...t,
        activeVersionIndex: Math.min(slotIdx, Math.max(0, t.versions.length - 1))
      }))
    }));
  };

  const handleSelectTrackVersion = (
    trackId: string,
    versionIndex: number,
    playImmediately: boolean
  ) => {
    const targetTrack = activeProfile.tracks.find((t) => t.id === trackId);
    updateCurrentProfile((prof) => ({
      ...prof,
      globalSlotIndex: null,
      tracks: prof.tracks.map((t) =>
        t.id === trackId ? { ...t, activeVersionIndex: versionIndex } : t
      )
    }));

    if (playImmediately && targetTrack) {
      startPlayback(targetTrack, versionIndex);
    } else if (playingTrackId === trackId && targetTrack) {
      startPlayback(targetTrack, versionIndex);
    }
  };

  const handleShortTapTrack = (track: TrackButtonConfig) => {
    navigator.vibrate?.(15);
    if (playingTrackId === track.id) {
      stopPlayback();
    } else {
      startPlayback(track);
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, track: TrackButtonConfig) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isLongPressTriggeredRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      navigator.vibrate?.(45);
      setLongPressTrackId(track.id);
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current || longPressTimerRef.current === null) return;
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    if (dx > 12 || dy > 12) {
      clearLongPressTimer();
    }
  };

  const handlePointerUp = (track: TrackButtonConfig) => {
    const wasLongPress = isLongPressTriggeredRef.current;
    clearLongPressTimer();
    pointerStartPosRef.current = null;
    if (!wasLongPress) {
      handleShortTapTrack(track);
    }
  };

  const handleUploadLocalFile = async (
    _trackId: string,
    versionId: string,
    file: File
  ) => {
    const meta = await saveAudioBlobToDB(versionId, file, 'local', file.name);
    setCachedMetaMap((prev) => ({ ...prev, [versionId]: meta }));
  };

  const handleDownloadUrlToVersion = async (
    trackId: string,
    version: AudioVersion,
    customUrl?: string
  ) => {
    const meta = await downloadAndCacheAudioVersion(version, customUrl);
    setCachedMetaMap((prev) => ({ ...prev, [version.id]: meta }));
    if (customUrl && customUrl.trim()) {
      updateCurrentProfile((prof) => ({
        ...prof,
        tracks: prof.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                versions: t.versions.map((v) =>
                  v.id === version.id ? { ...v, customRemoteUrl: customUrl.trim() } : v
                )
              }
            : t
        )
      }));
    }
  };

  const handleResetVersionCache = async (versionId: string) => {
    await deleteAudioBlobFromDB(versionId);
    setCachedMetaMap((prev) => {
      const next = { ...prev };
      delete next[versionId];
      return next;
    });
  };

  const handleBatchCacheAllTracks = async (
    onProgress: (done: number, total: number, label: string) => void
  ) => {
    const allVersions: { trackTitle: string; ver: AudioVersion }[] = [];
    for (const t of activeProfile.tracks) {
      for (const v of t.versions) {
        allVersions.push({ trackTitle: t.title, ver: v });
      }
    }

    let count = 0;
    for (const item of allVersions) {
      count += 1;
      onProgress(count, allVersions.length, `${item.trackTitle} - ${item.ver.shortBadge}`);
      const meta = await downloadAndCacheAudioVersion(
        item.ver,
        item.ver.customRemoteUrl
      );
      setCachedMetaMap((prev) => ({ ...prev, [item.ver.id]: meta }));
    }
  };

  const handleBatchImportLocalFiles = async (
    files: FileList
  ): Promise<{ matched: number; unmatched: string[] }> => {
    let matched = 0;
    const unmatched: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = matchLocalFileToVersion(file.name, activeProfile.tracks);
      if (match) {
        const meta = await saveAudioBlobToDB(
          match.version.id,
          file,
          'local',
          file.name
        );
        setCachedMetaMap((prev) => ({ ...prev, [match.version.id]: meta }));
        matched += 1;
      } else {
        unmatched.push(file.name);
      }
    }

    return { matched, unmatched };
  };

  const handleUpdateTrackMeta = (
    trackId: string,
    updated: Partial<TrackButtonConfig>
  ) => {
    updateCurrentProfile((prof) => ({
      ...prof,
      tracks: prof.tracks.map((t) => (t.id === trackId ? { ...t, ...updated } : t))
    }));
  };

  const handleAddVersionToTrack = (
    trackId: string,
    label: string,
    shortBadge: string
  ) => {
    updateCurrentProfile((prof) => ({
      ...prof,
      tracks: prof.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const newIdx = t.versions.length;
        const newVer: AudioVersion = {
          id: `${t.code}_v${Date.now()}`,
          slotIndex: newIdx,
          label,
          shortBadge,
          styleInfo: '自訂新增版本',
          originalFileName: `${t.code}_${shortBadge}.mp3`,
          bundledUrl: t.versions[0]?.bundledUrl || '',
          driveFileId: ''
        };
        return {
          ...t,
          versions: [...t.versions, newVer],
          activeVersionIndex: newIdx
        };
      })
    }));
  };

  const handleDeleteVersionFromTrack = (trackId: string, versionId: string) => {
    updateCurrentProfile((prof) => ({
      ...prof,
      tracks: prof.tracks.map((t) => {
        if (t.id !== trackId || t.versions.length <= 1) return t;
        const filtered = t.versions.filter((v) => v.id !== versionId);
        return {
          ...t,
          versions: filtered,
          activeVersionIndex: Math.min(t.activeVersionIndex, filtered.length - 1)
        };
      })
    }));
  };

  const handleMoveTrack = (trackIndex: number, direction: 'up' | 'down') => {
    updateCurrentProfile((prof) => {
      const list = [...prof.tracks];
      const targetIdx = direction === 'up' ? trackIndex - 1 : trackIndex + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prof;
      const temp = list[trackIndex];
      list[trackIndex] = list[targetIdx];
      list[targetIdx] = temp;
      return { ...prof, tracks: list };
    });
  };

  const handleToggleTrackVisible = (trackId: string) => {
    updateCurrentProfile((prof) => {
      const visibleNow = prof.tracks.filter((t) => t.visible);
      return {
        ...prof,
        tracks: prof.tracks.map((t) => {
          if (t.id !== trackId) return t;
          if (t.visible && visibleNow.length <= 1) return t;
          return { ...t, visible: !t.visible };
        })
      };
    });
  };

  const handleAddNewTrack = (code: string, title: string, subtitle: string) => {
    const colors: ButtonColorTheme[] = ['blue', 'cyan', 'emerald', 'amber', 'purple', 'rose'];
    const color = colors[activeProfile.tracks.length % colors.length];
    const id = `track_${Date.now()}`;
    const newTrack: TrackButtonConfig = {
      id,
      code,
      title,
      subtitle,
      colorTheme: color,
      visible: true,
      activeVersionIndex: 0,
      versions: [
        {
          id: `${id}_v0`,
          slotIndex: 0,
          label: '主版：預設音源',
          shortBadge: '預設版',
          styleInfo: '自訂曲目音源',
          originalFileName: `${code}_${title}.mp3`,
          bundledUrl: './audio/01_default.mp3',
          driveFileId: ''
        }
      ],
      lyrics: `【${code}：${title}】\n用途：${subtitle}`
    };
    updateCurrentProfile((prof) => ({
      ...prof,
      tracks: [...prof.tracks, newTrack]
    }));
  };

  const handleDeleteTrack = (trackId: string) => {
    if (playingTrackId === trackId) stopPlayback();
    updateCurrentProfile((prof) => {
      if (prof.tracks.length <= 1) return prof;
      return {
        ...prof,
        tracks: prof.tracks.filter((t) => t.id !== trackId)
      };
    });
  };

  const handleCreateProfile = (name: string, description: string) => {
    const newId = `profile_${Date.now()}`;
    const newProf: PanelProfile = {
      id: newId,
      name,
      description,
      gridColumns: activeProfile.gridColumns,
      globalSlotIndex: activeProfile.globalSlotIndex,
      tracks: cloneTracks(activeProfile.tracks)
    };
    setProfiles((prev) => [...prev, newProf]);
    setActiveProfileId(newId);
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfiles((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((p) => p.id !== profileId);
      if (activeProfileId === profileId) {
        setActiveProfileId(filtered[0].id);
      }
      return filtered;
    });
  };

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full max-w-screen-md mx-auto flex flex-col justify-between text-on-surface select-none overflow-hidden relative antialiased">
      {/* 掛載於 DOM 之持久音訊核心：支援原生無縫循環與 Android 螢幕熄滅背景前景服務 */}
      <audio
        ref={audioRef}
        loop={isLooping}
        preload="auto"
        playsInline
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        className="hidden"
      />

      {/* 1. COMPACT M3 TOP APP BAR */}
      <header className="shrink-0 px-3.5 pt-2.5 pb-1.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Custom-Styled M3 Scene Profile Selector Pill */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative flex items-center bg-surface-container/90 hover:bg-surface-container-high transition duration-200 rounded-full border border-outline-variant/60 shadow-sm max-w-full">
              <SlidersHorizontal
                className="w-4 h-4 text-primary ml-3 pointer-events-none shrink-0"
                strokeWidth={2}
              />
              <select
                aria-label="切換情境設定檔"
                value={activeProfile.id}
                onChange={(e) => {
                  stopPlayback();
                  setActiveProfileId(e.target.value);
                }}
                className="appearance-none bg-transparent pl-2 pr-7 py-1.5 text-xs font-semibold text-on-surface truncate max-w-[44vw] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[var(--card)] text-on-surface">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-on-surface-variant right-2.5 absolute pointer-events-none"
                strokeWidth={2}
              />
            </div>
            <span className="hidden sm:inline-block text-[10px] text-on-surface-variant font-mono tabular-nums font-medium">
              v{APP_VERSION}
            </span>
          </div>

          {/* Right: M3 Tactical Chips & Quick Action Group */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active Loop Indicator Chip */}
            <button
              type="button"
              onClick={() => setIsLooping((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isLooping
                  ? 'bg-primary-fixed text-on-primary-fixed border border-primary/25 shadow-sm'
                  : 'bg-surface-container-high/80 text-on-surface-variant border border-outline-variant/60'
              }`}
              title="切換單曲無限循環播放"
            >
              <Repeat className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
              <span>{isLooping ? '循環開' : '單次'}</span>
            </button>

            {/* Lock Toggle Chip */}
            <button
              type="button"
              onClick={() => setIsLocked((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isLocked
                  ? 'bg-surface-container-high/80 text-on-surface-variant border-outline-variant/60'
                  : 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/30'
              }`}
              title="切換演出鎖定或編輯模式"
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                  <span>鎖定</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-tertiary" strokeWidth={2} />
                  <span>調配</span>
                </>
              )}
            </button>

            {/* Config Button */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              aria-label="配置與音源設定"
              className="w-8 h-8 rounded-full bg-primary text-on-primary hover:bg-primary-container flex items-center justify-center shadow-sm active:scale-95 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <Settings className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 2. M3 SEGMENTED BUTTON BAR (Global Version Switching) */}
        <nav aria-label="全域版本切換">
          <div className="grid grid-cols-3 p-0.5 rounded-full bg-surface-container/90 border border-outline-variant/60 items-center text-center">
            {[
              { slot: 0, title: '全體切主版 / A' },
              { slot: 1, title: '全體切 A / B 版' },
              { slot: 2, title: '全體切 B / C 版' }
            ].map((item) => {
              const isGlobalActive = activeProfile.globalSlotIndex === item.slot;
              return (
                <button
                  key={item.slot}
                  type="button"
                  onClick={() => handleGlobalVersionSwitch(item.slot)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-full text-xs transition duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isGlobalActive
                      ? 'bg-primary text-on-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  {isGlobalActive && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* 錯誤提示列（若有） */}
      {playbackError && (
        <div
          role="alert"
          className="shrink-0 mx-3.5 mb-1 px-3.5 py-2 rounded-xl bg-error-container border border-error/30 text-on-error-container text-xs flex items-center justify-between"
        >
          <span className="truncate font-medium">{playbackError}</span>
          <button
            type="button"
            onClick={() => setPlaybackError(null)}
            className="font-semibold ml-2 shrink-0 underline"
          >
            關閉
          </button>
        </div>
      )}

      {/* 3. MAIN SOUNDBOARD MATRIX: 5 TACTILE FULL-HEIGHT M3 PADS */}
      <main
        id="soundboard-main"
        className={`flex-1 min-h-0 px-3.5 pt-1 pb-2 grid gap-2 overflow-hidden ${
          activeProfile.gridColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'
        }`}
        style={{
          gridAutoRows: '1fr'
        }}
      >
        {visibleTracks.map((track, idx) => {
          const isPlaying = playingTrackId === track.id;
          const activeVer =
            track.versions[track.activeVersionIndex] || track.versions[0];
          const accent = M3_ACCENT_STYLES[track.colorTheme] || M3_ACCENT_STYLES.blue;
          const isCached = activeVer ? Boolean(cachedMetaMap[activeVer.id]) : false;

          return (
            <article
              key={track.id}
              role="button"
              tabIndex={0}
              style={{ animationDelay: `${idx * 45}ms` }}
              onPointerDown={(e) => handlePointerDown(e, track)}
              onPointerMove={handlePointerMove}
              onPointerUp={() => handlePointerUp(track)}
              onPointerCancel={clearLongPressTimer}
              onContextMenu={(e) => {
                e.preventDefault();
                clearLongPressTimer();
                setLongPressTrackId(track.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleShortTapTrack(track);
                }
              }}
              className={`min-h-0 relative rounded-[22px] flex flex-col justify-between px-3.5 pt-2.5 pb-3 overflow-hidden tactile-pad cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isPlaying
                  ? 'm3-surface-active border-2 border-primary'
                  : 'm3-surface-idle border border-outline-variant/65'
              }`}
            >
              {/* GPU-Accelerated Live Progress Background Track (transform: scaleX instead of width) */}
              {isPlaying && (
                <>
                  <div
                    className="absolute inset-0 bg-primary-fixed/55 origin-left will-change-transform pointer-events-none transition-transform duration-150 ease-linear"
                    style={{ transform: `scaleX(${progressRatio})` }}
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary pointer-events-none" />
                </>
              )}

              {/* Card Top: Squircle Number, Track Title, Subtitle & Version Assist Chip */}
              <div className="relative z-10 flex items-start justify-between gap-2 w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-[11px] font-mono tabular-nums font-bold text-sm flex items-center justify-center shrink-0 shadow-sm ${accent.codeBadge}`}
                  >
                    {track.code}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <h2 className="font-display text-lg sm:text-xl font-bold tracking-[-0.02em] text-on-surface truncate">
                        {track.title}
                      </h2>
                      <span className="text-xs font-medium text-on-surface-variant truncate">
                        ({track.subtitle})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: GPU-Animated Equalizer + Version Assist Chip */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isPlaying && (
                    <div className="flex items-center gap-1 bg-primary text-on-primary rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm">
                      <div className="flex items-end gap-[2px] h-3 mr-0.5">
                        <span className="w-[2.5px] h-3 bg-[var(--primary-foreground)] rounded-full eq-bar-1" />
                        <span className="w-[2.5px] h-3 bg-[var(--primary-foreground)] rounded-full eq-bar-2" />
                        <span className="w-[2.5px] h-3 bg-[var(--primary-foreground)] rounded-full eq-bar-3" />
                      </div>
                      <span>{isLooping ? '循環中' : '播放中'}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (!isLocked) e.stopPropagation();
                    }}
                    onClick={(e) => {
                      if (!isLocked) {
                        e.stopPropagation();
                        setLongPressTrackId(track.id);
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${accent.chipStyle}`}
                  >
                    <Layers className="w-3 h-3 opacity-80" strokeWidth={2} />
                    <span>{activeVer?.shortBadge || '預設'}</span>
                  </button>
                </div>
              </div>

              {/* Card Bottom: Tabular Timecode / Audio Filename & Optical-Aligned M3 Trigger */}
              <div className="relative z-10 flex items-center justify-between gap-2 pt-1.5 border-t border-outline-variant/30 mt-auto w-full">
                <div className="flex items-center gap-2 min-w-0 truncate tabular-nums">
                  {isPlaying ? (
                    <span className="font-mono text-xs font-bold text-on-surface tabular-nums">
                      {formatTime(currentTime)}{' '}
                      <span className="text-on-surface-variant font-normal">
                        / {formatTime(duration)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-on-surface-variant truncate">
                      {activeVer?.originalFileName}
                    </span>
                  )}

                  {isCached && (
                    <span className="px-2 py-0.5 rounded-md bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-semibold shrink-0">
                      離線快取
                    </span>
                  )}
                </div>

                {/* Right: M3 Filled Tonal Trigger Pill */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isPlaying ? (
                    <div className="h-8 px-3.5 rounded-full bg-primary text-on-primary flex items-center gap-1.5 text-xs font-semibold shadow-sm">
                      <Pause className="w-3.5 h-3.5 fill-current" strokeWidth={2} />
                      <span>點擊即停</span>
                    </div>
                  ) : (
                    <div className="h-8 px-3.5 rounded-full bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed flex items-center gap-1.5 text-xs font-semibold shadow-sm transition duration-200">
                      <Play
                        className="w-3.5 h-3.5 fill-current text-primary translate-x-[0.5px]"
                        strokeWidth={2}
                      />
                      <span>短按播放・長按切版</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* 4. ANDROID GESTURE HOME INDICATOR */}
      <footer className="w-full py-1 flex justify-center items-center shrink-0">
        <div className="w-20 h-1 bg-outline-variant/80 rounded-full" />
      </footer>

      {/* 長按單曲彈出之版本切換、應援歌詞與單曲音源設定視窗 */}
      <TrackLongPressSheet
        track={selectedModalTrack}
        isOpen={Boolean(selectedModalTrack)}
        onClose={() => setLongPressTrackId(null)}
        cachedMetaMap={cachedMetaMap}
        isPlayingThisTrack={
          Boolean(selectedModalTrack) && playingTrackId === selectedModalTrack?.id
        }
        onSelectVersion={handleSelectTrackVersion}
        onUploadLocalFile={handleUploadLocalFile}
        onDownloadUrlToVersion={handleDownloadUrlToVersion}
        onResetVersionCache={handleResetVersionCache}
        onUpdateTrackMeta={handleUpdateTrackMeta}
        onAddVersionToTrack={handleAddVersionToTrack}
        onDeleteVersionFromTrack={handleDeleteVersionFromTrack}
      />

      {/* 頂部「配置」彈出之動態按鈕調配與本地/雲端批次快取視窗 */}
      <ConfigAndCloudModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        cachedMetaMap={cachedMetaMap}
        onSelectProfile={(id) => {
          stopPlayback();
          setActiveProfileId(id);
        }}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onUpdateActiveProfile={(updated) =>
          updateCurrentProfile((prof) => ({ ...prof, ...updated }))
        }
        onMoveTrack={handleMoveTrack}
        onToggleTrackVisible={handleToggleTrackVisible}
        onAddNewTrack={handleAddNewTrack}
        onDeleteTrack={handleDeleteTrack}
        onBatchCacheAllTracks={handleBatchCacheAllTracks}
        onBatchImportLocalFiles={handleBatchImportLocalFiles}
        onClearAllCache={async () => {
          await clearAllAudioBlobsInDB();
          setCachedMetaMap({});
        }}
        onResetFactoryProfiles={() => {
          stopPlayback();
          setProfiles(DEFAULT_PROFILES);
          setActiveProfileId(DEFAULT_PROFILES[0].id);
        }}
        onImportProfilesJson={(jsonText) => {
          try {
            const parsed = JSON.parse(jsonText) as PanelProfile[];
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].tracks) {
              stopPlayback();
              setProfiles(parsed);
              setActiveProfileId(parsed[0].id);
              return true;
            }
            return false;
          } catch {
            return false;
          }
        }}
      />
    </div>
  );
};

export default App;
