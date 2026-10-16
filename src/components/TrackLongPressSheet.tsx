import React, { useRef, useState } from 'react';
import {
  Check,
  CloudDownload,
  FileText,
  FolderUp,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Trash2
} from 'lucide-react';
import { AudioVersion, ButtonColorTheme, CachedAudioMeta, TrackButtonConfig } from '../types';
import { NativeModal } from './NativeModal';

interface TrackLongPressSheetProps {
  track: TrackButtonConfig | null;
  isOpen: boolean;
  onClose: () => void;
  cachedMetaMap: Record<string, CachedAudioMeta>;
  isPlayingThisTrack: boolean;
  onSelectVersion: (trackId: string, versionIndex: number, playImmediately: boolean) => void;
  onUploadLocalFile: (trackId: string, versionId: string, file: File) => Promise<void>;
  onDownloadUrlToVersion: (trackId: string, version: AudioVersion, customUrl?: string) => Promise<void>;
  onResetVersionCache: (versionId: string) => Promise<void>;
  onUpdateTrackMeta: (trackId: string, updated: Partial<TrackButtonConfig>) => void;
  onAddVersionToTrack: (trackId: string, label: string, shortBadge: string) => void;
  onDeleteVersionFromTrack: (trackId: string, versionId: string) => void;
}

const COLOR_OPTIONS: { value: ButtonColorTheme; label: string }[] = [
  { value: 'blue', label: 'M3 經典淡藍' },
  { value: 'cyan', label: 'M3 冰川青藍' },
  { value: 'emerald', label: 'M3 薄荷青綠' },
  { value: 'amber', label: 'M3 暖陽琥珀' },
  { value: 'purple', label: 'M3 薰衣草紫' },
  { value: 'rose', label: 'M3 珊瑚玫瑰' }
];

