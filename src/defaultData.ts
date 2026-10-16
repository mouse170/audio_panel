import { PanelProfile, TrackButtonConfig } from './types';

export const GDRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1mks1ddPh6IWNXGnesEqMEqJci4wsD8yB';
export const APP_VERSION = '0.2.1.0';

export const DEFAULT_TRACKS: TrackButtonConfig[] = [
  {
    id: 'track_01',
    code: '01',
    title: '登場曲',
    subtitle: '開場 / 頒獎 / 大合照',
    colorTheme: 'blue',
    visible: true,
    activeVersionIndex: 0,
    versions: [
      {
        id: '01_v0',
        slotIndex: 0,
        label: '主版：通用版',
        shortBadge: '通用版',
        styleInfo: 'Pop Rock Anthem | BPM 132 | 2m00s',
        originalFileName: '01_登場曲_通用版.mpeg',
        bundledUrl: './audio/01_default.mp3',
        driveFileId: '1nqD2L0YKXdFs21Pf1ojx45Mpr24pOYrv'
      },
      {
        id: '01_v1',
        slotIndex: 1,
        label: 'A 版：AltRock',
        shortBadge: 'AltRock',
        styleInfo: 'Alternative Rock | BPM 132',
        originalFileName: '01A_登場曲_AltRock.mpeg',
        bundledUrl: './audio/01_a.mp3',
        driveFileId: '1rJhpOPrFyryzGXbqeERO_J5AbDRHPUD4'
      },
      {
        id: '01_v2',
        slotIndex: 2,
        label: 'B 版：AnthemicPop',
        shortBadge: 'AnthemicPop',
        styleInfo: 'Anthemic Pop | BPM 132',
        originalFileName: '01B_登場曲_AnthemicPop.mpeg',
        bundledUrl: './audio/01_b.mp3',
        driveFileId: '1n5EZ_2Sj4NYqqugoH6X2gIFPnYVuYdoj'
      }
    ],
    lyrics: `【第 1 首：登場曲（通用版）】
用途：開場 / 頒獎 / 大合照
風格：Pop Rock Anthem | BPM 132 | C Major | 4/4 | 2 分鐘

[Intro]
[Instrumental Interlude]

[Verse 1]
後勤支援 每一步都不退讓
幕前幕後 都是我們的戰場

[Verse 2]
別說我們只是默默在背後
今天站出來 讓所有人看清楚

[Pre-Chorus - building energy]
準備好了嗎 大聲喊出來

[Chorus - anthemic]
後支組 全力出擊
一起衝不回頭 大步向前走
後支組 全力出擊
今天就是我們的舞台 大聲喊出來

[Bridge - call and response]
後支組 (GO!) 後支組 (WIN!)

[Final Chorus - explosive]
後支組 全力出擊
一起衝不回頭 大步向前走
後支組 全力出擊

[Outro]
[fade out]`
  },
  {
    id: 'track_02',
    code: '02',
    title: '轉起來',
    subtitle: '傳呼拉圈比賽',
    colorTheme: 'amber',
    visible: true,
    activeVersionIndex: 0,
    versions: [
      {
        id: '02_v0',
        slotIndex: 0,
        label: '主版：傳呼拉圈版',
        shortBadge: '傳呼拉圈版',
        styleInfo: 'Funky Groove Pop | BPM 126 | 90s',
        originalFileName: '02_轉起來_傳呼拉圈版.mpeg',
        bundledUrl: './audio/02_default.mp3',
        driveFileId: '12hV0xO3SvO33gXp74v8w7ggdpGVgqBJH'
      },
      {
        id: '02_v1',
        slotIndex: 1,
        label: 'A 版：DiscoFunk',
        shortBadge: 'DiscoFunk',
        styleInfo: 'Disco Funk | BPM 126',
        originalFileName: '02A_轉起來_DiscoFunk.mpeg',
        bundledUrl: './audio/02_a.mp3',
        driveFileId: '1KoKDfRXou9lXjSNvJ2Kx6e3kJsrMLaUj'
      },
      {
        id: '02_v2',
        slotIndex: 2,
        label: 'B 版：ElectroPop',
        shortBadge: 'ElectroPop',
        styleInfo: 'Electro Pop | BPM 126',
        originalFileName: '02B_轉起來_ElectroPop.mpeg',
        bundledUrl: './audio/02_b.mp3',
        driveFileId: '1HUUub9GSU-F2KYPaJBeQTTGMJKUBVsSa'
      }
    ],
    lyrics: `【第 2 首：轉起來（傳呼拉圈版）】
用途：傳呼拉圈比賽
風格：Funky Groove Pop | BPM 126 | G Major | 4/4 | 90 秒

[Intro]

[Verse 1]
呼拉圈拿起來 手搭手肩靠肩
圈圈不能掉 傳下去就對了

[Chorus - anthemic]
後支組 全力出擊
一圈轉不停 全力到終點

[Bridge - call and response]
圈不能掉 (傳！) 圈不能掉 (傳！)
後支組 GO!

[Final Chorus]
後支組 全力出擊
一圈轉不停 全力到終點`
  },
  {
    id: 'track_03',
    code: '03',
    title: '穩住別抖',
    subtitle: '夾乒乓球比賽',
    colorTheme: 'emerald',
    visible: true,
    activeVersionIndex: 0,
    versions: [
      {
        id: '03_v0',
        slotIndex: 0,
        label: '主版：夾乒乓球版',
        shortBadge: '夾乒乓球版',
        styleInfo: 'Playful Bouncy Pop | BPM 118 | 90s',
        originalFileName: '03_穩住別抖_夾乒乓球版.mpeg',
        bundledUrl: './audio/03_default.mp3',
        driveFileId: '1H4Iy-YicOSpNMdC9kzXi35ywE4W1uxxH'
      },
      {
        id: '03_v1',
        slotIndex: 1,
        label: 'A 版：AcousticPop',
        shortBadge: 'AcousticPop',
        styleInfo: 'Acoustic Pop | BPM 118',
        originalFileName: '03A_穩住別抖_AcousticPop.mpeg',
        bundledUrl: './audio/03_a.mp3',
        driveFileId: '1s4vDAeo60R8WO4-77nLLTtN3jAE1D9o3'
      },
      {
        id: '03_v2',
        slotIndex: 2,
        label: 'B 版：JazzBouncy',
        shortBadge: 'JazzBouncy',
        styleInfo: 'Jazz Bouncy | BPM 118',
        originalFileName: '03B_穩住別抖_JazzBouncy.mpeg',
        bundledUrl: './audio/03_b.mp3',
        driveFileId: '1_p2H9PmbzmpNOi5plAjR-XTvog-8BDbX'
      }
    ],
    lyrics: `【第 3 首：穩住別抖（夾乒乓球版）】
用途：夾乒乓球比賽
風格：Playful Bouncy Pop | BPM 118 | C Major | 4/4 | 90 秒

[Intro]

[Verse 1]
筷子拿穩了 球別急著跑
屏住呼吸慢慢來 千萬別摔倒

[Pre-Chorus]
穩住 穩住 別發抖

[Chorus - anthemic]
後支組 全力出擊
一夾一放穩穩來 一步步向前走

[Bridge - call and response]
夾住了 (穩！) 夾住了 (穩！)
後支組 GO!

[Final Chorus]
後支組 全力出擊
一夾一放穩穩來 一步步向前走

[Outro]`
  },
  {
    id: 'track_04',
    code: '04',
    title: '接住它',
    subtitle: '垃圾袋傳籃球比賽（壓軸）',
    colorTheme: 'purple',
    visible: true,
    activeVersionIndex: 0,
    versions: [
      {
        id: '04_v0',
        slotIndex: 0,
        label: '主版：垃圾袋傳籃球版',
        shortBadge: '垃圾袋傳籃球版',
        styleInfo: 'Heavy Rock | BPM 145 | 90s',
        originalFileName: '04_接住它_垃圾袋傳籃球版.mpeg',
        bundledUrl: './audio/04_default.mp3',
        driveFileId: '1G9S96eyFmHTc3FbAlbqDvUAE0e7rzfI6'
      },
      {
        id: '04_v1',
        slotIndex: 1,
        label: 'A 版：PunkRock',
        shortBadge: 'PunkRock',
        styleInfo: 'Punk Rock | BPM 145',
        originalFileName: '04A_接住它_PunkRock.mpeg',
        bundledUrl: './audio/04_a.mp3',
        driveFileId: '1p1G40KsX4wUYc5Py6nX6WzEOAufBAt5t'
      },
      {
        id: '04_v2',
        slotIndex: 2,
        label: 'B 版：RapRock',
        shortBadge: 'RapRock',
        styleInfo: 'Rap Rock | BPM 145',
        originalFileName: '04B_接住它_RapRock.mpeg',
        bundledUrl: './audio/04_b.mp3',
        driveFileId: '16LkTRs7Rkxmnqq_Vq21da4Hd0JMZ8Ej8'
      }
    ],
    lyrics: `【第 4 首：接住它（垃圾袋傳籃球版）】
用途：垃圾袋傳籃球比賽（壓軸）
風格：Heavy Rock | BPM 145 | G Major | 4/4 | 90 秒

[Intro]
[Instrumental Interlude]

[Verse 1]
垃圾袋張開了 籃球滿場飛
笑到肚子痛 接住別放手

[Pre-Chorus]
後支組 在這裡

[Chorus - anthemic]
後支組 全力出擊
接住它 別放手 接住這場勝利

[Final Chorus - explosive]
後支組 全力出擊
接住它 別放手 接住這場勝利

[Outro]
[fade out]`
  },
  {
    id: 'track_05',
    code: '05',
    title: '最後一刻',
    subtitle: '比賽膠著 / 最後關鍵時刻',
    colorTheme: 'rose',
    visible: true,
    activeVersionIndex: 0,
    versions: [
      {
        id: '05_v0',
        slotIndex: 0,
        label: 'A 版：IntenseRock',
        shortBadge: 'IntenseRock',
        styleInfo: 'Intense Rock | BPM 150 | 90s',
        originalFileName: '05A_最後一刻_IntenseRock.mpeg',
        bundledUrl: './audio/05_a.mp3',
        driveFileId: '1XwpAyI_EufqwcUTwU9NcQ-IigxtLKi6k'
      },
      {
        id: '05_v1',
        slotIndex: 1,
        label: 'B 版：ElectronicTension',
        shortBadge: 'ElectronicTension',
        styleInfo: 'Electronic Tension | BPM 150',
        originalFileName: '05B_最後一刻_ElectronicTension.mpeg',
        bundledUrl: './audio/05_b.mp3',
        driveFileId: '1mrFf32bK2UK5fcoboK8DSr6KlANxHQrM'
      },
      {
        id: '05_v2',
        slotIndex: 2,
        label: 'C 版：Cinematic',
        shortBadge: 'Cinematic',
        styleInfo: 'Cinematic Epic | BPM 150',
        originalFileName: '05C_最後一刻_Cinematic.mpeg',
        bundledUrl: './audio/05_c.mp3',
        driveFileId: '11jxZfo0OqDYw3YjhcpXxLQ_PA755mA2u'
      }
    ],
    lyrics: `【第 5 首：最後一刻（緊張應援版）】
用途：比賽膠著、最後關鍵時刻
風格：Intense Rock | BPM 150 | G Major | 4/4 | 90 秒
版本：A (Intense Rock) / B (Electronic Tension) / C (Cinematic)

[Intro]
[Instrumental Interlude]

[Verse 1]
心跳加速 呼吸變快
全世界都安靜了
深呼吸 別發抖
我們還沒輸

[Pre-Chorus - building tension]
穩住 穩住 現在換我們
衝出去 別回頭

[Chorus - explosive]
後支組 全力出擊
咬緊牙關撐到底
後支組 全力出擊
最後一刻 不放棄

[Bridge - call and response]
還有誰？ (我們！)
怕什麼？ (不怕！)
後支組 GO!

[Final Chorus - explosive]
後支組 全力出擊
咬緊牙關撐到底
後支組 全力出擊
最後一刻 不放棄

[Outro]
不放棄 (不放棄！)
不放棄 (不放棄！)
[fade out]`
  }
];

