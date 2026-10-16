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
import { CachedAudioMeta, PanelProfile, TrackButtonConfig } from '../types';
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
      setProgressText(`已完成全部 ${totalVersionCount} 首音檔之手機離線快取！無網路亦可秒播。`);
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
        setProgressText(`成功自動配對並匯入 ${result.matched} 個本地音檔至離線快取！`);
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
    a.download = `audio_panel_profiles_v0.2.0.0.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = onImportProfilesJson(text);
    setProgressText(ok ? '已成功匯入面板情境設定檔！' : '匯入失敗：JSON 格式不符');
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

      {/* 頂部切換列 */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-3.5">
        <button
          type="button"
          onClick={() => setTab('layout')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition ${
            tab === 'layout' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          按鈕動態調配
        </button>
        <button
          type="button"
          onClick={() => setTab('audio')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition ${
            tab === 'audio' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          本地/雲端音檔
        </button>
        <button
          type="button"
          onClick={() => setTab('profiles')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition ${
            tab === 'profiles' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          情境組 ({profiles.length})
        </button>
      </div>

      {progressText && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-blue-950/80 border border-blue-700/70 text-xs text-blue-200">
          {progressText}
        </div>
      )}

      {/* 分頁 1：按鈕動態調配（排列方式、顯示開關、排序、新增曲目） */}
      {tab === 'layout' && (
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/70">
            <span className="font-semibold text-slate-200">手機面板網格排列方式</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateActiveProfile({ gridColumns: 1 })}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold transition ${
                  activeProfile.gridColumns === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>單欄大橫條</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateActiveProfile({ gridColumns: 2 })}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold transition ${
                  activeProfile.gridColumns === 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>雙欄大卡片</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>曲目按鈕順序與顯示控制（點擊眼睛可隱藏/顯示）：</span>
              <span>
                顯示中：{activeProfile.tracks.filter((t) => t.visible).length} / {activeProfile.tracks.length}
              </span>
            </div>

            {activeProfile.tracks.map((track, idx) => (
              <div
                key={track.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                  track.visible
                    ? 'bg-slate-800/70 border-slate-700 text-white'
                    : 'bg-slate-900/50 border-slate-800/70 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleTrackVisible(track.id)}
                    className={`p-1.5 rounded-lg ${
                      track.visible ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-800 text-slate-500'
                    }`}
                    title={track.visible ? '隱藏此按鈕' : '顯示此按鈕'}
                  >
                    {track.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">
                      {track.code}. {track.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {track.subtitle}（{track.versions.length} 個版本）
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveTrack(idx, 'up')}
                    className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 disabled:opacity-30"
                    title="上移"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === activeProfile.tracks.length - 1}
                    onClick={() => onMoveTrack(idx, 'down')}
                    className="p-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 disabled:opacity-30"
                    title="下移"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {activeProfile.tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteTrack(track.id)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 ml-1"
                      title="刪除此曲目按鈕"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 動態新增曲目按鈕 */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-300">動態新增控制曲目按鈕：</div>
            <div className="grid grid-cols-4 gap-1.5">
              <input
                type="text"
                value={newTrackCode}
                onChange={(e) => setNewTrackCode(e.target.value)}
                placeholder="編號(06)"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
              />
              <input
                type="text"
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                placeholder="曲目名稱"
                className="col-span-3 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTrackSub}
                onChange={(e) => setNewTrackSub(e.target.value)}
                placeholder="用途說明（例：加碼延長賽）"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
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
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增按鈕</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分頁 2：本地與網路音檔離線快取中心 */}
      {tab === 'audio' && (
        <div className="space-y-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>一鍵全量寫入手機 IndexedDB 永久離線快取</span>
                </h3>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  目前系統已內建 Google Drive（1306 資料夾）全部 15 首音檔。點擊下方按鈕可將全部 15 首音檔二進位資料永久寫入手機瀏覽器 IndexedDB，確保開啟飛航模式或無網路時 100% 零延遲秒播。
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isCaching}
              onClick={handleBatchPreCache}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition disabled:opacity-50"
            >
              <CloudDownload className="w-4 h-4" />
              <span>
                {isCaching
                  ? '正在寫入離線快取...'
                  : `一鍵下載快取全部 ${totalVersionCount} 首音檔 (${cachedCount}/${totalVersionCount} 已快取)`}
              </span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <FolderUp className="w-4 h-4 text-indigo-400" />
              <span>從 Android 手機批次選取本地音檔（自動依檔名配對）</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              支援一次多選手機內的 <code className="text-slate-200">.mpeg</code> 或{' '}
              <code className="text-slate-200">.mp3</code> 檔案（例如{' '}
              <code className="text-slate-200">01_登場曲_通用版.mpeg</code>、
              <code className="text-slate-200">02A_轉起來_DiscoFunk.mpeg</code>），系統將自動對應至 5 首曲目的各別版本槽位。
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
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <FolderUp className="w-4 h-4" />
              <span>批次選取手機本地音檔 (.mpeg / .mp3)</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="font-semibold text-slate-200">Google Drive 原始音檔雲端資料夾（1306）</div>
              <div className="text-[11px] text-slate-400 truncate">{GDRIVE_FOLDER_URL}</div>
            </div>
            <a
              href={GDRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold flex items-center gap-1 shrink-0"
            >
              <span>開啟雲端</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={async () => {
                await onClearAllCache();
                setProgressText('已清除所有自訂快取，回復使用系統內建之 15 首音源。');
              }}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1 py-1 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
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
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    isCurrent
                      ? 'bg-blue-950/40 border-blue-500 text-white'
                      : 'bg-slate-800/50 border-slate-700/70 text-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectProfile(prof.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                      <span className="font-bold text-sm truncate">{prof.name}</span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-slate-700 text-slate-300">
                        {visibleCount} 鈕 / {prof.gridColumns === 1 ? '單欄' : '雙欄'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{prof.description}</p>
                  </button>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteProfile(prof.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="刪除此情境組"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-300">複製當前配置並另存為新情境：</div>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="新情境名稱（例：下半場延長賽配置）"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                placeholder="情境備註說明"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
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
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>儲存情境</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出配置 JSON</span>
              </button>
              <button
                type="button"
                onClick={() => jsonImportInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>匯入配置 JSON</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onResetFactoryProfiles();
                setProgressText('已重設所有情境與按鈕為原廠預設值。');
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重設原廠配置</span>
            </button>
          </div>
        </div>
      )}
    </NativeModal>
  );
};