export const TrackLongPressSheet: React.FC<TrackLongPressSheetProps> = ({
  track,
  isOpen,
  onClose,
  cachedMetaMap,
  onSelectVersion,
  onUploadLocalFile,
  onDownloadUrlToVersion,
  onResetVersionCache,
  onUpdateTrackMeta,
  onAddVersionToTrack,
  onDeleteVersionFromTrack
}) => {
  const [activeTab, setActiveTab] = useState<'versions' | 'lyrics' | 'config'>('versions');
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [newVerLabel, setNewVerLabel] = useState('');
  const [newVerBadge, setNewVerBadge] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetUploadVerId, setTargetUploadVerId] = useState<string | null>(null);

  if (!track) return null;

  const handleTriggerLocalPick = (versionId: string) => {
    setTargetUploadVerId(versionId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadVerId) return;
    setBusyVersionId(targetUploadVerId);
    setStatusMsg(null);
    try {
      await onUploadLocalFile(track.id, targetUploadVerId, file);
      setStatusMsg(`已匯入手機本地音檔：${file.name}`);
    } catch (err) {
      setStatusMsg(`匯入失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyVersionId(null);
    }
  };

  const handleDownloadClick = async (ver: AudioVersion) => {
    setBusyVersionId(ver.id);
    setStatusMsg(null);
    try {
      const customUrl = urlInputs[ver.id] ?? ver.customRemoteUrl ?? '';
      await onDownloadUrlToVersion(track.id, ver, customUrl);
      setStatusMsg(`已下載並寫入離線快取：${ver.shortBadge}`);
    } catch (err) {
      setStatusMsg(`下載失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyVersionId(null);
    }
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${track.code}. ${track.title}`}
      subtitle={`目前版本：${track.versions[track.activeVersionIndex]?.label || '未指定'} ｜ ${track.subtitle}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/mpeg,.mp3,.mpeg,.mpg,.wav,.m4a,.ogg,.aac,.flac"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* M3 Segmented Pill Bar */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container rounded-full border border-outline-variant/60 mb-3.5">
        <button
          type="button"
          onClick={() => setActiveTab('versions')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-full text-xs font-bold transition ${
            activeTab === 'versions'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>版本 ({track.versions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lyrics')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-full text-xs font-bold transition ${
            activeTab === 'lyrics'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>應援歌詞</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-full text-xs font-bold transition ${
            activeTab === 'config'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>按鈕調配</span>
        </button>
      </div>

      {statusMsg && (
        <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-primary-fixed text-on-primary-fixed border border-primary/30 text-xs font-medium">
          {statusMsg}
        </div>
      )}

      {/* 分頁 1：版本切換與單曲音源綁定 */}
      {activeTab === 'versions' && (
        <div className="space-y-2.5">
          {track.versions.map((ver, idx) => {
            const isSelected = track.activeVersionIndex === idx;
            const cachedMeta = cachedMetaMap[ver.id];
            const isExpanded = expandedVersionId === ver.id;
            const isBusy = busyVersionId === ver.id;

            return (
              <div
                key={ver.id}
                className={`rounded-2xl border transition ${
                  isSelected
                    ? 'bg-primary-fixed/40 border-primary shadow-sm'
                    : 'bg-surface-container-low border-outline-variant/60'
                }`}
              >
                <div className="p-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVersion(track.id, idx, false);
                      onClose();
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <span className="font-bold text-sm text-on-surface truncate">
                        {ver.label}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-primary-fixed text-on-primary-fixed shrink-0">
                        {ver.shortBadge}
                      </span>
                    </div>
                    <div className="mt-1 pl-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-on-surface-variant">
                      <span className="truncate font-mono">{ver.originalFileName}</span>
                      {cachedMeta ? (
                        <span className="text-tertiary font-bold">
                          [{cachedMeta.sourceType === 'local' ? '手機本地檔' : '已快取'} {(cachedMeta.size / 1024 / 1024).toFixed(1)} MB]
                        </span>
                      ) : (
                        <span className="text-primary font-semibold">[內建音源就緒]</span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectVersion(track.id, idx, true);
                        onClose();
                      }}
                      title="切換並立即播放"
                      className="px-3 py-2 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>即播</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedVersionId(isExpanded ? null : ver.id)}
                      className="px-3 py-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold active:scale-95 transition"
                    >
                      音源
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-2.5 border-t border-outline-variant/50 bg-surface-container/60 space-y-2.5 text-xs rounded-b-2xl">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTriggerLocalPick(ver.id)}
                        className="flex-1 py-2 px-3 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-sm"
                      >
                        <FolderUp className="w-4 h-4" />
                        <span>選取手機本地音檔 (.mpeg/.mp3)</span>
                      </button>
                      {cachedMeta && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            await onResetVersionCache(ver.id);
                            setStatusMsg(`已還原為預設內建音源：${ver.shortBadge}`);
                          }}
                          className="py-2 px-3 rounded-full bg-surface-container-highest text-on-surface font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>還原預設</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-on-surface-variant">
                        網路音檔 URL 或 Google Drive 檔案連結 / ID（下載至本機快取）：
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          value={urlInputs[ver.id] ?? ver.customRemoteUrl ?? (ver.driveFileId ? `https://drive.google.com/file/d/${ver.driveFileId}/view` : '')}
                          onChange={(e) =>
                            setUrlInputs((prev) => ({ ...prev, [ver.id]: e.target.value }))
                          }
                          placeholder="貼上音檔直連網址或 Google Drive 連結"
                          className="flex-1 bg-[var(--card)] border border-outline-variant rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDownloadClick(ver)}
                          className="px-3.5 py-1.5 rounded-full bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed font-bold flex items-center gap-1 shrink-0 disabled:opacity-50"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          <span>{isBusy ? '處理中' : '下載快取'}</span>
                        </button>
                      </div>
                    </div>

                    {track.versions.length > 1 && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onDeleteVersionFromTrack(track.id, ver.id)}
                          className="text-error font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>刪除此子版本</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 新增子版本區塊 */}
          <div className="pt-2.5 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface-variant mb-2">新增此曲目的其他版本：</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newVerLabel}
                onChange={(e) => setNewVerLabel(e.target.value)}
                placeholder="版本全名 (例：C 版：Remix)"
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-xs text-on-surface"
              />
              <input
                type="text"
                value={newVerBadge}
                onChange={(e) => setNewVerBadge(e.target.value)}
                placeholder="短標籤 (例：Remix)"
                className="w-28 bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-xs text-on-surface"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newVerLabel.trim()) return;
                  onAddVersionToTrack(
                    track.id,
                    newVerLabel.trim(),
                    newVerBadge.trim() || newVerLabel.trim()
                  );
                  setNewVerLabel('');
                  setNewVerBadge('');
                }}
                className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分頁 2：歌詞檢視與編輯 */}
      {activeTab === 'lyrics' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 max-h-[52dvh] overflow-y-auto custom-scroll">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-on-surface font-medium">
              {track.lyrics || '尚無歌詞內容'}
            </pre>
          </div>
          <details className="text-xs text-on-surface-variant">
            <summary className="cursor-pointer py-1 font-bold text-primary">
              編輯此曲目歌詞內容
            </summary>
            <textarea
              rows={6}
              value={track.lyrics}
              onChange={(e) => onUpdateTrackMeta(track.id, { lyrics: e.target.value })}
              className="mt-2 w-full rounded-2xl bg-surface-container-low border border-outline-variant p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </details>
        </div>
      )}

      {/* 分頁 3：按鈕名稱、用途與色彩主題調配 */}
      {activeTab === 'config' && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">編號代號</label>
              <input
                type="text"
                value={track.code}
                onChange={(e) => onUpdateTrackMeta(track.id, { code: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-on-surface font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-on-surface-variant mb-1">按鈕主標題（曲名）</label>
              <input
                type="text"
                value={track.title}
                onChange={(e) => onUpdateTrackMeta(track.id, { title: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-on-surface font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-on-surface-variant mb-1">用途說明 / 副標題</label>
            <input
              type="text"
              value={track.subtitle}
              onChange={(e) => onUpdateTrackMeta(track.id, { subtitle: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-on-surface"
            />
          </div>

          <div>
            <label className="block font-semibold text-on-surface-variant mb-1.5">M3 卡片色調樣式</label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onUpdateTrackMeta(track.id, { colorTheme: c.value })}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold transition ${
                    track.colorTheme === c.value
                      ? 'bg-primary-fixed border-primary text-on-primary-fixed'
                      : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant'
                  }`}
                >
                  <span>{c.label}</span>
                  {track.colorTheme === c.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/50 flex items-center justify-between">
            <span className="text-on-surface font-semibold">於當前情境面板顯示此按鈕</span>
            <input
              type="checkbox"
              checked={track.visible}
              onChange={(e) => onUpdateTrackMeta(track.id, { visible: e.target.checked })}
              className="w-4 h-4 accent-[var(--primary)]"
            />
          </div>
        </div>
      )}
    </NativeModal>
  );
};