export function cloneTracks(tracks: TrackButtonConfig[]): TrackButtonConfig[] {
  return JSON.parse(JSON.stringify(tracks));
}

export const DEFAULT_PROFILES: PanelProfile[] = [
  {
    id: 'profile_all_5',
    name: '全場標準配置（5 首）',
    description: '完整呈現 01 至 05 五首應援主控大按鈕，單欄滿版防誤觸排列',
    gridColumns: 1,
    globalSlotIndex: 0,
    tracks: cloneTracks(DEFAULT_TRACKS)
  },
  {
    id: 'profile_games_3',
    name: '競賽項目專場（3 首）',
    description: '僅保留傳呼拉圈、夾乒乓球、垃圾袋傳籃球 3 顆超大按鈕，適合單手控場',
    gridColumns: 1,
    globalSlotIndex: 0,
    tracks: cloneTracks(DEFAULT_TRACKS).map((t) => ({
      ...t,
      visible: ['track_02', 'track_03', 'track_04'].includes(t.id)
    }))
  },
  {
    id: 'profile_finals_grid',
    name: '決賽雙欄面板（高張力）',
    description: '雙欄大卡片佈局，預設切換至曲風較強烈的搖滾/電音版本',
    gridColumns: 2,
    globalSlotIndex: 1,
    tracks: cloneTracks(DEFAULT_TRACKS).map((t) => ({
      ...t,
      activeVersionIndex: 1
    }))
  }
];
