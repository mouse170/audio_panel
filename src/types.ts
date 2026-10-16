export type ButtonColorTheme = 'blue' | 'amber' | 'emerald' | 'rose' | 'purple' | 'cyan';

export interface AudioVersion {
  id: string;
  slotIndex: number;
  label: string;
  shortBadge: string;
  styleInfo: string;
  originalFileName: string;
  bundledUrl: string;
  driveFileId: string;
  customRemoteUrl?: string;
}

export interface TrackButtonConfig {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  colorTheme: ButtonColorTheme;
  visible: boolean;
  activeVersionIndex: number;
  versions: AudioVersion[];
  lyrics: string;
}

export interface PanelProfile {
  id: string;
  name: string;
  description: string;
  gridColumns: 1 | 2;
  globalSlotIndex: number | null;
  tracks: TrackButtonConfig[];
}

export interface CachedAudioMeta {
  versionId: string;
  sourceType: 'local' | 'cloud' | 'bundled_cache';
  fileName: string;
  size: number;
  updatedAt: number;
}
