import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Disc3,
  Layers,
  Lock,
  Play,
  Repeat,
  SlidersHorizontal,
  Square,
  Unlock,
  Volume2
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

const THEME_STYLES: Record<
  ButtonColorTheme,
  {
    idleBg: string;
    idleBorder: string;
    activeBg: string;
    activeBorder: string;
    progressFill: string;
    badgeBg: string;
    codeBg: string;
  }
> = {
  blue: {
    idleBg: 'bg-slate-900/90 hover:bg-slate-800/90',
    idleBorder: 'border-blue-500/40',
    activeBg: 'bg-blue-950/80',
    activeBorder: 'border-blue-400 ring-2 ring-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.35)]',
    progressFill: 'bg-blue-500/30',
    badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
    codeBg: 'bg-blue-600 text-white'
  },
  amber: {
    idleBg: 'bg-slate-900/90 hover:bg-slate-800/90',
    idleBorder: 'border-amber-500/40',
    activeBg: 'bg-amber-950/80',
    activeBorder: 'border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    progressFill: 'bg-amber-500/30',
    badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    codeBg: 'bg-amber-500 text-slate-950'
  },
  emerald: {
    idleBg: 'bg-slate-900/90 hover:bg-slate-800/90',
    idleBorder: 'border-emerald-500/40',
    activeBg: 'bg-emerald-950/80',
    activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    progressFill: 'bg-emerald-500/30',
    badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    codeBg: 'bg-emerald-500 text-slate-950'
  },
  purple: {
    idleBg: 'bg-slate-900/90 hover:bg-slate-800/90',
    idleBorder: 'border-purple-500/40',
    activeBg: 'bg-purple-950/80',
    activeBorder: 'border-purple-400 ring-2 ring-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.35)]',
    progressFill: 'bg-purple-500/30',
    badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    codeBg: 'bg-purple-600 text-white'
  },
  rose: {
    idleBg: 'bg-slate-900/90 hover:bg-slate-800/90',
    idleBorder: 'border-rose-500/40',
    activeBg: 'bg-rose-950/80',
    activeBorder: 'border-rose-400 ring-2 ring-rose-400/50 shadow-[0_0_25px_rgba(244,63,94,0.35)]',
    progressFill: 'bg-rose-500/30',
    badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    codeBg: 'bg-rose-600 text-white'
  },
  cyan: {
    idleBg: 'bg-slate-900/90 hover:bg-slate-800/90',
    idleBorder: 'border-cyan-500/40',
    activeBg: 'bg-cyan-950/80',
    activeBorder: 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.35)]',
    progressFill: 'bg-cyan-500/30',
    badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    codeBg: 'bg-cyan-500 text-slate-950'
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
  const [playingVersionId, setPlayingVersionId] = useState<string | null>(null);
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

  // Screen Wake Lock management (keeps screen awake or cleanly re-acquires when unlocked)
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
              src: new URL('./icon.svg', window.location.href).href,
              sizes: '512x512',
              type: 'image/svg+xml'
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

      // Pause current before switching source
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
          `播放失敗：${err instanceof Error ? err.message : '請長按按鈕檢查音源設定'}`
        );
      }
    },
    [requestWakeLock, stopPlayback, updateMediaSession]
  );

  // Audio element event handlers for progress & seamless background looping
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
    // Double guarantee for background screen-off looping on Android WebView/Chrome
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
    setPlaybackError('音檔載入異常，請長按按鈕切換版本或重新快取音檔');
    stopPlayback();
  };

  // Update helper for current profile
  const updateCurrentProfile = useCallback(
    (updater: (prof: PanelProfile) => PanelProfile) => {
      setProfiles((prev) =>
        prev.map((p) => (p.id === activeProfile.id ? updater(p) : p))
      );
    },
    [activeProfile.id]
  );

  // Global version switcher (0, 1, 2)
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

  // Single track version switch
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

  // Short tap handler: Immediate Play / Immediate Stop
  const handleShortTapTrack = (track: TrackButtonConfig) => {
    navigator.vibrate?.(15);
    if (playingTrackId === track.id) {
      stopPlayback();
    } else {
      startPlayback(track);
    }
  };

  // Pointer gesture handlers for Short-Tap vs Long-Press
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

  // Audio upload & download handlers
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

  // Track & Profile dynamic configuration handlers
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
    const colors: ButtonColorTheme[] = ['cyan', 'blue', 'amber', 'emerald', 'purple', 'rose'];
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

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#090d16] text-slate-100 select-none overflow-hidden">
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

      {/* 頂部控制列 */}
      <header className="shrink-0 px-3 pt-2.5 pb-2 bg-slate-950/90 border-b border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between gap-1.5">
          {/* 左側：情境快速切換下拉選單 */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 text-blue-400" />
            </div>
            <select
              aria-label="切換情境設定檔"
              value={activeProfile.id}
              onChange={(e) => {
                stopPlayback();
                setActiveProfileId(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700/90 rounded-xl px-2 py-1.5 text-xs font-bold text-white truncate max-w-[42vw] focus:outline-none focus:border-blue-500"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono">
              v{APP_VERSION}
            </span>
          </div>

          {/* 右側：循環播放開關、防誤觸鎖定、動態配置按鈕 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsLooping((prev) => !prev)}
              className={`px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 active:scale-95 transition ${
                isLooping
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="切換單曲無限循環播放"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isLooping ? '循環開' : '單次'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLocked((prev) => !prev)}
              className={`px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 active:scale-95 transition ${
                isLocked
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-amber-500/20 border-amber-400/60 text-amber-300'
              }`}
              title="切換演出鎖定或編輯模式"
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>鎖定</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  <span>調配</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow active:scale-95 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>配置</span>
            </button>
          </div>
        </div>

        {/* 第二列：全域版本一鍵切換列 */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {[
            { slot: 0, title: '全體切主版 / A', sub: '通用 / 比賽版' },
            { slot: 1, title: '全體切 A / B 版', sub: '搖滾 / Funk' },
            { slot: 2, title: '全體切 B / C 版', sub: '電音 / 史詩' }
          ].map((item) => {
            const isGlobalActive = activeProfile.globalSlotIndex === item.slot;
            return (
              <button
                key={item.slot}
                type="button"
                onClick={() => handleGlobalVersionSwitch(item.slot)}
                className={`py-1.5 px-2 rounded-lg text-center transition active:scale-95 ${
                  isGlobalActive
                    ? 'bg-blue-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <div className="text-xs truncate">{item.title}</div>
                <div
                  className={`text-[10px] truncate ${
                    isGlobalActive ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {item.sub}
                </div>
              </button>
            );
          })}
        </div>
      </header>

      {/* 錯誤提示列（若有） */}
      {playbackError && (
        <div className="shrink-0 px-3 py-1.5 bg-rose-950 border-b border-rose-700 text-rose-200 text-xs flex items-center justify-between">
          <span className="truncate">{playbackError}</span>
          <button
            type="button"
            onClick={() => setPlaybackError(null)}
            className="text-rose-300 font-bold ml-2 shrink-0"
          >
            關閉
          </button>
        </div>
      )}

      {/* 主體：滿版大按鈕區（自動填滿剩餘螢幕高度，免捲動，短按即播即停，長按切版本） */}
      <main
        className={`flex-1 min-h-0 p-2.5 grid gap-2.5 ${
          activeProfile.gridColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'
        }`}
        style={{
          gridAutoRows: '1fr'
        }}
      >
        {visibleTracks.map((track) => {
          const isPlaying = playingTrackId === track.id;
          const activeVer =
            track.versions[track.activeVersionIndex] || track.versions[0];
          const theme = THEME_STYLES[track.colorTheme] || THEME_STYLES.blue;
          const isCached = activeVer ? Boolean(cachedMetaMap[activeVer.id]) : false;

          return (
            <div
              key={track.id}
              role="button"
              tabIndex={0}
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
              className={`relative rounded-2xl border-2 overflow-hidden flex flex-col justify-between p-3.5 transition-all duration-150 active:scale-[0.985] cursor-pointer ${
                isPlaying
                  ? `${theme.activeBg} ${theme.activeBorder}`
                  : `${theme.idleBg} ${theme.idleBorder}`
              }`}
            >
              {/* 播放中底色進度條（內嵌於按鈕背景，不佔用額外版面） */}
              {isPlaying && (
                <div
                  className={`absolute inset-y-0 left-0 pointer-events-none transition-all duration-150 ${theme.progressFill}`}
                  style={{ width: `${progressPercent}%` }}
                />
              )}

              {/* 上半部：編號、主曲名、當前版本膠囊 */}
              <div className="relative z-10 flex items-start justify-between gap-2 w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow ${theme.codeBg}`}
                  >
                    {isPlaying ? (
                      <Square className="w-5 h-5 fill-current animate-pulse" />
                    ) : (
                      track.code
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                        {track.title}
                      </h2>
                      {isPlaying && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950 animate-pulse shrink-0">
                          <Disc3 className="w-3 h-3 animate-spin" />
                          <span>{isLooping ? '循環播放中' : '播放中'}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300/90 truncate mt-0.5">
                      {track.subtitle}
                    </p>
                  </div>
                </div>

                {/* 右側：目前版本顯示標籤（若處於未鎖定調配模式，點擊可直接開啟版本選單） */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    if (!isLocked) {
                      e.stopPropagation();
                    }
                  }}
                  onClick={(e) => {
                    if (!isLocked) {
                      e.stopPropagation();
                      setLongPressTrackId(track.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 shrink-0 ${theme.badgeBg}`}
                >
                  <Layers className="w-3.5 h-3.5 opacity-80" />
                  <span>{activeVer?.shortBadge || '預設'}</span>
                </button>
              </div>

              {/* 下半部：音檔狀態與即時秒數 / 長按提示 */}
              <div className="relative z-10 flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 w-full">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span className="truncate font-mono opacity-85">
                    {activeVer?.originalFileName}
                  </span>
                  {isCached && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 text-[10px] shrink-0">
                      離線快取
                    </span>
                  )}
                </div>

                <div className="shrink-0 font-mono font-semibold">
                  {isPlaying ? (
                    <span className="text-white bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-700">
                      {formatTime(currentTime)} / {formatTime(duration)}（點擊即停）
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Play className="w-3 h-3 fill-current" />
                      <span>短按即播・長按切版</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

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

      {/* 頂部「配置/音源」彈出之動態按鈕調配與本地/雲端批次快取視窗 */}
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
