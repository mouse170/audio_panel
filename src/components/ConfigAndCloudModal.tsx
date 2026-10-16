import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CloudDownload,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderUp,
  HardDrive,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Trash2,
  Upload
} from 'lucide-react';
import { CachedAudioMeta, PanelProfile } from '../types';
import { GDRIVE_FOLDER_URL } from '../defaultData';
import { NativeModal } from './NativeModal';

interface ConfigAndCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: PanelProfile[];
  activeProfile: PanelProfile;
  cachedMetaMap: Record<string, CachedAudioMeta>;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, description: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onUpdateActiveProfile: (updated: Partial<PanelProfile>) => void;
  onMoveTrack: (trackIndex: number, direction: 'up' | 'down') => void;
  onToggleTrackVisible: (trackId: string) => void;
  onAddNewTrack: (code: string, title: string, subtitle: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onBatchCacheAllTracks: (onProgress: (done: number, total: number, label: string) => void) => Promise<void>;
  onBatchImportLocalFiles: (files: FileList) => Promise<{ matched: number; unmatched: string[] }>;
  onClearAllCache: () => Promise<void>;
  onResetFactoryProfiles: () => void;
  onImportProfilesJson: (jsonText: string) => boolean;
}

export const ConfigAndCloudModal: React.FC<ConfigAndCloudModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  cachedMetaMap,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onUpdateActiveProfile,
  onMoveTrack,
  onToggleTrackVisible,
  onAddNewTrack,
  onDeleteTrack,
  onBatchCacheAllTracks,
  onBatchImportLocalFiles,
  onClearAllCache,
  onResetFactoryProfiles,
  onImportProfilesJson
}) => {
  const [tab, setTab] = useState<'layout' | 'audio' | 'profiles'>('layout');
  const [newTrackCode, setNewTrackCode] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackSub, setNewTrackSub] = useState('');

  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');

  const [isCaching, setIsCaching] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);

  const totalVersionCount = activeProfile.tracks.reduce((acc, t) => acc + t.versions.length, 0);
  const cachedCount = activeProfile.tracks.reduce(
    (acc, t) => acc + t.versions.filter((v) => Boolean(cachedMetaMap[v.id])).length,
    0
  );

  const handleBatchPreCache = async () => {
    setIsCaching(true);
    setProgressText('準備下載並寫入 IndexedDB 離線快取...');
    try {
      await onBatchCacheAllTracks((done, total, label) => {
        setProgressText(`正在快取 (${done}/${total})：${label}`);
      });
      setProgressText(`已完成全部 ${totalVersionCount} 首音檔之手機離線快取，無網路環境亦可直接播放。`);
    } catch (err) {
      setProgressText(`快取過程發生錯誤：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCaching(false);
    }
  };

  const handleBatchLocalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCaching(true);
    setProgressText('正在解析並配對手機本地音檔...');
    try {
      const result = await onBatchImportLocalFiles(files);
      if (result.unmatched.length === 0) {
        setProgressText(`已自動配對並匯入 ${result.matched} 個本地音檔至離線快取。`);
      } else {
        setProgressText(
          `已配對匯入 ${result.matched} 個音檔；未符合命名規則 (${result.unmatched.length} 個)：${result.unmatched.join(', ')}`
        );
      }
    } catch (err) {
      setProgressText(`批次匯入失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCaching(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(profiles, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio_panel_profiles_v0.3.1.0.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = onImportProfilesJson(text);
    setProgressText(ok ? '已匯入面板情境設定檔。' : '無法匯入設定檔：JSON 結構不符。');
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="動態配置與本地/雲端音源管理"
      subtitle={`目前情境：${activeProfile.name} ｜ 離線快取：${cachedCount}/${totalVersionCount} 首`}
    >
      <input
        ref={batchFileInputRef}
        type="file"
        multiple
        accept="audio/*,video/mpeg,.mp3,.mpeg,.mpg,.wav,.m4a,.ogg,.aac,.flac"
        className="hidden"
        onChange={handleBatchLocalChange}
      />
      <input
        ref={jsonImportInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportJsonFile}
      />

      {/* M3 Segmented Pill Bar */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container rounded-2xl border border-outline-variant/60 mb-4">
        <button
          type="button"
          onClick={() => setTab('layout')}
          className={`py-2 px-2 rounded-xl text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            tab === 'layout'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          按鈕動態調配
        </button>
        <button
          type="button"
          onClick={() => setTab('audio')}
          className={`py-2 px-2 rounded-xl text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            tab === 'audio'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          本地/雲端音檔
        </button>
        <button
          type="button"
          onClick={() => setTab('profiles')}
          className={`py-2 px-2 rounded-xl text-xs font-semibold tabular-nums transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            tab === 'profiles'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          情境組 ({profiles.length})
        </button>
      </div>

      {progressText && (
        <div className="mb-3.5 px-3.5 py-2.5 rounded-xl bg-primary-fixed text-on-primary-fixed border border-primary/25 text-xs font-medium tabular-nums">
          {progressText}
        </div>
      )}

      {/* 分頁 1：按鈕動態調配 */}
      {tab === 'layout' && (
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between bg-surface-container-low/80 p-3 rounded-2xl border border-outline-variant/60">
            <span className="font-semibold text-on-surface">手機面板網格排列方式</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateActiveProfile({ gridColumns: 1 })}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1 font-semibold transition duration-200 ${
                  activeProfile.gridColumns === 1
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <List className="w-3.5 h-3.5" strokeWidth={2} />
                <span>單欄大橫條</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateActiveProfile({ gridColumns: 2 })}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1 font-semibold transition duration-200 ${
                  activeProfile.gridColumns === 2
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} />
                <span>雙欄大卡片</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-on-surface-variant font-medium tabular-nums">
              <span>曲目按鈕順序與顯示控制（點擊眼睛可隱藏/顯示）：</span>
              <span>
                顯示中：{activeProfile.tracks.filter((t) => t.visible).length} / {activeProfile.tracks.length}
              </span>
            </div>

            {activeProfile.tracks.map((track, idx) => (
              <div
                key={track.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl border transition duration-200 ${
                  track.visible
                    ? 'bg-surface-container-low/80 border-outline-variant text-on-surface'
                    : 'bg-surface-container/40 border-outline-variant/40 text-on-surface-variant/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleTrackVisible(track.id)}
                    className={`p-2 rounded-xl transition duration-200 ${
                      track.visible
                        ? 'bg-primary-fixed text-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                    title={track.visible ? '隱藏此按鈕' : '顯示此按鈕'}
                  >
                    {track.visible ? <Eye className="w-4 h-4" strokeWidth={2} /> : <EyeOff className="w-4 h-4" strokeWidth={2} />}
                  </button>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate tabular-nums">
                      {track.code}. {track.title}
                    </div>
                    <div className="text-[11px] text-on-surface-variant truncate tabular-nums">
                      {track.subtitle}（{track.versions.length} 個版本）
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveTrack(idx, 'up')}
                    className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface disabled:opacity-30 transition duration-200"
                    title="上移"
                  >
                    <ArrowUp className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === activeProfile.tracks.length - 1}
                    onClick={() => onMoveTrack(idx, 'down')}
                    className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface disabled:opacity-30 transition duration-200"
                    title="下移"
                  >
                    <ArrowDown className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  {activeProfile.tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteTrack(track.id)}
                      className="p-1.5 rounded-xl bg-error-container text-on-error-container ml-1 transition duration-200"
                      title="刪除此曲目按鈕"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 動態新增曲目按鈕 */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low/80 border border-outline-variant/60 space-y-2">
            <div className="font-semibold text-on-surface">動態新增控制曲目按鈕：</div>
            <div className="grid grid-cols-4 gap-1.5">
              <input
                type="text"
                value={newTrackCode}
                onChange={(e) => setNewTrackCode(e.target.value)}
                placeholder="編號(06)"
                className="bg-[var(--card)] border border-outline-variant rounded-xl px-2.5 py-1.5 text-on-surface tabular-nums focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                placeholder="曲目名稱"
                className="col-span-3 bg-[var(--card)] border border-outline-variant rounded-xl px-2.5 py-1.5 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTrackSub}
                onChange={(e) => setNewTrackSub(e.target.value)}
                placeholder="用途說明（例：加碼延長賽）"
                className="flex-1 bg-[var(--card)] border border-outline-variant rounded-xl px-2.5 py-1.5 text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTrackTitle.trim()) return;
                  const code =
                    newTrackCode.trim() ||
                    String(activeProfile.tracks.length + 1).padStart(2, '0');
                  onAddNewTrack(code, newTrackTitle.trim(), newTrackSub.trim() || '自訂控場曲目');
                  setNewTrackCode('');
                  setNewTrackTitle('');
                  setNewTrackSub('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-1 shrink-0 shadow-sm transition duration-200"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>新增按鈕</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分頁 2：本地與網路音檔離線快取中心 */}
      {tab === 'audio' && (
        <div className="space-y-3.5 text-xs">
          <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-outline-variant/60 space-y-2.5">
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-primary" strokeWidth={2} />
                <span>一鍵全量寫入手機 IndexedDB 永久離線快取</span>
              </h3>
              <p className="text-on-surface-variant mt-1 leading-relaxed max-w-[60ch]">
                目前系統已內建 Google Drive（1306 資料夾）全部 15 首音檔。點擊下方按鈕可將全部 15 首音檔二進位資料永久寫入手機瀏覽器 IndexedDB，確保開啟飛航模式或無網路時零延遲播放。
              </p>
            </div>
            <button
              type="button"
              disabled={isCaching}
              onClick={handleBatchPreCache}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition duration-200 disabled:opacity-50 tabular-nums"
            >
              <CloudDownload className="w-4 h-4" strokeWidth={2} />
              <span>
                {isCaching
                  ? '正在寫入離線快取...'
                  : `一鍵下載快取全部 ${totalVersionCount} 首音檔 (${cachedCount}/${totalVersionCount} 已快取)`}
              </span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-outline-variant/60 space-y-2.5">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <FolderUp className="w-4 h-4 text-tertiary" strokeWidth={2} />
              <span>從 Android 手機批次選取本地音檔（自動依檔名配對）</span>
            </h3>
            <p className="text-on-surface-variant leading-relaxed max-w-[60ch]">
              支援一次多選手機內的 <code className="font-mono font-semibold text-primary">.mpeg</code> 或{' '}
              <code className="font-mono font-semibold text-primary">.mp3</code> 檔案（例如{' '}
              <code className="font-mono text-on-surface">01_登場曲_通用版.mpeg</code>），系統將自動對應至 5 首曲目的各別版本槽位。
            </p>
            <button
              type="button"
              disabled={isCaching}
              onClick={() => {
                if (batchFileInputRef.current) {
                  batchFileInputRef.current.value = '';
                  batchFileInputRef.current.click();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition duration-200 shadow-sm"
            >
              <FolderUp className="w-4 h-4" strokeWidth={2} />
              <span>批次選取手機本地音檔 (.mpeg / .mp3)</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="font-semibold text-on-surface">Google Drive 原始音檔雲端資料夾（1306）</div>
              <div className="text-[11px] text-on-surface-variant truncate font-mono">{GDRIVE_FOLDER_URL}</div>
            </div>
            <a
              href={GDRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed font-semibold flex items-center gap-1 shrink-0 transition duration-200"
            >
              <span>開啟雲端</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
            </a>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={async () => {
                await onClearAllCache();
                setProgressText('已清除所有自訂快取，回復使用系統內建之 15 首音源。');
              }}
              className="text-on-surface-variant hover:text-error font-semibold flex items-center gap-1 py-1 px-2 transition duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
              <span>清除自訂快取（回復內建預設音源）</span>
            </button>
          </div>
        </div>
      )}

      {/* 分頁 3：多組情境設定檔管理（Profiles） */}
      {tab === 'profiles' && (
        <div className="space-y-3.5 text-xs">
          <div className="space-y-2">
            {profiles.map((prof) => {
              const isCurrent = prof.id === activeProfile.id;
              const visibleCount = prof.tracks.filter((t) => t.visible).length;
              return (
                <div
                  key={prof.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition duration-200 ${
                    isCurrent
                      ? 'bg-primary-fixed/50 border-primary text-on-surface shadow-sm'
                      : 'bg-surface-container-low/80 border-outline-variant/60 text-on-surface'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectProfile(prof.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCurrent && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />}
                      <span className="font-bold text-sm truncate">{prof.name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold tabular-nums rounded-md bg-surface-container-high text-on-surface-variant">
                        {visibleCount} 鈕 / {prof.gridColumns === 1 ? '單欄' : '雙欄'}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1 truncate">{prof.description}</p>
                  </button>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteProfile(prof.id)}
                      className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/40 transition duration-200"
                      title="刪除此情境組"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container-low/80 border border-outline-variant/60 space-y-2">
            <div className="font-semibold text-on-surface">複製當前配置並另存為新情境：</div>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="新情境名稱（例：下半場延長賽配置）"
              className="w-full bg-[var(--card)] border border-outline-variant rounded-xl px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                placeholder="情境備註說明"
                className="flex-1 bg-[var(--card)] border border-outline-variant rounded-xl px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newProfileName.trim()) return;
                  onCreateProfile(
                    newProfileName.trim(),
                    newProfileDesc.trim() || '自訂動態按鈕配置'
                  );
                  setNewProfileName('');
                  setNewProfileDesc('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-semibold flex items-center gap-1 shrink-0 shadow-sm transition duration-200"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>儲存情境</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/50">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold flex items-center gap-1 transition duration-200"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={2} />
                <span>匯出配置 JSON</span>
              </button>
              <button
                type="button"
                onClick={() => jsonImportInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold flex items-center gap-1 transition duration-200"
              >
                <Upload className="w-3.5 h-3.5" strokeWidth={2} />
                <span>匯入配置 JSON</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onResetFactoryProfiles();
                setProgressText('已重設所有情境與按鈕為原廠預設值。');
              }}
              className="text-error font-semibold flex items-center gap-1 py-1 transition duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
              <span>重設原廠配置</span>
            </button>
          </div>
        </div>
      )}
    </NativeModal>
  );
};
